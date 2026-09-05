import type { Intake, Locale } from "./types";
import type { Vertical } from "./vertical";
import { detectVertical, foodFamily } from "./vertical";
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
  const place = (intake.location || "").trim();
  const hours = (intake.clinicHours || "").trim();
  return template
    .replaceAll("{name}", name)
    .replaceAll("{problem}", problem)
    .replaceAll("{advantage}", advantage)
    .replaceAll("{offer}", offer)
    .replaceAll("{place}", place)
    .replaceAll("{hours}", hours)
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,!?])/g, "$1")
    .trim();
}

const HOOKS: Record<Vertical, Record<Locale, string[]>> = {
  retail: {
    he: [
      "{name} — מתלה אחד מורכב, לא קטלוג של 40 פריטים מומצאים.",
      "{problem} {name} בלי רעש קניון.",
      "{advantage}",
      "{offer} {name} — רק אם זה באמת על הדלת.",
      "חלון ראווה ב{place} — בואו לראות בד, לא באנר.",
    ],
    ar: [
      "{name} — سكة واحدة متقنة، مش كتالوج 40 قطعة مختلقة.",
      "{problem} {name} بلا ضوضاء مول.",
      "{advantage}",
      "{offer} {name} — فقط إذا مكتوب عالباب.",
      "واجهة ب{place} — تعوا تشوفوا قماش، مش بنر.",
    ],
    en: [
      "{name} — one well-built rack, not a fake 40-SKU catalog.",
      "{problem} {name} without mall noise.",
      "{advantage}",
      "{offer} {name} — only if it is actually on the door.",
      "Vitrine in {place} — come see fabric, not a banner.",
    ],
  },
  restaurant: {
    he: [
      "{name} — שולחן, לא סלוגן «אוכל טעים».",
      "{problem}",
      "{advantage}",
      "{offer} — ההצעה היא הסיפור, לא הנחה גנרית.",
      "בואו ל{place} — טקס ישיבה, לא באנר משלוחים.",
    ],
    ar: [
      "{name} — طاولة، مش شعار «أكل طيب».",
      "{problem}",
      "{advantage}",
      "{offer} — العرض هو القصة، مش خصم عام.",
      "تعوا ع {place} — طقس جلسة، مش بنر توصيل.",
    ],
    en: [
      "{name} — a table, not a “tasty food” slogan.",
      "{problem}",
      "{advantage}",
      "{offer} — the offer is the story, not a generic discount.",
      "Come to {place} — a seating ritual, not a delivery banner.",
    ],
  },
  pool: {
    he: [
      "{name} — מים שצוינו, בלי הבטחת ריפוי.",
      "{problem}",
      "{advantage}",
      "שעות אמת: {hours} — בואו לבריכה, לא לספא מדומה.",
    ],
    ar: [
      "{name} — مي مذكورة، بلا وعد شفاء.",
      "{problem}",
      "{advantage}",
      "ساعات حقيقية: {hours} — تعوا ع المسبح، مش سبا مختلق.",
    ],
    en: [
      "{name} — stated water, no cure claim.",
      "{problem}",
      "{advantage}",
      "Real hours: {hours} — visit the pool, not an invented spa.",
    ],
  },
  clinic: {
    he: [
      "{name} — כשהילד חולה, לא סלוגן רפואי.",
      "{problem}",
      "{advantage}",
      "שעות: {hours} — לפי סדר הגעה, בלי תור מדומה.",
      "{place} — שם + עיר, בלי «הכי טוב בעיר».",
    ],
    ar: [
      "{name} — لما الولد مريض، مش شعار طبي.",
      "{problem}",
      "{advantage}",
      "الساعات: {hours} — جت أولاً، بلا دور مختلق.",
      "{place} — اسم + بلدة، بلا «الأفضل بالمدينة».",
    ],
    en: [
      "{name} — when the child is sick, not a medical slogan.",
      "{problem}",
      "{advantage}",
      "Hours: {hours} — walk-in order, no invented queue.",
      "{place} — name + town, never “best in town”.",
    ],
  },
  product: {
    he: [
      "{name} — הכאב שחולץ מהדף, לא כאב סוכנות.",
      "{problem}",
      "{advantage}",
      "הצטרפו לכלים — בלי מחיר שלא פורסם ובלי ROAS.",
    ],
    ar: [
      "{name} — الألم المستخرج من الصفحة، مش ألم وكالة.",
      "{problem}",
      "{advantage}",
      "انضموا للأدوات — بلا سعر غير منشور وبلا ROAS.",
    ],
    en: [
      "{name} — pain extracted from the page, not agency pain.",
      "{problem}",
      "{advantage}",
      "Join the tools — no unpublished price, no ROAS.",
    ],
  },
  school: {
    he: [
      "{name} — הרשמה לקהילה, לא מבצע שכר לימוד.",
      "{problem}",
      "{advantage}",
      "שעות: {hours} — בואו בשער, בלי קופון לימודים.",
    ],
    ar: [
      "{name} — تسجيل للمجتمع، مش عرض أقساط.",
      "{problem}",
      "{advantage}",
      "الساعات: {hours} — تعوا عالبوابة، بلا كوبون دراسي.",
    ],
    en: [
      "{name} — enrollment into a community, not a tuition sale.",
      "{problem}",
      "{advantage}",
      "Hours: {hours} — come to the gate, no tuition coupon.",
    ],
  },
  generic: {
    he: [
      "{name} — כל פריים = עובדה מהקליטה.",
      "{problem}",
      "{advantage}",
      "{offer}",
      "{place} — מקום אמת, לא «לידכם» ריק.",
    ],
    ar: [
      "{name} — كل فريمة = حقيقة من البيانات.",
      "{problem}",
      "{advantage}",
      "{offer}",
      "{place} — مكان حقيقي، مش «قربكم» فاضي.",
    ],
    en: [
      "{name} — every frame = an intake fact.",
      "{problem}",
      "{advantage}",
      "{offer}",
      "{place} — a real place, not empty “near you”.",
    ],
  },
};

