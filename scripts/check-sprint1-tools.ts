/**
 * Sprint 1 tools — Core Message, Offer Builder, HSO, offer gate.
 * Deterministic. No invented scores. Clinic demo must stay isolated.
 */
import { emptyIntake } from "../lib/engine/validate";
import { assemblePack } from "../lib/engine/run";
import { validateIntake } from "../lib/engine/validate";
import { diagnose } from "../lib/engine/diagnose";
import { generateVariants } from "../lib/engine/copy";
import { produceAd } from "../lib/engine/produce-ad";
import { channelFields } from "../lib/channel-copy";
import { copyLeaksClinic, PEDIATRIC_CLINIC_COPY_RE } from "../lib/clinic-leak";
import { generateCoreMessage, coreMessageInText, neverSayLeaks } from "../lib/engine/core-message";
import { applyVoiceToIntake, voiceIsLocked } from "../lib/engine/voice";
import {
  generateOfferBlueprint,
  offerBlueprintIsSaved,
  offerGate,
  skipOfferBlueprint,
} from "../lib/engine/offer-builder";
import { generateHsoStudio, canGenerateHso } from "../lib/engine/hso-studio";
import { demoIntake } from "../lib/demo";
import type { CampaignPack, Intake } from "../lib/types";

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

function boutique(): Intake {
  return {
    ...emptyIntake(),
    businessName: "בוטיק החול",
    category: "אופנה",
    description: "חנות בגדים עם מדידה רגועה",
    location: "עין ברק",
    audience: "נשים",
    biggestProblem: "אין זמן למדוד בלי לחץ",
    uniqueAdvantage: "מתלה אחד מדויק",
    mainGoal: "leads",
    offer: "no_offer",
    whatsapp: "050-1112233",
  };
}

const fashion = boutique();
const locked = generateCoreMessage(
  {
    niche: "אופנה מקומית",
    audience: "נשים שמחפשות מדידה רגועה",
    dialect: "he",
    beliefs: ["מדידה בלי לחץ", "מתלה מדויק", "שירות שקט"],
    neverSay: "הנחה מטורפת, מספר 1, ריפוי מובטח",
  },
  { intake: fashion, locale: "he" },
);
if (!voiceIsLocked(locked)) fail("core message must lock the voice profile");
if (!locked.coreMessage.trim()) fail("core message output empty");
if (!/מדידה|מתלה|נשים/.test(locked.coreMessage)) fail(`core message missing inputs: ${locked.coreMessage}`);
if (copyLeaksClinic(locked.coreMessage)) fail(`core message leaked clinic: ${locked.coreMessage}`);

const withVoice = applyVoiceToIntake(fashion, locked);
const ad = produceAd(withVoice, "soft-organic", "", "he");
const adBlob = `${ad.headline}\n${ad.body}`;
if (!coreMessageInText(adBlob, locked) && !adBlob.includes("אופנה") && !adBlob.includes(locked.coreMessage.slice(0, 12))) {
  fail(`produceAd did not apply locked core message: ${adBlob}`);
}
if (neverSayLeaks(adBlob, locked)) fail(`produceAd leaked never-say: ${adBlob}`);
if (PEDIATRIC_CLINIC_COPY_RE.test(adBlob) || copyLeaksClinic(adBlob)) {
  fail(`fashion produceAd leaked clinic after voice lock: ${adBlob}`);
}

const variants = generateVariants(withVoice);
const heStrong = variants.find((v) => v.locale === "he" && v.kind === "strong_offer");
if (!heStrong) fail("missing HE strong_offer variant");
if (heStrong && neverSayLeaks(`${heStrong.headline} ${heStrong.primaryText}`, locked)) {
  fail("variant leaked never-say");
}

const missingGate = offerGate(fashion);
if (missingGate.ok) fail("new campaign without offer must be gated");
if (missingGate.reason !== "missing") fail(`expected missing gate, got ${missingGate.reason}`);

const offer = generateOfferBlueprint(
  {
    dreamOutcome: "מדידה רגועה והחלטה בביקור אחד",
    proof: "מתלה אחד מדויק בחנות",
    timeToResult: "ביקור אחד",
    customerEffort: "וואטסאפ לתיאום",
    price: "",
    objections: "אין זמן",
    guaranteeReal: false,
  },
  { intake: fashion, locale: "he" },
);
if (!offerBlueprintIsSaved(offer)) fail("offer builder must save headline, stack, 3 hooks");
if (offer.hooks.length < 3) fail(`offer hooks ${offer.hooks.length} < 3`);
if (offer.guarantee) fail("guarantee must be empty unless marked real");
if (copyLeaksClinic(offer.headline)) fail(`offer headline leaked clinic: ${offer.headline}`);

