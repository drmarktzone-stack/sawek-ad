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

export function HomeStudio() {
  const { t } = useI18n();
  const [wizardKey, setWizardKey] = useState(0);

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

  const stats = [
    { icon: Workflow, label: t("home.stat.steps") },
    { icon: Sparkles, label: t("home.stat.agents") },
    { icon: Languages, label: t("home.stat.langs") },
    { icon: ShieldAlert, label: t("home.stat.media") },
  ];

  const howIcons = [Link2, Search, Images, Download] as const;
  const howAccents = ["#0C7A6B", "#10233F", "#5C4D86", "#E24B3A"] as const;
  const freeItems = ["pricing.f1", "pricing.f2", "pricing.f3", "pricing.f4", "pricing.f5"] as const;
  const proItems = ["pricing.p1", "pricing.p2", "pricing.p3", "pricing.p4", "pricing.p5"] as const;

  return (
    <div className="relative overflow-hidden">
      <section className="relative isolate overflow-hidden agency-hero-glow">
        <div aria-hidden className="agency-grain absolute inset-0 opacity-20" />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{ backgroundImage: "url(/textures/hero-arc.svg)", backgroundSize: "cover", backgroundPosition: "center top" }}
        />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-[#F3EFE6]" />

        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-10 sm:pb-20 sm:pt-16">
          <p className="agency-kicker mb-4 text-center text-[#9FD4C8]">{t("home.kicker")}</p>
          <span className="agency-rule mx-auto mb-6 bg-[#9FD4C8]" />
          <h1 className="agency-display-cream agency-fade-up mx-auto max-w-5xl text-center text-[2.15rem] leading-[1.12] sm:text-6xl lg:text-7xl">
            {t("home.headline")}
          </h1>
          <p className="mobile-readable mx-auto mt-6 max-w-2xl text-center text-base font-semibold leading-relaxed text-[#E8E2D4] sm:mt-7 sm:text-xl">
            {t("home.pitch")}
          </p>
          <p className="mx-auto mt-5 max-w-xl rounded-[12px] border border-white/12 bg-white/8 px-4 py-2.5 text-center text-sm font-bold text-[#F7F3EA] backdrop-blur-sm sm:px-5 sm:text-base">
            {t("home.vertex")}
          </p>

          <div className="mt-9 flex flex-col items-center gap-5 sm:mt-10">
            <div className="mobile-stack w-full justify-center">
              <Button type="button" size="lg" variant="coral" className="btn-mobile-full text-base font-black sm:text-lg" onClick={startEmpty}>
                {t("cta.new")}
              </Button>
              <Button asChild size="lg" variant="outline" className="btn-mobile-full border-white/20 bg-white/8 text-[#F7F3EA] hover:bg-white hover:text-ink text-base font-black sm:text-lg">
                <LangLink href="/pricing">{t("home.cta.pricing")}</LangLink>
              </Button>
            </div>
            <p className="max-w-lg text-center text-sm font-semibold text-[#C9D0D8]">{t("home.demos.secondary")}</p>
            <DemoPicker tone="ink" />
          </div>
          <p className="mx-auto mt-4 max-w-md text-center text-base text-[#C9D0D8]">{t("cta.newHint")}</p>
          <p className="mx-auto mt-5 max-w-xl text-center text-base leading-relaxed text-[#C9B896]">{t("home.truth")}</p>
          <div className="mt-4 flex justify-center">
            <Button asChild variant="ghost" size="sm" className="text-[#C9D0D8] hover:bg-white/8 hover:text-[#F7F3EA]">
              <LangLink href="/login">{t("nav.login")}</LangLink>
            </Button>
          </div>
          <PwaInstallHint />
        </div>
      </section>

      <FunctionRail />

      <section className="relative mx-auto max-w-5xl px-4">
        <ul className="mx-auto mt-2 grid max-w-4xl grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-4">
          {stats.map((s) => (
            <li
              key={s.label}
              className="agency-board flex min-h-[4.75rem] items-center justify-center gap-2 px-2.5 py-3 text-center text-sm font-bold leading-snug text-navy sm:px-3 sm:py-4 sm:text-base"
            >
              <s.icon className="size-4 shrink-0 text-teal" />
              <span className="min-w-0">{s.label}</span>
            </li>
          ))}
        </ul>
      </section>

      <ol className="relative mx-auto mt-10 grid max-w-5xl gap-3 px-4 sm:mt-12 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
            <li key={title} className="agency-board p-5 text-start">
              <p className="flex items-center gap-2 text-[0.7rem] font-extrabold uppercase tracking-[0.22em] text-teal sm:text-xs">
                <span
                  className="inline-flex size-8 items-center justify-center rounded-[10px] text-white"
                  style={{ background: howAccents[i] }}
                >
                  <Icon className="size-3.5" aria-hidden />
                </span>
                {t("home.how.title")} · 0{i + 1}
              </p>
              <p className="agency-display mt-4 text-2xl">{t(title)}</p>
              <p className="mt-2 text-base leading-relaxed text-muted">{t(body)}</p>
            </li>
          );
        })}
      </ol>

      <section className="relative mx-auto mt-14 max-w-5xl px-4">
        <h2 className="agency-display text-center text-3xl sm:text-5xl">{t("home.vs.title")}</h2>
        <span className="agency-rule mx-auto mt-4" />
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <article className="rounded-[20px] border border-[rgba(8,17,31,0.1)] bg-white p-6 text-start shadow-[var(--shadow-card)]">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-muted">{t("home.vs.ordinaryName")}</p>
            <p className="mt-3 text-lg leading-relaxed text-navy/80">{t("home.vs.ordinary")}</p>
            <p className="mt-4 text-sm leading-relaxed text-muted">{t("home.vs.canva")}</p>
          </article>
          <article className="agency-ink rounded-[20px] p-6 text-start shadow-[var(--shadow-lift)]">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#9FD4C8]">SAWEK · CMO</p>
            <p className="mt-3 text-lg font-semibold leading-relaxed text-[#F7F3EA]">{t("home.vs.sawek")}</p>
          </article>
        </div>
        <div className="agency-board mt-6 overflow-hidden p-0">
          <table className="w-full text-start text-sm">
            <thead>
              <tr className="border-b border-[rgba(8,17,31,0.08)] bg-[#08111F] text-[11px] font-black uppercase tracking-wide text-[#C9D0D8]">
                <th className="px-4 py-3.5" />
                <th className="px-4 py-3.5">{t("home.vs.ordinaryName")}</th>
                <th className="px-4 py-3.5 text-[#9FD4C8]">SAWEK</th>
              </tr>
            </thead>
            <tbody className="text-navy">
              {(
                [
                  ["home.vs.rowIdea", "home.vs.rowOrdinaryIdea", "home.vs.rowSawekIdea"],
                  ["home.vs.rowScore", "home.vs.rowOrdinaryScore", "home.vs.rowSawekScore"],
                  ["home.vs.rowGaps", "home.vs.rowOrdinaryGaps", "home.vs.rowSawekGaps"],
                  ["home.vs.rowLang", "home.vs.rowOrdinaryLang", "home.vs.rowSawekLang"],
                ] as const
              ).map(([row, ordinary, sawek]) => (
                <tr key={row} className="border-b border-[rgba(8,17,31,0.06)] last:border-0">
                  <td className="px-4 py-3.5 font-black">{t(row)}</td>
                  <td className="px-4 py-3.5 text-navy/65">{t(ordinary)}</td>
                  <td className="px-4 py-3.5 font-semibold">{t(sawek)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="relative mx-auto mt-14 max-w-5xl px-4">
        <h2 className="agency-display text-center text-3xl sm:text-5xl">{t("home.plans.title")}</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <article className="agency-board p-7 text-start">
            <p className="agency-kicker">{t("pricing.freeName")}</p>
            <p className="agency-display mt-3 text-5xl">{t("pricing.freePrice")}</p>
            <p className="text-sm text-muted">{t("pricing.freeForever")}</p>
            <ul className="mt-6 space-y-2.5 text-base text-navy">
              {freeItems.map((k) => (
                <li key={k} className="flex gap-2">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-teal" />
                  {t(k)}
                </li>
              ))}
            </ul>
          </article>
          <article className="agency-ink p-7 text-start shadow-[var(--shadow-lift)]">
            <p className="text-xs font-black uppercase tracking-[0.26em] text-[#9FD4C8]">{t("pricing.proName")}</p>
            <p className="agency-display-cream mt-3 text-5xl">
              ₪{PRICE_MONTHLY_ILS}{" "}
              <span className="text-base font-bold text-[#C9D0D8]">{t("home.plans.month")}</span>
            </p>
            <p className="text-xl font-black text-[#F7F3EA]">
              ₪{PRICE_YEARLY_ILS} <span className="text-sm font-bold text-[#C9D0D8]">{t("home.plans.year")}</span>
            </p>
            <ul className="mt-6 space-y-2.5 text-base text-[#E8E2D4]">
              {proItems.map((k) => (
                <li key={k} className="flex gap-2">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[#E24B3A]" />
                  {t(k)}
                </li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <div id="studio" className="relative mx-auto mt-12 max-w-4xl px-3 pb-24 sm:mt-16 sm:px-4 safe-pb">
        <div className="agency-board overflow-hidden p-0">
          <WizardFlow key={wizardKey} embedded />
        </div>
      </div>
    </div>
  );
}
