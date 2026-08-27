import type { AdVariant, Intake, Locale, VariantKind } from "../types";
import { isNoOffer } from "../no-offer";
import {
  ADVANTAGE_CHIPS,
  AUDIENCE_CHIPS,
  GOAL_CHIPS,
  OFFER_CHIPS,
  PROBLEM_CHIPS,
  detectKupaAudience,
  resolveChipLabel,
} from "../chips";
import { canonicalDoctorName } from "../demo";

/** Cut on a word boundary. Never slice mid-word (Arabic «وساعات م»). */
export function clipAtWord(text: string, max: number): string {
  const s = text.replace(/\s+/g, " ").trim();
  if (!s) return "";
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const breakAt = Math.max(cut.lastIndexOf(" "), cut.lastIndexOf("،"), cut.lastIndexOf(","), cut.lastIndexOf("–"), cut.lastIndexOf("—"));
  const out = (breakAt >= Math.floor(max * 0.45) ? cut.slice(0, breakAt) : cut).trim();
  return out.replace(/[·,،\-–—:]+$/u, "").trim();
}

const INTERNAL_AR = [
  "لا يعرفون النشاط",
  "اسم النشاط",
  "وصف النشاط",
  "يتوقف فيها",
  "مبني حول",
  "يؤجّلون",
  "يؤجلون",
  "كوبوت",
  "مرضان",
  "جتوا على",
  "أبو موخ",
];

/** Locked preferred Arabic H1 and emotional variant. */
export const LOCKED_AR_H1 = "الولد مريض، جيبوه عالعيادة";

export function isPediatrics(intake: Intake): boolean {
  const blob = `${intake.businessName} ${intake.category} ${intake.description}`;
  return /أطفال|ילדים|pedia|pediatric|סאמר|سامر|Samer Abu Mokh/i.test(blob);
}

export function isWalkIn(intake: Intake): boolean {
  if (intake.mainGoal === "walk_in") return true;
  const blob = [
    intake.clinicHours,
    intake.mainGoal,
    intake.description,
    intake.uniqueAdvantage,
    intake.biggestProblem,
  ]
    .join(" ")
    .toLowerCase();
  return /walk-?in|جت أولاً|جت اولا|بدون مواعيد|للا תור|ללא תור|בלי לקבוע|סדר הגעה|first come|no appointment|no pre-book|بدون موعد/.test(
    blob,
  );
}

export function shortCity(intake: Intake, locale: Locale): string {
  const loc = intake.location.trim();
  if (/باقة|באקה|baqa/i.test(loc)) {
    return locale === "ar" ? "باقة" : locale === "he" ? "באקה" : "Baqa";
  }
  const first = loc.split(/[—–,\n|/]/)[0]?.trim() ?? "";
  return clipAtWord(first, 22);
}

export function shortName(intake: Intake, locale: Locale): string {
  const n = canonicalDoctorName(intake.businessName.trim());
  if (!n) return locale === "ar" ? "العيادة" : locale === "he" ? "המרפאה" : "the clinic";
  return clipAtWord(n, 36);
}

/** One spoken crowd word — never the ICP form field. */
export function shortCrowd(intake: Intake, locale: Locale): string {
  const chip = resolveChipLabel(intake.audience, AUDIENCE_CHIPS, locale);
  const city = shortCity(intake, locale);
  if (chip && chip.length <= 22 && !INTERNAL_AR.some((x) => chip.includes(x))) {
    return city && locale === "ar" ? `${chip} ب${city}` : chip;
  }
  if (locale === "ar") return city ? `أهل ${city}` : "الأهل";
  if (locale === "he") return city ? `הורים ב${city}` : "הורים";
  return city ? `parents in ${city}` : "parents";
}

