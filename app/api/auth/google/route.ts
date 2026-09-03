import { NextResponse } from "next/server";
import { classifyAuthError, publicAppBase, publicAuthErrorDetail, supabaseAnonClient } from "@/lib/auth-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function wantsJson(req: Request): boolean {
  const url = new URL(req.url);
  if (url.searchParams.get("json") === "1") return true;
  const accept = (req.headers.get("accept") ?? "").toLowerCase();
  return accept.includes("application/json") && !accept.includes("text/html");
}

export async function GET(req: Request) {
  const json = wantsJson(req);
  const sb = supabaseAnonClient();
  if (!sb) {
    if (json) return NextResponse.json({ ok: false, error: "no_supabase" }, { status: 503 });
    return NextResponse.redirect(new URL("/login?error=no_supabase", publicAppBase(req)));
  }
  const { data, error } = await sb.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${publicAppBase(req)}/auth/callback`,
      skipBrowserRedirect: true,
    },
  });
  if (error || !data.url) {
    const classified = classifyAuthError(error);
    const code = classified === "auth" ? "google" : classified;
    const detail = publicAuthErrorDetail(error);
    if (json) return NextResponse.json({ ok: false, error: code, detail }, { status: 400 });
    return NextResponse.redirect(new URL("/login?error=google", publicAppBase(req)));
  }
  if (json) return NextResponse.json({ ok: true, url: data.url });
  return NextResponse.redirect(data.url);
}
