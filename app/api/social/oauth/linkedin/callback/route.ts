import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { STATE_COOKIE, appBaseUrl, linkedinConfigured, sanitizeClientId } from "@/lib/social/config";
import { verifyOAuthState } from "@/lib/social/oauth-state";
import { exchangeLinkedInCode } from "@/lib/social/linkedin";
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
  if (!linkedinConfigured()) {
    return NextResponse.redirect(back(base, { social: "error", provider: "linkedin", reason: "not_configured" }));
  }
  const err = url.searchParams.get("error");
  if (err) {
    const reason = err === "access_denied" || err === "user_cancelled_login" ? "denied" : "oauth";
    return NextResponse.redirect(back(base, { social: "error", provider: "linkedin", reason }));
  }
  const code = url.searchParams.get("code") ?? "";
  const stateQ = url.searchParams.get("state") ?? "";
  const jar = await cookies();
  const stateC = jar.get(STATE_COOKIE)?.value ?? "";
  const parsed = verifyOAuthState(stateQ);
  if (!parsed || parsed.p !== "linkedin") {
    return NextResponse.redirect(back(base, { social: "error", provider: "linkedin", reason: "state" }));
  }
  if (stateC && stateC !== stateQ) {
    return NextResponse.redirect(back(base, { social: "error", provider: "linkedin", reason: "state" }));
  }
  if (!code) {
    return NextResponse.redirect(back(base, { social: "error", provider: "linkedin", reason: "missing_code" }));
  }
  const clientId = sanitizeClientId(parsed.c) || sanitizeClientId(jar.get("sawek_client_id")?.value);
  const redirectUri = `${base}/api/social/oauth/linkedin/callback`;
  try {
    const exchanged = await exchangeLinkedInCode(code, redirectUri);
    const dest = exchanged.error
      ? back(base, { social: "error", provider: "linkedin", reason: exchanged.error })
      : back(base, { social: "connected", provider: "linkedin" });
    const res = NextResponse.redirect(dest);
    setClientIdCookie(res, clientId, req);
    if (!exchanged.error && exchanged.accessToken && clientId) {
      await saveTokens(
        clientId,
        [
          {
            provider: "linkedin",
            accessToken: exchanged.accessToken,
            refreshToken: exchanged.refreshToken,
            tokenType: exchanged.tokenType,
            expiresAt: exchanged.expiresAt,
            meta: exchanged.meta,
          },
        ],
        res,
        req,
      );
    }
    res.cookies.set(STATE_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
    return res;
  } catch {
    return NextResponse.redirect(back(base, { social: "error", provider: "linkedin", reason: "token" }));
  }
}
