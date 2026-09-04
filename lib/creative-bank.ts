import type { Intake, Locale } from "./types";
import type { Vertical } from "./vertical";
import { detectVertical } from "./vertical";
import { isNoOffer } from "./no-offer";

export type CreativeChannel = "facebook" | "instagram" | "whatsapp" | "landing" | "story" | "reels" | "flyer";

export type LayoutShape = "square" | "story" | "reels" | "flyer" | "hero" | "quote";

export interface LayoutSpec {
  id: string;
  channel: CreativeChannel;
  shape: LayoutShape;
  sale?: boolean;
  name: Record<Locale, string>;
}

function L(he: string, ar: string, en: string): Record<Locale, string> {
  return { he, ar, en };
}

function fill(template: string, intake: Intake, locale: Locale): string {
  const name = (intake.businessName || "").trim() || (locale === "he" ? "העסק" : locale === "ar" ? "المحل" : "the business");
  const problem = (intake.biggestProblem || "").trim();
  const advantage = (intake.uniqueAdvantage || "").trim();
  const offer = isNoOffer(intake.offer) ? "" : (intake.offer || "").trim();
  return template
    .replaceAll("{name}", name)
    .replaceAll("{problem}", problem)
    .replaceAll("{advantage}", advantage)
    .replaceAll("{offer}", offer)
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,!?])/g, "$1")
    .trim();
}

const HOOKS: Record<Vertical, Record<Locale, string[]>> = {
  retail: {
    he: [
      "{name} — אופנה במקום, בלי סיפור מומצא.",
      "{problem} {name} למי שמחפש מותגים אמיתיים.",
      "{advantage}",
      "{offer} {name}",
      "בואו לחנות. מה שעל המדף — מה שכתוב.",
    ],
    ar: [
      "{name} — أزياء بالمحل، بلا قصة مختلقة.",
      "{problem} {name} للي بدهم ماركات حقيقية.",
      "{advantage}",
      "{offer} {name}",
      "تعوا ع المحل. اللي عالرف هو المكتوب.",
    ],
    en: [
      "{name} — fashion in-store, no invented story.",
      "{problem} {name} for people hunting real brands.",
      "{advantage}",
      "{offer} {name}",
      "Come to the store. What's on the rack is what's written.",
    ],
  },
  restaurant: {
    he: ["{name} — המטבח המקומי.", "{problem}", "{advantage}", "בואו למסעדה היום.", "{offer}"],
    ar: ["{name} — مطبخ الحي.", "{problem}", "{advantage}", "تعوا ع المطعم اليوم.", "{offer}"],
    en: ["{name} — the local kitchen.", "{problem}", "{advantage}", "Come to the restaurant today.", "{offer}"],
  },
  pool: {
    he: ["{name} — מים וטיפול, בלי הבטחות רפואיות שלא נאמרו.", "{problem}", "{advantage}", "בואו לבריכה."],
    ar: ["{name} — مي وعلاج، بلا وعود طبية ما انقالت.", "{problem}", "{advantage}", "تعوا ع المسبح."],
    en: ["{name} — water and care, no unstated medical promises.", "{problem}", "{advantage}", "Visit the pool."],
  },
  clinic: {
    he: ["{name}", "{problem}", "{advantage}", "הגיעו למרפאה."],
    ar: ["{name}", "{problem}", "{advantage}", "تعوا عالعيادة."],
    en: ["{name}", "{problem}", "{advantage}", "Come to the clinic."],
  },
  product: {
    he: ["{name}", "{problem}", "{advantage}", "הצטרפו לכלים — בלי מחיר שלא פורסם."],
    ar: ["{name}", "{problem}", "{advantage}", "انضموا للأدوات — بلا سعر غير منشور."],
    en: ["{name}", "{problem}", "{advantage}", "Join the tools — no unpublished price."],
  },
  school: {
    he: ["{name}", "{problem}", "{advantage}", "הרשמה — בלי מבצע לימודים מומצא."],
    ar: ["{name}", "{problem}", "{advantage}", "تسجيل — بلا عرض دراسي مختلق."],
    en: ["{name}", "{problem}", "{advantage}", "Enrollment — no invented tuition offer."],
  },
  generic: {
    he: ["{name}", "{problem}", "{advantage}", "{offer}"],
    ar: ["{name}", "{problem}", "{advantage}", "{offer}"],
    en: ["{name}", "{problem}", "{advantage}", "{offer}"],
  },
};

