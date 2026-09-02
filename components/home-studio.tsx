"use client";

import { useEffect, useState } from "react";
import { ShieldAlert, Sparkles, Languages, Workflow } from "lucide-react";
import { WizardFlow } from "@/components/wizard-flow";
import { useI18n } from "@/components/i18n-provider";
import { DEMO_LABEL } from "@/lib/demo";
import { startPediatricDemoFlow } from "@/lib/start-pediatric-demo";
import { markEmptyCampaign, EMPTY_CAMPAIGN_EVENT } from "@/lib/empty-campaign";
import { Button } from "@/components/ui/button";
import { FunctionRail } from "@/components/function-rail";

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

  return (
    <div className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(27,42,74,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(27,42,74,0.04)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_78%)]"
      />
      <section className="relative mx-auto max-w-5xl px-4 pb-4 pt-8 sm:pt-12">
        <p className="mb-3 text-center text-sm font-bold uppercase tracking-[0.28em] text-gold">
          {t("home.kicker")}
        </p>
        <h1 className="text-center text-4xl font-black leading-[1.1] tracking-tight text-navy sm:text-6xl">
          {t("hero.titlePrefix")}{" "}
          <span className="relative inline-block rounded-md bg-gold px-2.5 text-navy">
            {t("hero.conquer")}
            <span className="absolute inset-x-1 -bottom-1 h-1 rounded-full bg-navy/80" />
          </span>{" "}
          {t("hero.titleSuffix")}
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-center text-base text-muted sm:text-lg">
          {t("home.pitch")}
        </p>
        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button
            type="button"
            size="lg"
            data-demo="pediatric"
            className="h-auto max-w-full whitespace-normal px-7 py-3 text-base font-black"
            onClick={runDemo}
          >
            {DEMO_LABEL[locale]}
          </Button>
          <Button type="button" size="lg" onClick={startEmpty}>
            {t("cta.new")}
          </Button>
        </div>
        <p className="mx-auto mt-2 max-w-md text-center text-sm text-muted">{t("cta.newHint")}</p>
        <p className="mx-auto mt-4 max-w-xl text-center text-sm text-muted">{t("home.truth")}</p>
      </section>
      <FunctionRail />
      <section className="relative mx-auto max-w-5xl px-4">
        <ul className="mx-auto mt-4 grid max-w-3xl grid-cols-2 gap-2 sm:grid-cols-4">
          {stats.map((s) => (
            <li
              key={s.label}
              className="flex items-center justify-center gap-2 rounded-[22px] border border-navy/10 bg-white px-3 py-3 text-center text-sm font-bold text-navy shadow-[0_8px_24px_rgba(27,42,74,0.06)]"
            >
              <s.icon className="size-3.5 shrink-0 text-gold" />
              {s.label}
            </li>
          ))}
        </ul>
      </section>

      <div id="studio" className="relative mx-auto max-w-4xl px-3 pb-8 sm:px-4">
        <div className="rounded-[28px] border border-navy/10 bg-white p-[1px] shadow-[0_18px_50px_rgba(27,42,74,0.08)]">
          <div className="rounded-[26px] border border-gold/25 bg-white">
            <WizardFlow key={wizardKey} embedded />
          </div>
        </div>
      </div>

      <ol className="relative mx-auto mt-4 grid max-w-4xl gap-3 px-4 pb-16 sm:grid-cols-2 lg:grid-cols-4">
        {(
          [
            ["home.how.1", "home.how.1b"],
            ["home.how.2", "home.how.2b"],
            ["home.how.3", "home.how.3b"],
            ["home.how.4", "home.how.4b"],
          ] as const
        ).map(([title, body], i) => (
          <li
            key={title}
            className="rounded-[22px] border border-navy/10 bg-white p-4 text-start shadow-[0_8px_24px_rgba(27,42,74,0.06)]"
          >
            <p className="text-sm font-black uppercase tracking-[0.2em] text-gold">
              {t("home.how.title")} · 0{i + 1}
            </p>
            <p className="mt-2 text-lg font-black text-navy">{t(title)}</p>
            <p className="mt-1 text-sm text-muted">{t(body)}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
