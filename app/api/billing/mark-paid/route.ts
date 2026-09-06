import { NextResponse } from "next/server";
import { sessionFromRequest, supabaseAnonClient, supabaseServiceClient } from "@/lib/auth-server";
import { parseInterval, parsePayMethod } from "@/lib/payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { session } = await sessionFromRequest(req);
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "auth", pendingReview: false, upgraded: false }, { status: 401 });
  }
  let body: { method?: unknown; interval?: unknown; orderCode?: unknown } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }
  const method = parsePayMethod(body.method) ?? "bank";
  const interval = parseInterval(body.interval);
  const orderCode = String(body.orderCode ?? "").trim().slice(0, 24);
  const now = new Date().toISOString();
  let persisted = false;
  const patch: Record<string, unknown> = {
    updated_at: now,
    billing_interval: interval,
  };
  if (method === "bit") patch.bit_marked_paid_at = now;
  else patch.bank_marked_paid_at = now;
  if (orderCode) patch.order_ref = orderCode;

  const sb = supabaseServiceClient() ?? supabaseAnonClient();
  if (sb) {
    const { error } = await sb.from("profiles").update(patch).eq("id", session.user.id);
    if (error && orderCode) {
      delete patch.order_ref;
      const retry = await sb.from("profiles").update(patch).eq("id", session.user.id);
      persisted = !retry.error;
    } else {
      persisted = !error;
    }
  }
  return NextResponse.json({
    ok: true,
    method,
    interval,
    orderCode,
    at: now,
    pendingReview: true,
    upgraded: false,
    persisted,
    stored: persisted ? "supabase" : "local",
  });
}
