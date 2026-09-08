/**
 * Copy quality system — purity gate, locale isolation, no strategy-label ads.
 * Deterministic. No Vertex.
 */
import { emptyIntake } from "../lib/engine/validate";
import { assemblePack } from "../lib/engine/run";
import { validateIntake } from "../lib/engine/validate";
import { diagnose } from "../lib/engine/diagnose";
import { generateVariants } from "../lib/engine/copy";
import { channelFields } from "../lib/channel-copy";
import { produceAd } from "../lib/engine/produce-ad";
import { generateHsoStudio } from "../lib/engine/hso-studio";
import { applyOfferToIntake, skipOfferBlueprint } from "../lib/engine/offer-builder";
import { extractDna, workspaceFromPack, buildKnowledge } from "../lib/scientist/engines";
import { demoIntake } from "../lib/demo";
import { copyLeaksClinic, PEDIATRIC_CLINIC_COPY_RE } from "../lib/clinic-leak";
import {
  COPY_LEAK_PHRASES,
  customerCopyHasLeak,
  customerCopyLeakHits,
  gateCustomerAd,
  HE_SCRIPT,
  localeScriptBleed,
  factSpamHits,
} from "../lib/copy-purity";
import { composeCoreMessage } from "../lib/engine/core-message";
import { VOICE_DIALECTS, defaultDialectForLocale, effectiveDialect } from "../lib/engine/voice";
import type { CampaignPack, Intake, Locale } from "../lib/types";

const failures: string[] = [];
function fail(m: string) {
  failures.push(m);
}

function packOf(intake: Intake, id?: string): CampaignPack {
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
    ...(id ? { id } : {}),
  });
}

function meshhdawi(): Intake {
  return {
    ...emptyIntake(),
    businessName: "مخبز المشهداوي",
    category: "مخبز",
    description: "مخبز في الناصرة — خبز ومعجنات",
    location: "شارع البشارة 49، الناصرة",
    whatsapp: "050-5286676",
    website: "https://meshhdawi.com",
    audience: "ناس المنطقة",
    biggestProblem: "unknown",
    uniqueAdvantage: "",
    mainGoal: "walk_in",
    offer: "no_offer",
  };
}

function fashion(): Intake {
  return {
    ...emptyIntake(),
    businessName: "עיר המותגים",
    category: "אופנה",
    description: "חנות מותגים ושופינג",
    location: "באקה",
    website: "https://www.aam.co.il",
    audience: "women",
    biggestProblem: "מחפשים מותגים במקום אחד",
    uniqueAdvantage: "קניון מותגים בבאקה",
    mainGoal: "leads",
    offer: "משלוח חינם מעל 500",
  };
}

function englishShop(): Intake {
  return {
    ...emptyIntake(),
    businessName: "Hilltop Bread",
    category: "bakery",
    description: "Neighborhood sourdough bakery",
    location: "12 Oak Street, Haifa",
    website: "https://hilltop.example",
    whatsapp: "050-9998877",
    audience: "neighbors",
    biggestProblem: "unknown",
    uniqueAdvantage: "stone oven every morning",
    mainGoal: "walk_in",
    offer: "no_offer",
  };
}

function adBlob(pack: CampaignPack, locale: Locale): string {
  const ads = pack.variants.filter((v) => v.locale === locale);
  const complete = pack.completeAd?.locales[locale];
  const ch = channelFields(pack, locale);
  return [
    ...ads.map((v) => `${v.headline}\n${v.primaryText}\n${v.cta}`),
    complete ? `${complete.headline}\n${complete.copy}\n${complete.cta}\n${complete.hook}` : "",
    `${ch.headline}\n${ch.body}\n${ch.cta}\n${ch.caption}`,
  ].join("\n");
}

// --- Gate rejects planted meta ---
const planted = gateCustomerAd(
  {
    headline: "المشكلة المعطاة — بكلام الزبون",
    body: "مرآة المشكلة – المشكلة المعطاة\nالفنجان كافتتاح\nفقط القنوات المعطاة — بلا تيك توك مختلق",
    cta: "مش إعلان عام",
  },
  meshhdawi(),
  "ar",
);
if (!planted.repaired && planted.ok) fail("gate must reject planted meta headlines");
if (customerCopyHasLeak(planted.headline) || customerCopyHasLeak(planted.body)) {
  fail(`gate returned leaked text: ${planted.headline} / ${planted.body}`);
}
if (!/خبز|مخبز|طازج/.test(planted.headline + planted.body)) {
  fail(`AR bakery fallback not natural: ${planted.headline} ${planted.body}`);
}

