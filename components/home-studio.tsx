"use client";

import { useState } from "react";
import { ShieldAlert, Sparkles, Languages, Workflow } from "lucide-react";
import { WizardFlow } from "@/components/wizard-flow";
import { useI18n } from "@/components/i18n-provider";
import { DEMO_LABEL } from "@/lib/demo";
import { startPediatricDemoFlow } from "@/lib/start-pediatric-demo";
import { markEmptyCampaign } from "@/lib/empty-campaign";
import { Button } from "@/components/ui/button";

export function HomeStudio() {
  const { t, locale } = useI18n();
  const [wizardKey, setWizardKey] = useState(0);

  function runDemo() {
    startPediatricDemoFlow();
  }

  function startEmpty() {
    markEmptyCampaign();
    setWizardKey((k) => k + 1);
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
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,229,0,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,229,0,0.035)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_at_center,black_35%,transparent_75%)]"
      />
      <section className="relative mx-auto max-w-5xl px-4 pb-4 pt-8 sm:pt-12">
        <p className="mb-3 text-center text-[11px] font-bold uppercase tracking-[0.28em] text-omni-red">
          {t("home.kicker")}
        </p>
        <h1 className="text-center text-4xl font-black leading-[1.1] tracking-tight text-white sm:text-6xl">
          {t("hero.titlePrefix")}{" "}
          <span className="relative inline-block rounded-md bg-omni-yellow px-2.5 text-black">
            {t("hero.conquer")}
            <span className="absolute inset-x-1 -bottom-1 h-1.5 rounded-full bg-omni-red" />
          </span>{" "}
          {t("hero.titleSuffix")}
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-center text-base text-zinc-300 sm:text-lg">
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
          <button
            type="button"
            onClick={startEmpty}
            className="rounded-xl border border-omni-yellow/50 px-5 py-3 text-sm font-semibold text-omni-yellow hover:bg-omni-yellow/10"
          >
            {t("home.startEmpty")}
          </button>
        </div>
        <p className="mx-auto mt-4 max-w-xl text-center text-xs text-zinc-500">{t("home.truth")}</p>
        <ul className="mx-auto mt-8 grid max-w-3xl grid-cols-2 gap-2 sm:grid-cols-4">
          {stats.map((s) => (
            <li
              key={s.label}
              className="flex items-center justify-center gap-2 rounded-2xl border border-omni-red/30 bg-black/50 px-3 py-3 text-center text-xs font-bold text-omni-yellow"
            >
              <s.icon className="size-3.5 shrink-0 text-omni-red" />
              {s.label}
            </li>
          ))}
        </ul>
        <ol className="mx-auto mt-10 grid max-w-4xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
              className="rounded-2xl border border-omni-yellow/25 bg-black/60 p-4 text-start"
            >
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-omni-red">
                {t("home.how.title")} · 0{i + 1}
              </p>
              <p className="mt-2 text-lg font-black text-omni-yellow">{t(title)}</p>
              <p className="mt-1 text-sm text-zinc-400">{t(body)}</p>
            </li>
          ))}
        </ol>
      </section>

      <div id="studio" className="relative mx-auto max-w-4xl px-3 pb-16 sm:px-4">
        <div className="rounded-[28px] border border-omni-yellow/35 bg-black/70 p-[1px] shadow-[0_0_80px_rgba(255,26,26,0.22)]">
          <div className="rounded-[26px] border border-omni-red/25 bg-omni-surface/90">
            <WizardFlow key={wizardKey} embedded />
          </div>
        </div>
      </div>
    </div>
  );
}
