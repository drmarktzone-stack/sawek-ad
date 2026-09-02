import { detectVertical } from "../lib/vertical";
import {
  isJunkStockTitle,
  isOnTopicStock,
  resolveStockVertical,
  sanitizeStockHint,
  topicQueriesFor,
  wikiSearchQuery,
} from "../lib/stock-images";
import { isOfferedAsset, stockToAsset } from "../lib/media-assets";
import { graphicPostersForIntake, posterToAsset } from "../lib/graphic-posters";
import { demoIntake } from "../lib/demo";
import { IMAGEN_PICKER_COUNT, imagenScenesFor } from "../lib/imagen-scenes";

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

const poolQs = topicQueriesFor({ vertical: "pool", category: "הידרותרפיה", location: "רנאן" });
if (!poolQs.some((q) => /hydrotherapy pool/i.test(q))) fail(`pool missing hydrotherapy: ${poolQs.join(" | ")}`);

const retailQs = topicQueriesFor({ vertical: "retail", category: "אופנה", q: "בoutique" });
if (!retailQs.some((q) => /clothing boutique/i.test(q))) fail(`retail missing boutique: ${retailQs.join(" | ")}`);

const foodQs = topicQueriesFor({ vertical: "restaurant", category: "مطعم شاورما", q: "grill" });
if (!foodQs.some((q) => /grilled food/i.test(q))) fail(`restaurant missing grilled food: ${foodQs.join(" | ")}`);

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
if (!isOnTopicStock("pool", "Indoor hydrotherapy pool")) fail("hydro pool not on-topic");
if (!isOnTopicStock("retail", "Fashion boutique interior")) fail("boutique not on-topic");
if (!isOnTopicStock("restaurant", "Grilled chicken restaurant")) fail("grill not on-topic");

const wikiQ = wikiSearchQuery("pediatric clinic waiting room");
if (!/filemime:image\/jpeg/.test(wikiQ)) fail("wiki wrapper missing jpeg");
if (/clalit/i.test(wikiQ)) fail("wiki wrapper has clalit");

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
