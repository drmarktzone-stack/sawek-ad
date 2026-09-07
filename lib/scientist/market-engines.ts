import type { Intake, Locale, MarketResearch, PublicAdExample, ResearchSourceCard, Tri } from "../types";
import { uid } from "../utils";
import { emptyIntake } from "../engine/validate";
import { researchGeo, researchQuery } from "../engine/research-public";
import { evidence } from "./engines";
import type {
  CompetitorGap,
  EvidenceLink,
  GrowthWorkspace,
  Hypothesis,
  Opportunity,
  Uncertainty,
} from "./types";
import {
  defaultScanControls,
  emptyMarketDna,
  emptyMarketIntel,
  type ClaimLabel,
  type CompetitorInsight,
  type MarketCreative,
  type MarketDna,
  type MarketDnaTrait,
  type MarketIntel,
  type MarketPlatform,
  type MarketScan,
  type MarketScanControls,
  type MarketSignal,
  type MarketSourceRecord,
  type RecommendedExperiment,
  MARKET_MAX_ADS,
  MARKET_MAX_SCANS,
  MARKET_AUTO_SCAN_MS,
} from "./market-types";
import {
  classifyPatternSlug,
  clusterPatterns,
  creativeFingerprint,
  extractCreativeStructure,
  looksLikeFakeMarketClaim,
  testedPatternSlugs,
} from "./market-patterns";

const nowIso = () => new Date().toISOString();

function tri(v: Tri | undefined, locale: Locale = "en"): string {
  if (!v) return "";
  return String(v[locale] || v.en || v.he || v.ar || "").trim();
}

export function hasMarketScanContext(ws: GrowthWorkspace): boolean {
  const name = ws.business.name.trim();
  const industry = ws.business.category.trim() || ws.market?.dna.industry.trim();
  const region = ws.business.location.trim() || ws.market?.dna.region.trim();
  return Boolean(name && (industry || region));
}

export function scanIsStale(ws: GrowthWorkspace, maxAgeMs = MARKET_AUTO_SCAN_MS): boolean {
  const last = ws.market?.scans[0]?.finishedAt;
  if (!last) return true;
  const t = Date.parse(last);
  if (!Number.isFinite(t)) return true;
  return Date.now() - t > maxAgeMs;
}

export function watchIsDue(ws: GrowthWorkspace, now = Date.now()): boolean {
  const watch = ws.market?.watch;
  if (!watch?.enabled) return false;
  const last = watch.lastRunAt ? Date.parse(watch.lastRunAt) : 0;
  const interval = Math.max(1, watch.intervalHours) * 60 * 60_000;
  return !Number.isFinite(last) || now - last >= interval;
}

export function controlsFromWorkspace(ws: GrowthWorkspace, override?: Partial<MarketScanControls>): MarketScanControls {
  const intakeLike = emptyIntake();
  intakeLike.category = ws.business.category;
  intakeLike.location = ws.business.location;
  intakeLike.businessName = ws.business.name;
  intakeLike.offer = ws.dna.traits.find((t) => t.topic === "offer")?.claim ?? "";
  intakeLike.voice = {
    niche: ws.business.category,
    coreMessage: "",
    personalVoice: "",
    dialect: "",
  };
  const region = override?.region || ws.market?.watch?.controls.region || researchGeo(intakeLike);
  const industry = override?.industry || ws.market?.watch?.controls.industry || ws.business.category;
  const objective =
    override?.objective ||
    ws.market?.watch?.controls.objective ||
    ws.audience.nodes.find((n) => n.kind === "desire")?.text ||
    ws.dna.traits.find((t) => t.topic === "audience")?.claim ||
    "";
  intakeLike.category = industry || ws.business.category;
  const query = override?.query || ws.market?.watch?.controls.query || researchQuery(intakeLike);
  return defaultScanControls({
    region,
    language: override?.language || ws.market?.watch?.controls.language || "he",
    industry,
    objective,
    lookbackDays: override?.lookbackDays ?? ws.market?.watch?.controls.lookbackDays ?? 7,
    competitorCategory: override?.competitorCategory || ws.market?.watch?.controls.competitorCategory || industry,
    query,
  });
}

