import type { CampaignPack, Intake, Locale } from "./types";
import { emptyIntake } from "./engine/validate";
import { applyDemoCmoDesk } from "./demo-cmo";
import { demoPhotoAssets } from "./demo-assets";

/** Exactly 3 demos: real clinic + two FICTIONAL samples. Never Pizza Hut / Aluf Sport. */
export const DEMO_ID = "demo-samer-clinic";
export const DEMO_OLIVE_ID = "demo-olive-kitchen";
export const DEMO_SAND_ID = "demo-sand-boutique";

export type DemoPackId = typeof DEMO_ID | typeof DEMO_OLIVE_ID | typeof DEMO_SAND_ID;

export const PUBLISHED_DEMO_IDS: readonly DemoPackId[] = [DEMO_ID, DEMO_OLIVE_ID, DEMO_SAND_ID] as const;
export const PUBLISHED_DEMO_ID_SET = new Set<string>(PUBLISHED_DEMO_IDS);

export type DemoKind = "clinic" | "restaurant" | "retail";

export interface DemoCatalogEntry {
  id: DemoPackId;
  kind: DemoKind;
  fictional: boolean;
  slug: string;
  labels: Record<Locale, string>;
  shortLabels: Record<Locale, string>;
}

export const DEMO_CATALOG: readonly DemoCatalogEntry[] = [
  {
    id: DEMO_ID,
    kind: "clinic",
    fictional: false,
    slug: "samer",
    labels: {
      he: 'הדגמה — מרפאת ילדים ד"ר סאמר אבו מוך',
      ar: "عرض — عيادة أطفال د. سامر أبو مخ",
      en: "Demo — Dr. Samer pediatric clinic",
    },
    shortLabels: { he: "מרפאת ילדים", ar: "عيادة أطفال", en: "Pediatric clinic" },
  },
  {
    id: DEMO_OLIVE_ID,
    kind: "restaurant",
    fictional: true,
    slug: "olive",
    labels: {
      he: "הדגמה — מטבח הזית (בדיוני)",
      ar: "عرض — مطبخ الزيتون (خيالي)",
      en: "Demo — Olive Kitchen (fictional)",
    },
    shortLabels: { he: "מטבח הזית", ar: "مطبخ الزيتون", en: "Olive Kitchen" },
  },
  {
    id: DEMO_SAND_ID,
    kind: "retail",
    fictional: true,
    slug: "sand",
    labels: {
      he: "הדגמה — בוטיק חול (בדיוני)",
      ar: "عرض — بوتيك الرمل (خيالي)",
      en: "Demo — Sand Boutique (fictional)",
    },
    shortLabels: { he: "בוטיק חול", ar: "بوتيك الرمل", en: "Sand Boutique" },
  },
] as const;

export function demoEntry(idOrSlug: string | null | undefined): DemoCatalogEntry | undefined {
  const q = String(idOrSlug ?? "").trim().toLowerCase();
  if (!q) return undefined;
  if (/pizza|aluf|pizzahut|alufsport/.test(q)) return undefined;
  return DEMO_CATALOG.find(
    (d) =>
      d.id === q ||
      d.slug === q ||
      (q === "peds" && d.slug === "samer") ||
      (q === "samer-peds" && d.slug === "samer") ||
      (q === "clinic" && d.slug === "samer"),
  );
}

export function isPublishedDemoId(id: string): id is DemoPackId {
  return PUBLISHED_DEMO_ID_SET.has(id);
}

function oliveName(locale: Locale): string {
  if (locale === "ar") return "مطبخ الزيتون";
  if (locale === "en") return "Olive Kitchen";
  return "מטבח הזית";
}

function sandName(locale: Locale): string {
  if (locale === "ar") return "بوتيك الرمل";
  if (locale === "en") return "Sand Boutique";
  return "בוטיק חול";
}

