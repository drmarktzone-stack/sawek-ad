import { NextResponse } from "next/server";
import { applyAuthCookies, ensureProfile, supabaseAnonClient, tokensFromSupabaseSession } from "@/lib/auth-server";
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
  if (!email || !password) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    return NextResponse.json({ ok: false, error: "auth" }, { status: 401 });
  }
  const profile = await ensureProfile(data.user);
  const tokens = tokensFromSupabaseSession(data.session);
  const res = NextResponse.json({
    ok: true,
    user: { id: data.user.id, email: data.user.email ?? email },
    plan: resolvePlan({ email: data.user.email ?? email, profilePlan: profile?.plan, bankConfirmed: Boolean(profile?.bank_confirmed_at) }),
  });
  return applyAuthCookies(res, req, tokens);
}
