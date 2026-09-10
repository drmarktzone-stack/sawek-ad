import type { CampaignPack, Intake, Locale, OfferBlueprint } from "../types";
import { copyLeaksClinic, scrubClinicCopy } from "../clinic-leak";
import { isNoOffer } from "../no-offer";
import { filled } from "../utils";
import { voiceFromIntake } from "./voice";

export type OfferBuilderInput = {
  dreamOutcome: string;
  proof: string;
  timeToResult: string;
  customerEffort: string;
  price: string;
  objections: string;
  guaranteeReal: boolean;
};

export function emptyOfferBlueprint(locale: Locale = "he"): OfferBlueprint {
  return {
    dreamOutcome: "",
    proof: "",
    timeToResult: "",
    customerEffort: "",
    price: "",
    objections: "",
    guaranteeReal: false,
    headline: "",
    valueStack: [],
    guarantee: "",
    hooks: [],
    locale,
    saved: false,
  };
}

export function normalizeOfferBlueprint(raw: unknown, locale: Locale = "he"): OfferBlueprint {
  const empty = emptyOfferBlueprint(locale);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return empty;
  const o = raw as Record<string, unknown>;
  const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").map((s) => s.trim()).filter(Boolean) : []);
  return {
    dreamOutcome: typeof o.dreamOutcome === "string" ? o.dreamOutcome : "",
    proof: typeof o.proof === "string" ? o.proof : "",
    timeToResult: typeof o.timeToResult === "string" ? o.timeToResult : "",
    customerEffort: typeof o.customerEffort === "string" ? o.customerEffort : "",
    price: typeof o.price === "string" ? o.price : "",
    objections: typeof o.objections === "string" ? o.objections : "",
    guaranteeReal: o.guaranteeReal === true,
    headline: typeof o.headline === "string" ? o.headline : "",
    valueStack: strings(o.valueStack),
    guarantee: typeof o.guarantee === "string" ? o.guarantee : "",
    hooks: strings(o.hooks),
    locale: o.locale === "ar" || o.locale === "en" || o.locale === "he" ? o.locale : locale,
    saved: o.saved === true,
    savedAt: typeof o.savedAt === "string" ? o.savedAt : undefined,
    skipped: o.skipped === true,
  };
}

export function offerBlueprintIsSaved(offer: OfferBlueprint | undefined | null): boolean {
  if (!offer) return false;
  if (offer.skipped) return false;
  return offer.saved === true && filled(offer.headline) && offer.valueStack.length >= 1 && offer.hooks.length >= 3;
}

export function canBuildOffer(input: OfferBuilderInput): boolean {
  return filled(input.dreamOutcome) && filled(input.proof) && filled(input.timeToResult);
}

function clip(s: string, n: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= n) return t;
  return `${t.slice(0, n - 1).trim()}…`;
}

function headlineFor(input: OfferBuilderInput, locale: Locale): string {
  const dream = clip(input.dreamOutcome, 72);
  const time = input.timeToResult.trim();
  const effort = input.customerEffort.trim();
  if (locale === "ar") {
    if (time && effort) return clip(`${dream} — خلال ${time}، بجهد ${effort}`, 90);
    if (time) return clip(`${dream} خلال ${time}`, 90);
    return dream;
  }
  if (locale === "en") {
    if (time && effort) return clip(`${dream} — in ${time}, with ${effort}`, 90);
    if (time) return clip(`${dream} in ${time}`, 90);
    return dream;
  }
  if (time && effort) return clip(`${dream} — תוך ${time}, במאמץ ${effort}`, 90);
  if (time) return clip(`${dream} תוך ${time}`, 90);
  return dream;
}

