import type { Locale } from "../types";
import type { MedicalSpecialty, Tri } from "./types";

export const SPECIALTIES: {
  id: MedicalSpecialty;
  label: Tri;
  hint: Tri;
}[] = [
  {
    id: "family",
    label: { he: "רפואת משפחה", ar: "طب الأسرة", en: "Family medicine" },
    hint: { he: "מרפאה ראשונית / רופא קבוע", ar: "رعاية أولية", en: "Primary care / regular physician" },
  },
  {
    id: "peds",
    label: { he: "ילדים", ar: "أطفال", en: "Pediatrics" },
    hint: { he: "תינוקות, חיסונים, מעקב גדילה", ar: "رضّع وتطعيمات ونمو", en: "Infants, vaccines, growth follow-up" },
  },
  {
    id: "dental",
    label: { he: "שיניים", ar: "أسنان", en: "Dental" },
    hint: { he: "שימור, יישור, הלבנה — בלי הבטחות קליניות", ar: "حفظ وتقويم", en: "Conservative, ortho, whitening — no clinical promises" },
  },
  {
    id: "vet",
    label: { he: "וטרינריה", ar: "بيطرة", en: "Veterinary" },
    hint: { he: "חיות מחמד, חיסונים, ניתוחים", ar: "حيوانات أليفة", en: "Pets, vaccines, surgery" },
  },
  {
    id: "aesthetic",
    label: { he: "אסתטיקה", ar: "تجميل", en: "Aesthetic" },
    hint: { he: "עור ופנים — בלי «בלי כאב» אם לא נכתב", ar: "جلد ووجه", en: "Skin and face — no “painless” unless typed" },
  },
  {
    id: "physio",
    label: { he: "פיזיותרפיה", ar: "علاج طبيعي", en: "Physiotherapy" },
    hint: { he: "שיקום וכאב שריר-שלד", ar: "تأهيل وألم عضلي هيكلي", en: "Rehab and musculoskeletal pain" },
  },
  {
    id: "obgyn",
    label: { he: "נשים", ar: "نساء وتوليد", en: "OB/GYN" },
    hint: { he: "מעקב הריון, גינקולוגיה", ar: "حمل ونساء", en: "Pregnancy follow-up, gynecology" },
  },
  {
    id: "ent",
    label: { he: "אא״ג", ar: "أنف وأذن وحنجرة", en: "ENT" },
    hint: { he: "אוזן, אף, גרון", ar: "أذن وأنف وحنجرة", en: "Ear, nose, throat" },
  },
];

export interface LibraryService {
  id: string;
  name: Tri;
}

export const SERVICE_LIBRARY: Record<MedicalSpecialty, LibraryService[]> = {
  family: [
    { id: "checkup", name: { he: "בדיקה כללית", ar: "فحص عام", en: "General checkup" } },
    { id: "chronic", name: { he: "מעקב כרוני", ar: "متابعة مزمنة", en: "Chronic follow-up" } },
    { id: "acute", name: { he: "מחלה חדה", ar: "مرض حاد", en: "Acute illness" } },
  ],
  peds: [
    { id: "growth", name: { he: "מעקב גדילה והתפתחות", ar: "متابعة النمو", en: "Growth & development visit" } },
    { id: "vaccines", name: { he: "חיסוני שגרה", ar: "تطعيمات روتينية", en: "Routine vaccines" } },
    { id: "fever", name: { he: "חום / מחלה חדה", ar: "حرارة / مرض حاد", en: "Fever / acute illness" } },
    { id: "newborn", name: { he: "ביקורת יילוד", ar: "فحص وليد", en: "Newborn visit" } },
  ],
  dental: [
    { id: "hygiene", name: { he: "היגיינה ושימור", ar: "حفظ ونظافة", en: "Hygiene & conservative care" } },
    { id: "whitening", name: { he: "הלבנה", ar: "تبييض", en: "Whitening" } },
    { id: "ortho", name: { he: "יישור", ar: "تقويم", en: "Orthodontics" } },
  ],
  vet: [
    { id: "vax", name: { he: "חיסוני חיות", ar: "تطعيمات الحيوانات", en: "Pet vaccines" } },
    { id: "wellness", name: { he: "בדיקה שנתית", ar: "فحص سنوي", en: "Annual wellness" } },
    { id: "surgery", name: { he: "ניתוח מתוכנן", ar: "جراحة مخططة", en: "Planned surgery" } },
  ],
  aesthetic: [
    { id: "consult", name: { he: "ייעוץ עור/פנים", ar: "استشارة جلد/وجه", en: "Skin/face consult" } },
    { id: "inject", name: { he: "טיפול הזרקה (כפי שתואר)", ar: "حقن كما وُصف", en: "Injectable (as described)" } },
  ],
  physio: [
    { id: "assess", name: { he: "אבחון פיזיותרפי", ar: "تقييم علاج طبيعي", en: "Physio assessment" } },
    { id: "rehab", name: { he: "שיקום", ar: "تأهيل", en: "Rehab series" } },
  ],
  obgyn: [
    { id: "preg", name: { he: "מעקב הריון", ar: "متابعة حمل", en: "Pregnancy follow-up" } },
    { id: "gyn", name: { he: "בדיקה גינקולוגית", ar: "فحص نسائي", en: "Gynecology visit" } },
  ],
  ent: [
    { id: "ear", name: { he: "אוזן / שמיעה", ar: "أذن / سمع", en: "Ear / hearing" } },
    { id: "sinus", name: { he: "אף / סינוסים", ar: "أنف / جيوب", en: "Nose / sinuses" } },
  ],
};

export function specialtyLabel(id: MedicalSpecialty, locale: Locale): string {
  return SPECIALTIES.find((s) => s.id === id)?.label[locale] ?? id;
}
