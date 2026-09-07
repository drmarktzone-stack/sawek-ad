/**
 * Strict source separation for Create Ad.
 * A Business Truth — authoritative facts only
 * B Campaign Context — goal, depth, channels, vertical
 * C Previous Creative History — fingerprints / structure — NEVER a factual source
 * D Market Intelligence — strategy only
 * E AI Insights — labeled inferences
 * F Generated Content — output only
 */
import type {
  CampaignPack,
  CreativeFingerprint,
  Intake,
  MarketResearch,
  SourceLayerId,
} from "../../types";
import { isNoOffer } from "../../no-offer";
import { filled } from "../../utils";

export interface BusinessTruth {
  layer: "business_truth";
  name: string;
  category: string;
  description: string;
  location: string;
  website: string;
  whatsapp: string;
  hours: string;
  audience: string;
  problem: string;
  advantage: string;
  offer: string;
  offerIsNone: boolean;
  kupaFileBy: string;
  kupaMemberFrom: string;
  brandTone: string;
  brandPositioning: string;
  voiceNiche: string;
  voiceCore: string;
  voicePersonal: string;
  pastResults: string;
  avgOrderValue: string;
  marginPercent: string;
  targetCac: string;
  monthlyBudget: string;
  operatingModel?: string;
}

export interface CampaignContext {
  layer: "campaign_context";
  type: string;
  depth: string;
  goal: string;
  verticalHint: string;
  channelNotes: string;
  competitorsNamed: string[];
}

export interface CreativeHistoryLayer {
  layer: "creative_history";
  fingerprints: CreativeFingerprint[];
  /** Raw past ad text — structure/novelty only. Never copy claims into Business Truth. */
  pastAdText: string;
  pastCreativeTexts: string[];
}

export interface MarketIntelLayer {
  layer: "market_intelligence";
  notes: Array<{ title: string; note: string; sourceUrl?: string; asOf?: string }>;
  competitorObservations: Array<{ name: string; notes: string }>;
  grounded: boolean;
  fetched: boolean;
}

export interface AiInsightLayer {
  layer: "ai_insights";
  insights: string[];
}

export interface GeneratedLayer {
  layer: "generated_content";
  texts: string[];
}

export interface SourceLayers {
  businessTruth: BusinessTruth;
  campaignContext: CampaignContext;
  creativeHistory: CreativeHistoryLayer;
  marketIntel: MarketIntelLayer;
  aiInsights: AiInsightLayer;
  generated: GeneratedLayer;
}

export function businessKey(name: string): string {
  const n = String(name ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\u0590-\u05ff\u0600-\u06ff.-]/g, "")
    .slice(0, 80);
  return n || "unnamed-business";
}

export function buildBusinessTruth(intake: Intake): BusinessTruth {
  return {
    layer: "business_truth",
    name: intake.businessName.trim(),
    category: intake.category.trim(),
    description: intake.description.trim(),
    location: intake.location.trim(),
    website: intake.website.trim(),
    whatsapp: intake.whatsapp.trim(),
    hours: intake.clinicHours.trim(),
    audience: intake.audience.trim(),
    problem: intake.biggestProblem.trim(),
    advantage: intake.uniqueAdvantage.trim(),
    offer: intake.offer.trim(),
    offerIsNone: isNoOffer(intake.offer),
    kupaFileBy: intake.kupaFileBy.trim(),
    kupaMemberFrom: intake.kupaMemberFrom.trim(),
    brandTone: (intake.voice?.personalVoice || intake.brandTone || "").trim(),
    brandPositioning: intake.brandPositioning.trim(),
    voiceNiche: (intake.voice?.niche || "").trim(),
    voiceCore: (intake.voice?.coreMessage || "").trim(),
    voicePersonal: (intake.voice?.personalVoice || "").trim(),
    pastResults: intake.pastResults.trim(),
    avgOrderValue: intake.avgOrderValue.trim(),
    marginPercent: intake.marginPercent.trim(),
    targetCac: intake.targetCac.trim(),
    monthlyBudget: intake.monthlyBudget.trim(),
    operatingModel: intake.operatingModel,
  };
}

