import type { AgentId, AgentStatus, CampaignAngles, CampaignBrief, CampaignPack, Diagnosis, Intake, Locale } from "../types";
import { sleep } from "../utils";
import { validateIntake } from "./validate";
import { diagnose } from "./diagnose";
import { generateVariants } from "./copy";
import { enrichVariantsWithGemini, overlayAgencyPieces } from "./gemini-enrich";
import { overlayProOnAgency, type ProDeskInsights } from "./pro-desk-overlay";
import { generateStrategy } from "./strategy";
import { generateMedia } from "./media";
import { generateOptimizer } from "./optimizer";
import { buildPastCampaignAudit, overlayPastCampaignAudit, creativesToPosts } from "./past-campaign-audit";
import { demoIntake, DEMO_ID } from "../demo";
import { catalogIntake, demoEntry, demoMetaFor, type DemoPackId, DEMO_OLIVE_ID, DEMO_SAND_ID } from "../demo-catalog";
import { loadLocale } from "../storage";
import { ideaNamesForLocale } from "./cmo-ideas";
import { buildResearchSkeleton, runMarketResearch } from "./ad-research";
import { attachResearchAndSync, orchestrateAssemble } from "./campaign-orchestrator";

export const AGENT_ORDER: AgentId[] = [
  "intake",
  "diagnostic",
  "strategic",
  "media",
  "optimizer",
];

export function idleStatus(): Record<AgentId, AgentStatus> {
  return {
    intake: "idle",
    diagnostic: "idle",
    strategic: "blocked",
    media: "blocked",
    optimizer: "blocked",
  };
}

export async function runIntakeAndDiagnosis(
  intake: Intake,
  onStatus: (id: AgentId, status: AgentStatus) => void,
): Promise<{ report: ReturnType<typeof validateIntake>; diagnosis: Diagnosis }> {
  onStatus("intake", "running");
  await sleep(450);
  const report = validateIntake(intake);
  onStatus("intake", "complete");
  onStatus("diagnostic", "running");
  await sleep(500);
  const diagnosis = diagnose(intake, report);
  onStatus("diagnostic", "needs_approval");
  return { report, diagnosis };
}

export async function runStrategic(
  intake: Intake,
  diagnosis: Diagnosis,
  onStatus: (id: AgentId, status: AgentStatus) => void,
) {
  const approved: Diagnosis = {
    ...diagnosis,
    approved: true,
    approvedAt: diagnosis.approvedAt ?? new Date().toISOString(),
  };
  onStatus("diagnostic", "approved");
  onStatus("strategic", "running");
  await sleep(500);
  const generated = generateVariants(intake);
  const enriched = await enrichVariantsWithGemini(intake, generated);
  const strategy = generateStrategy(intake, approved);
  onStatus("strategic", "needs_approval");
  return { variants: enriched.variants, strategy, angles: enriched.angles };
}

export async function runMedia(
  intake: Intake,
  onStatus: (id: AgentId, status: AgentStatus) => void,
) {
  onStatus("strategic", "approved");
  onStatus("media", "running");
  await sleep(400);
  const media = generateMedia(intake);
  onStatus("media", "needs_approval");
  return { media };
}

export async function runOptimizerStage(
  intake: Intake,
  media: ReturnType<typeof generateMedia>,
  onStatus: (id: AgentId, status: AgentStatus) => void,
) {
  onStatus("media", "approved");
  onStatus("optimizer", "running");
  await sleep(350);
  const optimizer = generateOptimizer(intake, media);
  onStatus("optimizer", "complete");
  return { optimizer };
}

/** Full 5-agent pipeline. HITL gates are recorded on the pack; ads/landing/WhatsApp are produced. */
export async function runFullPipeline(
  intake: Intake,
  onStatus: (id: AgentId, status: AgentStatus) => void,
): Promise<CampaignPack> {
  const { report, diagnosis } = await runIntakeAndDiagnosis(intake, onStatus);
  const { variants, strategy, angles } = await runStrategic(intake, diagnosis, onStatus);
  const { media } = await runMedia(intake, onStatus);
  const { optimizer } = await runOptimizerStage(intake, media, onStatus);
  const pack = assemblePack(intake, {
    report,
    diagnosis: { ...diagnosis, approved: true, approvedAt: new Date().toISOString() },
    variants,
    strategy,
    media,
    optimizer,
    angles,
    agentStatus: {
      intake: "complete",
      diagnostic: "approved",
      strategic: "approved",
      media: "approved",
      optimizer: "complete",
    },
  });
  const overlaid = await overlayPackAgency(pack);
  return { ...overlaid, saved: true };
}


function apiUrl(path: string): string {
  if (typeof window !== "undefined") return path;
  const base = process.env.NEXT_PUBLIC_BASE_URL?.trim() || "http://127.0.0.1:43147";
  return `${base.replace(/\/$/, "")}${path}`;
}

