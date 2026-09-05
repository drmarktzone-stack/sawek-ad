import type { Intake, Locale } from "../types";
import { translateTexts } from "../translate";
import { completeGemini, factsToIntake, type GenerateBody } from "./gemini-generate";
import { inventsForbidden } from "./coach";

export type VariationChannel = "meta" | "google" | "whatsapp" | "story";

export type VariationCopy = {
  headline: string;
  body: string;
  cta: string;
};

export type AdVariation = {
  id: string;
  channel: VariationChannel;
  kind: string;
  he?: VariationCopy;
  ar?: VariationCopy;
  en?: VariationCopy;
};

export type VariationsOk = {
  ok: true;
  variations: AdVariation[];
  model?: string;
  provider?: "vertex" | "ai_studio";
  tier: "flash";
  localized?: boolean;
  translationDown?: boolean;
};

export type VariationsFail = {
  ok: false;
  reason: "no_facts" | "no_key" | "gemini_error" | "quota" | "vertex_denied";
};

export type VariationsResult = VariationsOk | VariationsFail;

const CHANNELS: VariationChannel[] = ["meta", "google", "whatsapp", "story"];

const SYSTEM =
  "You are SAWEK AD Flash — a fast copywriter. Produce MANY short ad variations in Hebrew, Arabic, and English. Use ONLY facts. Never invent prices, discounts, ratings, testimonials, VIP, ROAS, CAC, medical claims, or competitors. Recreate per language — do not literal-translate. Reply JSON only.";

