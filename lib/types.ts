export type Locale = "he" | "ar" | "en";

export type SiteAuditKind = "strength" | "weakness";

export interface SiteAuditItem {
  id: string;
  kind: SiteAuditKind;
  label: Record<Locale, string>;
  evidence: Record<Locale, string>;
}

export interface SiteAudit {
  strengths: SiteAuditItem[];
  weaknesses: SiteAuditItem[];
  /** Public-trend notes with date + source URL — never invented metrics. */
  groundedNotes?: Array<{
    title: Record<Locale, string>;
    note: Record<Locale, string>;
    sourceUrl?: string;
    asOf: string;
  }>;
}

/** Agency read of old Facebook/Instagram posts as past campaigns. Evidence-only. */
export interface PastCampaignAudit {
  strengths: SiteAuditItem[];
  weaknesses: SiteAuditItem[];
  inferredAudience: Record<Locale, string>;
  recommendedAudience: Record<Locale, string>;
  failedWhere: SiteAuditItem[];
  source: "heuristic" | "gemini";
}

export type CampaignType = "business" | "product" | "service" | "app" | "personal";
export type Depth = "quick" | "deep";
/** Upstream of offer: commercial sale vs exposure-only institution. Not the no-offer chip. */
export type OperatingModel = "paid" | "free_service";

export type MediaAssetKind = "image" | "video";
export type MediaAssetLabel =
  | "logo"
  | "exterior"
  | "interior"
  | "doctor"
  | "waiting_room"
  | "before_after"
  | "other";

/** Metadata only — blobs live in IndexedDB, never a paid CDN. publicSrc is a static /public path (no IndexedDB). */
export interface MediaAssetMeta {
  id: string;
  kind: MediaAssetKind;
  mime: string;
  name: string;
  size: number;
  label: MediaAssetLabel;
  note: string;
  createdAt: string;
  /** Optional static URL (e.g. /icons/logo.png) used as <img src> without IndexedDB. */
  publicSrc?: string;
}

export type IngestDocKind = "pdf" | "txt" | "docx" | "image" | "url";
export type IngestTag = "past_creative" | "identity" | "branding" | "media_plan" | "leads" | "other";
export type IngestTargetStage =
  | "wizard_business"
  | "wizard_details"
  | "discovery_strategy"
  | "creative"
  | "media_plan"
  | "leads";

/** Confirmed old ad — reference structure only, never invented new claims. */
export interface PastCreative {
  id: string;
  sourceDocId: string;
  sourceName: string;
  headline: string;
  body: string;
  cta: string;
  tag: "past_creative";
  confirmedReal: boolean;
}

export interface IngestedDocument {
  id: string;
  name: string;
  mime: string;
  size: number;
  kind: IngestDocKind;
  tags: IngestTag[];
  excerpt: string;
  createdAt: string;
  assetId?: string;
}

export type AgentId =
  | "intake"
  | "diagnostic"
  | "strategic"
  | "media"
  | "optimizer";

export type AgentStatus =
  | "idle"
  | "running"
  | "blocked"
  | "needs_approval"
  | "approved"
  | "complete"
  | "refused";

export type VariantKind =
  | "strong_offer"
  | "very_short"
  | "emotional"
  | "narrative"
  | "direct_sales"
  | "unique_advantage";

export type DiagnosisArea =
  | "offer"
  | "hook"
  | "price"
  | "audience"
  | "creative"
  | "targeting"
  | "funnel";

export interface Competitor {
  id: string;
  name: string;
  url: string;
  notes: string;
}

/** Scanned brand kit — colors/logo from the live site only. Never invent a logo. */
export interface ClientBrandKit {
  logoSrc?: string;
  colors: string[];
  source: "scan" | "none";
}

