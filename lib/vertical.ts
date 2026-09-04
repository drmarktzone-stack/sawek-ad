import type { Intake, Locale, MediaAssetLabel } from "./types";

/** Business vertical for copy, chips, and mockup strings. Clinic language is never the default. */
export type Vertical = "clinic" | "restaurant" | "pool" | "school" | "product" | "retail" | "generic";

export type VerticalFacts = Pick<Intake, "businessName" | "category" | "description">;

function blob(intake: VerticalFacts): string {
  return `${intake.businessName ?? ""} ${intake.category ?? ""} ${intake.description ?? ""}`;
}

/** Clinic as the actual physical business — not a digital product that cites a pediatrician as author. */
const NAMED_CLINIC =
  /عيادة|מרפאה|\bclinic\b|\bclinics\b|hospital|مستشفى|בית חולים|מרפאת|drsamerped\.ai\.studio/i;

const CLINIC_AS_BUSINESS =
  /عيادة|מרפאה|\bclinic\b|\bclinics\b|hospital|مستشفى|בית חולים|מרפאת|طبيب أطفال|רופא ילדים|dental|\bdentist\b|שיניים|أسنان|וטרינר|بيطر|pedia/i;

/** App / platform / smart-tools product — not a walk-in clinic. */
const PRODUCT_AS_BUSINESS =
  /smart tools|\b21 smart\b|health platform|\bplatform\b|AI[- ]?doctor|כלי עזר|כלים חכמים|אפליקצ|تطبيق|\bweb\s?app\b|digital (health )?product|\b(ai|smart) tools\b/i;

const POOL_AS_BUSINESS =
  /hydrotherap|הידרותרפ|علاج مائي|בריכה טיפול|בריכה|مسبح|\bpools?\b|רנאן|رنان|\brinan\b/i;

const FOOD_AS_BUSINESS =
  /restaurant|מסעדה|مطعم|shawarma|شاورما|שוארמה|grill|גריל|غريل|burger|بورجر|برغر|המבורגר|בורגר|همبرغر|dessert|קינוח|حلوي|كباب|kebab|falafel|פלאפל|pizza|פיצה|بيتزا|steak|סטייק|kitchen|مطبخ|cafe|קפה|مقهى|أفندنا|أفندن|افندن|afanden|grill king|مأكول|גלידה|ice cream|حلويات/i;

const RETAIL_AS_BUSINESS =
  /אופנה|חנות|חנויות|מותגים|עיר המותגים|שופינג|לייף\s*סטייל|fashion|boutique|outlet|\bmall\b|apparel|clothing|retail|lifestyle store|\bshops?\b|brand city|shopping|ספורט|כושר|הנעלה|בגדי ספורט|מכשירי כושר|sporting goods|sportswear|athletic|sneakers|footwear/i;

const SCHOOL_AS_BUSINESS =
  /בית ספר|مدرسة|school|עירייה|بلدية|municipality|עמותה|جمعية|\bngo\b|תחנה לבריאות|محطة صحة|public health|גן ילדים|روضة/i;

export function detectVertical(intake: VerticalFacts): Vertical {
  const text = blob(intake);
  const nameCat = `${intake.businessName ?? ""} ${intake.category ?? ""}`;
  const namedClinic = NAMED_CLINIC.test(nameCat) || /drsamerped\.ai\.studio/i.test(text);
  const pool = POOL_AS_BUSINESS.test(text);
  const clinic = CLINIC_AS_BUSINESS.test(text);
  const product = PRODUCT_AS_BUSINESS.test(text);

  // Hydrotherapy / pool may mention treatments + kupat holim. That is not a clinic.
  if (pool && !namedClinic) return "pool";
  // Digital product / app / AI-tools site is not a physical clinic, even if JSON-LD is MedicalOrganization
  // or the page cites a pediatrician as content author.
  if (product && !namedClinic) return "product";
  if (clinic) return "clinic";
  if (FOOD_AS_BUSINESS.test(text)) return "restaurant";
  if (RETAIL_AS_BUSINESS.test(text)) return "retail";
  if (SCHOOL_AS_BUSINESS.test(text)) return "school";
  return "generic";
}

