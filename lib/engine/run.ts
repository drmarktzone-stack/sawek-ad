import type { AgentId, AgentStatus, CampaignPack, Diagnosis, Intake } from "../types";
import { uid, sleep } from "../utils";
import { validateIntake } from "./validate";
import { diagnose } from "./diagnose";
import { generateVariants } from "./copy";
import { generateStrategy } from "./strategy";
import { generateMedia } from "./media";
import { generateOptimizer } from "./optimizer";

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

export async function runAfterApproval(
  intake: Intake,
  diagnosis: Diagnosis,
  onStatus: (id: AgentId, status: AgentStatus) => void,
): Promise<Pick<CampaignPack, "variants" | "strategy" | "media" | "optimizer">> {
  const approved: Diagnosis = {
    ...diagnosis,
    approved: true,
    approvedAt: new Date().toISOString(),
  };
  onStatus("diagnostic", "approved");
  onStatus("strategic", "running");
  await sleep(550);
  const variants = generateVariants(intake);
  const strategy = generateStrategy(intake, approved);
  onStatus("strategic", "complete");
  onStatus("media", "running");
  await sleep(450);
  const media = generateMedia(intake);
  onStatus("media", "complete");
  onStatus("optimizer", "running");
  await sleep(350);
  const optimizer = generateOptimizer(intake, media);
  onStatus("optimizer", "complete");
  return { variants, strategy, media, optimizer };
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
  return {
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
  };
}
