import type { Intake, Locale } from "./types";
import { DEFAULT_OFFER_HE, defaultOfferLabel } from "./chips";
import { saveDraft } from "./storage";
import { clearEmptyCampaign } from "./empty-campaign";

export const DEMO_ID = "demo-samer-clinic";
export const PENDING_DEMO_KEY = "sawek-pending-demo";

const DEMO_FACTS = {
  businessName: {
    he: "מרפאת ילדים ד״ר סאמר אבו מוך",
    ar: "عيادة أطفال د. سامر أبو موخ",
    en: "Dr. Samer Abu Mokh Pediatrics",
  },
  category: {
    he: "מרפאת ילדים — כללית",
    ar: "عيادة أطفال — كلاليت",
    en: "Pediatrics — Clalit",
  },
  description: {
    he: "מרפאת ילדים של קופת חולים כללית בבאקה אל-גרביה. מתחם אל-נור, קומה 1, ליד הכיכר המרכזית. שירות בעברית, ערבית ואנגלית. וואטסאפ 052-8885800. אתר: https://drsamerped.ai.studio. בלי הבטחת ריפוי ובלי מספרי מטופלים שלא פורסמו.",
    ar: "عيادة أطفال في صندوق المرضى كلاليت في باقة الغربية. مجمع النور، الطابق 1، قرب الساحة المركزية. خدمة بالعبرية والعربية والإنجليزية. واتساب 052-8885800. الموقع: https://drsamerped.ai.studio. بلا وعد بالشفاء وبلا أعداد مرضى غير منشورة.",
    en: "Clalit pediatrics clinic in Baqa al-Gharbiyye. Al-Nour complex, floor 1, near the central square. Hebrew, Arabic, and English. WhatsApp 052-8885800. Site: https://drsamerped.ai.studio. No cure claims and no unpublished patient counts.",
  },
  location: {
    he: "באקה אל-גרביה — מתחם אל-נור, קומה 1, ליד הכיכר המרכזית",
    ar: "باقة الغربية — مجمع النور، الطابق 1، قرب الساحة المركزية",
    en: "Baqa al-Gharbiyye — Al-Nour complex, floor 1, near the central square",
  },
  audience: {
    he: "הורים בבאקה אל-גרביה והסביבה שמחפשים רופא ילדים קבוע בכללית, בעברית / ערבית / אנגלית",
    ar: "أهل في باقة الغربية والمنطقة يبحثون عن طبيب أطفال ثابت في كلاليت، بالعبرية / العربية / الإنجليزية",
    en: "Parents in Baqa al-Gharbiyye and nearby looking for a regular Clalit pediatrician in Hebrew / Arabic / English",
  },
  biggestProblem: {
    he: "משפחות דוחות תור כי לא ברור איך לקבוע אצל רופא ילדים קבוע באזור — הפרסום הכללי נשמע כמו עוד מרפאה.",
    ar: "العائلات تؤجّل الموعد لأن طريقة الحجز عند طبيب أطفال ثابت في المنطقة غير واضحة — الإعلان العام يبدو كأي عيادة أخرى.",
    en: "Families delay booking because it is unclear how to see a regular pediatrician locally — generic ads sound like every other clinic.",
  },
  uniqueAdvantage: {
    he: "מרפאת ילדים כללית במתחם אל-נור (קומה 1, ליד הכיכר), עם שירות HE/AR/EN ווואטסאפ ישיר 052-8885800",
    ar: "عيادة أطفال كلاليت في مجمع النور (الطابق 1، قرب الساحة)، بخدمة HE/AR/EN وواتساب مباشر 052-8885800",
    en: "Clalit pediatrics in Al-Nour (floor 1, by the square), HE/AR/EN service and direct WhatsApp 052-8885800",
  },
  mainGoal: {
    he: "לידים לתור ראשון",
    ar: "عملاء محتملون لموعد أول",
    en: "Leads for a first appointment",
  },
  businessModel: {
    he: "מרפאת ילדים כללית. ליד = תור ראשון במרפאה. שפות קבלה: עברית, ערבית, אנגלית.",
    ar: "عيادة أطفال كلاليت. العميل المحتمل = موعد أول في العيادة. لغات الاستقبال: العبرية والعربية والإنجليزية.",
    en: "Clalit pediatrics clinic. A lead = a first appointment. Reception languages: Hebrew, Arabic, English.",
  },
} as const;

