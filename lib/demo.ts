import type { Intake, Locale } from "./types";
import { DEFAULT_OFFER_HE, defaultOfferLabel } from "./chips";
import { saveDraft } from "./storage";
import { clearEmptyCampaign } from "./empty-campaign";

export const DEMO_ID = "demo-samer-clinic";
export const PENDING_DEMO_KEY = "sawek-pending-demo";

const DEMO_FACTS = {
  businessName: {
    he: "מרפאת ילדים ד״ר סאמר אבו מוך",
    // Locked Arabic family name is أبو مخ — never أبو موخ.
    ar: "عيادة أطفال د. سامر أبو مخ",
    en: "Dr. Samer Abu Mokh Pediatrics",
  },
  category: {
    he: "מרפאת ילדים — כללית",
    ar: "عيادة أطفال — كلاليت",
    en: "Pediatrics — Clalit",
  },
  description: {
    he: "מרפאת ילדים של קופת חולים כללית בבאקה אל-גרביה. מתחם אל-נור, קומה 1, ליד הכיכר המרכזית. קבלה לפי סדר הגעה (جت أولاً), בלי לקבוע תור. שירות בעברית, ערבית ואנגלית. וואטסאפ 052-8885800. אתר: https://drsamerped.ai.studio. בלי הבטחת ריפוי ובלי מספרי מטופלים שלא פורסמו.",
    ar: "عيادة أطفال كلاليت بباقة الغربية. مجمع النور، الطابق 1، جنب الساحة. جت أولاً بدون مواعيد. عبري وعربي وإنجليزي. واتساب 052-8885800. الموقع: https://drsamerped.ai.studio. بلا وعد شفاء وبلا أعداد مرضى.",
    en: "Clalit pediatrics clinic in Baqa al-Gharbiyye. Al-Nour complex, floor 1, near the central square. Walk-in, first come first served, no appointment. Hebrew, Arabic, and English. WhatsApp 052-8885800. Site: https://drsamerped.ai.studio. No cure claims and no unpublished patient counts.",
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
    he: "משפחות בבאקה לא יודעות לאן ללכת היום כשהילד חולה — הפרסום הכללי נשמע כמו עוד מרפאה.",
    ar: "الأهل بباقة مش عارفين وين يروحوا اليوم لما الولد بيمرض — الإعلان العام بيبين كأي عيادة.",
    en: "Families in Baqa don’t know where to go today when a child is sick — generic ads sound like every other clinic.",
  },
  uniqueAdvantage: {
    he: "מרפאת ילדים כללית במתחם אל-נור קומה 1, קבלה לפי סדר הגעה, וואטסאפ 052-8885800, עברית/ערבית/אנגלית",
    ar: "كلاليت أطفال بمجمع النور طابق 1، جت أولاً، واتساب 052-8885800، عبري/عربي/إنجليزي",
    en: "Clalit pediatrics in Al-Nour floor 1, walk-in, WhatsApp 052-8885800, HE/AR/EN",
  },
  mainGoal: {
    he: "ביקור לפי סדר הגעה (בלי תור)",
    ar: "جت أولاً بدون مواعيد",
    en: "Walk-in (no appointment)",
  },
  businessModel: {
    he: "מרפאת ילדים כללית. ליד = ביקור לפי סדר הגעה, לא תור קבוע מראש. שפות: עברית, ערבית, אנגלית.",
    ar: "عيادة أطفال كلاليت. العميل = زيارة حسب الدور، مش موعد محجوز. لغات: عبري عربي إنجليزي.",
    en: "Clalit pediatrics clinic. A lead = a walk-in visit, not a pre-booked slot. Reception languages: Hebrew, Arabic, English.",
  },
  clinicHours: {
    he: "קבלה לפי סדר הגעה (جت أولاً), בלי לקבוע תור. מתחם אל-נור קומה 1.",
    ar: "جت أولاً بدون مواعيد. مجمع النور، الطابق 1، جنب الساحة.",
    en: "Walk-in, first come first served — no appointment. Al-Nour, 1st floor.",
  },
  kupaFileBy: {
    he: "15 בספטמבר 2026",
    ar: "15 أيلول 2026",
    en: "15 Sep 2026",
  },
  kupaMemberFrom: {
    he: "1 בנובמבר 2026",
    ar: "1 تشرين الثاني 2026",
    en: "1 Nov 2026",
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
    clinicHours: f.clinicHours[locale],
    kupaFileBy: f.kupaFileBy[locale],
    kupaMemberFrom: f.kupaMemberFrom[locale],
    audience: f.audience[locale],
    audienceCustom: true,
    biggestProblem: f.biggestProblem[locale],
    problemCustom: true,
    uniqueAdvantage: f.uniqueAdvantage[locale],
    advantageCustom: true,
    mainGoal: "walk_in",
    goalCustom: false,
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
  ar: "عرض: عيادة أطفال د. سامر أبو مخ",
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

/** Locked Arabic family name is أبو مخ. Do not rewrite مخ → موخ. */
export function canonicalDoctorName(name: string): string {
  return name.replaceAll("أبو موخ", "أبو مخ");
}

export function isPediatricDemo(intake: Intake): boolean {
  return (
    intake.website.includes("drsamerped.ai.studio") ||
    intake.businessName.includes("סאמר אבו מוך") ||
    intake.businessName.includes("سامر أبو موخ") ||
    intake.businessName.includes("سامر أبو مخ") ||
    intake.businessName.includes("أبو مخ") ||
    intake.businessName.includes("Samer Abu Mokh")
  );
}

const FACT_FIELDS = Object.keys(DEMO_FACTS) as FactKey[];

/** If the draft is still the stock pediatric demo, swap copy to the active locale. */
export function relocalizePediatricIntake(intake: Intake, locale: Locale): Intake {
  if (!isPediatricDemo(intake)) {
    return { ...intake, businessName: canonicalDoctorName(intake.businessName) };
  }
  const out: Intake = { ...intake };
  const oldArName = "عيادة أطفال د. سامر أبو موخ";
  for (const key of FACT_FIELDS) {
    const stock = [DEMO_FACTS[key].he, DEMO_FACTS[key].ar, DEMO_FACTS[key].en] as string[];
    if (key === "businessName") stock.push(oldArName);
    const current = String(intake[key] ?? "");
    if (!current || stock.includes(current) || stock.includes(canonicalDoctorName(current))) {
      (out as unknown as Record<string, string>)[key] = DEMO_FACTS[key][locale];
    }
  }
  out.businessName = canonicalDoctorName(out.businessName);
  if (
    !intake.offer ||
    intake.offer === DEFAULT_OFFER_HE ||
    intake.offer === "لا يوجد عرض" ||
    intake.offer === "No offer" ||
    intake.offer === "no_offer"
  ) {
    out.offer = defaultOfferLabel(locale);
  }
  out.mainGoal = "walk_in";
  out.goalCustom = false;
  if (!out.clinicHours) out.clinicHours = DEMO_FACTS.clinicHours[locale];
  if (!out.kupaFileBy) out.kupaFileBy = DEMO_FACTS.kupaFileBy[locale];
  if (!out.kupaMemberFrom) out.kupaMemberFrom = DEMO_FACTS.kupaMemberFrom[locale];
  return out;
}
