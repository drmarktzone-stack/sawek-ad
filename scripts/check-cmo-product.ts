/**
 * Product-path QA: CMO platforms + banks on ANY assembled pack (not demos only).
 * No fake ROAS. No unauthorized real-brand demo ids.
 */
import { emptyIntake } from "../lib/engine/validate";
import { assemblePack } from "../lib/engine/run";
import { validateIntake } from "../lib/engine/validate";
import { diagnose } from "../lib/engine/diagnose";
import { ensureAgency } from "../lib/engine/agency";
import { buildCmoIdeasPack, platformCount } from "../lib/engine/cmo-ideas";
import { bankForIntake, hooksFor, anglesFor } from "../lib/creative-bank";
import { detectVertical, foodFamily } from "../lib/vertical";
import { topicQueriesFor, isOnTopicStock } from "../lib/stock-images";
import { PUBLISHED_DEMO_IDS } from "../lib/demo-catalog";
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

const clinic: Intake = {
  ...emptyIntake(),
  businessName: "מרפאת בדיקה",
  category: "רופא ילדים",
  description: "מרפאת ילדים לפי סדר הגעה בבאקה",
  location: "באקה",
  clinicHours: "א׳–ה׳ 08:00–14:00",
  whatsapp: "050-0000000",
  audience: "הורים",
  biggestProblem: "תורים ארוכים",
  uniqueAdvantage: "קבלה לפי סדר הגעה",
  mainGoal: "walk_in",
  offer: "אין מבצע",
};

const olive: Intake = {
  ...emptyIntake(),
  businessName: "מטבח הזית",
  category: "מטבח ים-תיכוני",
  description: "מנות ביתיות, שמן זית, ישיבה בחוץ בשקיעה. טעימות זוגית.",
  location: "נווה שקד",
  offer: "ארוחת טעימות זוגית ב-₪149",
  whatsapp: "052-7001234",
  audience: "משפחות מקומיות",
  biggestProblem: "תורים ארוכים במסעדות",
  uniqueAdvantage: "שולחן בחוץ ושמן זית",
  mainGoal: "bookings",
};

const genericShop: Intake = {
  ...emptyIntake(),
  businessName: "סדנת עץ",
  category: "סדנאות",
  description: "סדנאות עץ קטנות בשכונה",
  location: "חיפה",
};

if (detectVertical(clinic) !== "clinic") fail(`clinic vertical ${detectVertical(clinic)}`);
if (detectVertical(olive) !== "restaurant") fail(`olive vertical ${detectVertical(olive)}`);
if (foodFamily(olive) !== "mediterranean") fail(`olive foodFamily ${foodFamily(olive)}`);

const clinicPack = packOf(clinic);
if (!clinicPack.cmoIdeas?.selected.length) fail("assemblePack clinic missing cmoIdeas");
if (clinicPack.cmoIdeas!.selected.length < 3) fail("clinic CMO ideas < 3");
for (const idea of clinicPack.cmoIdeas!.selected) {
  if (!idea.platform.he || !idea.platform.ar || !idea.platform.en) fail(`idea ${idea.id} missing platform`);
  if (!idea.scorecard.length) fail(`idea ${idea.id} missing scorecard`);
  if (idea.planningScore < 1 || idea.planningScore > 100) fail(`planningScore ${idea.planningScore}`);
}

const hydrated = ensureAgency({ ...clinicPack, cmoIdeas: undefined, agency: undefined });
if (!hydrated.cmoIdeas?.selected.length) fail("ensureAgency did not hydrate cmoIdeas");
if (!hydrated.agency) fail("ensureAgency did not hydrate agency");

const rebuilt = buildCmoIdeasPack(olive);
if (!rebuilt.selected.some((i) => /olive|hummus|table|mediterranean|ceramic/i.test(i.id))) {
  fail(`olive ideas not mediterranean-biased: ${rebuilt.selected.map((i) => i.id).join(",")}`);
}
const cmoBlob = JSON.stringify(rebuilt);
if (/ROAS\s*[:=]\s*\d|likes?\s*[:=]\s*\d/i.test(cmoBlob)) fail("fake ROAS/likes in olive cmoIdeas");

const shopPack = packOf(genericShop);
if (!shopPack.cmoIdeas?.selected.length) fail("generic shop missing cmoIdeas — product path broken");
if (!shopPack.cmoIdeas?.gapPlan.moves.length) fail("generic shop missing gap compensation");

for (const v of ["clinic", "restaurant", "retail", "pool", "school", "product", "generic"] as const) {
  if (platformCount(v) < 6) fail(`platform catalog ${v} too small: ${platformCount(v)}`);
}

const oliveBank = bankForIntake(olive, "he");
if (oliveBank.hooks.some((h) => /פיצה|pizza/i.test(h))) fail("olive hooks leaked pizza");
if (oliveBank.angles.some((a) => /פיצה|משלוח גנרי|pizza/i.test(a))) fail("olive angles leaked pizza/generic delivery");
if (!oliveBank.angles.some((a) => /ים-תיכון|טעימות|שולחן/i.test(a))) fail("olive angles not distinctive");

const clinicHooks = hooksFor("clinic", "he", clinic);
if (clinicHooks.length < 3) fail("clinic hooks thin");
if (clinicHooks.every((h) => h === clinic.businessName)) fail("clinic hooks are name-only generic");

const clinicAngles = anglesFor("clinic", "he", clinic);
if (clinicAngles.length < 3) fail("clinic angles thin");
if (clinicAngles.includes("אמון") && clinicAngles.length <= 3) fail("clinic angles still generic trust-only");

const oliveQs = topicQueriesFor({
  vertical: "restaurant",
  category: olive.category,
  q: olive.description,
  description: olive.description,
  offer: olive.offer,
});
if (oliveQs.some((q) => /pizza/i.test(q))) fail(`olive stock queries leaked pizza: ${oliveQs.join(" | ")}`);
if (!oliveQs.some((q) => /hummus|mezze|olive|mediterranean/i.test(q))) {
  fail(`olive stock queries missing mediterranean: ${oliveQs.join(" | ")}`);
}
if (isOnTopicStock("restaurant", "Pizza Hut pepperoni", "", "mediterranean")) {
  fail("Pizza Hut still on-topic for mediterranean");
}

for (const banned of ["demo-pizza-hut", "demo-aluf-sport", "pizzahut", "alufsport"]) {
  if (PUBLISHED_DEMO_IDS.some((id) => id.includes(banned.replace("demo-", "")))) {
    fail(`published demo id leaked ${banned}`);
  }
}
if (PUBLISHED_DEMO_IDS.length !== 3) fail(`published demo count ${PUBLISHED_DEMO_IDS.length}`);

if (failures.length) {
  console.error("FAIL\n" + failures.join("\n"));
  process.exit(1);
}
console.log("PASS cmo product path", {
  clinicIdeas: clinicPack.cmoIdeas?.selected.map((i) => i.id),
  oliveIdeas: rebuilt.selected.map((i) => i.id),
  shopGaps: shopPack.cmoIdeas?.gapPlan.moves.length,
});
