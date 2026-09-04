"use client";

import { useEffect, useState } from "react";
import { Download, Images, Languages, Link2, Search, ShieldAlert, Sparkles, Workflow } from "lucide-react";
import { WizardFlow } from "@/components/wizard-flow";
import { useI18n } from "@/components/i18n-provider";
import { DEMO_LABEL } from "@/lib/demo";
import { startPediatricDemoFlow } from "@/lib/start-pediatric-demo";
import { markEmptyCampaign, EMPTY_CAMPAIGN_EVENT } from "@/lib/empty-campaign";
import { Button } from "@/components/ui/button";
import { PwaInstallHint } from "@/components/pwa-install-hint";
import { FunctionRail } from "@/components/function-rail";
import { LangLink } from "@/components/lang-link";
import { PRICE_MONTHLY_ILS, PRICE_YEARLY_ILS } from "@/lib/plan";

export function HomeStudio() {
  const { t, locale } = useI18n();
  const [wizardKey, setWizardKey] = useState(0);

  useEffect(() => {
    const onEmpty = () => setWizardKey((k) => k + 1);
    window.addEventListener(EMPTY_CAMPAIGN_EVENT, onEmpty);
    return () => window.removeEventListener(EMPTY_CAMPAIGN_EVENT, onEmpty);
  }, []);

  function runDemo() {
    startPediatricDemoFlow(locale);
  }

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
  const freeItems = ["pricing.f1", "pricing.f2", "pricing.f3", "pricing.f4", "pricing.f5"] as const;
  const proItems = ["pricing.p1", "pricing.p2", "pricing.p3", "pricing.p4", "pricing.p5"] as const;

  return (
    <div className="relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[480px] agency-hero-glow" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] opacity-80"
        style={{ backgroundImage: "url(/textures/hero-arc.svg)", backgroundSize: "cover", backgroundPosition: "center top" }}
      />
      <div aria-hidden className="agency-grain absolute inset-0" />

      <section className="relative mx-auto max-w-5xl px-4 pb-6 pt-10 sm:pt-14">
        <p className="agency-kicker mb-4 text-center">{t("home.kicker")}</p>
        <h1 className="agency-display agency-fade-up mx-auto max-w-4xl text-center text-4xl sm:text-6xl">
          {t("home.headline")}
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-center text-lg font-semibold leading-relaxed text-navy/85 sm:text-xl">
          {t("home.pitch")}
        </p>
        <p className="mx-auto mt-4 max-w-xl rounded-full border border-gold/35 bg-white/70 px-5 py-2.5 text-center text-sm font-black text-navy shadow-[0_8px_24px_rgba(27,42,74,0.06)] backdrop-blur-sm">
          {t("home.vertex")}
        </p>

        <div className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <Button
            type="button"
            size="lg"
            variant="gold"
            data-demo="clinic"
            className="h-auto min-h-14 max-w-full whitespace-normal px-8 py-3.5 text-lg font-black"
            onClick={runDemo}
          >
            {DEMO_LABEL[locale]}
          </Button>
          <Button type="button" size="lg" className="text-lg font-black" onClick={startEmpty}>
            {t("cta.new")}
          </Button>
          <Button asChild size="lg" variant="outline" className="text-lg font-black">
            <LangLink href="/pricing">{t("home.cta.pricing")}</LangLink>
          </Button>
        </div>
        <p className="mx-auto mt-3 max-w-md text-center text-sm text-muted">{t("cta.newHint")}</p>
        <p className="mx-auto mt-5 max-w-xl text-center text-sm leading-relaxed text-muted">{t("home.truth")}</p>
        <div className="mt-4 flex justify-center">
          <Button asChild variant="ghost" size="sm">
            <LangLink href="/login">{t("nav.login")}</LangLink>
          </Button>
        </div>
        <PwaInstallHint />
      </section>

      <FunctionRail />

      <section className="relative mx-auto max-w-5xl px-4">
        <ul className="mx-auto mt-6 grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((s) => (
            <li
              key={s.label}
              className="agency-shell flex items-center justify-center gap-2 px-3 py-4 text-center text-sm font-bold text-navy"
            >
              <s.icon className="size-4 shrink-0 text-gold" />
              {s.label}
            </li>
          ))}
        </ul>
      </section>

      <ol className="relative mx-auto mt-10 grid max-w-5xl gap-4 px-4 sm:grid-cols-2 lg:grid-cols-4">
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
            <li key={title} className="agency-shell p-5 text-start">
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-gold">
                <Icon className="size-3.5" />
                {t("home.how.title")} · 0{i + 1}
              </p>
              <p className="mt-3 text-xl font-black text-navy">{t(title)}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted">{t(body)}</p>
            </li>
          );
        })}
      </ol>

      <section className="relative mx-auto mt-12 max-w-5xl px-4">
        <h2 className="agency-display text-center text-3xl sm:text-4xl">{t("home.vs.title")}</h2>
        <ul className="mt-6 grid gap-4 md:grid-cols-3">
          <li className="agency-shell p-5 text-start">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-muted">Canva</p>
            <p className="mt-3 text-base text-navy">{t("home.vs.canva")}</p>
          </li>
          <li className="agency-shell p-5 text-start">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-muted">AdCreative · Predis</p>
            <p className="mt-3 text-base text-navy">{t("home.vs.adcreative")}</p>
          </li>
          <li className="agency-shell border-gold/45 p-5 text-start ring-1 ring-gold/30">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-gold">SAWEK</p>
            <p className="mt-3 text-base font-semibold text-navy">{t("home.vs.sawek")}</p>
          </li>
        </ul>
      </section>

      <section className="relative mx-auto mt-12 max-w-5xl px-4">
        <h2 className="agency-display text-center text-3xl sm:text-4xl">{t("home.plans.title")}</h2>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <article className="agency-shell p-6 text-start">
            <p className="agency-kicker">{t("pricing.freeName")}</p>
            <p className="mt-2 text-4xl font-black text-navy">{t("pricing.freePrice")}</p>
            <p className="text-sm text-muted">{t("pricing.freeForever")}</p>
            <ul className="mt-5 space-y-2 text-base text-navy">
              {freeItems.map((k) => (
                <li key={k}>• {t(k)}</li>
              ))}
            </ul>
          </article>
          <article className="agency-shell border-gold/50 p-6 text-start ring-1 ring-gold/35">
            <p className="agency-kicker">{t("pricing.proName")}</p>
            <p className="mt-2 text-4xl font-black text-navy">
              ₪{PRICE_MONTHLY_ILS}{" "}
              <span className="text-base font-bold text-muted">{t("home.plans.month")}</span>
            </p>
            <p className="text-xl font-black text-navy">
              ₪{PRICE_YEARLY_ILS} <span className="text-sm font-bold text-muted">{t("home.plans.year")}</span>
            </p>
            <ul className="mt-5 space-y-2 text-base text-navy">
              {proItems.map((k) => (
                <li key={k}>• {t(k)}</li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <div id="studio" className="relative mx-auto mt-12 max-w-4xl px-3 pb-20 sm:px-4">
        <div className="rounded-[32px] border border-navy/10 bg-white/80 p-[1px] shadow-[0_24px_70px_rgba(27,42,74,0.1)] backdrop-blur-sm">
          <div className="rounded-[30px] border border-gold/30 bg-[#FFFCF7]">
            <WizardFlow key={wizardKey} embedded />
          </div>
        </div>
      </div>
    </div>
  );
}
