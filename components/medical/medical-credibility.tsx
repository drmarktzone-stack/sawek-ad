"use client";

import { useState } from "react";
import type { ClaimKind, MedicalCampaign } from "@/lib/medical/types";
import { loadMedCampaigns, upsertMedCampaign } from "@/lib/medical/storage";
import { startPediatricDemoFlow } from "@/lib/start-pediatric-demo";
import { useI18n } from "@/components/i18n-provider";
import { useIsClient } from "@/lib/use-is-client";
import { Button } from "@/components/ui/button";
import { ConquerHeadline } from "@/components/stepper";
import { DepartmentRail } from "@/components/department-shell";
import { MedicalNav } from "@/components/medical/medical-nav";
import { EthicsBanner } from "@/components/medical/ethics-banner";

const KINDS: ClaimKind[] = ["doctor-fact", "cited-source", "marketing-copy"];

export function MedicalCredibility() {
  const { locale, t } = useI18n();
  const client = useIsClient();
  const [list, setList] = useState<MedicalCampaign[]>([]);
  const [booted, setBooted] = useState(false);

  if (client && !booted) {
    setList(loadMedCampaigns());
    setBooted(true);
  }

  function loadDemo() {
    startPediatricDemoFlow();
  }

  const camp = list[0];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <ConquerHeadline subtitle={t("med.nav.cred")} />
      <DepartmentRail />
      <MedicalNav />
      <EthicsBanner locale={locale} />
      <p className="mt-4 text-sm text-zinc-400">{t("med.cred.lead")}</p>
      <Button type="button" className="mt-3" onClick={loadDemo}>
        {t("med.demo")}
      </Button>
      {!camp && <p className="mt-8 text-center text-zinc-400">{t("med.cred.empty")}</p>}
      {camp && (
        <ul className="mt-6 space-y-3">
          {camp.claims.map((cl) => (
            <li key={cl.id} className="rounded-2xl border border-white/10 bg-omni-card p-4">
              <p className="text-sm text-zinc-200">{cl.text[locale]}</p>
              <p className="mt-1 text-[11px] text-zinc-500">{cl.source}</p>
              <div className="mt-3 flex flex-wrap gap-1">
                {KINDS.map((k) => (
                  <Button
                    key={k}
                    type="button"
                    size="sm"
                    variant={cl.kind === k ? "default" : "dark"}
                    onClick={() => {
                      const next = {
                        ...camp,
                        claims: camp.claims.map((c) => (c.id === cl.id ? { ...c, kind: k } : c)),
                      };
                      upsertMedCampaign(next);
                      setList(loadMedCampaigns());
                    }}
                  >
                    {t(`med.claim.${k}`)}
                  </Button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
