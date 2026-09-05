import type { AdVariant, Intake, Locale, VariantKind } from "../types";
import { isNoOffer } from "../no-offer";
import {
  ADVANTAGE_CHIPS,
  AUDIENCE_CHIPS,
  GOAL_CHIPS,
  OFFER_CHIPS,
  detectKupaAudience,
  hasChipId,
  resolveChipLabel,
  splitChipTokens,
} from "../chips";
import { canonicalDoctorName } from "../demo";
import { coverageFactLine, isClalitCoverageFact, isFreeService, isSchoolLike, problemChipsFor } from "../operating-model";
import {
  crowdFallback,
  detectVertical,
  emergencyDisclaimer,
  emotionalOpen,
  emotionalWalkHeadline,
  isPediatrics as isPedsVertical,
  painFallback,
  placeNoun,
  restaurantHungerLine,
  showsKupaFields,
  visitCta,
  waNotEmergencyBit,
  waPlaceHeadline,
} from "../vertical";

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
  return isPedsVertical(intake);
}

export function isWalkIn(intake: Intake): boolean {
  if (hasChipId(intake.mainGoal, "walk_in")) return true;
  const blob = [
    intake.clinicHours,
    intake.mainGoal,
    intake.description,
    intake.uniqueAdvantage,
    intake.biggestProblem,
  ]
    .join(" ")
    .toLowerCase();
  return /walk-?in|جت أولاً|جت اولا|بدون مواعيد|بدون طوابير|بدون انتظار|للا תור|ללא תור|בלי לקבוע|סדר הגעה|first come|no appointment|no pre-book|بدون موعد/.test(
    blob,
  );
}


function isProduct(intake: Intake): boolean {
  return detectVertical(intake) === "product";
}

/** Extracted / custom problem — not the generic «unknown» chip. */
export function spokenProblem(intake: Intake, locale: Locale): string {
  const tokens = splitChipTokens(intake.biggestProblem);
  if (tokens.length === 1 && tokens[0] === "unknown") return "";
  const withoutUnknown = tokens.filter((x) => x !== "unknown").join(",") || intake.biggestProblem;
  const raw = (resolveChipLabel(withoutUnknown, problemChipsFor(intake), locale) || "").replace(/\s+/g, " ").trim();
  if (!raw) return "";
  if (INTERNAL_AR.some((x) => raw.includes(x))) return "";
  return localizeFactBlob(raw, locale);
}

export function spokenAdvantage(intake: Intake, locale: Locale): string {
  const raw = (resolveChipLabel(intake.uniqueAdvantage, ADVANTAGE_CHIPS, locale) || "").replace(/\s+/g, " ").trim();
  if (!raw || /^custom$/i.test(raw)) return "";
  return localizeFactBlob(raw, locale);
}


const HE_RE = /[\u0590-\u05FF]/;
const AR_RE = /[\u0600-\u06FF]/;

const FACT_PHRASES: Array<{ re: RegExp; he: string; ar: string; en: string }> = [
  { re: /بدون طوابير/, he: "בלי תורים", ar: "بدون طوابير", en: "no queues" },
  { re: /بدون انتظار/, he: "בלי המתנה", ar: "بدون انتظار", en: "no long wait" },
  { re: /100\s*%[^\n]{0,24}(?:كلاليت|כללית)/, he: "100% למבוטחי כללית", ar: "100% لمؤمني كلاليت", en: "100% for Clalit members" },
  { re: /لمؤمني كلاليت/, he: "למבוטחי כללית", ar: "لمؤمني كلاليت", en: "for Clalit members" },
  { re: /وقفتكم بالساعات/, he: "שעות בתור עם ילד חולה", ar: "وقفتكم بالساعات مع طفل مريض", en: "hours in line with a sick child" },
  { re: /طوابير الساعات/, he: "תורים של שעות", ar: "طوابير الساعات", en: "hours-long queues" },
];

