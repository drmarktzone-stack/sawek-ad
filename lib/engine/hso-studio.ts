import type { CampaignPack, HsoPlatform, HsoStudioState, HsoVariant, Intake, Locale } from "../types";
import { copyLeaksClinic, scrubClinicCopy } from "../clinic-leak";
import { spokenCta } from "./spoken";
import { uid } from "../utils";
import { voiceFromIntake } from "./voice";
import { offerBlueprintIsSaved, offerLineForCopy } from "./offer-builder";
import { customerCopyHasLeak, gateCustomerAd } from "../copy-purity";

const FORMATS: Record<HsoPlatform, string[]> = {
  meta: ["1:1 feed", "4:5 feed", "9:16 story", "Reels 9:16", "Carousel 1:1", "1:1 primary text"],
  tiktok: ["9:16 · 3s hook", "9:16 · talking head", "9:16 · overlay text", "9:16 · split screen", "9:16 · caption-first", "9:16 · stitch reply"],
  google: ["RSA headlines", "RSA description", "PMax short", "Search sitelink", "Demand Gen 1:1", "YouTube bumper 6s"],
};

function clip(s: string, n: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= n) return t;
  return `${t.slice(0, n - 1).trim()}…`;
}

function facts(intake: Intake, locale: Locale) {
  const voice = voiceFromIntake(intake);
  const offer = offerLineForCopy(intake, locale);
  const blueprint = intake.offerBlueprint;
  return {
    name: intake.businessName.trim(),
    niche: voice.niche || intake.category.trim(),
    audience: voice.audience || intake.audience.trim(),
    core: voice.coreMessage.trim(),
    neverSay: voice.neverSay.trim(),
    problem: intake.biggestProblem.trim(),
    advantage: intake.uniqueAdvantage.trim(),
    offer,
    dream: blueprint?.dreamOutcome?.trim() || "",
    proof: blueprint?.proof?.trim() || "",
    time: blueprint?.timeToResult?.trim() || "",
    effort: blueprint?.customerEffort?.trim() || "",
    objection: blueprint?.objections?.trim() || "",
    hooks: blueprint?.hooks ?? [],
    cta: spokenCta(intake, locale),
  };
}

type Angle = "problem" | "outcome" | "proof" | "contrast" | "direct" | "objection";

const ANGLES: Angle[] = ["problem", "outcome", "proof", "contrast", "direct", "objection"];

function hookFor(angle: Angle, f: ReturnType<typeof facts>, locale: Locale): string {
  if (locale === "ar") {
    if (angle === "problem") return clip(f.problem ? `بطّلوا تعيشوا ${f.problem}.` : `لـ${f.audience || "ناسكم"} — جملة وحدة.`, 90);
    if (angle === "outcome") return clip(f.hooks[0] || f.dream || f.core || f.offer || "النتيجة من العرض المحفوظ.", 90);
    if (angle === "proof") return clip(f.proof ? `${f.proof} — مش وعد فاضي.` : f.advantage || f.core || f.name, 90);
    if (angle === "contrast") return clip(f.effort ? `${f.dream || f.offer} بجهد ${f.effort}.` : `${f.name} — مش زي الباقي.`, 90);
    if (angle === "direct") return clip(f.offer || f.core || f.name, 90);
    return clip(f.objection ? `${f.objection}؟ في جواب.` : f.hooks[2] || f.offer || f.name, 90);
  }
  if (locale === "en") {
    if (angle === "problem") return clip(f.problem ? `Stop living with ${f.problem}.` : `For ${f.audience || "your people"} — one line.`, 90);
    if (angle === "outcome") return clip(f.hooks[0] || f.dream || f.core || f.offer || "The saved-offer outcome.", 90);
    if (angle === "proof") return clip(f.proof ? `${f.proof} — not a vague promise.` : f.advantage || f.core || f.name, 90);
    if (angle === "contrast") return clip(f.effort ? `${f.dream || f.offer} with ${f.effort}.` : `${f.name} — not like the rest.`, 90);
    if (angle === "direct") return clip(f.offer || f.core || f.name, 90);
    return clip(f.objection ? `${f.objection}? There is an answer.` : f.hooks[2] || f.offer || f.name, 90);
  }
  if (angle === "problem") return clip(f.problem ? `די לחיות עם ${f.problem}.` : `עבור ${f.audience || "הקהל"} — משפט אחד.`, 90);
  if (angle === "outcome") return clip(f.hooks[0] || f.dream || f.core || f.offer || "התוצאה מההצעה השמורה.", 90);
  if (angle === "proof") return clip(f.proof ? `${f.proof} — לא הבטחה מעורפלת.` : f.advantage || f.core || f.name, 90);
  if (angle === "contrast") return clip(f.effort ? `${f.dream || f.offer} במאמץ ${f.effort}.` : `${f.name} — לא כמו כולם.`, 90);
  if (angle === "direct") return clip(f.offer || f.core || f.name, 90);
  return clip(f.objection ? `${f.objection}? יש תשובה.` : f.hooks[2] || f.offer || f.name, 90);
}

