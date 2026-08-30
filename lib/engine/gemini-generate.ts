import { GoogleGenerativeAI } from "@google/generative-ai";

export type GenerateMode = "ads" | "scan" | "channels";
export type GenerateLang = "he" | "ar" | "en";

export type LocaleCopyBlock = {
  headlines: string[];
  copy: string;
  cta: string;
};

export type GenerateBrand = {
  tone: string;
  positioning: string;
  problem: string;
  advantage: string;
  audience: string;
};

export type GenerateChannelCopy = {
  headline: string;
  body: string;
  cta: string;
};

export type GenerateChannelScript = {
  script: string;
};

export type GenerateChannelLanding = {
  title: string;
  body: string;
};

export type GenerateChannels = {
  facebook?: Partial<Record<GenerateLang, GenerateChannelCopy>>;
  instagram?: Partial<Record<GenerateLang, GenerateChannelCopy>>;
  reels?: Partial<Record<GenerateLang, GenerateChannelScript>>;
  tiktok?: Partial<Record<GenerateLang, GenerateChannelScript>>;
  whatsapp?: Partial<Record<GenerateLang, GenerateChannelScript>>;
  landing?: Partial<Record<GenerateLang, GenerateChannelLanding>>;
};

export type GenerateLocales = Partial<Record<GenerateLang, LocaleCopyBlock>>;

export type GenerateOk = {
  ok: true;
  text: string;
  headlines?: string[];
  copy?: string;
  cta?: string;
  locales?: GenerateLocales;
  channels?: GenerateChannels;
  brand?: GenerateBrand;
};

export type GenerateFail = {
  ok: false;
  useTemplates: true;
  reason?: string;
};

export type GenerateResult = GenerateOk | GenerateFail;

export type GenerateBody = {
  description?: unknown;
  audience?: unknown;
  language?: unknown;
  prompt?: unknown;
  medical?: unknown;
  mode?: unknown;
};

const SYSTEM_INSTRUCTION =
  "You are SAWEK AD / سوِّق إعلانك بنفسك, a converting marketing agency. Produce converting copy in Hebrew, Arabic, and English, plus per-channel packs (Facebook feed, Instagram story, Reels 15s, TikTok, WhatsApp, landing). Use ONLY facts in the user message. Never invent prices, discounts, ratings, testimonials, VIP, ROAS, CAC, medical claims, or competitors. If a fact is missing, write [יש להשלים] / [يجب الاستكمال] / [TO COMPLETE]. Medical: no clinical decoration. Reply with JSON only. Do not overwrite labeled extracted phone, address, hours, offer, name, or website.";

const JSON_SHAPE_ADS = `{
  "he": {"headlines":["...","...","...","...","...","..."],"copy":"","cta":""},
  "ar": {"headlines":["...","...","...","...","...","..."],"copy":"","cta":""},
  "en": {"headlines":["...","...","...","...","...","..."],"copy":"","cta":""},
  "channels": {
    "facebook": {"he":{"headline":"","body":"","cta":""},"ar":{"headline":"","body":"","cta":""},"en":{"headline":"","body":"","cta":""}},
    "instagram": {"he":{"headline":"","body":"","cta":""},"ar":{"headline":"","body":"","cta":""},"en":{"headline":"","body":"","cta":""}},
    "reels": {"he":{"script":"15s 0-3/3-12/12-15"},"ar":{"script":""},"en":{"script":""}},
    "tiktok": {"he":{"script":"15s 0-3/3-12/12-15"},"ar":{"script":""},"en":{"script":""}},
    "whatsapp": {"he":{"script":""},"ar":{"script":""},"en":{"script":""}},
    "landing": {"he":{"title":"","body":""},"ar":{"title":"","body":""},"en":{"title":"","body":""}}
  }
}`;

const JSON_SHAPE_SCAN = `{
  "he": {"headlines":["...","...","...","...","...","..."],"copy":"","cta":""},
  "ar": {"headlines":["...","...","...","...","...","..."],"copy":"","cta":""},
  "en": {"headlines":["...","...","...","...","...","..."],"copy":"","cta":""},
  "channels": {
    "facebook": {"he":{"headline":"","body":"","cta":""},"ar":{"headline":"","body":"","cta":""},"en":{"headline":"","body":"","cta":""}},
    "instagram": {"he":{"headline":"","body":"","cta":""},"ar":{"headline":"","body":"","cta":""},"en":{"headline":"","body":"","cta":""}},
    "reels": {"he":{"script":"15s 0-3/3-12/12-15"},"ar":{"script":""},"en":{"script":""}},
    "tiktok": {"he":{"script":"15s 0-3/3-12/12-15"},"ar":{"script":""},"en":{"script":""}},
    "whatsapp": {"he":{"script":""},"ar":{"script":""},"en":{"script":""}},
    "landing": {"he":{"title":"","body":""},"ar":{"title":"","body":""},"en":{"title":"","body":""}}
  },
  "brand": {"tone":"","positioning":"","problem":"","advantage":"","audience":""}
}`;