export function intakeFromWorkspace(ws: GrowthWorkspace, controls: MarketScanControls): Intake {
  const intake = emptyIntake();
  intake.businessName = ws.business.name;
  intake.category = controls.industry || ws.business.category;
  intake.location = controls.region || ws.business.location;
  intake.website = ws.business.website;
  intake.description = [controls.objective, controls.competitorCategory].filter(Boolean).join(" · ");
  intake.offer = ws.dna.traits.find((t) => t.topic === "offer")?.claim ?? "";
  intake.audience = ws.audience.nodes.find((n) => n.kind === "segment")?.text ?? "";
  intake.biggestProblem = ws.audience.nodes.find((n) => n.kind === "pain")?.text ?? "";
  intake.mainGoal = controls.objective;
  intake.uniqueAdvantage = ws.dna.traits.find((t) => t.topic === "advantage")?.claim ?? "";
  intake.voice = {
    niche: controls.industry || ws.business.category,
    coreMessage: controls.query,
    personalVoice: "",
    dialect: "",
  };
  return intake;
}

function sourceReason(card: ResearchSourceCard): string {
  const r = card.emptyReason;
  if (r) return tri(r) || card.status;
  if (card.status === "ok") return "Official or public API returned examples.";
  if (card.status === "grounded") return "Search-grounded notes only — not an official live feed.";
  if (card.status === "no_token") return "No official token. Public explore URL only.";
  if (card.status === "blocked") return "Source unavailable or login-walled. Not invented.";
  if (card.status === "rate_limited") return "Rate limited. Cached or explore URL only.";
  if (card.status === "empty") return "Source returned no rows for this query.";
  return card.status;
}

function claimForExample(card: ResearchSourceCard, kind: MarketCreative["kind"]): ClaimLabel {
  if (kind === "search_suggestion" && card.status === "ok") return "OBSERVED_FACT";
  if (kind === "public_ad" && card.status === "ok") return "OBSERVED_FACT";
  if (card.status === "grounded") return "ESTIMATE";
  if (kind === "grounded_note") return "ESTIMATE";
  return "UNKNOWN";
}

function kindForSource(platform: MarketPlatform): MarketCreative["kind"] {
  if (platform === "youtube_suggest") return "search_suggestion";
  if (platform === "pinterest_trends" || platform === "google_trends" || platform === "gemini_search_grounding") {
    return "grounded_note";
  }
  return "public_ad";
}

export function adsFromResearch(
  research: MarketResearch,
  scanId: string,
  controls: MarketScanControls,
): MarketCreative[] {
  const ads: MarketCreative[] = [];
  const seen = new Set<string>();
  const push = (ex: PublicAdExample, card: ResearchSourceCard) => {
    const title = tri(ex.title);
    const snippet = tri(ex.snippet);
    const blob = `${ex.advertiser ?? ""} ${title} ${snippet}`;
    if (!title && !snippet) return;
    if (looksLikeFakeMarketClaim(blob)) return;
    const kind = kindForSource(ex.source);
    const claim = claimForExample(card, kind);
    const advertiser = (ex.advertiser || ex.page || "").trim() || undefined;
    const fp = creativeFingerprint({
      platform: ex.source,
      advertiser,
      url: ex.url,
      title,
    });
    if (seen.has(fp)) return;
    seen.add(fp);
    const structure = extractCreativeStructure(title, snippet);
    ads.push({
      id: uid("mad"),
      scanId,
      kind,
      source: ex.source,
      platform: ex.source,
      url: ex.url,
      advertiser,
      region: controls.region,
      language: controls.language,
      category: controls.industry || controls.competitorCategory || undefined,
      objective: controls.objective || undefined,
      dates: { asOf: ex.asOf || research.asOf },
      performance: [],
      extractedAt: nowIso(),
      title,
      snippet,
      ...structure,
      claim,
      fingerprint: fp,
    });
  };

  for (const card of research.sources) {
    for (const ex of card.examples) push(ex, card);
  }
  for (const note of research.notes) {
    const title = tri(note.title);
    const snippet = tri(note.note);
    if (!title && !snippet) continue;
    if (looksLikeFakeMarketClaim(`${title} ${snippet}`)) continue;
    const url = note.sourceUrl || "";
    if (!url) continue;
    const fp = creativeFingerprint({ platform: "gemini_search_grounding", url, title });
    if (seen.has(fp)) continue;
    seen.add(fp);
    ads.push({
      id: uid("mad"),
      scanId,
      kind: "grounded_note",
      source: "gemini_search_grounding",
      platform: "gemini_search_grounding",
      url,
      region: controls.region,
      language: controls.language,
      category: controls.industry || undefined,
      objective: controls.objective || undefined,
      dates: { asOf: note.asOf || research.asOf },
      performance: [],
      extractedAt: nowIso(),
      title,
      snippet,
      ...extractCreativeStructure(title, snippet),
      claim: "ESTIMATE",
      fingerprint: fp,
    });
  }
  return ads;
}

