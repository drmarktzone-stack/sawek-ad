import type { Locale } from "./types";

export interface ChipOption {
  id: string;
  custom?: boolean;
  label: Record<Locale, string>;
}

export const TYPE_OPTIONS: ChipOption[] = [
  { id: "business", label: { he: "עסק", ar: "عمل", en: "Business" } },
  { id: "product", label: { he: "מוצר", ar: "منتج", en: "Product" } },
  { id: "service", label: { he: "שירות", ar: "خدمة", en: "Service" } },
  { id: "app", label: { he: "אפליקציה", ar: "تطبيق", en: "App" } },
  { id: "personal", label: { he: "מותג אישי", ar: "علامة شخصية", en: "Personal brand" } },
];

export const DEPTH_OPTIONS: ChipOption[] = [
  { id: "quick", label: { he: "קמפיין מהיר", ar: "حملة سريعة", en: "Quick campaign" } },
  { id: "deep", label: { he: "קמפיין מעמיק", ar: "حملة معمّقة", en: "Deep campaign" } },
];

export const AUDIENCE_CHIPS: ChipOption[] = [
  { id: "local_families", label: { he: "משפחות מקומיות", ar: "عائلات محلية", en: "Local families" } },
  { id: "parents", label: { he: "הורים", ar: "أهل", en: "Parents" } },
  { id: "owners", label: { he: "בעלי עסקים", ar: "أصحاب أعمال", en: "Business owners" } },
  { id: "young", label: { he: "צעירים 18–34", ar: "شباب 18–34", en: "Young adults 18–34" } },
  { id: "women", label: { he: "נשים 25–45", ar: "نساء 25–45", en: "Women 25–45" } },
  { id: "men", label: { he: "גברים 30–55", ar: "رجال 30–55", en: "Men 30–55" } },
  { id: "custom", custom: true, label: { he: "כתוב בעצמך", ar: "اكتب بنفسك", en: "Write your own" } },
];

export const PROBLEM_CHIPS: ChipOption[] = [
  { id: "unknown", label: { he: "לא מכירים את העסק", ar: "الناس مش عارفين العيادة", en: "People don't know we exist" } },
  { id: "trust", label: { he: "אין אמון במפרסמים", ar: "ضعف الثقة بالمعلنين", en: "Low trust in ads" } },
  { id: "price", label: { he: "מחיר נתפס כיקר", ar: "السعر يبدو مرتفعاً", en: "Price feels high" } },
  { id: "competition", label: { he: "תחרות חזקה באזור", ar: "منافسة قوية في المنطقة", en: "Strong local competition" } },
  { id: "delay", label: { he: "דוחים החלטה / תור", ar: "بستَنّوا وما بيسجّلوا", en: "They delay the decision" } },
  { id: "custom", custom: true, label: { he: "כתוב בעצמך", ar: "اكتب بنفسك", en: "Write your own" } },
];

export const ADVANTAGE_CHIPS: ChipOption[] = [
  { id: "personal", label: { he: "שירות אישי", ar: "خدمة شخصية", en: "Personal service" } },
  { id: "bilingual", label: { he: "שירות דו-לשוני", ar: "خدمة ثنائية اللغة", en: "Bilingual service" } },
  { id: "location", label: { he: "מיקום נוח", ar: "موقع مريح", en: "Convenient location" } },
  { id: "experience", label: { he: "ניסיון מקצועי", ar: "خبرة مهنية", en: "Professional experience" } },
  { id: "availability", label: { he: "זמינות גבוהה", ar: "توفّر عالٍ", en: "High availability" } },
  { id: "custom", custom: true, label: { he: "כתוב בעצמך", ar: "اكتب بنفسك", en: "Write your own" } },
];

export const GOAL_CHIPS: ChipOption[] = [
  { id: "leads", label: { he: "לידים", ar: "عملاء محتملون", en: "Leads" } },
  { id: "walk_in", label: { he: "ביקור לפי סדר הגעה (בלי תור)", ar: "جت أولاً بدون مواعيد", en: "Walk-in (no appointment)" } },
  { id: "bookings", label: { he: "תורים / הזמנות", ar: "مواعيد / حجوزات", en: "Bookings" } },
  { id: "sales", label: { he: "מכירות", ar: "مبيعات", en: "Sales" } },
  { id: "awareness", label: { he: "מודעות למותג", ar: "وعي بالعلامة", en: "Awareness" } },
  { id: "installs", label: { he: "הורדות אפליקציה", ar: "تنزيلات التطبيق", en: "App installs" } },
  { id: "custom", custom: true, label: { he: "כתוב בעצמך", ar: "اكتب بنفسك", en: "Write your own" } },
];

/** Default selected offer is "אין מבצע" / "لا يوجد عرض". Free consult / discount are optional, never default. */
export const OFFER_CHIPS: ChipOption[] = [
  { id: "no_offer", label: { he: "אין מבצע", ar: "لا يوجد عرض", en: "No offer" } },
  { id: "intro", label: { he: "פגישת היכרות", ar: "جلسة تعارف", en: "Intro meeting" } },
  { id: "bonus", label: { he: "בונוס ללקוח חדש", ar: "مكافأة للعميل الجديد", en: "New-customer bonus" } },
  { id: "limited", label: { he: "הנחה לזמן מוגבל", ar: "خصم لوقت محدود", en: "Limited-time discount" } },
  { id: "custom", custom: true, label: { he: "כתוב בעצמך", ar: "اكتب بنفسك", en: "Write your own" } },
];

export const DEFAULT_OFFER_HE = "אין מבצע";

export function resolveChipLabel(value: string, options: ChipOption[], locale: Locale): string {
  if (!value) return "";
  const hit = options.find((o) => o.id === value || Object.values(o.label).includes(value));
  if (hit && !hit.custom) return hit.label[locale];
  return value;
}

export function defaultOfferLabel(locale: Locale): string {
  return OFFER_CHIPS.find((o) => o.id === "no_offer")!.label[locale];
}

export function defaultOfferId(): string {
  return "no_offer";
}
