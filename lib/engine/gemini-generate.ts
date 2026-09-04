import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AngleCopy, CampaignAngles, Intake } from "../types";
import { runtimeEnv } from "../runtime-env";
import {
  classifyVertexHttp,
  clearVertexQuota,
  extractGenerateText,
  fetchGoogleJson,
  geminiApiKeyPresent,
  markVertexQuota,
  recordGeminiOutcome,
  VERTEX_GEMINI_MODELS,
  vertexAccessToken,
  vertexLocation,
  vertexProject,
  vertexQuotaActive,
} from "../vertex";
import { inventsForbidden } from "./coach";
import { parseCampaignAngles, sanitizeAngles } from "./angles";
import { VISION_MAX_BYTES } from "./gemini-client-caps";
import {
  bodyHasFacts as factsPresent,
  FACT_USE_RULE,
  factsToIntake as intakeFromFacts,
  hydrateCopyFromFacts,
  serializeFactsBlock,
  templateFillFromFacts,
} from "./fact-copy";
export { VISION_MAX_BYTES };
export { factsToIntake, bodyHasFacts } from "./fact-copy";

export type GenerateMode = "ads" | "scan" | "channels" | "angles";
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
  angles?: CampaignAngles;
};

export type GenerateFail = {
  ok: false;
  useTemplates?: true;
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
  facts?: unknown;
};

const SYSTEM_INSTRUCTION =
  "You are SAWEK AD / سوِّق إعلانك بنفسك, a converting marketing agency. Produce converting copy in Hebrew, Arabic, and English, plus per-channel packs (Facebook feed, Instagram story, Reels 15s, TikTok, WhatsApp, landing). Use ONLY facts in the user message. Never invent prices, discounts, ratings, testimonials, VIP, ROAS, CAC, medical claims, or competitors. When a labeled fact is present (businessName, phone, city, website, offer, hours, location, whatsapp) you MUST use that exact value — never replace it with [יש להשלים] / [يجب الاستكمال] / [TO COMPLETE]. Incomplete markers only for fields that are truly absent. Medical: no clinical decoration. Reply with JSON only. Do not overwrite labeled extracted phone, address, hours, offer, name, or website. Recreate for each language — never translate literally. Hebrew: direct, action-driving. Arabic: rich marketing, regional (Levant/Gulf-aware), RTL. English: modern SaaS / global. Each locale must be original prose in that language, not a calque of another.";

const JSON_SHAPE_ANGLES = `{
  "angles": {
    "pain": {"he":{"headline":"","copy":"","cta":""},"ar":{"headline":"","copy":"","cta":""},"en":{"headline":"","copy":"","cta":""}},
    "benefit": {"he":{"headline":"","copy":"","cta":""},"ar":{"headline":"","copy":"","cta":""},"en":{"headline":"","copy":"","cta":""}},
    "social_proof": {"he":{"headline":"","copy":"","cta":""},"ar":{"headline":"","copy":"","cta":""},"en":{"headline":"","copy":"","cta":""}},
    "story": {"he":{"headline":"","copy":"","cta":""},"ar":{"headline":"","copy":"","cta":""},"en":{"headline":"","copy":"","cta":""}}
  }
}`;

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
  },
  "angles": {
    "pain": {"he":{"headline":"","copy":"","cta":""},"ar":{"headline":"","copy":"","cta":""},"en":{"headline":"","copy":"","cta":""}},
    "benefit": {"he":{"headline":"","copy":"","cta":""},"ar":{"headline":"","copy":"","cta":""},"en":{"headline":"","copy":"","cta":""}},
    "social_proof": {"he":{"headline":"","copy":"","cta":""},"ar":{"headline":"","copy":"","cta":""},"en":{"headline":"","copy":"","cta":""}},
    "story": {"he":{"headline":"","copy":"","cta":""},"ar":{"headline":"","copy":"","cta":""},"en":{"headline":"","copy":"","cta":""}}
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
  angles?: CampaignAngles;
} {
  const obj = parseLooseJson(text);
  if (!obj) return {};
  const locales = parseLocales(obj);
  const channels = parseChannels(obj.channels);
  const brand = parseBrand(obj.brand);
  const angles = parseCampaignAngles(obj.angles);
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
    ...(angles ? { angles } : {}),
  };
}

