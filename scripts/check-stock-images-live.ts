/**
 * Live network probe: clinic + Mediterranean restaurant should return
 * a rich on-topic photographic grid. Skips cleanly if both sources are down.
 */
import { searchStockImages, isOnTopicStock, topicQueriesFor } from "../lib/stock-images";

const failures: string[] = [];
function fail(m: string) {
  failures.push(m);
}

async function main() {
  const clinicInput = {
    vertical: "clinic",
    category: "רופא ילדים",
    q: "מרפאת ילדים לפי סדר הגעה",
    description: "מרפאת ילדים חמה, חדר המתנה",
    location: "באקה",
    limit: 36,
  };
  const oliveInput = {
    vertical: "restaurant",
    category: "מטבח ים-תיכוני",
    q: "שמן זית חומוס ישיבה בחוץ",
    description: "מנות ביתיות, שמן זית, ישיבה בחוץ",
    offer: "ארוחת טעימות",
    limit: 36,
  };

  const clinicQs = topicQueriesFor(clinicInput);
  const oliveQs = topicQueriesFor(oliveInput);
  if (!clinicQs.some((q) => /waiting room|clinic interior/i.test(q))) {
    fail(`clinic live queries thin: ${clinicQs.join(" | ")}`);
  }
  if (!oliveQs.some((q) => /hummus|mezze|olive/i.test(q))) {
    fail(`olive live queries thin: ${oliveQs.join(" | ")}`);
  }
  if (oliveQs.some((q) => /pizza/i.test(q))) fail("olive live queries leaked pizza");

  const [clinic, olive] = await Promise.all([searchStockImages(clinicInput), searchStockImages(oliveInput)]);

  if (!clinic.images.length && !olive.images.length) {
    console.warn("SKIP live stock — Openverse/Wikimedia returned nothing (network?)");
    return;
  }
  if (clinic.images.length < 6) {
    fail(`clinic live grid too thin: ${clinic.images.length} — ${clinic.images.map((i) => i.title).slice(0, 6).join(" | ")}`);
  }
  if (olive.images.length < 6) {
    fail(`olive live grid too thin: ${olive.images.length} — ${olive.images.map((i) => i.title).slice(0, 6).join(" | ")}`);
  }
  for (const img of clinic.images) {
    if (!isOnTopicStock("clinic", img.title, img.attribution, undefined, img.query)) {
      fail(`clinic off-topic: ${img.title}`);
    }
    if (/\b(amtrak|railway|train station)\b/i.test(img.title) && !/clinic|doctor|medical|hospital/i.test(img.title)) {
      fail(`clinic transit junk: ${img.title}`);
    }
  }
  for (const img of olive.images) {
    if (/pizza|pepperoni|\bhut\b/i.test(`${img.title} ${img.attribution}`)) {
      fail(`olive leaked pizza photo: ${img.title}`);
    }
    if (!isOnTopicStock("restaurant", img.title, img.attribution, "mediterranean", img.query)) {
      fail(`olive off-topic: ${img.title}`);
    }
  }

  if (failures.length) {
    console.error("FAIL\n" + failures.join("\n"));
    process.exit(1);
  }
  console.log("PASS live stock images", {
    clinic: clinic.images.length,
    clinicTitles: clinic.images.slice(0, 8).map((i) => i.title),
    olive: olive.images.length,
    oliveTitles: olive.images.slice(0, 8).map((i) => i.title),
    clinicQueries: clinic.queries.slice(0, 6),
    oliveQueries: olive.queries.slice(0, 6),
  });
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
