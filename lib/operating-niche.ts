/**
 * SAWEK AD charter niches. Detection uses published site facts only —
 * never invents a vertical. Unsupported businesses are gated, not guessed.
 */
import type { Intake, Locale } from "./types";
import { intakeIsClinicDemo } from "./clinic-leak";
import { detectVertical, type VerticalFacts } from "./vertical";

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
  /חדר כושר|\bgym\b|fitness studio|pilates|פילאטיס|yoga studio|יוגה|بوتيك رياضي|استوديو رياضي|نادي رياضي|crossfit|קרוספיט|אימון אישי|مدرب شخصي|personal trainer|boutique (fitness|studio)|studio (fitness|pilates|yoga)/i;

const HOME_TRADES_RE =
  /שיפוצ|ترميم|renovat|\bcontractor\b|קבלן|مقاول|אינסטל|سباك|\bplumb|\bחשמל|كهرب|electric|מיזוג|تكييف|\bhvac\b|צביעה|دهان|\bpaint|ריצוף|بلاط|גגות|\broof|גבס|جبس|אלומיניום|المنيوم|handyman|הנדימן|עבודות בית|home (trade|repair)|שפכטל|טיח/i;

const TUTOR_RE =
  /tutoring|שיעורי עזר|دروس خصوصية|מורה פרטי|معلم خصوصي|מרכז למידה|مركز تعليمي|הכנה לבגרות|توجيهي|בגרויות|private tutor|معهد تعليمي/i;

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
  if (v === "school" || TUTOR_RE.test(text)) return "education";
  if (v === "restaurant") return "restaurant";
  if (FITNESS_RE.test(text)) return "fitness_studio";
  if (HOME_TRADES_RE.test(text)) return "home_trades";
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
    medical_clinic: { he: "מרפאה / שיניים / אסתטיקה רפואית", ar: "عيادة / أسنان / تجميل طبي", en: "Medical / dental / aesthetic clinic" },
    education: { he: "שיעורים פרטיים / חינוך מקומי", ar: "دروس خصوصية / تعليم محلي", en: "Tutoring / local education" },
    restaurant: { he: "מסעדה / בית קפה", ar: "مطعم / مقهى", en: "Restaurant / café" },
    home_trades: { he: "שיפוצים / קבלנים / מקצועות הבית", ar: "ترميم / مقاولون / حرف البيت", en: "Renovation / contractors / home trades" },
    fitness_studio: { he: "סטודיו כושר בוטיק", ar: "ستوديو لياقة مستقل", en: "Boutique fitness studio" },
    unsupported: { he: "מחוץ לחמש הנישות", ar: "برّات الخمس تخصّصات", en: "Outside the five niches" },
  };
  return labels[n][locale];
}