export function buildCampaignContext(intake: Intake, vertical?: string): CampaignContext {
  return {
    layer: "campaign_context",
    type: intake.type,
    depth: intake.depth,
    goal: intake.mainGoal.trim(),
    verticalHint: (vertical || intake.category || "").trim(),
    channelNotes: intake.channelNotes.trim(),
    competitorsNamed: intake.competitors.map((c) => c.name.trim()).filter(Boolean),
  };
}

export function buildCreativeHistoryLayer(
  intake: Intake,
  fingerprints: CreativeFingerprint[] = [],
): CreativeHistoryLayer {
  return {
    layer: "creative_history",
    fingerprints,
    pastAdText: intake.pastAds.trim(),
    pastCreativeTexts: (intake.pastCreatives ?? [])
      .map((c) => [c.headline, c.body, c.cta].filter(Boolean).join("\n").trim())
      .filter(Boolean),
  };
}

export function buildMarketIntelLayer(
  intake: Intake,
  research?: MarketResearch,
): MarketIntelLayer {
  const notes = (research?.notes ?? []).map((n) => ({
    title: n.title.en || n.title.he || n.title.ar,
    note: n.note.en || n.note.he || n.note.ar,
    sourceUrl: n.sourceUrl,
    asOf: n.asOf,
  }));
  return {
    layer: "market_intelligence",
    notes,
    competitorObservations: intake.competitors.map((c) => ({
      name: c.name.trim(),
      notes: c.notes.trim(),
    })),
    grounded: Boolean(research?.grounded),
    fetched: Boolean(research?.fetched),
  };
}

export function buildAiInsightLayer(pack?: CampaignPack): AiInsightLayer {
  const insights: string[] = [];
  for (const h of pack?.diagnosis?.hypotheses ?? []) {
    const finding = h.finding.en || h.finding.he || "";
    if (finding.trim()) insights.push(`INFERENCE · diagnosis.${h.area}: ${finding.trim()}`);
  }
  if (pack?.brief?.coreMessage.en) {
    insights.push(`INFERENCE · brief.coreMessage: ${pack.brief.coreMessage.en}`);
  }
  return { layer: "ai_insights", insights };
}

export function buildGeneratedLayer(pack?: CampaignPack): GeneratedLayer {
  const texts: string[] = [];
  for (const v of pack?.variants ?? []) {
    texts.push([v.headline, v.primaryText, v.cta].filter(Boolean).join("\n"));
  }
  if (pack?.completeAd) {
    for (const loc of Object.values(pack.completeAd.locales)) {
      texts.push([loc.headline, loc.copy, loc.cta].filter(Boolean).join("\n"));
    }
  }
  return { layer: "generated_content", texts };
}

export function separateSources(
  intake: Intake,
  opts?: {
    pack?: CampaignPack;
    research?: MarketResearch;
    fingerprints?: CreativeFingerprint[];
    vertical?: string;
  },
): SourceLayers {
  return {
    businessTruth: buildBusinessTruth(intake),
    campaignContext: buildCampaignContext(intake, opts?.vertical),
    creativeHistory: buildCreativeHistoryLayer(intake, opts?.fingerprints ?? []),
    marketIntel: buildMarketIntelLayer(intake, opts?.research ?? opts?.pack?.research),
    aiInsights: buildAiInsightLayer(opts?.pack),
    generated: buildGeneratedLayer(opts?.pack),
  };
}