function asObj(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function asCopy(v: unknown): VariationCopy | undefined {
  const o = asObj(v);
  if (!o) return undefined;
  const headline = typeof o.headline === "string" ? o.headline.trim() : "";
  const body = typeof o.body === "string" ? o.body.trim() : typeof o.copy === "string" ? o.copy.trim() : "";
  const cta = typeof o.cta === "string" ? o.cta.trim() : "";
  if (!headline && !body && !cta) return undefined;
  return { headline, body, cta };
}

function parseLooseJson(text: string): Record<string, unknown> | null {
  const stripped = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  try {
    const parsed: unknown = JSON.parse(stripped);
    return asObj(parsed);
  } catch {
    const m = stripped.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try {
      return asObj(JSON.parse(m[0]));
    } catch {
      return null;
    }
  }
}

function channelOf(v: unknown): VariationChannel {
  const s = String(v || "").toLowerCase();
  if (s.includes("whats") || s.includes("wa")) return "whatsapp";
  if (s.includes("google") || s.includes("search") || s.includes("rsa")) return "google";
  if (s.includes("stor") || s.includes("ig")) return "story";
  return "meta";
}

function factsBlock(intake: Intake): string {
  return [
    intake.businessName && `businessName: ${intake.businessName}`,
    intake.category && `category: ${intake.category}`,
    intake.description && `description: ${intake.description}`,
    intake.location && `location: ${intake.location}`,
    intake.audience && `audience: ${intake.audience}`,
    intake.offer && `offer: ${intake.offer}`,
    intake.uniqueAdvantage && `uniqueAdvantage: ${intake.uniqueAdvantage}`,
    intake.biggestProblem && `biggestProblem: ${intake.biggestProblem}`,
    intake.mainGoal && `mainGoal: ${intake.mainGoal}`,
    intake.whatsapp && `whatsapp: ${intake.whatsapp}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function safeCopy(copy: VariationCopy | undefined, intake: Intake): VariationCopy | undefined {
  if (!copy) return undefined;
  const blob = `${copy.headline}\n${copy.body}\n${copy.cta}`;
  if (inventsForbidden(blob, intake)) return undefined;
  return copy;
}

/**
 * Dedicated Flash path — dozens of short Meta / Google / WhatsApp / story texts.
 * Missing locales are filled by Cloud Translation (not string replace).
 */
export async function runFlashVariations(body: GenerateBody): Promise<VariationsResult> {
  const intake = factsToIntake(body);
  if (!intake.businessName.trim() && !intake.description.trim() && !intake.website.trim()) {
    return { ok: false, reason: "no_facts" };
  }
  const count = Math.max(8, Math.min(18, Math.floor(Number((body as { count?: unknown }).count) || 12)));
  const prompt = `Facts (use only these):\n${factsBlock(intake)}\n\nProduce ${count} short ad variations as JSON:\n{"variations":[{"channel":"meta|google|whatsapp|story","kind":"headline|short|cta","he":{"headline":"","body":"","cta":""},"ar":{"headline":"","body":"","cta":""},"en":{"headline":"","body":"","cta":""}}]}\nSpread channels evenly. Headlines ≤ 40 chars. Meta/Google body ≤ 90 chars. WhatsApp ≤ 280 chars. Recreate per language.`;

  const completed = await completeGemini({
    parts: [{ text: prompt }],
    temperature: 0.7,
    timeoutMs: 22_000,
    tier: "flash",
    systemInstruction: SYSTEM,
  });
  if (!completed.ok) {
    return { ok: false, reason: completed.reason };
  }

  const obj = parseLooseJson(completed.text);
  const raw = obj && Array.isArray(obj.variations) ? obj.variations : [];
  const variations: AdVariation[] = [];
  for (let i = 0; i < raw.length && variations.length < 18; i++) {
    const row = asObj(raw[i]);
    if (!row) continue;
    const he = safeCopy(asCopy(row.he), intake);
    const ar = safeCopy(asCopy(row.ar), intake);
    const en = safeCopy(asCopy(row.en), intake);
    if (!he && !ar && !en) continue;
    variations.push({
      id: `var-${variations.length + 1}`,
      channel: channelOf(row.channel),
      kind: typeof row.kind === "string" && row.kind.trim() ? row.kind.trim() : "short",
      ...(he ? { he } : {}),
      ...(ar ? { ar } : {}),
      ...(en ? { en } : {}),
    });
  }
  if (!variations.length) return { ok: false, reason: "gemini_error" };

  const localized = await fillMissingLocales(variations);
  return {
    ok: true,
    variations: localized.variations,
    model: completed.model,
    provider: completed.provider,
    tier: "flash",
    localized: localized.usedTranslation,
    translationDown: localized.translationDown,
  };
}

async function fillMissingLocales(
  variations: AdVariation[],
): Promise<{ variations: AdVariation[]; usedTranslation: boolean; translationDown: boolean }> {
  type Job = { i: number; field: "headline" | "body" | "cta"; target: Locale; text: string };
  const jobs: Job[] = [];
  for (let i = 0; i < variations.length; i++) {
    const v = variations[i]!;
    for (const field of ["headline", "body", "cta"] as const) {
      const he = v.he?.[field]?.trim() || "";
      const ar = v.ar?.[field]?.trim() || "";
      const en = v.en?.[field]?.trim() || "";
      const sourceText = he || en || ar;
      if (!sourceText) continue;
      if (!he) jobs.push({ i, field, target: "he", text: sourceText });
      if (!ar) jobs.push({ i, field, target: "ar", text: sourceText });
      if (!en) jobs.push({ i, field, target: "en", text: sourceText });
    }
  }
  if (!jobs.length) return { variations, usedTranslation: false, translationDown: false };

  const next = variations.map((v) => ({
    ...v,
    he: { headline: v.he?.headline || "", body: v.he?.body || "", cta: v.he?.cta || "" },
    ar: { headline: v.ar?.headline || "", body: v.ar?.body || "", cta: v.ar?.cta || "" },
    en: { headline: v.en?.headline || "", body: v.en?.body || "", cta: v.en?.cta || "" },
  }));

  let used = false;
  let down = false;
  const byTarget = new Map<Locale, Job[]>();
  for (const job of jobs) {
    const list = byTarget.get(job.target) ?? [];
    list.push(job);
    byTarget.set(job.target, list);
  }
  for (const [target, list] of byTarget) {
    const hit = await translateTexts({ texts: list.map((j) => j.text), target });
    if (!hit.ok) {
      down = true;
      continue;
    }
    used = true;
    list.forEach((job, idx) => {
      const translated = hit.texts[idx]?.trim();
      if (!translated) return;
      const row = next[job.i];
      if (!row) return;
      row[target] = { ...row[target]!, [job.field]: translated };
    });
  }
  return { variations: next, usedTranslation: used, translationDown: down };
}

export { CHANNELS as VARIATION_CHANNELS };
