import type { Intake, Locale } from "./types";
import { DEFAULT_OFFER_HE, defaultOfferLabel } from "./chips";
import { saveDraft } from "./storage";
import { clearEmptyCampaign } from "./empty-campaign";
import DEMO_SNAPSHOT from "./demo-snapshot.json";

export const DEMO_ID = "demo-samer-clinic";
export const PENDING_DEMO_KEY = "sawek-pending-demo";

/** Locked Arabic family name is أبو مخ — never أبو موخ. */
export function canonicalDoctorName(name: string): string {
  return name.replaceAll("أبو موخ", "أبو مخ");
}

function hebrewNameFromScan(): string {
  const m = DEMO_SNAPSHOT.description.match(/ד["״']?ר\s*סאמר[^|\n,]{0,40}אבו מוך/);
  return (m?.[0] || "").replace(/\s+/g, " ").trim();
}

function demoName(locale: Locale): string {
  if (locale === "he") return hebrewNameFromScan() || 'ד"ר סאמר מחמד אבו מוך';
  if (locale === "en") return "Dr. Samer Abu Mokh";
  return canonicalDoctorName(DEMO_SNAPSHOT.businessName);
}

/** Public facts only. No invented CAC, budget, patient counts, or ROAS. */
export function demoIntake(locale: Locale = "he"): Intake {
  const s = DEMO_SNAPSHOT;
  return {
    type: "business",
    depth: "quick",
    operatingModel: "free_service",
    businessName: demoName(locale),
    category: s.category,
    description: s.description,
    location: s.location,
    website: s.website,
    whatsapp: s.whatsapp,
    clinicHours: s.clinicHours,
    kupaFileBy: "",
    kupaMemberFrom: "",
    audience: s.audience,
    audienceCustom: false,
    biggestProblem: s.biggestProblem,
    problemCustom: true,
    uniqueAdvantage: s.uniqueAdvantage,
    advantageCustom: true,
    mainGoal: "walk_in",
    goalCustom: false,
    offer: defaultOfferLabel(locale),
    offerCustom: false,
    competitors: [],
    businessModel: "",
    avgOrderValue: "",
    marginPercent: "",
    targetCac: "",
    monthlyBudget: "",
    pastAds: "",
    pastResults: "",
    whatFailed: "",
    mediaAssets: [],
    ingestedDocs: [],
    pastCreatives: [],
    brandTone: "",
    brandPositioning: "",
    channelNotes: s.channelNotes,
    whatsappTemplates: "",
    landingLines: s.landingLines,
    brandKit: { colors: [], source: "none" },
  };
}

export const DEMO_LABEL = {
  he: "הדגמה: מרפאת ילדים",
  ar: "عرض: عيادة أطفال د. سامر أبو مخ",
  en: "Demo: pediatrics clinic",
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
    intake.businessName.includes("سامر أبو مخ") ||
    intake.businessName.includes("أبو مخ") ||
    intake.businessName.includes("Samer Abu Mokh")
  );
}

/** If the draft is still the stock pediatric demo, swap the locale-facing name. Facts stay the scan snapshot. */
export function relocalizePediatricIntake(intake: Intake, locale: Locale): Intake {
  if (!isPediatricDemo(intake)) {
    return { ...intake, businessName: canonicalDoctorName(intake.businessName) };
  }
  const out: Intake = { ...demoIntake(locale), mediaAssets: intake.mediaAssets ?? [], ingestedDocs: intake.ingestedDocs ?? [], pastCreatives: intake.pastCreatives ?? [] };
  out.businessName = canonicalDoctorName(demoName(locale));
  if (
    !intake.offer ||
    intake.offer === DEFAULT_OFFER_HE ||
    intake.offer === "لا يوجد عرض" ||
    intake.offer === "No offer" ||
    intake.offer === "no_offer"
  ) {
    out.offer = defaultOfferLabel(locale);
  } else {
    out.offer = intake.offer;
  }
  return out;
}
