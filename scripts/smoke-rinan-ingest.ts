import { readFileSync } from "fs";
import { extractFieldsFromText } from "../lib/document-ingest";

const required = ["businessName", "location", "whatsapp", "clinicHours", "mainGoal"] as const;

function run(path: string) {
  const text = readFileSync(path, "utf8");
  const name = path.split("/").pop() || path;
  const out = extractFieldsFromText(text, name);
  const filled = Object.entries(out)
    .filter(([, v]) => String(v || "").trim())
    .map(([k, v]) => `${k}=${v}`);
  const missingReq = required.filter((k) => !String(out[k] || "").trim());
  const wa = String(out.whatsapp || "");
  const hours = String(out.clinicHours || "");
  const goal = String(out.mainGoal || "");
  const extraFail: string[] = [];
  if (!/050[-\s]?5598640/.test(wa)) extraFail.push(`whatsapp missing 050-5598640 (got ${JSON.stringify(wa)})`);
  if (!/08:00/.test(hours)) extraFail.push(`hours missing 08:00 (got ${JSON.stringify(hours)})`);
  if (!goal) extraFail.push("goal empty");
  // Do not invent: these are unlabeled in the Rinan fact files
  for (const k of ["operatingModel", "audience", "uniqueAdvantage", "landingLines", "website"] as const) {
    if (String(out[k] || "").trim()) extraFail.push(`invented ${k}=${JSON.stringify(out[k])}`);
  }
  return { path: name, out, filled, missingReq, extraFail };
}

const he = run("/workspace/rinan/facts-he.txt");
const ar = run("/workspace/rinan/facts-ar.txt");
const failures = [
  ...he.missingReq.map((k) => `HE missing ${k}`),
  ...he.extraFail.map((s) => `HE ${s}`),
  ...ar.missingReq.map((k) => `AR missing ${k}`),
  ...ar.extraFail.map((s) => `AR ${s}`),
];

console.log("=== facts-he.txt ===");
console.log(he.filled.join("\n") || "(none)");
console.log("=== facts-ar.txt ===");
console.log(ar.filled.join("\n") || "(none)");

if (failures.length) {
  console.error("FAIL\n" + failures.join("\n"));
  process.exit(1);
}
console.log("PASS rinan ingest: hours + whatsapp + goal (plus name/location/phone field)");
