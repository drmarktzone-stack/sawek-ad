/**
 * Market Intelligence: evidence-only, no fake ads/metrics, integrated with Growth Scientist.
 */
import { readFileSync } from "fs";
import { join } from "path";
import type { CampaignPack, Intake, MarketResearch } from "../lib/types";
import { emptyIntake } from "../lib/engine/validate";
import { publicResearchUrls, tiktokPeriodDays } from "../lib/engine/research-public";
import { workspaceFromPack } from "../lib/scientist/engines";
import {
  adsFromResearch,
  applyWatchToggle,
  composeMarketIntel,
  controlsFromWorkspace,
  hasMarketScanContext,
  scanIsStale,
  watchIsDue,
} from "../lib/scientist/market-engines";
import { classifyPatternSlug, creativeFingerprint, looksLikeFakeMarketClaim } from "../lib/scientist/market-patterns";
import { adoptMarketExperiment, recordExperiment } from "../lib/scientist/store";
import { defaultScanControls } from "../lib/scientist/market-types";

const failures: string[] = [];
function fail(msg: string) {
  failures.push(msg);
}

const mem = new Map<string, string>();
const g = globalThis as unknown as { window: { localStorage: Storage }; localStorage: Storage };
function storage(): Storage {
  return {
    getItem: (k) => (mem.has(k) ? mem.get(k)! : null),
    setItem: (k, v) => {
      mem.set(k, String(v));
    },
    removeItem: (k) => {
      mem.delete(k);
    },
    clear: () => mem.clear(),
    key: (i) => [...mem.keys()][i] ?? null,
    get length() {
      return mem.size;
    },
  } as Storage;
}
g.localStorage = storage();
g.window = { localStorage: g.localStorage };

function pack(intake: Partial<Intake>, extra?: Partial<CampaignPack>): CampaignPack {
  const i = { ...emptyIntake(), ...intake };
  return {
    id: extra?.id ?? "camp-mkt",
    createdAt: "2026-09-07T00:00:00.000Z",
    updatedAt: "2026-09-07T00:00:00.000Z",
    name: extra?.name ?? i.businessName ?? "test",
    intake: i,
    intakeReport: { completeness: 20, missing: [], inconsistencies: [], refusedGuesses: [] },
    diagnosis: { summary: { he: "", ar: "", en: "" }, hypotheses: extra?.diagnosis?.hypotheses ?? [], approved: false },
    variants: [],
    strategy: [],
    media: {
      split: [],
      assumptions: [],
      missingForLiveBuy: [],
      worstCase: { he: "", ar: "", en: "" },
      realistic: { he: "", ar: "", en: "" },
      scenarioFromUserNumbers: false,
    },
    optimizer: { ifThen: [], killRules: [], scaleRules: [] },
    optimizerRuns: extra?.optimizerRuns ?? [],
    producedAds: [],
    agentStatus: { intake: "complete", diagnostic: "complete", strategic: "complete", media: "complete", optimizer: "complete" },
    saved: true,
    planActivated: false,
    ...extra,
  };
}