const plantedHe = gateCustomerAd(
  { headline: "הבעיה שסופקה — במילים של הלקוח", body: "רק הערוצים שסופקו — בלי טיקטוק מדומה", cta: "לאתר" },
  { ...meshhdawi(), businessName: "מאפיית הגבעה", category: "מאפייה" },
  "he",
);
if (customerCopyHasLeak(plantedHe.headline + plantedHe.body)) fail("HE gate leaked planted meta");

// --- Meshhdawi AR pack ---
const arPack = packOf(meshhdawi(), "mesh-ar");
const arBlob = adBlob(arPack, "ar");
const leakHits = customerCopyLeakHits(arBlob);
if (leakHits.length) fail(`AR bakery ads leaked: ${leakHits.slice(0, 8).join(" | ")}`);
if (HE_SCRIPT.test(arBlob)) fail("AR bakery ads contain Hebrew characters");
if (localeScriptBleed(arBlob, "ar")) fail("AR bakery ads failed locale isolation");
const street = "شارع البشارة 49";
for (const v of arPack.variants.filter((x) => x.locale === "ar")) {
  const n = `${v.headline}\n${v.primaryText}`.split(street).length - 1;
  if (n >= 3 || factSpamHits(v.primaryText, { location: street }).length) {
    fail(`AR ${v.kind} address spam (${n}×): ${v.primaryText}`);
  }
}
const arAds = arPack.variants.filter((v) => v.locale === "ar");
if (!arAds.length) fail("no AR variants");
for (const v of arAds) {
  if (!v.headline.trim() || customerCopyHasLeak(v.headline)) fail(`AR ${v.kind} headline unusable: ${v.headline}`);
  if (!/[\u0600-\u06FF]/.test(v.headline)) fail(`AR ${v.kind} headline missing Arabic script: ${v.headline}`);
}
const arComplete = arPack.completeAd?.locales.ar;
if (!arComplete) fail("AR complete-ad missing");
else {
  if (customerCopyHasLeak(`${arComplete.headline}\n${arComplete.copy}\n${arComplete.hook}`)) {
    fail(`AR complete-ad leaked: ${arComplete.headline} / ${arComplete.hook}`);
  }
  if (HE_SCRIPT.test(`${arComplete.headline} ${arComplete.copy}`)) fail("AR complete-ad has Hebrew");
}

const produced = produceAd(meshhdawi(), stylesForFirst(meshhdawi()), "فقط القنوات المعطاة — بلا تيك توك مختلق", "ar");
if (customerCopyHasLeak(`${produced.headline}\n${produced.body}`)) {
  fail(`produceAd accepted leaked idea: ${produced.headline}`);
}

function stylesForFirst(intake: Intake): string {
  return intake.category || "soft-organic";
}

// --- Diagnosis locale isolation ---
const wsAr = workspaceFromPack(arPack, undefined, "ar");
const boardAr = buildKnowledge(wsAr, "ar");
const knowText = boardAr.know.map((k) => k.text).join("\n");
const thinkText = boardAr.think.map((k) => k.text).join("\n");
if (/\bidentity\b|\blocation\b|\boffer\b|\bproblem\b|\bpain\b|\bdiagnosis\./i.test(knowText + thinkText)) {
  fail(`AR knowledge board still has English keys:\n${knowText}\n${thinkText}`);
}
if (/\bno_offer\b|\bunknown\b/.test(knowText)) fail(`AR knowledge still shows raw chip ids: ${knowText}`);
if (HE_SCRIPT.test(thinkText)) fail(`AR what-we-think still Hebrew:\n${thinkText}`);
const dnaAr = extractDna(arPack, undefined, "ar");
for (const tr of dnaAr.traits.filter((t) => t.kind === "think")) {
  if (HE_SCRIPT.test(tr.claim)) fail(`AR DNA think claim is Hebrew: ${tr.claim}`);
}

// --- EN pack ---
const enPack = packOf(englishShop(), "hill-en");
const enBlob = adBlob(enPack, "en");
if (customerCopyHasLeak(enBlob)) fail(`EN ads leaked: ${customerCopyLeakHits(enBlob).join(" | ")}`);
if (localeScriptBleed(enBlob, "en")) fail("EN ads have Hebrew/Arabic bleed");
const enAds = enPack.variants.filter((v) => v.locale === "en");
if (!enAds.some((v) => /bread|bakery|Hilltop|oven/i.test(v.headline + v.primaryText))) {
  fail(`EN bakery copy not natural: ${enAds.map((v) => v.headline).join(" | ")}`);
}

// --- Fashion / clinic isolation ---
const fashionPack = packOf(fashion(), "aam-he");
const fashionBlob = adBlob(fashionPack, "he");
if (PEDIATRIC_CLINIC_COPY_RE.test(fashionBlob) || copyLeaksClinic(fashionBlob)) {
  fail(`fashion pack leaked clinic: ${fashionBlob.slice(0, 280)}`);
}

