"use client";

import type { ReactNode } from "react";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { charterAllowsCampaign } from "@/lib/operating-niche";
import type { Intake } from "@/lib/types";

export function NicheGateCard({
  intake,
  onScan,
}: {
  intake: Intake;
  onScan?: () => void;
}) {
  const { t, locale } = useI18n();
  const scannedName = intake.businessName.trim();
  return (
    <section
      className="mt-4 rounded-[22px] border-2 border-danger/40 bg-danger/10 p-4 sm:p-5"
      data-testid="niche-gate"
      dir={locale === "en" ? "ltr" : "rtl"}
    >
      <h2 className="os-title mt-1 text-2xl">{t("nicheGate.title")}</h2>
      <p className="mt-2 text-sm font-bold text-navy">{t("nicheGate.body")}</p>
      {scannedName ? (
        <p className="mt-2 text-sm text-muted" data-testid="niche-gate-scanned-name">
          {t("nicheGate.named").replace("{name}", scannedName)}
        </p>
      ) : null}
      {onScan ? (
        <Button type="button" size="lg" variant="outline" className="mt-4 font-black" onClick={onScan}>
          {t("nicheGate.scanOther")}
        </Button>
      ) : null}
    </section>
  );
}

/** Hide campaign tools when the scanned business is outside the five charter niches. */
export function CharterOnly({
  intake,
  children,
}: {
  intake: Intake | null;
  children: ReactNode;
}) {
  if (!intake) return null;
  if ((intake.businessName.trim() || intake.website.trim()) && !charterAllowsCampaign(intake)) {
    return <NicheGateCard intake={intake} />;
  }
  return <>{children}</>;
}