export interface Intake {
  type: CampaignType;
  depth: Depth;
  operatingModel: OperatingModel;
  businessName: string;
  category: string;
  description: string;
  location: string;
  website: string;
  whatsapp: string;
  clinicHours: string;
  kupaFileBy: string;
  kupaMemberFrom: string;
  audience: string;
  audienceCustom: boolean;
  biggestProblem: string;
  problemCustom: boolean;
  uniqueAdvantage: string;
  advantageCustom: boolean;
  mainGoal: string;
  goalCustom: boolean;
  offer: string;
  offerCustom: boolean;
  competitors: Competitor[];
  businessModel: string;
  avgOrderValue: string;
  marginPercent: string;
  targetCac: string;
  monthlyBudget: string;
  pastAds: string;
  pastResults: string;
  whatFailed: string;
  mediaAssets: MediaAssetMeta[];
  ingestedDocs: IngestedDocument[];
  pastCreatives: PastCreative[];
  brandTone: string;
  brandPositioning: string;
  channelNotes: string;
  whatsappTemplates: string;
  landingLines: string;
  brandKit?: ClientBrandKit;
  /** Niche / core message / personal voice — define once; copy follows. */
  voice?: VoiceProfile;
  /** Grand Slam / value-equation offer built in Tool F — campaign-scoped. */
  offerBlueprint?: OfferBlueprint;
  /** User confirmed Skip — not recommended (ad-pack gate). */
  offerSkipConfirmed?: boolean;
}

export interface MissingFlag {
  field: string;
  label: Record<Locale, string>;
  reason: Record<Locale, string>;
  impact: Record<Locale, string>;
}

export interface Inconsistency {
  issue: Record<Locale, string>;
  detail: Record<Locale, string>;
}

export interface IntakeReport {
  completeness: number;
  missing: MissingFlag[];
  inconsistencies: Inconsistency[];
  refusedGuesses: Record<Locale, string>[];
}

export type CoachStage = "wizard_business" | "wizard_details" | "offer" | "channels" | "creative";

export interface CoachCritique {
  stage: CoachStage;
  finding: Record<Locale, string>;
  why: Record<Locale, string>;
  evidence: Record<Locale, string>;
}

export interface CoachSuggestion {
  field: string;
  current: string;
  proposed: Record<Locale, string>;
  reason: Record<Locale, string>;
  applySafe: boolean;
}

export interface CoachStrategy {
  id: string;
  title: Record<Locale, string>;
  body: Record<Locale, string>;
  plan7: Record<Locale, string>;
}

export interface CoachReport {
  score: number;
  vertical: string;
  critiques: CoachCritique[];
  suggestions: CoachSuggestion[];
  strategies: CoachStrategy[];
  anglesUsed: Record<Locale, string>[];
}

export interface DiagnosisHypothesis {
  area: DiagnosisArea;
  finding: Record<Locale, string>;
  evidence: Record<Locale, string>;
  recommendation: Record<Locale, string>;
  confidence: "low" | "medium" | "high";
}

export interface Diagnosis {
  summary: Record<Locale, string>;
  hypotheses: DiagnosisHypothesis[];
  approved: boolean;
  approvedAt?: string;
}

export interface AdVariant {
  kind: VariantKind;
  locale: Locale;
  headline: string;
  primaryText: string;
  cta: string;
}

export type AngleId = "pain" | "benefit" | "social_proof" | "story";
export type LabFeatureType = "angles" | "vision" | "score" | "campaign";

export interface AngleCopy {
  headline: string;
  copy: string;
  cta: string;
}

export type AngleLocales = Partial<Record<Locale, AngleCopy>>;
export type CampaignAngles = Partial<Record<AngleId, AngleLocales>>;

export interface LabRun {
  id: string;
  featureType: LabFeatureType;
  input: unknown;
  output: unknown;
  createdAt: string;
  clientId?: string;
}

export interface VisionShot {
  t: string;
  scene: string;
  onScreen: string;
  vo: string;
}

export interface VisionReel {
  channel: "reels" | "tiktok" | "shorts";
  shots: VisionShot[];
  he?: AngleCopy;
  ar?: AngleCopy;
  en?: AngleCopy;
}

export interface VisionResult {
  elements: string[];
  visualFixes: string[];
  reels: VisionReel[];
}

export interface ScoreRewritePack {
  headline: string;
  copy: string;
  cta: string;
}

export interface ScoreResult {
  score: number;
  weaknesses: string[];
  rewrite: Partial<Record<Locale, ScoreRewritePack>>;
}

export interface StrategyItem {
  title: Record<Locale, string>;
  body: Record<Locale, string>;
}

export interface StrategyBlock {
  id: string;
  items: StrategyItem[];
}

export type ChannelName = "meta" | "google" | "tiktok" | "youtube";