const ANGLES: Record<Vertical, Record<Locale, string[]>> = {
  retail: {
    he: ["מותגים על המדף", "מיקום נוח", "מבצע שפורסם באתר בלבד", "קהל שאוהב אופנה", "חיסול רק אם פורסם בקליטה"],
    ar: ["ماركات عالرف", "موقع مريح", "عرض منشور بالموقع فقط", "جمهور بحب الأزياء", "تصفية فقط إذا انذكرت بالكِليطة"],
    en: ["brands on the rack", "convenient location", "on-site published offer only", "fashion-seeking audience", "clearance only if published in intake"],
  },
  restaurant: {
    he: ["רעב ומשלוח", "תפריט היום", "פיצה / מנה שפורסמה", "הזמנה עכשיו"],
    ar: ["جوع وتوصيل", "قائمة اليوم", "بيتزا / وجبة منشورة", "اطلبوا الآن"],
    en: ["hunger & delivery", "today's menu", "pizza / published dish", "order now"],
  },
  pool: {
    he: ["מים", "משפחה", "טיפול שצוין"],
    ar: ["مي", "عائلة", "علاج مذكور"],
    en: ["water", "family", "stated care"],
  },
  clinic: {
    he: ["אמון", "הגעה", "שעות שסופקו"],
    ar: ["ثقة", "وصول", "ساعات معطاة"],
    en: ["trust", "arrival", "hours you supplied"],
  },
  product: {
    he: ["כאב שחולץ", "יתרון שחולץ", "בלי ROAS"],
    ar: ["ألم مستخرج", "ميزة مستخرجة", "بلا ROAS"],
    en: ["extracted pain", "extracted advantage", "no ROAS"],
  },
  school: {
    he: ["הרשמה", "קהילה", "חשיפה"],
    ar: ["تسجيل", "مجتمع", "تعرّض"],
    en: ["enrollment", "community", "exposure"],
  },
  generic: {
    he: ["היכרות", "יתרון שסופק", "CTA ישר"],
    ar: ["تعارف", "ميزة معطاة", "نداء مباشر"],
    en: ["awareness", "stated advantage", "direct CTA"],
  },
};

const CTAS: Record<Vertical, Record<Locale, string[]>> = {
  retail: {
    he: ["בואו לחנות", "פתחו את האתר", "שאלו בוואטסאפ"],
    ar: ["تعوا ع المحل", "افتحوا الموقع", "اسألوا بالواتساب"],
    en: ["Come to the store", "Open the site", "Ask on WhatsApp"],
  },
  restaurant: {
    he: ["הזמינו עכשיו", "להזמנה באתר", "הזמינו בטלפון"],
    ar: ["اطلبوا الآن", "للطلب بالموقع", "اطلبوا عالهاتف"],
    en: ["Order now", "Order on the site", "Order by phone"],
  },
  pool: {
    he: ["בואו לבריכה", "וואטסאפ"],
    ar: ["تعوا ع المسبح", "واتساب"],
    en: ["Visit the pool", "WhatsApp"],
  },
  clinic: {
    he: ["הגיעו למרפאה", "וואטסאפ (לא לחירום)"],
    ar: ["تعوا عالعيادة", "واتساب (مش للطوارئ)"],
    en: ["Come to the clinic", "WhatsApp (not ER)"],
  },
  product: {
    he: ["הצטרפו", "לאתר"],
    ar: ["انضموا", "للموقع"],
    en: ["Join", "Visit the site"],
  },
  school: {
    he: ["הרשמה", "צרו קשר"],
    ar: ["تسجيل", "تواصلوا"],
    en: ["Enroll", "Get in touch"],
  },
  generic: {
    he: ["צרו קשר", "בואו לבקר"],
    ar: ["تواصلوا", "تعوا زورونا"],
    en: ["Contact us", "Visit us"],
  },
};

