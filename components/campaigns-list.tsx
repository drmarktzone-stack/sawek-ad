"use client";

import Link from "next/link";
import { useState } from "react";
import type { AgentId, AgentStatus, CampaignPack } from "@/lib/types";
import { deleteCampaign, loadCampaigns } from "@/lib/storage";
import { installDemoPack } from "@/lib/active-pack";
import { ensureAgency } from "@/lib/engine/agency";
import { printBible, printPdf } from "@/lib/export";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/i18n-provider";
import { ConquerHeadline } from "@/components/stepper";
import { DepartmentRail } from "@/components/department-shell";
import { useIsClient } from "@/lib/use-is-client";

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

export function CampaignsList() {
  const { t, locale } = useI18n();
  const client = useIsClient();
  const [list, setList] = useState<CampaignPack[]>([]);
  const [booted, setBooted] = useState(false);

  if (client && !booted) {
    let rows = loadCampaigns().map(ensureAgency);
    if (rows.length === 0) {
      installDemoPack();
      rows = loadCampaigns().map(ensureAgency);
    }
    setList(rows);
    setBooted(true);
  }

  function loadDemo() {
    installDemoPack();
    setList(loadCampaigns().map(ensureAgency));
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <ConquerHeadline subtitle={`${t("nav.ops")} · ${t("nav.campaigns")}`} />
      <p className="mx-auto mb-6 max-w-2xl text-center text-sm text-zinc-400">{t("dept.opsLead")}</p>
      <DepartmentRail />

      <div className="mb-6 flex flex-wrap justify-center gap-2">
        <Button type="button" onClick={loadDemo}>
          {t("dept.loadDemo")}
        </Button>
        <Button asChild variant="dark">
          <Link href="/">{t("cta.new")}</Link>
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
                  <Link href={`/campaigns/${c.id}`}>{t("campaigns.open")}</Link>
                </Button>
                <Button asChild size="sm" variant="dark">
                  <Link href={`/plan/${c.id}`}>{t("cta.plan")}</Link>
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
                  onClick={() => setList(deleteCampaign(c.id))}
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
