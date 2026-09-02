"use client";

import { Suspense } from "react";
import { LabPage } from "@/components/lab-page";

export default function LabRoute() {
  return (
    <Suspense fallback={<p className="p-10 text-center text-muted">…</p>}>
      <LabPage />
    </Suspense>
  );
}
