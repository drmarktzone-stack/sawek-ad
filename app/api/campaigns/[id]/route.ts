import { NextResponse } from "next/server";
import { applyAuthCookies, sessionFromRequest } from "@/lib/auth-server";
import { callerMayReadRow, getCampaignRowById, isCampaignPack, upsertOwnedCampaign } from "@/lib/campaign-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function invalidId(id: string): boolean {
  return !id || id.length > 120 || /[^\w.-]/.test(id);
}

/** Owner read, or share_enabled landing. Never lists other users. 404 if unauthorized. */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const key = String(id || "").trim();
  if (invalidId(key)) {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }
  const { session, tokens, refreshed } = await sessionFromRequest(req);
  const row = await getCampaignRowById(key);
  if (!row || !isCampaignPack(row.payload)) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  if (!callerMayReadRow(row, session?.user.id ?? null)) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  const res = NextResponse.json({ ok: true, pack: row.payload }, { status: 200 });
  if (refreshed && tokens) applyAuthCookies(res, req, tokens);
  return res;
}

/** Owner can toggle share_enabled. */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const key = String(id || "").trim();
  if (invalidId(key)) {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }
  const { session, tokens, refreshed } = await sessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }
  const row = await getCampaignRowById(key);
  if (!row || !isCampaignPack(row.payload) || !callerMayReadRow(row, session.user.id)) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  if (row.owner_id && row.owner_id !== session.user.id) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }
  let shareEnabled = false;
  try {
    const body = (await req.json()) as { shareEnabled?: unknown };
    shareEnabled = body.shareEnabled === true;
  } catch {
    shareEnabled = false;
  }
  const pack = { ...row.payload, shareEnabled, ownerId: session.user.id };
  const saved = await upsertOwnedCampaign(session.user.id, pack);
  const res = NextResponse.json(
    { ok: saved.ok, shareEnabled, reason: saved.reason },
    { status: saved.ok ? 200 : 503 },
  );
  if (refreshed && tokens) applyAuthCookies(res, req, tokens);
  return res;
}
