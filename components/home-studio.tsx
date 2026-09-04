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
import { AgencyAtmosphere, AgencyHeroStill } from "@/components/agency-atmosphere";
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
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(16,42,67,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(16,42,67,0.045)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_78%)]"
      />
      <section className="relative mx-auto max-w-5xl px-4 pb-6 pt-10 sm:pt-14">
        <AgencyHeroStill className="mb-8" alt="" />
        <p className="mb-3 text-center text-sm font-bold uppercase tracking-[0.32em] text-gold">
          {t("home.kicker")}
        </p>
        <div className="agency-rule mb-6" />
        <h1 className="text-center text-4xl font-black leading-[1.12] tracking-tight text-navy sm:text-6xl">
          {t("home.headline")}
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-center text-lg font-semibold leading-relaxed text-navy sm:text-xl">
          {t("home.pitch")}
        </p>
        <p className="mx-auto mt-3 max-w-xl rounded-full border border-gold/40 bg-gold/15 px-4 py-2 text-center text-sm font-black text-navy">
          {t("home.vertex")}
        </p>
        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap">
          <Button type="button" size="lg" className="px-8 text-base font-black" onClick={startEmpty}>
            {t("cta.new")}
          </Button>
          <Button asChild size="lg" variant="gold">
            <LangLink href="/pricing">{t("home.cta.pricing")}</LangLink>
          </Button>
          <Button asChild size="lg" variant="outline">
            <LangLink href="/login">{t("nav.login")}</LangLink>
          </Button>
          <Button
            type="button"
            size="lg"
            variant="ghost"
            data-demo="pediatric"
            className="h-auto max-w-full whitespace-normal px-5 text-sm font-bold text-muted"
            onClick={runDemo}
          >
            {DEMO_LABEL[locale]}
          </Button>
        </div>
        <p className="mx-auto mt-2 max-w-md text-center text-sm text-muted">{t("cta.newHint")}</p>
        <p className="mx-auto mt-4 max-w-xl text-center text-sm text-muted">{t("home.truth")}</p>
        <PwaInstallHint />
      </section>
      <AgencyAtmosphere className="mb-8" caption={t("home.atmosphere")} />
      <FunctionRail />
      <section className="relative mx-auto max-w-5xl px-4">
        <ul className="mx-auto mt-4 grid max-w-3xl grid-cols-2 gap-2 sm:grid-cols-4">
          {stats.map((s) => (
            <li
              key={s.label}
              className="agency-frame flex items-center justify-center gap-2 px-3 py-3 text-center text-sm font-bold text-navy"
            >
              <s.icon className="size-3.5 shrink-0 text-gold" />
              {s.label}
            </li>
          ))}
        </ul>
      </section>

      <ol className="relative mx-auto mt-8 grid max-w-4xl gap-3 px-4 sm:grid-cols-2 lg:grid-cols-4">
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
            <li
              key={title}
              className="agency-paper rounded-[22px] p-5 text-start"
            >
              <p className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.2em] text-gold">
                <Icon className="size-3.5" />
                {t("home.how.title")} · 0{i + 1}
              </p>
              <p className="mt-2 text-lg font-black text-navy">{t(title)}</p>
              <p className="mt-1 text-sm text-muted">{t(body)}</p>
            </li>
          );
        })}
      </ol>

      <section className="relative mx-auto mt-10 max-w-4xl px-4">
        <h2 className="text-center text-2xl font-black text-navy">{t("home.vs.title")}</h2>
        <ul className="mt-4 grid gap-3 md:grid-cols-3">
          <li className="agency-paper rounded-[22px] p-5 text-start">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-muted">Canva</p>
            <p className="mt-2 text-sm text-navy">{t("home.vs.canva")}</p>
          </li>
          <li className="agency-paper rounded-[22px] p-5 text-start">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-muted">AdCreative · Predis</p>
            <p className="mt-2 text-sm text-navy">{t("home.vs.adcreative")}</p>
          </li>
          <li className="agency-frame p-5 text-start">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-gold">SAWEK</p>
            <p className="mt-2 text-sm font-semibold text-navy">{t("home.vs.sawek")}</p>
          </li>
        </ul>
      </section>

      <section className="relative mx-auto mt-10 max-w-4xl px-4">
        <h2 className="text-center text-2xl font-black text-navy">{t("home.plans.title")}</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <article className="agency-paper rounded-[22px] p-6 text-start">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-gold">{t("pricing.freeName")}</p>
            <p className="mt-1 text-3xl font-black text-navy">{t("pricing.freePrice")}</p>
            <p className="text-sm text-muted">{t("pricing.freeForever")}</p>
            <ul className="mt-4 space-y-1.5 text-sm text-navy">
              {freeItems.map((k) => (
                <li key={k}>• {t(k)}</li>
              ))}
            </ul>
          </article>
          <article className="agency-frame p-6 text-start">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-gold">{t("pricing.proName")}</p>
            <p className="mt-1 text-3xl font-black text-navy">
              ₪{PRICE_MONTHLY_ILS} <span className="text-base font-bold text-muted">{t("home.plans.month")}</span>
            </p>
            <p className="text-lg font-black text-navy">
              ₪{PRICE_YEARLY_ILS} <span className="text-sm font-bold text-muted">{t("home.plans.year")}</span>
            </p>
            <ul className="mt-4 space-y-1.5 text-sm text-navy">
              {proItems.map((k) => (
                <li key={k}>• {t(k)}</li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <div id="studio" className="relative mx-auto mt-10 max-w-4xl px-3 pb-16 sm:px-4">
        <div className="agency-frame p-[3px]">
          <div className="agency-paper rounded-[20px]">
            <WizardFlow key={wizardKey} embedded />
          </div>
        </div>
      </div>
    </div>
  );
}
