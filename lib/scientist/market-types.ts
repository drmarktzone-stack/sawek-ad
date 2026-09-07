import type { ResearchSourceId, ResearchSourceStatus } from "../types";
import type { EvidenceLink, Uncertainty } from "./types";

/** Evidence label on every external signal. Never upgrade without source proof. */
export type ClaimLabel = "OBSERVED_FACT" | "INFERENCE" | "ESTIMATE" | "UNKNOWN";

export type MarketPlatform =
  | ResearchSourceId
  | "gemini_search_grounding"
  | "google_trends";

export type MarketCreativeKind = "public_ad" | "search_suggestion" | "grounded_note";

export interface MarketScanControls {
  region: string;
  language: string;
  industry: string;
  objective: string;
  lookbackDays: number;
  competitorCategory: string;
  query: string;
}

export interface MarketSourceRecord {
  id: string;
  platform: MarketPlatform;
  exploreUrl: string;
  status: ResearchSourceStatus | "unavailable";
  reason: string;
  lastCheckedAt: string;
}

export interface MarketPerformanceHint {
  label: string;
  value: string;
  claim: ClaimLabel;
}

export interface MarketCreative {
  id: string;
  scanId: string;
  kind: MarketCreativeKind;
  source: MarketPlatform;
  platform: MarketPlatform;
  url: string;
  advertiser?: string;
  region?: string;
  language?: string;
  category?: string;
  objective?: string;
  dates: { start?: string; end?: string; asOf: string };
  performance: MarketPerformanceHint[];
  extractedAt: string;
  title: string;
  snippet: string;
  hook?: string;
  problem?: string;
  desire?: string;
  promise?: string;
  angle?: string;
  offer?: string;
  proof?: string;
  cta?: string;
  format?: string;
  claim: ClaimLabel;
  media?: { kind: "image" | "video"; url: string; analyzed: boolean; note: string };
  fingerprint: string;
}

export interface CreativePattern {
  id: string;
  slug: string;
  name: string;
  description: string;
  exampleCount: number;
  platforms: string[];
  industries: string[];
  regions: string[];
  objectives: string[];
  period: { from: string; to: string };
  evidence: EvidenceLink[];
  creativeIds: string[];
  relevance: Uncertainty;
  confidence: Uncertainty;
  claim: ClaimLabel;
  /** Honest wording: "appears repeatedly across X examples" — never "guaranteed". */
  language: string;
}

export type MarketSignalKind = "new_advertiser" | "new_pattern" | "source_status" | "material_change";

export interface MarketSignal {
  id: string;
  kind: MarketSignalKind;
  title: string;
  claim: ClaimLabel;
  evidence: EvidenceLink[];
  material: boolean;
  createdAt: string;
  scanId: string;
}

export interface MarketDnaTrait {
  id: string;
  topic: string;
  claim: string;
  label: ClaimLabel;
  evidence: EvidenceLink[];
  confidence: Uncertainty;
  updatedAt: string;
}

export interface MarketDna {
  businessId: string;
  region: string;
  language: string;
  industry: string;
  objective: string;
  traits: MarketDnaTrait[];
  patternIds: string[];
  advertiserNames: string[];
  sourceStatuses: MarketSourceRecord[];
  lastScanId?: string;
  updatedAt: string;
}

export interface CompetitorInsight {
  id: string;
  competitorName?: string;
  patternSlug?: string;
  businessHas: boolean;
  marketHas: boolean;
  historicallyTested: boolean;
  gap: string;
  claim: ClaimLabel;
  evidence: EvidenceLink[];
  uncertainty: Uncertainty;
}

export interface RecommendedExperiment {
  id: string;
  title: string;
  hypothesisStatement: string;
  opportunityId?: string;
  patternId?: string;
  why: string;
  claim: ClaimLabel;
  evidence: EvidenceLink[];
  confidence: Uncertainty;
  tested: boolean;
  experimentId?: string;
}

export interface MarketWatchConfig {
  enabled: boolean;
  intervalHours: number;
  lastRunAt?: string;
  lastNotifyAt?: string;
  controls: MarketScanControls;
}

export interface MarketNotification {
  id: string;
  text: string;
  createdAt: string;
  signalId: string;
}

export interface MarketScan {
  id: string;
  businessId: string;
  campaignId?: string;
  controls: MarketScanControls;
  startedAt: string;
  finishedAt: string;
  cached: boolean;
  incremental: boolean;
  sources: MarketSourceRecord[];
  adIds: string[];
  signalIds: string[];
  reason?: string;
}

export interface MarketIntel {
  sources: MarketSourceRecord[];
  scans: MarketScan[];
  ads: MarketCreative[];
  patterns: CreativePattern[];
  signals: MarketSignal[];
  dna: MarketDna;
  insights: CompetitorInsight[];
  recommendedExperiments: RecommendedExperiment[];
  watch: MarketWatchConfig | null;
  notifications: MarketNotification[];
  nextBestExperiment?: RecommendedExperiment;
}

export const MARKET_SCAN_CACHE_MS = 30 * 60_000;
export const MARKET_AUTO_SCAN_MS = 6 * 60 * 60_000;
export const MARKET_MAX_ADS = 80;
export const MARKET_MAX_SCANS = 10;

export const KNOWN_PATTERN_SLUGS = [
  "problem-first",
  "testimonial",
  "offer-stack",
  "social-proof",
  "urgency",
  "before-after",
  "how-to",
  "founder-story",
  "comparison",
  "community",
] as const;

export type KnownPatternSlug = (typeof KNOWN_PATTERN_SLUGS)[number];

export function emptyMarketDna(businessId: string, controls?: Partial<MarketScanControls>): MarketDna {
  const t = new Date().toISOString();
  return {
    businessId,
    region: controls?.region || "",
    language: controls?.language || "",
    industry: controls?.industry || "",
    objective: controls?.objective || "",
    traits: [],
    patternIds: [],
    advertiserNames: [],
    sourceStatuses: [],
    updatedAt: t,
  };
}

export function emptyMarketIntel(businessId: string): MarketIntel {
  return {
    sources: [],
    scans: [],
    ads: [],
    patterns: [],
    signals: [],
    dna: emptyMarketDna(businessId),
    insights: [],
    recommendedExperiments: [],
    watch: null,
    notifications: [],
  };
}

export function defaultScanControls(partial?: Partial<MarketScanControls>): MarketScanControls {
  return {
    region: (partial?.region || "IL").trim() || "IL",
    language: (partial?.language || "he").trim() || "he",
    industry: (partial?.industry || "").trim(),
    objective: (partial?.objective || "").trim(),
    lookbackDays: Number.isFinite(partial?.lookbackDays) ? Math.max(1, Math.min(90, Number(partial?.lookbackDays))) : 7,
    competitorCategory: (partial?.competitorCategory || "").trim(),
    query: (partial?.query || "").trim(),
  };
}
