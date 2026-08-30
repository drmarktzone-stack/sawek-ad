import { DESIGN_STYLES, stylesForVertical } from "../lib/design-styles";
import { produceAd } from "../lib/engine/produce-ad";
import { emptyIntake } from "../lib/engine/validate";
import { detectVertical } from "../lib/vertical";
import { demoIntake } from "../lib/demo";
import { hooksFor, layoutsFor, LAYOUT_THUMBS } from "../lib/creative-bank";
import type { Intake } from "../lib/types";

const failures: string[] = [];
function fail(m: string) {
  failures.push(m);
}

if (DESIGN_STYLES.length < 30) fail(`style count ${DESIGN_STYLES.length} < 30`);
const ids = DESIGN_STYLES.map((s) => s.id);
for (const keep of [
  "lifestyle",
  "soft-organic",
  "social-proof",
  "pastel",
  "sketch",
  "modern-flat",
  "editorial-dark",
  "bold-type",
  "cinematic",
  "minimal-light",
  "street",
  "warm-doc",
]) {
  if (!ids.includes(keep)) fail(`missing back-compat id ${keep}`);
}

const retailFacts = { businessName: "עיר המותגים", category: "אופנה", description: "חנות מותגים" };
if (detectVertical(retailFacts) !== "retail") fail(`detectVertical retail got ${detectVertical(retailFacts)}`);

const retailStyles = stylesForVertical("retail");
if (!retailStyles.some((s) => s.id === "luxe-black-gold")) fail("retail missing luxe-black-gold");
if (retailStyles.some((s) => s.verticals.length === 1 && s.verticals[0] === "clinic")) {
  fail("clinic-only style leaked into retail");
}
const allYellow = retailStyles.every((s) => s.palette.some((c) => /#ffe500/i.test(c)));
if (allYellow) fail("stylesForVertical(retail) palettes are all #ffe500");

const clinicStyles = stylesForVertical("clinic");
if (!clinicStyles.some((s) => s.id === "calm-teal-cream" || s.id === "trust-navy-white")) {
  fail("clinic missing calm teal / trust navy");
}

const demo = demoIntake("he");
if (detectVertical(demo) !== "clinic") fail(`demo not clinic (${detectVertical(demo)})`);

const store: Intake = {
  ...emptyIntake(),
  businessName: "עיר המותגים",
  category: "אופנה",
  description: "חנות מותגים ושופינג",
  audience: "women",
  biggestProblem: "מחפשים מותגים במקום אחד",
  uniqueAdvantage: "קניון מותגים בבאקה",
  mainGoal: "leads",
  offer: "משלוח חינם מעל 500",
  website: "https://www.aam.co.il/",
};
if (detectVertical(store) !== "retail") fail(`store vertical ${detectVertical(store)}`);
const ad = produceAd(store, "luxe-black-gold", "", "he");
const blob = `${ad.headline}\n${ad.body}\n${ad.visualNotes.he}`;
if (/מרפאה|kupa|כללית|סדר הגעה|סאמר|أبو مخ|052-8885800|רופא ילדים/i.test(blob)) {
  fail(`retail produceAd clinic leak: ${blob}`);
}
if (/VIP|ROAS|4\.9/.test(blob)) fail(`retail produceAd invented claim: ${blob}`);

const hooks = hooksFor("retail", "he", store);
if (!hooks.length) fail("retail hooks empty");
if (hooks.some((h) => /VIP|ROAS|4\.9/.test(h))) fail("hooks invented ratings");
const noSale = layoutsFor("retail", "facebook", false);
if (noSale.some((l) => l.sale)) fail("sale layouts shown with no offer");
if (LAYOUT_THUMBS.length !== 6) fail(`LAYOUT_THUMBS ${LAYOUT_THUMBS.length} != 6`);

if (failures.length) {
  console.error("FAIL\n" + failures.join("\n"));
  process.exit(1);
}
const sample = retailStyles
  .filter((s) => !/#ffe500/i.test(s.palette.join(" ")))
  .slice(0, 4)
  .map((s) => `${s.id}:${s.palette.join("/")}`)
  .join(" | ");
console.log("PASS design styles", DESIGN_STYLES.length, "sample", sample);
