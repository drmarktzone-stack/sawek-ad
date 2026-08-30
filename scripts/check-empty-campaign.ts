import { emptyIntake } from "../lib/engine/validate";
import { demoIntake } from "../lib/demo";
import { loadDraft, saveDraft, loadCampaigns, saveCampaigns } from "../lib/storage";
import {
  markEmptyCampaign,
  wantsEmptyCampaign,
  clearEmptyCampaign,
  applyEmptyCampaignHydrate,
  EMPTY_CAMPAIGN_KEY,
} from "../lib/empty-campaign";
import { t } from "../lib/i18n";
import type { CampaignPack } from "../lib/types";

const mem = new Map<string, string>();
const session = new Map<string, string>();

function makeStorage(map: Map<string, string>): Storage {
  return {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => {
      map.set(k, String(v));
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
    clear: () => {
      map.clear();
    },
    key: (i: number) => [...map.keys()][i] ?? null,
    get length() {
      return map.size;
    },
  } as Storage;
}

const localStorageMock = makeStorage(mem);
const sessionStorageMock = makeStorage(session);
const g = globalThis as unknown as {
  window: { localStorage: Storage; sessionStorage: Storage; location: { search: string }; dispatchEvent: (e: Event) => boolean };
  localStorage: Storage;
  sessionStorage: Storage;
};
g.localStorage = localStorageMock;
g.sessionStorage = sessionStorageMock;
g.window = {
  localStorage: localStorageMock,
  sessionStorage: sessionStorageMock,
  location: { search: "" },
  dispatchEvent: () => true,
};

const failures: string[] = [];
function fail(msg: string) {
  failures.push(msg);
}

if (t("he", "cta.new") !== "קמפיין חדש") fail(`cta.new he=${t("he", "cta.new")}`);
if (t("ar", "cta.newOther") !== "حملة جديدة لمحل آخر") fail(`cta.newOther ar=${t("ar", "cta.newOther")}`);
if (t("en", "cta.newOther") !== "New campaign for another business") fail(`cta.newOther en=${t("en", "cta.newOther")}`);
if (!/My Campaigns|form fields will empty/i.test(t("en", "cta.newHint"))) fail(`cta.newHint en=${t("en", "cta.newHint")}`);
if (!/הקמפיינים שלי/.test(t("he", "cta.newHint"))) fail(`cta.newHint he missing My Campaigns`);

const clinic = demoIntake("he");
saveDraft({ intake: clinic, step: 4, phase: "agents" });
const savedPack = {
  id: "pack-keep-me",
  name: clinic.businessName,
  saved: true,
} as CampaignPack;
saveCampaigns([savedPack]);

markEmptyCampaign();
if (!wantsEmptyCampaign()) fail("wantsEmptyCampaign should be true after markEmptyCampaign");
if (mem.get(EMPTY_CAMPAIGN_KEY) !== "1") fail("EMPTY_CAMPAIGN_KEY not set");
const afterMark = loadDraft();
if (String(afterMark.intake.businessName || "").trim()) {
  fail(`draft still has businessName after mark ${JSON.stringify(afterMark.intake.businessName)}`);
}
if (afterMark.step !== 1) fail(`draft step after mark ${afterMark.step}`);
if (loadCampaigns().some((c) => c.id === "pack-keep-me") === false) {
  fail("published/saved pack was deleted");
}

const hydrated = applyEmptyCampaignHydrate();
if (hydrated.step !== 1) fail(`hydrate step ${hydrated.step}`);
if (hydrated.phase !== "wizard") fail(`hydrate phase ${hydrated.phase}`);
const ei = emptyIntake();
for (const key of Object.keys(ei) as (keyof typeof ei)[]) {
  const got = JSON.stringify(hydrated.intake[key]);
  const exp = JSON.stringify(ei[key]);
  if (got !== exp) fail(`hydrate intake.${String(key)}=${got} expected ${exp}`);
}
if (hydrated.intake.businessName) fail("hydrate leftover businessName");
if (hydrated.intake.clinicHours) fail("hydrate leftover clinicHours");
if (hydrated.intake.kupaFileBy || hydrated.intake.kupaMemberFrom) fail("hydrate leftover kupa");
if (/סאמר|أبو مخ|Abu Mokh|clalit|כללית/i.test(JSON.stringify(hydrated.intake))) {
  fail("hydrate clinic leftover in intake");
}
if (wantsEmptyCampaign()) fail("wantsEmptyCampaign should be false after applyEmptyCampaignHydrate");

const typed = { ...emptyIntake(), businessName: "עיר המותגים" };
saveDraft({ intake: typed, step: 1, phase: "wizard" });
const second = loadDraft();
if (second.intake.businessName !== "עיר המותגים") {
  fail(`second loadDraft lost typed name ${JSON.stringify(second.intake.businessName)}`);
}
if (wantsEmptyCampaign()) {
  fail("second load would skipDemo-wipe because empty flag still set");
}

clearEmptyCampaign();
if (wantsEmptyCampaign()) fail("clearEmptyCampaign did not drop flag");

if (loadCampaigns().some((c) => c.id === "pack-keep-me") === false) {
  fail("saved pack missing after empty hydrate");
}

if (failures.length) {
  console.error("FAIL\n" + failures.join("\n"));
  process.exit(1);
}
console.log("PASS empty campaign: wipe draft, keep saved pack, clear flag so typed name persists");
