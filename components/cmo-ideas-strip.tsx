"use client";

import type { CmoIdeasPack, Locale } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  cmoIdeas?: CmoIdeasPack;
  locale: Locale;
  className?: string;
};

const FIELD_LABEL: Record<string, Record<Locale, string>> = {
  businessName: { he: "שם העסק", ar: "اسم المحل", en: "Business name" },
  location: { he: "מיקום", ar: "الموقع", en: "Location" },
  clinicHours: { he: "שעות", ar: "الساعات", en: "Hours" },
  "whatsapp|website": { he: "וואטסאפ / אתר", ar: "واتساب / موقع", en: "WhatsApp / site" },
  offer: { he: "הצעה", ar: "العرض", en: "Offer" },
  uniqueAdvantage: { he: "יתרון", ar: "الميزة", en: "Advantage" },
  biggestProblem: { he: "בעיה", ar: "المشكلة", en: "Problem" },
  audience: { he: "קהל", ar: "الجمهور", en: "Audience" },
  mediaAssets: { he: "תמונות", ar: "صور", en: "Photos" },
  monthlyBudget: { he: "תקציב", ar: "الميزانية", en: "Budget" },
  targetCac: { he: "CAC יעד", ar: "CAC المستهدف", en: "Target CAC" },
  competitors: { he: "מתחרים", ar: "منافسون", en: "Competitors" },
};

function fieldLabel(id: string, locale: Locale): string {
  return FIELD_LABEL[id]?.[locale] || id;
}

export function CmoIdeasStrip({ cmoIdeas, locale, className }: Props) {
  if (!cmoIdeas?.selected?.length) return null;
  const title =
    locale === "he"
      ? "פלטפורמות רעיון CMO · כרטיס תכנון"
      : locale === "ar"
        ? "منصات فكرة CMO · بطاقة تخطيط"
        : "CMO idea platforms · planning scorecard";
  const gapTitle =
    locale === "he"
      ? "פיצוי פערי קליטה — מה לצלם / איזו זווית / מערכת גרפית"
      : locale === "ar"
        ? "تعويض فجوات البيانات — ماذا تصوّروا / أي زاوية / نظام غرافيك"
        : "Gap compensation — what to film / which angle / graphic system";
  const planningBadge =
    locale === "he"
      ? "תכנון בלבד — לא ROAS · לא CAC · לא לייקים"
      : locale === "ar"
        ? "تخطيط فقط — ليس ROAS · ولا CAC · ولا إعجابات"
        : "Planning only — not ROAS · not CAC · not likes";

  return (
    <section
      className={cn(
        "mb-6 overflow-hidden rounded-2xl border border-teal/30 bg-gradient-to-br from-white via-cream/50 to-teal/5 p-4 shadow-[0_12px_40px_rgba(15,39,68,0.06)] sm:p-5",
        className,
      )}
    >
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-lg font-black text-navy sm:text-xl">{title}</h2>
        <span className="rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-navy">
          {planningBadge}
        </span>
      </div>
      <p className="mb-4 text-xs font-semibold leading-relaxed text-navy/65 sm:text-sm">
        {cmoIdeas.planningDisclaimer[locale] || cmoIdeas.planningDisclaimer.en}
      </p>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {cmoIdeas.selected.map((idea) => (
          <article
            key={idea.id}
            className="flex flex-col rounded-xl border border-navy/10 bg-white/90 p-3.5 shadow-sm"
          >
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-teal">
              {idea.platform[locale] || idea.platform.he}
            </p>
            <p className="mt-1 text-base font-black text-navy">{idea.name[locale] || idea.name.he}</p>
            <p className="mt-2 text-[13px] font-semibold leading-snug text-navy/85">
              <span className="text-gold">
                {locale === "he" ? "למה זה מנצח: " : locale === "ar" ? "لماذا تفوز: " : "Why it wins: "}
              </span>
              {idea.whyItWins[locale] || idea.whyItWins.he}
            </p>
            <p className="mt-2 text-[12px] leading-snug text-navy/70">
              <span className="font-bold">
                {locale === "he" ? "הוק: " : locale === "ar" ? "خطاف: " : "Hook: "}
              </span>
              {idea.hook[locale] || idea.hook.he}
            </p>
            <p className="mt-1 text-[12px] leading-snug text-navy/60">
              <span className="font-bold">
                {locale === "he" ? "קשת: " : locale === "ar" ? "قوس: " : "Arc: "}
              </span>
              {idea.narrativeArc[locale] || idea.narrativeArc.he}
            </p>
            <div className="mt-3 border-t border-dashed border-navy/10 pt-2">
              <p className="mb-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-navy/50">
                {locale === "he"
                  ? "כרטיס תכנון (מסר / הצעה / פערי הוכחה / ערוץ / גיוון)"
                  : locale === "ar"
                    ? "بطاقة تخطيط (رسالة / عرض / فجوات إثبات / قناة / تنوّع)"
                    : "Planning scorecard (message / offer / proof-gaps / channel / variety)"}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {idea.scorecard.map((d) => (
                  <span
                    key={d.id}
                    className="rounded-full border border-navy/10 bg-cream/60 px-2 py-0.5 text-[11px] font-bold text-navy"
                    title={d.note[locale] || d.note.en}
                  >
                    {(d.label[locale] || d.label.en).split("(")[0].trim()}: {d.score}
                  </span>
                ))}
              </div>
            </div>
            <p className="mt-auto pt-2 text-[11px] font-black uppercase tracking-wide text-gold">
              {locale === "he"
                ? `ממוצע תכנון ${idea.planningScore}/100 — לא מדד ביצועים`
                : locale === "ar"
                  ? `متوسط تخطيط ${idea.planningScore}/100 — ليس أداءً`
                  : `Avg planning ${idea.planningScore}/100 — not a performance metric`}
            </p>
          </article>
        ))}
      </div>
      {cmoIdeas.gapPlan.moves.length > 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-navy/25 bg-white/70 p-3.5">
          <p className="mb-2 text-xs font-black uppercase tracking-wide text-navy/75">{gapTitle}</p>
          <p className="mb-2 text-[11px] font-semibold text-navy/55">
            {locale === "he"
              ? "חסר בקליטה → מה לצלם, איזו זווית, ואיזו מערכת גרפית. בלי מחירים/דירוגים מומצאים."
              : locale === "ar"
                ? "ناقص بالبيانات → ماذا تصوّروا، أي زاوية، وأي نظام غرافيك. بلا أسعار/تقييمات مختلقة."
                : "Missing in intake → what to film, which angle, which graphic system. No invented prices/ratings."}
          </p>
          <ul className="space-y-2">
            {cmoIdeas.gapPlan.moves.slice(0, 8).map((m) => (
              <li
                key={m.missingField}
                className="rounded-lg border border-navy/8 bg-cream/40 px-3 py-2 text-[13px] leading-snug text-navy/85"
              >
                <span className="font-black text-teal">{fieldLabel(m.missingField, locale)}</span>
                <span className="text-navy/40"> → </span>
                {m.move[locale] || m.move.he}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-4 text-xs font-semibold text-navy/55">
          {locale === "he"
            ? "אין פערי קליטה קריטיים — ממשיכים עם העובדות שסופקו."
            : locale === "ar"
              ? "ما في فجوات بيانات حرجة — منكمّل بالحقائق المعطاة."
              : "No critical intake gaps — continue with the facts supplied."}
        </p>
      )}
    </section>
  );
}