/** Strong-offer who-line: other-kupa / switch-to-Clalit must not keep Clalit-members leftover. */
export function audienceWhoLine(intake: Intake, locale: Locale): string {
  const city = shortCity(intake, locale);
  const kupa = detectKupaAudience(intake.audience);
  const crowd = shortCrowd(intake, locale);

  if (locale === "ar") {
    const c = city || "المنطقة";
    if (kupa === "maccabi") return `لأهل ${c} اللي بصندوق مكابي وبدهم ينقلوا لكلاليت.`;
    if (kupa === "meuhedet") return `لأهل ${c} اللي بصندوق مئوحيدت وبدهم ينقلوا لكلاليت.`;
    if (kupa === "leumit") return `لأهل ${c} اللي بصندوق لئوميت وبدهم ينقلوا لكلاليت.`;
    if (kupa === "switch_clalit") return `لأهل ${c} اللي بدهم ينقلوا لكلاليت من صندوق ثاني.`;
    if (isPediatrics(intake)) return `لأهل ${c} اللي بدهم طبيب أطفال كلاليت قريب.`;
    return `ل${crowd}.`;
  }
  if (locale === "he") {
    const c = city || "האזור";
    if (kupa === "maccabi") return `למשפחות ${c} במכבי שרוצים לעבור לכללית.`;
    if (kupa === "meuhedet") return `למשפחות ${c} במאוחדת שרוצים לעבור לכללית.`;
    if (kupa === "leumit") return `למשפחות ${c} בלאומית שרוצים לעבור לכללית.`;
    if (kupa === "switch_clalit") return `למשפחות ${c} שרוצים לעבור לכללית מקופה אחרת.`;
    return `ל${crowd}.`;
  }
  const c = city || "the area";
  if (kupa === "maccabi") return `For families in ${c} on Maccabi who want to switch to Clalit.`;
  if (kupa === "meuhedet") return `For families in ${c} on Meuhedet who want to switch to Clalit.`;
  if (kupa === "leumit") return `For families in ${c} on Leumit who want to switch to Clalit.`;
  if (kupa === "switch_clalit") return `For families in ${c} switching to Clalit from another fund.`;
  return `For ${crowd}.`;
}

function arWalkInH1(intake: Intake): string {
  const n = shortName(intake, "ar");
  const walk = isWalkIn(intake);
  if (walk && isPediatrics(intake)) return LOCKED_AR_H1;
  if (walk) return `${n} — جت أولاً`;
  return n;
}

export function hoursLine(intake: Intake, locale: Locale): string {
  const h = intake.clinicHours?.trim() ?? "";
  if (!h) return "";
  if (locale === "ar") return `الدوام: ${h}`;
  if (locale === "he") return `שעות: ${h}`;
  return `Hours: ${h}`;
}

export function kupaLine(intake: Intake, locale: Locale): string {
  const fileBy = intake.kupaFileBy?.trim() ?? "";
  const from = intake.kupaMemberFrom?.trim() ?? "";
  if (!fileBy && !from) return "";
  if (locale === "ar") {
    const a = fileBy ? `قدّموا نقل الصندوق حتى ${fileBy}` : "";
    const b = from ? `العضوية بتبلّش ${from}` : "";
    return [a, b].filter(Boolean).join(". ") + ".";
  }
  if (locale === "he") {
    const a = fileBy ? `הגשת מעבר קופה עד ${fileBy}` : "";
    const b = from ? `החברות מתחילה ב-${from}` : "";
    return [a, b].filter(Boolean).join(". ") + ".";
  }
  const a = fileBy ? `File a kupa switch by ${fileBy}` : "";
  const b = from ? `Membership starts ${from}` : "";
  return [a, b].filter(Boolean).join(". ") + ".";
}

