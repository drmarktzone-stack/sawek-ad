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
    id: "ar-levant",
    label: L("ערבית שامية", "عامية شامية", "Levantine Arabic"),
    hint: L("לבנט — שו, הלק, בלי תרגום מילולי", "شامية — شو، هلق، مش ترجمة حرفية", "Levant — spoken, not a calque"),
  },
  {
    id: "ar-gulf",
    label: L("ערבית خليجية", "خليجية", "Gulf Arabic"),
    hint: L("מפרץ — שلون, الحين", "خليج — شلون، الحين", "Gulf — spoken register"),
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

export function emptyVoice(): VoiceProfile {
  return { niche: "", coreMessage: "", personalVoice: "", dialect: "" };
}

export function normalizeVoice(raw: unknown): VoiceProfile {
  const empty = emptyVoice();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return empty;
  const o = raw as Record<string, unknown>;
  const dialect = o.dialect;
  const okDialect: VoiceDialect | "" =
    dialect === "he" ||
    dialect === "ar-levant" ||
    dialect === "ar-gulf" ||
    dialect === "ar-msa" ||
    dialect === "en"
      ? dialect
      : "";
  return {
    niche: typeof o.niche === "string" ? o.niche : "",
    coreMessage: typeof o.coreMessage === "string" ? o.coreMessage : "",
    personalVoice: typeof o.personalVoice === "string" ? o.personalVoice : "",
    dialect: okDialect,
  };
}

/** Voice on intake, falling back to category / advantage / brandTone already typed. */
export function voiceFromIntake(intake: Pick<Intake, "voice" | "category" | "uniqueAdvantage" | "brandTone" | "description">): VoiceProfile {
  const v = normalizeVoice(intake.voice);
  return {
    niche: v.niche.trim() || String(intake.category || "").trim(),
    coreMessage: v.coreMessage.trim() || String(intake.uniqueAdvantage || "").trim(),
    personalVoice: v.personalVoice.trim() || String(intake.brandTone || "").trim(),
    dialect: v.dialect,
  };
}

export function voiceIsDefined(v: VoiceProfile): boolean {
  return filled(v.niche) || filled(v.coreMessage) || filled(v.personalVoice);
}

export function voiceIsSaved(v: VoiceProfile): boolean {
  return filled(v.niche) && (filled(v.coreMessage) || filled(v.personalVoice));
}

export function dialectLabel(dialect: VoiceDialect | "", locale: Locale): string {
  if (!dialect) return "";
  const row = VOICE_DIALECTS.find((d) => d.id === dialect);
  return row ? row.label[locale] : dialect;
}

/** Fact lines for Gemini / templates. Never invents a dialect the user did not pick. */
export function voiceFactLines(intake: Intake): string[] {
  const v = voiceFromIntake(intake);
  return [
    v.niche && `coreNiche: ${v.niche}`,
    v.coreMessage && `coreMessage: ${v.coreMessage}`,
    v.personalVoice && `personalVoice: ${v.personalVoice}`,
    v.dialect && `voiceDialect: ${v.dialect}`,
  ].filter(Boolean) as string[];
}

export function applyVoiceToIntake(intake: Intake, voice: VoiceProfile): Intake {
  const next = normalizeVoice(voice);
  return {
    ...intake,
    voice: next,
    brandTone: next.personalVoice.trim() || intake.brandTone,
  };
}
