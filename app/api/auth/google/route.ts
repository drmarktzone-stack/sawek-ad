import { NextResponse } from "next/server";
import {
  classifyAuthError,
  isSupabaseAuthorizeUrl,
  mentionsProviderDisabled,
  publicAppBase,
  supabaseAnonClient,
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

async function mintOAuthUrl(req: Request, sb: NonNullable<ReturnType<typeof supabaseAnonClient>>) {
  return sb.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${publicAppBase(req)}/auth/callback`,
      skipBrowserRedirect: true,
    },
  });
}

export async function GET(req: Request) {
  const json = wantsJson(req);
  const sb = supabaseAnonClient();
  if (!sb) {
    if (json) return NextResponse.json({ ok: false, error: "no_supabase" }, { status: 503 });
    return NextResponse.redirect(new URL("/login?error=no_supabase", publicAppBase(req)));
  }

  const enabled = await supabaseGoogleProviderEnabled();
  if (enabled === false) return googleOff(req, json);

  const { data, error } = await mintOAuthUrl(req, sb);
  const combined = `${error?.message ?? ""} ${error?.code ?? ""}`;
  const classified = classifyAuthError(error);
  if (
    error ||
    !data.url ||
    mentionsProviderDisabled(combined) ||
    classified === "google_off" ||
    classified === "google"
  ) {
    return googleOff(req, json);
  }

  let url = data.url;
  if (isSupabaseAuthorizeUrl(url)) {
    // SDK returns this URL even when Google is off. Probe before anyone follows it.
    if (enabled !== true) {
      if (await supabaseAuthorizeWouldFail(url)) return googleOff(req, json);
      const fresh = await mintOAuthUrl(req, sb);
      if (!fresh.data?.url || mentionsProviderDisabled(`${fresh.error?.message ?? ""} ${fresh.error?.code ?? ""}`)) {
        return googleOff(req, json);
      }
      url = fresh.data.url;
    }
    if (json) return NextResponse.json({ ok: true, url });
    // HTML GET must not dump the customer on supabase.co JSON (provider-off 400).
    if (enabled !== true) return googleOff(req, json);
    return NextResponse.redirect(url);
  }

  if (json) return NextResponse.json({ ok: true, url });
  return NextResponse.redirect(url);
}
