/**
 * SAWEK AD charter niches. Detection uses published site facts only —
 * never invents a vertical. Unsupported businesses are gated, not guessed.
 *
 * Avoid: beauty-salon ops, UAE/real-estate brokerages, generic creators,
 * grocery/fashion retail as a product line, delivery aggregators as the business.
 */
import type { Intake, Locale } from "./types";
import { intakeIsClinicDemo } from "./clinic-leak";
import { detectVertical, isPlasticAestheticClinic, type VerticalFacts } from "./vertical";

export type CharterNiche =
  | "medical_clinic"
  | "education"
  | "restaurant"
  | "home_trades"
  | "fitness_studio";

export type OperatingNiche = CharterNiche | "unsupported";

export const CHARTER_NICHES: readonly CharterNiche[] = [
  "medical_clinic",
  "education",
  "restaurant",
  "home_trades",
  "fitness_studio",
] as const;

const FITNESS_RE =
  /חדר כושר|\bgym\b|fitness studio|pilates|פילאטיס|yoga studio|יוגה|بوتيك رياضي|استوديو رياضي|نادي رياضي|crossfit|קרוספיט|אימון אישי|مدرب شخصي|personal trainer|boutique (fitness|studio)|studio (fitness|pilates|yoga)|independent studio/i;

const HOME_TRADES_RE =
  /שיפוצ|ترميم|renovat|\bcontractor\b|קבלן|مقاول|אינסטל|سباك|\bplumb|\bחשמל|كهرب|electric|מיזוג|تكييف|\bhvac\b|צביעה|دهان|\bpaint|ריצוף|بلاط|גגות|\broof|גבס|جبس|אלומיניום|المنيوم|handyman|הנדימן|עבודות בית|home (trade|repair)|שפכטל|טיח/i;

const TUTOR_RE =
  /tutoring|שיעורי עזר|دروس خصوصية|מורה פרטי|معلم خصوصي|מרכז למידה|مركز تعليمي|הכנה לבגרות|توجيهي|בגרויות|private tutor|معهد تعليمي/i;

const DELIVERY_AGGREGATOR_RE =
  /\btalabat\b|\bwolt\b|\bkeeta\b|hungerstation|hunger station|\bdeliveroo\b|\bdoordash\b|\bubereats\b|uber eats|تطبيق توصيل فقط/i;

function hay(facts: VerticalFacts): string {
  return `${facts.businessName ?? ""} ${facts.category ?? ""} ${facts.description ?? ""}`;
}

export function isCharterNiche(n: OperatingNiche): n is CharterNiche {
  return n !== "unsupported";
}

export function resolveOperatingNiche(facts: VerticalFacts): OperatingNiche {
  const v = detectVertical(facts);
  const text = hay(facts);
  if (DELIVERY_AGGREGATOR_RE.test(text) && v !== "restaurant") return "unsupported";
  if (v === "clinic" || isPlasticAestheticClinic(facts)) return "medical_clinic";
  if (v === "school" || TUTOR_RE.test(text)) return "education";
  if (v === "restaurant") {
    if (DELIVERY_AGGREGATOR_RE.test(`${facts.businessName ?? ""} ${facts.category ?? ""}`)) {
      return "unsupported";
    }
    return "restaurant";
  }
  if (FITNESS_RE.test(text)) return "fitness_studio";
  if (HOME_TRADES_RE.test(text)) return "home_trades";
  return "unsupported";
}

/** Why this scan is outside the operator — never a fake “specialties of this business” list. */
export function nicheOutsideReason(facts: VerticalFacts, locale: Locale): string {
  const text = hay(facts);
  const salon = /salon|מספרה|صالون|حلاق|barber|תספורת|צבע שיער/i.test(text);
  const grocery = /سوبر\s*ماركت|مقاضي|بقالة|מכולת|סופרמרקט|\bgrocery\b|\bsupermarket\b/i.test(text);
  const realty = /נדל["״']?ן|תיווך|عقارات|مكتب عقاري|realtor|real\s*estate/i.test(text);
  const creator = /content creator|يوتيوب|טיקטוק|YouTube and TikTok/i.test(text);
  if (locale === "ar") {
    if (salon) return "هالنشاط صالون/حلاقة — مش عيادة طبية. التطبيق ما بيبني له حملة.";
    if (grocery) return "هالنشاط سوبرماركت/تجزئة — برّات تخصص التطبيق.";
    if (realty) return "هالنشاط مكتب عقاري — برّات تخصص التطبيق.";
    if (creator) return "هالنشاط صناعة محتوى عامة — برّات تخصص التطبيق.";
    return "مسحنا اللي انكتب بالموقع وما طلع عيادة طبية، ولا مطعم، ولا تعليم، ولا حرف بيت، ولا ستوديو لياقة — فما منبني حملة.";
  }
  if (locale === "he") {
    if (salon) return "זה מספרה/סלון — לא מרפאה. לא בונים קמפיין.";
    if (grocery) return "זה סופר/קמעונאות — מחוץ להתמחות.";
    if (realty) return "זה תיווך נדל״ן — מחוץ להתמחות.";
    if (creator) return "זה יוצר תוכן כללי — מחוץ להתמחות.";
    return "הסריקה לא זיהתה מרפאה, מסעדה, חינוך, מקצועות בית או סטודיו כושר — לכן לא בונים קמפיין.";
  }
  if (salon) return "This is a salon/barber — not a medical clinic. The app will not build a campaign.";
  if (grocery) return "This is grocery/retail — outside the operator’s specialty.";
  if (realty) return "This is a real-estate brokerage — outside the operator’s specialty.";
  if (creator) return "This is generic creator work — outside the operator’s specialty.";
  return "The scan did not identify a medical clinic, restaurant, tutoring center, home trade, or fitness studio — so we will not build a campaign.";
}

/** Clinic demo is the medical-niche example. Other demos must still match a charter niche. */
export function bypassNicheGate(intake: Intake): boolean {
  return intakeIsClinicDemo(intake);
}

export function charterAllowsCampaign(intake: Intake): boolean {
  if (bypassNicheGate(intake)) return true;
  if (!intake.businessName.trim() && !intake.website.trim() && !intake.description.trim()) return true;
  return isCharterNiche(resolveOperatingNiche(intake));
}

export function nicheLabel(n: OperatingNiche, locale: Locale): string {
  const labels: Record<OperatingNiche, Record<Locale, string>> = {
    medical_clinic: { he: "מרפאה / שיניים / אסתטיקה רפואית", ar: "عيادة / أسنان / تجميل طبي", en: "Medical / dental / aesthetic clinic" },
    education: { he: "מרכז למידה / חינוך מקומי", ar: "مركز تعليمي / تعليم محلي", en: "Tutoring center / local education" },
    restaurant: { he: "מסעדה / בית קפה (רכישה בבעלות)", ar: "مطعم / مقهى (اكتساب نملكه)", en: "Restaurant / café (owned acquisition)" },
    home_trades: { he: "שיפוצים / קבלנים / מקצועות הבית", ar: "ترميم / مقاولون / حرف البيت", en: "Renovation / contractors / home trades" },
    fitness_studio: { he: "סטודיו כושר בוטיק / עצמאי", ar: "ستوديو لياقة مستقل", en: "Boutique fitness / independent studio" },
    unsupported: { he: "מחוץ לחמש הנישות", ar: "برّات الخمس تخصّصات", en: "Outside the five niches" },
  };
  return labels[n][locale];
}