export function isClinicLike(intake: VerticalFacts): boolean {
  return detectVertical(intake) === "clinic";
}

export function isRestaurantLike(intake: VerticalFacts): boolean {
  return detectVertical(intake) === "restaurant";
}

export function isPoolLike(intake: VerticalFacts): boolean {
  return detectVertical(intake) === "pool";
}

export function isSchoolVertical(intake: VerticalFacts): boolean {
  return detectVertical(intake) === "school";
}

export function isProductLike(intake: VerticalFacts): boolean {
  return detectVertical(intake) === "product";
}

export function isRetailLike(intake: VerticalFacts): boolean {
  return detectVertical(intake) === "retail";
}

/** Pediatrics copy (sick child, locked H1) only for an actual peds clinic / demo domain.
 * Citing "Dr. Samer Abu Mukh, pediatrician" as content author on a product site must not lock clinic headlines.
 */
export function isPediatrics(intake: Intake): boolean {
  const site = "website" in intake ? String((intake as Intake).website || "") : "";
  const text = `${blob(intake)} ${site}`;
  if (/drsamerped\.ai\.studio/i.test(text)) return true;
  if (detectVertical(intake) !== "clinic") return false;
  const nameCat = `${intake.businessName ?? ""} ${intake.category ?? ""} ${intake.description ?? ""}`;
  const namedPedsClinic = /מרפאת ילדים|عيادة أطفال|מרפאה|عيادة|\bclinic\b|طبيب أطفال|רופא ילדים|pediatric/i.test(nameCat);
  if (!namedPedsClinic) return false;
  return /pedia|pediatric|מרפאת ילדים|عيادة أطفال|רופא ילדים|طبيب أطفال|סאמר אבו מוך|سامر أبو مخ|Samer Abu Mokh/i.test(text);
}

export function showsHmoAudience(intake: VerticalFacts): boolean {
  const v = detectVertical(intake);
  return v === "clinic" || v === "pool";
}

export function showsKupaFields(intake: VerticalFacts): boolean {
  return showsHmoAudience(intake);
}

export function showsClinicPhotoRoles(intake: VerticalFacts): boolean {
  return detectVertical(intake) === "clinic";
}

export const CLINIC_ONLY_ASSET_IDS: readonly MediaAssetLabel[] = ["doctor", "waiting_room", "before_after"];

export function assetLabelsFor<T extends { id: MediaAssetLabel }>(intake: VerticalFacts | undefined, all: T[]): T[] {
  if (intake && showsClinicPhotoRoles(intake)) return all;
  return all.filter((x) => !CLINIC_ONLY_ASSET_IDS.includes(x.id));
}

const PLACE: Record<Vertical, Record<Locale, string>> = {
  clinic: { he: "המרפאה", ar: "العيادة", en: "the clinic" },
  restaurant: { he: "המסעדה", ar: "المطعم", en: "the restaurant" },
  pool: { he: "הבריכה", ar: "المسبح", en: "the pool" },
  school: { he: "בית הספר", ar: "المدرسة", en: "the school" },
  product: { he: "המוצר", ar: "المنتج", en: "the product" },
  retail: { he: "החנות", ar: "المحل", en: "the store" },
  generic: { he: "העסק", ar: "المحل", en: "the business" },
};

export function placeNoun(intake: VerticalFacts, locale: Locale): string {
  return PLACE[detectVertical(intake)][locale];
}

