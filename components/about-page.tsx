"use client";

import { useI18n } from "@/components/i18n-provider";
import { ConquerHeadline } from "@/components/stepper";
import { LangLink } from "@/components/lang-link";
import { Button } from "@/components/ui/button";
import { DEMO_LABEL } from "@/lib/demo";
import { startPediatricDemoFlow } from "@/lib/start-pediatric-demo";

export function AboutPage() {
  const { locale, t } = useI18n();

  const steps =
    locale === "he"
      ? [
          {
            h: "1. מדביקים קישור לאתר",
            p: "מדביקים את כתובת האתר של העסק. SAWEK שולף שם, טקסט ותמונות שפורסמו — ולא ממציא מחירים, דירוגים או מספרי לקוחות.",
          },
          {
            h: "2. בודקים את הביקורת",
            p: "רואים בדיוק מה יצא מהאתר. אפשר לתקן פרטים חסרים לפני שבונים מודעות.",
          },
          {
            h: "3. מקבלים מודעות ותמונות",
            p: "מודעות לפייסבוק, אינסטגרם, טיקטוק ווואטסאפ — בעברית, ערבית ואנגלית — עם בחירת תמונות מהאתר או כרזות לפי התחום.",
          },
          {
            h: "4. מורידים / לוח / דף נחיתה",
            p: "מורידים PNG, ובמנוי Pro גם ZIP, לוח פרסום ל־7 ימים ודף נחיתה ללקוח.",
          },
        ]
      : locale === "ar"
        ? [
            {
              h: "1. بلزّقوا رابط الموقع",
              p: "بلزّقوا عنوان موقع المحل. SAWEK بطلع الاسم والنص والصور المنشورة — وما بخترع أسعار أو تقييمات أو أعداد زبائن.",
            },
            {
              h: "2. بتراجعوا التدقيق",
              p: "بتشوفوا بالزبط شو طلع من الموقع. فيكن تصلّحوا الناقص قبل ما تبنوا الإعلانات.",
            },
            {
              h: "3. بتاخدوا إعلانات وصور",
              p: "إعلانات لفيسبوك وإنستغرام وتيك توك وواتساب — بالعبري والعربي والإنجليزي — مع اختيار صور من الموقع أو ملصقات حسب المجال.",
            },
            {
              h: "4. تحميل / رزنامة / صفحة هبوط",
              p: "بتحمّلوا PNG، وبالاشتراك Pro كمان ZIP ورزنامة 7 أيام وصفحة هبوط للزبون.",
            },
          ]
        : [
            {
              h: "1. Paste a website URL",
              p: "Paste the business site. SAWEK pulls the published name, text, and photos — it does not invent prices, ratings, or customer counts.",
            },
            {
              h: "2. Review the audit",
              p: "See exactly what came off the site. Fix gaps before ads are built.",
            },
            {
              h: "3. Get ads and images",
              p: "Ads for Facebook, Instagram, TikTok, and WhatsApp — in Hebrew, Arabic, and English — with site photos or field-matched graphics.",
            },
            {
              h: "4. Download / calendar / landing",
              p: "Download PNGs; on Pro also a marketing ZIP, a 7-day posting calendar, and a client landing page.",
            },
          ];

  const who =
    locale === "he"
      ? {
          h: "למי זה?",
          p: "סוכנויות קטנות ועסקים מקומיים — מרפאות, מסעדות, בוטיקים, בריכות, בתי ספר וחנויות — שרוצים קמפיין מוכן בעברית וערבית בלי צוות קריאייטיב מלא.",
        }
      : locale === "ar"
        ? {
            h: "لمين؟",
            p: "وكالات صغيرة ومحلات محلية — عيادات، مطاعم، بوتيكات، مسابح، مدارس ومحلات — بدهم حملة جاهزة بالعبري والعربي بدون فريق إبداعي كامل.",
          }
        : {
            h: "Who is it for?",
            p: "Boutique agencies and local businesses — clinics, restaurants, boutiques, pools, schools, and shops — that want a ready campaign in Hebrew and Arabic without a full creative team.",
          };

  const plans =
    locale === "he"
      ? {
          h: "חינם מול Pro",
          free: "חינם: עסק אחד, קמפיין שמור אחד, סריקת אתר, מודעות עברית/ערבית, והורדת PNG לכל כרטיס.",
          pro: "Pro (₪99/חודש או ₪990/שנה): קמפיינים בלי הגבלה, חבילות תמונת Vertex Imagen, ZIP שיווקי, דף נחיתה ולוח 7 ימים.",
        }
      : locale === "ar"
        ? {
            h: "مجاني مقابل Pro",
            free: "مجاني: شغلة وحدة، حملة محفوظة وحدة، مسح موقع، إعلانات عبرية/عربية، وتحميل PNG لكل بطاقة.",
            pro: "Pro (₪99/شهر أو ₪990/سنة): حملات بلا حد، حزم صور Vertex Imagen، ZIP تسويقي، صفحة هبوط ورزنامة 7 أيام.",
          }
        : {
            h: "Free vs Pro",
            free: "Free: one business, one saved campaign, site scan, HE/AR ads, and a PNG per card.",
            pro: "Pro (₪99/month or ₪990/year): unlimited campaigns, Vertex Imagen packs, marketing ZIP, client landing, and a 7-day calendar.",
          };

  const notYet =
    locale === "he"
      ? {
          h: "מה עדיין לא",
          items: [
            "תשלום Stripe עדיין לא מחובר — אין חיוב מדומה; אפשר PayPal.me / העברה כשהבעלים מפעיל.",
            "פרסום חי למטא / לינקדאין דורש אפליקציות מחוברות — בלי זה SAWEK בונה תוכנית ומודעות להורדה בלבד.",
            "תמונות Vertex Imagen הן במנוי Pro; בחינם יש כרזות גרפיות לפי התחום ותמונות מהאתר.",
          ],
        }
      : locale === "ar"
        ? {
            h: "شو لسا مش جاهز",
            items: [
              "دفع Stripe لسا مش مربوط — ما في خصم وهمي؛ في PayPal.me / حوالة لما المالك يفعّل.",
              "النشر الحي على ميتا / لينكدإن بحتاج تطبيقات مربوطة — بدونها SAWEK بيبني خطة وإعلانات للتحميل بس.",
              "صور Vertex Imagen باشتراك Pro؛ بالمجان في ملصقات حسب المجال وصور من الموقع.",
            ],
          }
        : {
            h: "What it does not do yet",
            items: [
              "Stripe checkout is not connected yet — we will not fake a charge; PayPal.me / bank when the owner enables them.",
              "Live Meta / LinkedIn publish needs connected apps — without them SAWEK builds a plan and downloadable ads only.",
              "Vertex Imagen stills are Pro; Free gets field-matched graphic posters and site photos.",
            ],
          };

  return (
    <div className="relative mx-auto max-w-3xl overflow-hidden px-4 py-12">
      <div aria-hidden className="agency-grain absolute inset-0" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-64 agency-hero-glow" />
      <div className="relative">
        <ConquerHeadline subtitle={t("about.title")} />
        <p className="mb-2 text-center text-sm text-muted">
          {locale === "ar" ? t("brand.name") : "SAWEK AD · סאווק · سوِّق إعلانك بنفسك"}
          <span className="mt-1 block text-xs text-muted">{t("brand.tagline")}</span>
        </p>
        <p className="mb-9 text-center text-lg leading-relaxed text-navy sm:text-xl">
          {locale === "he"
            ? "SAWEK AD הופך קישור לאתר לקמפיין מוכן: ביקורת, מודעות, תמונות והורדה — כמו שולחן עבודה של סוכנות שיווק."
            : locale === "ar"
              ? "SAWEK AD بحوّل رابط الموقع لحملة جاهزة: تدقيق، إعلانات، صور وتحميل — مثل مكتب وكالة تسويق."
              : "SAWEK AD turns a website URL into a ready campaign: audit, ads, images, and download — like a marketing-agency desk."}
        </p>

        <div className="mb-8 flex flex-wrap items-center justify-center gap-3">
          <Button type="button" size="lg" variant="coral" onClick={() => startPediatricDemoFlow(locale)}>
            {DEMO_LABEL[locale]}
          </Button>
          <Button asChild size="lg">
            <LangLink href="/">{t("cta.new")}</LangLink>
          </Button>
          <Button asChild size="lg" variant="outline">
            <LangLink href="/pricing">{t("home.cta.pricing")}</LangLink>
          </Button>
        </div>

        <div className="space-y-4">
          {steps.map((b, i) => {
            const themes = [
              { bg: "bg-[#F3EDE3]", edge: "border-s-[#0F2744]" },
              { bg: "bg-[#E6F4F1]", edge: "border-s-[#1F7A6B]" },
              { bg: "bg-[#EEE8F7]", edge: "border-s-[#6B5B95]" },
              { bg: "bg-[#FCEEE9]", edge: "border-s-[#E07A5F]" },
            ] as const;
            const theme = themes[i % themes.length];
            return (
              <article
                key={b.h}
                className={`rounded-[var(--radius-card)] border border-[var(--line)] border-s-4 ${theme.edge} ${theme.bg} p-6 shadow-[var(--shadow-card)]`}
              >
                <p className="mb-2 text-[0.7rem] font-extrabold uppercase tracking-[0.22em] text-[#1F7A6B] sm:text-xs">
                  {t("home.how.title")} · 0{i + 1}
                </p>
                <h2 className="mb-2 text-xl font-black text-navy">{b.h}</h2>
                <p className="text-base leading-relaxed text-[#5A6B7D]">{b.p}</p>
              </article>
            );
          })}

          <article className="agency-shell p-6">
            <h2 className="mb-2 text-xl font-black text-navy">{who.h}</h2>
            <p className="text-base leading-relaxed text-[#5A6B7D]">{who.p}</p>
          </article>

          <article className="agency-shell p-6">
            <h2 className="mb-2 text-xl font-black text-navy">{plans.h}</h2>
            <p className="text-base leading-relaxed text-[#5A6B7D]">{plans.free}</p>
            <p className="mt-2 text-base leading-relaxed text-[#5A6B7D]">{plans.pro}</p>
          </article>

          <article className="agency-shell p-6">
            <h2 className="mb-2 text-xl font-black text-navy">{notYet.h}</h2>
            <ul className="list-disc space-y-2 pe-5 text-base leading-relaxed text-[#5A6B7D]">
              {notYet.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </div>
      </div>
    </div>
  );
}
