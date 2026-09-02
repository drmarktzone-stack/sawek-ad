"use client";

import { Sparkles } from "lucide-react";
import type { CoachReport, CoachStage } from "@/lib/types";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STAGE_KEY: Record<CoachStage, "coach.stage.business" | "coach.stage.details" | "coach.stage.offer" | "coach.stage.channels" | "coach.stage.creative"> = {
  wizard_business: "coach.stage.business",
  wizard_details: "coach.stage.details",
  offer: "coach.stage.offer",
  channels: "coach.stage.channels",
  creative: "coach.stage.creative",
};

export function CoachPanel({
  report,
  onApply,
}: {
  report: CoachReport;
  onApply: (field: string, value: string) => void;
}) {
  const { t, locale } = useI18n();
  const critiques = report.critiques.slice(0, 4);
  const safe = report.suggestions.filter((s) => s.applySafe && s.proposed[locale]?.trim());
  const strategies = report.strategies.slice(0, 3);

  return (
    <section
      data-coach="panel"
      className="mb-6 rounded-2xl border border-omni-yellow/30 bg-white p-4 sm:p-5"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-omni-yellow" />
          <p className="text-xs font-black uppercase tracking-[0.16em] text-omni-yellow">
            {t("coach.title")}
          </p>
        </div>
        <div className="flex items-baseline gap-2">
          <p className="text-3xl font-black text-omni-yellow" data-coach="score">
            {report.score}
          </p>
          <p className="text-sm text-muted">/100 · {t("coach.scoreHint")}</p>
        </div>
      </div>

      {critiques.length > 0 && (
        <ul className="mb-4 space-y-2">
          {critiques.map((c, i) => (
            <li key={`${c.stage}-${i}`} className="rounded-xl border border-navy/10 bg-background px-3 py-2">
              <p className="text-sm font-bold uppercase tracking-wide text-omni-yellow">
                {t(STAGE_KEY[c.stage])}
              </p>
              <p className="mt-1 text-sm text-foreground">{c.finding[locale]}</p>
              <p className="mt-1 text-xs text-muted">{c.why[locale]}</p>
            </li>
          ))}
        </ul>
      )}

      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        {strategies.map((s) => (
          <article key={s.id} className="rounded-xl border border-omni-yellow/20 bg-background p-3">
            <p className="text-xs font-black text-omni-yellow">{s.title[locale]}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">{s.body[locale]}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">{s.plan7[locale]}</p>
          </article>
        ))}
      </div>

      {safe.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">
            {t("coach.suggestions")}
          </p>
          <div className="flex flex-wrap gap-2">
            {safe.map((s) => (
              <div
                key={`${s.field}-${s.proposed.he.slice(0, 24)}`}
                className="flex max-w-full items-center gap-2 rounded-full border border-navy/15 bg-navy/5 py-1 ps-3 pe-1"
              >
                <span className="truncate text-xs text-foreground" title={s.reason[locale]}>
                  {s.proposed[locale]}
                </span>
                <Button
                  type="button"
                  size="sm"
                  className="h-7 shrink-0 rounded-full px-2.5 text-sm"
                  onClick={() => onApply(s.field, s.proposed[locale])}
                >
                  {t("coach.apply")}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className={cn("mt-3 text-sm text-muted")}>{t("coach.optional")}</p>
    </section>
  );
}

export function CoachImprovedStrip({
  report,
  locale,
}: {
  report: CoachReport;
  locale: "he" | "ar" | "en";
}) {
  const { t } = useI18n();
  const angles = report.anglesUsed.slice(0, 6);
  return (
    <div
      data-coach="improved"
      className="mb-8 rounded-2xl border border-omni-yellow/30 bg-omni-yellow/5 p-5"
    >
      <p className="text-xs font-black uppercase tracking-[0.18em] text-omni-yellow">
        {t("coach.improved")}
      </p>
      <p className="mt-1 text-2xl font-black text-omni-yellow">{report.score}/100</p>
      <ul className="mt-3 list-disc space-y-1 ps-5 text-sm text-muted">
        {angles.map((a, i) => (
          <li key={i}>{a[locale]}</li>
        ))}
        {report.strategies.slice(0, 3).map((s) => (
          <li key={s.id}>{s.title[locale]} — {s.body[locale]}</li>
        ))}
      </ul>
    </div>
  );
}
