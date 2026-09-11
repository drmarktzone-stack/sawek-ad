import type { AgentId, AgentStatus, CampaignPack } from "../types";

export type HitlGate = "diagnostic" | "strategic" | "media" | "complete";

export type HitlCtaKey = "cta.approve" | "cta.approveContinue" | "cta.finishToEnd" | "cta.approveAndFinish";

/**
 * Next HITL action for the Agents-phase CTA.
 *
 * Prompt 6 `/task/ad` one-click assemble marks every agent `complete` while
 * `diagnosis.approved` is still false. The UI then shows `cta.continueStage`
 * and `advanceHitl` used to no-op because no status equalled `needs_approval`.
 *
 * After diagnosis is approved and strategy exists with `strategic: needs_approval`,
 * the gate is `strategic` (run media). After media approval, run optimizer.
 * Default product path auto-advances every gate; this function only names the next step.
 */
export function nextHitlGate(
  status: Partial<Record<AgentId, AgentStatus>> | undefined,
  pack: CampaignPack | null | undefined,
): HitlGate {
  const s = status ?? pack?.agentStatus ?? {};

  if (s.diagnostic === "needs_approval") return "diagnostic";
  if (s.strategic === "needs_approval") return "strategic";
  if (s.media === "needs_approval") return "media";

  if (pack) {
    if (!pack.diagnosis?.approved || !pack.strategy?.length) return "diagnostic";
    if (s.strategic !== "approved" && s.strategic !== "complete") return "strategic";
    if (s.media !== "approved" && s.media !== "complete") return "media";
    if (s.optimizer === "complete" || pack.optimizer) return "complete";
    return "media";
  }

  if (s.optimizer === "complete") return "complete";
  if (s.media === "approved" || s.media === "complete") return "media";
  if (s.strategic === "approved" || s.strategic === "complete") return "strategic";
  return "diagnostic";
}

/** Resume the agents panel whenever the campaign is not finished. Never kick back to stage 1. */
export function shouldResumeAgents(opts: {
  phase?: string;
  pack: CampaignPack | null | undefined;
  status?: Partial<Record<AgentId, AgentStatus>>;
}): boolean {
  const pack = opts.pack;
  if (!pack) return opts.phase === "agents";
  return nextHitlGate(opts.status ?? pack.agentStatus, pack) !== "complete";
}

export function isParkedHitlGate(gate: HitlGate): boolean {
  return gate === "diagnostic" || gate === "strategic" || gate === "media";
}

/**
 * HITL primary CTA is never a grey dead-end at a needs_approval gate.
 * `running` may show progress copy elsewhere — it must not disable approve/continue.
 * Stale `running === true` after a hung overlay/navigation must not grey the button.
 */
export function hitlCtaDisabled(gate: HitlGate, _running = false): boolean {
  if (gate === "diagnostic" || gate === "strategic" || gate === "media") return false;
  return false;
}

/**
 * Default (pause off) = finish to the campaign page.
 * Parked strategy/media (including remount with stale running) = اعتمد وكمل للآخر.
 * Soft pause diagnosis = cta.approve.
 */
export function hitlCtaKey(
  gate: HitlGate,
  opts?: { pauseForReview?: boolean },
): HitlCtaKey {
  const pause = opts?.pauseForReview === true;
  if (gate === "strategic" || gate === "media") return "cta.approveAndFinish";
  if (!pause) return "cta.finishToEnd";
  if (gate === "diagnostic") return "cta.approve";
  return "cta.approveContinue";
}

/** Simulate auto-approving every gate from a startBuild snapshot. No redirects. */
export function simulateAutoHitlGates(
  startStatus: Partial<Record<AgentId, AgentStatus>>,
  startPack: CampaignPack,
  apply: (gate: Exclude<HitlGate, "complete">, pack: CampaignPack) => CampaignPack,
): CampaignPack {
  let pack = startPack;
  let status: Partial<Record<AgentId, AgentStatus>> = { ...startStatus };
  for (let i = 0; i < 8; i++) {
    const gate = nextHitlGate(status, pack);
    if (gate === "complete") return pack;
    pack = apply(gate, pack);
    status = pack.agentStatus;
  }
  throw new Error("HITL auto-advance looped without completing");
}