const LAYOUTS: LayoutSpec[] = [
  { id: "feed-square", channel: "facebook", shape: "square", name: L("פיד מרובע", "فيد مربع", "Feed square") },
  { id: "ig-square", channel: "instagram", shape: "square", name: L("אינסטגרם מרובע", "إنستغرام مربع", "Instagram square") },
  { id: "story-9x16", channel: "story", shape: "story", name: L("סטורי 9:16", "ستوري 9:16", "Story 9:16") },
  { id: "reels", channel: "reels", shape: "reels", name: L("רילס", "ريلز", "Reels") },
  { id: "flyer", channel: "flyer", shape: "flyer", name: L("פלאייר", "منشور", "Flyer") },
  { id: "landing-hero", channel: "landing", shape: "hero", name: L("הירו נחיתה", "بطل هبوط", "Landing hero") },
  { id: "quote-card", channel: "facebook", shape: "quote", name: L("כרטיס ציטוט", "بطاقة اقتباس", "Quote card") },
  { id: "wa-bubble", channel: "whatsapp", shape: "square", name: L("בועת וואטסאפ", "فقاعة واتساب", "WhatsApp bubble") },
  { id: "sale-banner", channel: "facebook", shape: "square", sale: true, name: L("באנר מבצע", "بانر عرض", "Sale banner") },
  { id: "sale-story", channel: "story", shape: "story", sale: true, name: L("סטורי מבצע", "ستوري عرض", "Sale story") },
];

export function hooksFor(vertical: Vertical, locale: Locale, intake?: Intake): string[] {
  const raw = HOOKS[vertical]?.[locale] ?? HOOKS.generic[locale];
  const rows = intake ? raw.map((t) => fill(t, intake, locale)) : raw;
  return rows.filter((s) => s.length > 0);
}

export function anglesFor(vertical: Vertical, locale: Locale): string[] {
  return ANGLES[vertical]?.[locale] ?? ANGLES.generic[locale];
}

export function ctasFor(vertical: Vertical, locale: Locale): string[] {
  return CTAS[vertical]?.[locale] ?? CTAS.generic[locale];
}

export function layoutsFor(vertical: Vertical, channel?: CreativeChannel, hasOffer = true): LayoutSpec[] {
  void vertical;
  return LAYOUTS.filter((l) => {
    if (channel && l.channel !== channel) return false;
    if (l.sale && !hasOffer) return false;
    return true;
  });
}

export const LAYOUT_THUMBS: { id: string; shape: LayoutShape; label: Record<Locale, string>; aspect: string }[] = [
  { id: "feed", shape: "square", label: L("פיד מרובע", "فيد مربع", "Feed square"), aspect: "aspect-square" },
  { id: "story", shape: "story", label: L("סטורי 9:16", "ستوري 9:16", "Story 9:16"), aspect: "aspect-[9/16]" },
  { id: "reels", shape: "reels", label: L("רילס", "ريلز", "Reels"), aspect: "aspect-[9/16]" },
  { id: "flyer", shape: "flyer", label: L("פלאייר", "منشور", "Flyer"), aspect: "aspect-[3/4]" },
  { id: "hero", shape: "hero", label: L("הירו נחיתה", "بطل هبوط", "Landing hero"), aspect: "aspect-[16/9]" },
  { id: "quote", shape: "quote", label: L("ציטוט", "اقتباس", "Quote"), aspect: "aspect-[4/3]" },
];

export function bankForIntake(intake: Intake, locale: Locale) {
  const v = detectVertical(intake);
  const offer = !isNoOffer(intake.offer);
  return {
    vertical: v,
    hooks: hooksFor(v, locale, intake),
    angles: anglesFor(v, locale),
    ctas: ctasFor(v, locale),
    layouts: layoutsFor(v, undefined, offer),
  };
}
