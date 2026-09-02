import { NextResponse } from "next/server";
import { applyAuthCookies, sessionFromRequest } from "@/lib/auth-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { session, tokens, refreshed } = await sessionFromRequest(req);
  const res = NextResponse.json({
    ok: true,
    user: session?.user ?? null,
    plan: session?.plan ?? "free",
    profile: session?.profile
      ? {
          plan: session.profile.plan,
          billing_interval: session.profile.billing_interval,
          bank_marked_paid_at: session.profile.bank_marked_paid_at,
          bank_confirmed_at: session.profile.bank_confirmed_at,
          bit_marked_paid_at: session.profile.bit_marked_paid_at,
        }
      : null,
  });
  if (refreshed && tokens) return applyAuthCookies(res, req, tokens);
  return res;
}