function researchFixture(): MarketResearch {
  const asOf = "2026-09-07T12:00:00.000Z";
  return {
    asOf,
    query: "pediatric clinic",
    geo: "IL",
    grounded: true,
    fetched: true,
    disclaimer: { he: "", ar: "", en: "Public ad examples." },
    notes: [
      {
        title: { he: "שעות", ar: "ساعات", en: "Hours as hook" },
        note: { he: "מודעות מדגישות שעות.", ar: "إعلانات تركّز على ساعات.", en: "Public ads lead with clinic hours." },
        sourceUrl: "https://www.facebook.com/ads/library/?q=clinic",
        asOf,
      },
    ],
    sources: [
      {
        id: "meta_ad_library",
        status: "ok",
        label: { he: "Meta", ar: "Meta", en: "Meta" },
        exploreUrl: "https://www.facebook.com/ads/library/?q=clinic",
        notes: [],
        examples: [
          {
            id: "m1",
            source: "meta_ad_library",
            advertiser: "Kids Care Clinic",
            title: { he: "tired of waiting?", ar: "", en: "tired of waiting?" },
            snippet: { he: "book today — problem wait times", ar: "", en: "book today — problem wait times" },
            url: "https://www.facebook.com/ads/library/?id=1",
            asOf,
          },
          {
            id: "m1-dup",
            source: "meta_ad_library",
            advertiser: "Kids Care Clinic",
            title: { he: "tired of waiting?", ar: "", en: "tired of waiting?" },
            snippet: { he: "book today — problem wait times", ar: "", en: "book today — problem wait times" },
            url: "https://www.facebook.com/ads/library/?id=1",
            asOf,
          },
          {
            id: "m-fake",
            source: "meta_ad_library",
            advertiser: "Fake Winner",
            title: { he: "ROAS: 12", ar: "", en: "ROAS: 12" },
            snippet: { he: "million views", ar: "", en: "million views" },
            url: "https://www.facebook.com/ads/library/?id=fake",
            asOf,
          },
        ],
      },
      {
        id: "tiktok_creative_center",
        status: "blocked",
        label: { he: "TikTok", ar: "TikTok", en: "TikTok" },
        exploreUrl: "https://ads.tiktok.com/business/creativecenter/inspiration/popular/ads/pc/en?period=7&region=IL",
        examples: [],
        notes: [],
        emptyReason: { he: "חסום", ar: "محجوب", en: "No official free API — open Creative Center." },
      },
      {
        id: "google_ads_transparency",
        status: "grounded",
        label: { he: "Google", ar: "Google", en: "Google" },
        exploreUrl: "https://adstransparency.google.com/?region=IL&q=clinic",
        examples: [],
        notes: [],
      },
      {
        id: "pinterest_trends",
        status: "empty",
        label: { he: "Pinterest", ar: "Pinterest", en: "Pinterest" },
        exploreUrl: "https://trends.pinterest.com/explore?country=IL&terms=clinic",
        examples: [],
        notes: [],
      },
      {
        id: "youtube_suggest",
        status: "ok",
        label: { he: "YouTube", ar: "YouTube", en: "YouTube" },
        exploreUrl: "https://www.youtube.com/results?search_query=clinic",
        examples: [
          {
            id: "yt1",
            source: "youtube_suggest",
            title: { he: "pediatric clinic near me", ar: "", en: "pediatric clinic near me" },
            snippet: { he: "Public search suggestion — not a view count.", ar: "", en: "Public search suggestion — not a view count." },
            url: "https://www.youtube.com/results?search_query=pediatric+clinic+near+me",
            asOf,
          },
        ],
        notes: [],
      },
      {
        id: "linkedin_ad_library",
        status: "blocked",
        label: { he: "LinkedIn", ar: "LinkedIn", en: "LinkedIn" },
        exploreUrl: "https://www.linkedin.com/ad-library/search?countries=IL&keyword=clinic",
        examples: [],
        notes: [],
        emptyReason: { he: "login", ar: "login", en: "LinkedIn Ad Library usually needs a login." },
      },
    ],
  };
}

const empty = workspaceFromPack(pack({ businessName: "" }, { name: "" }));
if (hasMarketScanContext(empty)) fail("empty business must not have scan context");
if (!empty.market) fail("empty workspace should carry empty market intel");
if (empty.market?.ads.length) fail("empty market must not invent ads");

const named = workspaceFromPack(
  pack({
    businessName: "מרפאת בדיקה",
    category: "clinic",
    location: "נצרת",
    audience: "parents",
    biggestProblem: "wait times",
  }),
);
if (!hasMarketScanContext(named)) fail("named clinic with category+location should have scan context");
if (named.competitors.gaps.length) fail("must not invent competitor gaps");

const controls = controlsFromWorkspace(named, { lookbackDays: 30, language: "he", objective: "leads" });
if (controls.region !== "IL") fail(`region should derive IL, got ${controls.region}`);
if (controls.lookbackDays !== 30) fail("lookback override");
if (tiktokPeriodDays(30) !== 30) fail("tiktok period 30");
if (tiktokPeriodDays(7) !== 7) fail("tiktok period 7");
const urls = publicResearchUrls("clinic", "IL", 30);
if (!urls.tiktok_creative_center.includes("period=30")) fail("tiktok url lookback");

