import type { Intake, Locale } from "./types";
import { detectVertical, isProductLike, showsHmoAudience, unknownProblemLabel } from "./vertical";

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
  { id: "app_users", label: { he: "משתמשי האפליקציה", ar: "مستخدمو التطبيق", en: "App users" } },
  { id: "clalit", label: { he: "כללית", ar: "كلاليت", en: "Clalit" } },
  { id: "maccabi", label: { he: "מכבי", ar: "مكابي", en: "Maccabi" } },
  { id: "meuhedet", label: { he: "מאוחדת", ar: "مئوحيدت", en: "Meuhedet" } },
  { id: "leumit", label: { he: "לאומית", ar: "لئوميت", en: "Leumit" } },
  { id: "switch_clalit", label: { he: "רוצים לעבור לכללית", ar: "بدهم ينقلوا لكلاليت", en: "Switching to Clalit" } },
  { id: "owners", label: { he: "בעלי עסקים", ar: "أصحاب أعمال", en: "Business owners" } },
  { id: "young", label: { he: "צעירים 18–34", ar: "شباب 18–34", en: "Young adults 18–34" } },
  { id: "women", label: { he: "נשים 25–45", ar: "نساء 25–45", en: "Women 25–45" } },
  { id: "men", label: { he: "גברים 30–55", ar: "رجال 30–55", en: "Men 30–55" } },
  { id: "custom", custom: true, label: { he: "כתוב בעצמך", ar: "اكتب بنفسك", en: "Write your own" } },
];

export type KupaAudienceId = "clalit" | "maccabi" | "meuhedet" | "leumit" | "switch_clalit";

/** Other-kupa / switch-to-Clalit from chip id or typed labels (مكابي / مئوحيدت / لئوميت). */
function detectOneKupa(v: string): KupaAudienceId | null {
  const t = v.trim();
  if (!t) return null;
  if (t === "maccabi" || /مكابي|מכבי/i.test(t) || /^maccabi$/i.test(t)) return "maccabi";
  if (t === "meuhedet" || /مئوحيدت|مئوحيديت|מאוחדת/i.test(t) || /^meuhedet$/i.test(t)) return "meuhedet";
  if (t === "leumit" || /لئوميت|לאומית/i.test(t) || /^leumit$/i.test(t)) return "leumit";
  if (
    t === "switch_clalit" ||
    /ينقلوا لكلاليت|לעבור לכללית|switch(?:ing)? to clalit/i.test(t)
  ) {
    return "switch_clalit";
  }
  if (t === "clalit" || /^(كلاليت|כללית|clalit)$/i.test(t)) return "clalit";
  return null;
}

export function detectKupaAudience(audience: string): KupaAudienceId | null {
  const v = audience.trim();
  if (!v) return null;
  const one = detectOneKupa(v);
  if (one) return one;
  for (const part of splitChipTokens(v)) {
    const hit = detectOneKupa(part);
    if (hit) return hit;
  }
  return null;
}

export const CHANNEL_CHIPS: ChipOption[] = [
  { id: "facebook", label: { he: "פייסבוק", ar: "فيسبوك", en: "Facebook" } },
  { id: "instagram", label: { he: "אינסטגרם", ar: "إنستغرام", en: "Instagram" } },
  { id: "tiktok", label: { he: "טיקטוק", ar: "تيك توك", en: "TikTok" } },
  { id: "youtube", label: { he: "יוטיוב", ar: "يوتيوب", en: "YouTube" } },
  { id: "whatsapp", label: { he: "וואטסאפ", ar: "واتساب", en: "WhatsApp" } },
];

