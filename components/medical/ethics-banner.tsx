"use client";

import { ETHICS } from "@/lib/medical/markers";
import type { Locale } from "@/lib/types";

export function EthicsBanner({ locale, light = false }: { locale: Locale; light?: boolean }) {
  return (
    <aside
      role="alert"
      className={
        light
          ? "rounded-xl border border-danger/40 bg-coral/10 px-4 py-3 text-sm text-danger"
          : "rounded-xl border border-danger/50 bg-coral/10 px-4 py-3 text-sm text-danger"
      }
    >
      {ETHICS[locale]}
    </aside>
  );
}

export function MarkerCount({ n, locale }: { n: number; locale: Locale }) {
  const label =
    locale === "he"
      ? n
        ? `${n} סימוני [יש להשלים] פתוחים`
        : "אין סימוני השלמה פתוחים"
      : locale === "ar"
        ? n
          ? `${n} وسوم [يجب الاستكمال] مفتوحة`
          : "لا وسوم إكمال مفتوحة"
        : n
          ? `${n} open [TO COMPLETE] markers`
          : "No open TO COMPLETE markers";
  return (
    <p className={`text-sm font-semibold ${n ? "text-gold" : "text-muted"}`}>{label}</p>
  );
}
