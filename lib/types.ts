export type Locale = "he" | "ar" | "en";
export type CampaignType = "business" | "product" | "service" | "app" | "personal";
export type Depth = "quick" | "deep";

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
  businessName: string;
  category: string;
  description: string;
  location: string;
  website: string;
  whatsapp: string;
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
