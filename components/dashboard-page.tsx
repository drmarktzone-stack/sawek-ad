"use client";

import { useEffect, useMemo, useState } from "react";
import type { CampaignPack, LabFeatureType } from "@/lib/types";
import { getCampaign, loadCampaigns, loadLabRuns, upsertCampaign, upsertLabRunLocal } from "@/lib/storage";
import {
  fetchRemoteCampaigns,
  payloadFeatureType,
  payloadLabRuns,
} from "@/lib/supabase";
import { useI18n } from "@/components/i18n-provider";
import { LangLink } from "@/components/lang-link";
import { Button } from "@/components/ui/button";
import { PublishToSocial } from "@/components/publish-to-social";
import { useAuth } from "@/components/auth-provider";
import { fetchRemoteWorkspaces, mergeRemoteWorkspaces } from "@/lib/scientist/store";
import { useCommandSignals } from "@/components/command/signals";
import { CampaignTable, ContextBar, ModuleSummaries, TodayBoard } from "@/components/command/command-center";
import { OsLoading, OsPage, OsSection, OsTabs } from "@/components/command/primitives";

type Filter = "all" | LabFeatureType;

type DashItem = {
  id: string;
  name: string;
  featureType: LabFeatureType;
  updatedAt: string;
  kind: "campaign" | "lab";
};

function isPack(payload: unknown): payload is CampaignPack {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return false;
  const o = payload as Record<string, unknown>;
  return Boolean(o.intake && o.id && Array.isArray(o.variants));
}

export function DashboardPage() {
  const { t, locale } = useI18n();
  const { ready, user } = useAuth();
  const signals = useCommandSignals();
  const [filter, setFilter] = useState<Filter>("all");
  const [items, setItems] = useState<DashItem[]>([]);
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    (async () => {
      const localPacks = loadCampaigns();
      const localRuns = loadLabRuns();
      const remote = await fetchRemoteCampaigns();
      for (const row of remote) {
        if (isPack(row.payload)) {
          try {
            upsertCampaign(row.payload);
          } catch {
            /* ignore */
          }
        } else {
          for (const run of payloadLabRuns(row.payload)) {
            try {
              upsertLabRunLocal(run);
            } catch {
              /* ignore */
            }
          }
        }
      }
      if (cancelled) return;
      const seen = new Set<string>();
      const next: DashItem[] = [];
      for (const p of loadCampaigns().length ? loadCampaigns() : localPacks) {
        if (seen.has(p.id)) continue;
        seen.add(p.id);
        next.push({
          id: p.id,
          name: p.name || t("dash.campaign"),
          featureType: p.featureType ?? "campaign",
          updatedAt: p.updatedAt || p.createdAt,
          kind: "campaign",
        });
      }
      for (const row of remote) {
        if (isPack(row.payload)) continue;
        const ft = payloadFeatureType(row.payload, row.feature_type);
        if (seen.has(row.id)) continue;
        seen.add(row.id);
        next.push({
          id: row.id,
          name: row.name || ft,
          featureType: ft,
          updatedAt: row.updated_at,
          kind: ft === "campaign" ? "campaign" : "lab",
        });
      }
      for (const run of loadLabRuns().length ? loadLabRuns() : localRuns) {
        if (seen.has(run.id)) continue;
        seen.add(run.id);
        next.push({
          id: run.id,
          name: run.featureType,
          featureType: run.featureType,
          updatedAt: run.createdAt,
          kind: "lab",
        });
      }
      next.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
      setItems(next);
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
  }, [t, ready, user?.id]);

  const shown = useMemo(
    () => (filter === "all" ? items : items.filter((i) => i.featureType === filter)),
    [items, filter],
  );

  const filters: { id: Filter; key: "dash.all" | "dash.campaign" | "lab.tab.angles" | "lab.tab.vision" | "lab.tab.score" }[] = [
    { id: "all", key: "dash.all" },
    { id: "campaign", key: "dash.campaign" },
    { id: "angles", key: "lab.tab.angles" },
    { id: "vision", key: "lab.tab.vision" },
    { id: "score", key: "lab.tab.score" },
  ];

  if (!booted) return <OsLoading />;

  return (
    <OsPage dir={locale === "en" ? "ltr" : "rtl"}>
      <p className="hub-badge mb-3">
        <span className="hub-badge-dot" aria-hidden />
        {t("os.kicker")}
      </p>
      <h1 className="os-title mt-1 text-3xl sm:text-4xl">{t("nav.command")}</h1>
      <p className="mt-2 mb-6 max-w-2xl text-sm text-muted">{t("os.todayTitle")}</p>

      {signals.ready ? (
        <>
          <ContextBar signals={signals} />
          <TodayBoard signals={signals} />
          <ModuleSummaries signals={signals} />
          <CampaignTable signals={signals} />
        </>
      ) : null}

      <OsSection kicker={t("dash.filter")} title={t("nav.dashboard")}>
        <OsTabs
          tabs={filters.map((f) => ({ id: f.id, label: t(f.key) }))}
          value={filter}
          onChange={(id) => setFilter(id as Filter)}
        />

        {shown.length === 0 && <p className="os-unknown mt-4">{t("dash.empty")}</p>}

        <div className="mt-4 overflow-x-auto">
          <table className="os-table">
            <tbody>
              {shown.map((item) => (
                <tr key={item.id}>
                  <td>
                    <p className="font-bold text-navy">{item.name}</p>
                    <p className="text-xs text-muted">
                      {item.updatedAt.slice(0, 16).replace("T", " ")} · {item.featureType}
                    </p>
                  </td>
                  <td className="text-end">
                    <div className="flex flex-wrap items-start justify-end gap-2">
                      {item.kind === "campaign" ? (
                        <>
                          <Button asChild size="sm">
                            <LangLink href={`/campaigns/${item.id}`}>{t("campaigns.open")}</LangLink>
                          </Button>
                          <PublishToSocial campaignId={item.id} pack={getCampaign(item.id)} locale={locale} compact />
                        </>
                      ) : (
                        <Button asChild size="sm">
                          <LangLink href={`/lab?tab=${item.featureType}&run=${item.id}`}>{t("dash.openLab")}</LangLink>
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </OsSection>
    </OsPage>
  );
}
