"use client";

import type { ReactNode } from "react";
import { CampaignJourney } from "@/components/campaign-journey";
import { NextStepCard } from "@/components/next-step-card";
import { OsPage } from "@/components/command/primitives";
import { useI18n } from "@/components/i18n-provider";
import { DemoPicker } from "@/components/demo-picker";

export function ToolsShell({
  kicker,
  title,
  lead,
  children,
  testId,
}: {
  kicker: string;
  title: string;
  lead: string;
  children: ReactNode;
  testId: string;
}) {
  const { locale } = useI18n();
  return (
    <OsPage data-testid={testId} dir={locale === "en" ? "ltr" : "rtl"}>
      <CampaignJourney />
      <NextStepCard compact />
      <p className="os-kicker">{kicker}</p>
      <h1 className="os-title mt-2 text-3xl sm:text-4xl">{title}</h1>
      <p className="mt-3 max-w-2xl text-base text-muted">{lead}</p>
      <div className="mt-4">
        <p className="mb-2 text-xs font-bold text-muted">
          {locale === "he" ? "דמו רק בלחיצה" : locale === "ar" ? "الديمو بزر فقط" : "Demo only via click"}
        </p>
        <DemoPicker />
      </div>
      <div className="mt-6">{children}</div>
    </OsPage>
  );
}
