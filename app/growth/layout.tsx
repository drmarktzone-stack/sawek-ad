"use client";

import type { ReactNode } from "react";
import { JourneyRedirect } from "@/components/journey-redirect";

export default function GrowthLayout({ children: _children }: { children: ReactNode }) {
  return <JourneyRedirect />;
}