export const PROBLEM_CHIPS: ChipOption[] = [
  { id: "unknown", label: { he: "לא מכירים את העסק", ar: "الناس مش عارفين المحل", en: "People don't know we exist" } },
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

const LEGACY_CLINIC_UNKNOWN = new Set([
  "الناس مش عارفين العيادة",
  "לא מכירים את המרפאה",
  "People don't know the clinic",
]);

export function splitChipTokens(value: string): string[] {
  return String(value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function findChipOption(token: string, options: ChipOption[]): ChipOption | undefined {
  const normalized = LEGACY_CLINIC_UNKNOWN.has(token) ? "unknown" : token;
  return options.find(
    (o) =>
      !o.custom &&
      (o.id === normalized || Object.values(o.label).includes(normalized) || Object.values(o.label).includes(token)),
  );
}

export function parseChipField(value: string, options: ChipOption[]): { ids: string[]; customText: string } {
  const ids: string[] = [];
  const customParts: string[] = [];
  for (const tok of splitChipTokens(value)) {
    const hit = findChipOption(tok, options);
    if (hit) {
      if (!ids.includes(hit.id)) ids.push(hit.id);
    } else {
      customParts.push(tok);
    }
  }
  return { ids, customText: customParts.join(", ") };
}

export function formatChipField(ids: string[], customText: string): string {
  const parts = [...ids.filter(Boolean)];
  const c = customText.trim();
  if (c) parts.push(c);
  return parts.join(",");
}

export function hasChipId(value: string, id: string): boolean {
  return splitChipTokens(value).includes(id);
}

export function chipIsSelected(value: string, opt: ChipOption, options: ChipOption[], showCustom?: boolean): boolean {
  if (opt.custom) return Boolean(showCustom);
  return parseChipField(value, options).ids.includes(opt.id);
}

/** Toggle a chip. Multi adds/removes; single replaces. Clicking a selected multi chip turns it off. */
export function toggleChipValue(value: string, opt: ChipOption, options: ChipOption[], multi: boolean): string {
  if (opt.custom) return value;
  const { ids, customText } = parseChipField(value, options);
  if (!multi) return opt.id;
  if (opt.id === "no_offer") {
    return ids.includes("no_offer") ? formatChipField([], customText) : "no_offer";
  }
  let next = ids.filter((id) => id !== "no_offer");
  if (next.includes(opt.id)) next = next.filter((id) => id !== opt.id);
  else next = [...next, opt.id];
  return formatChipField(next, customText);
}

export function joinSpokenList(parts: string[], locale: Locale): string {
  const clean = parts.map((s) => s.trim()).filter(Boolean);
  if (!clean.length) return "";
  if (clean.length === 1) return clean[0];
  if (locale === "he") return clean.join(" ו- ");
  if (locale === "ar") return clean.join(" و ");
  if (clean.length === 2) return `${clean[0]} and ${clean[1]}`;
  return `${clean.slice(0, -1).join(", ")}, and ${clean[clean.length - 1]}`;
}

function resolveOneChip(value: string, options: ChipOption[], locale: Locale): string {
  if (!value) return "";
  const normalized = LEGACY_CLINIC_UNKNOWN.has(value) ? "unknown" : value;
  const hit = options.find(
    (o) => o.id === normalized || Object.values(o.label).includes(normalized) || Object.values(o.label).includes(value),
  );
  if (hit && !hit.custom) return hit.label[locale];
  return value;
}

export function resolveChipLabel(value: string, options: ChipOption[], locale: Locale): string {
  if (!value) return "";
  if (!value.includes(",")) return resolveOneChip(value, options, locale);
  const { ids, customText } = parseChipField(value, options);
  const labels = ids.map((id) => resolveOneChip(id, options, locale));
  if (customText) labels.push(customText);
  if (!labels.length) return value;
  return joinSpokenList(labels, locale);
}

export function defaultOfferLabel(locale: Locale): string {
  return OFFER_CHIPS.find((o) => o.id === "no_offer")!.label[locale];
}

export function defaultOfferId(): string {
  return "no_offer";
}

const HMO_AUDIENCE_IDS = new Set(["clalit", "maccabi", "meuhedet", "leumit", "switch_clalit"]);

const PRODUCT_AUDIENCE_IDS = new Set(["parents", "local_families", "app_users", "custom"]);

/** HMO chips only for clinic / hydro pool. Product sites: parents / families / app users — never כללית. */
export function audienceChipsFor(intake: Pick<Intake, "businessName" | "category" | "description">): ChipOption[] {
  if (isProductLike(intake)) {
    return AUDIENCE_CHIPS.filter((c) => PRODUCT_AUDIENCE_IDS.has(c.id));
  }
  if (showsHmoAudience(intake)) return AUDIENCE_CHIPS.filter((c) => c.id !== "app_users");
  return AUDIENCE_CHIPS.filter((c) => !HMO_AUDIENCE_IDS.has(c.id) && c.id !== "app_users");
}

export function problemLabelFor(intake: Pick<Intake, "businessName" | "category" | "description">, options: ChipOption[]): ChipOption[] {
  const v = detectVertical(intake);
  return options.map((c) => (c.id === "unknown" ? { ...c, label: unknownProblemLabel(v) } : c));
}
