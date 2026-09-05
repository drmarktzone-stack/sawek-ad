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
  if (!missing.length && !list.length) return null;

  return (
    <div className="mt-4 space-y-3">
      {list.length > 0 ? (
        <div className="rounded-xl border border-teal/30 bg-teal/8 p-3 text-sm text-navy">
          <p className="mb-2 text-xs font-black uppercase tracking-wide text-teal">{t("diagnosis.gapsFirst")}</p>
          <ul className="space-y-2">
            {list.map((m) => (
              <li key={m.missingField} className="leading-relaxed">
                <span className="font-black">{FIELD[m.missingField]?.[locale] ?? m.missingField}</span>
                {" — "}
                {m.move[locale] || m.move.he}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {missing.length > 0 ? (
        <details className="rounded-xl border border-navy/15 bg-[#F7F3EA] p-3 text-sm text-navy" open={list.length === 0}>
          <summary className="cursor-pointer text-xs font-black uppercase tracking-wide text-navy/70">
            {t("diagnosis.missingCompact")} · {missing.length}
          </summary>
          <div className="mt-2 space-y-1.5">
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
  return <CmoIdeasStrip cmoIdeas={cmoIdeas} locale={locale} className="mt-4 mb-0" />;
}