export function oliveKitchenIntake(locale: Locale = "he"): Intake {
  const base: Intake = {
    ...emptyIntake(),
    type: "business",
    operatingModel: "paid",
    businessName: oliveName(locale),
    category: locale === "ar" ? "مطعم متوسطي" : locale === "en" ? "Mediterranean restaurant" : "מסעדה ים-תיכונית",
    description:
      locale === "ar"
        ? "مطبخ الزيتون / מטבח הזית / Olive Kitchen — مطعم متوسطي عائلي في بلدة نوڤيه شاקד الخيالية. مأكولات بيتية طازجة، مشاوي خفيفة، سلطات زيتون وحمص، وجلسات خارجية هادئة. نشاط خيالي للعرض فقط — ليس علامة حقيقية."
        : locale === "en"
          ? "Olive Kitchen / מטבח הזית / مطبخ الزيتون — family Mediterranean restaurant in fictional Neve Shaked. Fresh home-style plates, light grills, olive & hummus salads, quiet outdoor seating. Sample/demo fictional business only — not a real brand."
          : "מטבח הזית / مطبخ الزيتون / Olive Kitchen — מסעדה ים-תיכונית משפחתית בעיירה הבדיונית נווה שקד. מנות ביתיות טריות, גריל קל, סלטי זיתים וחומוס, ישיבה בחוץ רגועה. עסק בדיוני לדוגמה בלבד — לא מותג אמיתי.",
    location:
      locale === "ar"
        ? "نوڤيه شاקד (بلدة خيالية) — الشارع الرئيسي 12، بجانب الساحة"
        : locale === "en"
          ? "Neve Shaked (fictional town) — Main St 12, by the square"
          : "נווה שקד (עיירה בדיונית) — הרחוב הראשי 12, ליד הכיכר",
    website: "",
    whatsapp: "052-7001234",
    clinicHours:
      locale === "ar"
        ? "الأحد–الخميس 12:00–22:00 · الجمعة 12:00–15:00 · السبت مغلق"
        : locale === "en"
          ? "Sun–Thu 12:00–22:00 · Fri 12:00–15:00 · Sat closed"
          : "א׳–ה׳ 12:00–22:00 · ו׳ 12:00–15:00 · ש׳ סגור",
    audience: "local_families",
    audienceCustom: false,
    biggestProblem:
      locale === "ar"
        ? "بدهم أكل متوسطي طازج بدون طوابير طويلة"
        : locale === "en"
          ? "Want fresh Mediterranean food without long waits"
          : "רוצים אוכל ים-תיכוני טרי בלי תורים ארוכים",
    problemCustom: true,
    uniqueAdvantage:
      locale === "ar"
        ? "مطبخ بيتي متوسطي طازج + جلسة خارجية هادئة"
        : locale === "en"
          ? "Fresh home-style Mediterranean + quiet outdoor seating"
          : "מטבח ביתי ים-תיכוני טרי + ישיבה בחוץ רגועה",
    advantageCustom: true,
    mainGoal: "whatsapp",
    goalCustom: false,
    offer:
      locale === "ar"
        ? "وجبة تذوّق لشخصين بـ ₪149 عند الحجز المسبق"
        : locale === "en"
          ? "Couple tasting menu ₪149 with advance booking"
          : "ארוחת טעימות זוגית ב-₪149 בהזמנה מראש",
    offerCustom: true,
    channelNotes: "facebook,instagram,whatsapp",
    landingLines:
      locale === "ar"
        ? "احجزوا طاولة في مطبخ الزيتون — نوڤيه شاקד"
        : locale === "en"
          ? "Book a table at Olive Kitchen — Neve Shaked"
          : "הזמינו שולחן במטבח הזית — נווה שקד",
    mediaAssets: demoPhotoAssets(DEMO_OLIVE_ID),
    depth: "deep",
  };
  return applyDemoCmoDesk(base, DEMO_OLIVE_ID, locale);
}

