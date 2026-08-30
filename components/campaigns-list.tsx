"use client";

import { useEffect, useState } from "react";
import type { AgentId, AgentStatus, CampaignPack } from "@/lib/types";
import { deleteCampaign, loadCampaigns } from "@/lib/storage";
import { cachedPublished, fetchPublishedPacks, mergeCampaigns } from "@/lib/published-packs";
import { installDemoPack } from "@/lib/active-pack";
import { wantsEmptyCampaign } from "@/lib/empty-campaign";
import { markEmptyCampaign } from "@/lib/empty-campaign";
import { LangLink } from "@/components/lang-link";
import { ensureAgency } from "@/lib/engine/agency";
import { printBible, printPdf } from "@/lib/export";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/i18n-provider";
import { ConquerHeadline } from "@/components/stepper";
import { DepartmentRail } from "@/components/department-shell";

const STATUS_KEY: Record<AgentStatus, "status.idle" | "status.running" | "status.blocked" | "status.needs_approval" | "status.approved" | "status.complete" | "status.refused"> = {
  idle: "status.idle",
  running: "status.running",
  blocked: "status.blocked",
  needs_approval: "status.needs_approval",
  approved: "status.approved",
  complete: "status.complete",
  refused: "status.refused",
};

const GATES: { id: AgentId; labelKey: "agents.diagnostic" | "agents.strategic" | "agents.media" | "agents.optimizer" }[] = [
  { id: "diagnostic", labelKey: "agents.diagnostic" },
  { id: "strategic", labelKey: "agents.strategic" },
  { id: "media", labelKey: "agents.media" },
  { id: "optimizer", labelKey: "agents.optimizer" },
];

function mergedList(): CampaignPack[] {
  return mergeCampaigns(loadCampaigns().map(ensureAgency), cachedPublished().map(ensureAgency));
}

export function CampaignsList() {
  const { t, locale } = useI18n();
  const [list, setList] = useState<CampaignPack[]>([]);
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const published = await fetchPublishedPacks();
      let rows = mergeCampaigns(loadCampaigns().map(ensureAgency), published.map(ensureAgency));
      if (rows.length === 0 && !wantsEmptyCampaign() && locale !== "ar") {
        installDemoPack();
        rows = mergeCampaigns(loadCampaigns().map(ensureAgency), published.map(ensureAgency));
      }
      if (!cancelled) {
        setList(rows);
        setBooted(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [locale]);

  function loadDemo() {
    installDemoPack();
    setList(mergedList());
  }

  if (!booted) {
    return <p className="p-10 text-center text-zinc-500">…</p>;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <ConquerHeadline subtitle={t("nav.campaigns")} />
      <p className="mx-auto mb-6 max-w-2xl text-center text-sm text-zinc-400">{t("dept.opsLead")}</p>
      <DepartmentRail />

      <div className="mb-6 flex flex-wrap justify-center gap-2">
        <Button type="button" onClick={loadDemo}>
          {t("dept.loadDemo")}
        </Button>
        <Button asChild variant="dark">
          <LangLink href="/" onClick={() => markEmptyCampaign()}>{t("cta.new")}</LangLink>
        </Button>
      </div>

      {list.length === 0 && (
        <p className="text-center text-zinc-400">{t("campaigns.empty")}</p>
      )}
      <ul className="space-y-3">
        {list.map((c) => (
          <li
            key={c.id}
            className="rounded-2xl border border-white/10 bg-omni-card p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-bold text-white">{c.name}</p>
                <p className="text-xs text-zinc-500">
                  {c.createdAt.slice(0, 16).replace("T", " ")} · {c.intake.type} · {c.intake.depth}
                </p>
                <p className="mt-1 text-xs text-omni-yellow">
                  {t("result.score")}: {c.intakeReport.completeness}/100
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm">
                  <LangLink href={`/campaigns/${c.id}`}>{t("campaigns.open")}</LangLink>
                </Button>
                <Button asChild size="sm" variant="dark">
                  <LangLink href={`/plan/${c.id}`}>{t("cta.plan")}</LangLink>
                </Button>
                <Button type="button" size="sm" variant="dark" onClick={() => printBible(c, locale)}>
                  {t("cta.bible")}
                </Button>
                <Button type="button" size="sm" variant="dark" onClick={() => printPdf(c, locale)}>
                  {t("cta.pdf")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    deleteCampaign(c.id);
                    setList(mergedList());
                  }}
                >
                  {t("campaigns.delete")}
                </Button>
              </div>
            </div>
            <div className="mt-3">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-zinc-500">
                {t("dept.hitl")}
              </p>
              <div className="flex flex-wrap gap-1">
                {GATES.map((g) => {
                  const st = c.agentStatus[g.id];
                  const ok = st === "approved" || st === "complete";
                  return (
                    <span
                      key={g.id}
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        ok ? "bg-omni-yellow text-black" : "border border-white/15 text-zinc-400"
                      }`}
                    >
                      {t(g.labelKey)} · {t(STATUS_KEY[st])}
                    </span>
                  );
                })}
              </div>
            </div>
            <p className="mt-3 text-xs text-zinc-500">
              {c.media.scenarioFromUserNumbers ? c.media.realistic[locale] : t("result.noScenario")}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
