import type { Intake } from "./types";
import { DEFAULT_OFFER_HE } from "./chips";
import { saveDraft } from "./storage";

export const DEMO_ID = "demo-samer-clinic";
export const PENDING_DEMO_KEY = "ilan-pending-demo";

/** Public facts only. No invented CAC, budget, patient counts, or ROAS. */
export function demoIntake(): Intake {
  return {
    type: "business",
    depth: "quick",
    businessName: "מרפאת ילדים ד״ר סאמר אבו מוך",
    category: "מרפאת ילדים — כללית",
    description:
      "מרפאת ילדים של קופת חולים כללית בבאקה אל-גרביה. מתחם אל-נור, קומה 1, ליד הכיכר המרכזית. שירות בעברית, ערבית ואנגלית. וואטסאפ 052-8885800. אתר: https://drsamerped.ai.studio. בלי הבטחת ריפוי ובלי מספרי מטופלים שלא פורסמו.",
    location: "באקה אל-גרביה — מתחם אל-נור, קומה 1, ליד הכיכר המרכזית",
    website: "https://drsamerped.ai.studio",
    whatsapp: "052-8885800",
    audience: "הורים בבאקה אל-גרביה והסביבה שמחפשים רופא ילדים קבוע בכללית, בעברית / ערבית / אנגלית",
    audienceCustom: true,
    biggestProblem:
      "משפחות דוחות תור כי לא ברור איך לקבוע אצל רופא ילדים קבוע באזור — הפרסום הכללי נשמע כמו עוד מרפאה.",
    problemCustom: true,
    uniqueAdvantage:
      "מרפאת ילדים כללית במתחם אל-נור (קומה 1, ליד הכיכר), עם שירות HE/AR/EN ווואטסאפ ישיר 052-8885800",
    advantageCustom: true,
    mainGoal: "לידים לתור ראשון",
    goalCustom: true,
    offer: DEFAULT_OFFER_HE,
    offerCustom: false,
    competitors: [],
    businessModel:
      "מרפאת ילדים כללית. ליד = תור ראשון במרפאה. שפות קבלה: עברית, ערבית, אנגלית.",
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

export function applyPediatricDemoDraft(): Intake {
  const intake = demoIntake();
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
    return sessionStorage.getItem(PENDING_DEMO_KEY) === "samer-peds";
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
    intake.businessName.includes("Samer Abu Mokh")
  );
}