type FactKey = keyof typeof DEMO_FACTS;

/** Public facts only. No invented CAC, budget, patient counts, or ROAS. */
export function demoIntake(locale: Locale = "he"): Intake {
  const f = DEMO_FACTS;
  return {
    type: "business",
    depth: "quick",
    businessName: f.businessName[locale],
    category: f.category[locale],
    description: f.description[locale],
    location: f.location[locale],
    website: "https://drsamerped.ai.studio",
    whatsapp: "052-8885800",
    audience: f.audience[locale],
    audienceCustom: true,
    biggestProblem: f.biggestProblem[locale],
    problemCustom: true,
    uniqueAdvantage: f.uniqueAdvantage[locale],
    advantageCustom: true,
    mainGoal: f.mainGoal[locale],
    goalCustom: true,
    offer: defaultOfferLabel(locale),
    offerCustom: false,
    competitors: [],
    businessModel: f.businessModel[locale],
    avgOrderValue: "",
    marginPercent: "",
    targetCac: "",
    monthlyBudget: "",
    pastAds: "",
    pastResults: "",
    whatFailed: "",
  };
}

export const DEMO_LABEL = {
  he: "הדגמה: מרפאת ילדים ד״ר סאמר אבו מוך",
  ar: "عرض: عيادة أطفال د. سامر أبو موخ",
  en: "Demo: Dr. Samer Abu Mokh pediatrics",
} as const;

export function applyPediatricDemoDraft(locale: Locale = "he"): Intake {
  clearEmptyCampaign();
  const intake = demoIntake(locale);
  saveDraft({ intake, step: 2 });
  try {
    sessionStorage.setItem(PENDING_DEMO_KEY, "samer-peds");
  } catch {
    /* private mode */
  }
  return intake;
}

export function consumePendingDemo(): boolean {
  try {
    if (typeof window === "undefined") return false;
    const q = new URLSearchParams(window.location.search).get("demo");
    if (q === "samer" || q === "peds") return true;
    return false;
  } catch {
    return false;
  }
}

export function clearPendingDemo() {
  try {
    sessionStorage.removeItem(PENDING_DEMO_KEY);
  } catch {
    /* ignore */
  }
}

export function isPediatricDemo(intake: Intake): boolean {
  return (
    intake.website.includes("drsamerped.ai.studio") ||
    intake.businessName.includes("סאמר אבו מוך") ||
    intake.businessName.includes("سامر أبو موخ") ||
    intake.businessName.includes("Samer Abu Mokh")
  );
}

const FACT_FIELDS = Object.keys(DEMO_FACTS) as FactKey[];

/** If the draft is still the stock pediatric demo, swap copy to the active locale. */
export function relocalizePediatricIntake(intake: Intake, locale: Locale): Intake {
  if (!isPediatricDemo(intake)) return intake;
  const next = demoIntake(locale);
  const out: Intake = { ...intake };
  for (const key of FACT_FIELDS) {
    const stock = [DEMO_FACTS[key].he, DEMO_FACTS[key].ar, DEMO_FACTS[key].en] as string[];
    if (stock.includes(String(intake[key] ?? ""))) {
      (out as unknown as Record<string, string>)[key] = DEMO_FACTS[key][locale];
    }
  }
  if (
    !intake.offer ||
    intake.offer === DEFAULT_OFFER_HE ||
    intake.offer === "لا يوجد عرض" ||
    intake.offer === "No offer" ||
    intake.offer === "no_offer"
  ) {
    out.offer = defaultOfferLabel(locale);
  }
  return out;
}
