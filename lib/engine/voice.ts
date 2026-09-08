import type { Intake, Locale, Tri, VoiceDialect, VoiceProfile } from "../types";
import { filled } from "../utils";

const L = (he: string, ar: string, en: string): Tri => ({ he, ar, en });

export const VOICE_DIALECTS: { id: VoiceDialect; label: Tri; hint: Tri }[] = [
  {
    id: "he",
    label: L("עברית", "عبري", "Hebrew"),
    hint: L("ישיר, פעולה, בלי סלנג מזויף", "مباشر، فعل، بلا عامية مختلقة", "Direct, action-first"),
  },
  {
    id: "ar-gulf",
    label: L("ערבית خليجية", "خليجية", "Gulf Arabic"),
    hint: L("מפרץ — شلون, الحين", "خليج — شلون، الحين", "Gulf — spoken register"),
  },
  {
    id: "ar-egyptian",
    label: L("ערבית מצרית", "مصري", "Egyptian Arabic"),
    hint: L("מצרי — إزيك, دلوقتي", "مصري — إزيك، دلوقتي", "Egyptian — spoken register"),
  },
  {
    id: "ar-levant",
    label: L("ערבית شامية", "عامية شامية", "Levantine Arabic"),
    hint: L("לבנט — شو, هلق, בלי תרגום מילולי", "شامية — شو، هلق، مش ترجمة حرفية", "Levant — spoken, not a calque"),
  },
  {
    id: "ar-light",
    label: L("فصحى خفيفة", "فصحى خفيفة", "Light fusHa"),
    hint: L("ערבית תקנית קלה — ברורה, בלי כבדות", "فصحى سهلة — واضحة بلا ثقل", "Simple MSA — clear, not classical"),
  },
  {
    id: "ar-msa",
    label: L("ערבית فصحى", "فصحى", "Modern Standard Arabic"),
    hint: L("פורמלית, ברורה", "فصحى واضحة", "Formal, clear MSA"),
  },
  {
    id: "en",
    label: L("אנגלית", "إنجليزي", "English"),
    hint: L("מודרני, קצר", "حديث وقصير", "Modern, short"),
  },
];

const DIALECTS: VoiceDialect[] = [
  "he",
  "ar-levant",
  "ar-gulf",
  "ar-egyptian",
  "ar-light",
  "ar-msa",
  "en",
];

export function isVoiceDialect(value: unknown): value is VoiceDialect {
  return typeof value === "string" && (DIALECTS as string[]).includes(value);
}

export function emptyVoice(): VoiceProfile {
  return {
    niche: "",
    audience: "",
    coreMessage: "",
    personalVoice: "",
    dialect: "",
    beliefs: ["", "", ""],
    neverSay: "",
    locked: false,
  };
}

function threeBeliefs(raw: unknown): string[] {
  const list = Array.isArray(raw)
    ? raw.filter((x): x is string => typeof x === "string").map((s) => s.trim())
    : typeof raw === "string"
      ? raw.split(/\n|;|·/).map((s) => s.trim())
      : [];
  const out = [list[0] ?? "", list[1] ?? "", list[2] ?? ""];
  return out;
}

export function normalizeVoice(raw: unknown): VoiceProfile {
  const empty = emptyVoice();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return empty;
  const o = raw as Record<string, unknown>;
  return {
    niche: typeof o.niche === "string" ? o.niche : "",
    audience: typeof o.audience === "string" ? o.audience : "",
    coreMessage: typeof o.coreMessage === "string" ? o.coreMessage : "",
    personalVoice: typeof o.personalVoice === "string" ? o.personalVoice : "",
    dialect: isVoiceDialect(o.dialect) ? o.dialect : "",
    beliefs: threeBeliefs(o.beliefs),
    neverSay: typeof o.neverSay === "string" ? o.neverSay : "",
    locked: o.locked === true,
    lockedAt: typeof o.lockedAt === "string" ? o.lockedAt : undefined,
  };
}

/** Voice on intake, falling back to category / advantage / brandTone already typed. */
export function voiceFromIntake(
  intake: Pick<Intake, "voice" | "category" | "uniqueAdvantage" | "brandTone" | "description" | "audience">,
): VoiceProfile {
  const v = normalizeVoice(intake.voice);
  return {
    ...v,
    niche: v.niche.trim() || String(intake.category || "").trim(),
    audience: v.audience.trim() || String(intake.audience || "").trim(),
    coreMessage: v.coreMessage.trim() || String(intake.uniqueAdvantage || "").trim(),
    personalVoice: v.personalVoice.trim() || String(intake.brandTone || "").trim(),
  };
}

export function voiceIsDefined(v: VoiceProfile): boolean {
  return filled(v.niche) || filled(v.coreMessage) || filled(v.personalVoice);
}

export function voiceIsSaved(v: VoiceProfile): boolean {
  return filled(v.niche) && (filled(v.coreMessage) || filled(v.personalVoice));
}

export function voiceIsLocked(v: VoiceProfile | undefined | null): boolean {
  const n = normalizeVoice(v);
  return n.locked === true && voiceIsSaved(n);
}

export function dialectLabel(dialect: VoiceDialect | "", locale: Locale): string {
  if (!dialect) return "";
  const row = VOICE_DIALECTS.find((d) => d.id === dialect);
  return row ? row.label[locale] : dialect;
}

export function dialectToLocale(dialect: VoiceDialect | ""): Locale {
  if (dialect === "en") return "en";
  if (dialect === "he" || dialect === "") return "he";
  return "ar";
}

/** Fact lines for Gemini / templates. Never invents a dialect the user did not pick. */
export function voiceFactLines(intake: Intake): string[] {
  const v = voiceFromIntake(intake);
  const beliefs = v.beliefs.filter((b) => filled(b));
  return [
    v.niche && `coreNiche: ${v.niche}`,
    v.audience && `voiceAudience: ${v.audience}`,
    v.coreMessage && `coreMessage: ${v.coreMessage}`,
    v.personalVoice && `personalVoice: ${v.personalVoice}`,
    v.dialect && `voiceDialect: ${v.dialect}`,
    beliefs.length ? `voiceBeliefs: ${beliefs.join(" | ")}` : "",
    v.neverSay && `neverSay: ${v.neverSay}`,
    v.locked && "voiceLocked: true",
  ].filter(Boolean) as string[];
}

export function applyVoiceToIntake(intake: Intake, voice: VoiceProfile): Intake {
  const next = normalizeVoice(voice);
  return {
    ...intake,
    voice: next,
    brandTone: next.personalVoice.trim() || intake.brandTone,
    audience: next.audience.trim() || intake.audience,
  };
}

export function neverSayPhrases(neverSay: string): string[] {
  return neverSay
    .split(/[\n,;|/]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2);
}

/** Strip user-banned phrases. Does not invent replacements. */
export function stripNeverSay(text: string, neverSay: string): string {
  let out = String(text ?? "");
  for (const phrase of neverSayPhrases(neverSay)) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out.replace(new RegExp(escaped, "gi"), "").replace(/\s{2,}/g, " ").trim();
  }
  return out.replace(/\s*[·,،|/]\s*$/u, "").trim();
}

export function applyVoiceLockToText(text: string, intake: Intake): string {
  const v = normalizeVoice(intake.voice);
  return stripNeverSay(text, v.neverSay);
}
