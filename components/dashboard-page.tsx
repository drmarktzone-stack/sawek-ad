"use client";

import { useEffect, useMemo, useState } from "react";
import type { CampaignPack, LabFeatureType, LabRun } from "@/lib/types";
import { loadCampaigns, loadLabRuns, upsertCampaign, upsertLabRunLocal } from "@/lib/storage";
import {
  fetchRemoteCampaigns,
  payloadFeatureType,
  payloadLabRuns,
} from "@/lib/supabase";
import { useI18n } from "@/components/i18n-provider";
import { LangLink } from "@/components/lang-link";
import { Button } from "@/components/ui/button";
import { ConquerHeadline } from "@/components/stepper";
import { cn } from "@/lib/utils";

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
  const [filter, setFilter] = useState<Filter>("all");
  const [items, setItems] = useState<DashItem[]>([]);
  const [booted, setBooted] = useState(false);

  useEffect(() => {
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
      setBooted(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

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

  if (!booted) return <p className="p-10 text-center text-zinc-500">…</p>;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10" dir={locale === "en" ? "ltr" : "rtl"}>
      <ConquerHeadline subtitle={t("nav.dashboard")} />
      <p className="mb-4 text-center text-xs text-zinc-500">{t("dash.filter")}</p>
      <div className="mb-6 flex flex-wrap justify-center gap-2">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-bold",
              filter === f.id ? "bg-omni-yellow text-black" : "border border-white/15 text-zinc-300",
            )}
          >
            {t(f.key)}
          </button>
        ))}
      </div>

      {shown.length === 0 && <p className="text-center text-zinc-400">{t("dash.empty")}</p>}

      <ul className="space-y-3">
        {shown.map((item) => (
          <li key={item.id} className="rounded-2xl border border-white/10 bg-omni-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-bold text-white">{item.name}</p>
                <p className="text-xs text-zinc-500">
                  {item.updatedAt.slice(0, 16).replace("T", " ")} · {item.featureType}
                </p>
              </div>
              <div className="flex gap-2">
                {item.kind === "campaign" ? (
                  <Button asChild size="sm">
                    <LangLink href={`/campaigns/${item.id}`}>{t("campaigns.open")}</LangLink>
                  </Button>
                ) : (
                  <Button asChild size="sm">
                    <LangLink href={`/lab?tab=${item.featureType}&run=${item.id}`}>{t("dash.openLab")}</LangLink>
                  </Button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