export function spokenCta(intake: Intake, locale: Locale): string {
  if (isWalkIn(intake)) {
    return locale === "he" ? "הגיעו לפי סדר הגעה" : locale === "ar" ? "جيبوه عالعيادة" : "Walk in — no appointment";
  }
  const g = (resolveChipLabel(intake.mainGoal, GOAL_CHIPS, locale) || intake.mainGoal).toLowerCase();
  if (/תור|מועד|book|موعد|حجز/.test(g)) {
    return locale === "he" ? "קבעו תור" : locale === "ar" ? "احجزوا موعد" : "Book an appointment";
  }
  if (/הורד|install|تنزي/.test(g)) {
    return locale === "he" ? "להורדה" : locale === "ar" ? "حمّلوا التطبيق" : "Download the app";
  }
  if (/مبيع|מכיר|sale/.test(g)) {
    return locale === "he" ? "לפרטים ולרכישה" : locale === "ar" ? "للتفاصيل والشراء" : "See details & buy";
  }
  return locale === "he" ? "דברו איתנו" : locale === "ar" ? "احكوا معنا عالواتساب" : "Talk to us";
}

function placeBit(intake: Intake, locale: Locale): string {
  const city = shortCity(intake, locale);
  const loc = intake.location;
  if (/النور|אל-נור|al-nour|nour/i.test(loc)) {
    return locale === "ar" ? "مجمع النور، طابق 1" : locale === "he" ? "מתחם אל-נור, קומה 1" : "Al-Nour, 1st floor";
  }
  return city;
}

function waBit(intake: Intake): string {
  return intake.whatsapp?.trim() || "";
}

function forbiddenHeadline(s: string): boolean {
  const t = s.trim();
  if (!t) return true;
  if (INTERNAL_AR.some((x) => t.includes(x))) return true;
  if (t.length > 48) return true;
  return false;
}

export function landingH1(intake: Intake, locale: Locale): string {
  const walk = isWalkIn(intake);
  const n = shortName(intake, locale);
  const place = placeBit(intake, locale);
  if (locale === "ar") {
    const h = walk ? arWalkInH1(intake) : place ? `${n} — ${place}` : n;
    return forbiddenHeadline(h) ? (walk && isPediatrics(intake) ? LOCKED_AR_H1 : walk ? `${n} — جت أولاً` : n) : h;
  }
  if (locale === "he") {
    return walk ? `${n} — לפי סדר הגעה` : n;
  }
  return walk ? `${n} — walk-in` : n;
}

export function whatsappScript(intake: Intake, locale: Locale): string {
  const n = shortName(intake, locale);
  const wa = waBit(intake) || (locale === "ar" ? "[يجب الاستكمال]" : locale === "he" ? "[יש להשלים]" : "[TO COMPLETE]");
  const hours = intake.clinicHours?.trim() ?? "";
  const kupa = kupaLine(intake, locale);
  const place = placeBit(intake, locale);
  if (locale === "ar") {
    const walk = isWalkIn(intake)
      ? "جت أولاً بدون مواعيد — مش منحجز دور من الواتساب."
      : "";
    const h1 = isWalkIn(intake) && isPediatrics(intake) ? `${LOCKED_AR_H1}.` : "";
    return [
      h1,
      `أهلا، هون ${n}.`,
      place ? place + "." : "",
      `واتساب ${wa}.`,
      walk,
      hours ? `الدوام: ${hours}` : "",
      kupa,
      "واتساب مش للطوارئ. بالطوارئ روحوا على المستشفى أو غرفة الطوارئ.",
    ]
      .filter(Boolean)
      .join(" ");
  }
  if (locale === "he") {
    const walk = isWalkIn(intake) ? "קבלה לפי סדר הגעה, בלי לקבוע תור בוואטסאפ." : "מתי נוח לתור?";
    return [
      `שלום, כאן ${n}. וואטסאפ ${wa}.`,
      place,
      walk,
      hours ? `שעות: ${hours}` : "",
      kupa,
      "וואטסאפ לא לחירום — לחדר מיון.",
    ]
      .filter(Boolean)
      .join(" ");
  }
  const walk = isWalkIn(intake)
    ? "Walk-in, first come first served — we do not book slots on WhatsApp."
    : "When works for a visit?";
  return [
    `Hi, this is ${n}. WhatsApp ${wa}.`,
    place,
    walk,
    hours ? `Hours: ${hours}` : "",
    kupa,
    "WhatsApp is not for emergencies — go to the ER.",
  ]
    .filter(Boolean)
    .join(" ");
}

