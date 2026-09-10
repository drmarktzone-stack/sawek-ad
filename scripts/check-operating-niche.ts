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
if (resolveOperatingNiche(facts("عيادة أطفال", "clinic", "طبيب أطفال في باقة")) !== "medical_clinic") {
  fail("local medical clinic should be medical_clinic");
}
if (resolveOperatingNiche(facts("מסעדת הזית", "מסעדה", "מטבח ים-תיכוני בבאקה")) !== "restaurant") {
  fail("restaurant should be restaurant");
}
if (resolveOperatingNiche(facts("קפה גבעה", "cafe", "מקום שקט עם אספרסו")) !== "restaurant") {
  fail("cafe should be restaurant");
}
if (resolveOperatingNiche(facts("مخبز المشهداوي", "bakery", "خبز طازج هاليوم")) !== "restaurant") {
  fail("bakery should be restaurant (food niche)");
}
if (resolveOperatingNiche(facts("מספרת נור", "salon", "תספורת וצבע בבאקה")) !== "beauty_salon") {
  fail("hair salon should be beauty_salon");
}
if (resolveOperatingNiche(facts("حلاق البلد", "barber", "قص شعر وذقن")) !== "beauty_salon") {
  fail("barber should be beauty_salon");
}
if (resolveOperatingNiche(facts("سوبر ماركت الكرامة", "GroceryStore", "بيض حليب أجبان")) !== "local_retail") {
  fail("grocery must be local_retail charter niche");
}
if (resolveOperatingNiche(facts("بوتيك الرمل", "fashion boutique", "ملابس وأحذية")) !== "local_retail") {
  fail("fashion boutique should be local_retail");
}
if (resolveOperatingNiche(facts("חנות חשמל הגליל", "appliances", "מכשירי חשמל וכלי בית")) !== "local_retail") {
  fail("appliances store should be local_retail");
}
if (resolveOperatingNiche(facts("משרד תיווך הגבעה", "real estate", "דירות למכירה ולהשכרה בבאקה")) !== "real_estate") {
  fail("broker should be real_estate");
}
if (resolveOperatingNiche(facts("مكتب عقاري النور", "realtor", "شقق للبيع والإيجار")) !== "real_estate") {
  fail("Arabic realtor should be real_estate");
}
if (resolveOperatingNiche(facts("מרכז למידה הדר", "tutoring", "שיעורי עזר לבגרות")) !== "unsupported") {
  fail("tutoring is outside the five niches");
}
if (resolveOperatingNiche(facts("שיפוצי הבית", "קבלן שיפוצים", "שיפוץ דירות, אינסטלציה וחשמל")) !== "unsupported") {
  fail("renovation contractor is outside the five niches");
}
if (resolveOperatingNiche(facts("ستوديو قوة", "pilates studio", "פילאטיס ומאמן אישי בשכונה")) !== "unsupported") {
  fail("pilates studio is outside the five niches");
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
if (!sand || resolveOperatingNiche(sand) !== "local_retail" || !charterAllowsCampaign(sand)) {
  fail("sand boutique (fashion retail) must be allowed as local_retail");
}

const blank = emptyIntake();
if (!charterAllowsCampaign(blank)) fail("empty intake must not block the scan step");

const groceryFacts = factsToIntake({
  facts: { businessName: "سوبر ماركت الكرامة", category: "GroceryStore", description: "بيض حليب أجبان" },
});
if (!charterAllowsCampaign(groceryFacts)) fail("generate facts for grocery must be allowed");

const clinicFacts = factsToIntake({
  facts: { businessName: "عيادة أسنان النور", category: "dental clinic", description: "טיפולי שיניים" },
});
if (!charterAllowsCampaign(clinicFacts)) fail("generate facts for dental clinic must be allowed");

const tutorFacts = factsToIntake({
  facts: { businessName: "מרכז למידה הדר", category: "tutoring", description: "שיעורי עזר" },
});
if (charterAllowsCampaign(tutorFacts)) fail("tutoring generate facts must be niche-gated");

if (failures.length) {
  console.error("FAIL\n" + failures.join("\n"));
  process.exit(1);
}
console.log("PASS operating-niche", {
  dental: resolveOperatingNiche(facts("מרפאת שיניים נווה", "dental clinic", "")),
  grocery: resolveOperatingNiche(facts("سوبر ماركت الكرامة", "GroceryStore", "بيض")),
  salon: resolveOperatingNiche(facts("מספרת נור", "salon", "תספורת")),
  realtor: resolveOperatingNiche(facts("مكتب عقاري النور", "realtor", "شقق للبيع")),
});
