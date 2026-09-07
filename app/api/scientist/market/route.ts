import { NextResponse } from "next/server";
import { applyAuthCookies, sessionFromRequest } from "@/lib/auth-server";
import { checkAiRateLimit, rateLimitHeaders, userIdFromRequest } from "@/lib/rate-limit";
import type { GrowthWorkspace } from "@/lib/scientist/types";
import { executeMarketScan } from "@/lib/scientist/market-run";
import type { MarketScanControls } from "@/lib/scientist/market-types";
import { defaultScanControls } from "@/lib/scientist/market-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isWorkspace(v: unknown): v is GrowthWorkspace {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const o = v as Record<string, unknown>;
  return typeof o.id === "string" && typeof o.businessId === "string" && Boolean(o.business) && Boolean(o.dna);
}

/** Scan public market sources for a GrowthWorkspace. Anonymous allowed (same as /api/research). */
export async function POST(req: Request) {
  const userId = await userIdFromRequest(req);
  const { session, tokens, refreshed } = await sessionFromRequest(req);
  const limit = checkAiRateLimit(req, "research", userId);
  if (!limit.allowed) {
    const res = NextResponse.json(
      { ok: false, reason: "rate_limited", retryAfterSec: limit.retryAfterSec },
      { status: 200, headers: rateLimitHeaders(limit) },
    );
    if (refreshed && tokens) applyAuthCookies(res, req, tokens);
    return res;
  }

  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });
  }
  const rec = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  if (!isWorkspace(rec.workspace)) {
    return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });
  }
  if (session && rec.workspace.ownerId && rec.workspace.ownerId !== session.user.id) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }
  const controls = rec.controls && typeof rec.controls === "object" ? (rec.controls as Partial<MarketScanControls>) : undefined;
  try {
    const { workspace, research } = await executeMarketScan(rec.workspace, controls, {
      incremental: rec.incremental === true,
      campaignId: typeof rec.campaignId === "string" ? rec.campaignId : undefined,
    });
    const res = NextResponse.json(
      {
        ok: true,
        workspace,
        intel: workspace.market,
        researchFetched: research.fetched,
        grounded: research.grounded,
        controls: defaultScanControls({ ...workspace.market?.watch?.controls, ...controls }),
      },
      { status: 200, headers: rateLimitHeaders(limit) },
    );
    if (refreshed && tokens) applyAuthCookies(res, req, tokens);
    return res;
  } catch {
    return NextResponse.json({ ok: false, reason: "ai_failure" }, { status: 200 });
  }
}