export interface ChannelBlueprint {
  channel: ChannelName;
  role: Record<Locale, string>;
  budgetSharePercent: number;
  dailyBudget?: number;
  monthlyBudget?: number;
  targeting: {
    geos: string[];
    age: string;
    interests: string[];
    exclusions: string[];
    placements: string;
    keywords: string[];
  };
  notes: Record<Locale, string>;
  worstCaseCpa?: number;
  realisticCpa?: number;
}

export interface MediaPlan {
  monthlyBudget?: number;
  split: ChannelBlueprint[];
  assumptions: Record<Locale, string>[];
  missingForLiveBuy: Record<Locale, string>[];
  worstCase: Record<Locale, string>;
  realistic: Record<Locale, string>;
  scenarioLeadsWorst?: number;
  scenarioLeadsRealistic?: number;
  scenarioFromUserNumbers: boolean;
}

export interface OptimizerPlaybook {
  ifThen: { if: Record<Locale, string>; then: Record<Locale, string> }[];
  killRules: Record<Locale, string>[];
  scaleRules: Record<Locale, string>[];
}

export interface OptimizerResultInput {
  spend: string;
  leads: string;
  purchases: string;
  ctr: string;
  notes: string;
}

export interface OptimizerAdvice {
  createdAt: string;
  input: OptimizerResultInput;
  advice: Record<Locale, string>[];
}

export interface ProducedAd {
  id: string;
  styleId: string;
  idea: string;
  headline: string;
  body: string;
  visualNotes: Record<Locale, string>;
  createdAt: string;
  assetId?: string;
}

/** Fact governance — never silently promote generated or market text to truth. */
export type FactStatus =
  | "VERIFIED"
  | "USER-PROVIDED"
  | "SOURCE-VERIFIED"
  | "INFERENCE"
  | "UNSUPPORTED"
  | "UNKNOWN";

export type SourceLayerId =
  | "business_truth"
  | "campaign_context"
  | "creative_history"
  | "market_intelligence"
  | "ai_insights"
  | "generated_content";

export type StrategyFamily =
  | "problem_led"
  | "transformation"
  | "proof"
  | "educational"
  | "authority"
  | "objection"
  | "comparison"
  | "demo"
  | "contrarian"
  | "emotional"
  | "social_proof"
  | "curiosity"
  | "reframing"
  | "market_gap"
  | "discovered"
  | "story"
  | "offer_led";

export type NoveltyStatus = "original" | "evolved" | "saturated" | "unknown";

/** Fingerprint of a generated creative. Learning / novelty only — never a factual source. */
export interface CreativeFingerprint {
  id: string;
  businessId: string;
  ownerId?: string;
  clientId?: string;
  campaignId?: string;
  createdAt: string;
  family: StrategyFamily;
  ideaId?: string;
  angle: string;
  hook: string;
  problem: string;
  promise: string;
  offer: string;
  proof: string;
  trigger: string;
  framing: string;
  cta: string;
  structure: string;
  visual: string;
  format: string;
  hash: string;
}

export interface CompleteAdLocale {
  concept: string;
  why: string;
  audience: string;
  angle: string;
  hook: string;
  headline: string;
  copy: string;
  offer?: string;
  proof?: string;
  cta: string;
  visual: string;
  format: string;
  platform: string;
  imagePrompt?: string;
  /** How the image is treated — overlay / separate headline / image only. */
  imageTreatment?: string;
}

export interface CompleteAdScores {
  relevance: number;
  objective: number;
  audience: number;
  evidence: number;
  novelty: number;
  clarity: number;
  persuasion: number;
  platform: number;
  factualSafety: number;
  saturation: number;
  marketOpportunity: number;
  total: number;
}

