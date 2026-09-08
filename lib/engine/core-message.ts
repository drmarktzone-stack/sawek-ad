import type { Intake, Locale, VoiceDialect, VoiceProfile } from "../types";
import { copyLeaksClinic, scrubClinicCopy } from "../clinic-leak";
import { filled } from "../utils";
import {
  applyVoiceToIntake,
  dialectToLocale,
  emptyVoice,
  normalizeVoice,
  voiceFromIntake,
  voiceIsLocked,
} from "./voice";

export type CoreMessageInput = {
  niche: string;
  audience: string;
  dialect: VoiceDialect | "";
  beliefs: string[];
  neverSay: string;
};

function clip(s: string, n: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= n) return t;
  return `${t.slice(0, n - 1).trim()}…`;
}

function beliefList(beliefs: string[]): string[] {
  return beliefs.map((b) => b.trim()).filter(Boolean).slice(0, 3);
}

function neverLine(neverSay: string, locale: Locale): string {
  const n = neverSay.trim();
  if (!n) return "";
  if (locale === "ar") return `ما بنقول: ${clip(n, 80)}.`;
  if (locale === "en") return `We never say: ${clip(n, 80)}.`;
  return `לא אומרים: ${clip(n, 80)}.`;
}

function joinBeliefs(beliefs: string[], locale: Locale): string {
  const list = beliefList(beliefs);
  if (!list.length) return "";
  if (list.length === 1) return list[0];
  const last = list[list.length - 1];
  const head = list.slice(0, -1).join(locale === "en" ? ", " : " · ");
  if (locale === "ar") return `${head} و${last}`;
  if (locale === "en") return `${head}, and ${last}`;
  return `${head} ו${last}`;
}

/** Deterministic core sentence in the chosen dialect. Buttons are the prompt. */
export function composeCoreMessage(input: CoreMessageInput, fallbackLocale: Locale = "he"): string {
  const niche = input.niche.trim();
  const audience = input.audience.trim();
  const beliefs = joinBeliefs(input.beliefs, dialectToLocale(input.dialect) || fallbackLocale);
  const dialect = input.dialect;
  const never = input.neverSay.trim();

  if (dialect === "ar-gulf") {
    const who = audience || "الناس";
    const what = niche || "هالخدمة";
    const value = beliefs || what;
    return clip(`${who} — ${value}. هذي رسالتنا، مو شعار سلسلة.${never ? ` وما نقول ${clip(never, 40)}.` : ""}`, 220);
  }
  if (dialect === "ar-egyptian") {
    const who = audience || "الناس";
    const value = beliefs || niche || "اللي بنعمله";
    return clip(`${who}: ${value}. دي الرسالة، من غير كلام فاضي.${never ? ` ومش بنقول ${clip(never, 40)}.` : ""}`, 220);
  }
  if (dialect === "ar-levant") {
    const who = audience || "الناس";
    const value = beliefs || niche || "اللي منقدّمه";
    return clip(`${who} — ${value}. هي الرسالة، مش شعار جاهز.${never ? ` وما منقول ${clip(never, 40)}.` : ""}`, 220);
  }
  if (dialect === "ar-light" || dialect === "ar-msa") {
    const who = audience || "الجمهور";
    const value = beliefs || niche || "الخدمة";
    return clip(`${who}: ${value}. هذه الرسالة الجوهرية.${never ? ` ولا نقول: ${clip(never, 40)}.` : ""}`, 220);
  }
  if (dialect === "en") {
    const who = audience || "this audience";
    const value = beliefs || niche || "the work";
    return clip(`For ${who}: ${value}. That is the locked message.${never ? ` We never say ${clip(never, 40)}.` : ""}`, 220);
  }
  const who = audience || "הקהל";
  const value = beliefs || niche || "העבודה";
  return clip(`עבור ${who}: ${value}. זה המסר הנעול.${never ? ` ${neverLine(never, "he")}` : ""}`, 220);
}

function composePersonalVoice(input: CoreMessageInput, locale: Locale): string {
  const beliefs = joinBeliefs(input.beliefs, locale);
  if (locale === "ar") {
    return clip([input.niche && `التخصّص: ${input.niche}`, beliefs && `القيم: ${beliefs}`, neverLine(input.neverSay, "ar")]
      .filter(Boolean)
      .join(" · ") || "صوت محفوظ من المدخلات.", 200);
  }
  if (locale === "en") {
    return clip([input.niche && `Niche: ${input.niche}`, beliefs && `Values: ${beliefs}`, neverLine(input.neverSay, "en")]
      .filter(Boolean)
      .join(" · ") || "Voice saved from your inputs.", 200);
  }
  return clip([input.niche && `נישה: ${input.niche}`, beliefs && `ערכים: ${beliefs}`, neverLine(input.neverSay, "he")]
    .filter(Boolean)
    .join(" · ") || "קול שנשמר מהקלטים.", 200);
}

export function canLockCoreMessage(input: CoreMessageInput): boolean {
  return filled(input.niche) && filled(input.audience) && Boolean(input.dialect) && beliefList(input.beliefs).length >= 1;
}

export function generateCoreMessage(
  input: CoreMessageInput,
  opts?: { intake?: Intake; locale?: Locale },
): VoiceProfile {
  const locale = opts?.locale ?? dialectToLocale(input.dialect) ?? "he";
  const now = new Date().toISOString();
  const raw = composeCoreMessage(input, locale);
  const core = opts?.intake ? scrubClinicCopy(raw, opts.intake) : raw;
  const personal = composePersonalVoice(input, locale);
  const next: VoiceProfile = {
    ...emptyVoice(),
    niche: input.niche.trim(),
    audience: input.audience.trim(),
    dialect: input.dialect,
    beliefs: [input.beliefs[0] ?? "", input.beliefs[1] ?? "", input.beliefs[2] ?? ""],
    neverSay: input.neverSay.trim(),
    coreMessage: core,
    personalVoice: opts?.intake ? scrubClinicCopy(personal, opts.intake) : personal,
    locked: true,
    lockedAt: now,
  };
  if (opts?.intake && !copyLeaksClinic(next.coreMessage)) {
    return next;
  }
  if (opts?.intake && copyLeaksClinic(next.coreMessage)) {
    return { ...next, coreMessage: scrubClinicCopy(next.coreMessage, opts.intake) || next.niche };
  }
  return next;
}

export function lockVoiceOnIntake(intake: Intake, voice: VoiceProfile): Intake {
  return applyVoiceToIntake(intake, { ...normalizeVoice(voice), locked: true, lockedAt: voice.lockedAt || new Date().toISOString() });
}

export function coreMessageInText(text: string, voice: VoiceProfile): boolean {
  const core = voice.coreMessage.trim();
  if (!core) return false;
  const blob = text.replace(/\s+/g, " ");
  if (blob.includes(core.slice(0, Math.min(18, core.length)))) return true;
  const niche = voice.niche.trim();
  return Boolean(niche) && blob.includes(niche);
}

export function neverSayLeaks(text: string, voice: VoiceProfile): boolean {
  const phrases = voice.neverSay
    .split(/[\n,;|/]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 3);
  const blob = text.toLowerCase();
  return phrases.some((p) => blob.includes(p.toLowerCase()));
}

export function lockedVoiceForGeneration(intake: Intake): VoiceProfile {
  return voiceFromIntake(intake);
}

export { voiceIsLocked };
