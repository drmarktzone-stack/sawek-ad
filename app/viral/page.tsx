"use client";

import { useState } from "react";
import type { CampaignPack, Locale } from "@/lib/types";
import { latestPack } from "@/lib/active-pack";
import { installDemoPack } from "@/lib/active-pack";
import { DepartmentRail } from "@/components/department-shell";
import { ViralDesk } from "@/components/viral-desk";
import { DemoPicker } from "@/components/demo-picker";
import { ConquerHeadline } from "@/components/stepper";
import { useI18n } from "@/components/i18n-provider";
import { useIsClient } from "@/lib/use-is-client";
import { Button } from "@/components/ui/button";

export default function ViralPage() {
  const { t, locale } = useI18n();
  const client = useIsClient();
  const [pack, setPack] = useState<CampaignPack | null>(null);
  const [booted, setBooted] = useState(false);
  const [packLang, setPackLang] = useState<Locale>(locale);

  if (client && !booted) {
    const latest = latestPack();
    if (latest) setPack(latest);
    setPackLang(locale);
    setBooted(true);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <ConquerHeadline subtitle={t("nav.viral")} />
      <p className="mx-auto mb-6 max-w-2xl text-center text-sm text-muted">{t("dept.viralLead")}</p>
      <DepartmentRail />
      <div className="mb-6 flex flex-col items-center gap-3">
        <p className="text-sm text-muted">{t("home.demos.secondary")}</p>
        <DemoPicker onSelect={(id) => setPack(installDemoPack(id))} size="default" />
        {pack ? (
          <p className="text-sm font-bold text-navy">
            {pack.name} · {t("result.score")}: {pack.intakeReport.completeness}/100
          </p>
        ) : null}
        <div className="flex gap-1 rounded-full border border-navy/10 bg-white p-0.5">
          {(["he", "ar", "en"] as Locale[]).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setPackLang(l)}
              className={`rounded-full px-3 py-1 text-sm font-bold ${packLang === l ? "bg-navy text-white" : "text-muted"}`}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={() => setPack(null)}>
          {t("cta.new")}
        </Button>
      </div>
      <ViralDesk key={pack?.id ?? "draft"} pack={pack} packLang={packLang} onPack={setPack} />
    </div>
  );
}
