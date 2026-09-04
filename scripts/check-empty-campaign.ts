import { emptyIntake } from "../lib/engine/validate";
import { demoIntake } from "../lib/demo";
import { loadDraft, saveDraft, loadCampaigns, saveCampaigns } from "../lib/storage";
import {
  markEmptyCampaign,
  wantsEmptyCampaign,
  clearEmptyCampaign,
  applyEmptyCampaignHydrate,
  EMPTY_CAMPAIGN_KEY,
  releaseEmptyIfTypedName,
} from "../lib/empty-campaign";
import { draftLeaksClinic } from "../lib/clinic-leak";
import { t } from "../lib/i18n";
import type { CampaignPack } from "../lib/types";
import { bodyHasFacts } from "../lib/engine/gemini-generate";
import { filterCustomerCampaigns, isBannedCustomerSample, isAllowedPublishedDemoId } from "../lib/sample-packs";
import { readFileSync } from "fs";
import { join } from "path";

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
  window: {
    localStorage: Storage;
    sessionStorage: Storage;
    location: { search: string; href: string; pathname: string };
    history: { replaceState: () => void; state: unknown };
    dispatchEvent: (e: Event) => boolean;
  };
  localStorage: Storage;
  sessionStorage: Storage;
};
g.localStorage = localStorageMock;
g.sessionStorage = sessionStorageMock;
g.window = {
  localStorage: localStorageMock,
  sessionStorage: sessionStorageMock,
  location: { search: "?demo=samer", href: "http://local/?demo=samer", pathname: "/" },
  history: { replaceState: () => undefined, state: null },
  dispatchEvent: () => true,
};

const failures: string[] = [];
function fail(msg: string) {
  failures.push(msg);
}

if (t("he", "cta.new") !== "קמפיין חדש") fail(`cta.new he=${t("he", "cta.new")}`);
if (t("ar", "cta.newOther") !== "حملة جديدة لمحل آخر") fail(`cta.newOther ar=${t("ar", "cta.newOther")}`);
if (t("en", "cta.newOther") !== "New campaign for another business") fail(`cta.newOther en=${t("en", "cta.newOther")}`);
if (t("he", "biz.whatsappPh") === "052-8885800") fail("whatsapp placeholder leaked clinic phone");
if (/052-8885800|مجمع النور|אל-נור/.test(t("he", "biz.hoursPh") + t("ar", "biz.hoursPh") + t("en", "biz.hoursPh"))) {
  fail("hours placeholder leaked clinic address");
}
if (/מרפאה|عيادة|clinic campaign/i.test(t("he", "gemini.waitFacts") + t("ar", "gemini.waitFacts") + t("en", "gemini.waitFacts"))) {
  fail("gemini.waitFacts still frames an empty clinic campaign");
}
if (!/לכל עסק|لكل شغل|any business/i.test(t("he", "home.pitch") + t("ar", "home.pitch") + t("en", "home.pitch"))) {
  fail("home.pitch must say the product is for any business");
}
if (!/חנויות|محلات|Shops/.test(t("he", "home.atmosphere") + t("ar", "home.atmosphere") + t("en", "home.atmosphere"))) {
  fail("home.atmosphere must stay any-business");
}
if (!/My Campaigns|form fields will empty/i.test(t("en", "cta.newHint"))) fail(`cta.newHint en=${t("en", "cta.newHint")}`);
if (!/הקמפיינים שלי/.test(t("he", "cta.newHint"))) fail(`cta.newHint he missing My Campaigns`);
if (!/Vertex/.test(t("he", "gemini.vertex"))) fail(`gemini.vertex ${t("he", "gemini.vertex")}`);
if (t("he", "gemini.quota") !== "אין מכסה") fail(`gemini.quota ${t("he", "gemini.quota")}`);

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
if (session.get(EMPTY_CAMPAIGN_KEY) !== "1") fail("session EMPTY_CAMPAIGN_KEY not set");
const afterMark = loadDraft();
if (String(afterMark.intake.businessName || "").trim()) {
  fail(`draft still has businessName after mark ${JSON.stringify(afterMark.intake.businessName)}`);
}
if (afterMark.step !== 1) fail(`draft step after mark ${afterMark.step}`);
if (loadCampaigns().some((c) => c.id === "pack-keep-me") === false) {
  fail("published/saved pack was deleted");
}
const afterBlob = JSON.stringify(afterMark);
if (draftLeaksClinic(afterMark) || /052-8885800|drsamerped|אבו מוך/.test(afterBlob)) {
  fail(`loadDraft after markEmpty leaked clinic: ${afterBlob.slice(0, 400)}`);
}

