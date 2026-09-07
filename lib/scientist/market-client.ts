import type { GrowthWorkspace } from "./types";
import type { MarketScanControls } from "./market-types";

export async function requestMarketScan(
  workspace: GrowthWorkspace,
  controls?: Partial<MarketScanControls>,
  incremental = false,
): Promise<{ ok: boolean; workspace?: GrowthWorkspace; reason?: string }> {
  try {
    const res = await fetch("/api/scientist/market", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ workspace, controls, incremental }),
    });
    const data = (await res.json()) as {
      ok?: boolean;
      workspace?: GrowthWorkspace;
      reason?: string;
    };
    if (!data.ok || !data.workspace) return { ok: false, reason: data.reason || "scan_failed" };
    return { ok: true, workspace: data.workspace };
  } catch {
    return { ok: false, reason: "network" };
  }
}