const ANGLES: Record<Vertical, Record<Locale, string[]>> = {
  retail: {
    he: [
      "הלבשה שקטה מול קניון",
      "קרוס-אפ בד בלי פני דוגמנית",
      "חלון ראווה כזהות מקום",
      "שמירת פריט בוואטסאפ — בלי עגלה מדומה",
      "הנחה רק אם פורסמה בקליטה",
    ],
    ar: [
      "تجربة قياس هادئة مقابل المول",
      "لقطة قماش بلا وجه عارضة",
      "واجهة العرض كهوية مكان",
      "حجز قطعة واتساب — بلا سلة وهمية",
      "خصم فقط إذا نُشر بالكِليطة",
    ],
    en: [
      "quiet fitting vs the mall",
      "fabric close-up, no model face",
      "vitrine as place identity",
      "hold via WhatsApp — no fake cart",
      "discount only if published in intake",
    ],
  },
  restaurant: {
    he: [
      "טקס שולחן, לא באנר משלוחים",
      "ההצעה כסיפור מחיר אמת",
      "אדים/קרמיקה — בלי פני לקוחות",
      "שכן הכיכר / כתובת כגיבור",
      "דחיפות משעות אמת, לא «רק היום»",
    ],
    ar: [
      "طقس طاولة، مش بنر توصيل",
      "العرض كقصة سعر حقيقي",
      "بخار/صحون — بلا وجوه زبائن",
      "جار الساحة / العنوان كبطل",
      "إلحاح من ساعات حقيقية، مش «اليوم فقط»",
    ],
    en: [
      "table ritual, not a delivery banner",
      "the offer as a real-price story",
      "steam/ceramics — no customer faces",
      "square neighbor / address as hero",
      "urgency from real hours, not “today only”",
    ],
  },
  pool: {
    he: ["מים כעובדה", "סיפון ריק", "חלון משפחה משעות אמת", "בלי הבטחת ריפוי"],
    ar: ["المي كحقيقة", "سطح فاضي", "نافذة عيلة من ساعات حقيقية", "بلا وعد شفاء"],
    en: ["water as fact", "empty deck", "family window from real hours", "no cure claim"],
  },
  clinic: {
    he: ["שקט באותו יום", "שעות כגיבור", "וואטסאפ רך (לא חירום)", "כיסא ריק — בלי פני ילדים", "בלי תיאטרון כוכבים"],
    ar: ["هدوء بنفس اليوم", "الساعات هي البطل", "واتساب لطيف (مش طوارئ)", "كرسي فاضي — بلا وجوه أطفال", "بلا مسرح نجوم"],
    en: ["same-day calm", "hours as hero", "soft WhatsApp (not ER)", "empty chair — no children’s faces", "no star theatre"],
  },
  product: {
    he: ["כאב שחולץ מהדף", "מנגנון יתרון, לא סלוגן", "בלי מחיר שלא פורסם", "בלי ROAS"],
    ar: ["ألم مستخرج من الصفحة", "آلية الميزة، مش شعار", "بلا سعر غير منشور", "بلا ROAS"],
    en: ["pain extracted from the page", "advantage as mechanism, not slogan", "no unpublished price", "no ROAS"],
  },
  school: {
    he: ["הרשמה בפרוזה", "חצר ריקה", "מעגל קהילה בלי דמוגרפיה", "בלי קופון שכר לימוד"],
    ar: ["تسجيل بالنثر", "ساحة فاضية", "دائرة مجتمع بلا ديموغرافيا", "بلا كوبون أقساط"],
    en: ["enrollment in prose", "empty yard", "community circle without demographics", "no tuition coupon"],
  },
  generic: {
    he: ["עמוד שדרה של עובדות", "הפער כבריף צילום", "מקום כגיבור", "הצעה או יושרה"],
    ar: ["عمود حقائق", "الفجوة كملخص تصوير", "المكان كبطل", "عرض أو صدق"],
    en: ["fact-first spine", "gap as shoot brief", "place as hero", "offer or integrity"],
  },
};

