"use client";

import type { CmoGapMove, IntakeReport, Locale } from "@/lib/types";
import { CmoIdeasStrip } from "@/components/cmo-ideas-strip";
import { useI18n } from "@/components/i18n-provider";

const FIELD: Record<string, Record<Locale, string>> = {
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
  businessModel: { he: "מודל עסקי", ar: "نموذج العمل", en: "Business model" },
  avgOrderValue: { he: "ערך הזמנה", ar: "قيمة الطلب", en: "Order value" },
  marginPercent: { he: "מרווח", ar: "هامش", en: "Margin" },
  pastAds: { he: "מודעות קודמות", ar: "إعلانات سابقة", en: "Past ads" },
};

type Props = {
  report: IntakeReport;
  moves?: CmoGapMove[];
  locale: Locale;
  compact?: boolean;
};

export function DiagnosisGaps({ report, moves, locale, compact }: Props) {
  const { t } = useI18n();
  const missing = report.missing ?? [];
  const list = moves ?? [];
  const now = list.filter((m) => m.priority !== "later");
  const later = list.filter((m) => m.priority === "later");
  if (!missing.length && !list.length) return null;

  return (
    <div className="mt-4 space-y-3" data-diagnosis="gaps">
      {now.length > 0 ? (
        <div className="agency-board p-5 text-sm text-navy">
          <p className="agency-kicker mb-4">{t("diagnosis.gapsFirst")}</p>
          <ul className="space-y-3">
            {now.map((m) => (
              <li key={m.missingField} className="agency-guidance rounded-[14px] px-3 py-3 leading-relaxed">
                <span className="inline-flex rounded-[8px] bg-ink px-2 py-0.5 text-[11px] font-black text-[#F7F3EA]">
                  {FIELD[m.missingField]?.[locale] ?? m.missingField}
                </span>
                <span className="mt-1.5 block font-semibold text-navy">{m.move[locale] || m.move.he}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {later.length > 0 ? (
        <details className="agency-board p-4 text-sm text-navy">
          <summary className="cursor-pointer text-xs font-black uppercase tracking-wide text-navy/55">
            {t("diagnosis.laterOptional")} · {later.length}
          </summary>
          <ul className="mt-3 space-y-2 text-navy/80">
            {later.map((m) => (
              <li key={m.missingField} className="leading-relaxed">
                <span className="font-black">{FIELD[m.missingField]?.[locale] ?? m.missingField}</span>
                {" — "}
                {m.move[locale] || m.move.he}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      {missing.length > 0 ? (
        <details className="agency-board p-4 text-sm text-navy" open={now.length === 0 && later.length === 0}>
          <summary className="cursor-pointer text-xs font-black uppercase tracking-wide text-navy/70">
            {t("diagnosis.missingCompact")} · {missing.length}
          </summary>
          <div className="mt-3 space-y-1.5">
            {(compact ? missing.slice(0, 6) : missing).map((m) => (
              <p key={m.field}>
                <strong>{m.label[locale]}:</strong> {m.reason[locale]}
              </p>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}

/** Keep CMO platforms visible on the diagnosis step when a pack already has ideas. */
export function DiagnosisCmoStrip({
  cmoIdeas,
  locale,
}: {
  cmoIdeas?: Parameters<typeof CmoIdeasStrip>[0]["cmoIdeas"];
  locale: Locale;
}) {
  return <CmoIdeasStrip cmoIdeas={cmoIdeas} locale={locale} className="mt-4 mb-0" compact />;
}
