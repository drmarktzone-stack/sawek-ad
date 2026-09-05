import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { inspectUrl, parseFetchedHtml, ingestUrl, collectSameOriginNavUrls, mergeExtractedFields, extractScriptBundleText } from "../lib/url-ingest";
import { detectSocialKind, facebookMbasicUrl, facebookPagePluginUrl, isSocialErrorTitle, isSocialLoginWall, parseOembedJson, parseSocialPage, socialHasPublicContent } from "../lib/social-page";
import { SOCIAL_LOGIN_WALL_COPY, socialLoginWallError } from "../lib/url-ingest";
import { buildPastCampaignAuditFromPosts } from "../lib/engine/past-campaign-audit";
import { extractCssColors, extractLogoUrl, emptyBrandKit } from "../lib/brand-kit";
import { buildSiteAudit } from "../lib/engine/site-audit";
import { buildPostingCalendar } from "../lib/engine/posting-calendar";
import { RESIZE_FORMATS } from "../lib/resize-formats";
import { assemblePack } from "../lib/engine/run";
import { applyIngestReview, rowsFromExtracted } from "../lib/document-ingest";
import { emptyIntake, wizardReady } from "../lib/engine/validate";
import { detectVertical, isPediatrics, showsHmoAudience } from "../lib/vertical";
import { AUDIENCE_CHIPS, audienceChipsFor, resolveChipLabel, toggleChipValue } from "../lib/chips";
import { demoIntake, isPediatricDemo } from "../lib/demo";
import type { IngestedDocument, MediaAssetMeta } from "../lib/types";

const failures: string[] = [];
function fail(msg: string) {
  failures.push(msg);
}

const fixturePath = join(__dirname, "fixtures/url-ingest-localbusiness.html");
const html = readFileSync(fixturePath, "utf8");
const submitted = "https://fiction.example/";
const parsed = parseFetchedHtml(html, submitted, submitted);

if (!parsed.ok) {
  fail(`fixture parse failed: ${parsed.error}`);
} else {
  const f = parsed.fields;
  if (!/פיקציה גריל/.test(String(f.businessName || ""))) {
    fail(`businessName missing פיקציה גריל (got ${JSON.stringify(f.businessName)})`);
  }
  if (!/04-?1234567/.test(String(f.whatsapp || ""))) {
    fail(`whatsapp/phone missing 04-1234567 (got ${JSON.stringify(f.whatsapp)})`);
  }
  if (!/הדקל|באקה/.test(String(f.location || ""))) {
    fail(`location missing address (got ${JSON.stringify(f.location)})`);
  }
  if (f.website !== submitted) {
    fail(`website should be submitted URL (got ${JSON.stringify(f.website)})`);
  }
  if (String(f.offer || "").trim()) fail(`invented offer=${JSON.stringify(f.offer)}`);
  if (/₪|49|4\.9|star|דירוג|rating/i.test(JSON.stringify(f))) {
    fail(`invented price/rating in fields: ${JSON.stringify(f)}`);
  }
  if (f.pastHeadline || f.pastBody || f.pastCta) {
    fail(`homepage treated as ad: ${JSON.stringify({ h: f.pastHeadline, b: f.pastBody, c: f.pastCta })}`);
  }
  if (parsed.ogImage !== "https://cdn.example.com/fiction-exterior.jpg") {
    fail(`ogImage missing (got ${JSON.stringify(parsed.ogImage)})`);
  }
  if (!parsed.jsonLdHits?.some((t) => /localbusiness/i.test(t))) {
    fail(`jsonLdHits missing LocalBusiness (got ${JSON.stringify(parsed.jsonLdHits)})`);
  }
}

function assertPediCommon(
  label: string,
  f: Partial<Record<string, string>>,
  appliedIntake: ReturnType<typeof applyIngestReview>,
) {
  if (!/pedi-guide/i.test(String(f.businessName || ""))) {
    fail(`${label} name missing (got ${JSON.stringify(f.businessName)})`);
  }
  if (!String(f.description || "").trim()) fail(`${label} description empty`);
  if (!/parent|הורים/i.test(String(f.audience || ""))) {
    fail(`${label} audience should mention parent/הורים (got ${JSON.stringify(f.audience)})`);
  }
  if (!String(f.mainGoal || "").trim()) fail(`${label} goal empty`);
  if (!/facebook/i.test(String(f.channelNotes || "")) || !/instagram/i.test(String(f.channelNotes || ""))) {
    fail(`${label} channels should include facebook and instagram (got ${JSON.stringify(f.channelNotes)})`);
  }
  if (String(f.whatsapp || "").trim()) fail(`${label} invented phone ${JSON.stringify(f.whatsapp)}`);
  if (String(f.location || "").trim()) fail(`${label} invented address ${JSON.stringify(f.location)}`);
  if (String(f.offer || "").trim()) fail(`${label} invented offer ${JSON.stringify(f.offer)}`);
  if (/₪|49|4\.9|star|דירוג|rating|VIP|ROAS/i.test(JSON.stringify(f))) {
    fail(`${label} invented price/rating/VIP/ROAS: ${JSON.stringify(f)}`);
  }
  const facts = {
    businessName: f.businessName || "",
    category: f.category || "",
    description: f.description || "",
  };
  const v = detectVertical(facts);
  if (v === "clinic") fail(`${label} detectVertical must NOT be clinic (got ${v})`);
  if (v !== "product") fail(`${label} detectVertical should be product (got ${v})`);
  if (isPediatrics(appliedIntake)) fail(`${label} isPediatrics should be false (not a physical clinic)`);
  if (showsHmoAudience(appliedIntake)) fail(`${label} showsHmoAudience should be false`);
  const chips = audienceChipsFor(appliedIntake);
  if (chips.some((c) => c.id === "clalit" || c.id === "maccabi" || c.id === "meuhedet")) {
    fail(`${label} still shows kupat-holim audience chips`);
  }
  if (!chips.some((c) => c.id === "parents")) fail(`${label} missing parents audience chip`);
  if (!wizardReady(appliedIntake)) {
    fail(
      `${label} should be wizardReady after HITL as-is; missing ${["businessName","description","audience","biggestProblem","uniqueAdvantage","mainGoal"].filter((k) => !String((appliedIntake as unknown as Record<string, string>)[k] || "").trim()).join(",")}`,
    );
  }
}