saveDraft({ intake: clinic, step: 4, phase: "agents" });
const guarded = loadDraft();
if (draftLeaksClinic(guarded) || String(guarded.intake.businessName || "").trim()) {
  fail("saveDraft during empty session restored clinic");
}
if (/052-8885800|drsamerped|אבו מוך/.test(JSON.stringify(guarded))) {
  fail("guarded draft still has clinic tokens");
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
if (hydrated.intake.audience) fail("hydrate leftover audience chip");
if (hydrated.intake.biggestProblem) fail("hydrate leftover problem chip");
if (hydrated.intake.channelNotes) fail("hydrate leftover channelNotes");
if (/סאמר|أبو مخ|Abu Mokh|clalit|כללית|052-8885800|drsamerped|אבו מוך/.test(JSON.stringify(hydrated.intake))) {
  fail("hydrate clinic leftover in intake");
}
if (!wantsEmptyCampaign()) fail("empty flag must stay sticky after applyEmptyCampaignHydrate");

const remount = loadDraft();
if (draftLeaksClinic(remount) || remount.intake.businessName) {
  fail("remount loadDraft restored clinic after hydrate");
}

const typed = { ...emptyIntake(), businessName: "עיר המותגים" };
if (!releaseEmptyIfTypedName(typed.businessName)) fail("typed new name should release empty session");
saveDraft({ intake: typed, step: 1, phase: "wizard" });
const second = loadDraft();
if (second.intake.businessName !== "עיר המותגים") {
  fail(`second loadDraft lost typed name ${JSON.stringify(second.intake.businessName)}`);
}
if (wantsEmptyCampaign()) {
  fail("empty flag should drop after a new business name");
}

clearEmptyCampaign();
if (wantsEmptyCampaign()) fail("clearEmptyCampaign did not drop flag");

if (loadCampaigns().some((c) => c.id === "pack-keep-me") === false) {
  fail("saved pack missing after empty hydrate");
}

if (
  !isBannedCustomerSample({ id: "x", name: "יקב היין", intake: { businessName: "יקב היין" } }) ||
  !isBannedCustomerSample({ id: "x", name: "עיר המותגים", intake: { businessName: "עיר המותגים" } }) ||
  !isBannedCustomerSample({ id: "x", name: "קינג סטור", intake: { businessName: "קינג סטור" } }) ||
  !isBannedCustomerSample({ id: "rinan-he", name: "רינאן ספורט", intake: { businessName: "בריכת רינאן" } }) ||
  !isBannedCustomerSample({ id: "e3e112bd-d36a-4a10-8b5f-fccf4edfd83d", name: "pedi-guide" })
) {
  fail("banned sample packs must be detected");
}
if (isBannedCustomerSample({ id: "demo-samer-clinic", name: "د. سامر محمد أبو مخ" })) {
  fail("clinic demo must stay allowed");
}
const filtered = filterCustomerCampaigns([
  { id: "demo-samer-clinic", name: "clinic" },
  { id: "wine-1", name: "יקב היין" },
  { id: "keep-me", name: "סטודיו נועה" },
]);
if (filtered.some((p) => p.id === "wine-1")) fail("wine sample still in customer list");
if (!filtered.some((p) => p.id === "keep-me")) fail("real campaign was filtered");
if (!filtered.some((p) => p.id === "demo-samer-clinic")) fail("clinic demo filtered from allow-list helper");

const publishedRaw = JSON.parse(readFileSync(join(__dirname, "../public/packs/published.json"), "utf8")) as
  | { id?: string }[]
  | { packs?: { id?: string }[] };
const publishedList = Array.isArray(publishedRaw) ? publishedRaw : publishedRaw.packs ?? [];
const packIds = publishedList.map((p) => String(p.id ?? ""));
if (packIds.length !== 1 || packIds[0] !== "demo-samer-clinic") {
  fail(`published.json must contain only demo-samer-clinic, got ${JSON.stringify(packIds)}`);
}
if (!isAllowedPublishedDemoId("demo-samer-clinic")) fail("clinic demo id rejected");

if (bodyHasFacts({})) fail("empty body should not look like facts");
if (bodyHasFacts({ description: "", audience: "" })) fail("blank description is not facts");
if (!bodyHasFacts({ description: "מכולת שכונתית בחיפה", audience: "neighbors" })) {
  fail("typed facts should pass bodyHasFacts");
}

if (failures.length) {
  console.error("FAIL\n" + failures.join("\n"));
  process.exit(1);
}
console.log("PASS empty campaign: wipe draft, keep saved pack, sticky empty until new name, no clinic leak");
