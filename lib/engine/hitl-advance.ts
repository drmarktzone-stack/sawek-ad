import type { AgentId, AgentStatus, CampaignPack, Intake, Locale } from "../types";
import { nextHitlGate, packHasDiagnosis, type HitlGate } from "./hitl";
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

function diagnosisExtras(current: CampaignPack | null | undefined, intake: Intake) {
  return {
    id: current?.id,
    offerBlueprint: current?.offerBlueprint ?? intake.offerBlueprint,
    hsoStudio: current?.hsoStudio,
  };
}

/** Rebuild diagnosis from current intake when the draft pack is hollow. */
export async function ensureDiagnosisFromIntake(
  intake: Intake,
  current: CampaignPack | null | undefined,
  onStatus: HitlStatusFn,
): Promise<CampaignPack> {
  if (packHasDiagnosis(current) && current) return current;
  return buildDiagnosisPack(intake, onStatus, diagnosisExtras(current, intake));
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

  let ready = current;
  if (!packHasDiagnosis(ready)) {
    ready = await buildDiagnosisPack(intake, onStatus, diagnosisExtras(current, intake));
  }

  if (gate === "diagnostic" || !ready.diagnosis.approved || !ready.strategy?.length) {
    const built = await runStrategic(intake, ready.diagnosis, onStatus);
    return overlayPackAgency(
      assemblePack(intake, {
        report: ready.intakeReport,
        diagnosis: { ...ready.diagnosis, approved: true, approvedAt: new Date().toISOString() },
        variants: built.variants,
        strategy: built.strategy,
        angles: built.angles,
        id: ready.id,
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
        report: ready.intakeReport,
        diagnosis: ready.diagnosis,
        variants: ready.variants,
        strategy: ready.strategy,
        media: built.media,
        angles: ready.angles,
        id: ready.id,
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

  const built = await runOptimizerStage(intake, ready.media, onStatus);
  const next = await overlayPackAgency(
    assemblePack(intake, {
      report: ready.intakeReport,
      diagnosis: ready.diagnosis,
      variants: ready.variants,
      strategy: ready.strategy,
      media: ready.media,
      optimizer: built.optimizer,
      angles: ready.angles,
      id: ready.id,
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

/** Auto-approve remaining gates until the campaign is finished. Rebuilds a missing diagnosis from intake. */
export async function autoAdvanceHitlToEnd(
  intake: Intake,
  start: CampaignPack | null | undefined,
  onStatus: HitlStatusFn,
  locale: Locale,
  opts?: { pauseAfterOne?: boolean; onPack?: (pack: CampaignPack) => void },
): Promise<CampaignPack> {
  let current = await ensureDiagnosisFromIntake(intake, start, onStatus);
  opts?.onPack?.(current);
  for (let i = 0; i < 8; i++) {
    const gate = nextHitlGate(current.agentStatus, current);
    if (gate === "complete") return current;
    current = await applyHitlGate(intake, current, gate, onStatus, locale);
    opts?.onPack?.(current);
    if (opts?.pauseAfterOne) return current;
  }
  throw new Error("HITL auto-advance looped without completing");
}
