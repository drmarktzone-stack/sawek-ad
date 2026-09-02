import Stripe from "stripe";
import { runtimeEnv } from "./runtime-env";

export function stripeSecretKey(): string {
  return runtimeEnv("STRIPE_SECRET_KEY");
}

export function stripePublishableKey(): string {
  return runtimeEnv("STRIPE_PUBLISHABLE_KEY") || runtimeEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");
}

export function stripeWebhookSecret(): string {
  return runtimeEnv("STRIPE_WEBHOOK_SECRET");
}

export function stripePriceMonthly(): string {
  return runtimeEnv("STRIPE_PRICE_MONTHLY");
}

export function stripePriceYearly(): string {
  return runtimeEnv("STRIPE_PRICE_YEARLY");
}

export function stripeConfigured(): boolean {
  return Boolean(stripeSecretKey() && stripePublishableKey() && stripePriceMonthly() && stripePriceYearly());
}

export function paypalMeUrl(): string {
  return runtimeEnv("PAYPAL_ME");
}

export function bankInstructions(): string {
  return runtimeEnv("BANK_INSTRUCTIONS");
}

export function bitInstructions(): string {
  return runtimeEnv("BIT_INSTRUCTIONS");
}

export function getStripe(): Stripe | null {
  const key = stripeSecretKey();
  if (!key) return null;
  return new Stripe(key);
}

export const STRIPE_UNAVAILABLE_HE = "התשלום יופעל אחרי חיבור Stripe";
export const STRIPE_UNAVAILABLE_AR = "الدفع بيتفعّل بعد ربط Stripe";
export const STRIPE_CONNECT_CTA_HE = "לחבר Stripe";
export const STRIPE_CONNECT_CTA_AR = "ربط Stripe";
