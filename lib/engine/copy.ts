import type { AdVariant, Intake, Locale, VariantKind } from "../types";
import { isNoOffer } from "../no-offer";
import { filled } from "../utils";

const KINDS: VariantKind[] = [
  "strong_offer",
  "very_short",
  "emotional",
  "narrative",
  "direct_sales",
  "unique_advantage",
];

function name(i: Intake) {
  return i.businessName.trim() || "";
}
function who(i: Intake) {
  return i.audience.trim();
}
function pain(i: Intake) {
  return i.biggestProblem.trim();
}
function edge(i: Intake) {
  return i.uniqueAdvantage.trim();
}
function goal(i: Intake) {
  return i.mainGoal.trim();
}
function where(i: Intake) {
  return i.location.trim();
}

function ctaFor(i: Intake, locale: Locale): string {
  const g = goal(i).toLowerCase();
  if (/תור|מועד|book|موعد/.test(g)) {
    return locale === "he" ? "קבעו תור" : locale === "ar" ? "احجزوا موعداً" : "Book an appointment";
  }
  if (/הורד|install|تنزي/.test(g)) {
    return locale === "he" ? "להורדה" : locale === "ar" ? "حمّل التطبيق" : "Download the app";
  }
  if (/מכיר|sale|بيع/.test(g)) {
    return locale === "he" ? "לפרטים ולרכישה" : locale === "ar" ? "للتفاصيل والشراء" : "See details & buy";
  }
  return locale === "he" ? "דברו איתנו" : locale === "ar" ? "تواصلوا معنا" : "Talk to us";
}

function offerPhrase(i: Intake, locale: Locale): string {
  if (isNoOffer(i.offer)) {
    return locale === "he"
      ? "בלי קופון מלאכותי — הערך הוא השירות עצמו."
      : locale === "ar"
        ? "بلا كوبون مصطنع — القيمة هي الخدمة نفسها."
        : "No manufactured coupon — the value is the service itself.";
  }
  return i.offer.trim();
}

function locTail(i: Intake, locale: Locale): string {
  if (!where(i)) return "";
  return locale === "he" ? ` ב${where(i)}` : locale === "ar" ? ` في ${where(i)}` : ` in ${where(i)}`;
}

function fallbackName(i: Intake, locale: Locale) {
  return name(i) || (locale === "he" ? "העסק" : locale === "ar" ? "النشاط" : "the business");
}