function asObj(v: unknown): Record<string, unknown> | null {
  if (v && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>;
  return null;
}

function asString(v: unknown): string | undefined {
  if (typeof v === "string" && v.trim()) return v.trim();
  if (Array.isArray(v)) {
    const joined = v
      .filter((x): x is string => typeof x === "string")
      .map((s) => s.trim())
      .filter(Boolean)
      .join("\n");
    return joined || undefined;
  }
  return undefined;
}

function asStringOrEmpty(v: unknown): string {
  if (typeof v !== "string") return "";
  return v.trim();
}

function asHeadlines(v: unknown): string[] | undefined {
  if (typeof v === "string" && v.trim()) return [v.trim()];
  if (Array.isArray(v)) {
    const list = v
      .filter((x): x is string => typeof x === "string")
      .map((s) => s.trim())
      .filter(Boolean);
    return list.length ? list : undefined;
  }
  return undefined;
}

function parseLooseJson(text: string): Record<string, unknown> | null {
  const stripped = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try {
    const parsed: unknown = JSON.parse(stripped);
    const obj = asObj(parsed);
    if (obj) return obj;
  } catch {
    /* fall through */
  }
  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      const parsed: unknown = JSON.parse(match[0]);
      const obj = asObj(parsed);
      if (obj) return obj;
    } catch {
      return null;
    }
  }
  return null;
}

function parseLocaleBlock(v: unknown): LocaleCopyBlock | undefined {
  const o = asObj(v);
  if (!o) return undefined;
  const headlines = asHeadlines(o.headlines ?? o.headline) ?? [];
  const copy = asString(o.copy ?? o.body ?? o.adCopy) ?? "";
  const cta = asString(o.cta ?? o.CTA) ?? "";
  if (!headlines.length && !copy && !cta) return undefined;
  return { headlines, copy, cta };
}

function parseLocales(obj: Record<string, unknown>): GenerateLocales | undefined {
  const nested = asObj(obj.locales);
  const he = parseLocaleBlock(nested?.he ?? obj.he);
  const ar = parseLocaleBlock(nested?.ar ?? obj.ar);
  const en = parseLocaleBlock(nested?.en ?? obj.en);
  if (!he && !ar && !en) return undefined;
  return {
    ...(he ? { he } : {}),
    ...(ar ? { ar } : {}),
    ...(en ? { en } : {}),
  };
}

function parseCopyTriple(v: unknown): GenerateChannelCopy | undefined {
  const o = asObj(v);
  if (!o) return undefined;
  const headline = asStringOrEmpty(o.headline);
  const body = asStringOrEmpty(o.body ?? o.copy);
  const cta = asStringOrEmpty(o.cta ?? o.CTA);
  if (!headline && !body && !cta) return undefined;
  return { headline, body, cta };
}

function parseScript(v: unknown): GenerateChannelScript | undefined {
  const o = asObj(v);
  if (!o) return undefined;
  const script = asStringOrEmpty(o.script ?? o.body);
  if (!script) return undefined;
  return { script };
}

function parseLanding(v: unknown): GenerateChannelLanding | undefined {
  const o = asObj(v);
  if (!o) return undefined;
  const title = asStringOrEmpty(o.title ?? o.headline);
  const body = asStringOrEmpty(o.body ?? o.copy);
  if (!title && !body) return undefined;
  return { title, body };
}

function parseLangMap<T>(
  v: unknown,
  parseOne: (x: unknown) => T | undefined,
): Partial<Record<GenerateLang, T>> | undefined {
  const o = asObj(v);
  if (!o) return undefined;
  const he = parseOne(o.he);
  const ar = parseOne(o.ar);
  const en = parseOne(o.en);
  if (!he && !ar && !en) return undefined;
  return {
    ...(he ? { he } : {}),
    ...(ar ? { ar } : {}),
    ...(en ? { en } : {}),
  };
}

export function parseChannels(v: unknown): GenerateChannels | undefined {
  const o = asObj(v);
  if (!o) return undefined;
  const facebook = parseLangMap(o.facebook, parseCopyTriple);
  const instagram = parseLangMap(o.instagram, parseCopyTriple);
  const reels = parseLangMap(o.reels, parseScript);
  const tiktok = parseLangMap(o.tiktok, parseScript);
  const whatsapp = parseLangMap(o.whatsapp, parseScript);
  const landing = parseLangMap(o.landing, parseLanding);
  if (!facebook && !instagram && !reels && !tiktok && !whatsapp && !landing) return undefined;
  return {
    ...(facebook ? { facebook } : {}),
    ...(instagram ? { instagram } : {}),
    ...(reels ? { reels } : {}),
    ...(tiktok ? { tiktok } : {}),
    ...(whatsapp ? { whatsapp } : {}),
    ...(landing ? { landing } : {}),
  };
}

