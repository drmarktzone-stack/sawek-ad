/**
 * Ad-research desk + expanded Search Grounding.
 * No fake ROAS / views / likes. Demos stay clinic + olive + sand.
 */
import { oliveKitchenIntake, sandBoutiqueIntake, DEMO_ID, DEMO_OLIVE_ID, DEMO_SAND_ID, PUBLISHED_DEMO_IDS } from "../lib/demo-catalog";
import { demoIntake } from "../lib/demo";
import { emptyIntake, validateIntake } from "../lib/engine/validate";
import { assemblePack } from "../lib/engine/run";
import { diagnose } from "../lib/engine/diagnose";
import { generateVariants } from "../lib/engine/copy";
import { buildPostingCalendar } from "../lib/engine/posting-calendar";
import { applyResearchToPack } from "../lib/engine/research-overlay";
import {
  buildResearchSkeleton,
  publicResearchUrls,
  researchGeo,
  researchLooksHonest,
  researchQuery,
  tiktokCreativeCenterUrls,
} from "../lib/engine/ad-research";
import { shouldGroundGenerateMode } from "../lib/engine/gemini-generate";
import { VIRAL_DESK_JOBS } from "../lib/engine/viral-desk";
import { extractGroundingSources } from "../lib/vertex";
import type { Intake, MarketResearch } from "../lib/types";

const failures: string[] = [];
function fail(m: string) {
  failures.push(m);
}

const FAKE = /ROAS\s*[:=]|CPM\s*[:=]|million views|\blikes?\s*[:=]\s*\d/i;

const olive = oliveKitchenIntake("he");
const sand = sandBoutiqueIntake("en");
const clinic = demoIntake("ar");

if (researchGeo(clinic) !== "IL") fail(`clinic geo ${researchGeo(clinic)}`);
if (researchGeo(olive) !== "IL") fail(`olive geo ${researchGeo(olive)}`);
if (!/זית|ים-?תיכון|mediterranean|Olive|מסעדה|שקד/i.test(researchQuery(olive))) {
  fail(`olive query weak: ${researchQuery(olive)}`);
}

const urls = publicResearchUrls("pediatric clinic", "IL");
if (!urls.meta_ad_library.includes("facebook.com/ads/library")) fail("meta library url");
if (!urls.tiktok_creative_center.includes("tiktok.com")) fail("tiktok cc url");
if (!urls.google_ads_transparency.includes("adstransparency.google.com")) fail("google transparency url");
if (!urls.pinterest_trends.includes("pinterest.com")) fail("pinterest url");
if (!urls.youtube_suggest.includes("youtube.com")) fail("youtube url");
if (!urls.linkedin_ad_library.includes("linkedin.com/ad-library")) fail("linkedin url");

const cc = tiktokCreativeCenterUrls("US");
if (!/region=US/.test(cc.ads + cc.keywords + cc.hashtags)) fail("tiktok region");

const skeleton = buildResearchSkeleton(olive);
if (skeleton.sources.length !== 6) fail(`skeleton sources ${skeleton.sources.length}`);
if (skeleton.fetched) fail("skeleton should not be fetched");
if (!researchLooksHonest(skeleton)) fail("skeleton leaked fake metrics");
if (FAKE.test(JSON.stringify(skeleton))) fail("skeleton FAKE");
for (const s of skeleton.sources) {
  if (s.status !== "pending") fail(`${s.id} skeleton status ${s.status}`);
  if (!s.emptyReason?.he || !s.emptyReason.ar || !s.emptyReason.en) fail(`${s.id} missing HE/AR/EN empty`);
  if (!s.label.he || !s.label.ar || !s.label.en) fail(`${s.id} missing labels`);
}

