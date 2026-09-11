import { detectVertical } from "../lib/vertical";
import {
  googleCseConfigured,
  isJunkStockTitle,
  isOnTopicStock,
  lexiconQueriesFrom,
  resolveStockVertical,
  sanitizeStockHint,
  topicQueriesFor,
  wikiSearchQuery,
  applyStockCaptions,
  stockCaptionFor,
} from "../lib/stock-images";
import { isOfferedAsset, stockToAsset } from "../lib/media-assets";
import { graphicPostersForIntake, posterToAsset } from "../lib/graphic-posters";
import { demoIntake } from "../lib/demo";
import { IMAGEN_PICKER_COUNT, imagenScenesFor, isDentalTopic } from "../lib/imagen-scenes";

const failures: string[] = [];
function fail(m: string) {
  failures.push(m);
}

const clinic = {
  q: "عيادة أطفال بدون طوابير كلاليت 100%",
  vertical: "clinic",
  category: "طبيب أطفال",
  location: "باقة الغربية، الشارع الرئيسي",
};
const clinicQs = topicQueriesFor(clinic);
for (const need of [
  "pediatric clinic waiting room",
  "children's doctor office interior",
  "family clinic",
  "warm medical clinic",
]) {
  if (!clinicQs.some((q) => q.toLowerCase() === need.toLowerCase() || q.toLowerCase().includes(need.toLowerCase()))) {
    fail(`clinic missing query: ${need} in ${clinicQs.join(" | ")}`);
  }
}
if (clinicQs.some((q) => /clalit|كلاليت|כללית|samer|سامر|סאמר/i.test(q))) {
  fail(`clinic queries leaked brand/person: ${clinicQs.join(" | ")}`);
}
const usedCaptions = new Set<string>();
const cap1 = stockCaptionFor({ title: "Waiting room", query: "waiting room", id: "a" }, clinic, "clinic", usedCaptions);
const cap2 = stockCaptionFor({ title: "Clinic interior", query: "clinic interior", id: "b" }, clinic, "clinic", usedCaptions);
if (cap1 === cap2) fail(`stock captions not unique: ${cap1}`);
if (/^ستوك حسب الموضوع$|^סטוק לפי נושא$|^stock by topic$/i.test(cap1) || /^ستوك حسب الموضوع$/.test(cap2)) {
  fail(`generic stock tab used as the only caption: ${cap1} / ${cap2}`);
}
const captioned = applyStockCaptions(
  [
    { id: "1", thumb: "https://x.test/1.jpg", full: "https://x.test/1.jpg", title: "Waiting room", attribution: "w", source: "wikimedia", query: "waiting room" },
    { id: "2", thumb: "https://x.test/2.jpg", full: "https://x.test/2.jpg", title: "DSC_0999", attribution: "w", source: "openverse", query: "clinic interior" },
    { id: "3", thumb: "https://x.test/3.jpg", full: "https://x.test/3.jpg", title: "Reception desk", attribution: "w", source: "google", query: "clinic reception" },
  ],
  clinic,
  "clinic",
);
const caps = captioned.map((i) => i.caption || "");
if (new Set(caps).size !== caps.length) fail(`applyStockCaptions duplicates: ${caps.join(" | ")}`);
if (caps.some((c) => !c.trim() || /^ستوك حسب الموضوع$/.test(c))) fail(`blank/generic caption: ${caps.join(" | ")}`);
if (!clinicQs.some((q) => /^waiting room$/i.test(q))) {
  fail(`clinic missing short photographic query "waiting room": ${clinicQs.join(" | ")}`);
}
if (!clinicQs.some((q) => /clinic interior/i.test(q))) {
  fail(`clinic missing short "clinic interior": ${clinicQs.join(" | ")}`);
}
if (clinicQs[0] && clinicQs[0].split(" ").length > 4) {
  fail(`clinic first query should be short, got: ${clinicQs[0]}`);
}

const poolQs = topicQueriesFor({ vertical: "pool", category: "הידרותרפיה", location: "רנאן" });
if (!poolQs.some((q) => /hydrotherapy pool/i.test(q))) fail(`pool missing hydrotherapy: ${poolQs.join(" | ")}`);

