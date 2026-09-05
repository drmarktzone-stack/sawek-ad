import type { AgentId, AgentStatus, CampaignAngles, CampaignPack, Diagnosis, Intake } from "../types";
import { uid, sleep } from "../utils";
import { validateIntake } from "./validate";
import { diagnose } from "./diagnose";
import { generateVariants } from "./copy";
import { enrichVariantsWithGemini, overlayAgencyPieces } from "./gemini-enrich";
import { generateStrategy } from "./strategy";
import { generateMedia } from "./media";
import { generateOptimizer } from "./optimizer";
import { buildAgency } from "./agency";
import { coachIntake } from "./coach";
import { buildSiteAudit } from "./site-audit";
import { buildPastCampaignAudit, overlayPastCampaignAudit, creativesToPosts } from "./past-campaign-audit";
import { demoIntake, DEMO_ID } from "../demo";
import { catalogIntake, demoEntry, demoMetaFor, type DemoPackId, DEMO_OLIVE_ID, DEMO_SAND_ID } from "../demo-catalog";
import { loadLocale } from "../storage";
import { buildCmoIdeasPack, ideaNamesForLocale } from "./cmo-ideas";

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


/** Overlay Gemini channel copy onto agency creative pieces (he+ar+en). No-op if Gemini unavailable. */
export async function overlayPackAgency(pack: CampaignPack): Promise<CampaignPack> {
  let next = pack;
  if (pack.agency?.creative.pieces.length) {
    try {
      const pieces = await overlayAgencyPieces(pack.intake, pack.agency.creative.pieces);
      next = {
        ...next,
        agency: {
          ...pack.agency,
          creative: { ...pack.agency.creative, pieces },
        },
      };
    } catch {
      /* keep heuristic agency */
    }
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
  const now = new Date().toISOString();
  const pastCampaignAudit = buildPastCampaignAudit(intake);
  const cmoIdeas = buildCmoIdeasPack(intake, "he");
  const base: CampaignPack = {
    id: partial.id ?? uid("camp"),
    createdAt: now,
    updatedAt: now,
    name: intake.businessName || "Untitled campaign",
    intake,
    intakeReport: partial.report,
    diagnosis: partial.diagnosis,
    variants: partial.variants ?? [],
    strategy: partial.strategy ?? [],
    media: partial.media ?? generateMedia(intake),
    optimizer: partial.optimizer ?? generateOptimizer(intake, generateMedia(intake)),
    optimizerRuns: [],
    producedAds: [],
    agentStatus: partial.agentStatus,
    saved: false,
    planActivated: false,
    coach: partial.coach ?? coachIntake(intake),
    siteAudit: buildSiteAudit(intake),
    cmoIdeas,
    ...(pastCampaignAudit ? { pastCampaignAudit } : {}),
    ...(partial.angles ? { angles: partial.angles } : {}),
    featureType: "campaign",
  };
  return { ...base, agency: buildAgency(base) };
}

/** Build any of the three published demos (clinic or fictional samples). */
export function buildDemoPack(idOrSlug: string = DEMO_ID): CampaignPack {
  const locale = typeof window !== "undefined" ? loadLocale() : "he";
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