const research = researchFixture();
const ads = adsFromResearch(research, "scan-1", defaultScanControls({ region: "IL", industry: "clinic" }));
if (ads.some((a) => /ROAS|million views/i.test(`${a.title} ${a.snippet}`))) fail("fake metric ad leaked");
const metaAds = ads.filter((a) => a.platform === "meta_ad_library" && a.kind === "public_ad");
if (metaAds.length !== 1) fail(`duplicate Meta ads not collapsed, got ${metaAds.length}`);
if (metaAds[0]?.claim !== "OBSERVED_FACT") fail("Meta ok example must be OBSERVED_FACT");
if (metaAds[0]?.advertiser !== "Kids Care Clinic") fail("advertiser must stay source-supplied");
if (metaAds[0]?.performance.length) fail("must not invent performance metrics");
const yt = ads.find((a) => a.platform === "youtube_suggest");
if (yt?.kind !== "search_suggestion") fail("YouTube suggest is not an ad");
if (yt?.claim !== "OBSERVED_FACT") fail("YouTube suggest API row is observed search text");

const first = composeMarketIntel(named, research, controls);
if (!first.intel.sources.some((s) => s.platform === "tiktok_creative_center" && (s.status === "blocked" || s.status === "unavailable"))) {
  fail("TikTok blocked must stay labeled");
}
if (!first.intel.sources.some((s) => s.platform === "linkedin_ad_library" && s.status === "blocked")) {
  fail("LinkedIn blocked must stay labeled");
}
if (!first.intel.sources.some((s) => s.platform === "gemini_search_grounding")) fail("grounding source missing");
if (!first.intel.patterns.some((p) => p.slug === "problem-first")) fail("problem-first pattern missing");
if (first.intel.patterns.some((p) => /guaranteed/i.test(p.language))) fail("pattern language must not say guaranteed");
if (!first.intel.patterns.some((p) => /appears repeatedly across/i.test(p.language))) fail("pattern must use appears-repeatedly language");
if (first.intel.dna.advertiserNames.includes("Fake Winner")) fail("fake advertiser stored");
if (!first.intel.dna.advertiserNames.includes("Kids Care Clinic")) fail("observed advertiser missing from Market DNA");
if (!first.workspace.opportunities.some((o) => /Untested market pattern/i.test(o.title))) fail("opportunity from untested pattern missing");
if (!first.intel.nextBestExperiment) fail("NBE missing");
if (first.intel.nextBestExperiment?.claim === "UNKNOWN" && first.intel.patterns.length) fail("NBE should not be UNKNOWN when patterns exist");

const fp1 = creativeFingerprint({ platform: "meta", advertiser: "A", url: "https://x.com/a?foo=1", title: "Hi" });
const fp2 = creativeFingerprint({ platform: "meta", advertiser: "A", url: "https://x.com/a", title: "Hi" });
if (fp1 !== fp2) fail("fingerprint should ignore query string");

if (!looksLikeFakeMarketClaim("performed extremely well ROAS: 9")) fail("anti-hallucination regex");
if (looksLikeFakeMarketClaim("Hours as hook on a public library page")) fail("honest copy flagged as fake");

if (classifyPatternSlug("customer said this clinic helped").slug !== "testimonial") fail("testimonial classify");
if (classifyPatternSlug("how to book a visit").slug !== "how-to") fail("how-to classify");

let ws = first.workspace;
ws = adoptMarketExperiment(ws, first.intel.nextBestExperiment?.id);
if (!ws.experiments.some((e) => e.name === first.intel.nextBestExperiment?.title)) fail("adopt did not create experiment");
if (ws.experiments[0]?.deltas.some((d) => /significant/i.test(d.note))) fail("adopted experiment leaked significance");

const persisted = workspaceFromPack(
  pack({
    businessName: "מרפאת בדיקה",
    category: "clinic",
    location: "נצרת",
  }),
  ws,
);
if (!persisted.market?.dna.advertiserNames.includes("Kids Care Clinic")) fail("Market DNA lost after pack re-ingest");
if (!persisted.experiments.length) fail("scientist experiments lost after market merge");