function asMode(v: unknown): GenerateMode {
  if (v === "scan" || v === "channels" || v === "ads" || v === "angles") return v;
  return "ads";
}

function asLang(v: unknown): GenerateLang | "" {
  if (v === "he" || v === "ar" || v === "en") return v;
  return "";
}

function jsonShapeFor(mode: GenerateMode): string {
  if (mode === "scan") return JSON_SHAPE_SCAN;
  if (mode === "angles") return JSON_SHAPE_ANGLES;
  return JSON_SHAPE_ADS;
}

function modeHint(mode: GenerateMode): string {
  if (mode === "scan") {
    return "mode=scan. Include brand {tone,positioning,problem,advantage,audience} filled ONLY from the provided page text. Empty string if that fact is not in the text. Do not put prices, discounts, phone, address, hours, offer, name, or website into brand. Interpret extracted text only — never overwrite labeled phone/address/hours/offer/name/website.";
  }
  if (mode === "channels") {
    return "mode=channels. Fill the channels pack in HE+AR+EN. Use labeled facts. Incomplete markers only for truly missing fields. Recreate per language, do not literal-translate.";
  }
  if (mode === "angles") {
    return "mode=angles. Fill angles {pain,benefit,social_proof,story} each with he/ar/en {headline,copy,cta}. Recreate per language — do not translate literally. Social proof: only ratings/reviews/customer counts present in facts; otherwise [יש להשלים] / [يجب الاستكمال] / [TO COMPLETE].";
  }
  return "mode=ads. Fill HE+AR+EN locale packs (6 headlines each), the channels pack, AND angles {pain,benefit,social_proof,story} each with he/ar/en {headline,copy,cta}. Recreate per language — do not translate literally. Social proof: only ratings/reviews/customer counts present in facts; otherwise incomplete markers. Present facts (name, phone, city, website, offer, hours) must appear in the copy.";
}

export function buildUserMessage(body: GenerateBody): string {
  const parts: string[] = [];
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const audience = typeof body.audience === "string" ? body.audience.trim() : "";
  const language = asLang(body.language);
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  const medical = body.medical === true;
  const mode = asMode(body.mode);
  const intake = intakeFromFacts(body);
  const factsBlock = serializeFactsBlock(intake);

  if (factsBlock) {
    parts.push(`${FACT_USE_RULE}\n\nLABELED FACTS:\n${factsBlock}`);
  }
  if (description) parts.push(`Description:\n${description}`);
  if (audience) parts.push(`Audience:\n${audience}`);
  if (language) parts.push(`Language: ${language} (still return HE+AR+EN packs)`);
  if (medical) parts.push("Medical: true. No clinical decoration.");
  parts.push(modeHint(mode));
  if (prompt) parts.push(prompt);
  parts.push(`Reply with JSON only, this shape:\n${jsonShapeFor(mode)}\nUse only facts above. Present facts must appear in the copy.`);
  const max = mode === "scan" ? 8000 : 6000;
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

const GEMINI_TIMEOUT_MS = 45_000;

/**
 * Shared Gemini generate. Used by POST /api/generate and ingest-url (no HTTP self-loop).
 * Never logs the API key.
 */

type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };

type CompleteOk = { ok: true; text: string; model: string; provider: "vertex" | "ai_studio" };
type CompleteFail = { ok: false; reason: "no_key" | "gemini_error" | "quota" | "vertex_denied" };