const retailQs = topicQueriesFor({ vertical: "retail", category: "אופנה", q: "בoutique" });
if (!retailQs.some((q) => /clothing boutique/i.test(q))) fail(`retail missing boutique: ${retailQs.join(" | ")}`);

const foodQs = topicQueriesFor({ vertical: "restaurant", category: "مطعم شاورما", q: "grill" });
if (!foodQs.some((q) => /grilled food|shawarma grill/i.test(q))) fail(`restaurant missing grilled food: ${foodQs.join(" | ")}`);

const oliveQs = topicQueriesFor({
  vertical: "restaurant",
  category: "מטבח ים-תיכוני",
  q: "שמן זית חומוס ישיבה בחוץ",
  description: "מנות ביתיות, שמן זית, ישיבה בחוץ",
});
if (!oliveQs.some((q) => /hummus|mezze|olive|mediterranean/i.test(q))) {
  fail(`olive kitchen missing mediterranean queries: ${oliveQs.join(" | ")}`);
}
if (oliveQs.some((q) => /pizza/i.test(q))) fail(`olive kitchen leaked pizza query: ${oliveQs.join(" | ")}`);
if (!oliveQs.some((q) => /^hummus$/i.test(q))) fail(`olive missing short hummus query: ${oliveQs.join(" | ")}`);
if (isOnTopicStock("restaurant", "Pepperoni pizza hut menu", "", "mediterranean")) {
  fail("pizza marked on-topic for mediterranean cuisine");
}
if (!isOnTopicStock("restaurant", "Hummus olive oil bowl", "", "mediterranean")) {
  fail("hummus not on-topic for mediterranean");
}
if (!isOnTopicStock("restaurant", "Meze in Beirut", "", "mediterranean")) {
  fail("meze platter title not on-topic for mediterranean");
}
if (!isOnTopicStock("clinic", "DSC_0123", "", undefined, "waiting room")) {
  fail("generic camera title from waiting-room query should be accepted");
}
if (isOnTopicStock("clinic", "City council rally", "", undefined, "waiting room")) {
  fail("junk politics accepted via query trust");
}

const productQs = topicQueriesFor({ vertical: "product", category: "smart tools", q: "health app" });
if (!productQs.some((q) => /parent using phone health app/i.test(q))) {
  fail(`product missing parent phone: ${productQs.join(" | ")}`);
}

const detected = detectVertical({
  businessName: "מרפאת ילדים",
  category: "طبيب أطفال",
  description: "عيادة أطفال",
});
if (detected !== "clinic") fail(`detectVertical clinic got ${detected}`);
if (resolveStockVertical({ category: "طبيب أطفال", q: "عيادة أطفال" }) !== "clinic") {
  fail("resolveStockVertical failed to infer clinic");
}

if (!isJunkStockTitle("Clalit logo PNG")) fail("junk missed Clalit logo");
if (!isJunkStockTitle("Dr. Samer portrait")) fail("junk missed named portrait");
if (!isJunkStockTitle("ROAS meme screenshot")) fail("junk missed meme");
if (!isJunkStockTitle("FrontLines Photo Contest Third Place")) fail("junk missed contest");
if (!isJunkStockTitle("Jan Steen - Doctor's Visit - WGA21713.jpg")) fail("junk missed painting");
if (!isJunkStockTitle("vaccinated for smallpox")) fail("junk missed smallpox");
if (isJunkStockTitle("A waiting room at a medical healthcare clinic")) fail("waiting room marked junk");
if (!isOnTopicStock("clinic", "Pediatric clinic waiting room")) fail("clinic waiting room not on-topic");
if (isOnTopicStock("clinic", "Bikini swimming pool party")) fail("bikini pool marked clinic-topic");
if (isOnTopicStock("clinic", "Restored waiting room at Bruce Grove station")) {
  fail("train-station waiting room marked clinic-topic");
}
if (isOnTopicStock("clinic", "Amtrak Peachtree station waiting room")) {
  fail("Amtrak waiting room marked clinic-topic");
}
if (isOnTopicStock("clinic", "Handwritten letter 1923", "manuscript correspondence")) {
  fail("handwritten letter marked clinic-topic");
}
if (isOnTopicStock("clinic", "Birdcage in a garden", "aviary", undefined, "clinic interior")) {
  fail("birdcage accepted via query trust");
}
if (isOnTopicStock("clinic", "Forest cottage house", "cabin in woods", undefined, "waiting room")) {
  fail("forest house accepted via query trust");
}
if (!isOnTopicStock("clinic", "A waiting room at a medical healthcare clinic")) {
  fail("medical clinic waiting room not on-topic");
}
if (!isOnTopicStock("pool", "Indoor hydrotherapy pool")) fail("hydro pool not on-topic");
if (!isOnTopicStock("retail", "Fashion boutique interior")) fail("boutique not on-topic");
if (!isOnTopicStock("restaurant", "Grilled chicken restaurant")) fail("grill not on-topic");

