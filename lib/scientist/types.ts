import type { Locale } from "../types";
import type { MarketIntel } from "./market-types";

export type Uncertainty = "high" | "medium" | "low" | "unknown";
export type KnowledgeKind = "know" | "think" | "dont_know";
export type EvidenceSource =
  | "user_input"
  | "observed_metric"
  | "calculated"
  | "ai_interpretation"
  | "hypothesis"
  | "public_research";

export type LayerKind = "observed" | "calculated" | "ai_interpretation" | "hypothesis";

export interface EvidenceLink {
  source: EvidenceSource;
  ref: string;
  excerpt?: string;
  asOf: string;
  layer: LayerKind;
}

export interface LabeledText {
  text: string;
  uncertainty: Uncertainty;
  kind: KnowledgeKind;
  evidence: EvidenceLink[];
}

export interface BusinessRecord {
  id: string;
  name: string;
  category: string;
  location: string;
  website: string;
  operatingModel?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DnaTrait {
  id: string;
  topic: string;
  claim: string;
  confidence: Uncertainty;
  kind: KnowledgeKind;
  evidence: EvidenceLink[];
  updatedAt: string;
}

export interface BusinessDna {
  businessId: string;
  traits: DnaTrait[];
  updatedAt: string;
}

export interface AudienceNode {
  id: string;
  kind: "pain" | "desire" | "objection" | "segment";
  text: string;
  uncertainty: Uncertainty;
  knowledge: KnowledgeKind;
  evidence: EvidenceLink[];
}

export interface AudienceIntel {
  businessId: string;
  nodes: AudienceNode[];
  updatedAt: string;
}

export interface CompetitorGap {
  id: string;
  competitorName: string;
  competitorUrl?: string;
  observation: string;
  gap?: string;
  evidence: EvidenceLink[];
  uncertainty: Uncertainty;
}

export interface CompetitorIntel {
  businessId: string;
  gaps: CompetitorGap[];
  missing: boolean;
  updatedAt: string;
}

export interface Opportunity {
  id: string;
  title: string;
  whyNow: string;
  evidence: EvidenceLink[];
  confidence: Uncertainty;
  action: string;
  /** Never a fake win probability. Absent unless user entered a rate. */
  observedRate?: number;
  createdAt: string;
}

export type HypothesisStatus = "open" | "supported" | "contradicted" | "inconclusive" | "withdrawn";

export interface Hypothesis {
  id: string;
  statement: string;
  area: string;
  status: HypothesisStatus;
  result?: string;
  conclusion?: string;
  evidence: EvidenceLink[];
  confidence: Uncertainty;
  createdAt: string;
  updatedAt: string;
  campaignId?: string;
}

export interface ExperimentVariant {
  id: string;
  name: string;
  notes: string;
}

export type ExperimentStatus = "draft" | "running" | "completed" | "abandoned";
export type ExperimentOutcome = "improved" | "worse" | "inconclusive" | "unknown";

export interface ExperimentMetric {
  name: string;
  baseline?: number;
  actual?: number;
  unit?: string;
}

export interface Experiment {
  id: string;
  hypothesisId?: string;
  name: string;
  status: ExperimentStatus;
  variants: ExperimentVariant[];
  metrics: ExperimentMetric[];
  outcome: ExperimentOutcome;
  /** Code-computed deltas only. Never "p < 0.05". */
  deltas: Array<{ name: string; delta: number; note: string }>;
  notes: string;
  createdAt: string;
  updatedAt: string;
  campaignId?: string;
}

export interface CreativeScore {
  variantId: string;
  label: string;
  prePublishScore?: number;
  prePublishNote: string;
  actualMetric?: number;
  actualNote: string;
}

export interface CreativeBattle {
  campaignId?: string;
  scores: CreativeScore[];
  updatedAt: string;
}

export interface FunnelStep {
  name: string;
  value?: number;
  present: boolean;
}

export interface PerformanceIntel {
  observed: Array<{ label: string; value: string; evidence: EvidenceLink }>;
  calculated: Array<{ label: string; value: string; formula: string; evidence: EvidenceLink }>;
  aiInterpretation: Array<{ text: string; evidence: EvidenceLink }>;
  hypotheses: string[];
  funnel: FunnelStep[];
  updatedAt: string;
}

export interface ScientistLead {
  id: string;
  source: string;
  note: string;
  createdAt: string;
  campaignId?: string;
}

export interface Conversion {
  id: string;
  leadId?: string;
  kind: string;
  value?: number;
  createdAt: string;
  evidence: EvidenceLink[];
}

export interface RevenueEvent {
  id: string;
  amount: number;
  currency: string;
  source: string;
  createdAt: string;
  evidence: EvidenceLink[];
}

export interface RevenueAttribution {
  events: RevenueEvent[];
  total?: number;
  currency?: string;
  confidence: Uncertainty;
  note: string;
  updatedAt: string;
}

export interface LearningRecord {
  id: string;
  summary: string;
  dnaUpdates: string[];
  newHypothesisIds: string[];
  evidence: EvidenceLink[];
  createdAt: string;
}

export interface NextBestAction {
  action: string;
  reason: string;
  evidence: EvidenceLink[];
  uncertainty: Uncertainty;
  updatedAt: string;
}

export interface KnowledgeItem {
  text: string;
  evidence: EvidenceLink[];
}

export interface KnowledgeBoard {
  know: KnowledgeItem[];
  think: KnowledgeItem[];
  dontKnow: KnowledgeItem[];
  updatedAt: string;
}

export interface GrowthWorkspace {
  id: string;
  ownerId?: string;
  clientId?: string;
  businessId: string;
  business: BusinessRecord;
  dna: BusinessDna;
  audience: AudienceIntel;
  competitors: CompetitorIntel;
  opportunities: Opportunity[];
  hypotheses: Hypothesis[];
  experiments: Experiment[];
  creativeBattle: CreativeBattle;
  performance: PerformanceIntel;
  leads: ScientistLead[];
  conversions: Conversion[];
  revenue: RevenueAttribution;
  learnings: LearningRecord[];
  nba: NextBestAction;
  knowledge: KnowledgeBoard;
  campaignIds: string[];
  /** Market DNA + scans. Optional on legacy blobs; normalize via ensureMarket(). */
  market?: MarketIntel;
  sample?: boolean;
  createdAt: string;
  updatedAt: string;
}

export const SCIENTIST_STORAGE_KEY = "sawek-scientist";
export const SCIENTIST_DEMO_STORAGE_KEY = "sawek-scientist-demo";
export const SCIENTIST_FEATURE_TYPE = "scientist";

export function emptyKnowledge(): KnowledgeBoard {
  return { know: [], think: [], dontKnow: [], updatedAt: new Date().toISOString() };
}

export function emptyNba(): NextBestAction {
  return {
    action: "",
    reason: "",
    evidence: [],
    uncertainty: "unknown",
    updatedAt: new Date().toISOString(),
  };
}
