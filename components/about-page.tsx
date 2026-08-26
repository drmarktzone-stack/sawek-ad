"use client";

import { useI18n } from "@/components/i18n-provider";
import { ConquerHeadline } from "@/components/stepper";
import { DepartmentRail } from "@/components/department-shell";

export function AboutPage() {
  const { locale, t } = useI18n();
  const nameBlock =
    locale === "he"
      ? {
          h: "SAWEK AD — סאווק / ساويك",
          p: "SAWEK AD הוא שם המוצר. בסאווק ו־ساويك אפשר לראות את המילה באותיות עבריות וערביות — המותג נשאר SAWEK AD, לא OmniAd Studio.",
        }
      : locale === "ar"
        ? {
            h: "SAWEK AD — ساويك / סאווק",
            p: "SAWEK AD هو اسم المنتج. ساويك وסאווק يظهران الاسم بالحرف العربي والعبري — العلامة تبقى SAWEK AD وليست OmniAd Studio.",
          }
        : {
            h: "SAWEK AD — ساويك / סאווק",
            p: "SAWEK AD is the product name. ساويك and סאווק are optional Arabic and Hebrew wordmarks — the brand stays SAWEK AD, not OmniAd Studio.",
          };

  const blocks =
    locale === "he"
      ? [
          nameBlock,
          {
            h: "מנוע בפנים, לא שם בחזית",
            p: "SAWEK AD הוא אפליקציה שלישית. בפנים: אשף OmniAd (4 שלבים, 6 מודעות, סטודיו עיצוב) וחמישה סוכני Gemini (קליטה, אבחון HITL, אסטרטגיה, מדיה, אופטימיזציה). המקורות OmniAd / AdBrain / OptiBrain לא שונו ולא הוחלפו.",
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
            h: "חברת החזקות, חמישה סוכנים",
            p: "דיסקברי, אסטרטגיה, קריאייטיב, מדיה, לידים ומבצעים, אופס — מחלקות שחמשת סוכני Gemini מייצרים. לא מחליפים אותם בחוקר/קופירייטר/מעצב. מדיה היא PLAN בלבד. לקוח הדגמה ממלא כל שולחן בלחיצה.",
          },
          {
            h: "דלפק OptiBrain",
            p: "15 מודולים בתוך SAWEK AD: אבחון 360, קופת חולים, סימולטור, חטיפה רק מאות שאושר, מכ״ם רוויה, הצעות, טרנדים, אי-הגעה, ציות, ביקורות, תרחיש תשואה, קול, עברית/ערבית/אנגלית, סטודיו, תבניות. אין פיד מתחרים חי. מקור Lovable לא נגענו.",
          },
          {
            h: "בלי APIs חיים",
            p: "תוכניות מטא / גוגל / טיקטוק / יוטיוב הן בלופרינט לקנייה ידנית. אין כרטיס אשראי, אין Lovable, אין מפתחות חובה.",
          },
        ]
      : locale === "ar"
        ? [
            nameBlock,
            {
              h: "المحرك في الداخل، لا الاسم في الواجهة",
              p: "SAWEK AD تطبيق ثالث. في الداخل: معالج OmniAd ووكلاء Gemini الخمسة. لم نلمس أصول OmniAd / AdBrain / OptiBrain.",
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
              h: "شركة قابضة، خمسة وكلاء",
              p: "الاستكشاف والاستراتيجية والإبداع والميديا والعملاء والعروض والتشغيل أقسام يُنتجها وكلاء Gemini الخمسة. الميديا خطة فقط.",
            },
            {
              h: "مكتب OptiBrain",
              p: "15 وحدة داخل SAWEK AD. لا بث منافسين حي. لم نلمس Lovable.",
            },
            {
              h: "بلا واجهات حية",
              p: "خطط ميتا/غوغل/تيك توك/يوتيوب للشراء اليدوي فقط.",
            },
          ]
        : [
            nameBlock,
            {
              h: "Engines inside, not on the door",
              p: "SAWEK AD is a third app. Inside: OmniAd’s 4-step wizard, 6 ads and design studio plus five Gemini agents (intake, HITL diagnosis, strategy, media, optimizer). The original OmniAd, AdBrain, and OptiBrain products are untouched.",
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
              h: "Holding company, five agents",
              p: "Discovery, Strategy, Creative, Media, Leads & promo, and Ops are departments — outputs the same five Gemini agents produce. Media is PLAN only. Demo client one-click fills every desk.",
            },
            {
              h: "OptiBrain desk",
              p: "Fifteen modules inside SAWEK AD: 360 audit, HMO clinic file, simulator, hijack from a confirmed signal only, saturation radar, offers, trends, no-shows, compliance, reviews, return scenarios, voice, HE/AR/EN ads, studio, templates. No live competitor feed. The Lovable original is untouched.",
            },
            {
              h: "No live ad APIs",
              p: "Meta / Google / TikTok / YouTube output is a manual-buy blueprint. No credit card, no Lovable, no required keys.",
            },
          ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <ConquerHeadline subtitle={t("about.title")} />
      <DepartmentRail />
      <p className="mb-8 text-center text-sm text-zinc-400">
        SAWEK AD · סאווק · ساويك
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
