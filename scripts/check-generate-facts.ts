/**
 * POST /api/generate fact contract: facts must appear in HE/AR/EN copy.
 * Gemini may be absent locally — template fill must still return ok:true.
 */
import { runGeminiGenerate } from "../lib/engine/gemini-generate";
import { countIncompleteMarkers, templateFillFromFacts } from "../lib/engine/fact-copy";
import { detectVertical } from "../lib/vertical";

const failures: string[] = [];
function fail(m: string) {
  failures.push(m);
}

const facts = {
  businessName: "מרפאת בדיקה סאווק",
  phone: "052-8885800",
  city: "באקה",
  website: "https://sawek.example",
  offer: "בלי תורים היום",
  hours: "ראשון 08:00-13:00",
};

const filled = templateFillFromFacts({ facts });
if (!filled.ok) fail("templateFill not ok");
for (const loc of ["he", "ar", "en"] as const) {
  const block = filled.locales?.[loc];
  if (!block) {
    fail(`missing locale ${loc}`);
    continue;
  }
  if (block.headlines.length < 3) fail(`${loc} headlines ${block.headlines.length}`);
  if (!block.copy.trim()) fail(`${loc} empty copy`);
  if (!block.cta.trim()) fail(`${loc} empty cta`);
  const blob = `${block.headlines.join("\n")}\n${block.copy}\n${block.cta}`;
  if (countIncompleteMarkers(blob) > 0) fail(`${loc} markers in template: ${blob}`);
}
const heBlob = `${filled.locales?.he?.headlines.join(" ")}\n${filled.locales?.he?.copy}`;
if (!/מרפאת בדיקה|סאווק/.test(heBlob)) fail(`HE missing businessName: ${heBlob}`);
if (!/052-8885800/.test(`${heBlob}\n${filled.locales?.he?.copy}`)) fail(`HE missing phone`);
if (!/באקה/.test(heBlob) && !/באקה/.test(filled.locales?.he?.copy ?? "")) fail(`HE missing city`);
if (!/sawek\.example/.test(filled.locales?.he?.copy ?? "")) fail(`HE missing website`);
if (!/בלי תורים/.test(`${heBlob}\n${filled.locales?.he?.copy}`)) fail(`HE missing offer`);
if (!/08:00/.test(filled.locales?.he?.copy ?? "")) fail(`HE missing hours`);

function assertAnyBusinessFill(
  label: string,
  facts: Record<string, string>,
  expectVertical: ReturnType<typeof detectVertical>,
  must: RegExp,
  mustNot: RegExp,
) {
  const filledV = templateFillFromFacts({ facts });
  if (!filledV.ok) {
    fail(`${label} templateFill not ok`);
    return;
  }
  const v = detectVertical({
    businessName: facts.businessName || "",
    category: facts.category || "",
    description: facts.description || facts.offer || "",
  });
  if (v !== expectVertical) fail(`${label} detectVertical ${v} expected ${expectVertical}`);
  const blob = ["he", "ar", "en"]
    .map((loc) => {
      const b = filledV.locales?.[loc as "he" | "ar" | "en"];
      return `${b?.headlines.join(" ")}\n${b?.copy}\n${b?.cta}`;
    })
    .join("\n");
  if (countIncompleteMarkers(blob) > 0) fail(`${label} markers: ${blob}`);
  if (!must.test(blob)) fail(`${label} missing facts: ${blob.slice(0, 280)}`);
  if (mustNot.test(blob)) fail(`${label} leaked clinic/demo copy: ${blob.slice(0, 280)}`);
}

assertAnyBusinessFill(
  "grill",
  {
    businessName: "פיקציה גריל",
    category: "מסעדה",
    phone: "04-1234567",
    city: "באקה",
    offer: "1+1 היום",
    hours: "12:00–23:00",
    description: "גריל בשרים בבאקה",
  },
  "restaurant",
  /פיקציה גריל|04-1234567|1\s*\+\s*1/,
  /מרפאה|כללית|סאמר|הגיעו למרפאה|רופא ילדים/,
);
assertAnyBusinessFill(
  "sport-shop",
  {
    businessName: "אלוף ספורט",
    category: "בגדי ספורט",
    phone: "08-9336658",
    city: "באר שבע",
    description: "הנעלה, בגדי ספורט ומכשירי כושר",
    website: "https://www.alufsport.co.il/",
  },
  "retail",
  /אלוף ספורט|08-9336658|באר שבע/,
  /מרפאה|כללית|סאמר|הגיעו למרפאה|רופא ילדים/,
);
assertAnyBusinessFill(
  "school",
  {
    businessName: "בית ספר האור",
    category: "בית ספר",
    city: "באקה",
    description: "בית ספר מקומי",
  },
  "school",
  /בית ספר האור/,
  /מרפאה|כללית|סאמר|הגיעו למרפאה/,
);

async function main() {
  const result = await runGeminiGenerate({ facts });
  if (!result.ok) fail(`runGeminiGenerate not ok: ${JSON.stringify(result)}`);
  else {
    for (const loc of ["he", "ar", "en"] as const) {
      const block = result.locales?.[loc];
      if (!block?.headlines?.length || !block.copy || !block.cta) {
        fail(`generate ${loc} incomplete ${JSON.stringify(block)}`);
        continue;
      }
      const blob = `${block.headlines.join("\n")}\n${block.copy}\n${block.cta}`;
      const markers = countIncompleteMarkers(blob);
      if (markers > 1) fail(`generate ${loc} too many markers (${markers}): ${blob}`);
      if (!/052-8885800|באקה|sawek\.example|בלי תורים|08:00|מרפאת בדיקה/.test(blob)) {
        fail(`generate ${loc} unused facts: ${blob}`);
      }
    }
  }

  if (failures.length) {
    console.error("FAIL\n" + failures.join("\n"));
    process.exit(1);
  }
  console.log("PASS generate facts", {
    heHead: filled.locales?.he?.headlines[0],
    heCta: filled.locales?.he?.cta,
    generateOk: result.ok,
  });
}

void main();