function parseBrand(v: unknown): GenerateBrand | undefined {
  const o = asObj(v);
  if (!o) return undefined;
  return {
    tone: asStringOrEmpty(o.tone),
    positioning: asStringOrEmpty(o.positioning),
    problem: asStringOrEmpty(o.problem),
    advantage: asStringOrEmpty(o.advantage),
    audience: asStringOrEmpty(o.audience),
  };
}

function parseStructured(text: string): {
  headlines?: string[];
  copy?: string;
  cta?: string;
  locales?: GenerateLocales;
  channels?: GenerateChannels;
  brand?: GenerateBrand;
} {
  const obj = parseLooseJson(text);
  if (!obj) return {};
  const locales = parseLocales(obj);
  const channels = parseChannels(obj.channels);
  const brand = parseBrand(obj.brand);
  const headlines = asHeadlines(obj.headlines ?? obj.headline);
  const copy = asString(obj.copy ?? obj.body ?? obj.adCopy);
  const cta = asString(obj.cta ?? obj.CTA);
  return {
    ...(headlines ? { headlines } : {}),
    ...(copy ? { copy } : {}),
    ...(cta ? { cta } : {}),
    ...(locales ? { locales } : {}),
    ...(channels ? { channels } : {}),
    ...(brand ? { brand } : {}),
  };
}

function asMode(v: unknown): GenerateMode {
  if (v === "scan" || v === "channels" || v === "ads") return v;
  return "ads";
}

function asLang(v: unknown): GenerateLang | "" {
  if (v === "he" || v === "ar" || v === "en") return v;
  return "";
}

function jsonShapeFor(mode: GenerateMode): string {
  if (mode === "scan") return JSON_SHAPE_SCAN;
  return JSON_SHAPE_ADS;
}

function modeHint(mode: GenerateMode): string {
  if (mode === "scan") {
    return "mode=scan. Include brand {tone,positioning,problem,advantage,audience} filled ONLY from the provided page text. Empty string if that fact is not in the text. Do not put prices, discounts, phone, address, hours, offer, name, or website into brand. Interpret extracted text only — never overwrite labeled phone/address/hours/offer/name/website.";
  }
  if (mode === "channels") {
    return "mode=channels. Fill the channels pack in HE+AR+EN. Use only facts above. Missing fact → [יש להשלים] / [يجب الاستكمال] / [TO COMPLETE].";
  }
  return "mode=ads. Fill HE+AR+EN locale packs (6 headlines each) and the channels pack. Use only facts above.";
}

export function buildUserMessage(body: GenerateBody): string {
  const parts: string[] = [];
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const audience = typeof body.audience === "string" ? body.audience.trim() : "";
  const language = asLang(body.language);
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  const medical = body.medical === true;
  const mode = asMode(body.mode);

  if (description) parts.push(`Description:\n${description}`);
  if (audience) parts.push(`Audience:\n${audience}`);
  if (language) parts.push(`Language: ${language} (still return HE+AR+EN packs)`);
  if (medical) parts.push("Medical: true. No clinical decoration.");
  parts.push(modeHint(mode));
  if (prompt) parts.push(prompt);
  parts.push(`Reply with JSON only, this shape:\n${jsonShapeFor(mode)}\nUse only facts above.`);
  const max = mode === "scan" ? 8000 : 4000;
  return parts.join("\n\n").slice(0, max);
}

function compatFrom(
  parsed: ReturnType<typeof parseStructured>,
  language: GenerateLang | "",
): { headlines?: string[]; copy?: string; cta?: string } {
  const lang: GenerateLang = language || "he";
  const loc = parsed.locales?.[lang] ?? parsed.locales?.he;
  const headlines = loc?.headlines?.length ? loc.headlines : parsed.headlines;
  const copy = loc?.copy || parsed.copy;
  const cta = loc?.cta || parsed.cta;
  return {
    ...(headlines?.length ? { headlines } : {}),
    ...(copy ? { copy } : {}),
    ...(cta ? { cta } : {}),
  };
}

/**
 * Shared Gemini generate. Used by POST /api/generate and ingest-url (no HTTP self-loop).
 * Never logs the API key.
 */
export async function runGeminiGenerate(body: GenerateBody): Promise<GenerateResult> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    return { ok: false, reason: "no_key", useTemplates: true };
  }
  try {
    const mode = asMode(body.mode);
    const language = asLang(body.language);
    const userMessage = buildUserMessage(body);
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({
      model: "gemini-3.6-flash",
      systemInstruction: SYSTEM_INSTRUCTION,
      generationConfig: {
        temperature: body.medical === true ? 0.2 : 0.4,
      },
    });
    const result = await model.generateContent(userMessage);
    const text = result.response.text() ?? "";
    const parsed = parseStructured(text);
    const compat = compatFrom(parsed, language);
    const out: GenerateOk = {
      ok: true,
      text,
      ...compat,
      ...(parsed.locales ? { locales: parsed.locales } : {}),
      ...(parsed.channels ? { channels: parsed.channels } : {}),
    };
    if (mode === "scan" && parsed.brand) {
      out.brand = parsed.brand;
    }
    return out;
  } catch {
    return { ok: false, useTemplates: true };
  }
}
