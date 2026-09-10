"use client";

import type { ReactNode } from "react";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { CHARTER_NICHES, charterAllowsCampaign, nicheLabel, resolveOperatingNiche } from "@/lib/operating-niche";
import type { Intake } from "@/lib/types";

export function NicheGateCard({
  intake,
  onScan,
}: {
  intake: Intake;
  onScan?: () => void;
}) {
  const { t, locale } = useI18n();
  const niche = resolveOperatingNiche(intake);
  return (
    <section
      className="mt-4 rounded-[22px] border-2 border-danger/40 bg-danger/10 p-4 sm:p-5"
      data-testid="niche-gate"
      dir={locale === "en" ? "ltr" : "rtl"}
    >
      <p className="os-kicker">{t("nicheGate.this")}</p>
      <h2 className="os-title mt-1 text-2xl">{t("nicheGate.title")}</h2>
      <p className="mt-2 text-sm text-navy">{t("nicheGate.body")}</p>
      {intake.businessName.trim() ? (
        <p className="mt-2 text-sm font-bold text-muted">
          {intake.businessName} · {nicheLabel(niche, locale)}
        </p>
      ) : null}
      <p className="mt-3 text-xs font-black uppercase tracking-[0.14em] text-navy">{t("nicheGate.allowed")}</p>
      <ul className="mt-1 list-disc ps-5 text-sm text-navy">
        {CHARTER_NICHES.map((id) => (
          <li key={id}>{nicheLabel(id, locale)}</li>
        ))}
      </ul>
      {onScan ? (
        <Button type="button" size="lg" variant="coral" className="mt-4 font-black" onClick={onScan}>
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
