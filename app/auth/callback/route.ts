import { NextResponse } from "next/server";
import { applyAuthCookies, ensureProfile, publicAppBase, supabaseAnonClient, tokensFromSupabaseSession } from "@/lib/auth-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code") ?? "";
  const next = url.searchParams.get("next") || "/";
  const base = publicAppBase(req);
  const sb = supabaseAnonClient();
  if (!sb || !code) {
    return NextResponse.redirect(new URL("/login?error=auth", base));
  }
  const { data, error } = await sb.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    return NextResponse.redirect(new URL("/login?error=auth", base));
  }
  await ensureProfile(data.user);
  const res = NextResponse.redirect(new URL(next, base));
  return applyAuthCookies(res, req, tokensFromSupabaseSession(data.session));
}