export function sourcesFromResearch(research: MarketResearch, extraTrendsUrl?: string): MarketSourceRecord[] {
  const t = nowIso();
  const rows: MarketSourceRecord[] = research.sources.map((card) => ({
    id: card.id,
    platform: card.id,
    exploreUrl: card.exploreUrl,
    status: card.status,
    reason: sourceReason(card),
    lastCheckedAt: t,
  }));
  rows.push({
    id: "gemini_search_grounding",
    platform: "gemini_search_grounding",
    exploreUrl: extraTrendsUrl || research.sources[0]?.exploreUrl || "",
    status: research.grounded ? "grounded" : research.fetched ? "empty" : "pending",
    reason: research.grounded
      ? "Vertex Search Grounding returned citations. Notes labeled ESTIMATE unless an official API also confirmed the row."
      : "Search Grounding did not return citations this pass.",
    lastCheckedAt: t,
  });
  if (extraTrendsUrl) {
    rows.push({
      id: "google_trends",
      platform: "google_trends",
      exploreUrl: extraTrendsUrl,
      status: research.grounded ? "grounded" : "unavailable",
      reason: "Official Google Trends explore URL. No scrape — Search Grounding may cite it. Not a live ranking API.",
      lastCheckedAt: t,
    });
  }
  return rows;
}

function googleTrendsUrl(query: string, region: string): string {
  const q = encodeURIComponent(query || "local business advertising");
  const geo = encodeURIComponent(region || "IL");
  return `https://trends.google.com/trends/explore?q=${q}&geo=${geo}`;
}

function mergeAds(prior: MarketCreative[], incoming: MarketCreative[]): MarketCreative[] {
  const byFp = new Map<string, MarketCreative>();
  for (const ad of [...prior, ...incoming]) {
    const existing = byFp.get(ad.fingerprint);
    if (!existing) {
      byFp.set(ad.fingerprint, ad);
      continue;
    }
    const preferIncoming = ad.claim === "OBSERVED_FACT" && existing.claim !== "OBSERVED_FACT";
    byFp.set(ad.fingerprint, preferIncoming ? { ...existing, ...ad, id: existing.id } : existing);
  }
  return [...byFp.values()]
    .sort((a, b) => (a.extractedAt < b.extractedAt ? 1 : -1))
    .slice(0, MARKET_MAX_ADS);
}

