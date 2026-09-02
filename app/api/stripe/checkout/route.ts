import { NextResponse } from "next/server";
import { publicAppBase, sessionFromRequest } from "@/lib/auth-server";
import {
  getStripe,
  paypalMeUrl,
  stripeConfigured,
  stripePriceMonthly,
  stripePriceYearly,
  STRIPE_UNAVAILABLE_HE,
  STRIPE_UNAVAILABLE_AR,
} from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!stripeConfigured()) {
    return NextResponse.json(
      { ok: false, error: "stripe_unconfigured", messageHe: STRIPE_UNAVAILABLE_HE, messageAr: STRIPE_UNAVAILABLE_AR },
      { status: 503 },
    );
  }
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { ok: false, error: "stripe_unconfigured", messageHe: STRIPE_UNAVAILABLE_HE, messageAr: STRIPE_UNAVAILABLE_AR },
      { status: 503 },
    );
  }
  const { session } = await sessionFromRequest(req);
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "auth" }, { status: 401 });
  }
  let body: { interval?: unknown; method?: unknown } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }
  const interval = body.interval === "yearly" ? "yearly" : "monthly";
  const method = String(body.method ?? "card");
  const price = interval === "yearly" ? stripePriceYearly() : stripePriceMonthly();
  const base = publicAppBase(req);
  if (method === "paypal_me") {
    const me = paypalMeUrl();
    if (!me) return NextResponse.json({ ok: false, error: "paypal_unconfigured" }, { status: 503 });
    return NextResponse.json({ ok: true, url: me });
  }
  try {
    const params: Parameters<typeof stripe.checkout.sessions.create>[0] = {
      mode: "subscription",
      line_items: [{ price, quantity: 1 }],
      success_url: `${base}/pricing?checkout=success`,
      cancel_url: `${base}/pricing?checkout=cancel`,
      client_reference_id: session.user.id,
      customer_email: session.user.email || undefined,
      metadata: { user_id: session.user.id, interval },
      subscription_data: { metadata: { user_id: session.user.id, interval } },
    };
    if (method === "paypal") {
      params.payment_method_types = ["paypal"];
    }
    const checkout = await stripe.checkout.sessions.create(params);
    if (!checkout.url) return NextResponse.json({ ok: false, error: "stripe" }, { status: 502 });
    return NextResponse.json({ ok: true, url: checkout.url });
  } catch {
    if (method === "paypal") {
      const me = paypalMeUrl();
      if (me) return NextResponse.json({ ok: true, url: me, fallback: "paypal_me" });
      return NextResponse.json({ ok: false, error: "paypal_unconfigured" }, { status: 503 });
    }
    return NextResponse.json(
      { ok: false, error: "stripe", messageHe: STRIPE_UNAVAILABLE_HE, messageAr: STRIPE_UNAVAILABLE_AR },
      { status: 503 },
    );
  }
}
