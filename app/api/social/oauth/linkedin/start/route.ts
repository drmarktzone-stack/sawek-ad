import { NextResponse } from "next/server";
import {
  CLIENT_COOKIE,
  LI_AUTH,
  LI_SCOPES,
  STATE_COOKIE,
  appBaseUrl,
  linkedinClientId,
  linkedinConfigured,
  sanitizeClientId,
} from "@/lib/social/config";
import { createOAuthState } from "@/lib/social/oauth-state";
import { setClientIdCookie } from "@/lib/social/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const clientId = sanitizeClientId(url.searchParams.get("clientId"));
  if (!linkedinConfigured()) {
    return NextResponse.json({ ok: false, reason: "not_configured" });
  }
  const base = appBaseUrl(req);
  const redirectUri = `${base}/api/social/oauth/linkedin/callback`;
  const state = createOAuthState(clientId, "linkedin");
  const dialog = new URL(LI_AUTH);
  dialog.searchParams.set("response_type", "code");
  dialog.searchParams.set("client_id", linkedinClientId());
  dialog.searchParams.set("redirect_uri", redirectUri);
  dialog.searchParams.set("state", state);
  dialog.searchParams.set("scope", LI_SCOPES);
  const res = NextResponse.redirect(dialog.toString());
  const secure = base.startsWith("https://");
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
    secure,
  });
  setClientIdCookie(res, clientId, req);
  if (clientId) {
    res.cookies.set(CLIENT_COOKIE, clientId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      secure,
    });
  }
  return res;
}