/** Concatenate ONLY Business Truth fields — never history, market, or generated. */
export function businessTruthBlob(truth: BusinessTruth): string {
  return [
    truth.name,
    truth.category,
    truth.description,
    truth.location,
    truth.website,
    truth.whatsapp,
    truth.hours,
    truth.audience,
    truth.problem,
    truth.advantage,
    truth.offerIsNone ? "" : truth.offer,
    truth.kupaFileBy,
    truth.kupaMemberFrom,
    truth.brandTone,
    truth.brandPositioning,
    truth.voiceNiche,
    truth.voiceCore,
    truth.voicePersonal,
    truth.pastResults,
    truth.avgOrderValue,
    truth.marginPercent,
    truth.targetCac,
    truth.monthlyBudget,
  ]
    .filter((s) => filled(s))
    .join("\n");
}

export function businessTruthLines(truth: BusinessTruth): string {
  const row = (k: string, v: string) => (v.trim() ? `${k}: ${v.trim()}` : "");
  return [
    row("businessName", truth.name),
    row("category", truth.category),
    row("description", truth.description),
    row("location", truth.location),
    row("website", truth.website),
    row("whatsapp", truth.whatsapp),
    row("clinicHours", truth.hours),
    row("audience", truth.audience),
    row("biggestProblem", truth.problem),
    row("uniqueAdvantage", truth.advantage),
    row("offer", truth.offer),
    row("kupaFileBy", truth.kupaFileBy),
    row("kupaMemberFrom", truth.kupaMemberFrom),
    row("brandTone", truth.brandTone),
    row("brandPositioning", truth.brandPositioning),
    row("coreNiche", truth.voiceNiche),
    row("coreMessage", truth.voiceCore),
    row("personalVoice", truth.voicePersonal),
    row("pastResults", truth.pastResults),
  ]
    .filter(Boolean)
    .join("\n");
}

export function campaignContextLines(ctx: CampaignContext): string {
  return [
    ctx.type && `type: ${ctx.type}`,
    ctx.depth && `depth: ${ctx.depth}`,
    ctx.goal && `goal: ${ctx.goal}`,
    ctx.verticalHint && `vertical: ${ctx.verticalHint}`,
    ctx.channelNotes && `channelNotes: ${ctx.channelNotes}`,
    ctx.competitorsNamed.length && `namedCompetitors (do not copy their offers): ${ctx.competitorsNamed.join(", ")}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function marketStrategyLines(market: MarketIntelLayer): string {
  if (!market.notes.length && !market.competitorObservations.length) {
    return "Market intelligence: unavailable or empty. Do not invent trends, credentials, or stats.";
  }
  const notes = market.notes
    .slice(0, 6)
    .map((n) => `- STRATEGY ONLY (${n.asOf || "undated"}${n.sourceUrl ? ` · ${n.sourceUrl}` : ""}): ${n.title} — ${n.note}`)
    .join("\n");
  const comps = market.competitorObservations
    .filter((c) => c.name)
    .map((c) => `- Competitor observation (do NOT inject into customer facts): ${c.name}${c.notes ? ` — ${c.notes}` : ""}`)
    .join("\n");
  return ["Market intelligence — strategy only. Never treat competitor prices/offers/stats as this business's facts.", notes, comps]
    .filter(Boolean)
    .join("\n");
}

export function historyFingerprintLines(history: CreativeHistoryLayer): string {
  if (!history.fingerprints.length && !history.pastAdText && !history.pastCreativeTexts.length) {
    return "Creative history: none. Do not invent a past-ad story.";
  }
  const fps = history.fingerprints
    .slice(0, 12)
    .map((f) => `- fingerprint family=${f.family} angle=${f.angle} hook=${f.hook} structure=${f.structure} hash=${f.hash}`)
    .join("\n");
  return [
    "Previous creative history — FINGERPRINTS ONLY. Do not copy prices, discounts, testimonials, or claims from old ads into this business.",
    fps,
    history.pastCreativeTexts.length ? `Past creative count: ${history.pastCreativeTexts.length} (structure reference, not facts).` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export const SOURCE_LAYER_ORDER: SourceLayerId[] = [
  "business_truth",
  "campaign_context",
  "creative_history",
  "market_intelligence",
  "ai_insights",
  "generated_content",
];
