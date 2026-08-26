"use client";

import { useI18n } from "@/components/i18n-provider";
import { ConquerHeadline } from "@/components/stepper";

export function AboutPage() {
  const { locale, t } = useI18n();
  const nameBlock =
    locale === "he"
      ? {
          h: "אילן / إعلان — אותו צליל",
          p: "Ilan הוא שם פרטי בעברית (עץ) ו־إعلان בערבית (מודעה / פרסום). אותה הגייה ליהודים ולערבים. זה שם המוצר — לא OmniAd Studio.",
        }
      : locale === "ar"
        ? {
            h: "إعلان / אילן — الصوت نفسه",
            p: "Ilan اسم عبري (شجرة) وإعلان بالعربية (إعلان تجاري). النطق واحد لليهود والعرب. هذا اسم المنتج — ليس OmniAd Studio.",
          }
        : {
            h: "Ilan / אילן / إعلان — same sound",
            p: "Ilan is a Hebrew first name (tree) and i‘lān (إعلان) is Arabic for advertisement. Same pronunciation for Jewish and Arab users. That is the product name — not OmniAd Studio.",
          };

  const blocks =
    locale === "he"
      ? [
          nameBlock,
          {
            h: "מנוע בפנים, לא שם בחזית",
            p: "Ilan הוא אפליקציה שלישית. בפנים: אשף OmniAd (4 שלבים, 6 מודעות, סטודיו עיצוב) וחמשת סוכני AdBrain (קליטה, אבחון HITL, אסטרטגיה, מדיה, אופטימיזציה). המקורות ב-GitHub/Origin/Base44 לא שונו ולא הוחלפו.",
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
            nameBlock,
            {
              h: "المحرك في الداخل، لا الاسم في الواجهة",
              p: "Ilan تطبيق ثالث. في الداخل: معالج OmniAd ووكلاء AdBrain الخمسة. لم نلمس الأصلين على GitHub/Origin/Base44.",
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
            nameBlock,
            {
              h: "Engines inside, not on the door",
              p: "Ilan is a third app. Inside: OmniAd’s 4-step wizard, 6 ads and design studio plus AdBrain’s five agents (intake, HITL diagnosis, strategy, media, optimizer). The original GitHub / Origin / Base44 products are untouched.",
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
      <p className="mb-8 text-center text-sm text-zinc-400">
        Ilan · אילן · إعلان
        <span className="mt-1 block text-xs text-zinc-600">{t("brand.tagline")}</span>
      </p>
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
