import { NextResponse } from "next/server";
import { isOwnerEmail } from "@/lib/plan";
import { markProfilePro, sessionFromRequest, supabaseServiceClient } from "@/lib/auth-server";
import { parseInterval, type BillingInterval } from "@/lib/payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function existingInterval(
  service: NonNullable<ReturnType<typeof supabaseServiceClient>>,
  userId: string,
  email: string,
): Promise<BillingInterval | undefined> {
  try {
    const q = userId
      ? await service.from("profiles").select("billing_interval").eq("id", userId).maybeSingle()
      : await service.from("profiles").select("billing_interval").eq("email", email).maybeSingle();
    const raw = q.data && typeof q.data === "object" ? (q.data as { billing_interval?: unknown }).billing_interval : "";
    if (raw === "yearly" || raw === "monthly") return raw;
  } catch {
    /* ignore */
  }
  return undefined;
}

export async function POST(req: Request) {
  const { session } = await sessionFromRequest(req);
  if (!session?.user || !isOwnerEmail(session.user.email)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  let body: { userId?: unknown; email?: unknown; interval?: unknown } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }
  const userId = String(body.userId ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!userId && !email) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  const service = supabaseServiceClient();
  const fromBody = body.interval === "yearly" || body.interval === "monthly" ? parseInterval(body.interval) : undefined;
  const interval = fromBody ?? (service ? await existingInterval(service, userId, email) : undefined) ?? "monthly";
  const ok = await markProfilePro({ userId: userId || undefined, email: email || undefined, interval });
  if (service) {
    const now = new Date().toISOString();
    const patch = { bank_confirmed_at: now, plan: "pro", billing_interval: interval, updated_at: now };
    if (userId) await service.from("profiles").update(patch).eq("id", userId);
    else await service.from("profiles").update(patch).eq("email", email);
  }
  return NextResponse.json({ ok, interval });
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
    .select("id,email,plan,billing_interval,bank_marked_paid_at,bit_marked_paid_at,bank_confirmed_at")
    .or("bank_marked_paid_at.not.is.null,bit_marked_paid_at.not.is.null")
    .order("updated_at", { ascending: false })
    .limit(50);
  return NextResponse.json({ ok: true, pending: data ?? [] });
}