const wikiQ = wikiSearchQuery("pediatric clinic waiting room");
if (!/filemime:image\/jpeg/.test(wikiQ)) fail("wiki wrapper missing jpeg");
if (/clalit/i.test(wikiQ)) fail("wiki wrapper has clalit");
if (/filew:>/.test(wikiQ)) fail("wiki wrapper still uses filew which empties Commons hits");

const heLex = lexiconQueriesFrom("מנות ביתיות, שמן זית, חומוס, ישיבה בחוץ");
if (!heLex.some((q) => /hummus|olive oil|mezze/i.test(q))) {
  fail(`Hebrew lexicon missed food queries: ${heLex.join(" | ")}`);
}
if (typeof googleCseConfigured() !== "boolean") fail("googleCseConfigured not boolean");

const hint = sanitizeStockHint("د. سامر أبو مخ · كلاليت · ROAS 12% · ₪50");
if (/samer|كلاليت|clalit|roas|₪50/i.test(hint)) fail(`sanitize leaked ${hint}`);

const stockAsset = stockToAsset({
  id: "wiki-1",
  full: "https://upload.wikimedia.org/wikipedia/commons/x.jpg",
  title: "Waiting room",
  attribution: "Wiki · CC BY 4.0",
  source: "wikimedia",
});
if (!isOfferedAsset(stockAsset)) fail("stock asset not offered");
if (!stockAsset.note.startsWith("offer:stock:")) fail(`stock note ${stockAsset.note}`);

if (!isDentalTopic({ category: "מרפאת שיניים", description: "השתלות שיניים ואסתטיקה דנטלית", q: "חיפה" })) {
  fail("Halloun facts must detect dental topic");
}
const dentalScenes = imagenScenesFor({
  category: "מרפאת שיניים",
  description: "השתלות שיניים · אסתטיקה דנטלית · שתלים מזרקוניה",
  location: "שדרות הנשיא 21, חיפה",
  locale: "he",
  vertical: "clinic",
});
if (dentalScenes.length < 6) fail(`dental scenes ${dentalScenes.length}`);
const dentalBlob = dentalScenes.map((s) => s.prompt).join("\n");
if (!/implant|aesthetic|dental/i.test(dentalBlob)) fail("dental Imagen prompts missing implant/aesthetic grounding");
if (/play nook|soft toys|children's play|pediatric waiting/i.test(dentalBlob)) {
  fail("dental Imagen used pediatric toy scenes");
}
if (/formula|math poster|blue geometric/i.test(dentalBlob) && !/No math/.test(dentalBlob)) {
  fail("dental Imagen asked for formula/geometric junk");
}
const dentalQs = topicQueriesFor({
  category: "מרפאת שיניים",
  description: "השתלות שיניים ואסתטיקה",
  location: "חיפה",
  vertical: "clinic",
});
if (!dentalQs.some((q) => /dental clinic/i.test(q))) fail(`dental stock queries ${dentalQs.join(" | ")}`);

const posters = graphicPostersForIntake(demoIntake("he"));
if (posters.length < 4) fail(`posters ${posters.length}`);
const posterAsset = posterToAsset(posters[0]!, posters[0]!.name.he);
if (!isOfferedAsset(posterAsset)) fail("poster not offered");
if (/clalit|كلاليت|כללית/i.test(posterAsset.note + posterAsset.name)) fail("poster clalit");

if (failures.length) {
  console.error("FAIL\n" + failures.join("\n"));
  process.exit(1);
}
console.log("PASS stock images", {
  clinicQs: clinicQs.length,
  poolQs: poolQs.length,
  retailQs: retailQs.length,
  foodQs: foodQs.length,
  productQs: productQs.length,
});