const pediHtml = readFileSync(join(__dirname, "fixtures/url-ingest-pedi-guide.html"), "utf8");
const pediUrl = "https://www.pedi-guide.com";
const pedi = parseFetchedHtml(pediHtml, pediUrl, pediUrl);
if (!pedi.ok) {
  fail(`pedi-guide parse failed: ${pedi.error}`);
} else {
  const f = pedi.fields;
  if (pediHtml.includes("unwell") || pediHtml.includes("מטריד")) {
    fail("live-shaped pedi fixture must not contain English unwell / מטריד");
  }
  if (!/<h1[^>]*>\s*Pedi-guide\s*<\/h1>/i.test(pediHtml)) {
    fail("live-shaped pedi fixture H1 should be Pedi-guide");
  }
  if (f.website !== pediUrl) fail(`pedi website should stay submitted URL (got ${JSON.stringify(f.website)})`);
  if (!/חום|לא בטוחים|מה לעשות/.test(String(f.biggestProblem || ""))) {
    fail(`pedi problem should come from og question / uncertainty (got ${JSON.stringify(f.biggestProblem)})`);
  }
  if (/^pedi-guide\??$/i.test(String(f.biggestProblem || "").trim())) {
    fail(`pedi H1 brand must not be the problem (got ${JSON.stringify(f.biggestProblem)})`);
  }
  if (!/רופא AI|אקמול|כלים/.test(String(f.uniqueAdvantage || ""))) {
    fail(`pedi advantage should be og remainder after the question (got ${JSON.stringify(f.uniqueAdvantage)})`);
  }
  const fakeDoc: IngestedDocument = {
    id: "doc-pedi",
    name: pediUrl,
    mime: "text/html",
    size: 1,
    kind: "url",
    tags: ["identity"],
    excerpt: "",
    createdAt: new Date().toISOString(),
  };
  const applied = applyIngestReview(emptyIntake(), rowsFromExtracted(f, false), fakeDoc, []);
  assertPediCommon("pedi", f, applied);
}

