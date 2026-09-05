/**
 * Demo CMO desk + photos must be complete. New Campaign stays wiped.
 * No fake ROAS / star ratings / like counts as performance claims.
 */
import { existsSync, statSync } from "fs";
import { join } from "path";
import { demoIntake, applyCatalogDemoDraft, isAnyDemoIntake } from "../lib/demo";
import { oliveKitchenIntake, sandBoutiqueIntake, DEMO_ID, DEMO_OLIVE_ID, DEMO_SAND_ID } from "../lib/demo-catalog";
import { isDemoCmoComplete } from "../lib/demo-cmo";
import { demoPhotoManifest, type DemoAssetId } from "../lib/demo-assets";
import { cmoFieldsMissing, emptyIntake, validateIntake } from "../lib/engine/validate";
import { markEmptyCampaign, applyEmptyCampaignHydrate, clearEmptyCampaign } from "../lib/empty-campaign";

const failures: string[] = [];
function fail(m: string) {
  failures.push(m);
}

const mem = new Map<string, string>();
const session = new Map<string, string>();
function makeStorage(map: Map<string, string>): Storage {
  return {
    getItem: (k) => (map.has(k) ? map.get(k)! : null),
    setItem: (k, v) => {
      map.set(k, String(v));
    },
    removeItem: (k) => {
      map.delete(k);
    },
    clear: () => map.clear(),
    key: (i) => [...map.keys()][i] ?? null,
    get length() {
      return map.size;
    },
  } as Storage;
}
const g = globalThis as unknown as {
  localStorage: Storage;
  sessionStorage: Storage;
  window: {
    localStorage: Storage;
    sessionStorage: Storage;
    location: { search: string; href: string; pathname: string };
    history: { replaceState: () => void; state: unknown };
    dispatchEvent: (e: Event) => boolean;
  };
};
g.localStorage = makeStorage(mem);
g.sessionStorage = makeStorage(session);
g.window = {
  localStorage: g.localStorage,
  sessionStorage: g.sessionStorage,
  location: { search: "", href: "http://local/", pathname: "/" },
  history: { replaceState: () => undefined, state: null },
  dispatchEvent: () => true,
};

const rows: { id: DemoAssetId; intake: ReturnType<typeof demoIntake> }[] = [
  { id: DEMO_ID, intake: demoIntake("he") },
  { id: DEMO_OLIVE_ID, intake: oliveKitchenIntake("he") },
  { id: DEMO_SAND_ID, intake: sandBoutiqueIntake("he") },
];

for (const loc of ["he", "ar", "en"] as const) {
  const clinic = demoIntake(loc);
  const olive = oliveKitchenIntake(loc);
  const sand = sandBoutiqueIntake(loc);
  for (const [id, intake] of [
    [DEMO_ID, clinic],
    [DEMO_OLIVE_ID, olive],
    [DEMO_SAND_ID, sand],
  ] as const) {
    if (!isDemoCmoComplete(intake)) fail(`${id} ${loc} CMO incomplete`);
    if (cmoFieldsMissing(intake)) fail(`${id} ${loc} cmoFieldsMissing`);
    const missing = validateIntake(intake).missing.map((m) => m.field);
    for (const field of ["businessModel", "monthlyBudget", "pastAds"]) {
      if (missing.includes(field)) fail(`${id} ${loc} still missing ${field}`);
    }
    if (id !== DEMO_ID) {
      for (const field of ["avgOrderValue", "marginPercent", "targetCac"]) {
        if (missing.includes(field)) fail(`${id} ${loc} still missing ${field}`);
      }
    }
    const photos = (intake.mediaAssets ?? []).filter((a) => a.kind === "image" && a.publicSrc && !/\.svg$/i.test(a.publicSrc));
    if (photos.length < 4) fail(`${id} ${loc} photos ${photos.length}`);
    const blob = `${intake.businessModel}\n${intake.pastResults}\n${intake.pastAds}`;
    if (/ROAS\s*[:=]\s*\d|★{2,}|\bstars?\s*[:=]\s*\d|likes?\s*[:=]\s*\d/i.test(blob)) {
      fail(`${id} ${loc} invented performance claim`);
    }
  }
}

for (const { id } of rows) {
  for (const row of demoPhotoManifest(id)) {
    const abs = join(process.cwd(), "public/packs/assets", id, row.file);
    if (!existsSync(abs) || statSync(abs).size < 8000) fail(`photo missing/tiny ${abs}`);
  }
}

clearEmptyCampaign();
const loaded = applyCatalogDemoDraft("sand", "he");
if (!loaded || !isAnyDemoIntake(loaded) || cmoFieldsMissing(loaded)) {
  fail("applyCatalogDemoDraft sand did not hydrate CMO");
}

markEmptyCampaign();
const blank = applyEmptyCampaignHydrate();
const empty = emptyIntake();
if (blank.intake.businessName) fail("new campaign leaked name");
if (blank.intake.businessModel || blank.intake.monthlyBudget || blank.intake.pastAds) {
  fail("new campaign leaked CMO desk");
}
if ((blank.intake.mediaAssets ?? []).length) fail("new campaign leaked photos");
if (JSON.stringify(blank.intake.businessName) !== JSON.stringify(empty.businessName)) {
  fail("new campaign not wiped");
}
clearEmptyCampaign();

if (failures.length) {
  console.error("FAIL\n" + failures.join("\n"));
  process.exit(1);
}
console.log("PASS demo CMO desks + photos; new campaign wiped");