function buildMarketDna(
  businessId: string,
  controls: MarketScanControls,
  ads: MarketCreative[],
  patterns: MarketIntel["patterns"],
  sources: MarketSourceRecord[],
  scanId: string,
  prior?: MarketDna,
): MarketDna {
  const advertisers = [
    ...new Set(
      [...(prior?.advertiserNames ?? []), ...ads.filter((a) => a.kind === "public_ad" && a.advertiser).map((a) => a.advertiser!)],
    ),
  ].slice(0, 40);
  const traits: MarketDnaTrait[] = [];
  const push = (topic: string, claim: string, label: ClaimLabel, ev: EvidenceLink[], confidence: Uncertainty) => {
    const c = claim.trim();
    if (!c) return;
    traits.push({
      id: uid("mdna"),
      topic,
      claim: c,
      label,
      evidence: ev,
      confidence,
      updatedAt: nowIso(),
    });
  };

  push("region", controls.region, controls.region ? "OBSERVED_FACT" : "UNKNOWN", [evidence("user_input", "scan.controls.region", "observed", controls.region)], controls.region ? "medium" : "unknown");
  push("industry", controls.industry, controls.industry ? "OBSERVED_FACT" : "UNKNOWN", [evidence("user_input", "scan.controls.industry", "observed", controls.industry)], controls.industry ? "medium" : "unknown");
  push("language", controls.language, controls.language ? "OBSERVED_FACT" : "UNKNOWN", [evidence("user_input", "scan.controls.language", "observed", controls.language)], "medium");
  push("objective", controls.objective || "UNKNOWN — no objective supplied", controls.objective ? "OBSERVED_FACT" : "UNKNOWN", [evidence("user_input", "scan.controls.objective", "observed", controls.objective)], controls.objective ? "low" : "unknown");

  if (advertisers.length) {
    push(
      "advertisers",
      `Observed public advertisers: ${advertisers.slice(0, 8).join(", ")}`,
      "OBSERVED_FACT",
      advertisers.slice(0, 4).map((n) => evidence("public_research", "market.advertiser", "observed", n)),
      "medium",
    );
  } else {
    push("advertisers", "UNKNOWN — no public advertiser names confirmed this scan.", "UNKNOWN", [], "unknown");
  }

  for (const p of patterns.slice(0, 6)) {
    push("pattern", `${p.name}: ${p.language}`, "INFERENCE", p.evidence, p.confidence);
  }

  const ok = sources.filter((s) => s.status === "ok" || s.status === "grounded").map((s) => s.platform);
  const down = sources.filter((s) => s.status === "blocked" || s.status === "unavailable" || s.status === "no_token");
  push(
    "sources",
    ok.length
      ? `Responding sources: ${ok.join(", ")}`
      : "UNKNOWN — no live library rows. Explore URLs remain.",
    ok.length ? "OBSERVED_FACT" : "UNKNOWN",
    [evidence("public_research", "market.sources", "observed", ok.join(",") || "none")],
    ok.length ? "medium" : "unknown",
  );
  if (down.length) {
    push(
      "unavailable_sources",
      down.map((s) => `${s.platform}: ${s.status}`).join("; "),
      "OBSERVED_FACT",
      down.map((s) => evidence("public_research", s.exploreUrl, "observed", s.status)),
      "medium",
    );
  }

  if (prior?.traits.length) {
    const keys = new Set(traits.map((t) => `${t.topic}:${t.claim}`));
    for (const old of prior.traits) {
      const key = `${old.topic}:${old.claim}`;
      if (!keys.has(key) && old.topic !== "sources" && old.topic !== "unavailable_sources" && old.topic !== "advertisers") {
        traits.push(old);
        keys.add(key);
      }
    }
  }

  return {
    businessId,
    region: controls.region,
    language: controls.language,
    industry: controls.industry,
    objective: controls.objective,
    traits: traits.slice(0, 40),
    patternIds: patterns.map((p) => p.id),
    advertiserNames: advertisers,
    sourceStatuses: sources,
    lastScanId: scanId,
    updatedAt: nowIso(),
  };
}

