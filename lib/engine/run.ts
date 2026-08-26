import type { AgentId, AgentStatus, CampaignPack, Diagnosis, Intake } from "../types";
import { uid, sleep } from "../utils";
import { validateIntake } from "./validate";
import { diagnose } from "./diagnose";
import { generateVariants } from "./copy";
import { generateStrategy } from "./strategy";
import { generateMedia } from "./media";
import { generateOptimizer } from "./optimizer";
import { buildAgency } from "./agency";
import { demoIntake, DEMO_ID } from "../demo";
import { loadLocale } from "../storage";

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
  const variants = generateVariants(intake);
  const strategy = generateStrategy(intake, approved);
  onStatus("strategic", "needs_approval");
  return { variants, strategy };
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
  const { variants, strategy } = await runStrategic(intake, diagnosis, onStatus);
  const { media } = await runMedia(intake, onStatus);
  const { optimizer } = await runOptimizerStage(intake, media, onStatus);
  const pack = assemblePack(intake, {
    report,
    diagnosis: { ...diagnosis, approved: true, approvedAt: new Date().toISOString() },
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
  });
  return { ...pack, saved: true };
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
  },
): CampaignPack {
  const now = new Date().toISOString();
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
  };
  return { ...base, agency: buildAgency(base) };
}

export function buildDemoPack(): CampaignPack {
  const intake = demoIntake(typeof window !== "undefined" ? loadLocale() : "he");
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
    id: DEMO_ID,
  });
  return { ...pack, saved: true, planActivated: true, name: intake.businessName };
}
