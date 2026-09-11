import type { AgentId, AgentStatus, CampaignPack } from "../types";

const BLOCKED_TAIL: Record<AgentId, AgentStatus> = {
  intake: "complete",
  diagnostic: "needs_approval",
  strategic: "blocked",
  media: "blocked",
  optimizer: "blocked",
};

export type HitlGate = "diagnostic" | "strategic" | "media" | "complete";

export type HitlCtaKey = "cta.approve" | "cta.approveContinue" | "cta.finishToEnd" | "cta.approveAndFinish";

/** Scan-truth diagnosis: hypotheses from current intake, not a hollow draft stub. */
export function packHasDiagnosis(pack: CampaignPack | null | undefined): boolean {
  return Boolean(pack?.diagnosis?.hypotheses && pack.diagnosis.hypotheses.length > 0);
}

/**
 * Customer pause-for-review is OFF. Only an explicit advanced flag may arm it:
 * `?hitl=review` or localStorage `sawek-hitl-dev=1`.
 */
export function hitlPauseEnabled(opts?: { search?: string; storage?: { getItem(key: string): string | null } | null }): boolean {
  try {
    const search = opts?.search ?? (typeof window !== "undefined" ? window.location.search : "");
    if (new URLSearchParams(search).get("hitl") === "review") return true;
    const store =
      opts?.storage !== undefined
        ? opts.storage
        : typeof window !== "undefined"
          ? window.localStorage
          : null;
    return store?.getItem("sawek-hitl-dev") === "1";
  } catch {
    return false;
  }
}

/**
 * Collapse stale mid-run pills so we never show strategic «يعمل» with a missing diagnosis.
 * Live `running` UI should keep the raw onStatus map; remount / idle uses this.
 */
export function reconcileAgentStatus(
  status: Partial<Record<AgentId, AgentStatus>> | undefined,
  pack: CampaignPack | null | undefined,
): Record<AgentId, AgentStatus> {
  if (!packHasDiagnosis(pack)) {
    return {
      intake: "complete",
      diagnostic: "needs_approval",
      strategic: "blocked",
      media: "blocked",
      optimizer: "blocked",
    };
  }
  const s: Record<AgentId, AgentStatus> = {
    ...BLOCKED_TAIL,
    ...(status ?? pack?.agentStatus),
  };
  const gate = nextHitlGate(s, pack);
  if (s.strategic === "running" || s.diagnostic === "running" || s.media === "running") {
    if (gate === "diagnostic") {
      return {
        intake: "complete",
        diagnostic: pack?.diagnosis?.approved ? "approved" : "needs_approval",
        strategic: "blocked",
        media: "blocked",
        optimizer: "blocked",
      };
    }
    if (gate === "strategic") {
      return {
        intake: "complete",
        diagnostic: "approved",
        strategic: "needs_approval",
        media: "blocked",
        optimizer: "blocked",
      };
    }
    if (gate === "media") {
      return {
        intake: "complete",
        diagnostic: "approved",
        strategic: "approved",
        media: "needs_approval",
        optimizer: "blocked",
      };
    }
  }
  return s;
}

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
 *
 * Pack contents win over a stale agentStatus map: missing diagnosis always
 * rebuilds diagnostic, never parks on a running strategic pill.
 */
export function nextHitlGate(
  status: Partial<Record<AgentId, AgentStatus>> | undefined,
  pack: CampaignPack | null | undefined,
): HitlGate {
  const s = status ?? pack?.agentStatus ?? {};

  if (!pack || !packHasDiagnosis(pack)) return "diagnostic";

  if (s.diagnostic === "needs_approval") return "diagnostic";
  if (s.strategic === "needs_approval") return "strategic";
  if (s.media === "needs_approval") return "media";

  if (!pack.diagnosis?.approved || !pack.strategy?.length) return "diagnostic";
  if (s.strategic !== "approved" && s.strategic !== "complete") return "strategic";
  if (s.media !== "approved" && s.media !== "complete") return "media";
  if (s.optimizer === "complete" || pack.optimizer) return "complete";
  return "media";
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
