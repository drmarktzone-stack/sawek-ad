import { NextResponse } from "next/server";
import { runtimeEnv } from "@/lib/runtime-env";
import { supabaseServiceClient } from "@/lib/auth-server";
import { executeMarketScan } from "@/lib/scientist/market-run";
import { markWatchRun, watchIsDue } from "@/lib/scientist/market-engines";
import type { GrowthWorkspace } from "@/lib/scientist/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Optional Cloud Scheduler tick.
 * Set MARKET_WATCH_SECRET and point Scheduler at this path (POST, Bearer).
 * Without the secret this route is unconfigured — client-side watch on /growth still works.
 */
export async function POST(req: Request) {
  const secret = runtimeEnv("MARKET_WATCH_SECRET");
  if (!secret) {
    return NextResponse.json({ ok: false, reason: "watch_cron_unconfigured" }, { status: 503 });
  }
  const auth = req.headers.get("authorization") || "";
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }
  const service = supabaseServiceClient();
  if (!service) {
    return NextResponse.json({ ok: false, reason: "no_store", scanned: 0 }, { status: 200 });
  }
  let rows: Array<{ payload: unknown }> = [];
  try {
    const listed = await service.from("scientist_workspaces").select("payload").limit(40);
    if (!listed.error && Array.isArray(listed.data)) rows = listed.data;
  } catch {
    return NextResponse.json({ ok: false, reason: "store_error", scanned: 0 }, { status: 200 });
  }
  let scanned = 0;
  let notified = 0;
  for (const row of rows) {
    const ws = row.payload as GrowthWorkspace;
    if (!ws?.id || !ws.businessId || !ws.market?.watch?.enabled) continue;
    if (!watchIsDue(ws)) continue;
    if (scanned >= 5) break;
    try {
      const { workspace } = await executeMarketScan(ws, ws.market.watch.controls, { incremental: true });
      const stamped = markWatchRun(workspace);
      await service.from("scientist_workspaces").upsert({
        id: stamped.id,
        owner_id: stamped.ownerId,
        client_id: stamped.clientId ?? null,
        business_id: stamped.businessId,
        payload: stamped,
        updated_at: stamped.updatedAt,
      });
      scanned += 1;
      notified += stamped.market?.notifications.length && stamped.market.notifications[0]?.createdAt > (ws.market.watch.lastNotifyAt || "") ? 1 : 0;
    } catch {
      /* one workspace must not fail the tick */
    }
  }
  return NextResponse.json({ ok: true, scanned, notified }, { status: 200 });
}
