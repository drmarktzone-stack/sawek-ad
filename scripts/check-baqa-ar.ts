import { demoIntake, relocalizePediatricIntake, DEMO_LABEL } from "../lib/demo";
import { generateVariants } from "../lib/engine/copy";
import { validateIntake } from "../lib/engine/validate";
import { diagnose } from "../lib/engine/diagnose";
import { generateMedia } from "../lib/engine/media";
import { generateOptimizer } from "../lib/engine/optimizer";
import { generateStrategy } from "../lib/engine/strategy";
import { buildAgency } from "../lib/engine/agency";
import { assertPublishableArabic, LOCKED_AR_H1 } from "../lib/engine/spoken";
import { copy } from "../lib/i18n";
import type { Intake } from "../lib/types";

const CLALIT_MEMBERS = "طبيب أطفال كلاليت قريب";
const LOCKED_NAME = "عيادة أطفال د. سامر أبو مخ";

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
  JSON.stringify(agency),
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
  failures.push(...assertPublishableArabic(`${ad.headline}\n${ad.primaryText}\n${ad.cta}`).map((x) => `${ad.kind}: ${x}`));
}
if (landing.body.includes("لا يعرفون النشاط")) failures.push("landing H1 leaked internal label");
if (!/^H1: /.test(landing.body)) failures.push("landing missing H1");
if (landing.body.split("\n")[0].includes(intake.audience)) failures.push("landing H1 stuffed audience");
if (landing.body.split("\n")[0] !== `H1: ${LOCKED_AR_H1}`) {
  failures.push(`landing H1 should be «${LOCKED_AR_H1}», got ${landing.body.split("\n")[0]}`);
}
if (wa.body.includes("متى يناسب الموعد")) failures.push("WhatsApp asked for an appointment");
if (!/جت أولاً/.test(wa.body)) failures.push("WhatsApp missing walk-in");
if (!wa.body.includes(LOCKED_AR_H1)) failures.push("WhatsApp missing locked H1");
if (!rsa.body.includes(`H1: ${LOCKED_AR_H1}`)) failures.push("RSA missing locked H1");
if (!/15 أيلول 2026/.test(blob)) failures.push("kupa file-by date missing from Arabic output");
if (!/1 تشرين الثاني 2026/.test(blob)) failures.push("kupa membership date missing from Arabic output");
if (!/طوارئ|الطوارئ/.test(wa.body)) failures.push("WhatsApp missing ER disclaimer");
if (copy["brand.scripts"].ar.includes("סאווק")) failures.push("Arabic chrome still has Hebrew סאווק");
if (copy["footer.line"].ar.includes("סאווק")) failures.push("Arabic footer still has Hebrew סאווק");

if (intake.operatingModel !== "free_service") failures.push(`demo operatingModel should be free_service, got ${intake.operatingModel}`);
if (intake.businessName !== LOCKED_NAME) failures.push(`demo name should be ${LOCKED_NAME}, got ${intake.businessName}`);
if (intake.businessName.includes("أبو موخ")) failures.push(`demo name still has أبو موخ: ${intake.businessName}`);
if (!intake.businessName.includes("أبو مخ")) failures.push(`demo name missing أبو مخ: ${intake.businessName}`);
if (!DEMO_LABEL.ar.includes("أبو مخ")) failures.push("DEMO_LABEL missing أبو مخ");
if (DEMO_LABEL.ar.includes("أبو موخ")) failures.push("DEMO_LABEL still has أبو موخ");
if (copy["med.demo"].ar.includes("أبو موخ")) failures.push("i18n med.demo still has أبو موخ");

const oldSpelling: Intake = { ...intake, businessName: "عيادة أطفال د. سامر أبو موخ" };
const rewritten = relocalizePediatricIntake(oldSpelling, "ar");
if (!rewritten.businessName.includes("أبو مخ")) failures.push(`موخ not rewritten to مخ: ${rewritten.businessName}`);
if (rewritten.businessName.includes("أبو موخ")) failures.push(`موخ survived relocalize: ${rewritten.businessName}`);
const rewrittenAds = generateVariants(oldSpelling).filter((v) => v.locale === "ar");
for (const ad of rewrittenAds) {
  if (`${ad.headline}\n${ad.primaryText}`.includes("أبو موخ")) {
    failures.push(`generated copy still has أبو موخ in ${ad.kind}`);
  }
}

const emotional = arAds.find((a) => a.kind === "emotional")!;
if (emotional.headline !== LOCKED_AR_H1) {
  failures.push(`emotional H1 should be «${LOCKED_AR_H1}», got ${emotional.headline}`);
}
const narrative = arAds.find((a) => a.kind === "narrative")!;
if (narrative.headline !== LOCKED_AR_H1) {
  failures.push(`narrative H1 should be «${LOCKED_AR_H1}», got ${narrative.headline}`);
}
const strong = arAds.find((a) => a.kind === "strong_offer")!;
if (strong.headline !== LOCKED_AR_H1) {
  failures.push(`strong_offer H1 should be «${LOCKED_AR_H1}», got ${strong.headline}`);
}
if (!strong.primaryText.includes(CLALIT_MEMBERS)) {
  failures.push("default Clalit-members strong-offer who-line missing");
}
if (blob.includes("مرضان")) failures.push("Arabic output still contains مرضان");
if (blob.includes("جتوا على")) failures.push("Arabic output still contains جتوا على");
if (!blob.includes(LOCKED_AR_H1)) failures.push("locked H1 missing from Arabic output");

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

if (/اشتروا الآن|קנו עכשיו|buy now|checkout/i.test(blob)) failures.push("buy-now leaked into free-service output");
if (!JSON.stringify(optimizer.killRules).includes("ROAS/Purchase")) {
  failures.push("free-service optimizer missing no-ROAS/Purchase kill rule");
}
if (!/Reach \/ traffic|חשיפה \/ תנועה|تعرّض \/ زيارات/.test(JSON.stringify(media.split[0].role))) {
  failures.push("free-service media mix is not awareness/reach");
}
const arCtas = arAds.map((a) => a.cta).join(" ");
if (!/جيبوه عالعيادة|واتساب/.test(arCtas)) failures.push(`free-service Arabic CTAs missing visit/whatsapp: ${arCtas}`);
if (/شراء|اشتروا/.test(arCtas)) failures.push(`free-service Arabic CTA still sells: ${arCtas}`);
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
