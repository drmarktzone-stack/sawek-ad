import type { Metadata } from "next";
import { Suspense } from "react";
import { CheckoutPage } from "@/components/checkout-page";
import { marketingMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...marketingMetadata({
    path: "/checkout",
    title: "SAWEK AD — קופה / Checkout",
    description: "Authenticated Pro checkout. Payment instructions appear after you choose a method.",
  }),
  robots: { index: false, follow: false },
};

export default function CheckoutRoute() {
  return (
    <Suspense>
      <CheckoutPage />
    </Suspense>
  );
}
