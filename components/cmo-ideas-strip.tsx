"use client";

import type { CmoIdeasPack, Locale } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  cmoIdeas?: CmoIdeasPack;
  locale: Locale;
  className?: string;
};

export function CmoIdeasStrip({ cmoIdeas, locale, className }: Props) {
  if (!cmoIdeas?.selected?.length) return null;
  const title =
    locale === "he"
      ? "רעיונות CMO + כרטיס תכנון"
      : locale === "ar"
        ? "أفكار CMO + بطاقة تخطيط"
        : "CMO ideas + planning scorecard";

  return (
    <section className={cn("mb-6 rounded-2xl border border-navy/10 bg-white p-4", className)}>
      <h2 className="mb-1 text-lg font-black text-navy">{title}</h2>
      <p className="mb-4 text-xs font-semibold text-navy/60">
        {cmoIdeas.planningDisclaimer[locale] || cmoIdeas.planningDisclaimer.en}
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {cmoIdeas.selected.map((idea) => (
          <article key={idea.id} className="rounded-xl border border-gold/25 bg-cream/40 p-3">
            <p className="text-sm font-black text-navy">{idea.name[locale] || idea.name.he}</p>
            <p className="mt-1 text-[13px] font-semibold text-navy/80">
              {locale === "he" ? "למה זה מנצח: " : locale === "ar" ? "لماذا تفوز: " : "Why it wins: "}
              {idea.whyItWins[locale] || idea.whyItWins.he}
            </p>
            <p className="mt-1 text-[12px] text-navy/70">{idea.hook[locale] || idea.hook.he}</p>
            <p className="mt-1 text-[12px] text-navy/60">{idea.narrativeArc[locale] || idea.narrativeArc.he}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {idea.scorecard.map((d) => (
                <span
                  key={d.id}
                  className="rounded-full border border-navy/10 bg-white px-2 py-0.5 text-[11px] font-bold text-navy"
                  title={d.note[locale] || d.note.en}
                >
                  {(d.label[locale] || d.label.en).split("(")[0].trim()}: {d.score}
                </span>
              ))}
            </div>
            <p className="mt-2 text-[11px] font-black uppercase tracking-wide text-gold">
              {locale === "he"
                ? `ציון תכנון ממוצע ${idea.planningScore}/100 — לא ROAS`
                : locale === "ar"
                  ? `متوسط تخطيط ${idea.planningScore}/100 — ليس ROAS`
                  : `Avg planning ${idea.planningScore}/100 — not ROAS`}
            </p>
          </article>
        ))}
      </div>
      {cmoIdeas.gapPlan.moves.length > 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-navy/20 p-3">
          <p className="mb-2 text-xs font-black uppercase tracking-wide text-navy/70">
            {locale === "he" ? "תוכנית פערי קליטה" : locale === "ar" ? "خطة فجوات البيانات" : "Intake gap plan"}
          </p>
          <ul className="space-y-1.5">
            {cmoIdeas.gapPlan.moves.slice(0, 6).map((m) => (
              <li key={m.missingField} className="text-[13px] text-navy/80">
                <span className="font-bold">{m.missingField}</span>
                {" — "}
                {m.move[locale] || m.move.he}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