export function unknownProblemLabel(vertical: Vertical): Record<Locale, string> {
  switch (vertical) {
    case "clinic":
      return { he: "לא מכירים את המרפאה", ar: "الناس مش عارفين العيادة", en: "People don't know the clinic" };
    case "restaurant":
      return { he: "לא מכירים את המסעדה", ar: "الناس مش عارفين المطعم", en: "People don't know the restaurant" };
    case "pool":
      return { he: "לא מכירים את הבריכה", ar: "الناس مش عارفين المسبح", en: "People don't know the pool" };
    case "school":
      return { he: "לא מכירים את בית הספר", ar: "الناس مش عارفين المدرسة", en: "People don't know the school" };
    case "product":
      return { he: "לא מכירים את הכלים / האפליקציה", ar: "الناس مش عارفين الأدوات / التطبيق", en: "People don't know the tools / app" };
    case "retail":
      return { he: "לא מכירים את החנות / המותגים", ar: "الناس مش عارفين المحل / الماركات", en: "People don't know the store / brands" };
    default:
      return { he: "לא מכירים את העסק", ar: "الناس مش عارفين المحل", en: "People don't know we exist" };
  }
}

export function crowdFallback(intake: VerticalFacts, locale: Locale): string {
  const v = detectVertical(intake);
  if (v === "clinic" || v === "school" || v === "product") {
    return locale === "ar" ? "الأهل" : locale === "he" ? "הורים" : "parents";
  }
  if (v === "restaurant") {
    return locale === "ar" ? "ناس المنطقة" : locale === "he" ? "אנשים מהאזור" : "locals";
  }
  if (v === "retail") {
    return locale === "ar" ? "زبائن الماركات" : locale === "he" ? "קונים בחנות" : "shoppers";
  }
  return locale === "ar" ? "ناس المنطقة" : locale === "he" ? "אנשים מהאזור" : "people nearby";
}

export function painFallback(intake: Intake, locale: Locale): string {
  if (isPediatrics(intake)) {
    return locale === "ar"
      ? "مش واضح وين تروح لما الولد بيمرض"
      : locale === "he"
        ? "לא ברור לאן לפנות כשהילד חולה"
        : "Not clear where to go when the child is sick";
  }
  return unknownProblemLabel(detectVertical(intake))[locale];
}

export function emotionalOpen(intake: Intake, locale: Locale): string {
  if (isPediatrics(intake)) {
    return locale === "ar"
      ? "لما الولد بيمرض، الأهل بدهم يعرفوا وين يروحوا اليوم — مش إعلان عام."
      : locale === "he"
        ? "כשהילד חולה צריך לדעת לאן הולכים היום."
        : "When a child is sick, families need to know where to go today.";
  }
  const pain = painFallback(intake, locale);
  if (locale === "ar") return `${pain} — مش إعلان عام.`;
  if (locale === "he") return `${pain}`;
  return pain;
}

export function emotionalWalkHeadline(intake: Intake, locale: Locale): string | null {
  if (!isPediatrics(intake)) return null;
  if (locale === "ar") return "الولد مريض، جيبوه عالعيادة";
  if (locale === "he") return "הילד חולה? מגיעים לפי סדר הגעה";
  return "Child sick? Walk in today";
}

export function visitCta(intake: Intake, locale: Locale): string {
  const v = detectVertical(intake);
  if (isPediatrics(intake)) {
    return locale === "he" ? "הגיעו למרפאה" : locale === "ar" ? "جيبوه عالعيادة" : "Come to the clinic";
  }
  if (v === "clinic") {
    return locale === "he" ? "הגיעו למרפאה" : locale === "ar" ? "تعوا عالعيادة" : "Come to the clinic";
  }
  if (v === "restaurant") {
    return locale === "he" ? "בואו למסעדה" : locale === "ar" ? "تعوا ع المطعم" : "Come to the restaurant";
  }
  if (v === "pool") {
    return locale === "he" ? "בואו לבריכה" : locale === "ar" ? "تعوا ع المسبح" : "Visit the pool";
  }
  if (v === "school") {
    return locale === "he" ? "הרשמה לבית הספר" : locale === "ar" ? "سجّلوا بالمدرسة" : "School registration";
  }
  if (v === "product") {
    return locale === "he" ? "הצטרפו" : locale === "ar" ? "انضموا" : "Join";
  }
  if (v === "retail") {
    return locale === "he" ? "בואו לחנות" : locale === "ar" ? "تعوا ع المحل" : "Come to the store";
  }
  return locale === "he" ? "הגיעו לבקר" : locale === "ar" ? "تعوا زورونا" : "Visit us";
}

