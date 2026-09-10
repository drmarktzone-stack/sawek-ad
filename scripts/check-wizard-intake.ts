/**
 * Single-page intake: required fields stay on one surface, red while empty.
 * No hidden later step may be the first place a user learns description/goal are missing.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { t } from "../lib/i18n";
import {
  WIZARD_PICK_FIELDS,
  WIZARD_REQUIRED,
  emptyIntake,
  intakeLandingStep,
  wizardFieldDomId,
  wizardMissingFields,
  wizardReady,
  wizardSectionDomId,
} from "../lib/engine/validate";
import type { Intake } from "../lib/types";

const failures: string[] = [];
function fail(m: string) {
  failures.push(m);
}

const empty = emptyIntake();
if (wizardReady(empty)) fail("empty intake must not be wizardReady");
const missing = wizardMissingFields(empty);
const missingFields = missing.map((m) => m.field);
for (const need of ["description", "mainGoal", "businessName", "audience", "biggestProblem", "uniqueAdvantage"] as const) {
  if (!missingFields.includes(need)) fail(`empty intake missing list lacks ${need}`);
}

const onlyGoal: Intake = { ...empty, mainGoal: "walk_in" };
if (wizardReady(onlyGoal)) fail("goal alone must not unlock build");
if (!wizardMissingFields(onlyGoal).some((m) => m.field === "description")) {
  fail("description must still be missing when only goal is filled");
}

const onlyDesc: Intake = { ...empty, description: "شاورما وبرغر في باقة" };
if (wizardReady(onlyDesc)) fail("description alone must not unlock build");
if (!wizardMissingFields(onlyDesc).some((m) => m.field === "mainGoal")) {
  fail("goal must still be missing when only description is filled");
}

const filled: Intake = {
  ...empty,
  businessName: "أفندنا",
  description: "حلويات وبرغر. واتساب للمكان.",
  audience: "local_families",
  biggestProblem: "unknown",
  uniqueAdvantage: "location",
  mainGoal: "walk_in",
};
if (!wizardReady(filled)) fail("all required fields filled must be wizardReady");
if (wizardMissingFields(filled).length !== 0) fail("filled intake still reports missing");

if (intakeLandingStep(empty, 4) !== 2) fail("empty draft on build step must land on required block (2)");
if (intakeLandingStep(empty, 3) !== 2) fail("empty draft on details step must land on required block (2)");
if (intakeLandingStep(empty, 1) !== 2) fail("empty draft must land on required block, not type-only");
if (intakeLandingStep(filled, 4) !== 4) fail("ready intake may land on build section");

const ids = WIZARD_REQUIRED.map((f) => wizardFieldDomId(f.field));
if (new Set(ids).size !== ids.length) fail("wizard field DOM ids must be unique");
for (const f of WIZARD_REQUIRED) {
  const id = wizardFieldDomId(f.field);
  if (id !== `wizard-field-${f.field}`) fail(`unexpected id ${id}`);
  if (!f.label.he.trim() || !f.label.ar.trim() || !f.label.en.trim()) {
    fail(`label missing a locale for ${f.field}`);
  }
}

if (wizardSectionDomId(2) !== "wizard-section-2") fail("section id for required block");
if (wizardSectionDomId(4) !== "wizard-section-4") fail("section id for build");

for (const loc of ["he", "ar", "en"] as const) {
  for (const key of [
    "wizard.needText",
    "wizard.needPick",
    "wizard.requiredHeading",
    "wizard.requiredHint",
    "wizard.optionalHeading",
    "wizard.goToField",
    "wizard.missingHeading",
    "wizard.missingPillar",
    "cta.build",
    "cta.buildReady",
    "nicheGate.title",
    "nicheGate.body",
  ] as const) {
    const v = t(loc, key);
    if (!v || v === key) fail(`i18n ${key} missing ${loc}`);
  }
  if (!/חובה|إلزامي|Required/i.test(t(loc, "wizard.needText"))) {
    fail(`wizard.needText ${loc} should say required: ${t(loc, "wizard.needText")}`);
  }
}

if (t("ar", "cta.buildReady") !== "يلا نكمّل — الأركان جاهزة") {
  fail(`AR ready CTA is ${JSON.stringify(t("ar", "cta.buildReady"))}`);
}
if (t("ar", "cta.build") !== "ابنِ لي حملة كاملة") {
  fail(`AR build alias is ${JSON.stringify(t("ar", "cta.build"))}`);
}
if (t("ar", "wizard.missingPillar") !== "لسه ناقص: {name} — كمّله من المسح أو عدّله إيد") {
  fail(`AR missingPillar is ${JSON.stringify(t("ar", "wizard.missingPillar"))}`);
}
if (t("ar", "nicheGate.title") !== "هالموقع برا نطاق شغلنا الحالي.") {
  fail(`AR nicheGate.title is ${JSON.stringify(t("ar", "nicheGate.title"))}`);
}
if (t("ar", "nicheGate.body") !== "منخدم قطاعات محلية محددة — ابعت الرابط الصحيح أو تواصل معنا") {
  fail(`AR nicheGate.body is ${JSON.stringify(t("ar", "nicheGate.body"))}`);
}

if (!/هون|إلزامي/.test(t("ar", "wizard.needText"))) fail("AR needText should stay Palestinian/local");
if (!/وصف النشاط/.test(t("ar", "wizard.requiredHint"))) fail("AR requiredHint must name وصف النشاط");
if (!/الهدف/.test(t("ar", "wizard.requiredHint"))) fail("AR requiredHint must name الهدف");

const descLabel = WIZARD_REQUIRED.find((f) => f.field === "description")!.label;
const goalLabel = WIZARD_REQUIRED.find((f) => f.field === "mainGoal")!.label;
if (descLabel.ar !== "وصف النشاط") fail(`description AR label is ${descLabel.ar}`);
if (goalLabel.ar !== "الهدف") fail(`goal AR label is ${goalLabel.ar}`);

if (!WIZARD_PICK_FIELDS.has("mainGoal")) fail("goal is a pick field");
if (WIZARD_PICK_FIELDS.has("description")) fail("description is text, not a pick");

const flow = readFileSync(join(process.cwd(), "components/wizard-flow.tsx"), "utf8");
if (/\{step === [1234] &&/.test(flow)) {
  fail("wizard-flow still hides intake behind step === N");
}
if (/setStep\(\(s\) => \(s \+ 1\)/.test(flow)) {
  fail("Next still advances a hidden wizard step");
}
for (const f of WIZARD_REQUIRED) {
  if (!flow.includes(`wizardFieldDomId("${f.field}")`)) {
    fail(`wizard-flow missing wizardFieldDomId("${f.field}")`);
  }
}
if (!flow.includes("focusWizardField")) fail("missing same-page focusWizardField");
if (!flow.includes('t("wizard.missingPillar")')) fail("missing-pillar copy not wired");
if (!flow.includes('t("cta.buildReady")')) fail("ready CTA copy not wired");
if (!flow.includes('t("cta.build")')) fail("build alias not wired");
if (/disabled=\{!wizardReady\(intake\)/.test(flow)) fail("CTA must stay clickable to scroll when fields are missing");
if (!flow.includes('t("wizard.needText")') && !flow.includes("wizard.needText")) {
  fail("required text error not wired");
}
if (!flow.includes("requiredError(\"description\")") && !flow.includes('requiredError("description")')) {
  fail("description red error not wired");
}
if (!flow.includes('requiredError("mainGoal")')) fail("goal red error not wired");

if (failures.length) {
  console.error(`FAIL ${failures.length}`);
  for (const f of failures) console.error(" -", f);
  process.exit(1);
}
console.log("ok check-wizard-intake");
