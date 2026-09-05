/**
 * Viral desk: voice, 7 scripts, carousel, bios, 30-day calendar,
 * honest remix fallback, heuristic video analysis.
 * No fake ROAS / likes / Hook Rate / Avg Watch / Retention Curve.
 */
import { oliveKitchenIntake, sandBoutiqueIntake, DEMO_ID, DEMO_OLIVE_ID, DEMO_SAND_ID } from "../lib/demo-catalog";
import { demoIntake } from "../lib/demo";
import { emptyIntake, validateIntake } from "../lib/engine/validate";
import { generateVariants } from "../lib/engine/copy";
import { assemblePack } from "../lib/engine/run";
import { diagnose } from "../lib/engine/diagnose";
import { buildPostingCalendar } from "../lib/engine/posting-calendar";
import { applyVoiceToIntake, voiceFromIntake, voiceIsSaved } from "../lib/engine/voice";
import {
  analysisDisclaimer,
  buildBioPack,
  buildCarouselPack,
  buildTrendPack,
  buildVideoAnalysis,
  buildViralScripts,
  packViralBlob,
  remixFromSource,
  remixNeedTranscript,
  viralTextForbidden,
} from "../lib/engine/viral-content";
import type { Intake } from "../lib/types";

const failures: string[] = [];
function fail(m: string) {
  failures.push(m);
}

const FAKE = /ROAS|Hook Rate|Avg Watch|Retention Curve|followers?|likes?/i;

const olive = oliveKitchenIntake("he");
const sand = sandBoutiqueIntake("en");
const clinic = demoIntake("ar");

if (!voiceIsSaved(voiceFromIntake(olive))) fail("olive demo voice not saved");
if (!voiceIsSaved(voiceFromIntake(sand))) fail("sand demo voice not saved");
if (!voiceIsSaved(voiceFromIntake(clinic))) fail("clinic demo voice not saved");
if (olive.voice?.dialect !== "he") fail(`olive he dialect ${olive.voice?.dialect}`);
if (sand.voice?.dialect !== "en") fail(`sand en dialect ${sand.voice?.dialect}`);
if (clinic.voice?.dialect !== "ar-levant") fail(`clinic ar dialect ${clinic.voice?.dialect}`);

const blank = emptyIntake();
if (voiceIsSaved(voiceFromIntake(blank))) fail("empty intake should not have a saved voice");
if (blank.voice?.niche) fail("empty voice niche not blank");

const saved = applyVoiceToIntake(blank, {
  niche: "בוטיק בדיוני לחולצות פשתן",
  coreMessage: "מתלה אחד מדויק — בלי קטלוג מנופח.",
  personalVoice: "רגוע, קצר, בלי סלנג קניון.",
  dialect: "he",
});
if (!voiceIsSaved(voiceFromIntake(saved))) fail("voice save did not stick");
if (saved.brandTone !== "רגוע, קצר, בלי סלנג קניון.") fail("personal voice should copy into brandTone");

const idea = "שולחן ריק בשקיעה — הזמנה בוואטסאפ";
const scripts = buildViralScripts(olive, idea, "he");
if (scripts.scripts.length !== 7) fail(`scripts ${scripts.scripts.length}`);
const styleIds = scripts.scripts.map((s) => s.id).sort().join(",");
if (!styleIds.includes("quiet_catalyst") || !styleIds.includes("data") || !styleIds.includes("trend")) {
  fail(`missing styles ${styleIds}`);
}
for (const s of scripts.scripts) {
  if (!s.hook.trim() || !s.spoken.trim() || !s.cta.trim()) fail(`thin script ${s.id}`);
  if (!s.spoken.includes("Olive") && !s.spoken.includes("זית") && !/מטבח|נווה|שקד|ים-תיכונ/.test(`${s.hook} ${s.spoken}`)) {
    /* olive HE name is מטבח הזית — require some fact */
    if (!/זית|שקד|ים-תיכונ|וואטסאפ|052/.test(`${s.hook} ${s.spoken} ${s.cta}`)) {
      fail(`script ${s.id} missing olive facts: ${s.spoken.slice(0, 80)}`);
    }
  }
}
const scriptBlob = packViralBlob({ scripts });
if (FAKE.test(scriptBlob) || viralTextForbidden(scriptBlob)) fail("scripts leaked fake metrics");

const arScripts = buildViralScripts(clinic, "وصول حسب الدور", "ar");
if (arScripts.scripts.length !== 7) fail("ar scripts");
if (!/باقة|أطفال|دور|واتساب/.test(packViralBlob({ scripts: arScripts }))) fail("clinic AR scripts missing facts");

const carousel = buildCarouselPack(olive, idea, "he");
if (carousel.slides.length < 6) fail(`carousel slides ${carousel.slides.length}`);
if (!carousel.caption.trim()) fail("carousel caption empty");
if (FAKE.test(packViralBlob({ carousel }))) fail("carousel fake metrics");