const grounded: MarketResearch = {
  ...skeleton,
  fetched: true,
  grounded: true,
  notes: [
    {
      title: { he: "שעות כהוק", ar: "الساعات خطاف", en: "Hours as hook" },
      note: { he: "מודעות ציבוריות מדגישות שעות אמת.", ar: "إعلانات عامة تركّز على ساعات حقيقية.", en: "Public ads lead with real hours." },
      sourceUrl: "https://www.facebook.com/ads/library/?q=olive",
      asOf: "2026-09-06",
    },
  ],
  sources: skeleton.sources.map((s) =>
    s.id === "meta_ad_library"
      ? {
          ...s,
          status: "grounded" as const,
          examples: [
            {
              id: "ex-1",
              source: "meta_ad_library" as const,
              advertiser: "Public Kitchen Page",
              page: "Public Kitchen Page",
              title: { he: "שולחן בחוץ", ar: "طاولة برّا", en: "Outdoor table" },
              snippet: { he: "דוגמה ציבורית — בלי הוצאה.", ar: "مثال عام — بلا صرف.", en: "Public example — no spend." },
              url: "https://www.facebook.com/ads/library/?id=demo",
              asOf: "2026-09-06",
            },
          ],
        }
      : { ...s, status: "blocked" as const },
  ),
};

function packOf(intake: Intake) {
  return assemblePack(intake, {
    report: validateIntake(intake),
    diagnosis: diagnose(intake, validateIntake(intake)),
    variants: generateVariants(intake),
    agentStatus: {
      intake: "complete",
      diagnostic: "complete",
      strategic: "complete",
      media: "complete",
      optimizer: "complete",
    },
  });
}

const olivePack = packOf(olive);
if (!olivePack.research) fail("assemblePack missing research skeleton");
if (olivePack.research!.fetched) fail("assemblePack research should start unfetched");
if (olivePack.research!.sources.length !== 6) fail("assemblePack research sources");

const applied = applyResearchToPack(olivePack, grounded);
if (!applied.cmoIdeas?.groundedNotes?.length) fail("CMO missing grounded notes");
if (!applied.siteAudit?.groundedNotes?.length) fail("site audit missing grounded notes");
if (!applied.research?.fetched) fail("applied research not fetched");

const month = buildPostingCalendar(applied, "he", 30);
if (month.length !== 30) fail(`calendar ${month.length}`);
if (!month.some((d) => d.trendHint)) fail("calendar missing trend-aware days");
if (month.some((d) => d.trendHint && /ROAS|million views/i.test(d.trendHint))) fail("calendar fake trend");
const week = buildPostingCalendar(applied, "en", 7);
if (week.length !== 7) fail(`7-day ${week.length}`);

if (!shouldGroundGenerateMode("ads")) fail("ads must ground");
if (!shouldGroundGenerateMode("angles")) fail("angles must ground");
if (!shouldGroundGenerateMode("strategy")) fail("strategy must ground");
if (!shouldGroundGenerateMode("audit")) fail("audit must ground");
if (!shouldGroundGenerateMode("calendar")) fail("calendar must ground");
if (shouldGroundGenerateMode("scan")) fail("scan should not ground");
if (shouldGroundGenerateMode("variations")) fail("variations should not ground");
if (!VIRAL_DESK_JOBS.calendar30.grounding) fail("calendar30 grounding");
if (!VIRAL_DESK_JOBS.trends.grounding) fail("trends grounding");

const cited = extractGroundingSources({
  candidates: [
    {
      groundingMetadata: {
        groundingChunks: [{ web: { uri: "https://www.facebook.com/ads/library/?q=x", title: "Ad Library" } }],
      },
    },
  ],
});
if (cited.length !== 1 || !cited[0]?.url.includes("facebook.com/ads/library")) fail("extractGroundingSources");

for (const [id, intake] of [
  [DEMO_ID, clinic],
  [DEMO_OLIVE_ID, olive],
  [DEMO_SAND_ID, sand],
] as const) {
  const pack = packOf(intake);
  if (!pack.research) fail(`${id} missing research`);
  const blob = JSON.stringify(pack.research);
  if (FAKE.test(blob)) fail(`${id} research fake metrics`);
}

if (PUBLISHED_DEMO_IDS.length !== 3) fail(`demo count ${PUBLISHED_DEMO_IDS.length}`);
if (PUBLISHED_DEMO_IDS.some((id) => /pizza|aluf/i.test(id))) fail("banned demo");

const empty = buildResearchSkeleton(emptyIntake());
if (empty.sources.some((s) => !s.exploreUrl.startsWith("http"))) fail("empty explore urls");

if (failures.length) {
  console.error("FAIL ad-research\n" + failures.join("\n"));
  process.exit(1);
}
console.log("PASS ad-research", {
  sources: skeleton.sources.map((s) => s.id).join(","),
  geo: researchGeo(olive),
  calendarHints: month.filter((d) => d.trendHint).length,
});
