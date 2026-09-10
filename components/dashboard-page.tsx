"use client";

import { useEffect, useState } from "react";
import type { CampaignPack } from "@/lib/types";
import { upsertCampaign } from "@/lib/storage";
import { fetchRemoteCampaigns } from "@/lib/supabase";
import { useI18n } from "@/components/i18n-provider";
import { useAuth } from "@/components/auth-provider";
import { fetchRemoteWorkspaces, mergeRemoteWorkspaces } from "@/lib/scientist/store";
import { useCommandSignals } from "@/components/command/signals";
import { CampaignTable, ContextBar, ModuleSummaries } from "@/components/command/command-center";
import { ContentJobsStrip } from "@/components/content-jobs";
import { CampaignJourney } from "@/components/campaign-journey";
import { NextStepCard } from "@/components/next-step-card";
import { OsLoading, OsPage } from "@/components/command/primitives";
import { wizardReady } from "@/lib/engine/validate";

function isPack(payload: unknown): payload is CampaignPack {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return false;
  const o = payload as Record<string, unknown>;
  return Boolean(o.intake && o.id && Array.isArray(o.variants));
}

export function DashboardPage() {
  const { t, locale } = useI18n();
  const { ready, user } = useAuth();
  const signals = useCommandSignals();
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    (async () => {
      const remote = await fetchRemoteCampaigns();
      for (const row of remote) {
        if (isPack(row.payload)) {
          try {
            upsertCampaign(row.payload);
          } catch {
            /* ignore */
          }
        }
      }
      if (cancelled) return;
      try {
        const remoteWs = await fetchRemoteWorkspaces();
        if (remoteWs.length) mergeRemoteWorkspaces(remoteWs);
      } catch {
        /* local workspace is enough */
      }
      setBooted(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, user?.id]);

  if (!booted) return <OsLoading />;

  return (
    <OsPage dir={locale === "en" ? "ltr" : "rtl"}>
      <p className="os-kicker">{t("os.kicker")}</p>
      <h1 className="os-title mt-1 text-3xl sm:text-4xl">{t("nav.command")}</h1>
      <p className="mt-2 mb-6 max-w-2xl text-sm text-muted">{t("path.lead")}</p>
      <CampaignJourney compact />
      <NextStepCard compact />
      {wizardReady(signals.intake) ? <ContentJobsStrip compact /> : null}

      {signals.ready ? (
        <>
          <ContextBar signals={signals} />
          <ModuleSummaries signals={signals} />
          <CampaignTable signals={signals} />
        </>
      ) : null}
    </OsPage>
  );
}