function valueStackFor(input: OfferBuilderInput, locale: Locale): string[] {
  const rows: string[] = [];
  if (locale === "ar") {
    if (input.dreamOutcome.trim()) rows.push(`النتيجة: ${clip(input.dreamOutcome, 100)}`);
    if (input.proof.trim()) rows.push(`الإثبات: ${clip(input.proof, 100)}`);
    if (input.timeToResult.trim()) rows.push(`الوقت للنتيجة: ${clip(input.timeToResult, 80)}`);
    if (input.customerEffort.trim()) rows.push(`جهد الزبون: ${clip(input.customerEffort, 80)}`);
    if (input.price.trim()) rows.push(`السعر كما أدخلتم: ${clip(input.price, 80)}`);
    if (input.objections.trim()) rows.push(`الاعتراض الذي نعالجه: ${clip(input.objections, 100)}`);
  } else if (locale === "en") {
    if (input.dreamOutcome.trim()) rows.push(`Outcome: ${clip(input.dreamOutcome, 100)}`);
    if (input.proof.trim()) rows.push(`Proof: ${clip(input.proof, 100)}`);
    if (input.timeToResult.trim()) rows.push(`Time to result: ${clip(input.timeToResult, 80)}`);
    if (input.customerEffort.trim()) rows.push(`Customer effort: ${clip(input.customerEffort, 80)}`);
    if (input.price.trim()) rows.push(`Price as entered: ${clip(input.price, 80)}`);
    if (input.objections.trim()) rows.push(`Objection we answer: ${clip(input.objections, 100)}`);
  } else {
    if (input.dreamOutcome.trim()) rows.push(`התוצאה: ${clip(input.dreamOutcome, 100)}`);
    if (input.proof.trim()) rows.push(`הוכחה: ${clip(input.proof, 100)}`);
    if (input.timeToResult.trim()) rows.push(`זמן לתוצאה: ${clip(input.timeToResult, 80)}`);
    if (input.customerEffort.trim()) rows.push(`מאמץ הלקוח: ${clip(input.customerEffort, 80)}`);
    if (input.price.trim()) rows.push(`מחיר כפי שהוזן: ${clip(input.price, 80)}`);
    if (input.objections.trim()) rows.push(`התנגדות שמטפלים בה: ${clip(input.objections, 100)}`);
  }
  return rows;
}

function guaranteeFor(input: OfferBuilderInput, locale: Locale): string {
  if (!input.guaranteeReal) return "";
  const dream = clip(input.dreamOutcome || "התוצאה שסיפקתם", 80);
  const time = input.timeToResult.trim();
  const proof = input.proof.trim();
  if (locale === "ar") {
    return clip(
      `ضمان علّمتموه كحقيقي: ${dream}${time ? ` خلال ${time}` : ""}${proof ? ` — استناداً إلى ${clip(proof, 60)}` : ""}. بلا نسبة مختلقة.`,
      200,
    );
  }
  if (locale === "en") {
    return clip(
      `Guarantee you marked as real: ${dream}${time ? ` within ${time}` : ""}${proof ? ` — based on ${clip(proof, 60)}` : ""}. No invented rate.`,
      200,
    );
  }
  return clip(
    `אחריות שסימנתם כאמיתית: ${dream}${time ? ` תוך ${time}` : ""}${proof ? ` — על בסיס ${clip(proof, 60)}` : ""}. בלי אחוז מומצא.`,
    200,
  );
}

function hooksFor(input: OfferBuilderInput, locale: Locale): string[] {
  const dream = clip(input.dreamOutcome, 70);
  const time = input.timeToResult.trim();
  const proof = clip(input.proof, 70);
  const objection = clip(input.objections, 70);
  const effort = clip(input.customerEffort, 50);
  if (locale === "ar") {
    return [
      dream ? `وإذا صارت ${dream}؟` : "النتيجة اللي بدكم ياها — بجملة.",
      proof ? `${proof} — مش كلام فاضي.` : "إثبات من المدخلات فقط.",
      time ? `${dream || "النتيجة"} خلال ${time}.` : objection || effort || "العرض مثل ما كتبتوه.",
    ];
  }
  if (locale === "en") {
    return [
      dream ? `What if ${dream}?` : "The outcome you named — in one line.",
      proof ? `${proof} — not fluff.` : "Proof from what you entered only.",
      time ? `${dream || "The result"} in ${time}.` : objection || effort || "The offer, no invented discount.",
    ];
  }
  return [
    dream ? `מה אם ${dream}?` : "התוצאה שנתתם — במשפט.",
    proof ? `${proof} — לא סיסמה.` : "הוכחה רק ממה שהוזן.",
    time ? `${dream || "התוצאה"} תוך ${time}.` : objection || effort || "ההצעה, בלי הנחה מומצאת.",
  ];
}

