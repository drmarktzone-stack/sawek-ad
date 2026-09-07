/**
 * Ad generation engine QA — deterministic, no Vertex.
 * Isolation, novelty, fact governance, DNA, cross-business, languages.
 */
import { emptyIntake } from "../lib/engine/validate";
import { assemblePack } from "../lib/engine/run";
import { validateIntake } from "../lib/engine/validate";
import { diagnose } from "../lib/engine/diagnose";
import { generateVariants } from "../lib/engine/copy";
import { extractDna, workspaceFromPack } from "../lib/scientist/engines";
import { hasSocialProofFacts } from "../lib/engine/angles";
import { buildUserMessage } from "../lib/engine/gemini-generate";
import {
  resetCreativeMemory,
  loadCreativeHistory,
  foreignFactTokens,
  hasInventedCommercialClaim,
  buildBusinessTruth,
  separateSources,
  containsForeignFacts,
  containsNamedCompetitorOffer,
  runValidationGate,
} from "../lib/engine/ad-engine";
import type { CampaignPack, Intake, Locale } from "../lib/types";

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

resetCreativeMemory();

const bakeryPacks: CampaignPack[] = [];
for (let i = 0; i < 5; i++) {
  bakeryPacks.push(packOf(bakery(), `bake-${i}`));
}
const families = bakeryPacks.map((p) => p.completeAd?.family);
const hashes = bakeryPacks.map((p) => p.completeAd?.fingerprint.hash);
if (bakeryPacks.some((p) => !p.completeAd)) fail("each generation must produce a complete ad");
if (new Set(families).size < 3) fail(`5 consecutive generations not diverse enough: ${families.join(",")}`);
if (new Set(hashes).size < 3) fail(`5 consecutive fingerprint hashes too similar: ${hashes.join(",")}`);
const noveltyLater = bakeryPacks.slice(1).map((p) => p.completeAd?.noveltyStatus);
if (noveltyLater.every((n) => n === "original") && new Set(families).size === 1) {
  fail("later generations did not evolve or rotate");
}

resetCreativeMemory();
const poisoned: Intake = {
  ...bakery("מאפיית הרעל"),
  pastAds: "50% הנחה לכל הלקוחות. עדות: דנה אמרה שהלחם הכי טוב בעיר. 5 כוכבים.",
  pastCreatives: [
    {
      id: "pc1",
      sourceDocId: "d1",
      sourceName: "old-ad.jpg",
      headline: "50% הנחה רק היום",
      body: "דנה אמרה שהלחם מושלם. 200 לקוחות מרוצים.",
      cta: "קנו עכשיו",
      tag: "past_creative",
      confirmedReal: true,
    },
  ],
};
const poisonedPack = packOf(poisoned, "poison-1");
const poisonedBlob = JSON.stringify(poisonedPack.completeAd?.locales);
if (/50\s*%|הנחה רק היום|דנה אמרה|200 לקוחות|5 כוכבים/.test(poisonedBlob || "")) {
  fail(`previous fake discount/testimonial leaked into complete ad: ${poisonedBlob?.slice(0, 240)}`);
}
if (hasSocialProofFacts(poisoned)) fail("past creatives must not count as current social-proof facts");
const poisonLayers = separateSources(poisoned);
if (!foreignFactTokens(poisonLayers).length) fail("foreign tokens from past ads should be detected");
if (containsForeignFacts(poisonedBlob || "", poisonLayers).length) {
  fail("complete ad still contains foreign past-ad tokens");
}

resetCreativeMemory();
const rival: Intake = {
  ...bakery("מאפיית הנקייה"),
  competitors: [{ id: "r1", name: "לחם הזהב", url: "", notes: "הנחה 30% על כל הלחמים עד יום שישי" }],
};
const rivalPack = packOf(rival, "rival-1");
const rivalBlob = JSON.stringify(rivalPack.completeAd);
if (/30\s*%|לחם הזהב/.test(rivalBlob || "") && /הנחה/.test(rivalBlob || "")) {
  fail(`competitor discount inherited: ${rivalBlob?.slice(0, 240)}`);
}
const rivalLayers = separateSources(rival);
if (containsNamedCompetitorOffer(rivalBlob || "", rivalLayers)) {
  fail("competitor offer detected in complete ad");
}

resetCreativeMemory();
const noOffer = packOf(bakery("מאפיית בלי מחיר"), "no-price");
const noOfferBlob = `${noOffer.completeAd?.locales.he.headline} ${noOffer.completeAd?.locales.he.copy} ${noOffer.completeAd?.locales.en.copy}`;
if (/₪\s*\d|\$\s*\d|הנחה \d|50%/.test(noOfferBlob)) fail(`invented price/discount: ${noOfferBlob}`);
if (noOffer.completeAd?.locales.he.offer) fail("missing offer must not be filled in");
if (noOffer.completeAd?.locales.he.proof) fail("missing proof must not be invented");
if (hasInventedCommercialClaim(noOfferBlob, buildBusinessTruth(noOffer.intake), noOffer.intake)) {
  fail("complete ad invented a commercial claim");
}

