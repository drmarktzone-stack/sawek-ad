import type { AgentId, AgentStatus, CampaignPack, Intake, Locale } from "../types";
import { nextHitlGate, type HitlGate } from "./hitl";
import {
  assemblePack,
  overlayPackAgency,
  runIntakeAndDiagnosis,
  runMedia,
  runOptimizerStage,
  runStrategic,
} from "./run";

export type HitlStatusFn = (id: AgentId, status: AgentStatus) => void;

function withStatus(extra: CampaignPack["agentStatus"]): CampaignPack["agentStatus"] {
  return {
    intake: "complete",
    diagnostic: extra.diagnostic,
    strategic: extra.strategic,
    media: extra.media,
    optimizer: extra.optimizer,
  };
}

/** Apply exactly one HITL gate. Stays on the agents surface — no route changes. */
export async function applyHitlGate(
  intake: Intake,
  current: CampaignPack,
  gate: HitlGate,
  onStatus: HitlStatusFn,
  locale: Locale,
): Promise<CampaignPack> {
  if (gate === "complete") return current;

  if (gate === "diagnostic") {
    const built = await runStrategic(intake, current.diagnosis, onStatus);
    return overlayPackAgency(
      assemblePack(intake, {
        report: current.intakeReport,
        diagnosis: { ...current.diagnosis, approved: true, approvedAt: new Date().toISOString() },
        variants: built.variants,
        strategy: built.strategy,
        angles: built.angles,
        id: current.id,
        agentStatus: withStatus({
          intake: "complete",
          diagnostic: "approved",
          strategic: "needs_approval",
          media: "blocked",
          optimizer: "blocked",
        }),
      }),
      { locale },
    );
  }

  if (gate === "strategic") {
    const built = await runMedia(intake, onStatus);
    return overlayPackAgency(
      assemblePack(intake, {
        report: current.intakeReport,
        diagnosis: current.diagnosis,
        variants: current.variants,
        strategy: current.strategy,
        media: built.media,
        angles: current.angles,
        id: current.id,
        agentStatus: withStatus({
          intake: "complete",
          diagnostic: "approved",
          strategic: "approved",
          media: "needs_approval",
          optimizer: "blocked",
        }),
      }),
      { locale },
    );
  }

  const built = await runOptimizerStage(intake, current.media, onStatus);
  const next = await overlayPackAgency(
    assemblePack(intake, {
      report: current.intakeReport,
      diagnosis: current.diagnosis,
      variants: current.variants,
      strategy: current.strategy,
      media: current.media,
      optimizer: built.optimizer,
      angles: current.angles,
      id: current.id,
      agentStatus: withStatus({
        intake: "complete",
        diagnostic: "approved",
        strategic: "approved",
        media: "approved",
        optimizer: "complete",
      }),
    }),
    { locale },
  );
  return { ...next, saved: true };
}

export async function buildDiagnosisPack(
  intake: Intake,
  onStatus: HitlStatusFn,
  extras?: { id?: string; offerBlueprint?: CampaignPack["offerBlueprint"]; hsoStudio?: CampaignPack["hsoStudio"] },
): Promise<CampaignPack> {
  const { report, diagnosis } = await runIntakeAndDiagnosis(intake, onStatus);
  return {
    ...assemblePack(intake, {
      report,
      diagnosis,
      id: extras?.id,
      agentStatus: {
        intake: "complete",
        diagnostic: "needs_approval",
        strategic: "blocked",
        media: "blocked",
        optimizer: "blocked",
      },
    }),
    offerBlueprint: extras?.offerBlueprint ?? intake.offerBlueprint,
    hsoStudio: extras?.hsoStudio,
  };
}

/** Auto-approve remaining gates until the campaign is finished. */
export async function autoAdvanceHitlToEnd(
  intake: Intake,
  start: CampaignPack,
  onStatus: HitlStatusFn,
  locale: Locale,
  opts?: { pauseAfterOne?: boolean; onPack?: (pack: CampaignPack) => void },
): Promise<CampaignPack> {
  let current = start;
  for (let i = 0; i < 8; i++) {
    const gate = nextHitlGate(current.agentStatus, current);
    if (gate === "complete") return current;
    current = await applyHitlGate(intake, current, gate, onStatus, locale);
    opts?.onPack?.(current);
    if (opts?.pauseAfterOne) return current;
  }
  throw new Error("HITL auto-advance looped without completing");
}
