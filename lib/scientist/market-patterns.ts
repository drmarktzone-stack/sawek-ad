import { uid } from "../utils";
import { evidence } from "./engines";
import type { Uncertainty } from "./types";
import {
  KNOWN_PATTERN_SLUGS,
  type ClaimLabel,
  type CreativePattern,
  type KnownPatternSlug,
  type MarketCreative,
  type MarketScanControls,
} from "./market-types";

const FAKE_METRIC =
  /\b(ROAS|CPM|CPA|CTR)\s*[:=]\s*\d|\bspend\s*[:=]\s*\d|מיליון צפיות|million views|\d+\s*million\s+(views|likes)|\blikes?\s*[:=]\s*\d|לייקים\s*\d|performed extremely well|guaranteed (leads|roas)/i;

export function looksLikeFakeMarketClaim(text: string): boolean {
  return FAKE_METRIC.test(text);
}

export function creativeFingerprint(parts: {
  platform: string;
  advertiser?: string;
  url: string;
  title: string;
}): string {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/https?:\/\//g, "")
      .replace(/[?#].*$/, "")
      .replace(/[^a-z0-9\u0590-\u05ff\u0600-\u06ff]+/g, " ")
      .trim()
      .slice(0, 160);
  return [parts.platform, parts.advertiser || "", parts.url, parts.title].map(norm).join("|");
}

const PATTERN_RULES: Array<{ slug: KnownPatternSlug; name: string; re: RegExp }> = [
  { slug: "problem-first", name: "Problem-first", re: /problem|pain|stuck|tired|struggling|לא מצליח|בעיה|כואב|مشكلة|تعب|ألم/i },
  { slug: "testimonial", name: "Testimonial", re: /testimonial|review|said|customer said|לקוח|המליץ|شهادة|قال|مراجعة/i },
  { slug: "offer-stack", name: "Offer stack", re: /bonus|stack|bundle|get \+|חבילה|בונוס|عرض|حزمة/i },
  { slug: "social-proof", name: "Social proof", re: /trusted by|\d+\s*\+?\s*(customers|clients|families)|הומלץ|מומלץ|موثوق|عملاء/i },
  { slug: "urgency", name: "Urgency", re: /today only|limited|last chance|עכשיו|היום בלבד|הזדמנות|اليوم|محدود/i },
  { slug: "before-after", name: "Before / after", re: /before|after|לפני|אחרי|قبل|بعد/i },
  { slug: "how-to", name: "How-to", re: /how to|step by step|איך|כך ת|كيف|خطوة/i },
  { slug: "founder-story", name: "Founder story", re: /i started|founder|we opened|הקמתי|פתחנו|أسست|افتتحت/i },
  { slug: "comparison", name: "Comparison", re: /\bvs\b|versus|unlike|בניגוד|בהשוואה|مقارنة|عكس/i },
  { slug: "community", name: "Community", re: /join (us|the)|community|קהילה|הצטרפ|مجتمع|انضم/i },
];

export function classifyPatternSlug(text: string): { slug: string; name: string; discovered: boolean } {
  const blob = text.trim();
  if (!blob) return { slug: "unclassified", name: "Unclassified", discovered: false };
  for (const rule of PATTERN_RULES) {
    if (rule.re.test(blob)) return { slug: rule.slug, name: rule.name, discovered: false };
  }
  const token = blob
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 3)
    .join("-");
  if (!token) return { slug: "unclassified", name: "Unclassified", discovered: false };
  return { slug: `discovered:${token}`, name: `Discovered: ${token.replace(/-/g, " ")}`, discovered: true };
}

const HOOK_RE = /^(.{12,80}?)([.!?…\n]|$)/;
const CTA_RE = /\b(book|call|whatsapp|sign up|learn more|קבעו|התקשרו|וואטסאפ|למידע|احجز|اتصل|واتساب)\b/i;
const OFFER_RE = /\b(off|sale|free|consult|הנחה|מבצע|ייעוץ|خصم|عرض|مجاني)\b/i;
const PROOF_RE = /\b(review|rated|certified| mill|לקוח|מומלץ|شهادة|موثوق)\b/i;

export function extractCreativeStructure(title: string, snippet: string): Pick<
  MarketCreative,
  "hook" | "problem" | "desire" | "promise" | "angle" | "offer" | "proof" | "cta" | "format"
> {
  const text = `${title} ${snippet}`.trim();
  const hook = HOOK_RE.exec(title || snippet)?.[1]?.trim();
  const classified = classifyPatternSlug(text);
  return {
    hook: hook || undefined,
    problem: /problem-first/.test(classified.slug) ? snippet.slice(0, 140) || undefined : undefined,
    desire: /community|how-to/.test(classified.slug) ? snippet.slice(0, 140) || undefined : undefined,
    promise: title.slice(0, 140) || undefined,
    angle: classified.name,
    offer: OFFER_RE.test(text) ? snippet.slice(0, 140) || title.slice(0, 140) : undefined,
    proof: PROOF_RE.test(text) ? snippet.slice(0, 140) : undefined,
    cta: CTA_RE.exec(text)?.[0],
    format: "unknown",
  };
}

function relevanceFor(controls: MarketScanControls, industry: string): Uncertainty {
  if (!controls.industry) return "low";
  if (!industry) return "unknown";
  const a = controls.industry.toLowerCase();
  const b = industry.toLowerCase();
  if (a === b || a.includes(b) || b.includes(a)) return "medium";
  return "low";
}

function confidenceFor(count: number, claim: ClaimLabel): Uncertainty {
  if (count <= 0) return "unknown";
  if (claim === "OBSERVED_FACT" && count >= 3) return "medium";
  if (count >= 3) return "low";
  return "low";
}

export function clusterPatterns(
  ads: MarketCreative[],
  controls: MarketScanControls,
  prior: CreativePattern[] = [],
): CreativePattern[] {
  const buckets = new Map<string, MarketCreative[]>();
  for (const ad of ads) {
    if (ad.kind !== "public_ad" && ad.kind !== "grounded_note") continue;
    const { slug } = classifyPatternSlug(`${ad.angle || ""} ${ad.title} ${ad.snippet}`);
    const list = buckets.get(slug) ?? [];
    list.push(ad);
    buckets.set(slug, list);
  }

  const out: CreativePattern[] = [];
  const seen = new Set<string>();
  for (const [slug, list] of buckets) {
    seen.add(slug);
    const known = (KNOWN_PATTERN_SLUGS as readonly string[]).includes(slug);
    const name = known ? PATTERN_RULES.find((r) => r.slug === slug)?.name || slug : slug.replace(/^discovered:/, "Discovered: ").replace(/-/g, " ");
    const platforms = [...new Set(list.map((a) => a.platform))];
    const industries = [...new Set(list.map((a) => a.category).filter(Boolean) as string[])];
    const regions = [...new Set(list.map((a) => a.region).filter(Boolean) as string[])];
    const objectives = [...new Set(list.map((a) => a.objective).filter(Boolean) as string[])];
    const dates = list.map((a) => a.dates.asOf).sort();
    const claim: ClaimLabel = list.every((a) => a.claim === "OBSERVED_FACT") ? "INFERENCE" : "INFERENCE";
    const count = list.length;
    const priorHit = prior.find((p) => p.slug === slug);
    const mergedIds = [...new Set([...(priorHit?.creativeIds ?? []), ...list.map((a) => a.id)])];
    const mergedCount = Math.max(count, mergedIds.length);
    out.push({
      id: priorHit?.id || uid("pat"),
      slug,
      name,
      description: `${name} creative structure extracted from public ad text. Patterns, not copies.`,
      exampleCount: mergedCount,
      platforms: [...new Set([...(priorHit?.platforms ?? []), ...platforms])],
      industries: [...new Set([...(priorHit?.industries ?? []), ...industries, controls.industry].filter(Boolean))],
      regions: [...new Set([...(priorHit?.regions ?? []), ...regions, controls.region].filter(Boolean))],
      objectives: [...new Set([...(priorHit?.objectives ?? []), ...objectives, controls.objective].filter(Boolean))],
      period: {
        from: dates[0] || priorHit?.period.from || new Date().toISOString(),
        to: dates[dates.length - 1] || priorHit?.period.to || new Date().toISOString(),
      },
      evidence: [
        evidence("public_research", `pattern.${slug}`, "calculated", `${mergedCount} examples`),
        ...list.slice(0, 4).map((a) => evidence("public_research", a.url, a.claim === "OBSERVED_FACT" ? "observed" : "ai_interpretation", a.title)),
      ],
      creativeIds: mergedIds.slice(0, 40),
      relevance: relevanceFor(controls, industries[0] || controls.industry),
      confidence: confidenceFor(mergedCount, claim),
      claim,
      language: `appears repeatedly across ${mergedCount} example${mergedCount === 1 ? "" : "s"}`,
    });
  }

  for (const old of prior) {
    if (!seen.has(old.slug)) out.push(old);
  }

  return out.sort((a, b) => b.exampleCount - a.exampleCount).slice(0, 24);
}

export function testedPatternSlugs(experimentNames: string[], hypotheses: string[]): Set<string> {
  const blob = `${experimentNames.join(" ")} ${hypotheses.join(" ")}`.toLowerCase();
  const out = new Set<string>();
  for (const slug of KNOWN_PATTERN_SLUGS) {
    const token = slug.replace(/-/g, " ");
    if (blob.includes(slug) || blob.includes(token)) out.add(slug);
  }
  return out;
}
