/**
 * Single campaign orchestration layer.
 *
 * After ingest (+ optional CMO fields) we build one CampaignBrief, run research
 * once, then derive CMO platforms, hooks, calendar, ad copy, viral idea, and
 * image queries FROM THAT BRIEF. Result / diagnosis / viral panels read the
 * same brief so a clinic cannot grow restaurant hooks.
 */
import type {
  AdVariant,
  CampaignBrief,
  CampaignPack,
  CampaignVertical,
  CmoIdea,
  CmoIdeasPack,
  Intake,
  Locale,
  MarketResearch,
  VariantKind,
} from "../types";
import { isIncompleteMarker } from "../channel-copy";
import { uid } from "../utils";
import { detectVertical } from "../vertical";
import { generateVariants } from "./copy";
import { generateMedia } from "./media";
import { generateOptimizer } from "./optimizer";
import { buildAgency } from "./agency";
import { coachIntake } from "./coach";
import { buildSiteAudit } from "./site-audit";
import { buildPastCampaignAudit } from "./past-campaign-audit";
import { buildCmoIdeasPack, gapCompensation, refreshIdeaFromCatalog } from "./cmo-ideas";
import { buildResearchSkeleton } from "./research-public";
import { clipAtWord, spokenHeadline } from "./spoken";
import { customerCopyHasLeak, gateCustomerAd } from "../copy-purity";
import { buildCampaignBrief, contradictsVertical, localeViralIdea } from "./campaign-brief";
import { applyResearchToPack } from "./research-overlay";
import { attachCompleteAd } from "./ad-engine/complete-ad";
import { excludeFromHistory } from "./ad-engine/fingerprint";
import { loadCreativeHistory } from "./ad-engine/memory";
import { businessKey } from "./ad-engine/sources";
import { applyCopyLinesToPack, attachLocalCopyLines, diversifyLocaleBatch } from "./copy-lines";
export { contradictsVertical, verticalLeakRe } from "./campaign-brief";

const KIND_ANGLE: VariantKind[] = [
  "strong_offer",
  "very_short",
  "emotional",
  "narrative",
  "direct_sales",
  "unique_advantage",
];

function ideaByKind(ideas: CmoIdea[], kind: VariantKind): CmoIdea | undefined {
  if (!ideas.length) return undefined;
  const idx = Math.max(0, KIND_ANGLE.indexOf(kind));
  return ideas[idx % ideas.length] ?? ideas[0];
}

function headlineLooksGeneric(headline: string, intake: Intake): boolean {
  const h = headline.replace(/\s+/g, " ").trim();
  if (!h) return true;
  if (isIncompleteMarker(h, "he") || isIncompleteMarker(h, "ar") || isIncompleteMarker(h, "en")) return true;
  const name = intake.businessName.trim();
  if (name && h === name) return true;
  return false;
}

function fillIncomplete(text: string, locale: Locale, intake: Intake, fallback: string): string {
  if (!isIncompleteMarker(text, locale) && text.trim()) return text;
  const name = intake.businessName.trim();
  const phone = intake.whatsapp.trim();
  if (name && phone) return fallback || name;
  if (name) return fallback || name;
  if (phone) return phone;
  return text;
}

