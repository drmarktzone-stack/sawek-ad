/**
 * Orchestrator QA: one CampaignBrief drives CMO, ads, viral, calendar, images.
 * Fictional businesses only. No fake ROAS. Clinic must not grow restaurant hooks.
 */
import { emptyIntake } from "../lib/engine/validate";
import { assemblePack } from "../lib/engine/run";
import { validateIntake } from "../lib/engine/validate";
import { diagnose } from "../lib/engine/diagnose";
import { generateVariants } from "../lib/engine/copy";
import { buildPostingCalendar, buildPostingWeek } from "../lib/engine/posting-calendar";
import { attachResearchAndSync, contradictsVertical, heroIdeaOf } from "../lib/engine/campaign-orchestrator";
import { channelFields, isIncompleteMarker } from "../lib/channel-copy";
import { buildResearchSkeleton } from "../lib/engine/research-public";
import { PUBLISHED_DEMO_IDS } from "../lib/demo-catalog";
import type { CampaignPack, Intake, MarketResearch } from "../lib/types";

const failures: string[] = [];
function fail(m: string) {
  failures.push(m);
}

function packOf(intake: Intake): CampaignPack {
  const report = validateIntake(intake);
  return assemblePack(intake, {
    report,
    diagnosis: diagnose(intake, report),
    variants: generateVariants(intake),
    agentStatus: {
      intake: "complete",
      diagnostic: "complete",
      strategic: "complete",
      media: "complete",
      optimizer: "complete",
    },
  });
}

const clinic: Intake = {
  ...emptyIntake(),
  businessName: "מרפאת גבעה לילדים",
  category: "רופא ילדים",
  description: "מרפאת ילדים לפי סדר הגעה בבאקה אל-גרביה",
  location: "באקה אל-גרביה",
  clinicHours: "א׳–ה׳ 08:00–14:00",
  whatsapp: "050-1112233",
  audience: "הורים",
  biggestProblem: "תורים ארוכים בטלפון",
  uniqueAdvantage: "קבלה לפי סדר הגעה",
  mainGoal: "walk_in",
  offer: "אין מבצע",
};

const cafe: Intake = {
  ...emptyIntake(),
  businessName: "קפה גבעה",
  category: "בית קפה",
  description: "קפה שכונתי עם שולחנות בחוץ",
  location: "עין ברק",
  whatsapp: "052-7009999",
  audience: "שכנים",
  biggestProblem: "רעש של רשתות",
  uniqueAdvantage: "שולחן שקט בחוץ",
  mainGoal: "walk_in",
};

const clinicPack = packOf(clinic);
if (!clinicPack.brief?.heroIdeaId) fail("clinic pack missing CampaignBrief.heroIdeaId");
if (clinicPack.brief?.vertical !== "clinic") fail(`clinic vertical ${clinicPack.brief?.vertical}`);
const clinicHero = heroIdeaOf(clinicPack);
if (!clinicHero) fail("clinic missing hero idea");
if (clinicPack.viral?.idea && clinicHero && !clinicPack.viral.idea.includes(clinicHero.name.he.split(" ")[0]!)) {
  // viral idea should carry the hero name or hook
  if (!clinicPack.viral.idea.includes(clinicHero.hook.he.slice(0, 12))) {
    fail(`clinic viral idea not from hero: ${clinicPack.viral.idea} vs ${clinicHero.name.he}`);
  }
}
if (clinicPack.brief?.heroIdeaId !== clinicPack.cmoIdeas?.selected[0]?.id) {
  fail(`clinic hero ${clinicPack.brief?.heroIdeaId} != first CMO ${clinicPack.cmoIdeas?.selected[0]?.id}`);
}

const cal = buildPostingCalendar(clinicPack, "he", 30);
const week = buildPostingWeek(clinicPack, "he");
if (week.length !== 7) fail(`7-day calendar ${week.length}`);
if (cal.length !== 30) fail(`30-day calendar ${cal.length}`);
if (!cal[0]?.ideaName) fail("calendar day 1 missing ideaName");
if (clinicHero && cal[0].ideaName !== clinicHero.name.he) {
  fail(`calendar day 1 idea ${cal[0].ideaName} != hero ${clinicHero.name.he}`);
}