const clinic = demoIntake("he");
const clinicPack = packOf(clinic, "clinic-demo");
const clinicHe = adBlob(clinicPack, "he");
if (!/מרפא|ילדים|סדר הגעה|סאמר|אבו מוך/.test(clinicHe)) {
  /* clinic demo may use locked lines — allowed if not empty */
  if (!clinicPack.variants.some((v) => v.locale === "he" && v.headline.trim())) {
    fail("clinic demo HE variants empty");
  }
}
const clinicIntoFashion = produceAd(fashion(), "soft-organic", "الولد مريض، جيبوه عالعيادة", "he");
if (PEDIATRIC_CLINIC_COPY_RE.test(`${clinicIntoFashion.headline}\n${clinicIntoFashion.body}`)) {
  fail("fashion produceAd inherited clinic idea");
}

// --- HSO customer copy ---
const hsoIntake = applyOfferToIntake(meshhdawi(), skipOfferBlueprint("ar"));
const hso = generateHsoStudio(hsoIntake, "meta", "ar");
for (const v of hso.variants) {
  if (customerCopyHasLeak(`${v.hook}\n${v.story}\n${v.offer}`)) {
    fail(`HSO leaked: ${v.hook}`);
  }
  if (HE_SCRIPT.test(v.hook + v.story)) fail(`HSO AR has Hebrew: ${v.hook}`);
}

// --- Palestinian dialect is first-class + AR default ---
if (defaultDialectForLocale("ar") !== "ar-palestinian") fail("AR default dialect must be Palestinian");
if (effectiveDialect(meshhdawi(), "ar") !== "ar-palestinian") fail("empty-voice AR intake must resolve Palestinian");
const palRow = VOICE_DIALECTS.find((d) => d.id === "ar-palestinian");
if (!palRow) fail("VOICE_DIALECTS missing ar-palestinian");
else {
  if (!/פלסטין|מדובר/.test(palRow.label.he)) fail(`Palestinian HE label missing: ${palRow.label.he}`);
  if (!/فلسطين/.test(palRow.label.ar)) fail(`Palestinian AR label missing: ${palRow.label.ar}`);
  if (!/Palestinian/i.test(palRow.label.en)) fail(`Palestinian EN label missing: ${palRow.label.en}`);
}
const palCore = composeCoreMessage(
  { niche: "مخبز", audience: "ناس الناصرة", dialect: "ar-palestinian", beliefs: ["خبز طازج"], neverSay: "" },
  "ar",
);
if (!/ناس الناصرة|خبز|بالبلد/.test(palCore)) fail(`Palestinian core message off-register: ${palCore}`);
if (/شلون|دلوقتي|إزيك|هذه الرسالة الجوهرية/.test(palCore)) fail(`Palestinian core used Gulf/Egyptian/fusHa: ${palCore}`);
if (/شلون|إزيك|دلوقتي/.test(arBlob)) fail(`AR bakery ads used Gulf/Egyptian: ${arBlob.slice(0, 200)}`);
if (!/ما في عرض|هاليوم|تعوا/.test(arBlob + thinkText + knowText)) {
  fail("AR bakery/diagnosis missing Palestinian spoken markers");
}
if (/يجب أن يأتي|يجب أن يبدأ/.test(thinkText)) fail(`AR diagnosis still stiff fusHa: ${thinkText}`);
const plantedEg = gateCustomerAd(
  { headline: "إزيك يا معلم دلوقتي", body: "دي الرسالة", cta: "للموقع" },
  meshhdawi(),
  "ar",
);
if (/إزيك|دلوقتي/.test(plantedEg.headline + plantedEg.body)) {
  fail(`gate kept Egyptian register: ${plantedEg.headline}`);
}

// --- Blocklist completeness vs user screenshots ---
for (const phrase of [
  "مرآة المشكلة",
  "المشكلة المعطاة",
  "بكلام الزبون",
  "فقط القنوات",
  "بلا تيك توك مختلق",
  "الفنجان كافتتاح",
  "في عرض؟ نقود فيه",
  "مش إعلان عام",
] as const) {
  if (!COPY_LEAK_PHRASES.includes(phrase) && !customerCopyHasLeak(phrase)) {
    fail(`screenshot leak phrase not gated: ${phrase}`);
  }
}

if (failures.length) {
  console.error(`check-copy-quality FAILED (${failures.length})`);
  for (const f of failures) console.error(" -", f);
  process.exit(1);
}
console.log("check-copy-quality OK", {
  arHeadlines: arAds.map((v) => v.headline),
  completeAr: arComplete?.headline,
  knowSample: boardAr.know.slice(0, 4).map((k) => k.text),
  thinkSample: boardAr.think.slice(0, 2).map((k) => k.text),
});
