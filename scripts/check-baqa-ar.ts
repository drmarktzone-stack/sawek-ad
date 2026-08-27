import { demoIntake } from "../lib/demo";
import { generateVariants } from "../lib/engine/copy";
import { validateIntake } from "../lib/engine/validate";
import { diagnose } from "../lib/engine/diagnose";
import { generateMedia } from "../lib/engine/media";
import { generateOptimizer } from "../lib/engine/optimizer";
import { generateStrategy } from "../lib/engine/strategy";
import { buildAgency } from "../lib/engine/agency";
import { assertPublishableArabic } from "../lib/engine/spoken";
import { copy } from "../lib/i18n";

const intake = demoIntake("ar");
const variants = generateVariants(intake);
const arAds = variants.filter((v) => v.locale === "ar");
const report = validateIntake(intake);
const diagnosis = diagnose(intake, report);
const media = generateMedia(intake);
const optimizer = generateOptimizer(intake, media);
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
  failures.push(...assertPublishableArabic(`${ad.headline}\n${ad.primaryText}`).map((x) => `${ad.kind}: ${x}`));
}
if (landing.body.includes("لا يعرفون النشاط")) failures.push("landing H1 leaked internal label");
if (!/^H1: /.test(landing.body)) failures.push("landing missing H1");
if (landing.body.split("\n")[0].includes(intake.audience)) failures.push("landing H1 stuffed audience");
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

console.log("score", report.completeness);
console.log("headlines:");
for (const ad of arAds) console.log(" -", ad.kind, "→", ad.headline);
console.log("landing H1:", landing.body.split("\n")[0]);
console.log("whatsapp:", wa.body);
console.log("rsa:\n", rsa.body);
if (failures.length) {
  console.error("FAIL\n" + failures.join("\n"));
  process.exit(1);
}
console.log("PASS");
