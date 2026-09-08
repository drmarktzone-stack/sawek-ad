/**
 * Prompt 5 QA — task workspace, diversity, search suggest, image composition.
 * Deterministic. No invented volumes / fake diversity.
 */
import { emptyIntake } from "../lib/engine/validate";
import { assemblePack } from "../lib/engine/run";
import { validateIntake } from "../lib/engine/validate";
import { diagnose } from "../lib/engine/diagnose";
import { generateVariants } from "../lib/engine/copy";
import { buildPostingCalendar } from "../lib/engine/posting-calendar";
import {
  resetCreativeMemory,
  loadCreativeHistory,
  separateSources,
  containsNamedCompetitorOffer,
} from "../lib/engine/ad-engine";
import { jaccard, noveltyGate, selectStrategicDirections } from "../lib/engine/ad-engine/diversity";
import { buildCandidates } from "../lib/engine/ad-engine/candidates";
import { buildTaskContext, detectMarketingTask, contextBelongsToBusiness } from "../lib/engine/task-context";
import {
  decideComposition,
  solidBuffer,
  textBandBuffer,
  compositionCollides,
} from "../lib/engine/image-composition";
import {
  buildSearchQueries,
  parseSuggestPayload,
  neverUseGenericRestaurantFallback,
  GENERIC_LATIN_FALLBACK,
  researchQueryFromFacts,
} from "../lib/engine/search-suggest";
import { researchQuery, buildResearchSkeleton } from "../lib/engine/research-public";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { CampaignPack, Intake } from "../lib/types";

const failures: string[] = [];
function fail(m: string) {
  failures.push(m);
}

function packOf(intake: Intake, id?: string): CampaignPack {
  const report = validateIntake(intake);
  return assemblePack(intake, {
    report,
    diagnosis: diagnose(intake, report),
    variants: generateVariants(intake),
    agentStatus: {
      intake: "complete",
      diagnostic: "complete",
      strategic: "complete",
      media: "complete",
      optimizer: "complete",
    },
    ...(id ? { id } : {}),
  });
}

function bakery(name = "מאפיית הגבעה"): Intake {
  return {
    ...emptyIntake(),
    businessName: name,
    category: "מאפייה",
    description: "לחם מחמצת שכונתי",
    location: "עין ברק",
    whatsapp: "050-2223344",
    audience: "שכנים",
    biggestProblem: "אין לחם טרי אחרי הצהריים",
    uniqueAdvantage: "תנור אבן כל בוקר",
    mainGoal: "walk_in",
    offer: "אין מבצע",
  };
}

// 1) 5 consecutive Complete Ads — different strategies
resetCreativeMemory();
const packs: CampaignPack[] = [];
for (let i = 0; i < 5; i++) packs.push(packOf(bakery(), `p5-${i}`));
const families = packs.map((p) => p.completeAd?.family);
if (new Set(families).size !== 5) fail(`test1 diversity ${families.join(",")}`);
for (let i = 1; i < families.length; i++) {
  if (families[i] === families[i - 1]) fail(`test1 consecutive recycle ${families[i]}`);
}

// 2) Day1/2/3 no recycle
const cal = buildPostingCalendar(packs[0]!, "en", 7);
const h1 = cal.find((d) => d.day === 1)?.headline || "";
const h2 = cal.find((d) => d.day === 2)?.headline || "";
const h3 = cal.find((d) => d.day === 3)?.headline || "";
if (h1 && h1 === h2 && h2 === h3) fail(`test2 day headlines recycled: ${h1}`);
const n1 = cal.find((d) => d.day === 1)?.ideaName || "";
const n2 = cal.find((d) => d.day === 2)?.ideaName || "";
const n3 = cal.find((d) => d.day === 3)?.ideaName || "";
if (n1 && n1 === n2 && n2 === n3) fail(`test2 day ideas recycled: ${n1}`);

// 3) Fake 30% from history/competitor rejected
resetCreativeMemory();
const rival = packOf(
  {
    ...bakery("מאפיית הנקייה פ5"),
    competitors: [{ id: "r1", name: "לחם הזהב", url: "", notes: "הנחה 30% על כל הלחמים עד יום שישי" }],
    pastAds: "30% הנחה כמו אצל המתחרה. דנה אמרה.",
  },
  "p5-rival",
);
const rivalBlob = JSON.stringify(rival.completeAd);
if (/30\s*%/.test(rivalBlob || "") && /הנחה/.test(rivalBlob || "")) {
  fail("test3 competitor 30% leaked into complete ad");
}
if (containsNamedCompetitorOffer(rivalBlob || "", separateSources(rival.intake))) {
  fail("test3 named competitor offer in complete ad");
}

// 4) Business A vs B zero leak
resetCreativeMemory();
const a = packOf(
  {
    ...emptyIntake(),
    businessName: "מרפאת אלון פ5",
    category: "רופא ילדים",
    description: "מרפאת ילדים לפי סדר הגעה",
    location: "באקה",
    whatsapp: "050-1111111",
    uniqueAdvantage: "קבלה לפי סדר הגעה",
    offer: "אין מבצע",
  },
  "p5-a",
);
const b = packOf(
  {
    ...emptyIntake(),
    businessName: "קפה אלון פ5",
    category: "בית קפה",
    description: "קפה שכונתי",
    location: "חיפה",
    whatsapp: "050-9999999",
    uniqueAdvantage: "שולחן בחוץ",
    offer: "אין מבצע",
  },
  "p5-b",
);
if (/קפה אלון פ5|שולחן בחוץ/.test(JSON.stringify(a.completeAd) || "")) fail("test4 cafe leaked into clinic");
if (/מרפאת אלון פ5|סדר הגעה/.test(JSON.stringify(b.completeAd) || "") && /מרפא/.test(JSON.stringify(b.completeAd) || "")) {
  fail("test4 clinic leaked into cafe");
}
const ctxA = buildTaskContext({ intake: a.intake, pack: a });
const ctxB = buildTaskContext({ intake: b.intake, pack: b });
if (ctxA.businessId === ctxB.businessId) fail("test4 shared business key");
if (!contextBelongsToBusiness(ctxA, a.intake.businessName)) fail("test4 context A mismatch");
if (contextBelongsToBusiness(ctxA, b.intake.businessName)) fail("test4 context A accepted business B");

