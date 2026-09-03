import { NextResponse } from "next/server";
import {
  applyAuthCookies,
  applyPkceCookie,
  ensureProfile,
  exchangePkceCode,
  publicAppBase,
  readPkceCookie,
  safeInternalPath,
} from "@/lib/auth-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function implicitFinishHtml(next: string): string {
  const dest = JSON.stringify(next || "/");
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SAWEK AD</title></head>
<body>
<p>Signing in…</p>
<script>
(async () => {
  const next = ${dest};
  const hash = new URLSearchParams(location.hash.replace(/^#/, ""));
  const access = hash.get("access_token") || "";
  const refresh = hash.get("refresh_token") || "";
  if (access && refresh) {
    try {
      const r = await fetch("/api/auth/oauth-tokens", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ access_token: access, refresh_token: refresh }),
      });
      if (r.ok) { location.replace(next); return; }
    } catch (e) {}
  }
  location.replace("/login?error=auth");
})();
</script>
</body>
</html>`;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code") ?? "";
  const oauthError = url.searchParams.get("error") ?? "";
  const next = safeInternalPath(url.searchParams.get("next"));
  const base = publicAppBase(req);

  if (oauthError) {
    return NextResponse.redirect(new URL("/login?error=auth", base));
  }

  if (code) {
    const verifier = readPkceCookie(req);
    const exchanged = await exchangePkceCode(code, verifier);
    if (!exchanged.user || !exchanged.tokens) {
      return NextResponse.redirect(new URL("/login?error=auth", base));
    }
    await ensureProfile(exchanged.user);
    const res = NextResponse.redirect(new URL(next, base));
    applyPkceCookie(res, req, null);
    return applyAuthCookies(res, req, exchanged.tokens);
  }

  // Implicit leftover: tokens live in the URL hash, which the server never sees.
  return new NextResponse(implicitFinishHtml(next), {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
