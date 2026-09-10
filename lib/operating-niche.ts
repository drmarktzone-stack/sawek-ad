/**
 * SAWEK AD charter niches. Detection uses published site facts only —
 * never invents a vertical. Unsupported businesses are gated, not guessed.
 */
import type { Intake, Locale } from "./types";
import { intakeIsClinicDemo } from "./clinic-leak";
import { detectVertical, type VerticalFacts } from "./vertical";

export type CharterNiche =
  | "medical_clinic"
  | "restaurant"
  | "beauty_salon"
  | "local_retail"
  | "real_estate";

export type OperatingNiche = CharterNiche | "unsupported";

export const CHARTER_NICHES: readonly CharterNiche[] = [
  "medical_clinic",
  "restaurant",
  "beauty_salon",
  "local_retail",
  "real_estate",
] as const;

const SALON_RE =
  /מספרה|salon|barber|حلاق|صالون|מכון יופי|مصفف|صبّاغ شعر|שיער|nails|ציפורן|מניקור|pedicure|يوغا وجه|beauty salon|hair (salon|dresser)|ברבר|كوافير/i;

const REAL_ESTATE_RE =
  /נדל["״']?ן|תיווך|מתווך|عقارات|\bعقار\b|مكتب عقاري|وكيل عقاري|realtor|real\s*estate|\bbroker\b|דירות למכירה|شقق للبيع|للبيع والإيجار|נכסים למכירה|property (broker|agent)|يسكن|השכרה ומכירה/i;

const APPLIANCE_RE =
  /מכשירי חשמל|أجهزة كهرب|كهربائيات|appliances|electronics store|כלי בית|أدوات منزلية|white goods|חנות אלקטרוניקה|محل أجهزة/i;

function hay(facts: VerticalFacts): string {
  return `${facts.businessName ?? ""} ${facts.category ?? ""} ${facts.description ?? ""}`;
}

export function isCharterNiche(n: OperatingNiche): n is CharterNiche {
  return n !== "unsupported";
}

export function resolveOperatingNiche(facts: VerticalFacts): OperatingNiche {
  const v = detectVertical(facts);
  const text = hay(facts);
  if (v === "clinic") return "medical_clinic";
  if (v === "restaurant") return "restaurant";
  if (SALON_RE.test(text)) return "beauty_salon";
  if (v === "retail" || APPLIANCE_RE.test(text)) return "local_retail";
  if (REAL_ESTATE_RE.test(text)) return "real_estate";
  return "unsupported";
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
    medical_clinic: { he: "מרפאה מקומית", ar: "عيادة محلية", en: "Local medical clinic" },
    restaurant: { he: "מסעדה / בית קפה / מאפייה", ar: "مطعم / مقهى / مخبز", en: "Restaurant / café / bakery" },
    beauty_salon: { he: "מספרה / ברבר / יופי", ar: "صالون / حلاق / تجميل", en: "Beauty salon / barber" },
    local_retail: { he: "קמעונאות מקומית (מכולת / בוטיק / מכשירים)", ar: "تجزئة محلية (بقالة / بوتيك / أجهزة)", en: "Local retail (grocery / boutique / appliances)" },
    real_estate: { he: "תיווך נדל״ן מקומי", ar: "مكتب عقاري محلي", en: "Local real estate broker" },
    unsupported: { he: "מחוץ לחמש הנישות", ar: "برّات الخمس تخصّصات", en: "Outside the five niches" },
  };
  return labels[n][locale];
}
