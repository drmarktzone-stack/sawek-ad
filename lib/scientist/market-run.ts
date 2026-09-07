/**
 * Server-only market scan. Reuses runMarketResearch (official APIs + Search Grounding).
 * Never scrapes login walls. Failures stay labeled unavailable.
 */
import { buildResearchSkeleton, runMarketResearch, type MarketResearchControls } from "../engine/ad-research";
import type { MarketResearch } from "../types";
import type { GrowthWorkspace } from "./types";
import {
  composeMarketIntel,
  controlsFromWorkspace,
  hasMarketScanContext,
  intakeFromWorkspace,
} from "./market-engines";
import { defaultScanControls, type MarketScanControls } from "./market-types";

export async function executeMarketScan(
  ws: GrowthWorkspace,
  override?: Partial<MarketScanControls>,
  opts?: { incremental?: boolean; campaignId?: string },
): Promise<{ workspace: GrowthWorkspace; research: MarketResearch; cachedNote?: string }> {
  if (!hasMarketScanContext(ws)) {
    const controls = defaultScanControls({ ...controlsFromWorkspace(ws), ...override });
    const skeleton = {
      ...buildResearchSkeleton(intakeFromWorkspace(ws, controls)),
      fetched: true,
    };
    const composed = composeMarketIntel(ws, skeleton, controls, {
      incremental: opts?.incremental,
      campaignId: opts?.campaignId,
      reason: "insufficient_context",
    });
    return { workspace: composed.workspace, research: skeleton };
  }
  const controls = defaultScanControls({ ...controlsFromWorkspace(ws), ...override });
  const research = await runMarketResearch(intakeFromWorkspace(ws, controls), controlsToResearch(controls));
  const composed = composeMarketIntel(ws, research, controls, {
    incremental: opts?.incremental,
    campaignId: opts?.campaignId,
  });
  return { workspace: composed.workspace, research };
}

function controlsToResearch(controls: MarketScanControls): MarketResearchControls {
  return {
    lookbackDays: controls.lookbackDays,
    language: controls.language,
    objective: controls.objective,
    competitorCategory: controls.competitorCategory,
    query: controls.query,
    geo: controls.region,
  };
}