export interface CompleteAdPackage {
  family: StrategyFamily;
  locales: Record<Locale, CompleteAdLocale>;
  language: Locale;
  factStatus: FactStatus;
  noveltyStatus: NoveltyStatus;
  compliance: { ok: boolean; notes: string[] };
  fingerprint: CreativeFingerprint;
  validation: { passed: boolean; repaired: boolean; attempts: number; failures: string[] };
  marketUsed: boolean;
  marketEvidence?: string;
  /** True when every strategic direction was already used and no safe new framing exists. */
  directionsExhausted?: boolean;
  noveltyReason?: string;
  imageComposition?: ImageCompositionDecision;
  /** Persisted Imagen / composition still — data URL or /api/imagen/:id. */
  visualSrc?: string;
  visualPublicUrl?: string;
  visualSource?: "imagen" | "asset" | "composition";
  metadata?: {
    scores: CompleteAdScores;
    candidateFamilies: StrategyFamily[];
    sourceLayers: SourceLayerId[];
    rejectedFamilies?: StrategyFamily[];
    selectedFrom?: StrategyFamily[];
    /** Honest stack trace from Create Complete Ad — never invents live metrics. */
    gcp?: {
      pro?: boolean;
      flash?: boolean;
      imagen?: boolean;
      translation?: boolean;
      grounding?: boolean;
    };
  };
}

export type ImageCompositionMode =
  | "overlay_safe"
  | "safe_zone_top"
  | "safe_zone_bottom"
  | "separate_headline"
  | "image_only";

export interface ImageBandAnalysis {
  id: "top" | "middle" | "bottom";
  edgeDensity: number;
  contrast: number;
  likelyText: boolean;
  likelyFace: boolean;
  likelyLogo: boolean;
}

export interface ImageCompositionDecision {
  mode: ImageCompositionMode;
  collision: boolean;
  hasExistingText: boolean;
  hasLogo: boolean;
  hasFaceHint: boolean;
  hasProductHint: boolean;
  safeBands: Array<"top" | "middle" | "bottom">;
  reason: string;
  source: "heuristic" | "pixels" | "vision" | "unknown";
}

export interface CampaignPack {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  intake: Intake;
  intakeReport: IntakeReport;
  diagnosis: Diagnosis;
  variants: AdVariant[];
  strategy: StrategyBlock[];
  media: MediaPlan;
  optimizer: OptimizerPlaybook;
  optimizerRuns: OptimizerAdvice[];
  producedAds: ProducedAd[];
  agentStatus: Record<AgentId, AgentStatus>;
  saved: boolean;
  planActivated: boolean;
  agency?: AgencyPack;
  coach?: CoachReport;
  siteAudit?: SiteAudit;
  pastCampaignAudit?: PastCampaignAudit;
  angles?: CampaignAngles;
  featureType?: LabFeatureType;
  lab?: LabRun[];
  clientId?: string;
  /** Signed-in Supabase user id when the pack was saved. Used to isolate remote sync. */
  ownerId?: string;
  /** Owner opted in to share-by-id landing. Default false — never implied. */
  shareEnabled?: boolean;
  /** Product demo / sample pack markers (clinic real; others fictional samples). */
  demoMeta?: {
    sample: true;
    fictional: boolean;
    kind: "clinic" | "restaurant" | "retail" | string;
    labels?: Record<Locale, string>;
    note?: Record<Locale, string>;
    /** Featured CMO idea names (HE/AR/EN) for demo picker */
    ideaNames?: Partial<Record<Locale, string[]>>;
  };
  /** Single orchestration brain — CMO, ads, calendar, viral, images share this. */
  brief?: CampaignBrief;
  /** CMO planning ideas + scorecard (never performance ROAS). */
  cmoIdeas?: CmoIdeasPack;
  /** Vertex Gemini Pro desk — strategy / audit / calendar / scripts. */
  proDesk?: {
    audience?: Record<Locale, string>;
    strategy?: Record<Locale, string>;
    psychology?: Record<Locale, string>;
    audit?: Record<Locale, string>[];
    calendarWeeks?: Array<{ week: number; theme: Record<Locale, string>; action: Record<Locale, string> }>;
    scripts?: Array<{ channel: string; he: string; ar: string; en: string }>;
    model?: string;
    provider?: "vertex" | "ai_studio";
    tier: "pro";
    down?: boolean;
    reason?: string;
    asOf?: string;
    grounded?: boolean;
    sources?: { url: string; title?: string }[];
  };
  /** Free public ad-intelligence desk (Meta Library, TikTok CC, peers). */
  research?: MarketResearch;
  /** Vertex Gemini Flash burst variations (Meta / Google / WhatsApp / story). */
  flashVariations?: {
    variations: Array<{
      id: string;
      channel: "meta" | "google" | "whatsapp" | "story";
      kind: string;
      he?: { headline: string; body: string; cta: string };
      ar?: { headline: string; body: string; cta: string };
      en?: { headline: string; body: string; cta: string };
    }>;
    model?: string;
    localized?: boolean;
    translationDown?: boolean;
  };
  /** Short-form viral desk (scripts, carousel, bio, trends, remix, analysis). */
  viral?: ViralDeskState;
  /**
   * One-click complete ad. Generated content layer only — never written back
   * into Business DNA / intake facts.
   */
  completeAd?: CompleteAdPackage;
  /** Tool F — saved Grand Slam offer (mirrors intake.offerBlueprint). */
  offerBlueprint?: OfferBlueprint;
  /** Tool G — Hook–Story–Offer studio variants, per platform. */
  hsoStudio?: HsoStudioState;
}

