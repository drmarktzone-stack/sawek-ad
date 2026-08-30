import type { AdVariant, Intake, Locale } from "../types";
import { filled } from "../utils";
import { inventsForbidden } from "./coach";
import { isClinicLike } from "../vertical";

const ABORT_MS = 14_000;
const GENERATE_PATH = "/api/generate";

const VARIANT_KINDS = [
  "strong_offer",
  "very_short",
  "emotional",
  "narrative",
  "direct_sales",
  "unique_advantage",
] as const;

export type GeminiAdCopy = {
  headline?: string;
  copy?: string;
  cta?: string;
};

type GeminiResponse = {
  ok?: boolean;
  reason?: string;
  useTemplates?: boolean;
  headlines?: unknown;
  copy?: unknown;
  cta?: unknown;
  text?: unknown;
};

function asTrimmed(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  return s || undefined;
}

function asHeadlines(v: unknown): string[] {
  if (typeof v === "string" && v.trim()) return [v.trim()];
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === "string")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 6);
}

function factLine(label: string, value: string | undefined): string | undefined {
  if (!filled(value)) return undefined;
  return `${label}: ${value!.trim()}`;
}

/** Description payload — intake facts only, never invented claims. */
function descriptionFromIntake(intake: Intake): string {
  return [
    factLine("businessName", intake.businessName),
    factLine("category", intake.category),
    factLine("description", intake.description),
    factLine("location", intake.location),
    factLine("offer", intake.offer),
    factLine("uniqueAdvantage", intake.uniqueAdvantage),
    factLine("biggestProblem", intake.biggestProblem),
    factLine("mainGoal", intake.mainGoal),
    factLine("website", intake.website),
    factLine("whatsapp", intake.whatsapp),
    factLine("clinicHours", intake.clinicHours),
    factLine("kupaFileBy", intake.kupaFileBy),
    factLine("kupaMemberFrom", intake.kupaMemberFrom),
    factLine("brandTone", intake.brandTone),
    factLine("brandPositioning", intake.brandPositioning),
  ]
    .filter(Boolean)
    .join("\n");
}

function promptFor(locale: Locale, sixHeadlines: boolean): string {
  const kinds = VARIANT_KINDS.join(", ");
  const langName = locale === "he" ? "Hebrew" : locale === "ar" ? "Arabic" : "English";
  const missing =
    locale === "he" ? "[יש להשלים]" : locale === "ar" ? "[يجب الاستكمال]" : "[TO COMPLETE]";
  if (sixHeadlines) {
    return `Produce JSON {"headlines":["...","...","...","...","...","..."],"copy":"...","cta":"..."}. Exactly 6 headlines in this order: ${kinds}. Language: ${langName}. Use ONLY facts in description and audience. Never invent prices, discounts, ratings, testimonials, VIP, ROAS, CAC, medical claims, or competitors. If a fact is missing, write ${missing}.`;
  }
  return `Produce JSON {"headlines":["..."],"copy":"...","cta":"..."}. One headline, copy, and CTA. Language: ${langName}. Use ONLY facts in description and audience. Never invent prices, discounts, ratings, testimonials, VIP, ROAS, CAC, medical claims, or competitors. If a fact is missing, write ${missing}.`;
}

function generateUrl(): string {
  if (typeof window !== "undefined") return GENERATE_PATH;
  const base = process.env.NEXT_PUBLIC_BASE_URL?.trim() || "http://127.0.0.1:43147";
  return `${base.replace(/\/$/, "")}${GENERATE_PATH}`;
}

function payloadFromIntake(
  intake: Intake,
  language: Locale,
  sixHeadlines: boolean,
): {
  description: string;
  audience: string;
  language: Locale;
  medical: boolean;
  prompt: string;
} {
  return {
    description: descriptionFromIntake(intake),
    audience: intake.audience.trim(),
    language,
    medical: isClinicLike(intake),
    prompt: promptFor(language, sixHeadlines),
  };
}

function safeText(text: string | undefined, intake: Intake): string | undefined {
  if (!text) return undefined;
  if (inventsForbidden(text, intake)) return undefined;
  return text;
}

async function postGenerate(
  body: {
    description: string;
    audience: string;
    language: Locale;
    medical: boolean;
    prompt: string;
  },
): Promise<GeminiResponse | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ABORT_MS);
  try {
    const res = await fetch(generateUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as GeminiResponse;
    if (!data || data.ok === false || data.reason === "no_key" || data.useTemplates) {
      return null;
    }
    return data;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function overlayFromResponse(data: GeminiResponse, intake: Intake): GeminiAdCopy | null {
  const headlines = asHeadlines(data.headlines);
  const copy = safeText(asTrimmed(data.copy), intake);
  const cta = safeText(asTrimmed(data.cta), intake);
  const headline = safeText(headlines[0], intake);
  if (!headline && !copy && !cta) return null;
  return {
    ...(headline ? { headline } : {}),
    ...(copy ? { copy } : {}),
    ...(cta ? { cta } : {}),
  };
}

/**
 * Overlay Gemini headlines[0..5] / copy / cta onto Hebrew variants only.
 * Other locales keep templates. No-op (same array) on no_key / useTemplates / network / timeout / invented claims.
 * Never logs secrets.
 */
export async function enrichVariantsWithGemini(
  intake: Intake,
  variants: AdVariant[],
): Promise<AdVariant[]> {
  const data = await postGenerate(payloadFromIntake(intake, "he", true));
  if (!data) return variants;

  const headlines = asHeadlines(data.headlines).map((h) => safeText(h, intake));
  const copy = safeText(asTrimmed(data.copy), intake);
  const cta = safeText(asTrimmed(data.cta), intake);
  if (!headlines.some(Boolean) && !copy && !cta) return variants;

  let heIndex = 0;
  return variants.map((v) => {
    if (v.locale !== "he") return v;
    const i = heIndex;
    heIndex += 1;
    const headline = headlines[i] || v.headline;
    return {
      ...v,
      headline,
      primaryText: copy ?? v.primaryText,
      cta: cta ?? v.cta,
    };
  });
}

/** Single overlay for produceAd callers. Locale may be he/ar/en. Returns null on fallback. */
export async function geminiAdCopy(
  intake: Intake,
  locale: Locale,
): Promise<GeminiAdCopy | null> {
  const data = await postGenerate(payloadFromIntake(intake, locale, false));
  if (!data) return null;
  return overlayFromResponse(data, intake);
}
