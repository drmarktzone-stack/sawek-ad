import { NextResponse } from "next/server";
import { applyAuthCookies, sessionFromRequest } from "@/lib/auth-server";
import { isCampaignPack, listOwnedCampaignRows, upsertOwnedCampaign } from "@/lib/campaign-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** List campaigns owned by the signed-in user. Anonymous → empty (localStorage only). */
export async function GET(req: Request) {
  const { session, tokens, refreshed } = await sessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ ok: true, campaigns: [], reason: "anonymous" }, { status: 200 });
  }
  const rows = await listOwnedCampaignRows(session.user.id);
  const res = NextResponse.json({ ok: true, campaigns: rows }, { status: 200 });
  if (refreshed && tokens) applyAuthCookies(res, req, tokens);
  return res;
}

/** Save a campaign as the signed-in owner. Rejects writes onto another owner's row. */
export async function POST(req: Request) {
  const { session, tokens, refreshed } = await sessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }
  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });
  }
  const pack = body && typeof body === "object" && "pack" in body ? (body as { pack: unknown }).pack : body;
  if (!isCampaignPack(pack)) {
    return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });
  }
  const saved = await upsertOwnedCampaign(session.user.id, pack);
  if (!saved.ok && saved.reason === "forbidden") {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }
  if (!saved.ok) {
    return NextResponse.json({ ok: false, reason: saved.reason ?? "persist_failed" }, { status: 503 });
  }
  const res = NextResponse.json({ ok: true, id: pack.id }, { status: 200 });
  if (refreshed && tokens) applyAuthCookies(res, req, tokens);
  return res;
}
