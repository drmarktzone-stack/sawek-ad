"use client";

import { useI18n } from "@/components/i18n-provider";
import { ConquerHeadline } from "@/components/stepper";
import { LangLink } from "@/components/lang-link";
import { Button } from "@/components/ui/button";
import { DEMO_LABEL } from "@/lib/demo";
import { startPediatricDemoFlow } from "@/lib/start-pediatric-demo";
import { AgencyAtmosphere } from "@/components/agency-atmosphere";

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
          p: "כל עסק מקומי — חנות, מסעדה, סטודיו, שירות, בית ספר או מרפאה — שרוצה קמפיין מוכן בעברית וערבית בלי סוכנות מלאה.",
        }
      : locale === "ar"
        ? {
            h: "لمين؟",
            p: "أي شغل محلي — محل، مطعم، ستوديو، خدمة، مدرسة أو عيادة — بدهم حملة جاهزة بالعبري والعربي بدون وكالة كاملة.",
          }
        : {
            h: "Who is it for?",
            p: "Any local business — a shop, restaurant, studio, service, school, or clinic — that wants a ready campaign in Hebrew and Arabic without a full agency.",
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
    <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <p className="mb-2 text-center text-sm font-bold uppercase tracking-[0.32em] text-gold">
        SAWEK AD
      </p>
      <div className="agency-rule mb-6" />
      <ConquerHeadline subtitle={t("about.title")} />
      <p className="mb-2 text-center text-sm text-muted">
        {locale === "ar" ? t("brand.name") : "SAWEK AD · סאווק · سوِّق إعلانك بنفسك"}
        <span className="mt-1 block text-xs text-muted">{t("brand.tagline")}</span>
      </p>
      <p className="mb-10 text-center text-lg leading-relaxed text-navy">
        {locale === "he"
          ? "SAWEK AD הופך קישור לאתר לקמפיין מוכן: ביקורת, מודעות, תמונות והורדה — לכל עסק מקומי."
          : locale === "ar"
            ? "SAWEK AD بحوّل رابط الموقع لحملة جاهزة: تدقيق، إعلانات، صور وتحميل — لأي شغل محلي."
            : "SAWEK AD turns a website URL into a ready campaign: audit, ads, images, and download — for any local business."}
      </p>

      <div className="mb-6 flex flex-wrap items-center justify-center gap-3">
        <Button asChild size="lg">
          <LangLink href="/">{locale === "he" ? "התחילו בקמפיין" : locale === "ar" ? "ابدأوا حملة" : "Start a campaign"}</LangLink>
        </Button>
        <Button asChild size="lg" variant="outline">
          <LangLink href="/login">{t("nav.login")}</LangLink>
        </Button>
        <Button asChild size="lg" variant="gold">
          <LangLink href="/pricing">{t("home.cta.pricing")}</LangLink>
        </Button>
        <Button type="button" size="lg" variant="ghost" onClick={() => startPediatricDemoFlow(locale)}>
          {DEMO_LABEL[locale]}
        </Button>
      </div>
      <AgencyAtmosphere className="mb-10" caption={t("home.atmosphere")} />

      <div className="space-y-5">
        {steps.map((b) => (
          <article key={b.h} className="agency-paper rounded-[24px] p-6 sm:p-7">
            <h2 className="mb-3 text-xl font-black text-navy">{b.h}</h2>
            <p className="text-base leading-relaxed text-navy">{b.p}</p>
          </article>
        ))}

        <article className="agency-paper rounded-[24px] p-6 sm:p-7">
          <h2 className="mb-3 text-xl font-black text-navy">{who.h}</h2>
          <p className="text-base leading-relaxed text-navy">{who.p}</p>
        </article>

        <article className="agency-paper rounded-[24px] p-6 sm:p-7">
          <h2 className="mb-3 text-xl font-black text-navy">{plans.h}</h2>
          <p className="text-base leading-relaxed text-navy">{plans.free}</p>
          <p className="mt-3 text-base leading-relaxed text-navy">{plans.pro}</p>
        </article>

        <article className="agency-paper rounded-[24px] p-6 sm:p-7">
          <h2 className="mb-3 text-xl font-black text-navy">{notYet.h}</h2>
          <ul className="list-disc space-y-2 pe-5 text-base leading-relaxed text-navy">
            {notYet.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </div>
    </div>
  );
}
