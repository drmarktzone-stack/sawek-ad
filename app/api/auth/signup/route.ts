import { NextResponse } from "next/server";
import { applyAuthCookies, ensureProfile, publicAppBase, supabaseAnonClient, tokensFromSupabaseSession } from "@/lib/auth-server";
import { resolvePlan } from "@/lib/plan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const sb = supabaseAnonClient();
  if (!sb) return NextResponse.json({ ok: false, error: "no_supabase" }, { status: 503 });
  let body: { email?: unknown; password?: unknown } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }
  const email = String(body.email ?? "").trim();
  const password = String(body.password ?? "");
  if (!email || password.length < 6) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${publicAppBase(req)}/auth/callback` },
  });
  if (error) return NextResponse.json({ ok: false, error: "auth" }, { status: 400 });
  if (data.user) await ensureProfile(data.user);
  const tokens = tokensFromSupabaseSession(data.session);
  const res = NextResponse.json({
    ok: true,
    needsEmail: !data.session,
    user: data.user ? { id: data.user.id, email: data.user.email ?? email } : null,
    plan: resolvePlan({ email: data.user?.email ?? email }),
  });
  return applyAuthCookies(res, req, tokens);
}