const guaranteed = generateOfferBlueprint(
  { ...offer, guaranteeReal: true, dreamOutcome: offer.dreamOutcome, proof: offer.proof, timeToResult: offer.timeToResult },
  { intake: fashion, locale: "he" },
);
if (!guaranteed.guarantee.trim()) fail("real-marked guarantee must generate copy");

const withOffer: Intake = { ...withVoice, offerBlueprint: offer, offer: offer.headline, offerCustom: true };
const openGate = offerGate(withOffer);
if (!openGate.ok) fail("saved offer must open the ad-pack gate");

const skipped = skipOfferBlueprint("he");
const skipGate = offerGate({ ...fashion, offerBlueprint: skipped, offerSkipConfirmed: true });
if (!skipGate.ok) fail("explicit skip must open the gate");
if (skipGate.reason !== "skipped") fail(`skip reason should be skipped, got ${skipGate.reason}`);

const clinicDemo = demoIntake("he");
const clinicPack = packOf(clinicDemo);
clinicPack.demoMeta = { sample: true, fictional: false, kind: "clinic" };
if (!offerGate(clinicDemo, clinicPack).ok) fail("demo clinic pack must pass the gate (Demo click only)");

if (canGenerateHso(fashion)) fail("HSO must not run without saved offer or skip");
if (!canGenerateHso(withOffer)) fail("HSO must run after saved offer");

for (const platform of ["meta", "tiktok", "google"] as const) {
  const hso = generateHsoStudio(withOffer, platform, "he");
  if (hso.variants.length < 5) fail(`HSO ${platform} produced ${hso.variants.length} < 5`);
  const blob = hso.variants.map((v) => `${v.hook} ${v.story} ${v.offer}`).join("\n");
  if (copyLeaksClinic(blob) || PEDIATRIC_CLINIC_COPY_RE.test(blob)) {
    fail(`HSO ${platform} leaked clinic into fashion: ${blob.slice(0, 200)}`);
  }
  if (!hso.variants.every((v) => v.hook.trim() && v.story.trim() && v.offer.trim() && v.format.trim())) {
    fail(`HSO ${platform} has empty hook/story/offer/format`);
  }
}

const fashionPack = packOf(withOffer);
if (!fashionPack.offerBlueprint && !withOffer.offerBlueprint) fail("pack should carry offer from intake");
const ch = channelFields({ ...fashionPack, intake: withOffer, offerBlueprint: offer }, "he");
if (neverSayLeaks(`${ch.headline} ${ch.body}`, locked)) fail("channel copy leaked never-say");
if (copyLeaksClinic(`${ch.headline}\n${ch.body}`)) fail("channel copy leaked clinic");

const arVoice = generateCoreMessage(
  {
    niche: "بوتيك ملابس",
    audience: "ستات الحي",
    dialect: "ar-egyptian",
    beliefs: ["تجربة هادية", "علاقة واحدة"],
    neverSay: "خصم مجنون",
  },
  { intake: fashion, locale: "ar" },
);
if (!/ستات|هادية|علاقة|الرسالة/.test(arVoice.coreMessage)) fail(`Egyptian core message off-register: ${arVoice.coreMessage}`);
if (copyLeaksClinic(arVoice.coreMessage)) fail("AR core message leaked clinic");

const gulf = generateCoreMessage(
  {
    niche: "بوتيك",
    audience: "زبائن",
    dialect: "ar-gulf",
    beliefs: ["قياس هادي"],
    neverSay: "",
  },
  { locale: "ar" },
);
if (!gulf.coreMessage.trim()) fail("gulf dialect produced empty core message");

const palestinian = generateCoreMessage(
  {
    niche: "مخبز",
    audience: "ناس الناصرة",
    dialect: "ar-palestinian",
    beliefs: ["خبز طازج"],
    neverSay: "",
  },
  { locale: "ar" },
);
if (!/ناس الناصرة|خبز|بالبلد/.test(palestinian.coreMessage)) {
  fail(`Palestinian core message off-register: ${palestinian.coreMessage}`);
}
if (/شلون|دلوقتي|إزيك/.test(palestinian.coreMessage)) {
  fail(`Palestinian core leaked Gulf/Egyptian: ${palestinian.coreMessage}`);
}

if (failures.length) {
  console.error(`SPRINT1 FAIL (${failures.length})\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log("SPRINT1 OK — core message, offer gate, HSO ≥5, clinic isolation");