export function generateOfferBlueprint(
  input: OfferBuilderInput,
  opts?: { intake?: Intake; locale?: Locale },
): OfferBlueprint {
  const locale = opts?.locale ?? "he";
  const now = new Date().toISOString();
  const scrub = (s: string) => (opts?.intake ? scrubClinicCopy(s, opts.intake) : s);
  const offer: OfferBlueprint = {
    ...input,
    guaranteeReal: input.guaranteeReal === true,
    headline: scrub(headlineFor(input, locale)),
    valueStack: valueStackFor(input, locale).map(scrub).filter(Boolean),
    guarantee: input.guaranteeReal ? scrub(guaranteeFor(input, locale)) : "",
    hooks: hooksFor(input, locale).map(scrub).filter(Boolean).slice(0, 3),
    locale,
    saved: true,
    savedAt: now,
    skipped: false,
  };
  if (opts?.intake && copyLeaksClinic(`${offer.headline}\n${offer.valueStack.join("\n")}`)) {
    offer.headline = scrub(offer.headline);
    offer.valueStack = offer.valueStack.map(scrub);
    offer.hooks = offer.hooks.map(scrub);
    offer.guarantee = scrub(offer.guarantee);
  }
  if (offer.hooks.length < 3) {
    const pad = locale === "ar" ? "العرض كما أدخلتم" : locale === "en" ? "The offer as entered" : "ההצעה כפי שהוזנה";
    while (offer.hooks.length < 3) offer.hooks.push(pad);
  }
  return offer;
}

export function skipOfferBlueprint(locale: Locale = "he"): OfferBlueprint {
  return {
    ...emptyOfferBlueprint(locale),
    skipped: true,
    saved: false,
    savedAt: new Date().toISOString(),
    headline: "",
  };
}

export function applyOfferToIntake(intake: Intake, offer: OfferBlueprint): Intake {
  const next: Intake = {
    ...intake,
    offerBlueprint: offer,
    offerSkipConfirmed: offer.skipped === true,
  };
  // Hormozi blueprint is not a promo chip — never copy the headline into intake.offer.
  return next;
}

export type OfferGateReason = "ok" | "missing" | "skipped";

export function offerGate(intake: Intake, pack?: CampaignPack | null): { ok: boolean; reason: OfferGateReason } {
  if (pack?.demoMeta?.sample) return { ok: true, reason: "ok" };
  const offer = pack?.offerBlueprint ?? intake.offerBlueprint;
  if (offerBlueprintIsSaved(offer)) return { ok: true, reason: "ok" };
  if (intake.offerSkipConfirmed || offer?.skipped) return { ok: true, reason: "skipped" };
  return { ok: false, reason: "missing" };
}

export function offerLineForCopy(intake: Intake, locale: Locale): string {
  const offer = intake.offerBlueprint;
  if (offerBlueprintIsSaved(offer) && offer?.headline) return offer.headline;
  if (!isNoOffer(intake.offer) && intake.offer.trim()) return intake.offer.trim();
  const voice = voiceFromIntake(intake);
  if (voice.coreMessage.trim()) return voice.coreMessage.trim();
  if (locale === "ar") return "";
  if (locale === "en") return "";
  return "";
}