function storyFor(angle: Angle, f: ReturnType<typeof facts>, locale: Locale): string {
  const bits = [f.audience && (locale === "ar" ? `لـ${f.audience}` : locale === "en" ? `For ${f.audience}` : `עבור ${f.audience}`), f.core, f.advantage, f.time && (locale === "ar" ? `خلال ${f.time}` : locale === "en" ? `in ${f.time}` : `תוך ${f.time}`)]
    .filter(Boolean);
  const base = bits.join(" · ") || f.name;
  if (locale === "ar") {
    if (angle === "problem") return clip(`${f.problem && !/^(unknown|no_offer)$/i.test(f.problem) ? f.problem : f.name}. بعدين ${base}.`, 160);
    if (angle === "proof") return clip(`${f.proof || f.advantage || "إثبات محفوظ"}. ${base}.`, 160);
    return clip(base, 160);
  }
  if (locale === "en") {
    if (angle === "problem") return clip(`${f.problem || "The named problem"}. Then ${base}.`, 160);
    if (angle === "proof") return clip(`${f.proof || f.advantage || "Saved proof"}. ${base}.`, 160);
    return clip(base, 160);
  }
  if (angle === "problem") return clip(`${f.problem || f.name}. אחר כך ${base}.`, 160);
  if (angle === "proof") return clip(`${f.proof || f.advantage || "הוכחה שמורה"}. ${base}.`, 160);
  return clip(base, 160);
}

export function canGenerateHso(intake: Intake, pack?: CampaignPack | null): boolean {
  const offer = pack?.offerBlueprint ?? intake.offerBlueprint;
  return offerBlueprintIsSaved(offer) || Boolean(intake.offerSkipConfirmed || offer?.skipped);
}

export function generateHsoStudio(
  intake: Intake,
  platform: HsoPlatform,
  locale: Locale,
): HsoStudioState {
  const f = facts(intake, locale);
  const formats = FORMATS[platform];
  const variants: HsoVariant[] = ANGLES.map((angle, i) => {
    const gated = gateCustomerAd(
      {
        headline: scrubClinicCopy(hookFor(angle, f, locale), intake),
        body: scrubClinicCopy(storyFor(angle, f, locale), intake),
        cta: scrubClinicCopy(f.cta || (locale === "ar" ? "واتساب" : locale === "en" ? "WhatsApp" : "וואטסאפ"), intake),
      },
      intake,
      locale,
    );
    const hook = gated.headline;
    const story = gated.body;
    const offer = customerCopyHasLeak(f.offer || "")
      ? ""
      : scrubClinicCopy(f.offer || f.core || f.name, intake);
    const cta = gated.cta;
    return {
      id: uid("hso"),
      platform,
      hook,
      story,
      offer,
      cta,
      format: formats[i] || formats[0],
      locale,
    };
  });
  const cleaned = variants.filter((v) => {
    const blob = `${v.hook}\n${v.story}\n${v.offer}`;
    return !copyLeaksClinic(blob) || copyLeaksClinic(`${intake.businessName}\n${intake.description}`);
  });
  const list = cleaned.length >= 5 ? cleaned : variants;
  return {
    platform,
    locale,
    variants: list.slice(0, Math.max(6, list.length)),
    generatedAt: new Date().toISOString(),
  };
}

export function hsoToCreativeNotes(state: HsoStudioState): string[] {
  return state.variants.map((v) => `[${v.platform}/${v.format}] ${v.hook} · ${v.offer}`);
}