const secondResearch: MarketResearch = {
  ...research,
  asOf: "2026-09-08T12:00:00.000Z",
  sources: research.sources.map((s) =>
    s.id === "meta_ad_library"
      ? {
          ...s,
          examples: [
            ...s.examples,
            {
              id: "m2",
              source: "meta_ad_library",
              advertiser: "New Neighborhood Clinic",
              title: { he: "join our community", ar: "", en: "join our community" },
              snippet: { he: "community of parents", ar: "", en: "community of parents" },
              url: "https://www.facebook.com/ads/library/?id=2",
              asOf: "2026-09-08T12:00:00.000Z",
            },
          ],
        }
      : s,
  ),
};
const watched = applyWatchToggle(first.workspace, true, controls);
if (!watched.market?.watch?.enabled) fail("watch toggle");
if (watchIsDue({ ...watched, market: { ...watched.market!, watch: { ...watched.market!.watch!, lastRunAt: undefined } } }) !== true) {
  fail("watch due when never run");
}
const incremental = composeMarketIntel(watched, secondResearch, controls, { incremental: true });
if (!incremental.intel.signals.some((s) => s.kind === "new_advertiser" && s.material)) fail("new advertiser should be a material signal");
if (!incremental.intel.notifications.length) fail("material signal should notify");
if (incremental.intel.ads.filter((a) => a.advertiser === "Kids Care Clinic").length !== 1) fail("incremental dedupe failed");

const missingMetrics = incremental.intel.ads.every((a) => a.performance.length === 0);
if (!missingMetrics) fail("performance invented on incremental scan");

if (scanIsStale(empty) !== true) fail("no scans => stale");
const fresh = composeMarketIntel(named, research, controls);
if (scanIsStale({ ...fresh.workspace, market: { ...fresh.intel, scans: [{ ...fresh.scan, finishedAt: new Date().toISOString() }] } }, 60_000) !== false) {
  fail("fresh scan should not be stale");
}

const noCompetitors = composeMarketIntel(
  workspaceFromPack(pack({ businessName: "חנות", category: "retail", location: "תל אביב" })),
  {
    ...research,
    notes: [],
    sources: research.sources.map((s) => ({ ...s, examples: [], status: s.id === "linkedin_ad_library" ? "blocked" : "empty" })),
  },
  defaultScanControls({ region: "IL", industry: "retail" }),
);
if (noCompetitors.intel.dna.advertiserNames.length) fail("empty sources must not invent advertisers");
if (!noCompetitors.intel.recommendedExperiments.some((r) => r.claim === "UNKNOWN")) {
  fail("no-evidence NBE must be UNKNOWN");
}

const learned = recordExperiment(fresh.workspace, {
  name: "problem-first hook",
  status: "completed",
  variants: [
    { id: "a", name: "A", notes: "" },
    { id: "b", name: "B", notes: "" },
  ],
  metrics: [{ name: "leads", baseline: 2, actual: 5 }],
  notes: "",
});
const afterTest = composeMarketIntel(learned, research, controls);
if (!afterTest.intel.insights.some((i) => i.patternSlug === "problem-first" && i.historicallyTested)) {
  fail("tested pattern should mark historicallyTested");
}

if (/statistically significant|predicted roas|win probability/i.test(JSON.stringify(first.intel))) {
  fail("market intel leaked fake science");
}

const src = {
  engines: readFileSync(join(process.cwd(), "lib/scientist/market-engines.ts"), "utf8"),
  run: readFileSync(join(process.cwd(), "lib/scientist/market-run.ts"), "utf8"),
  api: readFileSync(join(process.cwd(), "app/api/scientist/market/route.ts"), "utf8"),
  cron: readFileSync(join(process.cwd(), "app/api/scientist/market/cron/route.ts"), "utf8"),
  desk: readFileSync(join(process.cwd(), "components/scientist/market-desk.tsx"), "utf8"),
  growth: readFileSync(join(process.cwd(), "components/scientist/growth-desk.tsx"), "utf8"),
};
if (/captcha|login.?wall bypass|robots\.txt ignore|headless chrome/i.test(`${src.engines}${src.run}`)) {
  fail("scraper bypass language appeared");
}
if (!src.api.includes("research")) fail("market API must share research rate bucket");
if (!src.cron.includes("MARKET_WATCH_SECRET")) fail("cron must require secret");
if (!src.desk.includes("OBSERVED_FACT")) fail("UI must label claim types");
if (!src.growth.includes("sci.nav.market")) fail("growth desk missing market nav");
if (!src.run.includes("insufficient_context")) fail("insufficient context must short-circuit live fetch");

if (failures.length) {
  console.error("FAIL market-intel\n" + failures.join("\n"));
  process.exit(1);
}
console.log(
  "PASS market-intel: scan/dedupe/unavailable/UNKNOWN metrics/patterns/Market DNA/NBE/watch/persist/scientist regression",
);