const clinicBlob = [
  clinicPack.brief?.coreMessage.he,
  clinicPack.viral?.idea,
  clinicHero?.hook.he,
  clinicHero?.name.he,
  cal.map((d) => `${d.ideaName} ${d.headline} ${d.body}`).join("\n"),
  clinicPack.variants.filter((v) => v.locale === "he").map((v) => `${v.headline} ${v.primaryText}`).join("\n"),
].join("\n");
if (contradictsVertical(clinicBlob, "clinic")) fail(`clinic leaked restaurant copy: ${clinicBlob.slice(0, 280)}`);
if (/pizza|פיצה|olive_table|hummus platter|טעימות זוגית/i.test(clinicBlob)) {
  fail(`clinic restaurant-hook salad: ${clinicBlob.slice(0, 280)}`);
}

const cafePack = packOf(cafe);
if (cafePack.brief?.vertical !== "restaurant") fail(`cafe vertical ${cafePack.brief?.vertical}`);
if (cafePack.cmoIdeas?.selected.some((i) => /olive_table|hummus|two_cover|same_day_calm|parent_radar/.test(i.id))) {
  fail(`cafe leaked clinic/olive platforms: ${cafePack.cmoIdeas?.selected.map((i) => i.id).join(",")}`);
}
const cafeCal = buildPostingCalendar(cafePack, "he", 7);
const cafeBlob = [
  cafePack.viral?.idea,
  cafePack.cmoIdeas?.selected.map((i) => i.id).join(","),
  cafeCal.map((d) => d.ideaName).join(" "),
].join("\n");
if (/הילד חולה|pediatric|מרפאת ילדים|olive_table/.test(cafeBlob)) {
  fail(`cafe leaked clinic/olive: ${cafeBlob}`);
}

for (const loc of ["he", "ar", "en"] as const) {
  const f = channelFields(clinicPack, loc);
  if (isIncompleteMarker(f.headline, loc)) fail(`${loc} clinic headline incomplete despite name+phone`);
  if (/\[יש להשלים\]|\[يجب الاستكمال\]|\[TO COMPLETE\]/.test(`${f.headline}\n${f.cta}\n${f.pageName}`)) {
    fail(`${loc} incomplete wall despite name+phone: ${f.headline}`);
  }
}

if (!clinicPack.brief?.imageQueries.length) fail("clinic brief missing imageQueries");
if (clinicPack.brief?.imageQueries.some((q) => /pizza/i.test(q))) {
  fail(`clinic image queries leaked pizza: ${clinicPack.brief.imageQueries.join(" | ")}`);
}

const skeleton = buildResearchSkeleton(clinic);
if (skeleton.fetched) fail("skeleton should start unfetched");
const notes: MarketResearch = {
  ...skeleton,
  fetched: true,
  grounded: true,
  notes: [
    {
      title: { he: "ספרייה ציבורית", ar: "مكتبة عامة", en: "Public library" },
      note: { he: "דוגמה ציבורית מהספרייה", ar: "مثال عام من المكتبة", en: "Public library example" },
      sourceUrl: "https://www.facebook.com/ads/library",
      asOf: "2026-09-07",
    },
  ],
};
const synced = attachResearchAndSync(clinicPack, notes);
if (synced.brief?.heroIdeaId !== clinicPack.brief?.heroIdeaId) {
  fail("research overlay changed hero idea id");
}
if (synced.cmoIdeas?.selected[0]?.id !== clinicPack.cmoIdeas?.selected[0]?.id) {
  fail("research overlay re-picked CMO ideas");
}
if (!synced.cmoIdeas?.groundedNotes?.length) fail("research notes not attached to CMO pack");
if (/ROAS\s*[:=]\s*\d/.test(JSON.stringify(synced.cmoIdeas))) fail("fake ROAS after research sync");

if (PUBLISHED_DEMO_IDS.length !== 3) fail(`demo count ${PUBLISHED_DEMO_IDS.length}`);

if (failures.length) {
  console.error("FAIL\n" + failures.join("\n"));
  process.exit(1);
}
console.log("PASS orchestrator", {
  clinicHero: clinicHero?.id,
  clinicViral: clinicPack.viral?.idea,
  day1: cal[0]?.ideaName,
  cafeIdeas: cafePack.cmoIdeas?.selected.map((i) => i.id),
  imageQ: clinicPack.brief?.imageQueries.slice(0, 3),
});
