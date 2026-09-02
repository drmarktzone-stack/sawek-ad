"use client";

import { Suspense } from "react";
import { PricingPage } from "@/components/pricing-page";

export default function PricingRoute() {
  return (
    <Suspense>
      <PricingPage />
    </Suspense>
  );
}
