import { emptyIntake } from "../lib/engine/validate";
import { demoIntake } from "../lib/demo";
import { catalogIntake, DEMO_OLIVE_ID, DEMO_SAND_ID } from "../lib/demo-catalog";
import { factsToIntake } from "../lib/engine/gemini-generate";
import {
  bypassNicheGate,
  charterAllowsCampaign,
  resolveOperatingNiche,
} from "../lib/operating-niche";
import { detectVertical } from "../lib/vertical";

const failures: string[] = [];
function fail(msg: string) {
  failures.push(msg);
}

function facts(name: string, category: string, description: string) {
  return { businessName: name, category, description };
}

if (resolveOperatingNiche(facts("מרפאת שיניים נווה", "dental clinic", "טיפולי שיניים בבאקה")) !== "medical_clinic") {
  fail("dental clinic should be medical_clinic");
}
if (resolveOperatingNiche(facts("عيادة تجميل", "aesthetic clinic", "بوتوكس وفلر طبي")) !== "medical_clinic") {
  fail("aesthetic clinic should be medical_clinic");
}
if (resolveOperatingNiche(facts("מרכז למידה הדר", "tutoring", "שיעורי עזר לבגרות")) !== "education") {
  fail("tutoring center should be education");
}
if (resolveOperatingNiche(facts("מסעדת הזית", "מסעדה", "מטבח ים-תיכוני בבאקה")) !== "restaurant") {
  fail("restaurant should be restaurant");
}
if (resolveOperatingNiche(facts("קפה גבעה", "cafe", "מקום שקט עם אספרסו")) !== "restaurant") {
  fail("cafe should be restaurant");
}
if (resolveOperatingNiche(facts("שיפוצי הבית", "קבלן שיפוצים", "שיפוץ דירות, אינסטלציה וחשמל")) !== "home_trades") {
  fail("renovation contractor should be home_trades");
}
if (resolveOperatingNiche(facts("ستوديو قوة", "pilates studio", "פילאטיס ומאמן אישי בשכונה")) !== "fitness_studio") {
  fail("pilates studio should be fitness_studio");
}
if (resolveOperatingNiche(facts("سوبر ماركت الكرامة", "GroceryStore", "بيض حليب أجبان")) !== "unsupported") {
  fail("grocery must be unsupported (not a charter niche)");
}
if (detectVertical(facts("ستوديو قوة", "pilates studio", "פילאטיס")) === "retail") {
  fail("fitness studio must not classify as retail");
}

const clinicDemo = demoIntake("ar");
if (!bypassNicheGate(clinicDemo) || !charterAllowsCampaign(clinicDemo)) {
  fail("clinic demo must bypass / allow medical niche");
}
const olive = catalogIntake(DEMO_OLIVE_ID, "he");
if (!olive || resolveOperatingNiche(olive) !== "restaurant" || !charterAllowsCampaign(olive)) {
  fail("olive kitchen demo must be restaurant charter niche");
}
const sand = catalogIntake(DEMO_SAND_ID, "he");
if (!sand || resolveOperatingNiche(sand) !== "unsupported" || charterAllowsCampaign(sand)) {
  fail("sand boutique (fashion retail) must be gated");
}

const blank = emptyIntake();
if (!charterAllowsCampaign(blank)) fail("empty intake must not block the scan step");

const groceryFacts = factsToIntake({
  facts: { businessName: "سوبر ماركت الكرامة", category: "GroceryStore", description: "بيض حليب أجبان" },
});
if (charterAllowsCampaign(groceryFacts)) fail("generate facts for grocery must be niche-gated");

const clinicFacts = factsToIntake({
  facts: { businessName: "عيادة أسنان النور", category: "dental clinic", description: "טיפולי שיניים" },
});
if (!charterAllowsCampaign(clinicFacts)) fail("generate facts for dental clinic must be allowed");

if (failures.length) {
  console.error("FAIL\n" + failures.join("\n"));
  process.exit(1);
}
console.log("PASS operating-niche", {
  dental: resolveOperatingNiche(facts("מרפאת שיניים נווה", "dental clinic", "")),
  grocery: resolveOperatingNiche(facts("سوبر ماركت الكرامة", "GroceryStore", "بيض")),
  pilates: resolveOperatingNiche(facts("ستوديو قوة", "pilates studio", "פילאטיס")),
});