const MED_ANGLES: Record<Locale, string[]> = {
  he: ["טקס שולחן ים-תיכון", "טעימות לשניים במחיר שסופק", "חומוס/שמן זית כפתיח ויזואלי", "שולחן בחוץ בשקיעה"],
  ar: ["طقس طاولة متوسطية", "تذوّق لاثنين بالسعر المعطى", "حمص/زيت زيتون كافتتاح بصري", "طاولة برا وقت الغروب"],
  en: ["Mediterranean table ritual", "two-cover tasting at the stated price", "hummus/olive oil as visual open", "outdoor table at dusk"],
};

const GRILL_ANGLES: Record<Locale, string[]> = {
  he: ["אדים מעל הגריל", "רעב וצלחת, לא באנר קופון", "תחנת גחלים בלי פנים", "הזמנה לפני צלחת"],
  ar: ["بخار فوق الغريل", "جوع وصحن، مش بنر كوبون", "محطة فحم بلا وجوه", "الحجز قبل الصحن"],
  en: ["steam over the grill", "hunger and a plate, not a coupon banner", "ember station, no faces", "book before the plate"],
};

const CTAS: Record<Vertical, Record<Locale, string[]>> = {
  retail: {
    he: ["בואו לחנות", "שמרו פריט בוואטסאפ", "פתחו את האתר"],
    ar: ["تعوا ع المحل", "احجزوا قطعة واتساب", "افتحوا الموقع"],
    en: ["Come to the store", "Hold an item on WhatsApp", "Open the site"],
  },
  restaurant: {
    he: ["הזמינו שולחן", "כתבו בוואטסאפ", "בואו לשולחן"],
    ar: ["احجزوا طاولة", "اكتبوا واتساب", "تعوا عالطاولة"],
    en: ["Book a table", "Write on WhatsApp", "Come to the table"],
  },
  pool: {
    he: ["בואו לבריכה", "שאלו בוואטסאפ על שעות"],
    ar: ["تعوا ع المسبح", "اسألوا واتساب عن الساعات"],
    en: ["Visit the pool", "Ask hours on WhatsApp"],
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

export type ServiceFamily = "salon" | "gym" | "cafe" | "workshop" | "pro" | null;

/** Distinctive generic-service banks — never invent ratings or prices. */
export function serviceFamily(intake?: Intake): ServiceFamily {
  if (!intake) return null;
  const blob = `${intake.businessName} ${intake.category} ${intake.description}`.toLowerCase();
  if (/salon|ספר|מספרה|حلاق|صالون|barber|שיער|تجميل|יופי|nails|ציפורן/.test(blob)) return "salon";
  if (/gym|כושר|نادي|fitness|חדר כושר|yoga|יוגה|pilates|פילאטיס/.test(blob)) return "gym";
  if (/cafe|קפה|مقهى|coffee|espresso|מאפה|مخبز|bakery/.test(blob)) return "cafe";
  if (/workshop|סדנ|ورشة|studio|סטודיו|נגר|עץ|ceramic|קרמי/.test(blob)) return "workshop";
  if (/lawyer|עורך דין|محام|accountant|רואה חשבון|محاسب|consult|ייעוץ|استشار/.test(blob)) return "pro";
  return null;
}

const SERVICE_HOOKS: Record<Exclude<ServiceFamily, null>, Record<Locale, string[]>> = {
  salon: {
    he: ["{name} — כיסא אחד, לא קטלוג תסרוקות מומצא.", "{advantage}", "בואו ל{place} — לראות עבודה, לא באנר."],
    ar: ["{name} — كرسي واحد، مش كتالوج قصّات مختلق.", "{advantage}", "تعوا ع {place} — تشوفوا شغل، مش بنر."],
    en: ["{name} — one chair, not a fake hairstyle catalog.", "{advantage}", "Come to {place} — see the work, not a banner."],
  },
  gym: {
    he: ["{name} — רצפה ורזל, לא הבטחת גוף ב-30 יום.", "{advantage}", "שעות אמת: {hours} — בואו להתאמן."],
    ar: ["{name} — أرضية وحديد، مش وعد جسم بـ 30 يوم.", "{advantage}", "ساعات حقيقية: {hours} — تعوا تتدرّبوا."],
    en: ["{name} — floor and iron, no 30-day body promise.", "{advantage}", "Real hours: {hours} — come train."],
  },
  cafe: {
    he: ["{name} — כוס ושקט, לא סלוגן «הקפה הכי טוב».", "{advantage}", "בואו ל{place} — שולחן, לא באנר משלוחים."],
    ar: ["{name} — فنجان وهدوء، مش شعار «أحلى قهوة».", "{advantage}", "تعوا ع {place} — طاولة، مش بنر توصيل."],
    en: ["{name} — a cup and quiet, not a “best coffee” slogan.", "{advantage}", "Come to {place} — a table, not a delivery banner."],
  },
  workshop: {
    he: ["{name} — יד אחת על החומר, לא קטלוג 40 פריטים.", "{advantage}", "{place} — סדנה אמת, לא «לידכם» ריק."],
    ar: ["{name} — إيد عالخامة، مش كتالوج 40 قطعة.", "{advantage}", "{place} — ورشة حقيقية، مش «قربكم» فاضي."],
    en: ["{name} — one hand on the material, not a 40-SKU catalog.", "{advantage}", "{place} — a real workshop, not empty “near you”."],
  },
  pro: {
    he: ["{name} — משפט בהיר, לא סלוגן «הכי מקצועי».", "{advantage}", "שיחה אחת — בלי הבטחת תוצאה שלא נמדדה."],
    ar: ["{name} — جملة واضحة، مش شعار «الأكثر احتراف».", "{advantage}", "مكالمة واحدة — بلا وعد نتيجة ما انقاست."],
    en: ["{name} — one clear sentence, not a “most professional” slogan.", "{advantage}", "One call — no unmeasured outcome promise."],
  },
};

const SERVICE_ANGLES: Record<Exclude<ServiceFamily, null>, Record<Locale, string[]>> = {
  salon: {
    he: ["כיסא אחד מול קטלוג", "קרוס-אפ מספריים/בד", "רחוב כזהות מקום", "תור בוואטסאפ — בלי דירוג"],
    ar: ["كرسي واحد مقابل كتالوج", "لقطة مقص/قماش", "الشارع كهوية مكان", "دور واتساب — بلا تقييم"],
    en: ["one chair vs a catalog", "scissors/cloth close-up", "street as place identity", "hold via WhatsApp — no rating"],
  },
  gym: {
    he: ["רצפה כעובדה", "שעות כגיבור", "בלי הבטחת גוף", "וואטסאפ לשעות — לא לנס"],
    ar: ["الأرضية كحقيقة", "الساعات هي البطل", "بلا وعد جسم", "واتساب للساعات — مش لمعجزة"],
    en: ["floor as fact", "hours as hero", "no body promise", "WhatsApp for hours — not a miracle"],
  },
  cafe: {
    he: ["כוס כפתיח", "שולחן שקט", "כתובת כגיבור", "בלי «הכי טעים»"],
    ar: ["الفنجان كافتتاح", "طاولة هادئة", "العنوان كبطل", "بلا «الألذ»"],
    en: ["cup as open", "quiet table", "address as hero", "no “tastiest”"],
  },
  workshop: {
    he: ["יד על חומר", "סדנה ריקה מצולמת", "תהליך 3 שלבים בלי מדדים", "הזמנה לפני קטלוג"],
    ar: ["إيد عالخامة", "ورشة فاضية مصوّرة", "مسار 3 خطوات بلا مقاييس", "الحجز قبل الكتالوج"],
    en: ["hand on material", "empty workshop filmed", "3-step process, no metrics", "book before a catalog"],
  },
  pro: {
    he: ["משפט בהיר", "בלי תיאטרון דירוגים", "שיחה אחת", "מקום/שעות אם סופקו"],
    ar: ["جملة واضحة", "بلا مسرح تقييمات", "مكالمة واحدة", "مكان/ساعات إن وُجدت"],
    en: ["one clear sentence", "no ratings theatre", "one call", "place/hours if supplied"],
  },
};

export function hooksFor(vertical: Vertical, locale: Locale, intake?: Intake): string[] {
  const cafe = vertical === "restaurant" && intake && foodFamily(intake) === "cafe";
  const fam = cafe ? "cafe" : (vertical === "generic" || vertical === "product" ? serviceFamily(intake) : null);
  const raw = fam ? SERVICE_HOOKS[fam][locale] : (HOOKS[vertical]?.[locale] ?? HOOKS.generic[locale]);
  const rows = intake ? raw.map((t) => fill(t, intake, locale)) : raw;
  return rows.filter((s) => s.length > 0 && !/^[\s—–-]+$/.test(s));
}

export function anglesFor(vertical: Vertical, locale: Locale, intake?: Intake): string[] {
  if (vertical === "restaurant" && intake) {
    const fam = foodFamily(intake);
    if (fam === "mediterranean") return MED_ANGLES[locale];
    if (fam === "grill") return GRILL_ANGLES[locale];
    if (fam === "cafe") return SERVICE_ANGLES.cafe[locale];
  }
  const svc = (vertical === "generic" || vertical === "product") ? serviceFamily(intake) : null;
  if (svc) return SERVICE_ANGLES[svc][locale];
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
    angles: anglesFor(v, locale, intake),
    ctas: ctasFor(v, locale),
    layouts: layoutsFor(v, undefined, offer),
  };
}

/** Spoken angle line for narrative / calendar — never generic “trust / hunger”. */
export function spokenBankAngle(intake: Intake, locale: Locale, index = 0): string {
  const v = detectVertical(intake);
  const list = anglesFor(v, locale, intake);
  return list[index % Math.max(1, list.length)] ?? "";
}