function offerLine(intake: Intake, locale: Locale): string {
  if (isNoOffer(intake.offer)) {
    return locale === "he"
      ? "אין מבצע ואין קופון."
      : locale === "ar"
        ? "ما في عرض وما في كوبون."
        : "No offer and no coupon.";
  }
  return resolveChipLabel(intake.offer, OFFER_CHIPS, locale) || intake.offer;
}

function edgeShort(intake: Intake, locale: Locale): string {
  const raw = resolveChipLabel(intake.uniqueAdvantage, ADVANTAGE_CHIPS, locale);
  if (raw && raw.length <= 40) return raw;
  const place = placeBit(intake, locale);
  const wa = waBit(intake);
  if (locale === "ar") {
    return [place, wa ? `واتساب ${wa}` : "", "خدمة عبري / عربي / إنجليزي"].filter(Boolean).join("، ");
  }
  if (locale === "he") {
    return [place, wa ? `וואטסאפ ${wa}` : "", "עברית / ערבית / אנגלית"].filter(Boolean).join(" · ");
  }
  return [place, wa ? `WhatsApp ${wa}` : "", "HE / AR / EN"].filter(Boolean).join(" · ");
}

function painShort(intake: Intake, locale: Locale): string {
  const raw = resolveChipLabel(intake.biggestProblem, PROBLEM_CHIPS, locale);
  if (raw && raw.length <= 36 && !INTERNAL_AR.some((x) => raw.includes(x))) return raw;
  if (locale === "ar") return "مش واضح وين تروح لما الولد بيمرض";
  if (locale === "he") return "לא ברור לאן לפנות כשהילד חולה";
  return "Not clear where to go when the child is sick";
}

export function spokenHeadline(kind: VariantKind, intake: Intake, locale: Locale): string {
  const n = shortName(intake, locale);
  const place = placeBit(intake, locale);
  const wa = waBit(intake);
  const walk = isWalkIn(intake);
  const cta = spokenCta(intake, locale);

  let h = "";
  if (locale === "ar") {
    switch (kind) {
      case "strong_offer":
        h = arWalkInH1(intake);
        break;
      case "very_short":
        h = place || n;
        break;
      case "emotional":
        h = walk ? LOCKED_AR_H1 : painShort(intake, locale);
        break;
      case "narrative":
        h = arWalkInH1(intake);
        break;
      case "direct_sales":
        h = wa ? `واتساب العيادة: ${wa}` : cta;
        break;
      case "unique_advantage":
        h = walk ? `${place || n} — جت أولاً` : clipAtWord(edgeShort(intake, locale), 40);
        break;
    }
  } else if (locale === "he") {
    switch (kind) {
      case "strong_offer":
        h = walk ? `${n} — לפי סדר הגעה` : n;
        break;
      case "very_short":
        h = place || n;
        break;
      case "emotional":
        h = walk ? "הילד חולה? מגיעים לפי סדר הגעה" : painShort(intake, locale);
        break;
      case "narrative":
        h = place ? `${n} ב${place}` : n;
        break;
      case "direct_sales":
        h = wa ? `וואטסאפ: ${wa}` : cta;
        break;
      case "unique_advantage":
        h = clipAtWord(edgeShort(intake, locale), 40);
        break;
    }
  } else {
    switch (kind) {
      case "strong_offer":
        h = walk ? `${n} — walk-in` : n;
        break;
      case "very_short":
        h = place || n;
        break;
      case "emotional":
        h = walk ? "Child sick? Walk in today" : painShort(intake, locale);
        break;
      case "narrative":
        h = place ? `${n} at ${place}` : n;
        break;
      case "direct_sales":
        h = wa ? `WhatsApp ${wa}` : cta;
        break;
      case "unique_advantage":
        h = clipAtWord(edgeShort(intake, locale), 40);
        break;
    }
  }

  if (
    forbiddenHeadline(h) ||
    (intake.audience.length > 24 && h.includes(intake.audience))
  ) {
    h = locale === "ar" ? (walk && isPediatrics(intake) ? LOCKED_AR_H1 : walk ? `${n} — جت أولاً` : n) : n;
  }
  return clipAtWord(h, 42);
}