resetCreativeMemory();
const clinicA = packOf(
  {
    ...emptyIntake(),
    businessName: "מרפאת אלון",
    category: "רופא ילדים",
    description: "מרפאת ילדים לפי סדר הגעה",
    location: "באקה",
    whatsapp: "050-1111111",
    audience: "הורים",
    uniqueAdvantage: "קבלה לפי סדר הגעה",
    offer: "אין מבצע",
  },
  "clinic-a",
);
const cafeB = packOf(
  {
    ...emptyIntake(),
    businessName: "קפה אלון",
    category: "בית קפה",
    description: "קפה שכונתי",
    location: "חיפה",
    whatsapp: "050-9999999",
    audience: "שכנים",
    uniqueAdvantage: "שולחן בחוץ",
    offer: "אין מבצע",
  },
  "cafe-b",
);
const clinicBlob = JSON.stringify(clinicA.completeAd);
const cafeBlob = JSON.stringify(cafeB.completeAd);
if (/קפה אלון|שולחן בחוץ/.test(clinicBlob || "")) fail("cafe facts leaked into clinic complete ad");
if (/מרפאת אלון|סדר הגעה|באקה/.test(cafeBlob || "") && /מרפא/.test(cafeBlob || "")) {
  fail("clinic facts leaked into cafe complete ad");
}
const histClinic = loadCreativeHistory({ businessId: "מרפאת-אלון" });
const histCafe = loadCreativeHistory({ businessId: "קפה-אלון" });
if (histClinic.some((f) => f.businessId.includes("קפה"))) fail("clinic memory mixed cafe fingerprints");
if (histCafe.some((f) => f.businessId.includes("מרפאת"))) fail("cafe memory mixed clinic fingerprints");

for (const loc of ["he", "ar", "en"] as Locale[]) {
  const block = noOffer.completeAd?.locales[loc];
  if (!block) fail(`missing ${loc} complete ad locale`);
  else {
    if (!block.headline.trim() || !block.copy.trim() || !block.cta.trim()) fail(`${loc} incomplete complete-ad`);
    if (loc === "he" && !/[\u0590-\u05FF]/.test(`${block.headline}${block.copy}`)) fail("HE missing Hebrew script");
    if (loc === "ar" && !/[\u0600-\u06FF]/.test(`${block.headline}${block.copy}`)) fail("AR missing Arabic script");
  }
}

resetCreativeMemory();
const emptyPack = packOf(emptyIntake(), "empty-1");
if (emptyPack.completeAd) fail("empty intake must not invent a complete ad");

resetCreativeMemory();
const partial = packOf(
  { ...emptyIntake(), businessName: "סטודיו חלקי", category: "עיצוב" },
  "partial-1",
);
if (!partial.completeAd) fail("named partial business should still get a complete ad");
if (partial.completeAd?.locales.he.offer) fail("partial pack invented an offer");
if (partial.completeAd && /₪|הנחה \d|testimonial|5 כוכב/.test(JSON.stringify(partial.completeAd.locales))) {
  fail("partial pack invented commercial proof");
}

const dna = extractDna(poisonedPack);
if (dna.traits.some((t) => /50\s*%|דנה אמרה/.test(t.claim) && t.kind === "know")) {
  fail("generated/past-ad claims became Business DNA");
}
if (dna.traits.some((t) => t.topic === "voice" && /INFERENCE|coreMessage/.test(t.claim) && poisonedPack.brief?.coreMessage.en && t.claim.includes(poisonedPack.brief.coreMessage.en) && !poisoned.voice?.coreMessage)) {
  fail("brief coreMessage written into DNA as truth");
}
const ws = workspaceFromPack(poisonedPack);
if (ws.dna.traits.some((t) => t.kind === "know" && /50\s*% הנחה/.test(t.claim))) {
  fail("workspace DNA absorbed generated discount");
}

const msg = buildUserMessage({
  facts: { businessName: "מאפיית הגבעה", offer: "אין מבצע", description: "לחם מחמצת" },
  description: "LAYER A — BUSINESS TRUTH\nbusinessName: מאפיית הגבעה",
  audience: "שכנים",
  mode: "ads",
});
if (!/LAYER A/.test(msg)) fail("generate prompt missing Business Truth layer");
if (!/LAYER C/.test(msg)) fail("generate prompt missing history-is-not-facts warning");
if (!/LAYER D/.test(msg)) fail("generate prompt missing market-strategy warning");
if (/pastAds:/.test(msg)) fail("generate prompt included pastAds as facts");

const badLocales = {
  he: {
    concept: "x",
    why: "y",
    audience: "z",
    angle: "a",
    hook: "h",
    headline: "50% הנחה לכל הלקוחות",
    copy: "דנה אמרה שהלחם מושלם",
    cta: "קנו",
    visual: "v",
    format: "f",
    platform: "p",
  },
  ar: {
    concept: "س",
    why: "س",
    audience: "س",
    angle: "س",
    hook: "س",
    headline: "خصم 50%",
    copy: "شهادة مختلقة",
    cta: "اشتروا",
    visual: "س",
    format: "س",
    platform: "س",
  },
  en: {
    concept: "c",
    why: "w",
    audience: "a",
    angle: "a",
    hook: "h",
    headline: "50% off today",
    copy: "Dana said it is the best",
    cta: "Buy",
    visual: "v",
    format: "f",
    platform: "p",
  },
};
const gate = runValidationGate({
  intake: bakery("מאפיית שער"),
  locales: badLocales,
  layers: separateSources(bakery("מאפיית שער")),
  marketUsed: false,
});
if (gate.ok && /50\s*%/.test(gate.locales.he.headline)) fail("validation gate accepted invented discount");
if (!gate.repaired && /50\s*%/.test(gate.locales.he.headline)) fail("validation gate did not repair invented discount");

if (failures.length) {
  console.error("FAIL ad-engine\n" + failures.join("\n"));
  process.exit(1);
}
console.log("PASS ad-engine", {
  families,
  hashes,
  clinicFamily: clinicA.completeAd?.family,
  cafeFamily: cafeB.completeAd?.family,
  gateRepaired: gate.repaired,
  gateOk: gate.ok,
});