export type VoiceDialect =
  | "he"
  | "ar-palestinian"
  | "ar-levant"
  | "ar-gulf"
  | "ar-egyptian"
  | "ar-light"
  | "ar-msa"
  | "en";

export interface VoiceProfile {
  niche: string;
  /** Who we speak to — Tool A audience lock. */
  audience: string;
  coreMessage: string;
  personalVoice: string;
  dialect: VoiceDialect | "";
  /** Up to 3 beliefs / values the brand stands on. */
  beliefs: string[];
  /** Phrases / claims we never say. */
  neverSay: string;
  /** True after Tool A lock — generators must reuse this voice. */
  locked: boolean;
  lockedAt?: string;
}

export type HsoPlatform = "meta" | "tiktok" | "google";

export interface OfferBlueprint {
  dreamOutcome: string;
  proof: string;
  timeToResult: string;
  customerEffort: string;
  price: string;
  objections: string;
  /** Guarantee copy is generated only when the user marks this real. */
  guaranteeReal: boolean;
  headline: string;
  valueStack: string[];
  guarantee: string;
  hooks: string[];
  locale: Locale;
  saved: boolean;
  savedAt?: string;
  skipped?: boolean;
}

export interface HsoVariant {
  id: string;
  platform: HsoPlatform;
  hook: string;
  story: string;
  offer: string;
  cta: string;
  format: string;
  locale: Locale;
}

export interface HsoStudioState {
  platform: HsoPlatform;
  locale: Locale;
  variants: HsoVariant[];
  generatedAt: string;
}

export type ViralScriptStyle =
  | "quiet_catalyst"
  | "data"
  | "trend"
  | "story"
  | "contrast"
  | "proof"
  | "direct";

export interface ViralScript {
  id: ViralScriptStyle;
  style: Tri;
  hook: string;
  spoken: string;
  onScreen: string;
  cta: string;
  beats: string[];
}

export interface ViralScriptPack {
  idea: string;
  locale: Locale;
  voice: VoiceProfile;
  scripts: ViralScript[];
  source: "template" | "gemini";
}

export interface CarouselSlide {
  index: number;
  headline: string;
  body: string;
  visual: string;
  /** Imagen 3 still when Vertex returns real bytes — never a fake SVG. */
  imageUrl?: string;
  imageSource?: "imagen";
}

export interface CarouselPack {
  locale: Locale;
  caption: string;
  cta: string;
  slides: CarouselSlide[];
  source: "template" | "gemini";
  imagenNote?: string;
}

export interface BioPack {
  locale: Locale;
  instagram: string;
  tiktok: string;
  facebook: string;
  linkedin: string;
  whatsapp: string;
  source: "template" | "gemini";
}

export interface TrendAngle {
  id: string;
  title: string;
  angle: string;
  hook: string;
  why: string;
  sourceUrl?: string;
}

export interface TrendPack {
  locale: Locale;
  asOf: string;
  disclaimer: string;
  angles: TrendAngle[];
  source: "template" | "gemini";
  grounded?: boolean;
}

export interface RemixResult {
  status: "ok" | "need_transcript";
  locale: Locale;
  publicText?: string;
  sourceUrl?: string;
  note: string;
  script?: ViralScript;
  source: "template" | "gemini" | "public_text";
}

export interface RetentionPoint {
  t: number;
  v: number;
}