const biosHe = buildBioPack(olive, "he");
const biosAr = buildBioPack(olive, "ar");
const biosEn = buildBioPack(sand, "en");
for (const [label, bio] of [
  ["he", biosHe],
  ["ar", biosAr],
  ["en", biosEn],
] as const) {
  if (!bio.instagram || !bio.tiktok || !bio.facebook) fail(`${label} bio missing platform`);
  if (bio.instagram.length > 160) fail(`${label} ig bio too long ${bio.instagram.length}`);
  if (FAKE.test(`${bio.instagram} ${bio.tiktok} ${bio.facebook}`)) fail(`${label} bio fake metrics`);
}
if (!/Olive|זית|שקד/.test(biosHe.instagram + biosHe.linkedin)) fail("olive bio missing name/place");
if (!/Sand|Barak|linen|rack|بوتيك|חול/.test(biosEn.instagram + biosEn.linkedin)) fail("sand EN bio missing facts");

const trends = buildTrendPack(olive, "en", "2026-09-05T00:00:00.000Z");
if (trends.angles.length < 5) fail("trends too few");
if (!/2026-09-05/.test(trends.disclaimer)) fail("trends missing as-of date");
if (!/not a live trending chart/i.test(trends.disclaimer)) fail("trends missing honesty label");
if (FAKE.test(packViralBlob({ trends }))) fail("trends fake metrics");

const need = remixNeedTranscript("en", "https://tiktok.com/@private/video/1");
if (need.status !== "need_transcript") fail("remix without text should need transcript");
if (/watched the video/i.test(need.note) && /private/.test(need.note) === false) {
  /* note must refuse claiming we watched */
}
if (!/will not claim we watched/i.test(need.note)) fail("remix fallback must refuse watching a private video");

const remixed = remixFromSource(olive, "he", {
  sourceText: "Nobody tells you this about weeknight tables — empty terrace at dusk.",
  sourceUrl: "https://example.com/public-reel",
});
if (remixed.status !== "ok" || !remixed.script) fail("remix from transcript failed");
if (!/לא טענו שצפינו|did not claim to watch/i.test(remixed.note)) fail("remix note must refuse a private-watch claim");
if (FAKE.test(remixed.script?.spoken ?? "")) fail("remix fake metrics");

const analysis = buildVideoAnalysis(olive, "en", {
  caption: "Empty dusk terrace. Book the table on WhatsApp.",
  durationSec: 14,
  hasFrame: true,
});
if (analysis.kind !== "planning_heuristic") fail("analysis kind");
if (analysis.hookPotential < 1 || analysis.hookPotential > 100) fail("hook score range");
if (!/planning \/ heuristic/i.test(analysis.disclaimer)) fail("analysis missing heuristic label");
if (!/not live TikTok\/IG Hook Rate/i.test(analysis.disclaimer)) fail("analysis must name-and-reject platform metrics");
if (/\b\d{2,3}%\s*(Hook Rate|Avg Watch)\b/i.test(analysis.notes.join(" "))) {
  fail("analysis used platform metric names as if live");
}
const noCaption = buildVideoAnalysis(emptyIntake(), "he", {});
if (noCaption.usedCaption) fail("empty analysis should not mark caption used");
if (!analysisDisclaimer("he").includes("תכנון")) fail("he disclaimer");

function packOf(intake: Intake) {
  return assemblePack(intake, {
    report: validateIntake(intake),
    diagnosis: diagnose(intake, validateIntake(intake)),
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

for (const [id, intake] of [
  [DEMO_ID, clinic],
  [DEMO_OLIVE_ID, olive],
  [DEMO_SAND_ID, sand],
] as const) {
  const pack = packOf(intake);
  const month = buildPostingCalendar(pack, "he", 30);
  if (month.length !== 30) fail(`${id} calendar ${month.length}`);
  if (month[0].channel !== "facebook" || month[1].channel !== "instagram") fail(`${id} week1 order`);
  if (!month.some((d) => d.kind === "carousel")) fail(`${id} missing carousel days`);
  if (!month.some((d) => d.kind === "script")) fail(`${id} missing script days`);
  const blob = month.map((d) => `${d.headline} ${d.body} ${d.cta}`).join("\n");
  if (FAKE.test(blob) && /ROAS|Hook Rate/.test(blob)) fail(`${id} calendar fake metrics`);
  if (/best time|שעה הכי|أفضل وقت/i.test(blob)) fail(`${id} invented best-time`);
}

const ids = [DEMO_ID, DEMO_OLIVE_ID, DEMO_SAND_ID];
if (ids.includes("demo-pizza" as never) || ids.includes("demo-aluf" as never)) fail("banned demo id");

if (failures.length) {
  console.error("FAIL\n" + failures.join("\n"));
  process.exit(1);
}
console.log("PASS viral desk");
console.log("scripts", scripts.scripts.map((s) => s.id).join(","));
console.log("carousel slides", carousel.slides.length);
console.log("calendar days", 30);
console.log("analysis", analysis.hookPotential, analysis.clarity, analysis.ctaClarity);