export function competitorInsightsFromDna(
  ws: GrowthWorkspace,
  market: MarketIntel,
): CompetitorInsight[] {
  const tested = testedPatternSlugs(
    ws.experiments.map((e) => e.name),
    ws.hypotheses.map((h) => h.statement),
  );
  const businessText = `${ws.dna.traits.map((t) => t.claim).join(" ")} ${ws.audience.nodes.map((n) => n.text).join(" ")}`.toLowerCase();
  const insights: CompetitorInsight[] = [];

  for (const p of market.patterns) {
    const businessHas = businessText.includes(p.slug.replace(/-/g, " ")) || businessText.includes(p.name.toLowerCase());
    const historicallyTested = tested.has(p.slug) || tested.has(p.slug.replace(/^discovered:/, ""));
    if (!p.exampleCount) continue;
    insights.push({
      id: uid("ins"),
      patternSlug: p.slug,
      businessHas,
      marketHas: true,
      historicallyTested,
      gap:
        !businessHas && !historicallyTested
          ? `Market shows ${p.language} of “${p.name}”. Business DNA and experiment history do not record this pattern yet.`
          : historicallyTested
            ? `“${p.name}” appears in market (${p.language}) and was already named in an experiment — compare results, do not re-invent.`
            : `“${p.name}” appears in both market examples and current business copy. Untested as an experiment.`,
      claim: "INFERENCE",
      evidence: p.evidence,
      uncertainty: p.confidence,
    });
  }

  const named: CompetitorGap[] = ws.competitors.gaps;
  const observed = market.ads.filter((a) => a.kind === "public_ad" && a.advertiser);
  for (const ad of observed) {
    const already = named.some((g) => g.competitorName.toLowerCase() === ad.advertiser!.toLowerCase());
    insights.push({
      id: uid("ins"),
      competitorName: ad.advertiser,
      businessHas: already,
      marketHas: true,
      historicallyTested: false,
      gap: already
        ? `User-listed competitor “${ad.advertiser}” also appears on a public ${ad.platform} page.`
        : `Public ${ad.platform} page shows advertiser “${ad.advertiser}”. Not added as a user competitor unless you confirm.`,
      claim: ad.claim,
      evidence: [evidence("public_research", ad.url, ad.claim === "OBSERVED_FACT" ? "observed" : "ai_interpretation", ad.advertiser)],
      uncertainty: ad.claim === "OBSERVED_FACT" ? "medium" : "low",
    });
  }

  if (!insights.length) {
    insights.push({
      id: uid("ins"),
      businessHas: false,
      marketHas: false,
      historicallyTested: false,
      gap: "UNKNOWN — no public ad rows and no user competitors to compare.",
      claim: "UNKNOWN",
      evidence: [],
      uncertainty: "unknown",
    });
  }
  return insights.slice(0, 24);
}

function opportunitiesFromMarket(ws: GrowthWorkspace, market: MarketIntel): Opportunity[] {
  const out: Opportunity[] = [];
  const untested = market.insights.filter((i) => i.marketHas && !i.historicallyTested && !i.businessHas);
  for (const i of untested.slice(0, 6)) {
    const pattern = market.patterns.find((p) => p.slug === i.patternSlug);
    out.push({
      id: uid("opp"),
      title: i.patternSlug ? `Untested market pattern: ${pattern?.name || i.patternSlug}` : `Observed advertiser: ${i.competitorName}`,
      whyNow: i.gap,
      evidence: i.evidence,
      confidence: i.uncertainty,
      action: i.patternSlug
        ? `Test a new creative that uses the “${pattern?.name || i.patternSlug}” pattern — write original copy, do not copy ads.`
        : `Confirm whether “${i.competitorName}” is a real competitor, then decide a gap test.`,
      createdAt: nowIso(),
    });
  }
  return out;
}

export function recommendExperiments(ws: GrowthWorkspace, market: MarketIntel): RecommendedExperiment[] {
  const recs: RecommendedExperiment[] = [];
  for (const i of market.insights) {
    if (!i.marketHas || i.historicallyTested) continue;
    const pattern = market.patterns.find((p) => p.slug === i.patternSlug);
    if (!pattern && !i.competitorName) continue;
    recs.push({
      id: uid("nbe"),
      title: pattern ? `Test ${pattern.name}` : `Check advertiser ${i.competitorName}`,
      hypothesisStatement: pattern
        ? `An original “${pattern.name}” creative will beat the current baseline on the entered metric.`
        : `Acknowledging “${i.competitorName}” as a competitor will surface a testable gap.`,
      patternId: pattern?.id,
      why: i.gap,
      claim: "INFERENCE",
      evidence: i.evidence,
      confidence: i.uncertainty,
      tested: i.historicallyTested,
    });
  }
  if (!recs.length) {
    recs.push({
      id: uid("nbe"),
      title: "UNKNOWN — no evidence-backed experiment yet",
      hypothesisStatement: "Enter a competitor you saw, or wait until a public source returns an example.",
      why: "Market scan did not produce an untested pattern or confirmed advertiser.",
      claim: "UNKNOWN",
      evidence: [],
      confidence: "unknown",
      tested: false,
    });
  }
  return recs.slice(0, 8);
}

