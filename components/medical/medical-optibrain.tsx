"use client";

import { useState } from "react";
import type { MedicalCampaign, OptiInputs } from "@/lib/medical/types";
import { EMPTY_OPTI } from "@/lib/medical/types";
import { loadClinic, loadMedCampaigns, loadOpti, saveOpti, saveClinic, upsertMedCampaign } from "@/lib/medical/storage";
import { runOptiBrain } from "@/lib/medical/optibrain";
import { buildPediatricDemoCampaign, demoPediatricOpti } from "@/lib/medical/demo";
import { useI18n } from "@/components/i18n-provider";
import { useIsClient } from "@/lib/use-is-client";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { ConquerHeadline } from "@/components/stepper";
import { DepartmentRail } from "@/components/department-shell";
import { MedicalNav } from "@/components/medical/medical-nav";
import { EthicsBanner } from "@/components/medical/ethics-banner";

export function MedicalOptibrain() {
  const { locale, t } = useI18n();
  const client = useIsClient();
  const [opti, setOpti] = useState<OptiInputs>({ ...EMPTY_OPTI });
  const [campaign, setCampaign] = useState<MedicalCampaign | null>(null);
  const [booted, setBooted] = useState(false);

  if (client && !booted) {
    setOpti(loadOpti());
    setCampaign(loadMedCampaigns()[0] ?? null);
    setBooted(true);
  }

  function loadDemo() {
    const { clinic, campaign: camp } = buildPediatricDemoCampaign();
    saveClinic(clinic);
    upsertMedCampaign(camp);
    const o = demoPediatricOpti();
    saveOpti(o);
    setOpti(o);
    setCampaign(camp);
  }

  const clinic = client ? loadClinic() : null;
  const cards = runOptiBrain(clinic, campaign, opti);

  function patch(p: Partial<OptiInputs>) {
    const next = { ...opti, ...p };
    setOpti(next);
    saveOpti(next);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <ConquerHeadline subtitle={t("med.nav.opti")} />
      <p className="mx-auto mb-4 max-w-2xl text-center text-sm text-zinc-400">{t("med.opti.lead")}</p>
      <DepartmentRail />
      <MedicalNav />
      <EthicsBanner locale={locale} />
      <Button type="button" className="mt-4" onClick={loadDemo}>
        {t("med.demo")}
      </Button>
      <section className="mt-6 grid gap-3 sm:grid-cols-2 rounded-2xl border border-white/10 bg-omni-card p-5">
        <div>
          <Label>{t("med.opti.spend")}</Label>
          <Input value={opti.monthlySpend} onChange={(e) => patch({ monthlySpend: e.target.value })} />
        </div>
        <div>
          <Label>{t("med.opti.revenue")}</Label>
          <Input value={opti.revenue} onChange={(e) => patch({ revenue: e.target.value })} />
        </div>
        <div>
          <Label>{t("med.opti.noshow")}</Label>
          <Input value={opti.noShowPercent} onChange={(e) => patch({ noShowPercent: e.target.value })} />
        </div>
        <div>
          <Label>{t("med.opti.event")}</Label>
          <Input value={opti.localEvent} onChange={(e) => patch({ localEvent: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <Label>{t("med.opti.old")}</Label>
          <Textarea value={opti.oldMethod} onChange={(e) => patch({ oldMethod: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <Label>{t("med.opti.bottleneck")}</Label>
          <Textarea value={opti.bottleneck} onChange={(e) => patch({ bottleneck: e.target.value })} />
        </div>
        <div>
          <Label>{t("med.opti.comp")}</Label>
          <Input value={opti.competitorName} onChange={(e) => patch({ competitorName: e.target.value })} />
        </div>
        <div>
          <Label>{t("med.opti.compNote")}</Label>
          <Input value={opti.competitorNote} onChange={(e) => patch({ competitorNote: e.target.value })} />
        </div>
      </section>
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {cards.map((c) => (
          <article key={c.id} className="rounded-2xl border border-white/10 bg-omni-card p-4">
            <h3 className="text-sm font-black uppercase tracking-wide text-omni-yellow">{c.title[locale]}</h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-300">{c.body[locale]}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
