import type { Metadata } from "next";
import { Suspense } from "react";
import { PricingPage } from "@/components/pricing-page";
import { marketingMetadata } from "@/lib/seo";

export const metadata: Metadata = marketingMetadata({
  path: "/pricing",
  title: "SAWEK AD — מחירון חינם / Pro",
  description:
    "Free forever (₪0) or Pro ₪99 / month · ₪990 / year when Stripe is connected. No fake checkout. No invented ROAS.",
});

export default function PricingRoute() {
  return (
    <Suspense>
      <PricingPage />
    </Suspense>
  );
}