function materialSignals(
  scanId: string,
  prior: MarketIntel | undefined,
  next: MarketIntel,
): MarketSignal[] {
  const signals: MarketSignal[] = [];
  const oldAds = new Set((prior?.dna.advertiserNames ?? []).map((n) => n.toLowerCase()));
  const oldPatterns = new Set(prior?.patterns.map((p) => p.slug) ?? []);
  for (const name of next.dna.advertiserNames) {
    if (oldAds.has(name.toLowerCase())) continue;
    if (!prior) continue;
    signals.push({
      id: uid("sig"),
      kind: "new_advertiser",
      title: `New observed advertiser: ${name}`,
      claim: "OBSERVED_FACT",
      evidence: [evidence("public_research", "market.advertiser", "observed", name)],
      material: true,
      createdAt: nowIso(),
      scanId,
    });
  }
  for (const p of next.patterns) {
    if (oldPatterns.has(p.slug) || p.exampleCount < 2 || !prior) continue;
    signals.push({
      id: uid("sig"),
      kind: "new_pattern",
      title: `New repeating pattern: ${p.name} (${p.language})`,
      claim: "INFERENCE",
      evidence: p.evidence,
      material: true,
      createdAt: nowIso(),
      scanId,
    });
  }
  return signals;
}

export function composeMarketIntel(
  ws: GrowthWorkspace,
  research: MarketResearch,
  controls: MarketScanControls,
  opts?: { cached?: boolean; incremental?: boolean; campaignId?: string; reason?: string },
): { workspace: GrowthWorkspace; intel: MarketIntel; scan: MarketScan } {
  const prior = ws.market;
  const scanId = uid("scan");
  const startedAt = nowIso();
  const trends = googleTrendsUrl(controls.query, controls.region);
  const sources = sourcesFromResearch(research, trends);
  const incoming = adsFromResearch(research, scanId, controls);
  const ads = mergeAds(prior?.ads ?? [], incoming);
  const patterns = clusterPatterns(ads, controls, prior?.patterns ?? []);
  const dna = buildMarketDna(ws.businessId, controls, ads, patterns, sources, scanId, prior?.dna);
  const scan: MarketScan = {
    id: scanId,
    businessId: ws.businessId,
    campaignId: opts?.campaignId,
    controls,
    startedAt,
    finishedAt: nowIso(),
    cached: Boolean(opts?.cached),
    incremental: Boolean(opts?.incremental),
    sources,
    adIds: incoming.map((a) => a.id),
    signalIds: [],
    reason: opts?.reason,
  };

  let intel: MarketIntel = {
    sources,
    scans: [scan, ...(prior?.scans ?? [])].slice(0, MARKET_MAX_SCANS),
    ads,
    patterns,
    signals: prior?.signals ?? [],
    dna,
    insights: [],
    recommendedExperiments: [],
    watch: prior?.watch ?? null,
    notifications: prior?.notifications ?? [],
  };
  intel.insights = competitorInsightsFromDna(ws, intel);
  intel.recommendedExperiments = recommendExperiments(ws, intel);
  intel.nextBestExperiment = intel.recommendedExperiments.find((r) => !r.tested && r.claim !== "UNKNOWN") ?? intel.recommendedExperiments[0];

  const fresh = materialSignals(scanId, prior, intel);
  scan.signalIds = fresh.map((s) => s.id);
  intel.signals = [...fresh, ...intel.signals].slice(0, 40);
  if (fresh.length) {
    intel.notifications = [
      ...fresh.map((s) => ({
        id: uid("note"),
        text: s.title,
        createdAt: s.createdAt,
        signalId: s.id,
      })),
      ...intel.notifications,
    ].slice(0, 20);
    if (intel.watch) {
      intel.watch = { ...intel.watch, lastNotifyAt: nowIso() };
    }
  }

  const marketOpps = opportunitiesFromMarket(ws, intel);
  const keep = ws.opportunities.filter((o) => !/Untested market pattern|Observed advertiser|UNKNOWN — no opportunity/i.test(o.title));
  const opportunities = [...marketOpps, ...keep].slice(0, 20);

  const next: GrowthWorkspace = {
    ...ws,
    market: intel,
    opportunities,
    updatedAt: nowIso(),
  };
  next.knowledge = {
    ...next.knowledge,
    know: [
      ...next.knowledge.know.filter((k) => !k.text.startsWith("market.")),
      ...intel.dna.traits.filter((t) => t.label === "OBSERVED_FACT").map((t) => ({ text: `market.${t.topic}: ${t.claim}`, evidence: t.evidence })),
    ].slice(0, 24),
    think: [
      ...next.knowledge.think.filter((k) => !k.text.startsWith("market.")),
      ...intel.dna.traits.filter((t) => t.label === "INFERENCE" || t.label === "ESTIMATE").map((t) => ({ text: `market.${t.topic}: ${t.claim}`, evidence: t.evidence })),
    ].slice(0, 24),
    dontKnow: [
      ...next.knowledge.dontKnow.filter((k) => !k.text.startsWith("market.")),
      ...intel.dna.traits.filter((t) => t.label === "UNKNOWN").map((t) => ({ text: `market.${t.topic}: ${t.claim}`, evidence: t.evidence })),
    ].slice(0, 24),
    updatedAt: nowIso(),
  };

  if (intel.nextBestExperiment && intel.nextBestExperiment.claim !== "UNKNOWN") {
    next.nba = {
      action: intel.nextBestExperiment.title,
      reason: intel.nextBestExperiment.why,
      evidence: intel.nextBestExperiment.evidence,
      uncertainty: intel.nextBestExperiment.confidence,
      updatedAt: nowIso(),
    };
  }

  return { workspace: next, intel, scan };
}