export interface VideoAnalysis {
  kind: "planning_heuristic";
  estimateKind: "gemini_pro_estimate";
  notLiveMetrics: true;
  locale: Locale;
  disclaimer: string;
  hookPotential: number;
  clarity: number;
  ctaClarity: number;
  /** Estimated Hook Rate % — AI planning, not live Meta/TikTok. */
  estimatedHookRate: number;
  /** Estimated Avg Watch % — AI planning, not live platform watch time. */
  estimatedAvgWatch: number;
  /** Estimated retention curve points (seconds → %). Not a live API curve. */
  retentionCurve: RetentionPoint[];
  notes: string[];
  source: "template" | "gemini";
  usedFrame: boolean;
  usedCaption: boolean;
}

export interface ViralHookLine {
  id: string;
  text: string;
  seconds: "0-3";
}

export interface ViralHookPack {
  locale: Locale;
  idea: string;
  hooks: ViralHookLine[];
  source: "template" | "gemini";
}

export interface ViralDeskState {
  idea: string;
  scripts?: ViralScriptPack;
  hooks?: ViralHookPack;
  carousel?: CarouselPack;
  bios?: BioPack;
  trends?: TrendPack;
  remix?: RemixResult;
  analysis?: VideoAnalysis;
}

export type Tri = Record<Locale, string>;

export type CmoScoreDimensionId =
  | "message_clarity"
  | "offer_clarity"
  | "proof_gaps"
  | "channel_fit"
  | "creative_variety";

export interface CmoScoreDimension {
  id: CmoScoreDimensionId;
  label: Tri;
  /** Planning score 1–100 — NEVER performance ROAS */
  score: number;
  note: Tri;
}

export interface CmoGapMove {
  missingField: string;
  move: Tri;
  /** now = shoot/write this week; later = optional numbers, never a shame wall */
  priority?: "now" | "later";
}

export interface CmoGapPlan {
  missing: string[];
  moves: CmoGapMove[];
}

export interface CmoIdea {
  id: string;
  name: Tri;
  whyItWins: Tri;
  hook: Tri;
  narrativeArc: Tri;
  platform: Tri;
  scorecard: CmoScoreDimension[];
  planningScore: number;
}

export interface CmoIdeasPack {
  selected: CmoIdea[];
  gapPlan: CmoGapPlan;
  planningDisclaimer: Tri;
  /** Search-grounded public-pattern notes — never ROAS / views. */
  groundedNotes?: GroundedNote[];
}

export type ResearchSourceId =
  | "meta_ad_library"
  | "tiktok_creative_center"
  | "google_ads_transparency"
  | "pinterest_trends"
  | "youtube_suggest"
  | "linkedin_ad_library"
  | "google_suggest";

export type ResearchSourceStatus =
  | "ok"
  | "grounded"
  | "empty"
  | "blocked"
  | "rate_limited"
  | "no_token"
  | "pending";

export interface PublicAdExample {
  id: string;
  source: ResearchSourceId;
  advertiser?: string;
  page?: string;
  title: Tri;
  snippet: Tri;
  url: string;
  asOf: string;
  /** Observed search idea / keyword pattern — never an invented volume. */
  kind?: "public_ad" | "search_suggestion" | "keyword_pattern";
  queryUsed?: string;
}

export interface GroundedNote {
  title: Tri;
  note: Tri;
  sourceUrl?: string;
  asOf: string;
}

export interface ResearchSourceCard {
  id: ResearchSourceId;
  status: ResearchSourceStatus;
  label: Tri;
  exploreUrl: string;
  examples: PublicAdExample[];
  notes: GroundedNote[];
  emptyReason?: Tri;
  alternateSources?: Array<{ label: Tri; url: string }>;
  retryable?: boolean;
  /** Query actually sent to this source — shown even when UNKNOWN. */
  queryUsed?: string;
}

export interface MarketResearch {
  asOf: string;
  query: string;
  /** All queries actually sent to suggest/search endpoints. */
  queries?: string[];
  geo: string;
  sources: ResearchSourceCard[];
  notes: GroundedNote[];
  grounded: boolean;
  fetched: boolean;
  disclaimer: Tri;
}

/** One shared campaign brain. Every engine reads this — never invents a parallel story. */
export type CampaignVertical =
  | "clinic"
  | "restaurant"
  | "pool"
  | "school"
  | "product"
  | "retail"
  | "generic";

