import { NextResponse } from "next/server";
import { publicAppBase, supabaseAnonClient } from "@/lib/auth-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const sb = supabaseAnonClient();
  if (!sb) return NextResponse.redirect(new URL("/login?error=no_supabase", publicAppBase(req)));
  const { data, error } = await sb.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${publicAppBase(req)}/auth/callback`,
      skipBrowserRedirect: true,
    },
  });
  if (error || !data.url) {
    return NextResponse.redirect(new URL("/login?error=google", publicAppBase(req)));
  }
  return NextResponse.redirect(data.url);
}