function proDeskUrl(): string {
  return apiUrl("/api/generate/pro-desk");
}

function researchUrl(): string {
  return apiUrl("/api/research");
}

function factsFromIntake(intake: Intake, brief?: CampaignBrief): string {
  return [
    "LAYER A — BUSINESS TRUTH (authoritative facts only; do not mix other layers into these facts):",
    intake.businessName && `businessName: ${intake.businessName}`,
    intake.category && `category: ${intake.category}`,
    intake.description && `description: ${intake.description}`,
    intake.audience && `audience: ${intake.audience}`,
    intake.uniqueAdvantage && `uniqueAdvantage: ${intake.uniqueAdvantage}`,
    intake.biggestProblem && `biggestProblem: ${intake.biggestProblem}`,
    intake.offer && `offer: ${intake.offer}`,
    intake.location && `location: ${intake.location}`,
    intake.website && `website: ${intake.website}`,
    intake.whatsapp && `whatsapp: ${intake.whatsapp}`,
    intake.clinicHours && `clinicHours: ${intake.clinicHours}`,
    "",
    "LAYER B — CAMPAIGN CONTEXT (not customer facts):",
    brief?.vertical && `vertical: ${brief.vertical}`,
    brief?.geo && `geo: ${brief.geo}`,
    intake.mainGoal && `goal: ${intake.mainGoal}`,
    "",
    "LAYER D — MARKET / STRATEGY HINT (strategy only — never copy competitor prices, discounts, or stats into customer facts):",
    brief?.heroIdeaId && `preferredAngleId: ${brief.heroIdeaId}`,
    brief?.angleIds?.length && `angleIds: ${brief.angleIds.join(",")}`,
  ]
    .filter((line) => line !== undefined)
    .join("\n");
}

async function fetchProDesk(intake: Intake, brief?: CampaignBrief): Promise<ProDeskInsights> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 28_000);
  try {
    const res = await fetch(proDeskUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: factsFromIntake(intake, brief),
        audience: intake.audience,
        mode: "strategy",
        facts: {
          businessName: intake.businessName,
          category: intake.category,
          description: intake.description,
          audience: intake.audience,
          uniqueAdvantage: intake.uniqueAdvantage,
          biggestProblem: intake.biggestProblem,
          offer: intake.offer,
          location: intake.location,
          website: intake.website,
          niche: intake.voice?.niche,
          vertical: brief?.vertical,
          heroIdeaId: brief?.heroIdeaId,
          coreMessage: brief?.coreMessage.en,
          angleIds: brief?.angleIds,
        },
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) return { tier: "pro", down: true, reason: "gemini_error" };
    const data = (await res.json()) as ProDeskInsights;
    if (!data || data.tier !== "pro") return { tier: "pro", down: true, reason: "gemini_error" };
    return data;
  } catch {
    return { tier: "pro", down: true, reason: "gemini_error" };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchResearch(intake: Intake, brief?: CampaignBrief): Promise<ReturnType<typeof buildResearchSkeleton>> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 34_000);
  try {
    const res = await fetch(researchUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: factsFromIntake(intake, brief),
        audience: intake.audience,
        facts: {
          businessName: intake.businessName,
          category: intake.category,
          description: intake.description,
          audience: intake.audience,
          uniqueAdvantage: intake.uniqueAdvantage,
          biggestProblem: intake.biggestProblem,
          offer: intake.offer,
          location: intake.location,
          website: intake.website,
          niche: intake.voice?.niche,
          vertical: brief?.vertical,
          heroIdeaId: brief?.heroIdeaId,
          coreMessage: brief?.coreMessage.en,
        },
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) return buildResearchSkeleton(intake);
    const data = (await res.json()) as ReturnType<typeof buildResearchSkeleton>;
    if (!data || !Array.isArray(data.sources)) return buildResearchSkeleton(intake);
    return data;
  } catch {
    try {
      return await runMarketResearch(intake);
    } catch {
      return { ...buildResearchSkeleton(intake), fetched: true };
    }
  } finally {
    clearTimeout(timer);
  }
}

