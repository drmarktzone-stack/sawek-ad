import { NextResponse } from "next/server";
import {
  applyPkceCookie,
  googleAuthorizeUrl,
  isSupabaseAuthorizeUrl,
  makePkcePair,
  publicAppBase,
  supabaseAnonCreds,
  supabaseAuthorizeWouldFail,
  supabaseGoogleProviderEnabled,
} from "@/lib/auth-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function wantsJson(req: Request): boolean {
  const url = new URL(req.url);
  if (url.searchParams.get("json") === "1") return true;
  const accept = (req.headers.get("accept") ?? "").toLowerCase();
  return accept.includes("application/json") && !accept.includes("text/html");
}

function googleOff(req: Request, json: boolean) {
  if (json) return NextResponse.json({ ok: false, error: "google_off" }, { status: 400 });
  return NextResponse.redirect(new URL("/login?error=google_off", publicAppBase(req)));
}

export async function GET(req: Request) {
  const json = wantsJson(req);
  const probeOnly = new URL(req.url).searchParams.get("probe") === "1";
  if (!supabaseAnonCreds()) {
    if (json) return NextResponse.json({ ok: false, error: "no_supabase" }, { status: 503 });
    return NextResponse.redirect(new URL("/login?error=no_supabase", publicAppBase(req)));
  }

  const enabled = await supabaseGoogleProviderEnabled();
  if (enabled === false) return googleOff(req, json);

  if (enabled !== true) {
    const probeUrl = googleAuthorizeUrl(req, makePkcePair().challenge);
    if (!probeUrl || (isSupabaseAuthorizeUrl(probeUrl) && (await supabaseAuthorizeWouldFail(probeUrl)))) {
      return googleOff(req, json);
    }
  }

  // Readiness check must not mint a PKCE cookie — the click fetch owns the pair.
  if (json && probeOnly) return NextResponse.json({ ok: true, url: "ready" });

  const { verifier, challenge } = makePkcePair();
  const url = googleAuthorizeUrl(req, challenge);
  if (!url) return googleOff(req, json);

  if (json) return applyPkceCookie(NextResponse.json({ ok: true, url }), req, verifier);
  return applyPkceCookie(NextResponse.redirect(url), req, verifier);
}
