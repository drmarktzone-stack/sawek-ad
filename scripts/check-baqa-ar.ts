import { demoIntake, relocalizePediatricIntake, DEMO_LABEL } from "../lib/demo";
import { generateVariants } from "../lib/engine/copy";
import { validateIntake } from "../lib/engine/validate";
import { diagnose } from "../lib/engine/diagnose";
import { generateMedia } from "../lib/engine/media";
import { generateOptimizer } from "../lib/engine/optimizer";
import { generateStrategy } from "../lib/engine/strategy";
import { buildAgency } from "../lib/engine/agency";
import { assertPublishableArabic } from "../lib/engine/spoken";
import { copy } from "../lib/i18n";
import type { Intake } from "../lib/types";

const CLALIT_MEMBERS = "طبيب أطفال كلاليت قريب";
const SPOKEN_H1 = "دكتور أطفال بباقة — جت أولاً";

const intake = demoIntake("ar");
const variants = generateVariants(intake);
const arAds = variants.filter((v) => v.locale === "ar");
const report = validateIntake(intake);
const diagnosis = diagnose(intake, report);
const media = generateMedia(intake);
const optimizer = generateOptimizer(intake, media);
const strategy = generateStrategy(intake, diagnosis);
const agency = buildAgency({
  intake,
  intakeReport: report,
  diagnosis,
  media,
  optimizer,
  variants,
});
const landing = agency.creative.pieces.find((p) => p.format === "landing" && p.locale === "ar")!;
const wa = agency.creative.pieces.find((p) => p.format === "whatsapp" && p.locale === "ar")!;
const rsa = agency.creative.pieces.find((p) => p.format === "rsa" && p.locale === "ar")!;
const blob = [
  ...arAds.map((a) => `${a.headline}\n${a.primaryText}\n${a.cta}`),
  landing.body,
  wa.body,
  rsa.body,
].join("\n");

const failures: string[] = [];
for (const ad of arAds) {
  if (ad.headline.includes(intake.audience)) failures.push(`headline stuffed ICP: ${ad.kind}: ${ad.headline}`);
  if (ad.headline.length > 48) failures.push(`headline too long: ${ad.kind}: ${ad.headline}`);
  if (/وساعات م$|مبني حول|يتوقف فيها|يؤجّلون/.test(ad.headline + ad.primaryText)) {
    failures.push(`MSA/truncation in ${ad.kind}`);
  }
  if (ad.headline.includes("كلاليت أطفال،")) {
    failures.push(`headline leaked Clalit+address: ${ad.kind}: ${ad.headline}`);
  }
  failures.push(...assertPublishableArabic(`${ad.headline}\n${ad.primaryText}`).map((x) => `${ad.kind}: ${x}`));
}
if (landing.body.includes("لا يعرفون النشاط")) failures.push("landing H1 leaked internal label");
if (!/^H1: /.test(landing.body)) failures.push("landing missing H1");
if (landing.body.split("\n")[0].includes(intake.audience)) failures.push("landing H1 stuffed audience");
if (landing.body.split("\n")[0] !== `H1: ${SPOKEN_H1}`) {
  failures.push(`landing H1 should stay «${SPOKEN_H1}», got ${landing.body.split("\n")[0]}`);
}
if (wa.body.includes("متى يناسب الموعد")) failures.push("WhatsApp asked for an appointment");
if (!/جت أولاً/.test(wa.body)) failures.push("WhatsApp missing walk-in");
if (!/15 أيلول 2026/.test(blob)) failures.push("kupa file-by date missing from Arabic output");
if (!/1 تشرين الثاني 2026/.test(blob)) failures.push("kupa membership date missing from Arabic output");
if (!/طوارئ|الطوارئ/.test(wa.body)) failures.push("WhatsApp missing ER disclaimer");
if (copy["brand.scripts"].ar.includes("סאווק")) failures.push("Arabic chrome still has Hebrew סאווק");
if (copy["footer.line"].ar.includes("סאווק")) failures.push("Arabic footer still has Hebrew סאווק");
if (intake.offer !== "لا يوجد عرض" && intake.offer !== "no_offer") {
  /* demoOffer is no_offer id, resolved later */
}

