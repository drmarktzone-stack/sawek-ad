import type { AgentId, AgentStatus, CampaignPack } from "../types";

export type HitlGate = "diagnostic" | "strategic" | "media" | "complete";

/**
 * Next HITL action for the Agents-phase CTA.
 *
 * Prompt 6 `/task/ad` one-click assemble marks every agent `complete` while
 * `diagnosis.approved` is still false. The UI then shows `cta.continueStage`
 * and `advanceHitl` used to no-op because no status equalled `needs_approval`.
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
