"use client";

import { useEffect, useState } from "react";
import type { AgentId, AgentStatus, CampaignPack } from "@/lib/types";
import { deleteCampaign, loadCampaigns } from "@/lib/storage";
import { cachedPublished, fetchPublishedPacks, mergeCampaigns } from "@/lib/published-packs";
import { installDemoPack } from "@/lib/active-pack";
import { markEmptyCampaign } from "@/lib/empty-campaign";
import { LangLink } from "@/components/lang-link";
import { ensureAgency } from "@/lib/engine/agency";
import { printBible, printPdf } from "@/lib/export";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/i18n-provider";
import { ConquerHeadline } from "@/components/stepper";
import { DepartmentRail } from "@/components/department-shell";
import { PublishToSocial, SocialConnectStrip } from "@/components/publish-to-social";
import { CampaignMiniPreview } from "@/components/campaign-mini-preview";

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
  const [socialFlash, setSocialFlash] = useState<string | null>(null);

  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search);
      const social = q.get("social");
      if (social === "connected") setSocialFlash(t("social.banner.connected"));
      else if (social === "error") setSocialFlash(t("social.banner.error"));
    } catch {
      /* ignore */
    }
    let cancelled = false;
    (async () => {
      const published = await fetchPublishedPacks();
      const rows = mergeCampaigns(loadCampaigns().map(ensureAgency), published.map(ensureAgency));
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
    return <p className="p-10 text-center text-muted">…</p>;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <ConquerHeadline subtitle={t("nav.campaigns")} />
      <p className="mx-auto mb-6 max-w-2xl text-center text-sm text-muted">{t("dept.opsLead")}</p>
      <DepartmentRail />

      {socialFlash && (
        <p className="mb-4 text-center text-sm text-omni-yellow">{socialFlash}</p>
      )}
      <SocialConnectStrip className="mb-6" />

      <div className="mb-6 flex flex-wrap justify-center gap-2">
        <Button type="button" onClick={loadDemo}>
          {t("dept.loadDemo")}
        </Button>
        <Button asChild variant="dark">
          <LangLink href="/" onClick={() => markEmptyCampaign()}>{t("cta.new")}</LangLink>
        </Button>
      </div>

      {list.length === 0 && (
        <p className="text-center text-muted">{t("campaigns.empty")}</p>
      )}
      <ul className="space-y-3">
        {list.map((c) => (
          <li
            key={c.id}
            className="rounded-2xl border border-navy/10 bg-white p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-bold text-navy">{c.name}</p>
                <p className="text-[13px] text-muted">
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
                <PublishToSocial campaignId={c.id} pack={c} locale={locale} compact />
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
            <CampaignMiniPreview pack={c} locale={locale} />
            <div className="mt-3">
              <p className="mb-2 text-[13px] font-bold uppercase tracking-wide text-muted">
                {t("dept.hitl")}
              </p>
              <div className="flex flex-wrap gap-1">
                {GATES.map((g) => {
                  const st = c.agentStatus[g.id];
                  const ok = st === "approved" || st === "complete";
                  return (
                    <span
                      key={g.id}
                      className={`rounded-full px-2 py-0.5 text-[13px] font-semibold ${
                        ok ? "bg-navy text-white" : "border border-navy/15 text-muted"
                      }`}
                    >
                      {t(g.labelKey)} · {t(STATUS_KEY[st])}
                    </span>
                  );
                })}
              </div>
            </div>
            <p className="mt-3 text-xs text-muted">
              {c.media.scenarioFromUserNumbers ? c.media.realistic[locale] : t("result.noScenario")}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