/** Map extracted HE/AR fact fragments into the pack locale. Never invents new claims. */
export function localizeFactBlob(raw: string, locale: Locale): string {
  const src = raw.replace(/\s+/g, " ").trim();
  if (!src) return "";
  if (locale === "he" && HE_RE.test(src) && !AR_RE.test(src)) return src;
  if (locale === "ar" && AR_RE.test(src) && !HE_RE.test(src)) return src;
  if (locale === "en" && !HE_RE.test(src) && !AR_RE.test(src)) return src;
  const parts = src.split(/\s*\+\s*|\s*·\s*/).map((s) => s.trim()).filter(Boolean);
  const mapped = parts.map((p) => {
    for (const f of FACT_PHRASES) {
      if (f.re.test(p)) return locale === "he" ? f.he : locale === "ar" ? f.ar : f.en;
    }
    return p;
  });
  const joiner = locale === "ar" ? " + " : " · ";
  let joined = mapped.join(joiner);
  if (locale === "he") joined = mapped.filter((x) => !AR_RE.test(x)).join(joiner) || joined.replace(/[\u0600-\u06FF]+/g, "").replace(/\s+/g, " ").trim();
  if (locale === "ar") joined = mapped.filter((x) => !HE_RE.test(x)).join(joiner) || joined.replace(/[\u0590-\u05FF]+/g, "").replace(/\s+/g, " ").trim();
  return joined.replace(/[·+,]\s*$/u, "").trim();
}

function mentionsReceptionLanguages(intake: Intake): boolean {
  const blob = `${intake.description} ${intake.uniqueAdvantage} ${intake.brandTone} ${intake.brandPositioning} ${intake.landingLines}`;
  return /עברית\s*[,\/ו]?\s*ערבית|ערבית.*אנגלית|عبري.*إنجليز|hebrew.*arabic.*english|שירות בעברית|خدمة عبري/i.test(blob);
}

function languageLine(intake: Intake, locale: Locale): string {
  if (!mentionsReceptionLanguages(intake)) return "";
  if (locale === "ar") return "خدمة عبري وعربي وإنجليزي.";
  if (locale === "he") return "עברית, ערבית ואנגלית.";
  return "Hebrew, Arabic, and English.";
}

function productProblemH1(intake: Intake, locale: Locale): string | null {
  if (!isProduct(intake)) return null;
  const raw = spokenProblem(intake, locale);
  if (!raw) return null;
  return clipAtWord(raw, 48);
}

function punctuate(s: string): string {
  const t = s.trim();
  if (!t) return "";
  if (/[.!?؟…]$/u.test(t)) return t;
  return `${t}.`;
}

export function shortCity(intake: Intake, locale: Locale): string {
  const loc = intake.location.trim();
  if (/باقة|באקה|baqa/i.test(loc)) {
    return locale === "ar" ? "باقة" : locale === "he" ? "באקה" : "Baqa";
  }
  const first = loc.split(/[—–,\n|/]/)[0]?.trim() ?? "";
  return clipAtWord(first, 22);
}

