import type { Intake, Locale } from "./types";
import { DEFAULT_OFFER_HE, defaultOfferLabel } from "./chips";
import { saveDraft } from "./storage";
import { clearEmptyCampaign } from "./empty-campaign";
import DEMO_SNAPSHOT from "./demo-snapshot.json";
import {
  catalogIntake,
  demoEntry,
  DEMO_ID,
  DEMO_OLIVE_ID,
  DEMO_SAND_ID,
  type DemoPackId,
} from "./demo-catalog";
import { applyDemoCmoDesk } from "./demo-cmo";
import { demoPhotoAssets } from "./demo-assets";

export { DEMO_ID, DEMO_OLIVE_ID, DEMO_SAND_ID } from "./demo-catalog";
export type { DemoPackId } from "./demo-catalog";

export const PENDING_DEMO_KEY = "sawek-pending-demo";

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

export function demoIntake(locale: Locale = "he"): Intake {
  const s = DEMO_SNAPSHOT;
  const base: Intake = {
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
    mediaAssets: demoPhotoAssets(DEMO_ID),
    ingestedDocs: [],
    pastCreatives: [],
    brandTone: "",
    brandPositioning: "",
    channelNotes: s.channelNotes,
    whatsappTemplates: "",
    landingLines: s.landingLines,
    brandKit: { colors: [], source: "none" },
  };
  return applyDemoCmoDesk(base, DEMO_ID, locale);
}

export const DEMO_LABEL = {
  he: "הדגמה — קמפיין מוכן",
  ar: "عرض — حملة جاهزة",
  en: "Demo — ready campaign",
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
    if (demoEntry(q)) return true;
    const pending = sessionStorage.getItem(PENDING_DEMO_KEY);
    return Boolean(demoEntry(pending));
  } catch {
    return false;
  }
}

export function resolvePendingDemoId(): DemoPackId | null {
  try {
    if (typeof window === "undefined") return null;
    const q = new URLSearchParams(window.location.search).get("demo");
    const fromUrl = demoEntry(q);
    if (fromUrl) return fromUrl.id;
    const pending = sessionStorage.getItem(PENDING_DEMO_KEY);
    return demoEntry(pending)?.id ?? null;
  } catch {
    return null;
  }
}

export function applyCatalogDemoDraft(idOrSlug: string, locale: Locale = "he"): Intake | null {
  const entry = demoEntry(idOrSlug);
  if (!entry) return null;
  if (entry.id === DEMO_ID) return applyPediatricDemoDraft(locale);
  clearEmptyCampaign();
  const intake = catalogIntake(entry.id, locale);
  if (!intake) return null;
  saveDraft({ intake, step: 2 });
  try {
    sessionStorage.setItem(PENDING_DEMO_KEY, entry.slug);
  } catch {
    /* private mode */
  }
  return intake;
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

export function relocalizePediatricIntake(intake: Intake, locale: Locale): Intake {
  if (!isPediatricDemo(intake)) {
    return { ...intake, businessName: canonicalDoctorName(intake.businessName) };
  }
  const fresh = demoIntake(locale);
  const out: Intake = {
    ...fresh,
    mediaAssets: (intake.mediaAssets ?? []).length ? intake.mediaAssets : fresh.mediaAssets,
    ingestedDocs: intake.ingestedDocs ?? [],
    pastCreatives: intake.pastCreatives ?? [],
  };
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

export function isOliveKitchenDemo(intake: Intake): boolean {
  const blob = `${intake.businessName}\n${intake.whatsapp}\n${intake.description}\n${intake.location}`;
  return /052-?7001234|מטבח הזית|مطبخ الزيتون|Olive Kitchen|נווה שקד/i.test(blob);
}

export function isAnyDemoIntake(intake: Intake): boolean {
  return isPediatricDemo(intake) || isOliveKitchenDemo(intake) || isSandBoutiqueDemo(intake);
}

export function isSandBoutiqueDemo(intake: Intake): boolean {
  const blob = `${intake.businessName}\n${intake.whatsapp}\n${intake.description}\n${intake.location}`;
  return /050-?8112233|בוטיק חול|بوتيك الرمل|Sand Boutique|עין ברק/i.test(blob);
}

export function relocalizeCatalogIntake(intake: Intake, locale: Locale): Intake {
  if (isPediatricDemo(intake)) return relocalizePediatricIntake(intake, locale);
  if (isOliveKitchenDemo(intake)) {
    const base = catalogIntake(DEMO_OLIVE_ID, locale)!;
    return {
      ...base,
      mediaAssets: (intake.mediaAssets ?? []).length ? intake.mediaAssets : base.mediaAssets,
      ingestedDocs: intake.ingestedDocs ?? [],
      pastCreatives: intake.pastCreatives ?? [],
      offer: intake.offerCustom ? intake.offer : base.offer,
    };
  }
  if (isSandBoutiqueDemo(intake)) {
    const base = catalogIntake(DEMO_SAND_ID, locale)!;
    return {
      ...base,
      mediaAssets: (intake.mediaAssets ?? []).length ? intake.mediaAssets : base.mediaAssets,
      ingestedDocs: intake.ingestedDocs ?? [],
      pastCreatives: intake.pastCreatives ?? [],
      offer: intake.offerCustom ? intake.offer : base.offer,
    };
  }
  return intake;
}