export function applyWatchToggle(ws: GrowthWorkspace, enabled: boolean, controls?: Partial<MarketScanControls>): GrowthWorkspace {
  const market = ws.market ?? emptyMarketIntel(ws.businessId);
  const nextControls = defaultScanControls({ ...controlsFromWorkspace(ws), ...controls });
  return {
    ...ws,
    market: {
      ...market,
      watch: {
        enabled,
        intervalHours: market.watch?.intervalHours ?? 24,
        lastRunAt: market.watch?.lastRunAt,
        lastNotifyAt: market.watch?.lastNotifyAt,
        controls: nextControls,
      },
    },
    updatedAt: nowIso(),
  };
}

export function markWatchRun(ws: GrowthWorkspace): GrowthWorkspace {
  if (!ws.market?.watch) return ws;
  return {
    ...ws,
    market: {
      ...ws.market,
      watch: { ...ws.market.watch, lastRunAt: nowIso() },
    },
    updatedAt: nowIso(),
  };
}

export function adoptRecommendedExperiment(ws: GrowthWorkspace, recId: string): { name: string; hypothesisStatement: string; rec: RecommendedExperiment | undefined } {
  const rec = ws.market?.recommendedExperiments.find((r) => r.id === recId) ?? ws.market?.nextBestExperiment;
  return {
    name: rec?.title || "Market pattern test",
    hypothesisStatement: rec?.hypothesisStatement || "",
    rec,
  };
}

export function ensureMarket(ws: GrowthWorkspace): GrowthWorkspace {
  if (ws.market) return ws;
  return { ...ws, market: emptyMarketIntel(ws.businessId) };
}

export { emptyMarketDna, emptyMarketIntel };
