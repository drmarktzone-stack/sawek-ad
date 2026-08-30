export type Locale = "he" | "ar" | "en";
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
  /** Optional static URL (e.g. /rinan/pool1.jpg) used as <img src> without IndexedDB. */
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
}

export type Tri = Record<Locale, string>;

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