const spaHtml = readFileSync(join(__dirname, "fixtures/url-ingest-pedi-guide-spa.html"), "utf8");
const spa = parseFetchedHtml(spaHtml, pediUrl, pediUrl);
if (!spa.ok) {
  fail(`pedi-guide SPA parse failed: ${spa.error}`);
} else {
  const f = spa.fields;
  if (!/unwell|מטריד|not sure what to do/i.test(String(f.biggestProblem || ""))) {
    fail(`SPA problem should come from H1/unwell/מטריד (got ${JSON.stringify(f.biggestProblem)})`);
  }
  if (!/21|AI doctor/i.test(String(f.uniqueAdvantage || f.description || ""))) {
    fail(`SPA advantage missing 21/AI doctor (got ${JSON.stringify(f.uniqueAdvantage)})`);
  }
  const fakeDoc: IngestedDocument = {
    id: "doc-pedi-spa",
    name: pediUrl,
    mime: "text/html",
    size: 1,
    kind: "url",
    tags: ["identity"],
    excerpt: "",
    createdAt: new Date().toISOString(),
  };
  const applied = applyIngestReview(emptyIntake(), rowsFromExtracted(f, false), fakeDoc, []);
  assertPediCommon("SPA", f, applied);
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

function assertNoClinicLeftover(label: string, applied: ReturnType<typeof applyIngestReview>, siteNameRe: RegExp) {
  if (!siteNameRe.test(String(applied.businessName || ""))) {
    fail(`${label} businessName should be the site, got ${JSON.stringify(applied.businessName)}`);
  }
  if (/סאמר|أبو مخ|Abu Mokh|drsamerped/i.test(applied.businessName)) {
    fail(`${label} still has clinic name ${JSON.stringify(applied.businessName)}`);
  }
  if (isPediatricDemo(applied)) fail(`${label} isPediatricDemo should be false`);
  if (detectVertical(applied) === "clinic") fail(`${label} detectVertical must NOT be clinic`);
  if (/כללית|كلاليت|clalit/i.test(applied.audience)) {
    fail(`${label} audience still clalit ${JSON.stringify(applied.audience)}`);
  }
  const chips = audienceChipsFor(applied);
  if (chips.some((c) => c.id === "clalit" || c.id === "maccabi" || c.id === "meuhedet")) {
    fail(`${label} still shows kupat-holim audience chips`);
  }
  if (/הילד חולה/.test(`${applied.biggestProblem} ${applied.uniqueAdvantage} ${applied.description}`)) {
    fail(`${label} leftover הילד חולה`);
  }
}

if (pedi.ok) {
  const fromClinic = applyIngestReview(
    demoIntake("he"),
    rowsFromExtracted(pedi.fields, false),
    urlDoc("doc-pedi-from-clinic", pediUrl),
    [],
  );
  assertNoClinicLeftover("pedi-from-clinic", fromClinic, /pedi-guide/i);
  if (String(fromClinic.clinicHours || "").trim()) {
    fail(`pedi-from-clinic clinicHours should be empty (not on site), got ${JSON.stringify(fromClinic.clinicHours)}`);
  }
  if (String(fromClinic.kupaFileBy || "").trim() || String(fromClinic.kupaMemberFrom || "").trim()) {
    fail(`pedi-from-clinic kupa leftover ${JSON.stringify({ f: fromClinic.kupaFileBy, m: fromClinic.kupaMemberFrom })}`);
  }
  if (fromClinic.website.includes("drsamerped")) {
    fail(`pedi-from-clinic website leftover clinic domain ${fromClinic.website}`);
  }
  if (fromClinic.whatsapp === "052-8885800") fail("pedi-from-clinic leftover clinic whatsapp");
  if (/אל-נור|סדר הגעה/.test(fromClinic.clinicHours + fromClinic.location + fromClinic.description)) {
    fail("pedi-from-clinic leftover Al-Nour / walk-in clinic copy");
  }
}

if (parsed.ok) {
  const fromClinicGrill = applyIngestReview(
    demoIntake("he"),
    rowsFromExtracted(parsed.fields, false),
    urlDoc("doc-grill-from-clinic", submitted),
    [],
  );
  assertNoClinicLeftover("grill-from-clinic", fromClinicGrill, /פיקציה גריל/);
  if (String(fromClinicGrill.kupaFileBy || "").trim() || String(fromClinicGrill.kupaMemberFrom || "").trim()) {
    fail("grill-from-clinic kupa leftover");
  }
  if (String(fromClinicGrill.clinicHours || "").trim()) {
    fail(`grill-from-clinic clinicHours invented ${JSON.stringify(fromClinicGrill.clinicHours)}`);
  }
}

const navHtml = `<html><body>
<nav>
  <a href="/">Home</a>
  <a href="/about">About</a>
  <a href="/contact">צור קשר</a>
  <a href="/menu">תפריט</a>
  <a href="/who">من نحن</a>
  <a href="http://127.0.0.1/about">loop</a>
  <a href="https://other.example/about">other</a>
  <a href="/gallery">Gallery</a>
  <a href="/blog">Blog</a>
  <a href="/team">Team</a>
  <a href="/services">Services</a>
  <a href="/shop">Shop</a>
  <a href="/password-reset">Reset</a>
  <a href="/cart">Cart</a>
  <a href="mailto:hi@fiction.example">Email</a>
</nav>
</body></html>`;
const navUrls = collectSameOriginNavUrls(navHtml, "https://fiction.example/", 5);
if (navUrls.length > 5) fail(`nav cap exceeded ${navUrls.length}`);
if (navUrls.length < 3) fail(`nav should keep About/Contact/menu, got ${JSON.stringify(navUrls)}`);
if (!navUrls.some((u) => /\/about\b/i.test(u))) fail("nav missing About");
if (!navUrls.some((u) => /\/contact\b/i.test(u))) fail("nav missing Contact");
if (!navUrls.some((u) => /\/menu\b/i.test(u))) fail("nav missing תפריט");
if (navUrls.some((u) => /127\.0\.0\.1/.test(u))) fail("nav allowed private IP");
if (navUrls.some((u) => /other\.example/.test(u))) fail("nav allowed other origin");
if (navUrls.some((u) => /mailto:/.test(u))) fail("nav allowed mailto");
if (navUrls.some((u) => /password-reset|\/cart\b/.test(u))) fail("nav allowed password-reset/cart");
const navWide = collectSameOriginNavUrls(navHtml, "https://fiction.example/");
if (navWide.length > 12) fail(`default nav cap exceeded ${navWide.length}`);
if (!navWide.some((u) => /\/gallery\b/i.test(u))) fail("default cap should keep gallery");
if (!navWide.some((u) => /\/team\b/i.test(u))) fail("default cap should keep team");
if (!navWide.some((u) => /\/services\b/i.test(u))) fail("default cap should keep services");
if (navWide.some((u) => /password-reset|\/cart\b/.test(u))) fail("wide nav allowed skip URLs");

const merged = mergeExtractedFields(
  { businessName: "פיקציה גריל", website: "https://fiction.example/", clinicHours: "" },
  {
    businessName: "Other Name",
    website: "https://fiction.example/contact",
    clinicHours: "א׳–ה׳ 12:00–23:00",
    kupaFileBy: "",
    location: "רחוב הדקל 1, באקה",
  },
);
if (merged.businessName !== "פיקציה גריל") fail(`merge overwrote name ${JSON.stringify(merged.businessName)}`);
if (merged.website !== "https://fiction.example/") fail(`merge overwrote website ${JSON.stringify(merged.website)}`);
if (merged.clinicHours !== "א׳–ה׳ 12:00–23:00") fail(`merge should fill empty hours, got ${JSON.stringify(merged.clinicHours)}`);
if (String(merged.kupaFileBy || "").trim()) fail("merge invented kupa");
if (merged.location !== "רחוב הדקל 1, באקה") fail(`merge should fill empty location, got ${JSON.stringify(merged.location)}`);

const contactHtml = `<!DOCTYPE html><html><body>
<nav><a href="/">Home</a><a href="/contact">Contact</a></nav>
<footer>
  <address>רחוב הדקל 1, באקה</address>
  <a href="tel:041111111">04-1111111</a>
  <p>שעות: א׳–ה׳ 12:00–23:00</p>
</footer>
<p class="tagline">הגריל של באקה</p>
<a href="https://wa.me/972501111111">WhatsApp</a>
</body></html>`;
const contactParsed = parseFetchedHtml(contactHtml, "https://fiction.example/contact", "https://fiction.example/contact");
if (!contactParsed.ok) {
  fail(`contact parse failed ${contactParsed.error}`);
} else {
  if (!/הדקל|באקה/.test(String(contactParsed.fields.location || ""))) {
    fail(`contact address missing ${JSON.stringify(contactParsed.fields.location)}`);
  }
  const contactNums = `${contactParsed.fields.phone || ""} ${contactParsed.fields.whatsapp || ""}`;
  if (!/04-?1111111/.test(contactNums)) {
    fail(`contact landline phone missing ${JSON.stringify({ phone: contactParsed.fields.phone, wa: contactParsed.fields.whatsapp })}`);
  }
  if (!/050-?1111111|972501111111/.test(contactNums)) {
    fail(`contact whatsapp missing ${JSON.stringify({ phone: contactParsed.fields.phone, wa: contactParsed.fields.whatsapp })}`);
  }
  if (!/12:00/.test(String(contactParsed.fields.clinicHours || ""))) {
    fail(`contact hours missing ${JSON.stringify(contactParsed.fields.clinicHours)}`);
  }
  if (contactParsed.fields.brandPositioning !== "הגריל של באקה") {
    fail(`tagline slogan missing ${JSON.stringify(contactParsed.fields.brandPositioning)}`);
  }
  if (parsed.ok) {
    const homeThenContact = mergeExtractedFields(parsed.fields, contactParsed.fields);
    if (!/12:00/.test(String(homeThenContact.clinicHours || ""))) {
      fail(`homepage+contact merge hours empty ${JSON.stringify(homeThenContact.clinicHours)}`);
    }
    if (homeThenContact.businessName && !/פיקציה גריל/.test(homeThenContact.businessName)) {
      fail(`homepage+contact merge lost name ${JSON.stringify(homeThenContact.businessName)}`);
    }
  }
}

const ssrfCases = [
  "http://127.0.0.1/",
  "http://127.0.0.1:43147/",
  "https://localhost/admin",
  "http://192.168.1.1/",
  "http://10.0.0.5/",
  "http://169.254.169.254/latest/meta-data/",
  "http://[::1]/",
  "http://metadata.google.internal/",
  "http://printer.local/",
  "https://foo.trycloudflare.com/",
  "ftp://example.com/",
  "file:///etc/passwd",
];
for (const u of ssrfCases) {
  const r = inspectUrl(u);
  if (r.ok) fail(`SSRF allowed ${u}`);
  else if (u.startsWith("http://127.0.0.1") && r.error !== "blocked") {
    fail(`http://127.0.0.1/ should be blocked, got ${r.error}`);
  }
}

const loop = inspectUrl("http://127.0.0.1/");
if (loop.ok) fail("http://127.0.0.1/ was not rejected");
else if (loop.error !== "blocked") fail(`http://127.0.0.1/ error=${loop.error}, expected blocked`);

const okPublic = inspectUrl("https://fiction.example/");
if (!okPublic.ok) fail("https://fiction.example/ should pass inspectUrl");


const storeOfferHtml = readFileSync(join(__dirname, "fixtures/url-ingest-store-offer.html"), "utf8");
const storeOfferUrl = "https://shawarma.example/";
const storeOffer = parseFetchedHtml(storeOfferHtml, storeOfferUrl, storeOfferUrl);
if (!storeOffer.ok) {
  fail(`store-offer parse failed: ${storeOffer.error}`);
} else {
  const f = storeOffer.fields;
  if (!/1\s*\+\s*1/.test(String(f.offer || ""))) {
    fail(`store-offer offer should contain 1+1 (got ${JSON.stringify(f.offer)})`);
  }
  if (!/04-?5551234/.test(String(f.whatsapp || ""))) {
    fail(`store-offer phone missing (got ${JSON.stringify(f.whatsapp)})`);
  }
  if (!/הדקל|באקה/.test(String(f.location || ""))) {
    fail(`store-offer address missing (got ${JSON.stringify(f.location)})`);
  }
  if (/4\.9|דירוג|rating|stars/i.test(JSON.stringify(f))) {
    fail(`store-offer invented rating: ${JSON.stringify(f)}`);
  }
  const rows = rowsFromExtracted(f, false);
  const offerRow = rows.find((r) => r.field === "offer");
  if (!offerRow || !offerRow.needsClaimConfirm) {
    fail("store-offer HITL offer row must stay needsClaimConfirm");
  }
  const applied = applyIngestReview(demoIntake("he"), rows, urlDoc("doc-store-offer", storeOfferUrl), []);
  assertNoClinicLeftover("store-offer-from-clinic", applied, /שווארמה פיקציה/);
}

function assertAamStore(label: string, html: string, url: string) {
  const parsedAam = parseFetchedHtml(html, url, url);
  if (!parsedAam.ok) {
    fail(`${label} parse failed: ${parsedAam.error}`);
    return;
  }
  const f = parsedAam.fields;
  if (!/עיר המותגים/.test(String(f.businessName || parsedAam.title || ""))) {
    fail(`${label} name missing עיר המותגים (got ${JSON.stringify(f.businessName)})`);
  }
  if (/חדשים על המדפים/.test(String(f.businessName || ""))) {
    fail(`${label} H1 catalog heading leaked into businessName`);
  }
  if (/חדשים על המדפים/.test(String(f.biggestProblem || ""))) {
    fail(`${label} H1 catalog heading leaked into problem ${JSON.stringify(f.biggestProblem)}`);
  }
  if (!/אופנה|שופינג|לייף|lifestyle/i.test(String(f.description || f.uniqueAdvantage || ""))) {
    fail(`${label} description/og missing fashion copy (got ${JSON.stringify(f.description)})`);
  }
  if (!/מבצע|sale|500|חינם/i.test(String(f.offer || "") + String(f.uniqueAdvantage || ""))) {
    fail(`${label} should extract on-page מבצע/sale/shipping (offer=${JSON.stringify(f.offer)} adv=${JSON.stringify(f.uniqueAdvantage)})`);
  }
  if (!/077-?8181381/.test(String(f.whatsapp || ""))) {
    fail(`${label} phone missing 077-8181381 (got ${JSON.stringify(f.whatsapp)})`);
  }
  if (!/באקה|מחלף|כביש 6/.test(String(f.location || ""))) {
    fail(`${label} address missing באקה/מחלף (got ${JSON.stringify(f.location)})`);
  }
  if (/כללית|كلاليت|clalit/i.test(String(f.audience || ""))) {
    fail(`${label} audience leaked כללית ${JSON.stringify(f.audience)}`);
  }
  if (detectVertical({ businessName: f.businessName || "", category: f.category || "", description: f.description || "" }) === "clinic") {
    fail(`${label} detectVertical must NOT be clinic`);
  }
  if (/VIP|ROAS|דירוג|rating|4\.9/i.test(JSON.stringify(f))) {
    fail(`${label} invented VIP/ROAS/rating: ${JSON.stringify(f)}`);
  }
  const applied = applyIngestReview(demoIntake("he"), rowsFromExtracted(f, false), urlDoc(`doc-${label}`, url), []);
  assertNoClinicLeftover(label + "-from-clinic", applied, /עיר המותגים/);
  if (isPediatrics(applied)) fail(`${label} isPediatrics should be false`);
  const chips = audienceChipsFor(applied);
  if (chips.some((c) => c.id === "clalit" || c.id === "maccabi")) {
    fail(`${label} still shows kupat-holim audience chips`);
  }
}

const aamUrl = "https://www.aam.co.il/";
const aamInspect = inspectUrl(aamUrl);
if (!aamInspect.ok) fail(`https://www.aam.co.il/ should pass inspectUrl, got ${aamInspect.error}`);
assertAamStore("aam-fixture", readFileSync(join(__dirname, "fixtures/url-ingest-aam-store.html"), "utf8"), aamUrl);
if (existsSync("/tmp/aam.html")) {
  assertAamStore("aam-live-html", readFileSync("/tmp/aam.html", "utf8"), aamUrl);
}


const clinicHtml = readFileSync(join(__dirname, "fixtures/url-ingest-drsamerped-clinic.html"), "utf8");
const clinicUrl = "https://clinic-fixture.example/";
const clinic = parseFetchedHtml(clinicHtml, clinicUrl, clinicUrl);
if (!clinic.ok) {
  fail(`clinic-fixture parse failed: ${clinic.error}`);
} else {
  const f = clinic.fields;
  if (!/052-?8885800/.test(String(f.whatsapp || ""))) {
    fail(`clinic whatsapp missing 052-8885800 (got ${JSON.stringify(f.whatsapp)})`);
  }
  if (!/052-?8885800/.test(String(f.phone || ""))) {
    fail(`clinic phone should map from whatsapp/tel (got ${JSON.stringify(f.phone)})`);
  }
  if (!/باقة|באקה/.test(String(f.location || ""))) {
    fail(`clinic location missing باقة/באקה (got ${JSON.stringify(f.location)})`);
  }
  if (!/08:00/.test(String(f.clinicHours || ""))) {
    fail(`clinic hours missing 08:00 (got ${JSON.stringify(f.clinicHours)})`);
  }
  const problem = String(f.biggestProblem || "");
  if (!problem.trim() || problem === "unknown") fail(`clinic problem should not be unknown (got ${JSON.stringify(problem)})`);
  if (/איפוס סיסמה|password-reset|forgot password/i.test(problem)) {
    fail(`clinic problem is junk login ${JSON.stringify(problem)}`);
  }
  if (!/مجان|חינם|100%/.test(String(f.offer || ""))) {
    fail(`clinic offer missing مجان/חינם/100% (got ${JSON.stringify(f.offer)})`);
  }
  if (f.operatingModel !== "free_service") {
    fail(`clinic operatingModel should be free_service (got ${JSON.stringify(f.operatingModel)})`);
  }
  if (!String(f.uniqueAdvantage || "").trim()) fail("clinic uniqueAdvantage empty");
  if (String(f.uniqueAdvantage || "").trim() === String(f.description || "").trim()) {
    fail("clinic uniqueAdvantage cloned description");
  }
  if (!String(f.category || "").trim()) fail("clinic category empty");
  if (/משלוח/.test(JSON.stringify(f))) fail(`clinic leaked משלוח: ${JSON.stringify(f)}`);
  const offerRow = rowsFromExtracted(f, false).find((r) => r.field === "offer");
  if (!offerRow || !offerRow.needsClaimConfirm) fail("clinic HITL offer row must stay needsClaimConfirm");
  if (offerRow && offerRow.value === "no_offer") fail("clinic HITL offer should not be no_offer");
  const applied = applyIngestReview(emptyIntake(), rowsFromExtracted(f, false), urlDoc("doc-clinic", clinicUrl), []);
  if (!wizardReady(applied)) {
    fail(
      `clinic should be wizardReady after apply onto emptyIntake; missing ${["businessName", "description", "audience", "biggestProblem", "uniqueAdvantage", "mainGoal"].filter((k) => !String((applied as unknown as Record<string, string>)[k] || "").trim()).join(",")}`,
    );
  }
  if (detectVertical(applied) !== "clinic") {
    fail(`clinic detectVertical should be clinic (got ${detectVertical(applied)})`);
  }
  if (!/whatsapp/i.test(String(f.channelNotes || ""))) {
    fail(`clinic channels should include whatsapp (got ${JSON.stringify(f.channelNotes)})`);
  }
  if (String(f.kupaFileBy || "").trim() || String(f.kupaMemberFrom || "").trim()) {
    fail(`clinic invented kupa dates ${JSON.stringify({ f: f.kupaFileBy, m: f.kupaMemberFrom })}`);
  }
}

const saleHtml = readFileSync(join(__dirname, "fixtures/url-ingest-store-sale.html"), "utf8");
const saleUrl = "https://store-sale.example/";
const sale = parseFetchedHtml(saleHtml, saleUrl, saleUrl);
if (!sale.ok) {
  fail(`store-sale parse failed: ${sale.error}`);
} else {
  const f = sale.fields;
  if (!/חיסול|מבצע/.test(String(f.offer || ""))) {
    fail(`store-sale offer should contain חיסול/מבצע (got ${JSON.stringify(f.offer)})`);
  }
  const imgs = [...(sale.images ?? [])];
  if (sale.ogImage && !imgs.includes(sale.ogImage)) imgs.unshift(sale.ogImage);
  if (!imgs.length) fail("store-sale missing image asset (og:image / img)");
  if (imgs.some((u) => /pixel\.gif|favicon-32|width=1/i.test(u))) {
    fail(`store-sale kept tracker/icon ${JSON.stringify(imgs)}`);
  }
  const offerRow = rowsFromExtracted(f, false).find((r) => r.field === "offer");
  if (!offerRow || !offerRow.needsClaimConfirm) fail("store-sale HITL offer must stay needsClaimConfirm");
  if (String(f.kupaFileBy || "").trim() || String(f.kupaMemberFrom || "").trim()) {
    fail("store-sale invented kupa dates");
  }
  const extra: MediaAssetMeta[] = imgs.map((src, i) => ({
    id: `sale-img-${i}`,
    kind: "image",
    mime: "image/jpeg",
    name: src.split("/").pop() || "image",
    size: 0,
    label: "exterior",
    note: src,
    createdAt: new Date().toISOString(),
    publicSrc: src,
  }));
  const applied = applyIngestReview(emptyIntake(), rowsFromExtracted(f, false), urlDoc("doc-sale", saleUrl), extra);
  if (!applied.mediaAssets.length) fail("store-sale apply should keep at least one image asset");
  if (detectVertical(applied) === "clinic") fail("store-sale detectVertical must NOT be clinic");
}

const jsCorpus = extractScriptBundleText(
  `const cfg={phone:"050-1112233",whatsapp:"+972501112233",addressDetails:"רחוב הדקל 9, באקה",day:"الأحد",morning:"08:00 - 13:00",evening:"16:00 - 19:30",children:"بدون انتظار"};`,
);
const jsParsed = parseFetchedHtml("<html><body><p>generic shop</p></body></html>", "https://js-shop.example/", "https://js-shop.example/", jsCorpus);
if (!jsParsed.ok) {
  fail(`js-corpus parse failed ${jsParsed.error}`);
} else {
  if (!/050-?1112233/.test(String(jsParsed.fields.whatsapp || ""))) {
    fail(`js-corpus phone missing (got ${JSON.stringify(jsParsed.fields.whatsapp)})`);
  }
  if (!/050-?1112233/.test(String(jsParsed.fields.phone || ""))) {
    fail(`js-corpus fields.phone missing (got ${JSON.stringify(jsParsed.fields.phone)})`);
  }
  if (!/הדקל|באקה/.test(String(jsParsed.fields.location || ""))) {
    fail(`js-corpus address missing (got ${JSON.stringify(jsParsed.fields.location)})`);
  }
  if (!/08:00/.test(String(jsParsed.fields.clinicHours || ""))) {
    fail(`js-corpus hours missing (got ${JSON.stringify(jsParsed.fields.clinicHours)})`);
  }
}

const men = AUDIENCE_CHIPS.find((c) => c.id === "men")!;
const women = AUDIENCE_CHIPS.find((c) => c.id === "women")!;
let chipVal = toggleChipValue("", men, AUDIENCE_CHIPS, true);
if (chipVal !== "men") fail(`toggleChip add men got ${JSON.stringify(chipVal)}`);
chipVal = toggleChipValue(chipVal, women, AUDIENCE_CHIPS, true);
if (chipVal !== "men,women") fail(`toggleChip add women got ${JSON.stringify(chipVal)}`);
chipVal = toggleChipValue(chipVal, men, AUDIENCE_CHIPS, true);
if (chipVal !== "women") fail(`toggleChip remove men got ${JSON.stringify(chipVal)}`);
const joinedHe = resolveChipLabel("men,women", AUDIENCE_CHIPS, "he");
if (!/ו-/.test(joinedHe) || !/נשים/.test(joinedHe) || !/גברים/.test(joinedHe)) {
  fail(`resolveChipLabel he join missing ו- (got ${JSON.stringify(joinedHe)})`);
}
const joinedAr = resolveChipLabel("men,women", AUDIENCE_CHIPS, "ar");
if (!joinedAr.includes("و")) fail(`resolveChipLabel ar join missing و (got ${JSON.stringify(joinedAr)})`);


const colorHtml = `<html><head>
<title>Brand shop</title>
<meta name="theme-color" content="#0f766e" />
<style>:root{--brand:#fb7185;color:#1e3a5f} .x{background:#f4efe6}</style>
<link rel="apple-touch-icon" href="/apple-touch.png" />
<link rel="icon" type="image/png" href="/favicon-32.png" />
</head><body>
<header><img class="site-logo" src="/brand-logo.png" alt="לוגו" width="120" height="40" /></header>
<p>חנות מקומית בבאקה.</p>
<img src="https://cdn.example.com/hero.jpg" width="800" height="500" class="hero" />
<img src="/pixel.gif" width="1" height="1" />
</body></html>`;
const cols = extractCssColors(colorHtml, 5);
if (!cols.includes("#0f766e")) fail(`theme-color missing ${JSON.stringify(cols)}`);
if (cols.length < 3) fail(`expected 3+ colors, got ${JSON.stringify(cols)}`);
if (cols.length > 5) fail(`color cap ${cols.length}`);
const logo = extractLogoUrl(colorHtml, "https://fiction.example/");
if (!/apple-touch|brand-logo/i.test(logo)) fail(`logo missing apple-touch/header logo (got ${logo})`);
const colorParsed = parseFetchedHtml(colorHtml, "https://fiction.example/", "https://fiction.example/");
if (!colorParsed.ok) fail("color html parse failed");
else {
  if (!colorParsed.logo) fail("parsed logo empty");
  if (!(colorParsed.colors || []).length) fail("parsed colors empty");
  const imgs = colorParsed.images ?? [];
  if (imgs.some((u) => /pixel\\.gif/i.test(u))) fail(`kept pixel ${JSON.stringify(imgs)}`);
  if (imgs.length > 16) fail(`image cap ${imgs.length}`);
}

if (RESIZE_FORMATS.length !== 4) fail(`resize formats ${RESIZE_FORMATS.length}`);
if (!RESIZE_FORMATS.some((f) => f.ratio === "1.91:1")) fail("missing feed 1.91:1");
if (!RESIZE_FORMATS.some((f) => f.ratio === "1:1")) fail("missing 1:1");
if (!RESIZE_FORMATS.some((f) => f.ratio === "4:5")) fail("missing 4:5");
if (!RESIZE_FORMATS.some((f) => f.ratio === "9:16")) fail("missing 9:16");

if (clinic.ok) {
  const appliedClinic = applyIngestReview(emptyIntake(), rowsFromExtracted(clinic.fields, false), urlDoc("doc-clinic-audit", clinicUrl), []);
  const audit = buildSiteAudit(appliedClinic);
  if (!audit.strengths.length) fail("clinic audit strengths empty");
  if (!audit.weaknesses.length) fail("clinic audit should list weaknesses (photos/cta/etc) or strengths only is ok");
  if (!audit.strengths.some((s) => s.id === "phone" || s.id === "hours" || s.id === "address")) {
    fail(`clinic audit missing phone/hours/address strengths ${audit.strengths.map((s) => s.id).join(",")}`);
  }
  if (JSON.stringify(audit).match(/ROAS|32–68|leads\/month/i)) fail("audit invented ROAS");
}

const packIntake = emptyIntake();
packIntake.businessName = "פיקציה גריל";
packIntake.description = "גריל בבאקה עם תפריט בשרים.";
packIntake.location = "רחוב הדקל 1, באקה";
packIntake.whatsapp = "04-1234567";
packIntake.audience = "families";
packIntake.biggestProblem = "אין מקום בשבת";
packIntake.uniqueAdvantage = "פחם אמיתי בבאקה";
packIntake.mainGoal = "bookings";
packIntake.brandKit = { colors: ["#111111", "#f5c518", "#ff1a1a"], source: "scan", logoSrc: "https://cdn.example.com/logo.png" };
const pack = assemblePack(packIntake, {
  report: { completeness: 50, missing: [], inconsistencies: [], refusedGuesses: [] },
  diagnosis: { summary: { he: "", ar: "", en: "" }, hypotheses: [], approved: true },
  agentStatus: { intake: "complete", diagnostic: "approved", strategic: "approved", media: "approved", optimizer: "complete" },
});
const siteAudit = pack.siteAudit;
if (!siteAudit) fail("assemblePack missing siteAudit");
else if (!siteAudit.strengths.length) fail("pack siteAudit strengths empty");
const week = buildPostingCalendar(pack, "he");
if (week.length !== 30) fail(`calendar days ${week.length}`);
if (week[0].channel !== "facebook") fail("day 1 should be facebook");
if (week[1].channel !== "instagram") fail("day 2 should be instagram");
if (week.some((d) => /best time|שעה הכי|أفضل وقت/i.test(`${d.headline} ${d.body}`))) fail("calendar invented best-time science");
if (emptyBrandKit().source !== "none") fail("empty brand kit invented source");



const fbPage = inspectUrl("https://www.facebook.com/FictionGrill");
if (!fbPage.ok) fail("facebook.com page should pass inspectUrl");
else {
  if (detectSocialKind(fbPage.url) !== "facebook") fail("detectSocialKind facebook");
  const mbasic = facebookMbasicUrl(fbPage.url);
  if (mbasic.hostname !== "mbasic.facebook.com") fail(`mbasic host ${mbasic.hostname}`);
  if (!mbasic.pathname.includes("FictionGrill")) fail(`mbasic path ${mbasic.pathname}`);
}
const fbShort = inspectUrl("https://fb.com/FictionGrill");
if (!fbShort.ok || detectSocialKind(fbShort.url) !== "facebook") fail("fb.com should be facebook");
const igInspect = inspectUrl("https://www.instagram.com/fictiongrill/");
if (!igInspect.ok || detectSocialKind(igInspect.url) !== "instagram") fail("instagram detect");

const fbHtml = readFileSync(join(__dirname, "fixtures/url-ingest-facebook-mbasic.html"), "utf8");
const fbSocial = parseSocialPage(fbHtml, "https://mbasic.facebook.com/FictionGrill", "facebook");
if (fbSocial.loginWall) fail("public facebook fixture treated as login wall");
if (!/פיקציה גריל/.test(fbSocial.name)) fail(`facebook name ${JSON.stringify(fbSocial.name)}`);
if (fbSocial.posts.length < 2) fail(`facebook posts ${fbSocial.posts.length}`);
if (!fbSocial.posts.some((p) => /1\s*\+\s*1/.test(p.text))) fail("facebook missing 1+1 post");
if (!fbSocial.posts.some((p) => /הורים/.test(p.text))) fail("facebook missing parents post");
if (fbSocial.posts.some((p) => /^log in$/i.test(p.text) || /^create account$/i.test(p.text))) {
  fail("facebook kept login chrome as a post");
}
if (/12K|followers|ROAS|25-34/i.test(JSON.stringify(fbSocial))) fail(`facebook invented metrics ${JSON.stringify(fbSocial)}`);
const fbParsed = parseFetchedHtml(fbHtml, "https://mbasic.facebook.com/FictionGrill", "https://www.facebook.com/FictionGrill");
if (fbParsed.ok) {
  const appliedFb = applyIngestReview(
    emptyIntake(),
    rowsFromExtracted(fbParsed.fields, false),
    urlDoc("doc-fb", "https://www.facebook.com/FictionGrill"),
    [],
    fbSocial.posts,
  );
  if (appliedFb.pastCreatives.length < 2) fail(`facebook pastCreatives ${appliedFb.pastCreatives.length}`);
  if (!appliedFb.pastCreatives.every((c) => c.confirmedReal && c.tag === "past_creative")) {
    fail("facebook past creatives must be confirmedReal past_creative");
  }
  if (appliedFb.pastCreatives.length > 12) fail("facebook past cap 12");
  const audit = buildPastCampaignAuditFromPosts(appliedFb.pastCreatives, { location: appliedFb.location || "באקה" });
  if (!audit) fail("facebook past audit empty");
  else {
    if (!audit.strengths.length) fail("facebook audit strengths empty");
    if (!audit.weaknesses.length) fail("facebook audit weaknesses empty");
    if (!/הורים/.test(audit.inferredAudience.he)) fail(`inferred audience ${JSON.stringify(audit.inferredAudience)}`);
    if (/25-34|women 25|ROAS|likes|reach/i.test(JSON.stringify(audit))) fail(`audit invented metrics ${JSON.stringify(audit)}`);
    if (!audit.failedWhere.length) fail("facebook audit failedWhere empty");
  }
}

const heError = `<html><head><title>שגיאה</title></head><body>ראה/ראי פוסטים, תמונות ועוד בפייסבוק.</body></html>`;
const heWall = parseSocialPage(heError, "https://mbasic.facebook.com/login.php?next=%2Fnasa", "facebook");
if (!heWall.loginWall) fail("hebrew Facebook error page should be login wall");
if (heWall.name) fail(`hebrew error leaked name ${JSON.stringify(heWall.name)}`);
if (heWall.posts.length) fail("hebrew error invented posts");
if (heWall.phone || heWall.whatsapp) fail("hebrew error leaked phone");
if (!isSocialErrorTitle("שגיאה") || !isSocialErrorTitle("שגיאה | Facebook") || !isSocialErrorTitle("Error")) {
  fail("isSocialErrorTitle should catch שגיאה / Error titles");
}
const heErrorPipe = `<html><head><title>שגיאה | Facebook</title><meta property="og:title" content="שגיאה" /></head><body><p>ראה/ראי פוסטים, תמונות ועוד בפייסבוק.</p><p>Log in to Facebook to continue.</p></body></html>`;
const hePipeWall = parseSocialPage(heErrorPipe, "https://mbasic.facebook.com/Meta", "facebook");
if (!hePipeWall.loginWall) fail("שגיאה | Facebook title must be login wall");
if (hePipeWall.name) fail(`שגיאה | Facebook leaked name ${JSON.stringify(hePipeWall.name)}`);
if (socialHasPublicContent(hePipeWall)) fail("שגיאה | Facebook must not count as public content");
const heParsedJunk = parseFetchedHtml(heErrorPipe, "https://mbasic.facebook.com/Meta", "https://www.facebook.com/Meta");
if (heParsedJunk.ok && (isSocialErrorTitle(heParsedJunk.title) || isSocialErrorTitle(String(heParsedJunk.fields.businessName || "")))) {
  // parseFetchedHtml may still return ok for raw HTML; ingestSocialUrl must reject — simulate guard
  if (!isSocialErrorTitle(heParsedJunk.title)) fail("parsed facebook error should keep error title");
}

const wallHtml = readFileSync(join(__dirname, "fixtures/url-ingest-facebook-login-wall.html"), "utf8");
if (!isSocialLoginWall(wallHtml)) fail("login wall fixture not detected");
const wallSocial = parseSocialPage(wallHtml, "https://mbasic.facebook.com/private", "facebook");
if (!wallSocial.loginWall) fail("login wall parse loginWall=false");
if (wallSocial.name) fail(`login wall leaked name ${JSON.stringify(wallSocial.name)}`);
if (wallSocial.posts.length) fail("login wall invented posts");

const plugin = facebookPagePluginUrl(new URL("https://www.facebook.com/NASA"));
if (!/plugins\/page\.php/.test(plugin) || !/NASA/.test(plugin)) fail(`page plugin url ${plugin}`);
const oembed = parseOembedJson(JSON.stringify({
  author_name: "NASA",
  title: "NASA",
  thumbnail_url: "https://cdn.example.com/nasa.jpg",
  html: "<blockquote>Public telescope night at the visitor center this Friday.</blockquote>",
}), "facebook");
if (!oembed || oembed.loginWall) fail("oembed NASA treated as wall");
if (oembed?.name !== "NASA") fail(`oembed name ${JSON.stringify(oembed?.name)}`);
if (oembed?.phone || oembed?.whatsapp) fail("oembed invented phone");
if (!socialHasPublicContent(oembed)) fail("oembed should be public content");
const oembedErr = parseOembedJson(JSON.stringify({ error: { message: "login required" } }), "facebook");
if (oembedErr) fail("oembed error object must be ignored");

const wallErr = socialLoginWallError();
if (wallErr.error !== "social_login_wall") fail("socialLoginWallError code");
if (!/הדביקו כתובת אתר|ייצוא/.test(wallErr.messageHe || "")) fail("missing Hebrew paste/export copy");
if (!/الصقوا رابط موقع|تصدير/.test(wallErr.messageAr || "")) fail("missing Arabic paste/export copy");
if (!/שגיאה|התחברות/.test(wallErr.messageHe || "")) fail("Hebrew wall copy should mention login/error");
if (!/خطأ|تسجيل دخول/.test(wallErr.messageAr || "")) fail("Arabic wall copy should mention login/error");
if (/סיסמ|كلمة سر/.test(SOCIAL_LOGIN_WALL_COPY.he + SOCIAL_LOGIN_WALL_COPY.ar) === false) fail("must say we do not ask for password");
if (/password|סיסמ|كلمة سر/i.test(JSON.stringify(SOCIAL_LOGIN_WALL_COPY)) === false) fail("must mention passwords are not asked");
if (wallSocial.phone || wallSocial.whatsapp) fail("login wall leaked phone after sanitize");


const igHtml = readFileSync(join(__dirname, "fixtures/url-ingest-instagram.html"), "utf8");
const igSocial = parseSocialPage(igHtml, "https://www.instagram.com/fictiongrill/", "instagram");
if (igSocial.loginWall) fail("instagram fixture login wall");
if (!/פיקציה גריל/.test(igSocial.name)) fail(`instagram name ${JSON.stringify(igSocial.name)}`);
if (!/גריל מקומי/.test(igSocial.description)) fail(`instagram bio ${JSON.stringify(igSocial.description)}`);
if (/12K Followers/.test(igSocial.description)) fail("instagram kept follower chrome as bio");
if (/ROAS|25-34/.test(JSON.stringify(igSocial))) fail("instagram invented metrics");
if (igSocial.posts.length && !igSocial.posts.every((p) => p.text.trim())) fail("instagram empty invented post");

const liveUrl = "https://grillking.multiscreensite.com/";
if (process.env.URL_INGEST_LIVE === "1") {
  ingestUrl(liveUrl)
    .then((live) => {
      if (!live.ok) {
        console.warn("LIVE skip/fail", live.error);
        finish();
        return;
      }
      const name = String(live.fields.businessName || live.title || "");
      if (!/גריל|grill/i.test(name)) fail(`live name missing גריל/Grill (got ${JSON.stringify(name)})`);
      if (/rating|דירוג|4\.9|stars/i.test(JSON.stringify(live.fields))) {
        fail(`live invented ratings: ${JSON.stringify(live.fields)}`);
      }
      finish();
    })
    .catch((e) => {
      console.warn("LIVE network skipped", e instanceof Error ? e.message : e);
      finish();
    });
} else {
  finish();
}

function finish() {
  console.log("=== fixture fields ===");
  if (parsed.ok) {
    console.log(
      Object.entries(parsed.fields)
        .filter(([, v]) => String(v || "").trim())
        .map(([k, v]) => `${k}=${v}`)
        .join("\n") || "(none)",
    );
  }
  console.log("=== pedi-guide fields ===");
  if (pedi.ok) {
    console.log(
      Object.entries(pedi.fields)
        .filter(([, v]) => String(v || "").trim())
        .map(([k, v]) => `${k}=${v}`)
        .join("\n") || "(none)",
    );
  }
  if (failures.length) {
    console.error("FAIL\n" + failures.join("\n"));
    process.exit(1);
  }
  console.log("=== pedi-guide SPA fields ===");
  if (spa.ok) {
    console.log(
      Object.entries(spa.fields)
        .filter(([, v]) => String(v || "").trim())
        .map(([k, v]) => `${k}=${v}`)
        .join("\n") || "(none)",
    );
  }
  console.log("PASS url ingest: JSON-LD + live pedi-guide prose, SPA unwell, clinic leftover cleared, nav extras, no invented price, SSRF rejects 127.0.0.1");
}