async function fetchImagenVisual(pack: CampaignPack): Promise<{ src: string; publicUrl?: string } | null> {
  const loc = pack.completeAd?.locales.en || pack.completeAd?.locales.he;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 45_000);
  try {
    const res = await fetch("/api/imagen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessName: pack.intake.businessName,
        category: pack.intake.category,
        description: pack.intake.description,
        location: pack.intake.location,
        offer: pack.intake.offer,
        headline: loc?.headline,
        scene: loc?.imagePrompt || loc?.visual || pack.brief?.coreMessage.en,
        vertical: pack.brief?.vertical,
        locale: "en",
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      ok?: boolean;
      mime?: string;
      imageBase64?: string;
      publicUrl?: string;
    };
    if (!data?.ok || !data.imageBase64) return null;
    const mime = data.mime && data.mime.startsWith("image/") ? data.mime : "image/png";
    const src = `data:${mime};base64,${data.imageBase64}`;
    return { src, ...(data.publicUrl ? { publicUrl: data.publicUrl } : {}) };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Overlay Gemini channel copy onto agency creative pieces (he+ar+en). No-op if Gemini unavailable. */
export async function overlayPackAgency(pack: CampaignPack): Promise<CampaignPack> {
  let next = pack;
  const flashOverlay = (async () => {
    if (!pack.agency?.creative.pieces.length) return pack;
    try {
      const pieces = await overlayAgencyPieces(pack.intake, pack.agency.creative.pieces);
      return {
        ...pack,
        agency: {
          ...pack.agency,
          creative: { ...pack.agency.creative, pieces },
        },
      };
    } catch {
      return pack;
    }
  })();
  const proOverlay = fetchProDesk(pack.intake, pack.brief);
  const researchOverlay = fetchResearch(pack.intake, pack.brief);
  const imagenOverlay = fetchImagenVisual(pack);
  const [flashed, desk, research, imagen] = await Promise.all([flashOverlay, proOverlay, researchOverlay, imagenOverlay]);
  next = attachResearchAndSync(flashed, research);
  // Re-apply Flash pieces after sync rebuilds agency from the shared brief.
  if (flashed.agency?.creative.pieces?.length && next.agency) {
    next = {
      ...next,
      agency: {
        ...next.agency,
        creative: { ...next.agency.creative, pieces: flashed.agency.creative.pieces },
      },
    };
  }
  next = overlayProOnAgency(next, desk);
  if (imagen && next.completeAd) {
    next = {
      ...next,
      completeAd: {
        ...next.completeAd,
        visualSrc: imagen.src,
        visualPublicUrl: imagen.publicUrl || imagen.src,
        visualSource: "imagen",
      },
    };
  }
  const audit = next.pastCampaignAudit ?? buildPastCampaignAudit(next.intake);
  if (audit) {
    try {
      const overlaid = await overlayPastCampaignAudit(audit, creativesToPosts(next.intake.pastCreatives), {
        location: next.intake.location,
        description: next.intake.description,
      });
      next = { ...next, pastCampaignAudit: overlaid };
    } catch {
      next = { ...next, pastCampaignAudit: audit };
    }
  }
  return next;
}

export function assemblePack(
  intake: Intake,
  partial: {
    report: ReturnType<typeof validateIntake>;
    diagnosis: Diagnosis;
    variants?: CampaignPack["variants"];
    strategy?: CampaignPack["strategy"];
    media?: CampaignPack["media"];
    optimizer?: CampaignPack["optimizer"];
    agentStatus: Record<AgentId, AgentStatus>;
    id?: string;
    coach?: CampaignPack["coach"];
    angles?: CampaignAngles;
  },
): CampaignPack {
  return orchestrateAssemble(intake, partial);
}

/** Build any of the three published demos (clinic or fictional samples). */
export function buildDemoPack(idOrSlug: string = DEMO_ID, locale: Locale = typeof window !== "undefined" ? loadLocale() : "he"): CampaignPack {
  const entry = demoEntry(idOrSlug) ?? demoEntry(DEMO_ID)!;
  const packId = entry.id as DemoPackId;
  const intake =
    packId === DEMO_ID
      ? demoIntake(locale)
      : packId === DEMO_OLIVE_ID
        ? catalogIntake(DEMO_OLIVE_ID, locale)!
        : catalogIntake(DEMO_SAND_ID, locale)!;
  const report = validateIntake(intake);
  const diagnosis: Diagnosis = {
    ...diagnose(intake, report),
    approved: true,
    approvedAt: new Date().toISOString(),
  };
  const variants = generateVariants(intake);
  const strategy = generateStrategy(intake, diagnosis);
  const media = generateMedia(intake);
  const optimizer = generateOptimizer(intake, media);
  const pack = assemblePack(intake, {
    report,
    diagnosis,
    variants,
    strategy,
    media,
    optimizer,
    agentStatus: {
      intake: "complete",
      diagnostic: "approved",
      strategic: "approved",
      media: "approved",
      optimizer: "complete",
    },
    id: packId,
  });
  const meta = demoMetaFor(packId);
  return {
    ...pack,
    saved: true,
    planActivated: true,
    name: intake.businessName,
    demoMeta: {
      ...meta,
      ideaNames: {
        he: ideaNamesForLocale(intake, "he"),
        ar: ideaNamesForLocale(intake, "ar"),
        en: ideaNamesForLocale(intake, "en"),
      },
    },
  };
}
