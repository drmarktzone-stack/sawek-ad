import { NextResponse } from "next/server";
import { publicAppBase, sessionFromRequest } from "@/lib/auth-server";
import {
  getStripe,
  stripeConfigured,
  stripePriceMonthly,
  stripePriceYearly,
  STRIPE_UNAVAILABLE_HE,
  STRIPE_UNAVAILABLE_AR,
} from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAYPAL_OFF_HE = "PayPal כבוי. שלמו בביט או בהעברה בנקאית.";
const PAYPAL_OFF_AR = "PayPal مطفي. ادفعوا ببيت أو حوالة بنكية.";
const PAYPAL_OFF_EN = "PayPal is offline. Pay with Bit or bank transfer.";

export async function POST(req: Request) {
  let body: { interval?: unknown; method?: unknown } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }
  const method = String(body.method ?? "card");
  if (method === "paypal" || method === "paypal_me") {
    return NextResponse.json(
      {
        ok: false,
        error: "paypal_offline",
        messageHe: PAYPAL_OFF_HE,
        messageAr: PAYPAL_OFF_AR,
        messageEn: PAYPAL_OFF_EN,
      },
      { status: 503 },
    );
  }
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
  const interval = body.interval === "yearly" ? "yearly" : "monthly";
  const price = interval === "yearly" ? stripePriceYearly() : stripePriceMonthly();
  const base = publicAppBase(req);
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
    const checkout = await stripe.checkout.sessions.create(params);
    if (!checkout.url) return NextResponse.json({ ok: false, error: "stripe" }, { status: 502 });
    return NextResponse.json({ ok: true, url: checkout.url });
  } catch {
    return NextResponse.json(
      { ok: false, error: "stripe", messageHe: STRIPE_UNAVAILABLE_HE, messageAr: STRIPE_UNAVAILABLE_AR },
      { status: 503 },
    );
  }
}
