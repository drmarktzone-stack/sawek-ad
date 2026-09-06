import type { Metadata } from "next";
import { Suspense } from "react";
import { CheckoutPendingPage } from "@/components/checkout-pending-page";
import { marketingMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...marketingMetadata({
    path: "/checkout/pending",
    title: "SAWEK AD — ממתין לאישור",
    description: "Pro request is pending owner review. No automatic upgrade.",
  }),
  robots: { index: false, follow: false },
};

export default function CheckoutPendingRoute() {
  return (
    <Suspense>
      <CheckoutPendingPage />
    </Suspense>
  );
}
