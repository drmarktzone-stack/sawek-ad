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
    id: "ar-palestinian",
    label: L("ערבית فلسطينية מדוברת", "عربي عامّي فلسطيني", "Palestinian colloquial"),
    hint: L(
      "פלסטינית — هاليوم, تعوا, مش — נצרת / גדה / 48",
      "فلسطيني — هاليوم، تعوا، مش — ناصرة / ضفّة / ٤٨",
      "Palestinian — هاليوم، تعوا — Nazareth / West Bank / 48",
    ),
  },
  {
    id: "ar-levant",
    label: L("ערבית شامية", "عامية شامية", "Levantine Arabic"),
    hint: L("לבנט — شو, هلق, בלי תרגום מילולי", "شامية — شو، هلق، مش ترجمة حرفية", "Levant — spoken, not a calque"),
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
  "ar-palestinian",
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

/** Default spoken register when the user has not locked a dialect. AR → Palestinian. */
export function defaultDialectForLocale(locale: Locale): VoiceDialect {
  if (locale === "ar") return "ar-palestinian";
  if (locale === "en") return "en";
  return "he";
}

export function effectiveDialect(
  intake: Pick<Intake, "voice"> | undefined,
  locale: Locale,
): VoiceDialect {
  const picked = normalizeVoice(intake?.voice).dialect;
  if (picked) return picked;
  return defaultDialectForLocale(locale);
}

export function isPalestinianArabic(dialect: VoiceDialect | "", locale?: Locale): boolean {
  if (dialect === "ar-palestinian") return true;
  return !dialect && locale === "ar";
}

const EGYPTIAN_MARK = /إزيك|ازيك|دلوقتي|دلوقتى|\bأوي\b|\bاوي\b|كده\b|مش كده|دي الرسالة|إزّيك/;
const GULF_MARK = /شلون\b|الحين\b|هذي رسالتنا|مو شعار|هذي الخدمة/;

/** Wrong Arabic register in customer/diagnosis prose (Egyptian/Gulf inside Palestinian/Levant). */
export function arabicRegisterBleed(text: string, dialect: VoiceDialect | "", locale?: Locale): boolean {
  const pal = isPalestinianArabic(dialect, locale) || dialect === "ar-levant";
  if (!pal) return false;
  const s = String(text ?? "");
  if (!s.trim()) return false;
  return EGYPTIAN_MARK.test(s) || GULF_MARK.test(s);
}

export function dialectInstruction(dialect: VoiceDialect | "", locale: Locale): string {
  const d = dialect || defaultDialectForLocale(locale);
  if (d === "ar-palestinian") {
    return "Arabic register: Palestinian colloquial (عامّي فلسطيني — ناصرة / الضفة / ٤٨). Sound like a WhatsApp/Facebook post a person from Palestine would write. Use هاليوم، تعوا، مش، شو، هون، بدكم. NOT Gulf (شلون/الحين), NOT Egyptian (إزيك/دلوقتي), NOT stiff fusHa, NOT a Hebrew calque.";
  }
  if (d === "ar-levant") return "Arabic register: Levantine spoken (شو، هلق). Not Gulf, not Egyptian.";
  if (d === "ar-gulf") return "Arabic register: Gulf spoken (شلون، الحين).";
  if (d === "ar-egyptian") return "Arabic register: Egyptian spoken (إزيك، دلوقتي).";
  if (d === "ar-light" || d === "ar-msa") return "Arabic register: light clear fusHa — not classical, not dialect mash-up.";
  if (d === "en") return "English: modern, short, original — not a calque.";
  return "Hebrew: direct, action-first.";
}

/** Fact lines for Gemini / templates. AR with no pick defaults to Palestinian. */
export function voiceFactLines(intake: Intake, locale: Locale = "he"): string[] {
  const v = voiceFromIntake(intake);
  const dialect = effectiveDialect(intake, locale);
  const beliefs = v.beliefs.filter((b) => filled(b));
  return [
    v.niche && `coreNiche: ${v.niche}`,
    v.audience && `voiceAudience: ${v.audience}`,
    v.coreMessage && `coreMessage: ${v.coreMessage}`,
    v.personalVoice && `personalVoice: ${v.personalVoice}`,
    `voiceDialect: ${dialect}`,
    dialectInstruction(dialect, locale),
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
