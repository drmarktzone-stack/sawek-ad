"use client";

import { Suspense } from "react";
import { MedicalOptibrain } from "@/components/medical/medical-optibrain";

export default function MedicalOptibrainPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-16 text-sm text-zinc-500">OptiBrain…</div>}>
      <MedicalOptibrain />
    </Suspense>
  );
}
