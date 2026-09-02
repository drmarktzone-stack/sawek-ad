import { NextResponse } from "next/server";
import { isOwnerEmail } from "@/lib/plan";
import { markProfilePro, sessionFromRequest, supabaseServiceClient } from "@/lib/auth-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { session } = await sessionFromRequest(req);
  if (!session?.user || !isOwnerEmail(session.user.email)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  let body: { userId?: unknown; email?: unknown; method?: unknown } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }
  const userId = String(body.userId ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const method = body.method === "bit" ? "bit" : "bank";
  if (!userId && !email) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  const ok = await markProfilePro({ userId: userId || undefined, email: email || undefined, interval: method });
  const service = supabaseServiceClient();
  if (service) {
    const now = new Date().toISOString();
    if (userId) await service.from("profiles").update({ bank_confirmed_at: now, plan: "pro", billing_interval: method, updated_at: now }).eq("id", userId);
    else await service.from("profiles").update({ bank_confirmed_at: now, plan: "pro", billing_interval: method, updated_at: now }).eq("email", email);
  }
  return NextResponse.json({ ok });
}

export async function GET(req: Request) {
  const { session } = await sessionFromRequest(req);
  if (!session?.user || !isOwnerEmail(session.user.email)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  const service = supabaseServiceClient();
  if (!service) return NextResponse.json({ ok: true, pending: [] });
  const { data } = await service
    .from("profiles")
    .select("id,email,plan,bank_marked_paid_at,bit_marked_paid_at,bank_confirmed_at")
    .or("bank_marked_paid_at.not.is.null,bit_marked_paid_at.not.is.null")
    .order("updated_at", { ascending: false })
    .limit(50);
  return NextResponse.json({ ok: true, pending: data ?? [] });
}