function extractedDoctorNames(intake: Intake): { he: string; ar: string; en: string } {
  const blob = `${intake.businessName}\n${intake.description}\n${intake.category}`;
  const arHit = blob.match(/د\.?\s*سامر[\s\u0600-\u06FF]{0,48}أبو مخ/) || blob.match(/عيادة أطفال د\.?\s*سامر أبو مخ/);
  const heHit = blob.match(/ד["״']?ר\s*סאמר[^|\n,]{0,40}אבו מוך/);
  const ar = canonicalDoctorName((arHit?.[0] || "").replace(/\s+/g, " ").trim());
  const he = (heHit?.[0] || "").replace(/\s+/g, " ").trim();
  const en = /سامر|סאמר|Samer/i.test(blob) && (ar || he) ? "Dr. Samer Abu Mokh" : "";
  return { he, ar, en };
}

export function shortName(intake: Intake, locale: Locale): string {
  const names = extractedDoctorNames(intake);
  if (locale === "he" && names.he) return clipAtWord(names.he, 36);
  if (locale === "ar" && names.ar) return clipAtWord(names.ar, 36);
  if (locale === "en" && names.en) return names.en;
  const n = canonicalDoctorName(intake.businessName.trim());
  if (!n) return placeNoun(intake, locale);
  if (locale === "he" && /[\u0600-\u06FF]/.test(n)) return placeNoun(intake, locale);
  if (locale === "ar" && /[\u0590-\u05FF]/.test(n) && names.ar) return clipAtWord(names.ar, 36);
  return clipAtWord(n, 36);
}

/** One spoken crowd word — never the ICP form field. */
export function shortCrowd(intake: Intake, locale: Locale): string {
  const chip = resolveChipLabel(intake.audience, AUDIENCE_CHIPS, locale);
  const city = shortCity(intake, locale);
  if (chip && chip.length <= 22 && !INTERNAL_AR.some((x) => chip.includes(x))) {
    return city && locale === "ar" ? `${chip} ب${city}` : chip;
  }
  const crowd = crowdFallback(intake, locale);
  if (locale === "ar") return city ? `${crowd} ب${city}` : crowd;
  if (locale === "he") return city ? `${crowd} ב${city}` : crowd;
  return city ? `${crowd} in ${city}` : crowd;
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
    if (isPediatrics(intake)) return `למשפחות ${c} שמחפשות רופא ילדים בכללית.`;
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

const HOUR_AR: Array<[string, string, string]> = [
  ["طوارئ واستفسارات هاتفية للمسجلين", "חירום ובירורים טלפוניים לרשומים", "emergency / phone questions for registered families"],
  ["مغلق (استشارات واتساب)", "סגור (ייעוץ וואטסאפ)", "closed (WhatsApp consults)"],
  ["استشارات واتساب", "ייעוץ וואטסאפ", "WhatsApp consults"],
  ["عطلة نهاية الأسبوع", "סופ״ש", "weekend"],
  ["الأحد", "ראשון", "Sun"],
  ["الإثنين", "שני", "Mon"],
  ["الاثنين", "שני", "Mon"],
  ["الثلاثاء", "שלישי", "Tue"],
  ["الأربعاء", "רביעי", "Wed"],
  ["الخميس", "חמישי", "Thu"],
  ["الجمعة", "שישי", "Fri"],
  ["السبت", "שבת", "Sat"],
  ["مغلق", "סגור", "closed"],
];

export function localizeHours(raw: string, locale: Locale): string {
  const h = raw.replace(/\s+/g, " ").trim();
  if (!h || locale === "ar") return h;
  let out = h;
  for (const [ar, he, en] of HOUR_AR) {
    if (out.includes(ar)) out = out.split(ar).join(locale === "he" ? he : en);
  }
  return out;
}

export function hoursLine(intake: Intake, locale: Locale): string {
  const h = localizeHours(intake.clinicHours?.trim() ?? "", locale);
  if (!h) return "";
  if (locale === "ar") return `الدوام: ${h}`;
  if (locale === "he") return `שעות: ${h}`;
  return `Hours: ${h}`;
}

export function kupaLine(intake: Intake, locale: Locale): string {
  if (!showsKupaFields(intake)) return "";
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
  if (isFreeService(intake)) {
    if (isWalkIn(intake) || isPediatrics(intake) || detectVertical(intake) === "clinic") {
      return visitCta(intake, locale);
    }
    if (isSchoolLike(intake)) {
      return visitCta(intake, locale);
    }
    const g = intake.mainGoal;
    if (hasChipId(g, "enrollment") || /הרשמ|רישום|تسجيل|enroll|regist/i.test(g)) {
      return locale === "he" ? "הרשמה" : locale === "ar" ? "سجّلوا" : "Register";
    }
    if (intake.whatsapp?.trim()) {
      return locale === "he" ? "וואטסאפ" : locale === "ar" ? "واتساب" : "WhatsApp";
    }
    if (hasChipId(g, "walk_in") || hasChipId(g, "exposure") || hasChipId(g, "awareness")) {
      return locale === "he" ? "הגיעו לבקר" : locale === "ar" ? "تعوا زورونا" : "Visit us";
    }
    return locale === "he" ? "וואטסאפ" : locale === "ar" ? "احكوا معنا عالواتساب" : "Talk to us";
  }
  if (isWalkIn(intake)) {
    return visitCta(intake, locale);
  }
  // Restaurant / retail before "bookings" goal — chip id "bookings" matches /book/ and wrongly became "Book an appointment".
  if (detectVertical(intake) === "restaurant") {
    if (intake.website?.trim()) {
      return locale === "he" ? "להזמנה באתר" : locale === "ar" ? "للطلب بالموقع" : "Order on the site";
    }
    if (waBit(intake)) {
      return locale === "he" ? "הזמינו בטלפון" : locale === "ar" ? "اطلبوا عالهاتف" : "Order by phone";
    }
    return visitCta(intake, locale);
  }
  if (detectVertical(intake) === "retail") {
    if (intake.website?.trim()) {
      return locale === "he" ? "לקנייה באתר" : locale === "ar" ? "للشراء بالموقع" : "Shop on the site";
    }
    return visitCta(intake, locale);
  }
  const g = (resolveChipLabel(intake.mainGoal, GOAL_CHIPS, locale) || intake.mainGoal).toLowerCase();
  if ((/(?:^|\s)(?:תור|מועד|موعد|حجز)(?:\s|$)|\bbook(?:ing|ings)?\b|\bappointment\b/.test(g)) && detectVertical(intake) === "clinic") {
    return locale === "he" ? "קבעו תור" : locale === "ar" ? "احجزوا موعد" : "Book an appointment";
  }
  if (/הורד|install|تنزي/.test(g)) {
    return locale === "he" ? "להורדה" : locale === "ar" ? "حمّلوا التطبيق" : "Download the app";
  }
  if (/مبيع|מכיר|sale/.test(g)) {
    return locale === "he" ? "לפרטים ולרכישה" : locale === "ar" ? "للتفاصيل والشراء" : "See details & buy";
  }
  if (isProduct(intake)) {
    if (intake.website?.trim()) {
      return locale === "he" ? "לאתר" : locale === "ar" ? "للموقع" : "Visit the site";
    }
    return locale === "he" ? "להורדה" : locale === "ar" ? "حمّلوا التطبيق" : "Download the app";
  }
  if (intake.website?.trim()) {
    return locale === "he" ? "לאתר" : locale === "ar" ? "للموقع" : "Visit the site";
  }
  if (waBit(intake)) {
    return locale === "he" ? "וואטסאפ" : locale === "ar" ? "واتساب" : "WhatsApp";
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

/** Prefer intake.whatsapp; else labeled phone/WhatsApp in description. Never invent. */
export function contactNumber(intake: Intake): string {
  const direct = intake.whatsapp?.trim() || "";
  if (direct) {
    // Ingest may join several numbers with · — ads/WhatsApp use the first usable one.
    const first = direct.split(/\s*[·|,;]\s*/).map((s) => s.trim()).find((s) => /\d{7,}/.test(s));
    return first || direct;
  }
  const desc = `${intake.description || ""}\n${intake.channelNotes || ""}`;
  const labeled =
    desc.match(/(?:whatsapp|וואטסאפ|واتساب|phone|tel(?:ephone)?|טלפון|هاتف)\s*[:：]\s*([+\d][\d\-–.\s]{6,24}\d)/i) ||
    desc.match(/\b(1-?700[\d\-]{5,}|0\d[\d\-]{7,14}|\+972[\d\-]{7,14})\b/);
  return labeled?.[1]?.replace(/\s+/g, " ").trim() || "";
}

function waBit(intake: Intake): string {
  return contactNumber(intake);
}

function incompleteContact(locale: Locale): string {
  return locale === "ar" ? "[يجب الاستكمال]" : locale === "he" ? "[יש להשלים]" : "[TO COMPLETE]";
}

/** Only when neither name nor phone exist — never TO COMPLETE over a known business. */
function contactOrEmpty(intake: Intake, locale: Locale): string {
  const wa = waBit(intake);
  if (wa) return wa;
  if (intake.businessName.trim() || intake.website?.trim()) return "";
  return incompleteContact(locale);
}

function forbiddenHeadline(s: string): boolean {
  const t = s.trim();
  if (!t) return true;
  if (INTERNAL_AR.some((x) => t.includes(x))) return true;
  if (t.length > 48) return true;
  return false;
}

export function landingH1(intake: Intake, locale: Locale): string {
  const productH1 = productProblemH1(intake, locale);
  if (productH1) return productH1;
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
  if (intake.whatsappTemplates?.trim()) return intake.whatsappTemplates.trim();
  if (isProduct(intake) && !waBit(intake)) {
    return [
      landingH1(intake, locale),
      punctuate(spokenAdvantage(intake, locale)),
      intake.website?.trim() ?? "",
      spokenCta(intake, locale),
    ]
      .filter(Boolean)
      .join(" ");
  }
  const n = shortName(intake, locale);
  const wa = contactOrEmpty(intake, locale);
  const hours = hoursLine(intake, locale);
  const kupa = kupaLine(intake, locale);
  const place = placeBit(intake, locale);
  if (locale === "ar") {
    const walk = isWalkIn(intake)
      ? "جت أولاً بدون مواعيد — مش منحجز دور من الواتساب."
      : "";
    const h1 = isWalkIn(intake) && isPediatrics(intake) ? `${LOCKED_AR_H1}.` : "";
    const site = intake.website?.trim() ?? "";
    return [
      h1,
      `أهلا، هون ${n}.`,
      place ? place + "." : "",
      wa ? `واتساب ${wa}.` : site ? site : "",
      walk,
      hours,
      kupa,
      emergencyDisclaimer(intake, locale),
      spokenCta(intake, locale),
    ]
      .filter(Boolean)
      .join(" ");
  }
  if (locale === "he") {
    const rest = detectVertical(intake) === "restaurant";
    const walk = isWalkIn(intake)
      ? "קבלה לפי סדר הגעה, בלי לקבוע תור בוואטסאפ."
      : rest
        ? ""
        : "מתי נוח לתור?";
    const site = intake.website?.trim() ?? "";
    const open = wa
      ? `שלום, כאן ${n}. וואטסאפ ${wa}.`
      : site
        ? `שלום, כאן ${n}. ${site}`
        : `שלום, כאן ${n}.`;
    return [
      open,
      place,
      walk,
      hours,
      kupa,
      emergencyDisclaimer(intake, locale),
      spokenCta(intake, locale),
    ]
      .filter(Boolean)
      .join(" ");
  }
  const rest = detectVertical(intake) === "restaurant";
  const walk = isWalkIn(intake)
    ? "Walk-in, first come first served — we do not book slots on WhatsApp."
    : rest
      ? ""
      : "When works for a visit?";
  const site = intake.website?.trim() ?? "";
  const open = wa
    ? `Hi, this is ${n}. WhatsApp ${wa}.`
    : site
      ? `Hi, this is ${n}. ${site}`
      : `Hi, this is ${n}.`;
  return [
    open,
    place,
    walk,
    hours,
    kupa,
    emergencyDisclaimer(intake, locale),
    spokenCta(intake, locale),
  ]
    .filter(Boolean)
    .join(" ");
}

function offerLine(intake: Intake, locale: Locale, allowNoOffer = false): string {
  if (isNoOffer(intake.offer)) {
    if (!allowNoOffer) return "";
    if (detectVertical(intake) === "restaurant") {
      return locale === "he"
        ? "אין הנחה באתר — מדברים על התפריט והמשלוח."
        : locale === "ar"
          ? "ما في خصم بالموقع — نحكي عن القائمة والتوصيل."
          : "No site discount — talk menu and delivery.";
    }
    return locale === "he"
      ? "אין מבצע ואין קופון."
      : locale === "ar"
        ? "ما في عرض وما في كوبون."
        : "No offer and no coupon.";
  }
  return resolveChipLabel(intake.offer, OFFER_CHIPS, locale) || intake.offer;
}

function edgeShort(intake: Intake, locale: Locale, max = 48): string {
  const raw = spokenAdvantage(intake, locale);
  if (raw) return clipAtWord(raw, max);
  const place = placeBit(intake, locale);
  const wa = waBit(intake);
  const langs = languageLine(intake, locale).replace(/[.]$/, "");
  if (locale === "ar") {
    return [place, wa ? `واتساب ${wa}` : "", langs].filter(Boolean).join("، ");
  }
  if (locale === "he") {
    return [place, wa ? `וואטסאפ ${wa}` : "", langs].filter(Boolean).join(" · ");
  }
  return [place, wa ? `WhatsApp ${wa}` : "", langs].filter(Boolean).join(" · ");
}

function painShort(intake: Intake, locale: Locale): string {
  const supplied = spokenProblem(intake, locale);
  if (supplied) return clipAtWord(supplied, 48);
  const raw = resolveChipLabel(intake.biggestProblem, problemChipsFor(intake), locale);
  if (raw && !INTERNAL_AR.some((x) => raw.includes(x))) return clipAtWord(raw, 48);
  return painFallback(intake, locale);
}

export function spokenHeadline(kind: VariantKind, intake: Intake, locale: Locale): string {
  const n = shortName(intake, locale);
  const place = placeBit(intake, locale);
  const wa = waBit(intake);
  const walk = isWalkIn(intake);
  const cta = spokenCta(intake, locale);
  const productH1 = productProblemH1(intake, locale);

  let h = "";
  if (locale === "ar") {
    switch (kind) {
      case "strong_offer":
        h = productH1 || arWalkInH1(intake);
        break;
      case "very_short":
        h = productH1 || place || n;
        break;
      case "emotional":
        h =
          (walk && isPediatrics(intake) ? LOCKED_AR_H1 : null) ||
          productH1 ||
          emotionalWalkHeadline(intake, locale) ||
          (detectVertical(intake) === "restaurant" ? restaurantHungerLine(intake, locale) : "") ||
          (n ? n : painShort(intake, locale));
        break;
      case "narrative":
        h = productH1 || arWalkInH1(intake);
        break;
      case "direct_sales":
        h = wa ? waPlaceHeadline(intake, locale, wa) : cta;
        break;
      case "unique_advantage":
        h = walk ? `${place || n} — جت أولاً` : clipAtWord(edgeShort(intake, locale), 40);
        break;
    }
  } else if (locale === "he") {
    switch (kind) {
      case "strong_offer":
        h = productH1 || (walk ? `${n} — לפי סדר הגעה` : n);
        break;
      case "very_short":
        h = productH1 || place || n;
        break;
      case "emotional":
        h =
          productH1 ||
          emotionalWalkHeadline(intake, locale) ||
          (detectVertical(intake) === "restaurant" ? restaurantHungerLine(intake, locale) : "") ||
          (n ? n : painShort(intake, locale));
        break;
      case "narrative":
        h = productH1 || (place ? `${n} ב${place}` : n);
        break;
      case "direct_sales":
        h = wa ? `וואטסאפ: ${wa}` : cta;
        break;
      case "unique_advantage":
        h = clipAtWord(edgeShort(intake, locale), 48);
        break;
    }
  } else {
    switch (kind) {
      case "strong_offer":
        h = productH1 || (walk ? `${n} — walk-in` : n);
        break;
      case "very_short":
        h = productH1 || place || n;
        break;
      case "emotional":
        h =
          productH1 ||
          emotionalWalkHeadline(intake, locale) ||
          (detectVertical(intake) === "restaurant" ? restaurantHungerLine(intake, locale) : "") ||
          (n ? n : painShort(intake, locale));
        break;
      case "narrative":
        h = productH1 || (place ? `${n} at ${place}` : n);
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
    h = productH1 || (locale === "ar" ? (walk && isPediatrics(intake) ? LOCKED_AR_H1 : walk ? `${n} — جت أولاً` : n) : n);
  }
  return clipAtWord(h, 48);
}

function productSpokenBody(kind: VariantKind, intake: Intake, locale: Locale): string {
  const n = shortName(intake, locale);
  const who = audienceWhoLine(intake, locale);
  const cta = spokenCta(intake, locale);
  const site = intake.website?.trim() ?? "";
  const offerReal = offerLine(intake, locale, false);
  const offerOnce = offerLine(intake, locale, true);
  const wa = waBit(intake);
  const waLine = wa
    ? locale === "ar"
      ? `واتساب ${wa}.`
      : locale === "he"
        ? `וואטסאפ ${wa}.`
        : `WhatsApp ${wa}.`
    : "";
  const adv = punctuate(spokenAdvantage(intake, locale));
  const pain = spokenProblem(intake, locale);
  const factsReal = [site, offerReal, waLine].filter(Boolean).join("\n");
  const factsOnce = [site, offerOnce, waLine].filter(Boolean).join("\n");
  switch (kind) {
    case "strong_offer":
      return [adv || punctuate(n), who, factsOnce, cta].filter(Boolean).join("\n\n");
    case "very_short":
      return [adv || n, cta].filter(Boolean).join(" ");
    case "emotional":
      return [pain || emotionalOpen(intake, locale), adv, factsReal, cta].filter(Boolean).join("\n\n");
    case "narrative":
      return [pain, adv || punctuate(n), factsReal, cta].filter(Boolean).join("\n\n");
    case "direct_sales":
      return [adv || punctuate(n), factsReal, cta].filter(Boolean).join("\n\n");
    case "unique_advantage":
      return [adv || punctuate(edgeShort(intake, locale, 180)), factsReal, cta].filter(Boolean).join("\n\n");
  }
}

export function spokenBody(kind: VariantKind, intake: Intake, locale: Locale): string {
  if (isProduct(intake)) return productSpokenBody(kind, intake, locale);
  const n = shortName(intake, locale);
  const who = audienceWhoLine(intake, locale);
  const cta = spokenCta(intake, locale);
  const hours = hoursLine(intake, locale);
  const kupa = kupaLine(intake, locale);
  const wa = waBit(intake);
  const place = placeBit(intake, locale);
  const offerReal = offerLine(intake, locale, false);
  const offerOnce = offerLine(intake, locale, true);
  const walk = isWalkIn(intake);
  const site = intake.website?.trim() ?? "";

  if (locale === "ar") {
    const open = walk
      ? `${n} ب${shortCity(intake, locale) || place} — جت أولاً بدون مواعيد.`
      : `${n}${place ? " — " + place : ""}.`;
    const waLine = wa ? `واتساب ${wa}${waNotEmergencyBit(intake, locale)}.` : "";
    const facts = [hours, kupa, waLine, site, offerReal].filter(Boolean).join("\n");
    const factsOnce = [hours, kupa, waLine, site, offerOnce].filter(Boolean).join("\n");
    switch (kind) {
      case "strong_offer":
        return [open, who, factsOnce, cta].filter(Boolean).join("\n\n");
      case "very_short":
        return [open, hours, waLine, cta].filter(Boolean).join(" ");
      case "emotional":
        return [
          emotionalOpen(intake, locale),
          open,
          facts,
        ].filter(Boolean).join("\n\n");
      case "narrative":
        return [
          open,
          place ? `المكان: ${place}.` : "",
          languageLine(intake, locale),
          facts,
        ].filter(Boolean).join("\n\n");
      case "direct_sales":
        return [open, facts, `إذا مناسب — ${cta}.`].filter(Boolean).join("\n\n");
      case "unique_advantage":
        return [
          edgeShort(intake, locale, 180) + ".",
          isFreeService(intake) && isClalitCoverageFact(intake) ? coverageFactLine("ar") : "",
          open,
          facts,
        ].filter(Boolean).join("\n\n");
    }
  }

  if (locale === "he") {
    const open = walk
      ? `${n} — קבלה לפי סדר הגעה, בלי תור מראש.`
      : `${n}${place ? " · " + place : ""}.`;
    const waLine = wa ? `וואטסאפ ${wa}${waNotEmergencyBit(intake, locale)}.` : "";
    const facts = [hours, kupa, waLine, site, offerReal].filter(Boolean).join("\n");
    const factsOnce = [hours, kupa, waLine, site, offerOnce].filter(Boolean).join("\n");
    switch (kind) {
      case "strong_offer":
        return [open, who, factsOnce, cta].filter(Boolean).join("\n\n");
      case "very_short":
        return [open, hours, waLine, cta].filter(Boolean).join(" ");
      case "emotional":
        return [emotionalOpen(intake, locale), open, facts].filter(Boolean).join("\n\n");
      case "narrative":
        return [open, place ? `מקום: ${place}.` : "", languageLine(intake, locale), facts].filter(Boolean).join("\n\n");
      case "direct_sales":
        return [open, facts, `אם זה רלוונטי — ${cta}.`].filter(Boolean).join("\n\n");
      case "unique_advantage":
        return [
          edgeShort(intake, locale, 180) + ".",
          isFreeService(intake) && isClalitCoverageFact(intake) ? coverageFactLine("he") : "",
          open,
          facts,
        ].filter(Boolean).join("\n\n");
    }
  }

  const open = walk
    ? `${n} — walk-in, first come first served.`
    : `${n}${place ? " · " + place : ""}.`;
  const waLine = wa ? `WhatsApp ${wa}${waNotEmergencyBit(intake, locale)}.` : "";
  const facts = [hours, kupa, waLine, site, offerReal].filter(Boolean).join("\n");
  const factsOnce = [hours, kupa, waLine, site, offerOnce].filter(Boolean).join("\n");
  switch (kind) {
    case "strong_offer":
      return [open, who, factsOnce, cta].filter(Boolean).join("\n\n");
    case "very_short":
      return [open, hours, waLine, cta].filter(Boolean).join(" ");
    case "emotional":
      return [emotionalOpen(intake, locale), open, facts].filter(Boolean).join("\n\n");
    case "narrative":
      return [open, place ? `Place: ${place}.` : "", languageLine(intake, locale), facts].filter(Boolean).join("\n\n");
    case "direct_sales":
      return [open, facts, `If this is you — ${cta}.`].filter(Boolean).join("\n\n");
    case "unique_advantage":
      return [
        edgeShort(intake, locale, 180) + ".",
        isFreeService(intake) && isClalitCoverageFact(intake) ? coverageFactLine("en") : "",
        open,
        facts,
      ].filter(Boolean).join("\n\n");
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

function landingLinesForLocale(raw: string, locale: Locale): string {
  const s = raw.replace(/\s+/g, " ").trim();
  if (!s) return "";
  if (/\$\{|whatsappDisplay|contentHe:|contentAr:/.test(s)) return "";
  if (locale === "ar") return AR_RE.test(s) && !HE_RE.test(s) ? s : "";
  if (locale === "he") return HE_RE.test(s) && !AR_RE.test(s) ? s : "";
  return !HE_RE.test(s) && !AR_RE.test(s) ? s : "";
}

export function landingBody(intake: Intake, locale: Locale): string {
  const supplied = landingLinesForLocale(intake.landingLines?.trim() ?? "", locale);
  const h1 = landingH1(intake, locale);
  const n = shortName(intake, locale);
  const product = isProduct(intake);
  const waRaw = waBit(intake);
  const wa = waRaw || (product ? "" : contactOrEmpty(intake, locale));
  const hours = hoursLine(intake, locale);
  const kupa = kupaLine(intake, locale);
  const place = placeBit(intake, locale);
  const site = intake.website?.trim() ?? "";
  const walk = isWalkIn(intake);
  const adv = spokenAdvantage(intake, locale);
  if (locale === "ar") {
    return [
      `H1: ${h1}`,
      supplied,
      product ? adv : "",
      walk ? "جت أولاً بدون مواعيد. مش حاجة تحجزوا دور." : "",
      place,
      hours,
      kupa,
      site,
      wa ? `واتساب: ${wa}${waNotEmergencyBit(intake, locale) ? " — مش للطوارئ" : ""}.` : "",
      "فورم: اسم + تلفون + لغة. بلا شهادات مختلقة.",
    ]
      .filter(Boolean)
      .join("\n");
  }
  if (locale === "he") {
    return [
      `H1: ${h1}`,
      supplied,
      product ? adv : "",
      walk ? "קבלה לפי סדר הגעה, בלי לקבוע תור." : "",
      place,
      hours,
      kupa,
      site,
      wa ? `וואטסאפ: ${wa}${waNotEmergencyBit(intake, locale) ? " — לא לחירום" : ""}.` : "",
      "טופס: שם + טלפון + שפה. בלי המלצות בדויות.",
    ]
      .filter(Boolean)
      .join("\n");
  }
  return [
    `H1: ${h1}`,
    supplied,
    product ? adv : "",
    walk ? "Walk-in, first come first served. No booking required." : "",
    place,
    hours,
    kupa,
    site,
    wa ? `WhatsApp: ${wa}${waNotEmergencyBit(intake, locale) ? " — not for emergencies" : ""}.` : "",
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