// 5) Image with existing text — no collision overlay
const texted = textBandBuffer(64, 64, "bottom");
const textDecision = decideComposition({ pixels: texted });
if (textDecision.mode === "overlay_safe") fail("test5 overlay allowed on texted image");
if (!compositionCollides(textDecision, true) && textDecision.mode === "overlay_safe") fail("test5 collision not flagged");

// 6) Image without text — overlay only if space OK
const clean = decideComposition({ pixels: solidBuffer(64, 64, [40, 80, 70]) });
if (clean.hasExistingText) fail("test6 clean image marked as text");
if (clean.mode !== "overlay_safe") fail(`test6 clean image mode ${clean.mode}`);
const logo = decideComposition({ asset: { label: "logo", note: "", name: "logo.png", mime: "image/png", publicSrc: "https://example.com/logo.png" } });
if (logo.mode === "overlay_safe") fail("test6 logo must not overlay");

// 7) Google/YouTube query from facts, never generic restaurant fallback
const q = researchQuery(bakery());
const qs = buildSearchQueries(bakery());
if (!qs.length) fail("test7 no search queries");
if (qs.some((x) => !neverUseGenericRestaurantFallback(x))) fail("test7 generic restaurant fallback used");
if (q === GENERIC_LATIN_FALLBACK) fail("test7 primary query is restaurant fallback");
if (!/מאפי|לחם|bakery|שכנים|עין/.test(qs.join(" "))) fail(`test7 queries missing business facts: ${qs.join(" | ")}`);
const parsed = parseSuggestPayload(["q", ["fresh bread nearby", "bakery hours ein", 12, "million views 9"]]);
if (!parsed.includes("fresh bread nearby")) fail("test7 parse missed suggestion");
if (parsed.some((s) => /million views/i.test(s))) fail("test7 parsed fake metric");
const researchSrc = readFileSync(join(process.cwd(), "lib/engine/ad-research.ts"), "utf8");
if (researchSrc.includes("mediterranean restaurant advertising")) fail("test7 latin restaurant fallback still in ad-research");
const skeleton = buildResearchSkeleton(bakery());
if (!skeleton.sources.some((s) => s.id === "google_suggest")) fail("test7 google_suggest missing from skeleton");
if (!skeleton.sources.some((s) => s.id === "youtube_suggest")) fail("test7 youtube_suggest missing from skeleton");

// 8) HE / AR / EN on complete ad
for (const loc of ["he", "ar", "en"] as const) {
  const block = packs[0]?.completeAd?.locales[loc];
  if (!block?.headline || !block.copy || !block.cta) fail(`test8 incomplete ${loc}`);
}

// 9) Task workspace is not empty when intake exists; empty intake stays empty
if (detectMarketingTask(bakery()) !== "create_ad") fail("test9 task not create_ad");
const filledCtx = buildTaskContext({ intake: bakery(), pack: packs[0] });
if (filledCtx.empty) fail("test9 filled workspace marked empty");
if (!filledCtx.facts.name) fail("test9 missing business name in workspace");
const emptyCtx = buildTaskContext({ intake: emptyIntake() });
if (!emptyCtx.empty) fail("test9 empty intake invented a workspace business");
if (emptyCtx.history.length) fail("test9 empty intake loaded foreign history");

// 10) Existing assemble still yields complete ad (one-click)
if (!packs[0]?.completeAd?.locales.he.headline) fail("test10 one-click complete ad missing");
if (!packs[0]?.completeAd?.locales.he.imageTreatment) fail("test10 image treatment missing");

const layers = separateSources(bakery());
const dirs = selectStrategicDirections({ intake: bakery(), layers, history: loadCreativeHistory({ businessId: "x" }) });
if (dirs.length < 10) fail("test10 too few strategic directions");
const cands = buildCandidates(bakery(), layers, [], []);
if (cands.length < 10) fail("test10 too few candidates");
const gate = noveltyGate(cands[0]!, []);
if (!gate.pass) fail("test10 first candidate blocked with empty history");

// similarity of reword vs new family
if (jaccard("תנור אבן כל בוקר", "תנור אבן כל בוקר היום") < 0.5) fail("test10 reword should be similar");

if (failures.length) {
  console.error("FAIL prompt5\n" + failures.join("\n"));
  process.exit(1);
}
console.log("PASS prompt5", {
  families,
  dayHeadlines: [h1.slice(0, 40), h2.slice(0, 40), h3.slice(0, 40)],
  queries: qs,
  imageTextMode: textDecision.mode,
  imageCleanMode: clean.mode,
  googleSource: skeleton.sources.some((s) => s.id === "google_suggest"),
  query: researchQueryFromFacts(bakery()),
});