export function sandBoutiqueIntake(locale: Locale = "he"): Intake {
  const base: Intake = {
    ...emptyIntake(),
    type: "business",
    operatingModel: "paid",
    businessName: sandName(locale),
    category: locale === "ar" ? "بوتيك أزياء" : locale === "en" ? "Fashion boutique" : "בוטיק אופנה",
    description:
      locale === "ar"
        ? "بوتيك الرمل / בוטיק חול / Sand Boutique — بوتيك أزياء نسائية هادئ في بلدة عين براك الخيالية. قطع مختارة، أقمشة مريحة، وإطلالات يومية أنيقة. نشاط خيالي للعرض فقط — ليس علامة حقيقية."
        : locale === "en"
          ? "Sand Boutique / בוטיק חול / بوتيك الرمل — calm women’s fashion boutique in fictional Ein Barak. Curated pieces, soft fabrics, everyday elegant looks. Sample/demo fictional business only — not a real brand."
          : "בוטיק חול / بوتيك الرمل / Sand Boutique — בוטיק אופנה נשית רגוע בעיירה הבדיונית עין ברק. פריטים נבחרים, בדים נוחים, לוקים יומיומיים אלגנטיים. עסק בדיוני לדוגמה בלבד — לא מותג אמיתי.",
    location:
      locale === "ar"
        ? "عين براك (بلدة خيالية) — شارع النخيل 3"
        : locale === "en"
          ? "Ein Barak (fictional town) — Palm St 3"
          : "עין ברק (עיירה בדיונית) — רחוב הדקל 3",
    website: "",
    whatsapp: "050-8112233",
    clinicHours:
      locale === "ar"
        ? "الأحد–الخميس 10:00–19:00 · الجمعة 09:00–14:00 · السبت مغلق"
        : locale === "en"
          ? "Sun–Thu 10:00–19:00 · Fri 09:00–14:00 · Sat closed"
          : "א׳–ה׳ 10:00–19:00 · ו׳ 09:00–14:00 · ש׳ סגור",
    audience: "women",
    audienceCustom: false,
    biggestProblem:
      locale === "ar"
        ? "صعب يلاقوا قطع أنيقة مريحة بدون مول مزدحم"
        : locale === "en"
          ? "Hard to find elegant, comfortable pieces without a crowded mall"
          : "קשה למצוא פריטים אלגנטיים ונוחים בלי קניון עמוס",
    problemCustom: true,
    uniqueAdvantage:
      locale === "ar"
        ? "علّاقة واحدة دقيقة + استشارة هادئة — ليس كتالوج 40 صنفاً مختلقاً"
        : locale === "en"
          ? "One precise rack + calm styling — not a catalog of 40 invented items"
          : "מתלה אחד מדויק + ייעוץ רגוע — לא קטלוג של 40 פריטים מומצאים",
    advantageCustom: true,
    mainGoal: "whatsapp",
    goalCustom: false,
    offer:
      locale === "ar"
        ? "خصم افتتاح 15٪ على مجموعة الربيع للزبونات الجديدات"
        : locale === "en"
          ? "Soft opening: 15% off the spring collection for new customers"
          : "הנחת פתיחה רכה 15% על קולקציית האביב ללקוחות חדשות",
    offerCustom: true,
    channelNotes: "facebook,instagram,whatsapp",
    landingLines:
      locale === "ar"
        ? "زوروا بوتيك الرمل في عين براك — واتساب للحجز السريع"
        : locale === "en"
          ? "Visit Sand Boutique in Ein Barak — WhatsApp for a quick hold"
          : "בקרו בבוטיק חול בעין ברק — וואטסאפ לשמירת פריט",
    mediaAssets: demoPhotoAssets(DEMO_SAND_ID),
    depth: "deep",
  };
  return applyDemoCmoDesk(base, DEMO_SAND_ID, locale);
}

export function catalogIntake(idOrSlug: string, locale: Locale = "he"): Intake | null {
  const entry = demoEntry(idOrSlug);
  if (!entry) return null;
  if (entry.id === DEMO_OLIVE_ID) return oliveKitchenIntake(locale);
  if (entry.id === DEMO_SAND_ID) return sandBoutiqueIntake(locale);
  return null;
}

export function demoMetaFor(id: DemoPackId): NonNullable<CampaignPack["demoMeta"]> {
  const entry = demoEntry(id)!;
  return {
    sample: true,
    fictional: entry.fictional,
    kind: entry.kind,
    labels: { ...entry.labels },
    note: entry.fictional
      ? {
          he: "עסק בדיוני לדוגמה בלבד — לא מותג אמיתי.",
          ar: "نشاط خيالي للعرض فقط — ليس علامة حقيقية.",
          en: "Sample/demo fictional business only — not a real brand.",
        }
      : {
          he: "הדגמת מרפאה אמיתית באישור הבעלים.",
          ar: "عرض عيادة حقيقية بموافقة المالك.",
          en: "Real clinic demo with owner permission.",
        },
  };
}