export function spokenBody(kind: VariantKind, intake: Intake, locale: Locale): string {
  const n = shortName(intake, locale);
  const who = audienceWhoLine(intake, locale);
  const cta = spokenCta(intake, locale);
  const hours = hoursLine(intake, locale);
  const kupa = kupaLine(intake, locale);
  const wa = waBit(intake);
  const place = placeBit(intake, locale);
  const offer = offerLine(intake, locale);
  const walk = isWalkIn(intake);
  const site = intake.website?.trim() ?? "";

  if (locale === "ar") {
    const open = walk
      ? `${n} ب${shortCity(intake, locale) || place} — جت أولاً بدون مواعيد.`
      : `${n}${place ? " — " + place : ""}.`;
    const waLine = wa ? `واتساب ${wa} (مش للطوارئ).` : "";
    const facts = [hours, kupa, waLine, site, offer].filter(Boolean).join("\n");
    switch (kind) {
      case "strong_offer":
        return [open, who, facts, cta].filter(Boolean).join("\n\n");
      case "very_short":
        return [open, hours, waLine, cta].filter(Boolean).join(" ");
      case "emotional":
        return [
          "لما الولد بيمرض، الأهل بدهم يعرفوا وين يروحوا اليوم — مش إعلان عام.",
          open,
          facts,
        ].filter(Boolean).join("\n\n");
      case "narrative":
        return [
          open,
          place ? `المكان: ${place}.` : "",
          "خدمة عبري وعربي وإنجليزي.",
          facts,
        ].filter(Boolean).join("\n\n");
      case "direct_sales":
        return [open, facts, `إذا مناسب — ${cta}.`].filter(Boolean).join("\n\n");
      case "unique_advantage":
        return [edgeShort(intake, locale) + ".", open, facts].filter(Boolean).join("\n\n");
    }
  }

  if (locale === "he") {
    const open = walk
      ? `${n} — קבלה לפי סדר הגעה, בלי תור מראש.`
      : `${n}${place ? " · " + place : ""}.`;
    const waLine = wa ? `וואטסאפ ${wa} (לא לחירום).` : "";
    const facts = [hours, kupa, waLine, site, offer].filter(Boolean).join("\n");
    switch (kind) {
      case "strong_offer":
        return [open, who, facts, cta].filter(Boolean).join("\n\n");
      case "very_short":
        return [open, hours, waLine, cta].filter(Boolean).join(" ");
      case "emotional":
        return ["כשהילד חולה צריך לדעת לאן הולכים היום.", open, facts].filter(Boolean).join("\n\n");
      case "narrative":
        return [open, place ? `מקום: ${place}.` : "", "עברית, ערבית ואנגלית.", facts].filter(Boolean).join("\n\n");
      case "direct_sales":
        return [open, facts, `אם זה רלוונטי — ${cta}.`].filter(Boolean).join("\n\n");
      case "unique_advantage":
        return [edgeShort(intake, locale) + ".", open, facts].filter(Boolean).join("\n\n");
    }
  }

  const open = walk
    ? `${n} — walk-in, first come first served.`
    : `${n}${place ? " · " + place : ""}.`;
  const waLine = wa ? `WhatsApp ${wa} (not for emergencies).` : "";
  const facts = [hours, kupa, waLine, site, offer].filter(Boolean).join("\n");
  switch (kind) {
    case "strong_offer":
      return [open, who, facts, cta].filter(Boolean).join("\n\n");
    case "very_short":
      return [open, hours, waLine, cta].filter(Boolean).join(" ");
    case "emotional":
      return ["When a child is sick, families need to know where to go today.", open, facts].filter(Boolean).join("\n\n");
    case "narrative":
      return [open, place ? `Place: ${place}.` : "", "Hebrew, Arabic, and English.", facts].filter(Boolean).join("\n\n");
    case "direct_sales":
      return [open, facts, `If this is you — ${cta}.`].filter(Boolean).join("\n\n");
    case "unique_advantage":
      return [edgeShort(intake, locale) + ".", open, facts].filter(Boolean).join("\n\n");
  }
}