async function vertexGenerate(
  parts: GeminiPart[],
  temperature: number,
  timeoutMs: number,
  systemInstruction: string = SYSTEM_INSTRUCTION,
): Promise<CompleteOk | CompleteFail | { ok: false; reason: "no_token" }> {
  const project = vertexProject();
  if (!project) return { ok: false, reason: "no_token" };
  const token = await vertexAccessToken();
  if (!token) return { ok: false, reason: "no_token" };
  const location = vertexLocation();
  let last: CompleteFail = { ok: false, reason: "gemini_error" };
  for (const model of VERTEX_GEMINI_MODELS) {
    try {
      const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${encodeURIComponent(project)}/locations/${encodeURIComponent(location)}/publishers/google/models/${encodeURIComponent(model)}:generateContent`;
      const { status, json } = await fetchGoogleJson(
        url,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [{ role: "user", parts }],
            systemInstruction: { parts: [{ text: systemInstruction }] },
            generationConfig: {
              temperature,
              maxOutputTokens: 8192,
              responseMimeType: "application/json",
            },
          }),
        },
        timeoutMs,
      );
      const kind = classifyVertexHttp(status, json);
      if (kind === "ok") {
        const text = extractGenerateText(json);
        if (!text) {
          last = { ok: false, reason: "gemini_error" };
          continue;
        }
        return { ok: true, text, model, provider: "vertex" };
      }
      if (kind === "quota") return { ok: false, reason: "quota" };
      if (kind === "not_found") {
        last = { ok: false, reason: "gemini_error" };
        continue;
      }
      if (kind === "vertex_denied") {
        last = { ok: false, reason: "vertex_denied" };
        continue;
      }
      last = { ok: false, reason: "gemini_error" };
    } catch {
      last = { ok: false, reason: "gemini_error" };
    }
  }
  return last;
}

async function studioGenerate(
  parts: GeminiPart[],
  temperature: number,
  timeoutMs: number,
  systemInstruction: string = SYSTEM_INSTRUCTION,
): Promise<CompleteOk | CompleteFail> {
  const key = runtimeEnv("GEMINI_API_KEY");
  if (!key) return { ok: false, reason: "no_key" };
  const models = [...VERTEX_GEMINI_MODELS];
  let last: CompleteFail = { ok: false, reason: "gemini_error" };
  for (const modelName of models) {
    try {
      const genAI = new GoogleGenerativeAI(key);
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction,
        generationConfig: { temperature, responseMimeType: "application/json" } as { temperature?: number },
      });
      const payload =
        parts.length === 1 && "text" in parts[0]!
          ? parts[0].text
          : parts.map((part) =>
              "text" in part
                ? { text: part.text }
                : { inlineData: { mimeType: part.inlineData.mimeType, data: part.inlineData.data } },
            );
      const result = await model.generateContent(payload, { timeout: timeoutMs });
      const text = result.response.text() ?? "";
      if (!text.trim()) {
        last = { ok: false, reason: "gemini_error" };
        continue;
      }
      return { ok: true, text, model: modelName, provider: "ai_studio" };
    } catch (err) {
      const msg = err instanceof Error ? err.message.toLowerCase() : "";
      if (/429|resource_exhausted|quota/.test(msg)) return { ok: false, reason: "quota" };
      if (/404|not found|not supported/.test(msg)) {
        last = { ok: false, reason: "gemini_error" };
        continue;
      }
      last = { ok: false, reason: "gemini_error" };
    }
  }
  return last;
}

/**
 * Vertex first when available. After Vertex 429, fall through to AI Studio (GEMINI_API_KEY)
 * instead of sticky-blocking the product. Vertex is skipped briefly (TTL) then retried.
 * Never logs keys.
 */
export async function completeGemini(opts: {
  parts: GeminiPart[];
  temperature: number;
  timeoutMs?: number;
  systemInstruction?: string;
}): Promise<CompleteOk | CompleteFail> {
  const timeoutMs = opts.timeoutMs ?? GEMINI_TIMEOUT_MS;
  const system = opts.systemInstruction ?? SYSTEM_INSTRUCTION;
  let vertexReason: "quota" | "no_token" | "vertex_denied" | "gemini_error" | null = null;

  if (!vertexQuotaActive()) {
    const vertex = await vertexGenerate(opts.parts, opts.temperature, timeoutMs, system);
    if (vertex.ok) {
      clearVertexQuota();
      recordGeminiOutcome({ provider: "vertex", reason: "ok", model: vertex.model });
      return vertex;
    }
    if (vertex.reason === "quota") {
      markVertexQuota();
      vertexReason = "quota";
      // Fall through to AI Studio — do NOT sticky-fail the whole process.
    } else if (vertex.reason === "no_token") {
      vertexReason = "no_token";
    } else if (vertex.reason === "vertex_denied") {
      vertexReason = "vertex_denied";
    } else {
      vertexReason = "gemini_error";
    }
  } else {
    vertexReason = "quota";
  }

  const studio = await studioGenerate(opts.parts, opts.temperature, timeoutMs, system);
  if (studio.ok) {
    recordGeminiOutcome({ provider: "ai_studio", reason: "ok", model: studio.model });
    return studio;
  }
  const noProviders =
    (vertexReason === "no_token" || vertexReason === "quota") && studio.reason === "no_key";
  recordGeminiOutcome({
    provider:
      studio.reason === "no_key"
        ? vertexReason === "quota"
          ? "vertex"
          : "none"
        : "ai_studio",
    reason: noProviders
      ? vertexReason === "quota"
        ? "quota"
        : "no_key"
      : studio.reason === "quota"
        ? "quota"
        : "gemini_error",
  });
  if (studio.reason === "no_key" && (vertexReason === "no_token" || !vertexReason)) {
    return { ok: false, reason: "no_key" };
  }
  if (studio.reason === "no_key" && vertexReason === "quota") {
    return { ok: false, reason: "quota" };
  }
  if (studio.reason === "quota") return { ok: false, reason: "quota" };
  return {
    ok: false,
    reason:
      studio.reason === "vertex_denied" || vertexReason === "vertex_denied"
        ? "vertex_denied"
        : "gemini_error",
  };
}

export async function runGeminiGenerate(body: GenerateBody): Promise<GenerateResult> {
  if (!factsPresent(body)) {
    recordGeminiOutcome({ provider: "none", reason: "no_facts" });
    return { ok: false, reason: "no_facts", useTemplates: true };
  }
  const fallback = () => hydrateCopyFromFacts(templateFillFromFacts(body), body);
  try {
    const mode = asMode(body.mode);
    const language = asLang(body.language);
    const userMessage = buildUserMessage(body);
    const completed = await completeGemini({
      parts: [{ text: userMessage }],
      temperature: body.medical === true ? 0.2 : 0.4,
    });
    if (!completed.ok) {
      return fallback();
    }
    const text = completed.text;
    const parsed = parseStructured(text);
    const compat = compatFrom(parsed, language);
    const intake = intakeFromFacts(body);
    const angles = parsed.angles ? sanitizeAngles(parsed.angles, intake) : undefined;
    const thin =
      !parsed.locales &&
      !compat.headlines?.length &&
      !compat.copy &&
      !compat.cta &&
      !parsed.channels;
    if (thin) return fallback();
    const out: GenerateOk = hydrateCopyFromFacts(
      {
        ok: true,
        text,
        ...compat,
        ...(parsed.locales ? { locales: parsed.locales } : {}),
        ...(parsed.channels ? { channels: parsed.channels } : {}),
        ...(angles ? { angles } : {}),
        ...(mode === "scan" && parsed.brand ? { brand: parsed.brand } : {}),
      },
      body,
    );
    return out;
  } catch {
    return fallback();
  }
}


export const GEMINI_MODEL = "gemini-2.5-flash";
export const GEMINI_MODELS = VERTEX_GEMINI_MODELS;

const JSON_SHAPE_VISION = `{
  "elements":["..."],
  "visualFixes":["...","...","..."],
  "reels":[
    {"channel":"reels","shots":[{"t":"0-3","scene":"","onScreen":"","vo":""},{"t":"3-12","scene":"","onScreen":"","vo":""},{"t":"12-15","scene":"","onScreen":"","vo":""}],"he":{"headline":"","copy":"","cta":""},"ar":{"headline":"","copy":"","cta":""},"en":{"headline":"","copy":"","cta":""}},
    {"channel":"tiktok","shots":[{"t":"0-3","scene":"","onScreen":"","vo":""},{"t":"3-12","scene":"","onScreen":"","vo":""},{"t":"12-15","scene":"","onScreen":"","vo":""}],"he":{"headline":"","copy":"","cta":""},"ar":{"headline":"","copy":"","cta":""},"en":{"headline":"","copy":"","cta":""}},
    {"channel":"shorts","shots":[{"t":"0-3","scene":"","onScreen":"","vo":""},{"t":"3-12","scene":"","onScreen":"","vo":""},{"t":"12-15","scene":"","onScreen":"","vo":""}],"he":{"headline":"","copy":"","cta":""},"ar":{"headline":"","copy":"","cta":""},"en":{"headline":"","copy":"","cta":""}}
  ]
}`;

const JSON_SHAPE_SCORE = `{
  "score": 1,
  "weaknesses":["...","...","..."],
  "rewrite": {
    "he":{"headline":"","copy":"","cta":""},
    "ar":{"headline":"","copy":"","cta":""},
    "en":{"headline":"","copy":"","cta":""}
  }
}`;

function noKey(): GenerateFail {
  return { ok: false, reason: "no_key", useTemplates: true };
}

function geminiError(): GenerateFail {
  return { ok: false, reason: "gemini_error" };
}

export function geminiFailFromEnv(): GenerateFail {
  return geminiApiKeyPresent() || vertexProject() ? geminiError() : noKey();
}


function padThree(list: string[], fallback: string): string[] {
  const cleaned = list.map((s) => s.trim()).filter(Boolean).slice(0, 3);
  while (cleaned.length < 3) cleaned.push(fallback);
  return cleaned;
}

export type VisionBody = {
  imageBase64?: unknown;
  imageUrl?: unknown;
  mime?: unknown;
  description?: unknown;
  audience?: unknown;
  language?: unknown;
  medical?: unknown;
  facts?: unknown;
};

export type VisionShot = { t: string; scene: string; onScreen: string; vo: string };
export type VisionReel = {
  channel: "reels" | "tiktok" | "shorts";
  shots: VisionShot[];
  he?: AngleCopy;
  ar?: AngleCopy;
  en?: AngleCopy;
};

export type VisionOk = {
  ok: true;
  elements: string[];
  visualFixes: [string, string, string] | string[];
  reels: VisionReel[];
};

export type VisionResult = VisionOk | GenerateFail;

function parseAngleCopyLoose(v: unknown): AngleCopy | undefined {
  const o = asObj(v);
  if (!o) return undefined;
  const headline = asStringOrEmpty(o.headline);
  const copy = asStringOrEmpty(o.copy ?? o.body);
  const cta = asStringOrEmpty(o.cta ?? o.CTA);
  if (!headline && !copy && !cta) return undefined;
  return { headline, copy, cta };
}

function parseShot(v: unknown): VisionShot | undefined {
  const o = asObj(v);
  if (!o) return undefined;
  return {
    t: asStringOrEmpty(o.t ?? o.time),
    scene: asStringOrEmpty(o.scene),
    onScreen: asStringOrEmpty(o.onScreen ?? o.on_screen ?? o.text),
    vo: asStringOrEmpty(o.vo ?? o.voiceover ?? o.voice),
  };
}

function parseReel(v: unknown): VisionReel | undefined {
  const o = asObj(v);
  if (!o) return undefined;
  const ch = asStringOrEmpty(o.channel).toLowerCase();
  const channel: VisionReel["channel"] =
    ch === "tiktok" ? "tiktok" : ch === "shorts" || ch === "youtube" ? "shorts" : "reels";
  const shotsRaw = Array.isArray(o.shots) ? o.shots : [];
  const shots = shotsRaw.map(parseShot).filter((s): s is VisionShot => Boolean(s));
  const locales = asObj(o.he) || asObj(o.ar) || asObj(o.en) || asObj(o.locales)
    ? {
        he: parseAngleCopyLoose(o.he ?? asObj(o.locales)?.he),
        ar: parseAngleCopyLoose(o.ar ?? asObj(o.locales)?.ar),
        en: parseAngleCopyLoose(o.en ?? asObj(o.locales)?.en),
      }
    : {};
  return {
    channel,
    shots,
    ...(locales.he ? { he: locales.he } : {}),
    ...(locales.ar ? { ar: locales.ar } : {}),
    ...(locales.en ? { en: locales.en } : {}),
  };
}

function parseVision(text: string): Omit<VisionOk, "ok"> | null {
  const obj = parseLooseJson(text);
  if (!obj) return null;
  const elements = Array.isArray(obj.elements)
    ? obj.elements.filter((x): x is string => typeof x === "string").map((s) => s.trim()).filter(Boolean)
    : [];
  const visualFixesRaw = Array.isArray(obj.visualFixes)
    ? obj.visualFixes.filter((x): x is string => typeof x === "string").map((s) => s.trim()).filter(Boolean)
    : [];
  const visualFixes = padThree(visualFixesRaw, "[TO COMPLETE]");
  const reelsRaw = Array.isArray(obj.reels) ? obj.reels : [];
  const reels = reelsRaw.map(parseReel).filter((r): r is VisionReel => Boolean(r)).slice(0, 3);
  if (!elements.length && !reels.length) return null;
  return { elements, visualFixes, reels };
}

function stripDataUrl(raw: string): { mime: string; data: string } | null {
  const s = raw.trim();
  const m = s.match(/^data:([^;]+);base64,(.+)$/i);
  if (m) return { mime: m[1]!.toLowerCase(), data: m[2]!.replace(/\s/g, "") };
  if (/^[A-Za-z0-9+/=\s]+$/.test(s) && s.replace(/\s/g, "").length > 80) {
    return { mime: "", data: s.replace(/\s/g, "") };
  }
  return null;
}

export function decodeVisionImage(body: VisionBody): { mime: string; data: string } | null {
  const mimeHint = typeof body.mime === "string" ? body.mime.trim().toLowerCase() : "";
  if (typeof body.imageBase64 === "string" && body.imageBase64.trim()) {
    const parsed = stripDataUrl(body.imageBase64);
    if (!parsed) return null;
    const mime = parsed.mime || mimeHint || "image/jpeg";
    if (!/^image\/(jpeg|jpg|png|webp)$/.test(mime)) return null;
    const bytes = Math.floor((parsed.data.length * 3) / 4);
    if (bytes > VISION_MAX_BYTES) return null;
    return { mime: mime === "image/jpg" ? "image/jpeg" : mime, data: parsed.data };
  }
  return null;
}

export async function runGeminiVision(body: VisionBody, image: { mime: string; data: string }): Promise<VisionResult> {
  try {
    const language = asLang(body.language);
    const intake = intakeFromFacts(body);
    const factsBlob = [
      intake.businessName && `businessName: ${intake.businessName}`,
      intake.description && `description: ${intake.description}`,
      intake.audience && `audience: ${intake.audience}`,
      intake.uniqueAdvantage && `uniqueAdvantage: ${intake.uniqueAdvantage}`,
      intake.biggestProblem && `biggestProblem: ${intake.biggestProblem}`,
      intake.offer && `offer: ${intake.offer}`,
      intake.pastResults && `pastResults: ${intake.pastResults}`,
    ]
      .filter(Boolean)
      .join("\n");
    const prompt = [
      "Analyze this image for an ad campaign. Do not invent prices, discounts, ratings, testimonials, VIP, ROAS, CAC, or medical claims.",
      "Recreate HE/AR/EN packs — never translate literally. Hebrew: direct, action-driving. Arabic: rich marketing, regional, RTL. English: modern SaaS/global.",
      "elements: visible objects, text, brand cues actually in the image.",
      "visualFixes: exactly 3 concrete production fixes.",
      "reels: 3 scripts (reels, tiktok, shorts), each 15s with shots {t, scene, onScreen, vo} plus he/ar/en {headline,copy,cta}.",
      language ? `Primary language: ${language} (still return HE+AR+EN).` : "",
      body.medical === true ? "Medical: true. No clinical decoration." : "",
      factsBlob ? `Intake facts (use only these for claims):\n${factsBlob}` : "No extra intake facts.",
      `Reply with JSON only:\n${JSON_SHAPE_VISION}`,
    ]
      .filter(Boolean)
      .join("\n\n")
      .slice(0, 4000);
    const completed = await completeGemini({
      parts: [
        { inlineData: { mimeType: image.mime, data: image.data } },
        { text: prompt },
      ],
      temperature: body.medical === true ? 0.2 : 0.4,
    });
    if (!completed.ok) {
      if (completed.reason === "no_key") return noKey();
      if (completed.reason === "quota") return { ok: false, reason: "quota" };
      return geminiError();
    }
    const text = completed.text;
    const parsed = parseVision(text);
    if (!parsed) return geminiError();
    return { ok: true, ...parsed };
  } catch {
    return geminiError();
  }
}

export type ScoreBody = {
  text?: unknown;
  language?: unknown;
  facts?: unknown;
  medical?: unknown;
  description?: unknown;
  audience?: unknown;
};

export type ScoreOk = {
  ok: true;
  score: number;
  weaknesses: string[];
  rewrite: Partial<Record<GenerateLang, AngleCopy>>;
};

export type ScoreResult = ScoreOk | GenerateFail;

function parseScore(text: string): Omit<ScoreOk, "ok"> | null {
  const obj = parseLooseJson(text);
  if (!obj) return null;
  const n = Number(obj.score);
  const score = Number.isFinite(n) ? Math.max(1, Math.min(100, Math.round(n))) : 0;
  const weaknessesRaw = Array.isArray(obj.weaknesses)
    ? obj.weaknesses.filter((x): x is string => typeof x === "string").map((s) => s.trim()).filter(Boolean)
    : [];
  const rewriteObj = asObj(obj.rewrite) ?? obj;
  const he = parseAngleCopyLoose(rewriteObj.he);
  const ar = parseAngleCopyLoose(rewriteObj.ar);
  const en = parseAngleCopyLoose(rewriteObj.en);
  if (!score && !weaknessesRaw.length && !he && !ar && !en) return null;
  return {
    score: score || 1,
    weaknesses: padThree(weaknessesRaw, "[TO COMPLETE]"),
    rewrite: {
      ...(he ? { he } : {}),
      ...(ar ? { ar } : {}),
      ...(en ? { en } : {}),
    },
  };
}

function sanitizeRewrite(
  rewrite: Partial<Record<GenerateLang, AngleCopy>>,
  intake: Intake | null,
): Partial<Record<GenerateLang, AngleCopy>> {
  if (!intake) return rewrite;
  const out: Partial<Record<GenerateLang, AngleCopy>> = {};
  for (const loc of ["he", "ar", "en"] as GenerateLang[]) {
    const pack = rewrite[loc];
    if (!pack) continue;
    const joined = `${pack.headline}\n${pack.copy}\n${pack.cta}`;
    if (inventsForbidden(joined, intake)) {
      const m = loc === "he" ? "[יש להשלים]" : loc === "ar" ? "[يجب الاستكمال]" : "[TO COMPLETE]";
      out[loc] = { headline: m, copy: m, cta: m };
    } else {
      out[loc] = pack;
    }
  }
  return out;
}

export async function runGeminiScore(body: ScoreBody): Promise<ScoreResult> {
  const adText = typeof body.text === "string" ? body.text.trim() : "";
  if (!adText) return geminiError();
  try {
    const language = asLang(body.language);
    const intake = intakeFromFacts(body);
    const hasFacts = Boolean(
      intake.description.trim() ||
        intake.businessName.trim() ||
        intake.audience.trim() ||
        (typeof body.facts === "string" && body.facts.trim()),
    );
    const prompt = [
      "Score this ad copy for conversion from 1-100. Be honest. Do not invent prices, discounts, ratings, testimonials, VIP, ROAS, CAC, or medical claims in the rewrite.",
      "Recreate rewrite packs — never translate literally. Hebrew: direct, action-driving. Arabic: rich marketing, regional, RTL. English: modern SaaS/global.",
      "weaknesses: exactly 3 concrete, actionable problems.",
      "rewrite: HE+AR+EN {headline,copy,cta} that fixes those weaknesses using ONLY provided facts. Missing fact → [יש להשלים] / [يجب الاستكمال] / [TO COMPLETE].",
      language ? `Primary language: ${language} (still return HE+AR+EN rewrite).` : "",
      body.medical === true ? "Medical: true. No clinical decoration." : "",
      hasFacts
        ? `Facts (claims must come from here):\n${intake.businessName}\n${intake.description}\n${intake.audience}\n${intake.uniqueAdvantage}\n${intake.biggestProblem}\n${intake.offer}\n${intake.pastResults}`
        : "No extra facts. Do not invent social proof, prices, or ratings.",
      `Ad copy to score:\n${adText.slice(0, 2500)}`,
      `Reply with JSON only:\n${JSON_SHAPE_SCORE}`,
    ]
      .filter(Boolean)
      .join("\n\n")
      .slice(0, 5000);
    const completed = await completeGemini({
      parts: [{ text: prompt }],
      temperature: body.medical === true ? 0.2 : 0.4,
    });
    if (!completed.ok) {
      if (completed.reason === "no_key") return noKey();
      if (completed.reason === "quota") return { ok: false, reason: "quota" };
      return geminiError();
    }
    const text = completed.text;
    const parsed = parseScore(text);
    if (!parsed) return geminiError();
    const rewrite = sanitizeRewrite(parsed.rewrite, hasFacts ? intake : null);
    return { ok: true, score: parsed.score, weaknesses: parsed.weaknesses, rewrite };
  } catch {
    return geminiError();
  }
}