export interface CampaignFacts {
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
  goal: string;
  offer: string;
  offerIsNone: boolean;
  operatingModel: OperatingModel;
  brandTone: string;
}

export interface CampaignBrief {
  asOf: string;
  vertical: CampaignVertical;
  geo: string;
  facts: CampaignFacts;
  voice: VoiceProfile;
  gaps: CmoGapPlan;
  heroIdeaId: string;
  angleIds: string[];
  coreMessage: Tri;
  viralIdea: Tri;
  imageQueries: string[];
  researchAttached: boolean;
}


export interface Persona {
  name: Tri;
  jtbd: Tri;
  given: Tri;
  unknown: Tri;
}

export interface Battlecard {
  competitorId: string;
  name: string;
  notes: string;
  strength: Tri;
  weakness: Tri;
  opportunity: Tri;
  threat: Tri;
}

export interface DiscoveryDept {
  producedBy: AgentId[];
  audit: { title: Tri; body: Tri }[];
  icp: Tri;
  personas: Persona[];
  battlecards: Battlecard[];
  swot: { strength: Tri; weakness: Tri; opportunity: Tri; threat: Tri };
  competitorsMissing: Tri;
}

export interface OfferStack {
  leadMagnet: Tri;
  tripwire: Tri;
  core: Tri;
  upsell: Tri;
  continuity: Tri;
}

export interface CalendarWeek {
  week: number;
  theme: Tri;
  action: Tri;
}

export interface StrategyDept {
  producedBy: AgentId[];
  positioning: Tri;
  uniqueMechanism: Tri;
  hormozi: Tri;
  aida: { attention: Tri; interest: Tri; desire: Tri; action: Tri };
  pas: { problem: Tri; agitate: Tri; solution: Tri };
  hso: { hook: Tri; story: Tri; offer: Tri };
  offerStack: OfferStack;
  funnel: { tof: Tri; mof: Tri; bof: Tri };
  calendar: CalendarWeek[];
}

export interface HookItem {
  id: string;
  angle: Tri;
  hook: Tri;
}

export interface FactoryPiece {
  format: string;
  locale: Locale;
  title: string;
  body: string;
}

export interface CreativeDept {
  producedBy: AgentId[];
  hooks: HookItem[];
  angleMatrix: { angle: Tri; proof: Tri; cta: Tri }[];
  pieces: FactoryPiece[];
  brandKit: {
    sawek: { black: string; red: string; yellow: string };
    clientPrimary: string;
    clientSecondary: string;
    note: Tri;
  };
}

export interface AbTest {
  name: Tri;
  a: Tri;
  b: Tri;
  metric: Tri;
}

export interface MediaDept {
  producedBy: AgentId[];
  frequency: Tri;
  tests: AbTest[];
  weekly: Tri[];
  planOnly: Tri;
  audiences: Tri;
  keywords: string[];
  placements: Tri;
}

export interface LeadsDept {
  producedBy: AgentId[];
  magnet: Tri;
  formFields: { field: Tri; required: boolean }[];
  crm: { stage: Tri; meaning: Tri }[];
  bookingCta: Tri;
  promoCodes: Tri;
  retargeting: Tri;
  cadence: { day: string; channel: Tri; action: Tri }[];
}

export interface AgencyPack {
  discovery: DiscoveryDept;
  strategy: StrategyDept;
  creative: CreativeDept;
  mediaExtra: MediaDept;
  leads: LeadsDept;
}

export interface StudioPiece {
  id: string;
  createdAt: string;
  kind: "post" | "reel" | "story" | "email" | "headline";
  idea: string;
  locale: Locale;
  variants: { title: string; body: string }[];
  styleId?: string;
  /** Isolates library rows to one Business Truth. Never reuse clinic leftovers. */
  businessId?: string;
}

export interface SelfProfile {
  name: string;
  craft: string;
  audience: string;
  cadence: string;
  channels: string;
  offer: string;
}

export interface SelfPlan {
  id: string;
  createdAt: string;
  days: { day: Record<Locale, string>; task: Record<Locale, string>; done: boolean }[];
}

export type WizardStep = 1 | 2 | 3 | 4;
export type FlowPhase = "wizard" | "interview" | "agents" | "result";
