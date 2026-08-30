import { emptyIntake } from "../lib/engine/validate";
import { coachIntake, isUnknownProblem } from "../lib/engine/coach";
import { generateVariants } from "../lib/engine/copy";
import { generateStrategy } from "../lib/engine/strategy";
import { diagnose } from "../lib/engine/diagnose";
import { validateIntake } from "../lib/engine/validate";
import { detectVertical } from "../lib/vertical";
import { applyIntakeToDraft, loadDraft, saveDraft } from "../lib/storage";
import type { Intake } from "../lib/types";

const failures: string[] = [];
function fail(msg: string) {
  failures.push(msg);
}

const mem = new Map<string, string>();
function makeStorage(map: Map<string, string>): Storage {
  return {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => {
      map.set(k, String(v));
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
    clear: () => {
      map.clear();
    },
    key: (i: number) => [...map.keys()][i] ?? null,
    get length() {
      return map.size;
    },
  } as Storage;
}
const localStorageMock = makeStorage(mem);
const g = globalThis as unknown as {
  window: { localStorage: Storage; sessionStorage: Storage; location: { search: string }; dispatchEvent: (e: Event) => boolean };
  localStorage: Storage;
  sessionStorage: Storage;
};
g.localStorage = localStorageMock;
g.sessionStorage = makeStorage(new Map());
g.window = {
  localStorage: localStorageMock,
  sessionStorage: g.sessionStorage,
  location: { search: "" },
  dispatchEvent: () => true,
};

function moneyInvented(blob: string, intake: Intake): boolean {
  const inIntake = JSON.stringify(intake);
  const hits = blob.match(/\d[\d.,]*\s*₪|₪\s*\d[\d.,]*|\d+\s*%/g) || [];
  return hits.some((h) => !inIntake.includes(h) && !inIntake.includes(h.replace(/\s/g, "")));
}

function doctorIn(text: string): boolean {
  return /ד["״]ר|\bDr\.|\bDoctor\b|רופא|طبيب|أبو مخ|סאמר|Samer Abu/i.test(text);
}

const clinic: Intake = {
  ...emptyIntake(),
  operatingModel: "free_service",
  businessName: "מרפאת ילדים ד״ר סאמר אבו מוך",
  category: "מרפאה",
  description: "מרפאת ילדים בבאקה. קבלה לפי סדר הגעה.",
  location: "באקה",
  audience: "parents",
  biggestProblem: "unknown",
  uniqueAdvantage: "מרפאת ילדים בבאקה. קבלה לפי סדר הגעה.",
  mainGoal: "walk_in",
};

if (detectVertical(clinic) !== "clinic") fail(`clinic vertical=${detectVertical(clinic)}`);
if (!isUnknownProblem(clinic)) fail("clinic problem should be unknown");

const clinicCoach = coachIntake(clinic);
if (!clinicCoach.critiques.some((c) => c.stage === "wizard_details")) {
  fail("clinic unknown problem missing wizard_details critique");
}
if (!clinicCoach.suggestions.length) fail("clinic suggestions empty");
if (!clinicCoach.suggestions.some((s) => s.field === "biggestProblem" && s.proposed.he.trim())) {
  fail("clinic problem suggestion empty");
}
const clinicBlob = JSON.stringify(clinicCoach);
if (moneyInvented(clinicBlob, clinic)) fail(`clinic coach invented ₪: ${clinicBlob.slice(0, 400)}`);
if (clinicCoach.strategies.length !== 3) fail(`clinic strategies ${clinicCoach.strategies.length} != 3`);
if (!clinicCoach.strategies.some((s) => /חשיפה|ביקור|walk-in|تعرّض/i.test(`${s.body.he} ${s.plan7.he} ${s.body.en}`))) {
  fail("free_service clinic strategies should talk exposure/walk-in");
}

const retail: Intake = {
  ...emptyIntake(),
  businessName: "עיר המותגים",
  category: "אופנה",
  description: "חנות מותגים ושופינג בבאקה.",
  location: "באקה",
  audience: "women",
  biggestProblem: "unknown",
  uniqueAdvantage: "location",
  mainGoal: "sales",
  offer: "חיסול",
  offerCustom: true,
};
if (detectVertical(retail) !== "retail") fail(`retail vertical=${detectVertical(retail)}`);
const retailCoach = coachIntake(retail);
const retailDiag = diagnose(retail, validateIntake(retail));
const retailStrat = generateStrategy(retail, retailDiag);
const retailStratBlob = JSON.stringify(retailStrat);
if (!/חיסול|clearance|sale|تصفية/i.test(retailStratBlob + JSON.stringify(retailCoach))) {
  fail("retail strategies missing sale/clearance from intake");
}
if (/מעבר קופה|kupa switch|نقل الصندوق/i.test(retailStratBlob)) {
  fail("retail strategy leaked kupa");
}
const retailVars = generateVariants(retail);
const heHeadlines = retailVars.filter((v) => v.locale === "he").map((v) => v.headline);
for (const h of heHeadlines) {
  if (doctorIn(h)) fail(`retail HE headline has doctor name: ${h}`);
}
if (heHeadlines.some((h) => /ד["״]ר/.test(h))) fail("retail HE headline has ד״ר");

const restaurant: Intake = {
  ...emptyIntake(),
  businessName: "Grill King",
  category: "مطعم شاورما / burger",
  description: "شاورما وبرغر وحلويات. جت أولاً. واتساب للمكان.",
  location: "باقة",
  whatsapp: "052-1112233",
  audience: "local_families",
  biggestProblem: "unknown",
  uniqueAdvantage: "location",
  mainGoal: "walk_in",
};
if (detectVertical(restaurant) !== "restaurant") fail(`restaurant vertical=${detectVertical(restaurant)}`);
const restCoach = coachIntake(restaurant);
const restVars = generateVariants(restaurant);
const restBlob = [
  JSON.stringify(restCoach),
  ...restVars.map((v) => `${v.headline}\n${v.primaryText}\n${v.cta}`),
  JSON.stringify(generateStrategy(restaurant, diagnose(restaurant, validateIntake(restaurant)))),
].join("\n");
for (const n of ["המרפאה", "العيادة", "הילד חולה", "جيبوه عالعيادة", "الولد بيمرض", "חדר מיון"]) {
  if (restBlob.includes(n)) fail(`restaurant clinic copy leak «${n}»`);
}

const empty = emptyIntake();
const emptyCoach = coachIntake(empty);
const emptyBlob = JSON.stringify(emptyCoach);
if (moneyInvented(emptyBlob, empty)) fail("emptyIntake invented ₪");
if (emptyCoach.suggestions.some((s) => s.field === "offer" && !/no_offer|אין מבצע|لا يوجد عرض|No offer/i.test(s.proposed.he + s.proposed.en))) {
  fail("emptyIntake invented an offer suggestion");
}
if (/10\s*%|20\s*%|קנו עכשיו|buy now|VIP\b/i.test(emptyBlob) && !/no VIP|בלי VIP/i.test(emptyBlob)) {
  // "VIP" as a forbidden-claim mention in a rule is ok; a sold VIP package is not
  if (/חבילת VIP|VIP package|عرض VIP/i.test(emptyBlob)) fail("emptyIntake invented VIP offer");
}
if (emptyCoach.strategies.some((s) => /קופון חדש|new coupon|خصم 50/i.test(`${s.body.he}${s.body.ar}${s.body.en}`))) {
  fail("emptyIntake strategy invented a coupon");
}

saveDraft({ intake: empty, step: 1, phase: "wizard" });
const stored = applyIntakeToDraft(empty, { resetWizard: true });
if (!stored.coach) fail("applyIntakeToDraft emptyIntake path did not store CoachReport");
const loaded = loadDraft();
if (!loaded.coach) fail("loadDraft missing stored CoachReport after ingest path");
if (loaded.step !== 2) fail(`ingest path step ${loaded.step} != 2`);

if (failures.length) {
  console.error("FAIL\n" + failures.join("\n"));
  process.exit(1);
}
console.log("PASS coach");
console.log("clinic score", clinicCoach.score, "critiques", clinicCoach.critiques.map((c) => c.stage).join(","));
console.log("retail strategies mention sale:", /חיסול/.test(retailStratBlob + JSON.stringify(retailCoach)));
console.log("retail HE headlines:", heHeadlines.join(" | "));
console.log("empty score", emptyCoach.score, "offer suggestions", emptyCoach.suggestions.filter((s) => s.field === "offer").length);
