/**
 * Pedi-Guide product copy: spoken H1/body must use extracted
 * biggestProblem + uniqueAdvantage, never clinic locked lines.
 */
import { emptyIntake } from "../lib/engine/validate";
import { generateVariants } from "../lib/engine/copy";
import { produceAd } from "../lib/engine/produce-ad";
import { landingH1 } from "../lib/engine/spoken";
import { detectVertical, isPediatrics } from "../lib/vertical";
import { channelFields } from "../lib/channel-copy";
import { assemblePack } from "../lib/engine/run";
import { validateIntake } from "../lib/engine/validate";
import { diagnose } from "../lib/engine/diagnose";
import { generateMedia } from "../lib/engine/media";
import { generateOptimizer } from "../lib/engine/optimizer";
import { generateStrategy } from "../lib/engine/strategy";
import type { CampaignPack, Intake } from "../lib/types";

const failures: string[] = [];
function fail(msg: string) {
  failures.push(msg);
}

const intake: Intake = {
  ...emptyIntake(),
  type: "product",
  operatingModel: "paid",
  businessName: "pedi-guide",
  category: "MedicalOrganization",
  description:
    "AI-powered pediatric health platform with 21 smart tools for child health. Content by Dr. Samer Abu Mukh, pediatrician. An AI doctor and verified medical information.",
  website: "https://www.pedi-guide.com",
  audience: "parents",
  audienceCustom: false,
  biggestProblem: "ילד עם חום ב־3 בלילה ולא בטוחים מה לעשות?",
  problemCustom: true,
  uniqueAdvantage:
    "רופא AI, מחשבון אקמול וכלים בדוקים להורים. בעברית. לא מחליף רופא — עוזר להבין מתי לפנות עכשיו.",
  advantageCustom: true,
  mainGoal: "installs",
  offer: "no_offer",
  channelNotes: "facebook+instagram",
};

if (detectVertical(intake) !== "product") fail(`vertical=${detectVertical(intake)}, want product`);
if (isPediatrics(intake)) fail("isPediatrics should be false");

const variants = generateVariants(intake);
const he = variants.filter((v) => v.locale === "he");
const strong = he.find((v) => v.kind === "strong_offer");
if (!strong) fail("missing HE strong_offer");

const h1 = landingH1(intake, "he");
const spokenBlob = he.map((v) => `${v.headline}\n${v.primaryText}\n${v.cta}`).join("\n");
const painHit = /חום|3 בלילה|לא בטוחים/.test(`${h1}\n${spokenBlob}`);
if (!painHit) {
  fail(`H1/body missing fever/uncertainty. H1=${JSON.stringify(h1)} strong=${JSON.stringify(strong)}`);
}
if (/הילד חולה/.test(spokenBlob) || /הילד חולה/.test(h1)) fail("clinic leak הילד חולה in spoken copy");
if (/כללית/.test(spokenBlob) || /כללית/.test(h1)) fail("clinic leak כללית in spoken copy");
if (/^[Pp]edi-guide$/.test((strong?.headline ?? "").trim())) {
  fail(`strong_offer H1 is brand name alone: ${strong?.headline}`);
}
if (!/רופא AI|אקמול|כלים/.test(strong?.primaryText ?? "")) {
  fail(`strong_offer body missing uniqueAdvantage: ${strong?.primaryText}`);
}
if (/אין מבצע/.test(strong?.primaryText ?? "") && !/רופא AI|אקמול|כלים/.test(strong?.primaryText ?? "")) {
  fail("אין מבצע replaced the advantage");
}

const ad = produceAd(intake, "lifestyle", "", "he");
const adBlob = `${ad.headline}\n${ad.body}`;
if (!/חום|3 בלילה|לא בטוחים/.test(adBlob)) {
  fail(`produceAd missing pain. headline=${ad.headline} body=${ad.body}`);
}
if (!/רופא AI|אקמול|כלים/.test(ad.body)) fail(`produceAd body missing advantage: ${ad.body}`);
if (/הילד חולה|כללית/.test(adBlob)) fail(`produceAd clinic leak: ${adBlob}`);
if (/VIP|ROAS|4\.9|₪/.test(adBlob)) fail(`produceAd invented claim: ${adBlob}`);

const report = validateIntake(intake);
const diagnosis = diagnose(intake, report);
const media = generateMedia(intake);
const optimizer = generateOptimizer(intake, media);
const strategy = generateStrategy(intake, diagnosis);
const pack: CampaignPack = assemblePack(intake, {
  report,
  diagnosis,
  variants,
  strategy,
  media,
  optimizer,
  agentStatus: {
    intake: "complete",
    diagnostic: "approved",
    strategic: "approved",
    media: "approved",
    optimizer: "complete",
  },
  id: "e3e112bd-d36a-4a10-8b5f-fccf4edfd83d",
});
const fields = channelFields(pack, "he");
if (!/חום|3 בלילה|לא בטוחים/.test(`${fields.headline}\n${fields.body}`)) {
  fail(`channelFields missing pain. H=${fields.headline} B=${fields.body}`);
}
if (/הילד חולה|כללית/.test(`${fields.headline}\n${fields.body}`)) {
  fail("channelFields clinic leak");
}

if (failures.length) {
  console.error("FAIL\n" + failures.join("\n"));
  process.exit(1);
}
console.log("PASS pedi-copy");
console.log("H1:", h1);
console.log("strong headline:", strong?.headline);
console.log("strong body:", strong?.primaryText);
console.log("produceAd headline:", ad.headline);
console.log("produceAd body:", ad.body);
console.log("cta:", strong?.cta);
