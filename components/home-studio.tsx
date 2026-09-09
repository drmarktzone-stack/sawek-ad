"use client";

import { useEffect, useState } from "react";
import { Download, Images, Languages, Link2, Search, ShieldAlert, Sparkles, Workflow } from "lucide-react";
import { WizardFlow } from "@/components/wizard-flow";
import { useI18n } from "@/components/i18n-provider";
import { markEmptyCampaign, EMPTY_CAMPAIGN_EVENT } from "@/lib/empty-campaign";
import { DemoPicker } from "@/components/demo-picker";
import { Button } from "@/components/ui/button";
import { PwaInstallHint } from "@/components/pwa-install-hint";
import { FunctionRail } from "@/components/function-rail";
import { LangLink } from "@/components/lang-link";
import { PRICE_MONTHLY_ILS, PRICE_YEARLY_ILS } from "@/lib/plan";
import { useCommandSignals } from "@/components/command/signals";
import { CampaignTable, CommandHero, ModuleSummaries, TodayBoard } from "@/components/command/command-center";
import { OsDisclosure } from "@/components/command/primitives";
import { CampaignJourney } from "@/components/campaign-journey";

export function HomeStudio() {
  const { t } = useI18n();
  const [wizardKey, setWizardKey] = useState(0);
  const signals = useCommandSignals();

  useEffect(() => {
    const onEmpty = () => setWizardKey((k) => k + 1);
    window.addEventListener(EMPTY_CAMPAIGN_EVENT, onEmpty);
    return () => window.removeEventListener(EMPTY_CAMPAIGN_EVENT, onEmpty);
  }, []);

  function startEmpty() {
    markEmptyCampaign();
    requestAnimationFrame(() => {
      document.getElementById("studio")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function focusScan() {
    window.scrollTo({ top: 0, behavior: "smooth" });
    requestAnimationFrame(() => {
      document.getElementById("scan-url")?.focus();
    });
  }

  const stats = [
    { icon: Workflow, label: t("home.stat.steps") },
    { icon: Sparkles, label: t("home.stat.agents") },
    { icon: Languages, label: t("home.stat.langs") },
    { icon: ShieldAlert, label: t("home.stat.media") },
  ];

  const howIcons = [Link2, Search, Images, Download] as const;
  const freeItems = ["pricing.f1", "pricing.f2", "pricing.f3", "pricing.f4", "pricing.f5"] as const;
  const proItems = ["pricing.p1", "pricing.p2", "pricing.p3", "pricing.p4", "pricing.p5"] as const;

  return (
    <div className="relative overflow-hidden">
      <CommandHero signals={signals} onScan={focusScan} onEmpty={startEmpty} />

      <div className="relative mx-auto max-w-6xl px-4 py-6">
        <CampaignJourney />
        <p className="mx-auto mb-4 max-w-xl text-center text-sm text-muted">{t("home.truth")}</p>
      </div>

      <div id="studio" className="relative mx-auto max-w-4xl px-3 pb-8 sm:px-4">
        <p className="os-kicker mb-3">{t("os.buildCampaign")}</p>
        <div className="overflow-hidden border-t border-[var(--line)] pt-4">
          <WizardFlow key={wizardKey} embedded />
        </div>
      </div>

      <div className="relative mx-auto max-w-6xl px-4 pb-6">
        <p className="mb-3 text-center text-sm font-semibold text-muted">{t("home.demos.secondary")}</p>
        <DemoPicker />
        <p className="mx-auto mt-2 max-w-md text-center text-xs font-bold text-navy">{t("home.vertex")}</p>
        <div className="mt-3 flex justify-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <LangLink href="/login">{t("nav.login")}</LangLink>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <LangLink href="/about">{t("home.cta.about")}</LangLink>
          </Button>
        </div>
        <PwaInstallHint />
      </div>

      {signals.ready ? (
        <div className="mx-auto max-w-6xl px-4">
          <TodayBoard signals={signals} />
          <ModuleSummaries signals={signals} />
          <CampaignTable signals={signals} />
        </div>
      ) : null}

      <OsDisclosure summary={t("os.aboutDesk")}>
        <FunctionRail compact />
        <ul className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
          {stats.map((s) => (
            <li key={s.label} className="flex items-start gap-2 text-sm font-bold text-navy">
              <s.icon className="mt-0.5 size-4 shrink-0 text-teal" />
              <span>{s.label}</span>
            </li>
          ))}
        </ul>

        <ol className="mt-6 divide-y divide-[var(--line)]">
          {(
            [
              ["home.how.1", "home.how.1b"],
              ["home.how.2", "home.how.2b"],
              ["home.how.3", "home.how.3b"],
              ["home.how.4", "home.how.4b"],
            ] as const
          ).map(([title, body], i) => {
            const Icon = howIcons[i];
            return (
              <li key={title} className="flex gap-3 py-4 text-start">
                <Icon className="mt-1 size-4 shrink-0 text-teal" aria-hidden />
                <div>
                  <p className="os-kicker">{t("home.how.title")} · 0{i + 1}</p>
                  <p className="mt-1 text-lg font-black text-navy">{t(title)}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{t(body)}</p>
                </div>
              </li>
            );
          })}
        </ol>

        <h3 className="os-title mt-8 text-2xl">{t("home.vs.title")}</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <article className="border-s-2 border-[var(--line)] ps-4 text-start">
            <p className="os-meta">{t("home.vs.ordinaryName")}</p>
            <p className="mt-2 text-base leading-relaxed text-navy/80">{t("home.vs.ordinary")}</p>
            <p className="mt-3 text-sm leading-relaxed text-muted">{t("home.vs.canva")}</p>
          </article>
          <article className="border-s-2 border-teal ps-4 text-start">
            <p className="os-kicker">SAWEK · CMO</p>
            <p className="mt-2 text-base font-semibold leading-relaxed text-navy">{t("home.vs.sawek")}</p>
          </article>
        </div>
        <div className="mt-6 overflow-x-auto">
          <table className="os-table">
            <thead>
              <tr>
                <th />
                <th>{t("home.vs.ordinaryName")}</th>
                <th>SAWEK</th>
              </tr>
            </thead>
            <tbody>
              {(
                [
                  ["home.how.1", "home.vs.rowOrdinaryIdea", "home.vs.rowSawekIdea"],
                  ["home.vs.rowIdea", "home.vs.rowOrdinaryIdea", "home.vs.rowSawekIdea"],
                  ["home.vs.rowScore", "home.vs.rowOrdinaryScore", "home.vs.rowSawekScore"],
                  ["home.vs.rowGaps", "home.vs.rowOrdinaryGaps", "home.vs.rowSawekGaps"],
                  ["home.vs.rowLang", "home.vs.rowOrdinaryLang", "home.vs.rowSawekLang"],
                ] as const
              ).slice(1).map(([row, ordinary, sawek]) => (
                <tr key={row}>
                  <td className="font-black">{t(row)}</td>
                  <td className="text-navy/65">{t(ordinary)}</td>
                  <td className="font-semibold">{t(sawek)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="os-title mt-8 text-2xl">{t("home.plans.title")}</h3>
        <div className="mt-4 grid gap-6 md:grid-cols-2">
          <article className="text-start">
            <p className="os-kicker">{t("pricing.freeName")}</p>
            <p className="os-title mt-2 text-4xl">{t("pricing.freePrice")}</p>
            <p className="text-sm text-muted">{t("pricing.freeForever")}</p>
            <ul className="mt-4 space-y-2 text-base text-navy">
              {freeItems.map((k) => (
                <li key={k}>{t(k)}</li>
              ))}
            </ul>
          </article>
          <article className="text-start">
            <p className="os-kicker">{t("pricing.proName")}</p>
            <p className="os-title mt-2 text-4xl">
              ₪{PRICE_MONTHLY_ILS}{" "}
              <span className="text-base font-bold text-muted">{t("home.plans.month")}</span>
            </p>
            <p className="text-lg font-black text-navy">
              ₪{PRICE_YEARLY_ILS} <span className="text-sm font-bold text-muted">{t("home.plans.year")}</span>
            </p>
            <ul className="mt-4 space-y-2 text-base text-navy">
              {proItems.map((k) => (
                <li key={k}>{t(k)}</li>
              ))}
            </ul>
          </article>
        </div>
      </OsDisclosure>

    </div>
  );
}
