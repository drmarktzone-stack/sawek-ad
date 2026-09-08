/**
 * Google + YouTube search-suggest helpers.
 * Observed suggestions only. Never invent volumes, trends, or performance.
 */
import type { Intake, PublicAdExample, ResearchSourceCard, ResearchSourceId, Tri } from "../types";
import { isNoOffer } from "../no-offer";
import { filled } from "../utils";

const L = (he: string, ar: string, en: string): Tri => ({ he, ar, en });

const FAKE_METRIC =
  /\b(ROAS|CPM|CPA|CTR)\s*[:=]\s*\d|\bspend\s*[:=]\s*\d|מיליון צפיות|million views|\d+\s*million\s+(views|likes)/i;

export const GENERIC_LATIN_FALLBACK = "mediterranean restaurant advertising";

export function buildSearchQueries(intake: Intake, extra?: { objective?: string; market?: string }): string[] {
  const offer = isNoOffer(intake.offer) ? "" : intake.offer.trim();
  const objective = (extra?.objective || intake.mainGoal || "").trim();
  const market = (extra?.market || intake.location || "").trim();
  const bits = [
    [intake.category, intake.voice?.niche, market].filter(filled).join(" "),
    [intake.businessName, intake.category].filter(filled).join(" "),
    [intake.category, intake.audience, objective].filter(filled).join(" "),
    [intake.uniqueAdvantage, intake.category].filter(filled).join(" "),
    [offer, intake.category, market].filter(filled).join(" "),
    [intake.biggestProblem, intake.category].filter(filled).join(" "),
  ]
    .map((s) => s.replace(/\s+/g, " ").trim().slice(0, 80))
    .filter((s) => s.length >= 3);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const q of bits) {
    const key = q.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(q);
    if (out.length >= 4) break;
  }
  return out;
}

/** Primary research query — business + industry + product + audience + market + objective. */
export function researchQueryFromFacts(intake: Intake): string {
  const qs = buildSearchQueries(intake);
  if (qs[0]) return qs[0];
  const bits = [intake.voice?.niche, intake.category, intake.businessName].map((s) => (s || "").trim()).filter(Boolean);
  return (bits.join(" ") || "local business advertising").replace(/\s+/g, " ").trim().slice(0, 80);
}

export function parseSuggestPayload(json: unknown): string[] {
  if (!Array.isArray(json)) return [];
  const raw = json[1];
  const list = Array.isArray(raw) ? raw : [];
  const out: string[] = [];
  for (const s of list) {
    if (typeof s !== "string") continue;
    const text = s.replace(/\s+/g, " ").trim().slice(0, 80);
    if (!text || FAKE_METRIC.test(text)) continue;
    if (!out.includes(text)) out.push(text);
  }
  return out;
}

export function suggestExploreUrl(kind: "google" | "youtube", query: string): string {
  const q = encodeURIComponent(query);
  return kind === "youtube"
    ? `https://www.youtube.com/results?search_query=${q}`
    : `https://www.google.com/search?q=${q}`;
}

export function suggestEndpoints(kind: "google" | "youtube", query: string): string[] {
  const q = encodeURIComponent(query);
  if (kind === "youtube") {
    return [
      `https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&hl=en&q=${q}`,
      `https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${q}`,
    ];
  }
  return [
    `https://suggestqueries.google.com/complete/search?client=firefox&hl=en&q=${q}`,
    `https://suggestqueries.google.com/complete/search?client=firefox&q=${q}`,
    `https://clients1.google.com/complete/search?client=firefox&q=${q}`,
  ];
}

export function examplesFromSuggestions(input: {
  source: ResearchSourceId;
  suggestions: string[];
  asOf: string;
  queryUsed: string;
  kind: "google" | "youtube";
}): PublicAdExample[] {
  return input.suggestions.slice(0, 8).map((text, i) => ({
    id: `${input.kind}-${i + 1}`,
    source: input.source,
    title: L(text, text, text),
    snippet: L(
      "הצעת חיפוש ציבורית — לא נפח, לא טרנד, לא ביצוע.",
      "اقتراح بحث عام — مش حجم ولا ترند ولا أداء.",
      "Public search suggestion — not a volume, trend, or performance number.",
    ),
    url: suggestExploreUrl(input.kind, text),
    asOf: input.asOf,
    kind: "search_suggestion",
    queryUsed: input.queryUsed,
  }));
}

export function suggestEmptyCard(input: {
  id: ResearchSourceId;
  label: Tri;
  exploreUrl: string;
  status: ResearchSourceCard["status"];
  reason: Tri;
  query: string;
}): ResearchSourceCard {
  const googleAlt = {
    label: L("חיפוש Google", "بحث Google", "Google Search"),
    url: suggestExploreUrl("google", input.query),
  };
  const ytAlt = {
    label: L("חיפוש YouTube", "بحث YouTube", "YouTube Search"),
    url: suggestExploreUrl("youtube", input.query),
  };
  const trendsAlt = {
    label: L("Google Trends (עמוד ציבורי)", "Google Trends (صفحة عامة)", "Google Trends (public page)"),
    url: `https://trends.google.com/trends/explore?q=${encodeURIComponent(input.query)}`,
  };
  return {
    id: input.id,
    status: input.status,
    label: input.label,
    exploreUrl: input.exploreUrl,
    examples: [],
    notes: [],
    emptyReason: input.reason,
    retryable: true,
    alternateSources: input.id === "youtube_suggest" ? [ytAlt, googleAlt, trendsAlt] : [googleAlt, ytAlt, trendsAlt],
  };
}

export function neverUseGenericRestaurantFallback(query: string): boolean {
  return query.trim().toLowerCase() !== GENERIC_LATIN_FALLBACK;
}
