import { emptyIntake } from "../lib/engine/validate";
import { generateVariants } from "../lib/engine/copy";
import { assemblePack } from "../lib/engine/run";
import { validateIntake } from "../lib/engine/validate";
import { diagnose } from "../lib/engine/diagnose";
import { buildPostingCalendar } from "../lib/engine/posting-calendar";
import { detectVertical } from "../lib/vertical";
import { whatsappScript, spokenCta, contactNumber } from "../lib/engine/spoken";
import type { Intake } from "../lib/types";

const failures: string[] = [];
function fail(m: string) {
  failures.push(m);
}

/** Pizza Hut facts as returned by live ingest (downstream path). */
const pizza: Intake = {
  ...emptyIntake(),
  businessName: "פיצה האט ישראל",
  category: "פיצריה / משלוחים",
  description:
    "businessName: פיצה האט ישראל\nphone: 1-700-50-60-70\nwhatsapp: 1-700-50-60-70\nרשת הפיצריות — תפריט, מבצעים חמים ומשלוחים.",
  location: "יקום",
  website: "https://www.pizzahut.co.il",
  whatsapp: "1-700-50-60-70",
  offer: "מבצעים חמים מהאתר",
  audience: "",
  biggestProblem: "",
  uniqueAdvantage: "רשת הפיצריות — תפריט ומשלוחים",
  mainGoal: "",
};

if (detectVertical(pizza) !== "restaurant") fail(`vertical=${detectVertical(pizza)}`);
if (contactNumber(pizza) !== "1-700-50-60-70") fail(`contactNumber=${contactNumber(pizza)}`);

const variants = generateVariants(pizza);
const he = variants.filter((v) => v.locale === "he");
const blob = he.map((v) => `${v.headline}\n${v.primaryText}\n${v.cta}`).join("\n---\n");

if (!/פיצה|Pizza Hut|פיצה האט/i.test(blob)) fail("HE variants missing פיצה / Pizza Hut name");
if (/לא מכירים/.test(blob)) fail("HE still has לא מכירים");
if (/\[יש להשלים\]/.test(blob)) fail("HE still has [יש להשלים] despite phone+name");
if ((blob.match(/אין מבצע ואין קופון/g) || []).length > 1) fail("no-offer spam across cards");
if (/דברו איתנו/.test(he.map((v) => v.cta).join("\n"))) fail("weak CTA דברו איתנו");

const wa = whatsappScript(pizza, "he");
if (/\[יש להשלים\]/.test(wa)) fail(`whatsappScript has TO COMPLETE: ${wa}`);
if (!/1-700-50-60-70/.test(wa)) fail(`whatsappScript missing phone: ${wa}`);
if (!/פיצה האט/.test(wa)) fail(`whatsappScript missing name: ${wa}`);

const cta = spokenCta(pizza, "he");
if (cta === "דברו איתנו") fail(`CTA still weak: ${cta}`);

const pack = assemblePack(pizza, {
  report: validateIntake(pizza),
  diagnosis: diagnose(pizza, validateIntake(pizza)),
  variants,
  agentStatus: {
    intake: "complete",
    diagnostic: "complete",
    strategic: "complete",
    media: "complete",
    optimizer: "complete",
  },
});
const week = buildPostingCalendar(pack, "he");
if (week.length !== 30) fail(`calendar days ${week.length}`);
if (week[0].channel !== "facebook") fail("day 1 should stay facebook");
if (week[1].channel !== "instagram") fail("day 2 should stay instagram");
if (!week.some((d) => d.kind === "carousel")) fail("30-day calendar missing carousel days");
if (!week.some((d) => d.kind === "script")) fail("30-day calendar missing script days");
const weekBlob = week.map((d) => `D${d.day}: ${d.headline}\n${d.body}\n${d.cta}`).join("\n\n");
if (!/פיצה|Pizza Hut|פיצה האט/i.test(weekBlob)) fail("calendar missing פיצה / Pizza Hut");
if (/לא מכירים/.test(weekBlob)) fail("calendar has לא מכירים");
if (/\[יש להשלים\]|יש להשלים/.test(weekBlob)) fail("calendar has יש להשלים");

/** Phone only in description (whatsapp field empty) — still no TO COMPLETE. */
const phoneInDesc: Intake = {
  ...pizza,
  whatsapp: "",
  description: "phone: 1-700-50-60-70\nרשת הפיצריות פיצה האט",
};
const wa2 = whatsappScript(phoneInDesc, "he");
if (/\[יש להשלים\]/.test(wa2)) fail(`phone-in-desc still TO COMPLETE: ${wa2}`);
if (!/1-700-50-60-70/.test(wa2) && !/פיצה האט/.test(wa2)) {
  fail(`phone-in-desc lost contact/name: ${wa2}`);
}

if (failures.length) {
  console.error("FAIL\n" + failures.join("\n"));
  process.exit(1);
}

console.log("PASS pizza calendar");
console.log("sample day1:", week[0]);
console.log("sample day3:", week[2]);
console.log("sample day5:", week[4]);
console.log("CTA:", cta);
