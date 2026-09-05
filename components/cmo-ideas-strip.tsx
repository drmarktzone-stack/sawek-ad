"use client";

import type { CmoGapMove, CmoIdeasPack, Locale } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  cmoIdeas?: CmoIdeasPack;
  locale: Locale;
  className?: string;
  compact?: boolean;
};

const TITLE: Record<Locale, string> = {
  he: "פלטפורמות רעיון CMO + כרטיס תכנון",
  ar: "منصات فكرة CMO + بطاقة تخطيط",
  en: "CMO idea platforms + planning scorecard",
};

const LEAD: Record<Locale, string> = {
  he: "לא תבניות משווק רגיל — כל רעיון הוא פלטפורמת קמפיין עם ציון תכנון (1–100), לא ROAS.",
  ar: "مش قوالب مسوّق عادي — كل فكرة منصة حملة مع علامة تخطيط (1–100)، مش ROAS.",
  en: "Not ordinary-marketer templates — each idea is a campaign platform with a planning score (1–100), never ROAS.",
};

const WHY: Record<Locale, string> = {
  he: "למה זה מנצח",
  ar: "لماذا تفوز",
  en: "Why it wins",
};

const ARC: Record<Locale, string> = {
  he: "קשת עלילה",
  ar: "قوس السرد",
  en: "Narrative arc",
};

const PLATFORM: Record<Locale, string> = {
  he: "פלטפורמה",
  ar: "المنصة",
  en: "Platform",
};

const GAP: Record<Locale, string> = {
  he: "פיצוי פערי קליטה — מה לצלם / לנסח במקום להמציא מספרים",
  ar: "تعويض فجوات البيانات — ماذا تصوّروا / تصيغوا بدل اختراع أرقام",
  en: "Gap compensation — what to film or write instead of inventing numbers",
};

const AVG: Record<Locale, (n: number) => string> = {
  he: (n) => `ציון תכנון ממוצע ${n}/100 — לא ROAS ולא לייקים`,
  ar: (n) => `متوسط تخطيط ${n}/100 — ليس ROAS ولا إعجابات`,
  en: (n) => `Avg planning ${n}/100 — not ROAS, not likes`,
};

const FIELD_LABEL: Record<string, Record<Locale, string>> = {
  businessName: { he: "שם העסק", ar: "اسم المحل", en: "Business name" },
  location: { he: "מיקום", ar: "الموقع", en: "Location" },
  clinicHours: { he: "שעות", ar: "الساعات", en: "Hours" },
  "whatsapp|website": { he: "ערוץ יצירת קשר", ar: "قناة تواصل", en: "Contact channel" },
  offer: { he: "הצעה", ar: "عرض", en: "Offer" },
  uniqueAdvantage: { he: "יתרון", ar: "ميزة", en: "Advantage" },
  biggestProblem: { he: "בעיה", ar: "مشكلة", en: "Problem" },
  audience: { he: "קהל", ar: "جمهور", en: "Audience" },
  mediaAssets: { he: "תמונות", ar: "صور", en: "Photos" },
  monthlyBudget: { he: "תקציב", ar: "ميزانية", en: "Budget" },
  targetCac: { he: "CAC יעד", ar: "CAC مستهدف", en: "Target CAC" },
  competitors: { he: "מתחרים", ar: "منافسون", en: "Competitors" },
};

function fieldLabel(id: string, locale: Locale): string {
  return FIELD_LABEL[id]?.[locale] ?? id;
}

function barColor(score: number): string {
  if (score >= 70) return "bg-teal";
  if (score >= 45) return "bg-sand";
  return "bg-coral";
}

export function CmoIdeasStrip({ cmoIdeas, locale, className, compact }: Props) {
  if (!cmoIdeas?.selected?.length) return null;
  const moves = (cmoIdeas.gapPlan?.moves ?? []).filter((m) => m.priority !== "later");

  return (
    <section
      data-cmo-ideas="platforms"
      className={cn("agency-ink mb-8 p-5 sm:p-7", className)}
    >
      <p className="text-[13px] font-black uppercase tracking-[0.22em] text-[#9FD4C8]">{TITLE[locale]}</p>
      <h2 className="agency-display-cream mt-2 text-2xl sm:text-3xl">{LEAD[locale]}</h2>
      <p className="mt-3 text-sm font-semibold text-[#C9D0D8]">
        {cmoIdeas.planningDisclaimer[locale] || cmoIdeas.planningDisclaimer.en}
      </p>

      <div className={cn("mt-6 grid gap-4", compact ? "grid-cols-1" : "lg:grid-cols-2")}>
        {cmoIdeas.selected.map((idea) => (
          <article key={idea.id} className="rounded-[18px] border border-white/10 bg-white/[0.06] p-5 backdrop-blur-sm">
            <div className="flex items-start justify-between gap-3">
              <p className="inline-flex rounded-[8px] border border-white/15 bg-white/10 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wide text-[#F7F3EA]">
                {PLATFORM[locale]} · {idea.platform[locale] || idea.platform.he}
              </p>
              <div
                className="agency-score grid size-14 shrink-0 place-items-center rounded-full p-[3px]"
                style={{ ["--score" as string]: idea.planningScore }}
              >
                <span className="grid size-full place-items-center rounded-full bg-[#08111F] text-sm font-black text-[#F7F3EA]">
                  {idea.planningScore}
                </span>
              </div>
            </div>
            <p className="agency-display-cream mt-3 text-xl">{idea.name[locale] || idea.name.he}</p>
            <p className="mt-2 text-[15px] font-semibold text-[#F7F3EA]">
              {idea.hook[locale] || idea.hook.he}
            </p>
            <p className="mt-3 text-[13px] text-[#C9D0D8]">
              <span className="font-black text-[#9FD4C8]">{WHY[locale]}: </span>
              {idea.whyItWins[locale] || idea.whyItWins.he}
            </p>
            <p className="mt-1 text-[13px] text-[#C9D0D8]">
              <span className="font-black text-[#9FD4C8]">{ARC[locale]}: </span>
              {idea.narrativeArc[locale] || idea.narrativeArc.he}
            </p>
            <ul className="mt-4 space-y-2">
              {idea.scorecard.map((d) => (
                <li key={d.id} title={d.note[locale] || d.note.en}>
                  <div className="flex items-center justify-between gap-2 text-[12px] font-bold text-[#F7F3EA]">
                    <span>{(d.label[locale] || d.label.en).split("(")[0].trim()}</span>
                    <span>{d.score}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div className={cn("h-full", barColor(d.score))} style={{ width: `${d.score}%` }} />
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[11px] font-black uppercase tracking-wide text-[#C9B896]">
              {AVG[locale](idea.planningScore)}
            </p>
          </article>
        ))}
      </div>

      {!compact && moves.length > 0 ? <GapPlan locale={locale} moves={moves} /> : null}
    </section>
  );
}

function GapPlan({ locale, moves }: { locale: Locale; moves: CmoGapMove[] }) {
  return (
    <div className="mt-6 rounded-[16px] border border-dashed border-white/20 bg-white/5 p-5">
      <p className="mb-3 text-xs font-black uppercase tracking-wide text-[#9FD4C8]">{GAP[locale]}</p>
      <ul className="space-y-2">
        {moves.map((m) => (
          <li key={m.missingField} className="text-[14px] leading-relaxed text-[#E8E2D4]">
            <span className="font-black text-[#F7F3EA]">{fieldLabel(m.missingField, locale)}</span>
            {" — "}
            {m.move[locale] || m.move.he}
          </li>
        ))}
      </ul>
    </div>
  );
}
