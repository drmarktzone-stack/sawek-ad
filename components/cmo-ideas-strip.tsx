"use client";

import type { CmoGapMove, CmoIdeasPack, Locale } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  cmoIdeas?: CmoIdeasPack;
  locale: Locale;
  className?: string;
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
  if (score >= 45) return "bg-gold";
  return "bg-coral";
}

export function CmoIdeasStrip({ cmoIdeas, locale, className }: Props) {
  if (!cmoIdeas?.selected?.length) return null;
  const moves = cmoIdeas.gapPlan?.moves ?? [];

  return (
    <section
      data-cmo-ideas="platforms"
      className={cn("mb-8 rounded-2xl border border-gold/35 bg-white p-5", className)}
    >
      <p className="text-[13px] font-black uppercase tracking-[0.18em] text-gold">{TITLE[locale]}</p>
      <h2 className="mt-1 text-xl font-black text-navy">{LEAD[locale]}</h2>
      <p className="mt-2 text-xs font-semibold text-navy/60">
        {cmoIdeas.planningDisclaimer[locale] || cmoIdeas.planningDisclaimer.en}
      </p>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {cmoIdeas.selected.map((idea) => (
          <article key={idea.id} className="rounded-xl border border-gold/25 bg-cream/40 p-4">
            <p className="inline-flex rounded-full border border-navy/15 bg-navy px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wide text-white">
              {PLATFORM[locale]} · {idea.platform[locale] || idea.platform.he}
            </p>
            <p className="mt-2 text-lg font-black text-navy">{idea.name[locale] || idea.name.he}</p>
            <p className="mt-1 text-[13px] font-semibold text-navy/85">
              {idea.hook[locale] || idea.hook.he}
            </p>
            <p className="mt-2 text-[12px] text-navy/70">
              <span className="font-black">{WHY[locale]}: </span>
              {idea.whyItWins[locale] || idea.whyItWins.he}
            </p>
            <p className="mt-1 text-[12px] text-navy/60">
              <span className="font-black">{ARC[locale]}: </span>
              {idea.narrativeArc[locale] || idea.narrativeArc.he}
            </p>
            <ul className="mt-3 space-y-1.5">
              {idea.scorecard.map((d) => (
                <li key={d.id} title={d.note[locale] || d.note.en}>
                  <div className="flex items-center justify-between gap-2 text-[11px] font-bold text-navy">
                    <span>{(d.label[locale] || d.label.en).split("(")[0].trim()}</span>
                    <span>{d.score}</span>
                  </div>
                  <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-navy/10">
                    <div className={cn("h-full", barColor(d.score))} style={{ width: `${d.score}%` }} />
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] font-black uppercase tracking-wide text-gold">
              {AVG[locale](idea.planningScore)}
            </p>
          </article>
        ))}
      </div>

      {moves.length > 0 ? <GapPlan locale={locale} moves={moves} /> : null}
    </section>
  );
}

function GapPlan({ locale, moves }: { locale: Locale; moves: CmoGapMove[] }) {
  return (
    <div className="mt-5 rounded-xl border border-dashed border-navy/25 bg-[#F7F3EA] p-4">
      <p className="mb-3 text-xs font-black uppercase tracking-wide text-navy">{GAP[locale]}</p>
      <ul className="space-y-2">
        {moves.map((m) => (
          <li key={m.missingField} className="text-[13px] leading-relaxed text-navy/85">
            <span className="font-black text-navy">{fieldLabel(m.missingField, locale)}</span>
            {" — "}
            {m.move[locale] || m.move.he}
          </li>
        ))}
      </ul>
    </div>
  );
}