export function buildSpokenVariant(intake: Intake, kind: VariantKind, locale: Locale): AdVariant {
  return {
    kind,
    locale,
    cta: spokenCta(intake, locale),
    headline: spokenHeadline(kind, intake, locale),
    primaryText: spokenBody(kind, intake, locale),
  };
}

export function rsaLines(intake: Intake, locale: Locale): string {
  const h1 = landingH1(intake, locale);
  const h2 = isWalkIn(intake)
    ? locale === "ar"
      ? "جت أولاً بدون مواعيد"
      : locale === "he"
        ? "לפי סדר הגעה"
        : "Walk-in, no appointment"
    : clipAtWord(edgeShort(intake, locale), 30);
  const h3 = placeBit(intake, locale) || shortCity(intake, locale) || (locale === "ar" ? "الموقع ناقص" : locale === "he" ? "מיקום חסר" : "location missing");
  const d1 = hoursLine(intake, locale) || kupaLine(intake, locale) || clipAtWord(painShort(intake, locale), 40);
  const d2 = spokenCta(intake, locale);
  return `H1: ${h1}\nH2: ${h2}\nH3: ${h3}\nD1: ${d1}\nD2: ${d2}`;
}

export function landingBody(intake: Intake, locale: Locale): string {
  const h1 = landingH1(intake, locale);
  const n = shortName(intake, locale);
  const wa = waBit(intake) || (locale === "ar" ? "[يجب الاستكمال]" : locale === "he" ? "[יש להשלים]" : "[TO COMPLETE]");
  const hours = hoursLine(intake, locale);
  const kupa = kupaLine(intake, locale);
  const place = placeBit(intake, locale);
  const site = intake.website?.trim() ?? "";
  const walk = isWalkIn(intake);
  if (locale === "ar") {
    return [
      `H1: ${h1}`,
      walk ? "جت أولاً بدون مواعيد. مش حاجة تحجزوا دور." : "",
      place,
      hours,
      kupa,
      site,
      `واتساب: ${wa} — مش للطوارئ.`,
      "فورم: اسم + تلفون + لغة. بلا شهادات مختلقة.",
    ]
      .filter(Boolean)
      .join("\n");
  }
  if (locale === "he") {
    return [
      `H1: ${h1}`,
      walk ? "קבלה לפי סדר הגעה, בלי לקבוע תור." : "",
      place,
      hours,
      kupa,
      site,
      `וואטסאפ: ${wa} — לא לחירום.`,
      "טופס: שם + טלפון + שפה. בלי המלצות בדויות.",
    ]
      .filter(Boolean)
      .join("\n");
  }
  return [
    `H1: ${h1}`,
    walk ? "Walk-in, first come first served. No booking required." : "",
    place,
    hours,
    kupa,
    site,
    `WhatsApp: ${wa} — not for emergencies.`,
    "Form: name + phone + language. No fake testimonials.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function assertPublishableArabic(text: string): string[] {
  const hits: string[] = [];
  for (const bad of INTERNAL_AR) {
    if (text.includes(bad)) hits.push(bad);
  }
  if (text.includes("متى يناسب الموعد")) hits.push("متى يناسب الموعد");
  return hits;
}