function stripInternalMetricTalk(text: string): string {
  const cleaned = text
    .split("\n")
    .filter((line) => !/\bROAS\b/i.test(line) && !/\bCAC\b/.test(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return cleaned || text.replace(/\bROAS\b/gi, "").replace(/\bCAC\b/g, "").replace(/\s{2,}/g, " ").trim();
}

/**
 * Keep intake-grounded copy when it already has facts. Only stamp the shared
 * CMO hook onto generic / incomplete walls, and strip vertical leaks.
 */
export function alignVariantsToBrief(
  variants: AdVariant[],
  brief: CampaignBrief,
  intake: Intake,
  ideas: CmoIdea[],
): AdVariant[] {
  if (!variants.length) return variants;
  const vertical = brief.vertical;
  const aligned = variants.map((v) => {
    const idea = ideaByKind(ideas, v.kind) ?? ideas[0];
    const rawHook = idea?.hook[v.locale] || brief.coreMessage[v.locale] || "";
    const hook = rawHook && !customerCopyHasLeak(rawHook) ? rawHook : spokenHeadline(v.kind, intake, v.locale);
    let headline = v.headline;
    let body = v.primaryText;
    if (contradictsVertical(`${headline} ${body}`, vertical) && hook && !contradictsVertical(hook, vertical) && !customerCopyHasLeak(hook)) {
      headline = clipAtWord(hook, 48);
    } else if (headlineLooksGeneric(headline, intake) || customerCopyHasLeak(headline)) {
      headline = clipAtWord(spokenHeadline(v.kind, intake, v.locale), 48);
    }
    headline = fillIncomplete(headline, v.locale, intake, hook || intake.businessName);
    body = fillIncomplete(body, v.locale, intake, intake.description || intake.businessName);
    if (contradictsVertical(body, vertical)) {
      const safe = [intake.uniqueAdvantage, intake.location, intake.businessName].filter(Boolean).join(" ");
      if (safe && !contradictsVertical(safe, vertical)) body = clipAtWord(safe, 280);
    }
    headline = stripInternalMetricTalk(headline);
    body = stripInternalMetricTalk(body);
    const gated = gateCustomerAd({ headline, body, cta: v.cta }, intake, v.locale);
    return { ...v, headline: gated.headline, primaryText: gated.body, cta: gated.cta };
  });
  let diversified = aligned;
  for (const locale of ["he", "ar", "en"] as Locale[]) {
    diversified = diversifyLocaleBatch(diversified, intake, locale);
  }
  return diversified;
}

export function cmoPackFromBrief(intake: Intake, brief: CampaignBrief, existing?: CmoIdeasPack): CmoIdeasPack {
  const built = buildCmoIdeasPack(intake);
  const refresh = (id: string, fallback?: CmoIdea): CmoIdea | undefined =>
    refreshIdeaFromCatalog(intake, id) ?? built.selected.find((i) => i.id === id) ?? fallback;
  const fromBrief = brief.angleIds
    .map((id) => refresh(id))
    .filter((i): i is CmoIdea => Boolean(i));
  const fromExisting = (existing?.selected ?? []).map((i) => refresh(i.id, i)).filter((i): i is CmoIdea => Boolean(i));
  const ordered =
    fromBrief.length >= 3 ? fromBrief : fromExisting.length >= 3 ? fromExisting : built.selected;
  const ids = new Set(ordered.map((i) => i.id));
  const rest = built.selected.filter((i) => !ids.has(i.id));
  return {
    ...built,
    selected: [...ordered, ...rest].slice(0, 5),
    gapPlan: brief.gaps?.moves?.length ? brief.gaps : gapCompensation(intake),
    ...(existing?.groundedNotes?.length ? { groundedNotes: existing.groundedNotes } : {}),
  };
}

export function seedViralIdea(pack: CampaignPack, brief: CampaignBrief, locale: Locale = "he"): CampaignPack["viral"] {
  const idea = (pack.viral?.idea || "").trim() || localeViralIdea(brief, locale);
  return {
    ...(pack.viral ?? { idea }),
    idea,
  };
}

export type AssemblePartial = {
  report: CampaignPack["intakeReport"];
  diagnosis: CampaignPack["diagnosis"];
  variants?: CampaignPack["variants"];
  strategy?: CampaignPack["strategy"];
  media?: CampaignPack["media"];
  optimizer?: CampaignPack["optimizer"];
  agentStatus: CampaignPack["agentStatus"];
  id?: string;
  coach?: CampaignPack["coach"];
  angles?: CampaignPack["angles"];
  research?: MarketResearch;
};

/**
 * Hydrate / re-sync every engine from one brief. Safe to call on old packs.
 * Does not fetch AI — templates follow the brief when Gemini is down.
 */
export function syncPackEngines(pack: CampaignPack): CampaignPack {
  const ideasSeed = pack.cmoIdeas?.selected;
  const brief = buildCampaignBrief(pack.intake, {
    research: pack.research,
    ideas: ideasSeed,
  });
  const cmoIdeas = cmoPackFromBrief(pack.intake, brief, pack.cmoIdeas);
  const variants = alignVariantsToBrief(
    pack.variants.length ? pack.variants : generateVariants(pack.intake),
    brief,
    pack.intake,
    cmoIdeas.selected,
  );
  const viral = seedViralIdea(pack, brief);
  const next: CampaignPack = {
    ...pack,
    brief,
    cmoIdeas,
    variants,
    viral,
    updatedAt: new Date().toISOString(),
  };
  const withAgency = { ...next, agency: buildAgency(next) };
  const withAd = attachCompleteAd(withAgency, { rotate: false });
  if (pack.copyLines?.options.length) return applyCopyLinesToPack(withAd, pack.copyLines);
  return attachLocalCopyLines(withAd);
}

/** Fold research notes into the same brief / CMO pack — never a second set of angles. */
export function attachResearchAndSync(pack: CampaignPack, research: MarketResearch): CampaignPack {
  const withResearch = applyResearchToPack(pack, research);
  return syncPackEngines(withResearch);
}

export function orchestrateAssemble(intake: Intake, partial: AssemblePartial): CampaignPack {
  const history = loadCreativeHistory({
    businessId: businessKey(intake.businessName),
  });
  const exclude = excludeFromHistory(history);
  const brief = buildCampaignBrief(intake, {
    research: partial.research,
    ideas: undefined,
    excludeIds: exclude.ids,
  });
  const cmoIdeas = cmoPackFromBrief(intake, brief);
  const rawVariants = partial.variants ?? [];
  const variants = alignVariantsToBrief(
    rawVariants.length ? rawVariants : generateVariants(intake),
    brief,
    intake,
    cmoIdeas.selected,
  );
  const now = new Date().toISOString();
  const pastCampaignAudit = buildPastCampaignAudit(intake);
  const media = partial.media ?? generateMedia(intake);
  const base: CampaignPack = {
    id: partial.id ?? uid("camp"),
    createdAt: now,
    updatedAt: now,
    name: intake.businessName || "Untitled campaign",
    intake,
    intakeReport: partial.report,
    diagnosis: partial.diagnosis,
    variants,
    strategy: partial.strategy ?? [],
    media,
    optimizer: partial.optimizer ?? generateOptimizer(intake, media),
    optimizerRuns: [],
    producedAds: [],
    agentStatus: partial.agentStatus,
    saved: false,
    planActivated: false,
    coach: partial.coach ?? coachIntake(intake),
    siteAudit: buildSiteAudit(intake),
    brief,
    cmoIdeas,
    research: partial.research ?? buildResearchSkeleton(intake),
    viral: { idea: localeViralIdea(brief, "he") },
    ...(pastCampaignAudit ? { pastCampaignAudit } : {}),
    ...(partial.angles ? { angles: partial.angles } : {}),
    featureType: "campaign",
    ...(intake.offerBlueprint ? { offerBlueprint: intake.offerBlueprint } : {}),
  };
  const assembled = { ...base, agency: buildAgency(base) };
  const withAd = attachCompleteAd(assembled, { rotate: true });
  return attachLocalCopyLines(withAd);
}

export function briefVerticalOf(pack: CampaignPack): CampaignVertical {
  return pack.brief?.vertical ?? (detectVertical(pack.intake) as CampaignVertical);
}

export function heroIdeaOf(pack: CampaignPack): CmoIdea | undefined {
  const id = pack.brief?.heroIdeaId;
  const list = pack.cmoIdeas?.selected ?? [];
  return (id ? list.find((i) => i.id === id) : undefined) ?? list[0];
}
