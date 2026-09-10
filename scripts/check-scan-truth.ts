/**
 * Prompt 5.2 — Scan Truth isolation. Classification architecture, not brand ifs.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { parseFetchedHtml } from "../lib/url-ingest";
import { applyIngestReview, rowsFromExtracted } from "../lib/document-ingest";
import { emptyIntake, validateIntake } from "../lib/engine/validate";
import { assemblePack } from "../lib/engine/run";
import { diagnose } from "../lib/engine/diagnose";
import { generateVariants } from "../lib/engine/copy";
import { resetCreativeMemory, attachCompleteAd } from "../lib/engine/ad-engine";
import { buildBusinessTruth } from "../lib/engine/ad-engine/sources";
import {
  classifyUnits,
  extractContentUnits,
  buildBusinessIdentity,
  runScanTruthPipeline,
  isEcommerceChromeText,
  isPainStatement,
  isMerchUpsellText,
  extractPostalAddressFromText,
} from "../lib/scan-truth";
import type { IngestedDocument } from "../lib/types";

const failures: string[] = [];
function fail(m: string) {
  failures.push(m);
}

function fixture(name: string): string {
  return readFileSync(join(__dirname, "fixtures", name), "utf8");
}

function urlDoc(id: string, name: string): IngestedDocument {
  return {
    id,
    name,
    mime: "text/html",
    size: 1,
    kind: "url",
    tags: ["identity"],
    excerpt: "",
    createdAt: new Date().toISOString(),
  };
}

function srcHasBrandIfs(): boolean {
  const files = ["page.ts", "patterns.ts", "govern.ts", "pipeline.ts"];
  for (const f of files) {
    const s = readFileSync(join(__dirname, "../lib/scan-truth", f), "utf8");
    if (/\blevain\b|\bmass\s*general\b|\btote\b/i.test(s)) return true;
  }
  return false;
}

if (srcHasBrandIfs()) fail("scan-truth sources must not contain brand-specific tote/Levain/Mass General ifs");

if (!isEcommerceChromeText("Unlock Free Shipping on 8pks")) fail("shipping unlock not chrome");
if (!isMerchUpsellText("Add a Canvas Tote for the perfect finishing touch?")) fail("merch upsell not detected");
if (isPainStatement("Add a Canvas Tote for the perfect finishing touch?")) fail("merch upsell classified as pain");
if (isPainStatement("Have an account?")) fail("account question classified as pain");
if (!isPainStatement("ילד עם חום ב־3 בלילה ולא בטוחים מה לעשות?")) fail("pediatric uncertainty not pain");

const levainHtml = fixture("url-ingest-bakery-chrome.html");
const levain = parseFetchedHtml(levainHtml, "https://www.levainbakery.com/", "https://www.levainbakery.com/");
if (!levain.ok) fail(`levain fixture parse ${levain.error}`);
else {
  const f = levain.fields;
  const blob = JSON.stringify(f).toLowerCase();
  if (/free shipping|unlock free/.test(blob)) fail(`Levain Truth has shipping: ${JSON.stringify(f)}`);
  if (/tote|have an account/.test(blob)) fail(`Levain Truth has tote/account: ${JSON.stringify(f)}`);
  if (/\bparents?\b|\bwomen\b/.test(String(f.audience || ""))) fail(`Levain audience ${JSON.stringify(f.audience)}`);
  if (!/levain/i.test(String(f.businessName || ""))) fail(`Levain name missing ${JSON.stringify(f.businessName)}`);
  if (!/74th|167/.test(String(f.location || ""))) fail(`Levain location ${JSON.stringify(f.location)}`);
}

const mgHtml = fixture("url-ingest-hospital-cafeteria.html");
const mg = parseFetchedHtml(mgHtml, "https://www.massgeneral.org/", "https://www.massgeneral.org/");
if (!mg.ok) fail(`hospital fixture parse ${mg.error}`);
else {
  const f = mg.fields;
  if (/restaurant/i.test(String(f.category || ""))) fail(`Mass General category restaurant ${JSON.stringify(f.category)}`);
  if (/\bwomen\b|\bparents?\b/i.test(String(f.audience || ""))) fail(`Mass General audience ${JSON.stringify(f.audience)}`);
  if (/cambridge street|gateway|podium/i.test(String(f.location || ""))) fail(`Mass General location chrome ${JSON.stringify(f.location)}`);
  if (/cafeteria/i.test(String(f.businessName || ""))) fail(`Mass General name cafeteria`);
  if (!/hospital/i.test(String(f.businessName || "") + String(f.category || ""))) {
    fail(`Mass General identity missing hospital ${JSON.stringify({ n: f.businessName, c: f.category })}`);
  }
}

const deptHtml = `<!DOCTYPE html><html><head>
<meta property="og:site_name" content="Regional Health System" />
<meta property="og:description" content="Obstetrics and Gynecology. Transforming care for women. Pediatric and infant services." />
<title>Obstetrics and Gynecology | Regional Health System</title>
</head><body>
<h1>Obstetrics and Gynecology</h1>
<p>As leaders in women’s health, we are transforming care for women both at home and around the world.</p>
<p>Pediatric follow-up and infant visits are available on campus.</p>
</body></html>`;
const dept = parseFetchedHtml(deptHtml, "https://health-system.example/obgyn", "https://health-system.example/obgyn");
if (!dept.ok) fail(`department parse ${dept.error}`);
else if (/\bwomen\b|\bparents?\b/i.test(String(dept.fields.audience || ""))) {
  fail(`department brochure leaked audience ${JSON.stringify(dept.fields.audience)}`);
}

const local = parseFetchedHtml(fixture("url-ingest-localbusiness.html"), "https://fiction.example/", "https://fiction.example/");
if (!local.ok) fail(`local parse ${local.error}`);
else {
  if (!/פיקציה גריל/.test(String(local.fields.businessName || ""))) fail("local name");
  if (String(local.fields.offer || "").trim()) fail(`local invented offer ${JSON.stringify(local.fields.offer)}`);
}

const ecom = parseFetchedHtml(fixture("url-ingest-store-sale.html"), "https://store-sale.example/", "https://store-sale.example/");
if (!ecom.ok) fail(`ecom parse ${ecom.error}`);
else if (!/חיסול|מבצע/.test(String(ecom.fields.offer || ""))) {
  fail(`ecom verified sale missing ${JSON.stringify(ecom.fields.offer)}`);
}

const service = parseFetchedHtml(fixture("url-ingest-drsamerped-clinic.html"), "https://clinic-fixture.example/", "https://clinic-fixture.example/");
if (!service.ok) fail(`service parse ${service.error}`);
else {
  if (!/052-?8885800/.test(String(service.fields.whatsapp || ""))) fail("service phone");
  if (/have an account|free shipping/i.test(JSON.stringify(service.fields))) fail("service chrome leak");
}

const advUrl = "https://north-harbor-lamps.example/";
const adv = parseFetchedHtml(fixture("url-ingest-adversarial-chrome.html"), advUrl, advUrl);
if (!adv.ok) fail(`adversarial parse ${adv.error}`);
else {
  const f = adv.fields;
  const blob = JSON.stringify(f).toLowerCase();
  if (/free shipping|50%\s*off|limited time|best results|customer review|tote|\bwomen\b/.test(blob)) {
    fail(`adversarial chrome entered Truth ${JSON.stringify(f)}`);
  }
  if (!/north harbor/i.test(String(f.businessName || ""))) fail(`adversarial name ${JSON.stringify(f.businessName)}`);
  if (!/herzl/i.test(String(f.location || ""))) fail(`adversarial location ${JSON.stringify(f.location)}`);
}

const units = extractContentUnits(fixture("url-ingest-adversarial-chrome.html"), advUrl);
const identity = buildBusinessIdentity(units, advUrl, "North Harbor Lamps");
const classified = classifyUnits(units, identity, advUrl);
if (!classified.some((u) => u.contentClass === "NAV_UI" && /free shipping/i.test(u.text))) {
  fail("nav Free Shipping not classified NAV_UI/chrome");
}
if (!classified.some((u) => u.contentClass === "BLOG_EDITORIAL" || /best results/i.test(u.text) && u.contentClass !== "BUSINESS_FACTS")) {
  fail("blog Best Results treated as business fact");
}
if (classified.some((u) => u.contentClass === "BUSINESS_FACTS" && isEcommerceChromeText(u.text))) {
  fail("ecommerce chrome unit classified BUSINESS_FACTS");
}

const pipe = runScanTruthPipeline({
  html: fixture("url-ingest-bakery-chrome.html"),
  pageUrl: "https://www.levainbakery.com/",
});
if (pipe.fields.offer) fail(`pipeline levain offer ${JSON.stringify(pipe.fields.offer)}`);
if (/\btote\b/i.test(String(pipe.fields.biggestProblem || ""))) fail("pipeline tote problem");
{
  const blob = JSON.stringify(pipe.fields).toLowerCase();
  if (/free shipping|unlock free|tote|have an account/.test(blob)) {
    fail(`pipeline Truth still has chrome: ${blob.slice(0, 240)}`);
  }
}

if (levain.ok && local.ok) {
  const fromLocal = applyIngestReview(
    applyIngestReview(emptyIntake(), rowsFromExtracted(local.fields, false), urlDoc("a", "https://fiction.example/"), []),
    rowsFromExtracted(levain.fields, false),
    urlDoc("b", "https://www.levainbakery.com/"),
    [],
  );
  if (/פיקציה גריל/.test(fromLocal.businessName)) fail("cross-business kept grill name");
  if (/04-?1234567/.test(fromLocal.whatsapp)) fail("cross-business kept grill phone");
}

if (levain.ok) {
  resetCreativeMemory();
  const applied = applyIngestReview(emptyIntake(), rowsFromExtracted(levain.fields, false), urlDoc("levain-ad", "https://www.levainbakery.com/"), []);
  const report = validateIntake(applied);
  const pack = assemblePack(applied, {
    report,
    diagnosis: diagnose(applied, report),
    variants: generateVariants(applied),
    agentStatus: {
      intake: "complete",
      diagnostic: "complete",
      strategic: "complete",
      media: "complete",
      optimizer: "complete",
    },
  });
  const complete = attachCompleteAd(pack);
  const adBlob = JSON.stringify(complete.completeAd || {}).toLowerCase();
  if (/free shipping|unlock free|\btote\b|have an account/.test(adBlob)) {
    fail(`complete ad used chrome ${adBlob.slice(0, 400)}`);
  }
  const truth = buildBusinessTruth(applied);
  if (/free shipping/i.test(truth.offer) || /tote/i.test(truth.problem)) fail("BusinessTruth still has chrome");
}

{
  const ogOnly =
    "מרפאת שיניים בחיפה בשדרות הנשיא 21, השתלות שיניים ואסתטיקה דנטלית בשירות איכותי ומקצועי. השאירו פרטים אצל ד\"ר אליאס הלון או התקשרו.";
  const extracted = extractPostalAddressFromText(ogOnly);
  if (!/שדרות הנשיא\s*21/.test(extracted) || !/חיפה/.test(extracted) || /השתלות שיניים ואסתטיקה/.test(extracted)) {
    fail(`OG street must keep Haifa and drop marketing (got ${JSON.stringify(extracted)})`);
  }
}

if (failures.length) {
  console.error("FAIL scan-truth\n" + failures.join("\n"));
  process.exit(1);
}
console.log("PASS scan-truth", {
  levainOffer: levain.ok ? levain.fields.offer || "" : "parse-fail",
  levainProblem: levain.ok ? levain.fields.biggestProblem || "" : "parse-fail",
  mgAudience: mg.ok ? mg.fields.audience || "" : "parse-fail",
  mgCategory: mg.ok ? mg.fields.category || "" : "parse-fail",
});
