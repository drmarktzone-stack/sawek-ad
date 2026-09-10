/**
 * Locale isolation for scanned facts.
 * UI language owns display script. Never invent numbers, offers, or pain.
 * Proper nouns are glossed when a known pair exists; otherwise left as published.
 */
import type { Intake, Locale } from "./types";
import { lockDefaultDialect, normalizeVoice, emptyVoice } from "./engine/voice";
import { detectVertical } from "./vertical";
import { attachScanOffer } from "./engine/offer-from-scan";

const PAIRS: [string, string, string][] = [
  // he, ar, en
  ['ד"ר', "د.", "Dr."],
  ["ד״ר", "د.", "Dr."],
  ["אליאס הלון", "إلياس حلون", "Elias Halloun"],
  ["מרפאת שיניים", "عيادة أسنان", "Dental clinic"],
  ["Dentist", "عيادة أسنان", "Dentist"],
  ["MedicalClinic", "عيادة طبية", "Medical clinic"],
  ["רופא שיניים", "طبيب أسنان", "Dentist"],
  ["השתלות שיניים ממוחשבות", "زراعة الأسنان المحوسبة", "Computer-guided implants"],
  ["השתלות שיניים ביום אחד", "زراعة الأسنان في يوم واحد", "Same-day dental implants"],
  ["השתלת שיניים למחוסרי עצם", "زراعة أسنان لمن يعانون نقص العظم", "Implants for bone-deficient patients"],
  ["טיפולי שיניים בהרדמה כללית", "علاجات أسنان تحت تخدير عام", "Dental treatment under general anesthesia"],
  ["השתלות שיניים", "زراعة الأسنان", "Dental implants"],
  ["השתלות עצם", "ترقيع عظمي", "Bone grafts"],
  ["הרמת סינוס", "رفع الجيب الأنفي", "Sinus lift"],
  ["ביום אחד", "في يوم واحد", "same day"],
  ["ממוחשבות", "محوسبة", "computer-guided"],
  ["אסתטיקה דנטלית", "تجميل الأسنان", "Dental aesthetics"],
  ["המרכז לאסתטיקה והשתלות שיניים", "المركز لتجميل وزراعة الأسنان", "Center for dental aesthetics and implants"],
  ["שדרות הנשיא", "شارع الرئيس", "Sderot HaNasi"],
  ["גוברין", "جوبرين", "Govrin"],
  ["גופרין", "جوفرين", "Govrin"],
  ["חיפה", "حيفا", "Haifa"],
  ["כירורגיה פלסטית", "جراحة تجميل", "Plastic surgery"],
  ["جراح تجميل", "جراح تجميل", "Plastic surgeon"],
  ["אסתטיקה רפואית", "تجميل طبي", "Medical aesthetics"],
  ["בן גוריון", "بن غوريون", "Ben Gurion"],
  ["מטופלים ב", "مرضى في ", "Patients in "],
  ["שתלים מזרקוניה", "زرعات زركونيا", "Zirconia implants"],
  ["תותבות על גבי שתלים", "أطقم على زرعات", "Implant-supported dentures"],
  ["כתרים על גבי שתלים", "تيجان على زرعات", "Implant crowns"],
  ["כתרים מזרקוניה", "تيجان زركونيا", "Zirconia crowns"],
  ["ציפוי חרסינה", "قشور بورسلان", "Porcelain veneers"],
  ["כתרים", "تيجان", "crowns"],
  ["שחזורים אסתטיים", "ترميمات تجميلية", "Aesthetic restorations"],
  ["בשירות איכותי ומקצועי", "بخدمة مهنية عالية", "professional quality care"],
  ["בחיפה ב", "في حيفا في ", "in Haifa on "],
];

const TONE: Record<Locale, string> = {
  ar: "لهجة فلسطينية بيتيّة، دافية، بلا فصحى ثقيلة وبلا إنجليزي",
  he: "עברית ישירה, בלי סלנג מזויף",
  en: "Direct, plain English. No fake slang.",
};

function indexFor(locale: Locale): 0 | 1 | 2 {
  if (locale === "ar") return 1;
  if (locale === "en") return 2;
  return 0;
}

export function localizePublishedFact(value: string, locale: Locale): string {
  const src = String(value || "").trim();
  if (!src) return "";
  const target = indexFor(locale);
  let out = src;
  const ordered = [...PAIRS].sort((a, b) => Math.max(a[0].length, a[1].length, a[2].length) - Math.max(b[0].length, b[1].length, b[2].length)).reverse();
  for (const pair of ordered) {
    const dest = pair[target];
    for (let i = 0; i < 3; i++) {
      if (i === target) continue;
      const from = pair[i];
      if (!from || from === dest) continue;
      if (out.includes(from)) out = out.split(from).join(dest);
    }
  }
  out = out.replace(/([\u0600-\u06FF])\s*ו([\u0600-\u06FF])/g, "$1 و$2");
  return out.replace(/\s+/g, " ").trim();
}

function rewriteField(value: string, locale: Locale): string {
  return localizePublishedFact(value, locale);
}

const PALESTINIAN_TONE_RE = /فلسطين|palestinian|ערבית מדוברת|لهجة/i;

/** Apply UI locale to scanned intake: Arabic UI gets Arabic facts + Palestinian dialect. */
export function hydrateScanIntake(intake: Intake, locale: Locale): Intake {
  let next = lockDefaultDialect(intake, locale);
  const voice = normalizeVoice(next.voice);
  next = {
    ...next,
    businessName: rewriteField(next.businessName, locale) || next.businessName,
    category: rewriteField(next.category, locale) || next.category,
    description: rewriteField(next.description, locale) || next.description,
    location: rewriteField(next.location, locale) || next.location,
    uniqueAdvantage: rewriteField(next.uniqueAdvantage, locale) || next.uniqueAdvantage,
    brandPositioning: rewriteField(next.brandPositioning, locale) || next.brandPositioning,
    landingLines: rewriteField(next.landingLines, locale) || next.landingLines,
    audience: next.audienceCustom || /[,\u0590-\u05FF\u0600-\u06FF]/.test(next.audience)
      ? rewriteField(next.audience, locale) || next.audience
      : next.audience,
  };
  const clinic = detectVertical(next) === "clinic";
  if (!next.brandTone.trim() || (locale === "ar" && !PALESTINIAN_TONE_RE.test(next.brandTone))) {
    if (locale === "ar" || clinic) next.brandTone = TONE[locale];
  } else {
    next.brandTone = rewriteField(next.brandTone, locale) || next.brandTone;
  }
  next.voice = {
    ...emptyVoice(),
    ...voice,
    dialect: voice.dialect || (locale === "ar" ? "ar-palestinian" : voice.dialect),
    niche: rewriteField(voice.niche || next.category, locale) || next.category,
    audience: rewriteField(voice.audience || next.audience, locale) || next.audience,
    coreMessage: rewriteField(voice.coreMessage || next.uniqueAdvantage || next.description, locale) || next.uniqueAdvantage || next.description,
    personalVoice: rewriteField(voice.personalVoice || next.brandTone, locale) || next.brandTone,
  };
  if (!next.offerSkipConfirmed) {
    next = attachScanOffer(next, locale);
  }
  return next;
}
