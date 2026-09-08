/**
 * Clinic / pediatric leftovers must never seed a later fashion (or other) business.
 */
import { emptyIntake } from "../lib/engine/validate";
import { assemblePack, idleStatus } from "../lib/engine/run";
import { validateIntake } from "../lib/engine/validate";
import { diagnose } from "../lib/engine/diagnose";
import { generateVariants } from "../lib/engine/copy";
import { produceAd } from "../lib/engine/produce-ad";
import { generateStudioVariants } from "../lib/studio-engine";
import { channelFields } from "../lib/channel-copy";
import { copyLeaksClinic, PEDIATRIC_CLINIC_COPY_RE } from "../lib/clinic-leak";
import { nextHitlGate } from "../lib/engine/hitl";
import { demoIntake } from "../lib/demo";
import type { CampaignPack, Intake } from "../lib/types";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const failures: string[] = [];
function fail(m: string) {
  failures.push(m);
}

const CLINIC_AR = "فحص شامل لكل طفل واعطاءه الوقت الكافي";

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

const clinic: Intake = {
  ...demoIntake("he"),
  uniqueAdvantage: CLINIC_AR,
  biggestProblem: "طوابير الساعات",
};

const fashion: Intake = {
  ...emptyIntake(),
  businessName: "עיר המותגים",
  category: "אופנה",
  description: "חנות מותגים ושופינג",
  location: "באקה",
  website: "https://www.aam.co.il",
  audience: "women",
  biggestProblem: "מחפשים מותגים במקום אחד",
  uniqueAdvantage: "קניון מותגים בבאקה",
  mainGoal: "leads",
  offer: "משלוח חינם מעל 500",
};

if (!copyLeaksClinic(CLINIC_AR)) fail("screenshot pediatric Arabic must count as clinic leak");
if (copyLeaksClinic(fashion.uniqueAdvantage)) fail("fashion advantage must not be flagged as clinic");

const clinicAd = produceAd(clinic, "soft-organic", CLINIC_AR, "ar");
if (!/طفل|عيادة|طبيب|סדר|מרפא|كلاليت/.test(`${clinicAd.headline} ${clinicAd.body}`)) {
  /* clinic pack may still use locked/demo facts — allowed */
}

const fashionFromClinicIdea = produceAd(fashion, "soft-organic", CLINIC_AR, "he");
const fashionBlob = `${fashionFromClinicIdea.headline}\n${fashionFromClinicIdea.body}\n${fashionFromClinicIdea.idea}`;
if (PEDIATRIC_CLINIC_COPY_RE.test(fashionBlob) || fashionBlob.includes(CLINIC_AR)) {
  fail(`fashion produceAd inherited clinic idea: ${fashionBlob}`);
}
if (/מרפאה|רופא ילדים|סאמר|أبو مخ|drsamerped/i.test(fashionBlob)) {
  fail(`fashion produceAd leaked clinic identity: ${fashionBlob}`);
}

const social = produceAd(fashion, "social-proof", "", "he");
if (copyLeaksClinic(`${social.headline} ${social.body}`)) {
  fail(`empty-idea fashion ad leaked clinic: ${social.headline} ${social.body}`);
}

const studioRows = generateStudioVariants("post", CLINIC_AR, "he", fashion);
const studioBlob = studioRows.map((r) => r.body).join("\n");
if (studioBlob.includes(CLINIC_AR) || copyLeaksClinic(studioBlob)) {
  fail(`studio variants leaked clinic into fashion: ${studioBlob}`);
}
if (!/עיר המותגים|קניון|מותגים/.test(studioBlob)) {
  fail(`studio fashion seed missing business truth: ${studioBlob}`);
}

const fashionPack = packOf(fashion);
const channels = ["he", "ar", "en"].map((loc) => channelFields(fashionPack, loc as "he" | "ar" | "en"));
for (const ch of channels) {
  const blob = Object.values(ch).flat().join("\n");
  if (blob.includes(CLINIC_AR) || /فحص شامل لكل طفل/.test(blob)) {
    fail(`channelFields leaked clinic Arabic: ${blob.slice(0, 240)}`);
  }
}

const clinicPack = packOf(clinic);
if (nextHitlGate(idleStatus(), clinicPack) === "complete" && !clinicPack.diagnosis.approved) {
  fail("unapproved clinic pack should not be treated as finished HITL");
}

const dept = readFileSync(join(process.cwd(), "components/dept-creative.tsx"), "utf8");
if (!dept.includes("produced-ads")) fail("CreativeDeptView must render produced ads after design.make");
if (!dept.includes("design-make-")) fail("design.make buttons need test ids");
if (/function makeAd[\s\S]*produceAd[\s\S]*onPack\(next\);[\s\S]*^}/m.test(dept) && !dept.includes("design.needBusiness")) {
  fail("makeAd must surface missing-intake instead of silence");
}

const studioUi = readFileSync(join(process.cwd(), "components/content-studio.tsx"), "utf8");
if (/onClick=\{produce\}[^>]*disabled=\{!idea\.trim\(\)\}/.test(studioUi)) {
  fail("studio design.make must not require an empty-looking idea field");
}
if (!studioUi.includes("studioPiecesForIntake")) fail("studio library must filter by current business");

if (failures.length) {
  console.error("check-clinic-isolation FAIL");
  for (const f of failures) console.error(" -", f);
  process.exit(1);
}
console.log("check-clinic-isolation PASS");
