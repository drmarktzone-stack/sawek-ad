import { NextResponse } from "next/server";
import { applyAuthCookies, ensureProfile, sessionFromAccessRefresh } from "@/lib/auth-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { access_token?: unknown; refresh_token?: unknown } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }
  const access = String(body.access_token ?? "").trim();
  const refresh = String(body.refresh_token ?? "").trim();
  const { user, tokens } = await sessionFromAccessRefresh(access, refresh);
  if (!user || !tokens) return NextResponse.json({ ok: false, error: "auth" }, { status: 401 });
  await ensureProfile(user);
  const res = NextResponse.json({
    ok: true,
    user: { id: user.id, email: user.email ?? "" },
  });
  return applyAuthCookies(res, req, tokens);
}
