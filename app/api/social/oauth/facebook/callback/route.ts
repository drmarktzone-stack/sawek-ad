import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { STATE_COOKIE, appBaseUrl, facebookConfigured, sanitizeClientId } from "@/lib/social/config";
import { verifyOAuthState } from "@/lib/social/oauth-state";
import { exchangeFacebookCode } from "@/lib/social/facebook";
import { saveTokens, setClientIdCookie } from "@/lib/social/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function back(base: string, params: Record<string, string>) {
  const u = new URL("/campaigns", base.endsWith("/") ? base : `${base}/`);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  return u.toString();
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const base = appBaseUrl(req);
  if (!facebookConfigured()) {
    return NextResponse.redirect(back(base, { social: "error", provider: "facebook", reason: "not_configured" }));
  }
  const err = url.searchParams.get("error");
  if (err) {
    const reason = err === "access_denied" ? "denied" : "oauth";
    return NextResponse.redirect(back(base, { social: "error", provider: "facebook", reason }));
  }
  const code = url.searchParams.get("code") ?? "";
  const stateQ = url.searchParams.get("state") ?? "";
  const jar = await cookies();
  const stateC = jar.get(STATE_COOKIE)?.value ?? "";
  const parsed = verifyOAuthState(stateQ);
  if (!parsed || parsed.p !== "facebook") {
    return NextResponse.redirect(back(base, { social: "error", provider: "facebook", reason: "state" }));
  }
  if (stateC && stateC !== stateQ) {
    return NextResponse.redirect(back(base, { social: "error", provider: "facebook", reason: "state" }));
  }
  if (!code) {
    return NextResponse.redirect(back(base, { social: "error", provider: "facebook", reason: "missing_code" }));
  }
  const clientId = sanitizeClientId(parsed.c) || sanitizeClientId(jar.get("sawek_client_id")?.value);
  const redirectUri = `${base}/api/social/oauth/facebook/callback`;
  try {
    const exchanged = await exchangeFacebookCode(code, redirectUri);
    const tokens: Parameters<typeof saveTokens>[1] = [];
    if (exchanged.facebook) {
      tokens.push({
        provider: "facebook",
        accessToken: exchanged.facebook.accessToken,
        tokenType: exchanged.facebook.tokenType,
        expiresAt: exchanged.facebook.expiresAt,
        meta: exchanged.facebook.meta,
      });
    }
    if (exchanged.instagram) {
      tokens.push({
        provider: "instagram",
        accessToken: exchanged.instagram.accessToken,
        tokenType: exchanged.instagram.tokenType,
        expiresAt: exchanged.instagram.expiresAt,
        meta: exchanged.instagram.meta,
      });
    }
    const dest = exchanged.error
      ? back(base, { social: "error", provider: "facebook", reason: exchanged.error })
      : back(base, { social: "connected", provider: "facebook" });
    const res = NextResponse.redirect(dest);
    setClientIdCookie(res, clientId, req);
    if (tokens.length && clientId) {
      await saveTokens(clientId, tokens, res, req);
    }
    res.cookies.set(STATE_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
    return res;
  } catch {
    return NextResponse.redirect(back(base, { social: "error", provider: "facebook", reason: "token" }));
  }
}
