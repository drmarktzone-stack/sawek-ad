/**
 * Hook & line marketplace — Gemini (Vertex + Search Grounding) + research + facts.
 * Never invents ROAS, prices, Clalit-for-non-Clalit, or cross-clinic slogans.
 */
import type { CopyLineKind, CopyLineOption, CopyLinePool, Intake, Locale, MarketResearch } from "../types";
import { uid } from "../utils";
import { isClalitCoverageFact, isFreeService } from "../operating-model";
import { isNoOffer } from "../no-offer";
import { completeGemini } from "./gemini-generate";
import {
  COPY_LINE_MIN,
  buildLocalCopyLinePool,
  copyBatchQuality,
  lineKey,
  lineOk,
  makeOption,
  normLine,
  pickDiverseSelection,
  pickPrimaryIds,
  researchSnippets,
  tooSimilar,
} from "./copy-line-pool";

export {
  COPY_LINE_MIN,
  applyCopyLinesToPack,
  attachLocalCopyLines,
  buildLocalCopyLinePool,
  copyBatchQuality,
  ctaOptionsFor,
  diversifyLocaleBatch,
} from "./copy-line-pool";

function parseLooseJson(text: string): Record<string, unknown> | null {
  const stripped = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  try {
    const parsed: unknown = JSON.parse(stripped);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch {
    const m = stripped.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try {
      const parsed: unknown = JSON.parse(m[0]);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }
}

function factsBlock(intake: Intake): string {
  return [
    intake.businessName && `businessName: ${intake.businessName}`,
    intake.category && `category: ${intake.category}`,
    intake.description && `description: ${intake.description}`,
    intake.location && `location: ${intake.location}`,
    intake.audience && `audience: ${intake.audience}`,
    intake.uniqueAdvantage && `uniqueAdvantage: ${intake.uniqueAdvantage}`,
    intake.biggestProblem && `biggestProblem: ${intake.biggestProblem}`,
    intake.offer && `offer: ${intake.offer}`,
    intake.website && `website: ${intake.website}`,
    intake.whatsapp && `whatsapp: ${intake.whatsapp}`,
    intake.clinicHours && `clinicHours: ${intake.clinicHours}`,
    intake.operatingModel && `operatingModel: ${intake.operatingModel}`,
    isClalitCoverageFact(intake) ? "coverage: Clalit (stated fact)" : "coverage: do not mention Clalit",
    isFreeService(intake) ? "model: free_service — visit/WhatsApp CTA, never buy-now" : "",
    isNoOffer(intake.offer) ? "offer: none — do not invent a discount" : "",
  ]
    .filter(Boolean)
    .join("\n");
}

const LINE_SYSTEM =
  "You are SAWEK AD copy. Produce MANY distinct customer-facing ad lines for THIS business only. Default Arabic is Palestinian colloquial (هاليوم، تعوا، مش، شو، هون). Use ONLY facts. Never invent prices, ROAS, CAC, ratings, testimonials, Clalit unless it is a stated fact, or slogans from another clinic. Never print strategy labels (الساعات هي البطل, مرآة المشكلة, مش شعار طبي, hours as hero). Each headline and each CTA in the batch must be unique. Reply JSON only.";

export async function generateGroundedCopyLines(input: {
  intake: Intake;
  locale: Locale;
  research?: MarketResearch;
  exclude?: string[];
}): Promise<CopyLinePool> {
  const local = buildLocalCopyLinePool(input.intake, input.locale, {
    research: input.research,
    exclude: input.exclude,
  });
  const researchBits = researchSnippets(input.research, input.locale)
    .slice(0, 6)
    .map((s) => `- ${s.text}${s.url ? ` (${s.url})` : ""}`)
    .join("\n");
  const langName = input.locale === "ar" ? "Palestinian colloquial Arabic" : input.locale === "he" ? "Hebrew" : "English";
  const prompt = `Facts (LAYER A — only these are true):\n${factsBlock(input.intake)}\n\nPublic research notes (structure only — do not copy competitor offers/prices):\n${researchBits || "(none yet)"}\n\nLocale: ${langName} (${input.locale})\nProduce AT LEAST 12 DISTINCT options as JSON:\n{"lines":[{"kind":"hook|headline|primaryText|cta","text":""}],"sources":[{"url":"","title":""}]}\nNeed: ≥4 headlines, ≥3 hooks, ≥2 primaryText, ≥4 CTAs. No duplicate headlines. No duplicate CTAs. No strategy labels. Ground every line in the facts.`;

  const completed = await completeGemini({
    parts: [{ text: prompt }],
    temperature: 0.85,
    timeoutMs: 28_000,
    tier: "pro",
    grounding: true,
    systemInstruction: LINE_SYSTEM,
  }).catch(() => ({ ok: false as const, reason: "gemini_error" as const }));

  if (!completed.ok) {
    return { ...local, grounded: Boolean(input.research?.grounded) };
  }

  const obj = parseLooseJson(completed.text);
  const raw = obj && Array.isArray(obj.lines) ? obj.lines : [];
  const geminiOpts: CopyLineOption[] = [];
  const seen = new Set<string>();
  const kinds: CopyLineKind[] = ["hook", "headline", "primaryText", "cta"];
  for (let i = 0; i < raw.length && geminiOpts.length < 24; i++) {
    const row = raw[i];
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const kindRaw = String(rec.kind || "headline").trim();
    const kind = (kinds.includes(kindRaw as CopyLineKind) ? kindRaw : "headline") as CopyLineKind;
    const text = normLine(String(rec.text || rec.headline || rec.copy || rec.cta || ""));
    if (!text || seen.has(lineKey(text))) continue;
    if (!lineOk(text, input.intake, input.locale)) continue;
    if ((input.exclude ?? []).some((e) => tooSimilar(e, text))) continue;
    seen.add(lineKey(text));
    geminiOpts.push(makeOption(kind, text, input.locale, "gemini", geminiOpts.length));
  }

  const merged: CopyLineOption[] = [];
  const mergedSeen = new Set<string>();
  for (const o of [...geminiOpts, ...local.options]) {
    if (mergedSeen.has(lineKey(o.text))) continue;
    if ([...mergedSeen].some((k) => tooSimilar(k, o.text))) continue;
    mergedSeen.add(lineKey(o.text));
    merged.push({ ...o, id: `line-${o.kind}-${merged.length}-${uid("m").slice(-5)}` });
  }

  const quality = copyBatchQuality(merged, input.intake);
  const options = quality.ok ? merged : copyBatchQuality(local.options, input.intake).ok ? local.options : merged.filter((o) => lineOk(o.text, input.intake, input.locale));
  const final = options.length >= COPY_LINE_MIN ? options : local.options;
  const selectedIds = pickDiverseSelection(final);
  const groundingSources = completed.ok && "groundingSources" in completed ? completed.groundingSources ?? [] : [];
  return {
    locale: input.locale,
    options: final,
    selectedIds,
    primaryIds: pickPrimaryIds(final, selectedIds),
    generatedAt: new Date().toISOString(),
    batchId: uid("batch"),
    grounded: Boolean(completed.ok && ("grounded" in completed ? completed.grounded : true)),
    sources: [...groundingSources, ...(local.sources ?? [])].slice(0, 8),
  };
}