if (!intake.businessName.includes("أبو موخ")) failures.push(`demo name missing أبو موخ: ${intake.businessName}`);
if (intake.businessName.includes("أبو مخ")) failures.push(`demo name still has أبو مخ: ${intake.businessName}`);
if (!DEMO_LABEL.ar.includes("أبو موخ")) failures.push("DEMO_LABEL missing أبو موخ");
if (DEMO_LABEL.ar.includes("أبو مخ")) failures.push("DEMO_LABEL has أبو مخ");

const typo: Intake = { ...intake, businessName: "عيادة أطفال د. سامر أبو مخ" };
const rewritten = relocalizePediatricIntake(typo, "ar");
if (!rewritten.businessName.includes("أبو موخ")) failures.push(`typo not rewritten: ${rewritten.businessName}`);
if (rewritten.businessName.includes("أبو مخ")) failures.push(`typo survived relocalize: ${rewritten.businessName}`);
const typoAds = generateVariants(typo).filter((v) => v.locale === "ar");
for (const ad of typoAds) {
  if (`${ad.headline}\n${ad.primaryText}`.includes("أبو مخ")) {
    failures.push(`generated copy still has أبو مخ in ${ad.kind}`);
  }
}

const narrative = arAds.find((a) => a.kind === "narrative")!;
if (narrative.headline !== SPOKEN_H1) {
  failures.push(`narrative H1 should be «${SPOKEN_H1}», got ${narrative.headline}`);
}
const strong = arAds.find((a) => a.kind === "strong_offer")!;
if (strong.headline !== SPOKEN_H1) {
  failures.push(`strong_offer H1 should be «${SPOKEN_H1}», got ${strong.headline}`);
}
if (!strong.primaryText.includes(CLALIT_MEMBERS)) {
  failures.push("default Clalit-members strong-offer who-line missing");
}

const leftover = "لأهل باقة اللي بدهم طبيب أطفال كلاليت قريب";
for (const [id, needle] of [
  ["maccabi", "مكابي"],
  ["meuhedet", "مئوحيدت"],
  ["leumit", "لئوميت"],
] as const) {
  const other: Intake = { ...intake, audience: id, audienceCustom: false };
  const ad = generateVariants(other).find((v) => v.locale === "ar" && v.kind === "strong_offer")!;
  if (ad.primaryText.includes(leftover) || ad.primaryText.includes(CLALIT_MEMBERS)) {
    failures.push(`${id}: strong-offer still uses Clalit-members leftover`);
  }
  if (!ad.primaryText.includes(needle)) failures.push(`${id}: strong-offer missing ${needle}`);
  if (!ad.primaryText.includes("ينقلوا لكلاليت")) failures.push(`${id}: strong-offer missing switch-to-Clalit framing`);
}

const typed: Intake = { ...intake, audience: "مكابي", audienceCustom: true };
const typedAd = generateVariants(typed).find((v) => v.locale === "ar" && v.kind === "strong_offer")!;
if (typedAd.primaryText.includes(CLALIT_MEMBERS)) {
  failures.push("typed مكابي: strong-offer still uses Clalit-members leftover");
}

if (blob.includes("كوبوت")) failures.push("Arabic ads still contain كوبوت");
if (copy["details.kupaFile"].ar.includes("كوبوت")) failures.push("i18n kupaFile still has كوبوت");
if (copy["details.kupaMember"].ar.includes("كوبوت")) failures.push("i18n kupaMember still has كوبوت");
if (JSON.stringify(strategy).includes("كوبوت")) failures.push("strategy still contains كوبوت");
if (!/نقل الصندوق/.test(blob)) failures.push("Arabic output missing نقل الصندوق");

console.log("score", report.completeness);
console.log("demo name:", intake.businessName);
console.log("headlines:");
for (const ad of arAds) console.log(" -", ad.kind, "→", ad.headline);
console.log("landing H1:", landing.body.split("\n")[0]);
console.log("strong who:", strong.primaryText.split("\n\n")[1]);
console.log("maccabi who:", typedAd.primaryText.split("\n\n")[1]);
console.log("whatsapp:", wa.body);
console.log("rsa:\n", rsa.body);
if (failures.length) {
  console.error("FAIL\n" + failures.join("\n"));
  process.exit(1);
}
console.log("PASS");