export function walkInShort(locale: Locale): string {
  if (locale === "ar") return "جت أولاً";
  if (locale === "he") return "לפי סדר הגעה";
  return "walk-in";
}

/** Emergency / ER WhatsApp line — clinics only. Empty for restaurant/pool/school/generic. */
export function emergencyDisclaimer(intake: VerticalFacts, locale: Locale): string {
  if (detectVertical(intake) !== "clinic") return "";
  if (locale === "ar") return "واتساب مش للطوارئ. بالطوارئ روحوا على المستشفى أو غرفة الطوارئ.";
  if (locale === "he") return "וואטסאפ לא לחירום — לחדר מיון.";
  return "WhatsApp is not for emergencies — go to the ER.";
}

/** Short parenthetical used on WhatsApp lines. Clinic only. */
export function waNotEmergencyBit(intake: VerticalFacts, locale: Locale): string {
  if (detectVertical(intake) !== "clinic") return "";
  if (locale === "ar") return " (مش للطوارئ)";
  if (locale === "he") return " (לא לחירום)";
  return " (not for emergencies)";
}

export function waPlaceHeadline(intake: VerticalFacts, locale: Locale, wa: string): string {
  if (detectVertical(intake) === "clinic") {
    const place = placeNoun(intake, locale);
    if (locale === "ar") return `واتساب ${place}: ${wa}`;
    if (locale === "he") return `וואטסאפ ${place}: ${wa}`;
    return `WhatsApp ${place}: ${wa}`;
  }
  if (locale === "ar") return `واتساب: ${wa}`;
  if (locale === "he") return `וואטסאפ: ${wa}`;
  return `WhatsApp ${wa}`;
}

export function visualNoPhotoNote(intake: VerticalFacts, locale: Locale, hasAssets: boolean): string {
  const clinic = detectVertical(intake) === "clinic";
  if (hasAssets) {
    if (clinic) {
      return locale === "he"
        ? "משתמשים בקבצים שהועלו בלבד. בלי תמונת רופא שלא הועלתה."
        : locale === "ar"
          ? "منستخدم الملفات المرفوعة بس. بلا صورة دكتور ما انرفعت."
          : "Using uploaded files only. No doctor photo that was not uploaded.";
    }
    return locale === "he"
      ? "משתמשים בקבצים שהועלו בלבד. בלי להמציא פנים."
      : locale === "ar"
        ? "منستخدم الملفات المرفوعة بس. بلا اختراع وجوه."
        : "Using uploaded files only. No invented faces.";
  }
  if (clinic) {
    return locale === "he"
      ? "אין תמונה שהועלתה — מוקאפ דוגמה, בלי להמציא פני רופא/מרפאה."
      : locale === "ar"
        ? "ما في صورة مرفوعة — نموذج عينة، بلا اختراع وجه دكتور/عيادة."
        : "No photo uploaded — sample mockup, no invented doctor/clinic face.";
  }
  return locale === "he"
    ? "אין תמונה שהועלתה — מוקאפ דוגמה, בלי להמציא פנים או מקום."
    : locale === "ar"
      ? "ما في صورة مرفوعة — نموذج عينة، بلا اختراع وجوه أو مكان."
      : "No photo uploaded — sample mockup, no invented faces or venue.";
}

