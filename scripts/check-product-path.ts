/**
 * Product-path QA after demo merge: thin real scans, copy honesty, CMO, demo policy.
 * No fake ROAS. No unauthorized brand demos.
 */
import { emptyIntake } from "../lib/engine/validate";
import { assemblePack } from "../lib/engine/run";
import { validateIntake } from "../lib/engine/validate";
import { diagnose } from "../lib/engine/diagnose";
import { generateVariants } from "../lib/engine/copy";
import { buildCmoIdeasPack, gapCompensation } from "../lib/engine/cmo-ideas";
import { channelFields, fieldOrFact, isIncompleteMarker } from "../lib/channel-copy";
import { honestProofCopy, sanitizeAngles } from "../lib/engine/angles";
import { rsaLines } from "../lib/engine/spoken";
import { bankForIntake, serviceFamily } from "../lib/creative-bank";
import { PUBLISHED_DEMO_IDS } from "../lib/demo-catalog";
import type { CampaignPack, Intake } from "../lib/types";

const failures: string[] = [];
function fail(m: string) {
  failures.push(m);
}

function packOf(intake: Intake): CampaignPack {
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
  });
}

const thinScan: Intake = {
  ...emptyIntake(),
  businessName: "סטודיו נועה לעץ",
  category: "סדנאות עץ",
  description: "סדנאות נגרות קטנות בשכונה",
  location: "",
  whatsapp: "050-1112233",
  website: "https://example-wood.example",
};

const namedPhone: Intake = {
  ...emptyIntake(),
  businessName: "קפה גבעה",
  category: "בית קפה",
  description: "קפה שכונתי עם שולחנות בחוץ",
  location: "עין ברק",
  whatsapp: "052-7009999",
  audience: "שכנים",
  biggestProblem: "רעש של רשתות",
  uniqueAdvantage: "שולחן שקט בחוץ",
  mainGoal: "walk_in",
};

if (PUBLISHED_DEMO_IDS.length !== 3) fail(`demo count ${PUBLISHED_DEMO_IDS.length}`);
for (const banned of ["pizza", "aluf", "pizzahut"]) {
  if (PUBLISHED_DEMO_IDS.some((id) => id.toLowerCase().includes(banned))) fail(`unauthorized demo ${banned}`);
}

const thinPack = packOf(thinScan);
const gaps = thinPack.cmoIdeas?.gapPlan ?? gapCompensation(thinScan);
const nowMoves = gaps.moves.filter((m) => m.priority !== "later");
if (!nowMoves.length) fail("thin scan missing now-priority gap moves");
if (nowMoves[0]?.missingField !== "mediaAssets" && !nowMoves.some((m) => m.missingField === "mediaAssets")) {
  fail("thin scan gap plan missing photo move");
}
const later = gaps.moves.filter((m) => m.priority === "later");
if (!later.some((m) => m.missingField === "monthlyBudget")) fail("budget should be later, not a shame wall");

const diagBlob = JSON.stringify(thinPack.diagnosis.hypotheses.map((h) => h.finding.he));
const shameHits = (diagBlob.match(/חסר שם|חסר מיקום|חסרים מספרים/g) || []).length;
if (shameHits > 1) fail(`diagnosis still a shame-wall of חסר (${shameHits}): ${diagBlob.slice(0, 240)}`);
if (!thinPack.diagnosis.hypotheses.some((h) => /צלם|תמונ|זווית מקום|רשימת צילום/.test(h.finding.he + h.recommendation.he))) {
  fail("diagnosis missing actionable photo/place compensation");
}

const namedPack = packOf(namedPhone);
for (const loc of ["he", "ar", "en"] as const) {
  const f = channelFields(namedPack, loc);
  const blob = [f.headline, f.cta, f.pageName, f.caption, f.posterHeadline, f.waScript, f.primaryText].join("\n");
  if (isIncompleteMarker(f.headline, loc)) fail(`${loc} headline incomplete despite name+phone`);
  if (isIncompleteMarker(f.pageName, loc)) fail(`${loc} pageName incomplete despite name`);
  if (/\[יש להשלים\]|\[يجب الاستكمال\]|\[TO COMPLETE\]/.test(blob)) {
    fail(`${loc} channelFields leaked incomplete marker despite name+phone: ${blob.slice(0, 200)}`);
  }
}

const rsa = rsaLines(namedPhone, "he");
if (/מיקום חסר/.test(rsa) && namedPhone.businessName) fail(`rsaLines shame location: ${rsa}`);

const proof = honestProofCopy(namedPhone, "he");
if (isIncompleteMarker(proof.headline, "he")) fail("honestProofCopy used incomplete despite name");
if (/\bROAS\b|\d\s*כוכב|5 stars|4\.8/.test(proof.copy)) fail("honestProof invented proof/ROAS");

const sanitized = sanitizeAngles({ social_proof: { he: { headline: "[יש להשלים]", copy: "[יש להשלים]", cta: "[יש להשלים]" } } }, namedPhone);
if (sanitized?.social_proof?.he && isIncompleteMarker(sanitized.social_proof.he.headline, "he")) {
  fail("sanitizeAngles left incomplete social_proof when name exists");
}

if (serviceFamily(namedPhone) !== "cafe") fail(`cafe family ${serviceFamily(namedPhone)}`);
const cafeBank = bankForIntake(namedPhone, "he");
if (!cafeBank.hooks.some((h) => /קפה|כוס|שקט/.test(h))) fail(`cafe hooks not distinctive: ${cafeBank.hooks.join(" | ")}`);
if (cafeBank.hooks.some((h) => /פיצה|pizza/i.test(h))) fail("cafe hooks leaked pizza");

if (!fieldOrFact("", "he", { name: "קפה גבעה", phone: "052-7009999" }).includes("קפה")) {
  fail("fieldOrFact did not prefer name");
}

const cmo = buildCmoIdeasPack(namedPhone);
if (cmo.selected.length < 3) fail("named cafe missing CMO ideas");
if (/ROAS\s*[:=]\s*\d/.test(JSON.stringify(cmo))) fail("fake ROAS in CMO pack");
if (cmo.selected.some((i) => /hummus|olive_table|two_cover/.test(i.id))) {
  fail(`cafe CMO leaked restaurant-olive platforms: ${cmo.selected.map((i) => i.id).join(",")}`);
}
if (!cmo.selected.some((i) => /cup|quiet|stool|brew|empty_table|no_best|wa_table/.test(i.id))) {
  fail(`cafe CMO missing cafe platforms: ${cmo.selected.map((i) => i.id).join(",")}`);
}

if (!thinPack.siteAudit?.weaknesses.some((w) => w.id === "no-photos")) {
  fail("thin scan site audit missing no-photos (photo offer trigger)");
}

if (failures.length) {
  console.error("FAIL\n" + failures.join("\n"));
  process.exit(1);
}
console.log("PASS product path", {
  thinNow: nowMoves.map((m) => m.missingField),
  cafeIdeas: cmo.selected.map((i) => i.id),
  headline: channelFields(namedPack, "he").headline,
});
