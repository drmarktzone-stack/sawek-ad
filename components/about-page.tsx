"use client";

import { useI18n } from "@/components/i18n-provider";
import { ConquerHeadline } from "@/components/stepper";

export function AboutPage() {
  const { locale, t } = useI18n();
  const blocks =
    locale === "he"
      ? [
          {
            h: "איחוד, לא החלפה",
            p: "OmniAd Studio הוא אפליקציה שלישית: אשף OmniAd (4 שלבים, 6 מודעות, סטודיו עיצוב) יחד עם חמשת סוכני AdBrain (קליטה, אבחון HITL, אסטרטגיה, מדיה, אופטימיזציה). המקורות המקוריים לא נגענו בהם.",
          },
          {
            h: "שכבת אמת",
            p: "אין מד לידים בדוי, אין המלצות מומצאות, אין מתחרים שהמערכת בדה. חסר מסומן כחסר. «אין מבצע» הוא ברירת המחדל — לא ייעוץ חינם.",
          },
          {
            h: "שפות שוות",
            p: "עברית, ערבית ואנגלית הן שפות ראשונות. התפריט, האשף והמודעות מתחלפים. RTL כברירת מחדל.",
          },
          {
            h: "בלי APIs חיים",
            p: "תוכניות מטא / גוגל / טיקטוק הן בלופרינט לקנייה ידנית. אין כרטיס אשראי, אין Lovable, אין מפתחות חובה.",
          },
        ]
      : locale === "ar"
        ? [
            {
              h: "اتحاد لا استبدال",
              p: "OmniAd Studio تطبيق ثالث: معالج OmniAd مع وكلاء AdBrain الخمسة. لم نلمس الأصلين.",
            },
            {
              h: "طبقة الحقيقة",
              p: "لا مقياس عملاء مختلق ولا توصيات مختلقة. «لا يوجد عرض» هو الافتراضي.",
            },
            {
              h: "لغات متساوية",
              p: "العبرية والعربية والإنجليزية لغات أولى. RTL افتراضي.",
            },
            {
              h: "بلا واجهات حية",
              p: "خطط ميتا/جوجل/تيك توك للشراء اليدوي فقط. بلا بطاقة ولا مفاتيح إلزامية.",
            },
          ]
        : [
            {
              h: "A union, not a replacement",
              p: "OmniAd Studio is a third app: OmniAd’s 4-step wizard, 6 ads and design studio plus AdBrain’s five agents (intake, HITL diagnosis, strategy, media, optimizer). The original products are untouched.",
            },
            {
              h: "Truth layer",
              p: "No fake lead gauges, no invented testimonials, no hallucinated competitors. Gaps stay gaps. “No offer” is the default — not a free consult.",
            },
            {
              h: "Equal languages",
              p: "Hebrew, Arabic, and English are first-class. Chrome, wizard, and ad pack all switch. RTL is the default.",
            },
            {
              h: "No live ad APIs",
              p: "Meta / Google / TikTok output is a manual-buy blueprint. No credit card, no Lovable, no required keys.",
            },
          ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <ConquerHeadline subtitle={t("about.title")} />
      <div className="space-y-4">
        {blocks.map((b) => (
          <article key={b.h} className="rounded-2xl border border-white/10 bg-omni-card p-5">
            <h2 className="mb-2 text-lg font-black text-omni-yellow">{b.h}</h2>
            <p className="text-sm leading-relaxed text-zinc-300">{b.p}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