export function landingVisualLine(intake: VerticalFacts, locale: Locale, assetLabels: string[]): string {
  const clinic = detectVertical(intake) === "clinic";
  if (assetLabels.length) {
    const joined = assetLabels.join(" · ");
    if (clinic) {
      return locale === "he"
        ? `ויזואל מהקבצים שהועלו: ${joined}. בלי תמונת רופא שלא הועלתה.`
        : locale === "ar"
          ? `الصور من الملفات المرفوعة: ${joined}. بلا صورة دكتور ما انرفعت.`
          : `Visuals from uploaded files: ${joined}. No doctor photo that was not uploaded.`;
    }
    return locale === "he"
      ? `ויזואל מהקבצים שהועלו: ${joined}. בלי פנים שלא הועלו.`
      : locale === "ar"
        ? `الصور من الملفات المرفوعة: ${joined}. بلا وجوه ما انرفعت.`
        : `Visuals from uploaded files: ${joined}. No faces that were not uploaded.`;
  }
  if (clinic) {
    return locale === "he"
      ? "ויזואל: דוגמה — אין תמונת מרפאה/רופא בקליטה."
      : locale === "ar"
        ? "البصري: عينة — ما في صورة عيادة/دكتور بالبيانات."
        : "Visual: sample — no clinic/doctor photo on file.";
  }
  return locale === "he"
    ? "ויזואל: דוגמה — אין תמונת עסק בקליטה."
    : locale === "ar"
      ? "البصري: عينة — ما في صورة للمحل بالبيانات."
      : "Visual: sample — no business photo on file.";
}

export function smsWalkLine(intake: Intake, locale: Locale): string {
  const walk = locale === "he" ? "קבלה לפי סדר הגעה." : locale === "ar" ? "جت أولاً بدون مواعيد." : "Walk-in, no appointment.";
  const er = emergencyDisclaimer(intake, locale);
  const erShort =
    detectVertical(intake) === "clinic"
      ? locale === "he"
        ? "וואטסאפ לא לחירום."
        : locale === "ar"
          ? "واتساب مش للطوارئ."
          : "WhatsApp is not ER."
      : "";
  return [walk, erShort || er].filter(Boolean).join(" ");
}

export function bofWalkLine(intake: Intake, locale: Locale, cta: string): string {
  const walk = locale === "he" ? "קבלה לפי סדר הגעה." : locale === "ar" ? "جت أولاً." : "Walk-in.";
  const er =
    detectVertical(intake) === "clinic"
      ? locale === "he"
        ? "וואטסאפ לא לחירום."
        : locale === "ar"
          ? "واتساب مش للطوارئ."
          : "WhatsApp is not the ER."
      : "";
  return [`BOF: ${cta}.`, walk, er].filter(Boolean).join(" ");
}

export function diagnoseFreeCta(intake: Intake): Record<Locale, string> {
  const visit = visitCta(intake, "he");
  const visitAr = visitCta(intake, "ar");
  const visitEn = visitCta(intake, "en");
  return {
    he: `CTA: הרשמה / וואטסאפ / ${visit}. בלי קנו עכשיו, בלי קופון, בלי ROAS כמכירה.`,
    ar: `CTA: تسجيل / واتساب / ${visitAr}. بلا اشتروا الآن وبلا كوبون وبلا ROAS كمبيعات.`,
    en: `CTA: register / WhatsApp / ${visitEn}. No buy-now, no coupon, no ROAS-as-sales.`,
  };
}

/** Clinic-template needles that must not appear on non-clinic packs. */
export const CLINIC_LEAK_NEEDLES_AR = ["مستشفى", "صورة دكتور", "العيادة", "الولد بيمرض", "جيبوه عالعيادة", "واتساب العيادة", "غرفة انتظار", "وجه دكتور"];
export const CLINIC_LEAK_NEEDLES_HE = ["הילד חולה", "לא לחירום", "המרפאה", "פני רופא", "תמונת רופא", "חדר מיון"];