function buildOne(i: Intake, kind: VariantKind, locale: Locale): AdVariant {
  const n = fallbackName(i, locale);
  const audience = who(i) || (locale === "he" ? "מי שצריך את זה עכשיו" : locale === "ar" ? "من يحتاجه الآن" : "people who need this now");
  const problem = pain(i) || (locale === "he" ? "הבעיה לא פורטה — לא נמציא כאב" : locale === "ar" ? "المشكلة غير مذكورة — لن نخترع ألماً" : "the problem was not specified — we will not invent one");
  const adv = edge(i) || (locale === "he" ? "היתרון לא פורט" : locale === "ar" ? "الميزة غير مذكورة" : "the advantage was not specified");
  const offer = offerPhrase(i, locale);
  const cta = ctaFor(i, locale);
  const loc = locTail(i, locale);

  if (locale === "he") {
    switch (kind) {
      case "strong_offer":
        return {
          kind, locale, cta,
          headline: isNoOffer(i.offer) ? `${n}: תשובה ברורה ל${audience}` : `${n} — ${i.offer}`,
          primaryText: [
            `אם אתם ${audience}${loc} ואתם חיים את זה: ${problem} — זה בשבילכם.`,
            `מה שמייחד את ${n}: ${adv}.`,
            filled(i.description) ? i.description : "",
            offer,
            `המטרה של הקמפיין: ${goal(i) || "פנייה אמיתית, לא ויראליות ריקה"}.`,
          ].filter(Boolean).join("\n\n"),
        };
      case "very_short":
        return {
          kind, locale, cta,
          headline: `${n}${loc}`,
          primaryText: `${adv}. ${isNoOffer(i.offer) ? "" : i.offer + "."} ${cta}.`.replace(/\s+/g, " ").trim(),
        };
      case "emotional":
        return {
          kind, locale, cta,
          headline: problem.length > 8 ? problem.slice(0, 72) : `לא חייבים להישאר עם זה לבד`,
          primaryText: `יש רגע שבו ${audience} מפסיקים לחפש «עוד אופציה» ורוצים מישהו קבוע.\n\n${n} בנוי סביב ${adv}.\n\n${offer}`,
        };
      case "narrative":
        return {
          kind, locale, cta,
          headline: `איך ${audience} מגיעים אל ${n}`,
          primaryText: `רוב האנשים מתחילים באותו מקום: ${problem}.\n\nהם משווים, דוחים, לפעמים נופלים על הבטחה גדולה מדי.\n\n${n}${loc} עובד אחרת: ${adv}.\n\n${filled(i.description) ? i.description + "\n\n" : ""}${offer}`,
        };
      case "direct_sales":
        return {
          kind, locale, cta,
          headline: `${cta} אצל ${n}`,
          primaryText: `קהל: ${audience}.\nבעיה: ${problem}.\nלמה אנחנו: ${adv}.\n${offer}\n\nבלי סיפור מיותר. אם זה רלוונטי — ${cta}.`,
        };
      case "unique_advantage":
        return {
          kind, locale, cta,
          headline: adv.slice(0, 80),
          primaryText: `לא «הכי טוב בשוק». ספציפית: ${adv}.\n\nל${audience}${loc} זה ההבדל בין עוד מודעה לבין סיבה אמיתית לפנות.\n\n${offer}`,
        };
    }
  }

  if (locale === "ar") {
    switch (kind) {
      case "strong_offer":
        return {
          kind, locale, cta,
          headline: isNoOffer(i.offer) ? `${n}: جواب واضح لـ ${audience}` : `${n} — ${i.offer}`,
          primaryText: [
            `إذا كنتم ${audience}${loc} وتعيشون هذا: ${problem} — فهذا لكم.`,
            `ما يميّز ${n}: ${adv}.`,
            filled(i.description) ? i.description : "",
            offer,
            `هدف الحملة: ${goal(i) || "تواصل حقيقي لا انتشار فارغ"}.`,
          ].filter(Boolean).join("\n\n"),
        };
      case "very_short":
        return {
          kind, locale, cta,
          headline: `${n}${loc}`,
          primaryText: `${adv}. ${isNoOffer(i.offer) ? "" : i.offer + "."} ${cta}.`.replace(/\s+/g, " ").trim(),
        };
      case "emotional":
        return {
          kind, locale, cta,
          headline: problem.length > 8 ? problem.slice(0, 72) : "لا يجب أن تبقوا وحدكم مع هذا",
          primaryText: `هناك لحظة يتوقف فيها ${audience} عن البحث عن «خيار إضافي» ويريدون شخصاً ثابتاً.\n\n${n} مبني حول ${adv}.\n\n${offer}`,
        };
      case "narrative":
        return {
          kind, locale, cta,
          headline: `كيف يصل ${audience} إلى ${n}`,
          primaryText: `يبدأ معظم الناس من المكان نفسه: ${problem}.\n\nيقارنون، يؤجّلون، وأحياناً يسقطون على وعد أكبر من الحقيقة.\n\n${n}${loc} يعمل بشكل مختلف: ${adv}.\n\n${filled(i.description) ? i.description + "\n\n" : ""}${offer}`,
        };
      case "direct_sales":
        return {
          kind, locale, cta,
          headline: `${cta} لدى ${n}`,
          primaryText: `الجمهور: ${audience}.\nالمشكلة: ${problem}.\nلماذا نحن: ${adv}.\n${offer}\n\nبلا قصة زائدة. إذا كان هذا مناسباً — ${cta}.`,
        };
      case "unique_advantage":
        return {
          kind, locale, cta,
          headline: adv.slice(0, 80),
          primaryText: `ليس «الأفضل في السوق». تحديداً: ${adv}.\n\nبالنسبة لـ ${audience}${loc} هذا الفرق بين إعلان إضافي وسبب حقيقي للتواصل.\n\n${offer}`,
        };
    }
  }

  // English
  switch (kind) {
    case "strong_offer":
      return {
        kind, locale, cta,
        headline: isNoOffer(i.offer) ? `${n}: a clear answer for ${audience}` : `${n} — ${i.offer}`,
        primaryText: [
          `If you are ${audience}${loc} and this is your life: ${problem} — this is for you.`,
          `What sets ${n} apart: ${adv}.`,
          filled(i.description) ? i.description : "",
          offer,
          `Campaign goal: ${goal(i) || "a real enquiry, not empty virality"}.`,
        ].filter(Boolean).join("\n\n"),
      };
    case "very_short":
      return {
        kind, locale, cta,
        headline: `${n}${loc}`,
        primaryText: `${adv}. ${isNoOffer(i.offer) ? "" : i.offer + "."} ${cta}.`.replace(/\s+/g, " ").trim(),
      };
    case "emotional":
      return {
        kind, locale, cta,
        headline: problem.length > 8 ? problem.slice(0, 72) : "You don’t have to stay alone with this",
        primaryText: `There is a moment when ${audience} stop shopping for “one more option” and want someone steady.\n\n${n} is built around ${adv}.\n\n${offer}`,
      };
    case "narrative":
      return {
        kind, locale, cta,
        headline: `How ${audience} find ${n}`,
        primaryText: `Most people start in the same place: ${problem}.\n\nThey compare, delay, and sometimes fall for a promise that is too big.\n\n${n}${loc} works differently: ${adv}.\n\n${filled(i.description) ? i.description + "\n\n" : ""}${offer}`,
      };
    case "direct_sales":
      return {
        kind, locale, cta,
        headline: `${cta} at ${n}`,
        primaryText: `Audience: ${audience}.\nProblem: ${problem}.\nWhy us: ${adv}.\n${offer}\n\nNo extra story. If this is relevant — ${cta}.`,
      };
    case "unique_advantage":
      return {
        kind, locale, cta,
        headline: adv.slice(0, 80),
        primaryText: `Not “best in the market”. Specifically: ${adv}.\n\nFor ${audience}${loc} that is the difference between another ad and a real reason to reach out.\n\n${offer}`,
      };
  }
}

export function generateVariants(intake: Intake): AdVariant[] {
  const out: AdVariant[] = [];
  for (const locale of ["he", "ar", "en"] as Locale[]) {
    for (const kind of KINDS) {
      out.push(buildOne(intake, kind, locale));
    }
  }
  return out;
}
