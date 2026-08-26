"use client";

import type { CampaignPack, Locale } from "@/lib/types";
import { useI18n } from "@/components/i18n-provider";
import { Card, ProducedBy } from "@/components/department-shell";

export function MediaDeptView({ pack, packLang }: { pack: CampaignPack; packLang: Locale }) {
  const { t, locale } = useI18n();
  const extra = pack.agency!.mediaExtra;
  const l = packLang;

  return (
    <div className="space-y-4">
      <ProducedBy agents={extra.producedBy} />
      <p className="rounded-2xl border border-omni-red/40 bg-red-950/30 p-4 text-sm text-red-100">
        {extra.planOnly[l]}
      </p>
      <Card title={t("media.title")}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {pack.media.split.map((ch) => (
            <article key={ch.channel} className="rounded-xl border border-white/10 p-4">
              <p className="text-xs font-black uppercase text-omni-yellow">{ch.channel}</p>
              <p className="text-2xl font-black">{ch.budgetSharePercent}%</p>
              {ch.monthlyBudget != null && (
                <p className="text-xs text-zinc-400">
                  {ch.monthlyBudget} ₪ / {ch.dailyBudget} ₪ {t("dept.daily")}
                </p>
              )}
              <p className="mt-2 text-sm text-zinc-300">{ch.role[l]}</p>
              <p className="mt-2 text-xs text-zinc-500">{ch.notes[l]}</p>
              {ch.targeting.keywords.length > 0 && (
                <p className="mt-2 text-[11px] text-zinc-500">
                  {t("dept.keywords")}: {ch.targeting.keywords.join(" · ")}
                </p>
              )}
              <p className="mt-1 text-[11px] text-zinc-500">{ch.targeting.placements}</p>
            </article>
          ))}
        </div>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        <Card title={t("dept.audiences")}>
          <p className="text-sm text-zinc-200">{extra.audiences[l]}</p>
        </Card>
        <Card title={t("dept.frequency")}>
          <p className="text-sm text-zinc-200">{extra.frequency[l]}</p>
        </Card>
      </div>
      <Card title={t("dept.placements")}>
        <p className="text-sm text-zinc-300">{extra.placements[l]}</p>
      </Card>
      <Card title={t("dept.abtests")}>
        <div className="grid gap-3 md:grid-cols-2">
          {extra.tests.map((test) => (
            <article key={test.name[l]} className="rounded-xl border border-white/10 p-4">
              <p className="font-black text-white">{test.name[l]}</p>
              <p className="mt-2 text-sm text-zinc-300">A. {test.a[l]}</p>
              <p className="text-sm text-zinc-300">B. {test.b[l]}</p>
              <p className="mt-2 text-xs text-zinc-500">{test.metric[l]}</p>
            </article>
          ))}
        </div>
      </Card>
      <Card title={t("dept.kill")}>
        <ul className="list-disc space-y-1 pe-5 text-sm text-zinc-300">
          {pack.optimizer.killRules.map((r, i) => (
            <li key={i}>{r[l]}</li>
          ))}
        </ul>
        <p className="mt-3 text-xs font-bold uppercase text-omni-yellow">{t("dept.scale")}</p>
        <ul className="mt-1 list-disc space-y-1 pe-5 text-sm text-zinc-300">
          {pack.optimizer.scaleRules.map((r, i) => (
            <li key={i}>{r[l]}</li>
          ))}
        </ul>
      </Card>
      <Card title={t("dept.weekly")}>
        <ol className="space-y-2 text-sm text-zinc-300">
          {extra.weekly.map((w, i) => (
            <li key={i}>{w[l]}</li>
          ))}
        </ol>
      </Card>
      <Card title={t("result.scenario")}>
        {pack.media.scenarioFromUserNumbers ? (
          <>
            <p className="text-sm text-zinc-200">{pack.media.worstCase[locale]}</p>
            <p className="mt-2 text-sm text-zinc-200">{pack.media.realistic[locale]}</p>
          </>
        ) : (
          <p className="text-sm text-zinc-400">{t("result.noScenario")}</p>
        )}
      </Card>
    </div>
  );
}
