import { NextResponse } from "next/server";
import { markProfilePro, supabaseServiceClient } from "@/lib/auth-server";
import { getStripe, stripeWebhookSecret } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const stripe = getStripe();
  const secret = stripeWebhookSecret();
  if (!stripe || !secret) {
    return NextResponse.json({ ok: false, error: "stripe_unconfigured" }, { status: 503 });
  }
  const sig = req.headers.get("stripe-signature") ?? "";
  const raw = await req.text();
  let event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch {
    return NextResponse.json({ ok: false, error: "signature" }, { status: 400 });
  }
  try {
    if (event.type === "checkout.session.completed" || event.type === "customer.subscription.updated" || event.type === "invoice.paid") {
      const obj = event.data.object as {
        client_reference_id?: string | null;
        customer?: string | null;
        subscription?: string | null;
        customer_email?: string | null;
        metadata?: Record<string, string> | null;
        status?: string;
      };
      const userId = obj.client_reference_id || obj.metadata?.user_id || "";
      const email = obj.customer_email || obj.metadata?.email || "";
      const interval = obj.metadata?.interval || "";
      const status = obj.status || "";
      if (status && !["complete", "paid", "active", "trialing"].includes(status) && event.type === "customer.subscription.updated") {
        if (["canceled", "unpaid", "incomplete_expired"].includes(status)) {
          return NextResponse.json({ ok: true, ignored: status });
        }
      }
      await markProfilePro({
        userId: userId || undefined,
        email: email || undefined,
        interval,
        stripeCustomerId: typeof obj.customer === "string" ? obj.customer : undefined,
        stripeSubscriptionId: typeof obj.subscription === "string" ? obj.subscription : undefined,
      });
      const service = supabaseServiceClient();
      if (service && (userId || email)) {
        const id = typeof obj.subscription === "string" && obj.subscription ? obj.subscription : event.id;
        await service.from("subscriptions").upsert({
          id,
          user_id: userId || null,
          email: email || null,
          plan: "pro",
          interval: interval || null,
          status: status || event.type,
          provider: "stripe",
          raw: { type: event.type },
          updated_at: new Date().toISOString(),
        });
      }
    }
  } catch {
    return NextResponse.json({ ok: false, error: "handler" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
