import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AngleCopy, CampaignAngles, Intake } from "../types";
import { runtimeEnv } from "../runtime-env";
import {
  AI_STUDIO_GEMINI_MODELS,
  classifyVertexHttp,
  clearVertexQuota,
  extractGenerateText,
  fetchGoogleJson,
  geminiApiKeyPresent,
  markVertexQuota,
  modelsForTier,
  recordGeminiOutcome,
  type GeminiTier,
  vertexAccessToken,
  vertexLocation,
  vertexProject,
  vertexQuotaActive,
} from "../vertex";
import { inventsForbidden } from "./coach";
import { emptyIntake } from "./validate";
import {
  ANGLE_IDS,
  ANGLE_TO_KIND,
  parseCampaignAngles,
  sanitizeAngles,
} from "./angles";
import { generateVariants } from "./copy";
import {
  landingBody,
  landingH1,
  spokenBody,
  spokenCta,
  spokenHeadline,
  whatsappScript,
} from "./spoken";
import { VISION_MAX_BYTES } from "./gemini-client-caps";
export { VISION_MAX_BYTES };

export type GenerateMode =
  | "ads"
  | "scan"
  | "channels"
  | "angles"
  | "variations"
  | "strategy"
  | "audit"
  | "calendar"
  | "scripts";

/** Pro = deep agency jobs. Flash = burst variations and short channel copy. */
export function tierForGenerateMode(mode: GenerateMode): GeminiTier {
  if (mode === "variations" || mode === "channels" || mode === "angles") return "flash";
  return "pro";
}
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
  /** gemini = model output; spoken = fact-filled local engine when AI fails/incomplete. */
  source?: "gemini" | "spoken";
  model?: string;
  provider?: "vertex" | "ai_studio";
  tier?: GeminiTier;
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
  "You are SAWEK AD / سوِّق إعلانك بنفسك, a converting marketing agency. Produce converting copy in Hebrew, Arabic, and English, plus per-channel packs (Facebook feed, Instagram story, Reels 15s, TikTok, WhatsApp, landing). Use ONLY facts in the user message. Never invent prices, discounts, ratings, testimonials, VIP, ROAS, CAC, medical claims, or competitors. If a fact is missing, write [יש להשלים] / [يجب الاستكمال] / [TO COMPLETE]. Medical: no clinical decoration. Reply with JSON only. Do not overwrite labeled extracted phone, address, hours, offer, name, or website. Recreate for each language — never translate literally. Hebrew: direct, action-driving. Arabic: rich marketing, regional (Levant/Gulf-aware), RTL. English: modern SaaS / global. Each locale must be original prose in that language, not a calque of another.";

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
  if (
    v === "scan" ||
    v === "channels" ||
    v === "ads" ||
    v === "angles" ||
    v === "variations" ||
    v === "strategy" ||
    v === "audit" ||
    v === "calendar" ||
    v === "scripts"
  ) {
    return v;
  }
  return "ads";
}

function asLang(v: unknown): GenerateLang | "" {
  if (v === "he" || v === "ar" || v === "en") return v;
  return "";
}

const JSON_SHAPE_VARIATIONS = `{
  "variations":[
    {"channel":"meta","kind":"headline","he":{"headline":"","body":"","cta":""},"ar":{"headline":"","body":"","cta":""},"en":{"headline":"","body":"","cta":""}}
  ]
}`;

const JSON_SHAPE_STRATEGY = `{
  "audience":{"he":"","ar":"","en":""},
  "strategy":{"he":"","ar":"","en":""},
  "psychology":{"he":"","ar":"","en":""}
}`;

const JSON_SHAPE_AUDIT = `{
  "insights":[{"he":"","ar":"","en":""},{"he":"","ar":"","en":""},{"he":"","ar":"","en":""}]
}`;

const JSON_SHAPE_CALENDAR = `{
  "weeks":[{"week":1,"theme":{"he":"","ar":"","en":""},"action":{"he":"","ar":"","en":""}}]
}`;

const JSON_SHAPE_SCRIPTS = `{
  "scripts":[
    {"channel":"reels","he":"","ar":"","en":""},
    {"channel":"whatsapp","he":"","ar":"","en":""},
    {"channel":"tiktok","he":"","ar":"","en":""}
  ]
}`;

function jsonShapeFor(mode: GenerateMode): string {
  if (mode === "scan") return JSON_SHAPE_SCAN;
  if (mode === "angles") return JSON_SHAPE_ANGLES;
  if (mode === "variations") return JSON_SHAPE_VARIATIONS;
  if (mode === "strategy") return JSON_SHAPE_STRATEGY;
  if (mode === "audit") return JSON_SHAPE_AUDIT;
  if (mode === "calendar") return JSON_SHAPE_CALENDAR;
  if (mode === "scripts") return JSON_SHAPE_SCRIPTS;
  return JSON_SHAPE_ADS;
}

function modeHint(mode: GenerateMode): string {
  if (mode === "scan") {
    return "mode=scan. Include brand {tone,positioning,problem,advantage,audience} filled ONLY from the provided page text. Empty string if that fact is not in the text. Do not put prices, discounts, phone, address, hours, offer, name, or website into brand. Interpret extracted text only — never overwrite labeled phone/address/hours/offer/name/website.";
  }
  if (mode === "channels") {
    return "mode=channels. Fill the channels pack in HE+AR+EN. Use only facts above. Missing fact → [יש להשלים] / [يجب الاستكمال] / [TO COMPLETE]. Recreate per language, do not literal-translate.";
  }
  if (mode === "angles") {
    return "mode=angles. Fill angles {pain,benefit,social_proof,story} each with he/ar/en {headline,copy,cta}. Recreate per language — do not translate literally. Social proof: only ratings/reviews/customer counts present in facts; otherwise [יש להשלים] / [يجب الاستكمال] / [TO COMPLETE].";
  }
  if (mode === "variations") {
    return "mode=variations. FLASH path. Produce 12–18 SHORT ad variations across channels meta, google, whatsapp, story. Each variation needs he/ar/en {headline,body,cta}. Headlines ≤ 40 chars. Bodies ≤ 90 chars for Meta/Google, ≤ 300 for WhatsApp. Recreate per language — do not literal-translate. No invented prices, ROAS, ratings.";
  }
  if (mode === "strategy") {
    return "mode=strategy. PRO path. Deep CMO strategy psychologically tuned to the audience in the facts. Fill audience / strategy / psychology in HE+AR+EN. Use only facts. Never invent ROAS, CAC, lead counts, or competitors.";
  }
  if (mode === "audit") {
    return "mode=audit. PRO path. Site-audit insights from provided facts only. 3 insight lines HE+AR+EN. No invented metrics.";
  }
  if (mode === "calendar") {
    return "mode=calendar. PRO path. 8–13 week campaign calendar from facts. theme + action per week in HE+AR+EN. Planning only — no fake ROAS.";
  }
  if (mode === "scripts") {
    return "mode=scripts. PRO path. Script pack for reels, tiktok, whatsapp in HE+AR+EN. 15s structure 0-3 / 3-12 / 12-15 for video. Facts only.";
  }
  return "mode=ads. Fill HE+AR+EN locale packs (6 headlines each), the channels pack, AND angles {pain,benefit,social_proof,story} each with he/ar/en {headline,copy,cta}. Recreate per language — do not translate literally. Social proof: only ratings/reviews/customer counts present in facts; otherwise incomplete markers.";
}

function factsBlockFromBody(body: GenerateBody): string {
  const intake = factsToIntake(body);
  const lines = [
    intake.businessName && `businessName: ${intake.businessName}`,
    intake.category && `category: ${intake.category}`,
    intake.description && `description: ${intake.description}`,
    intake.location && `location: ${intake.location}`,
    intake.audience && `audience: ${intake.audience}`,
    intake.offer && `offer: ${intake.offer}`,
    intake.uniqueAdvantage && `uniqueAdvantage: ${intake.uniqueAdvantage}`,
    intake.biggestProblem && `biggestProblem: ${intake.biggestProblem}`,
    intake.mainGoal && `mainGoal: ${intake.mainGoal}`,
    intake.website && `website: ${intake.website}`,
    intake.whatsapp && `whatsapp: ${intake.whatsapp}`,
    intake.clinicHours && `clinicHours: ${intake.clinicHours}`,
    intake.brandTone && `brandTone: ${intake.brandTone}`,
    intake.brandPositioning && `brandPositioning: ${intake.brandPositioning}`,
    intake.pastResults && `pastResults: ${intake.pastResults}`,
  ].filter(Boolean);
  return lines.join("\n");
}

export function buildUserMessage(body: GenerateBody): string {
  const parts: string[] = [];
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const audience = typeof body.audience === "string" ? body.audience.trim() : "";
  const language = asLang(body.language);
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  const medical = body.medical === true;
  const mode = asMode(body.mode);
  const factsBlock = factsBlockFromBody(body);

  if (factsBlock) parts.push(`Facts (use only these):\n${factsBlock}`);
  if (description && (!factsBlock || !factsBlock.includes(description.slice(0, 40)))) {
    parts.push(`Description:\n${description}`);
  }
  if (audience) parts.push(`Audience:\n${audience}`);
  if (language) parts.push(`Language: ${language} (still return HE+AR+EN packs)`);
  if (medical) parts.push("Medical: true. No clinical decoration.");
  parts.push(modeHint(mode));
  if (prompt) parts.push(prompt);
  parts.push(`Reply with JSON only, this shape:\n${jsonShapeFor(mode)}\nUse only facts above. Prefer real businessName / phone / city / offer over incomplete markers when those facts exist.`);
  const max = mode === "scan" ? 8000 : 5000;
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

const GEMINI_TIMEOUT_MS = 20_000;

/**
 * Shared Gemini generate. Used by POST /api/generate and ingest-url (no HTTP self-loop).
 * Never logs the API key.
 */
export function bodyHasFacts(body: GenerateBody): boolean {
  const desc = typeof body.description === "string" ? body.description.trim() : "";
  const audience = typeof body.audience === "string" ? body.audience.trim() : "";
  if (desc.length > 2 || audience.length > 2) return true;
  const facts = body.facts;
  if (typeof facts === "string" && facts.trim().length > 2) return true;
  if (facts && typeof facts === "object" && !Array.isArray(facts)) {
    const o = facts as Record<string, unknown>;
    const name = typeof o.businessName === "string" ? o.businessName.trim() : "";
    const d = typeof o.description === "string" ? o.description.trim() : "";
    const site = typeof o.website === "string" ? o.website.trim() : "";
    if (name || d || site) return true;
  }
  return false;
}

type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };

type CompleteOk = { ok: true; text: string; model: string; provider: "vertex" | "ai_studio" };
type CompleteFail = { ok: false; reason: "no_key" | "gemini_error" | "quota" | "vertex_denied" };

async function vertexGenerate(
  parts: GeminiPart[],
  temperature: number,
  timeoutMs: number,
  systemInstruction: string = SYSTEM_INSTRUCTION,
  tier: GeminiTier = "flash",
  grounding = false,
): Promise<CompleteOk | CompleteFail | { ok: false; reason: "no_token" }> {
  const project = vertexProject();
  if (!project) return { ok: false, reason: "no_token" };
  const token = await vertexAccessToken();
  if (!token) return { ok: false, reason: "no_token" };
  const location = vertexLocation();
  let last: CompleteFail = { ok: false, reason: "gemini_error" };
  for (const model of modelsForTier(tier, "vertex")) {
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
            generationConfig: { temperature, maxOutputTokens: 8192 },
            ...(grounding ? { tools: [{ googleSearch: {} }] } : {}),
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
  tier: GeminiTier = "flash",
): Promise<CompleteOk | CompleteFail> {
  const key = runtimeEnv("GEMINI_API_KEY");
  if (!key) return { ok: false, reason: "no_key" };
  const models = [...modelsForTier(tier, "ai_studio")];
  if (tier === "pro") models.push(...AI_STUDIO_GEMINI_MODELS);
  let last: CompleteFail = { ok: false, reason: "gemini_error" };
  for (const modelName of models) {
    try {
      const genAI = new GoogleGenerativeAI(key);
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction,
        generationConfig: { temperature },
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
  /** pro = CMO/strategy/audit/calendar/scripts; flash = burst variations. Default flash. */
  tier?: GeminiTier;
  /** Vertex Google Search grounding — trends only. Never invent live platform metrics. */
  grounding?: boolean;
}): Promise<CompleteOk | CompleteFail> {
  const timeoutMs = opts.timeoutMs ?? GEMINI_TIMEOUT_MS;
  const system = opts.systemInstruction ?? SYSTEM_INSTRUCTION;
  const tier = opts.tier ?? "flash";
  let vertexReason: "quota" | "no_token" | "vertex_denied" | "gemini_error" | null = null;

  if (!vertexQuotaActive()) {
    const vertex = await vertexGenerate(
      opts.parts,
      opts.temperature,
      timeoutMs,
      system,
      tier,
      opts.grounding === true,
    );
    if (vertex.ok) {
      clearVertexQuota();
      recordGeminiOutcome({ provider: "vertex", reason: "ok", model: vertex.model, tier });
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

  const studio = await studioGenerate(opts.parts, opts.temperature, timeoutMs, system, tier);
  if (studio.ok) {
    recordGeminiOutcome({ provider: "ai_studio", reason: "ok", model: studio.model, tier });
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
    tier,
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

const VARIANT_KIND_ORDER = [
  "strong_offer",
  "very_short",
  "emotional",
  "narrative",
  "direct_sales",
  "unique_advantage",
] as const;

const INCOMPLETE_RE = /\[יש להשלים\]|\[يجب الاستكمال\]|\[TO COMPLETE\]/i;

function isIncompleteText(s: string | undefined): boolean {
  if (!s || !s.trim()) return true;
  const t = s.trim();
  if (INCOMPLETE_RE.test(t)) return true;
  // mostly markers (e.g. repeated incomplete tokens)
  const cleaned = t.replace(INCOMPLETE_RE, "").replace(/[\s.,;:|\-–—]/g, "");
  return cleaned.length < 2;
}

function localeMostlyIncomplete(block: LocaleCopyBlock | undefined): boolean {
  if (!block) return true;
  const heads = block.headlines || [];
  const incompleteHeads = heads.filter((h) => isIncompleteText(h)).length;
  const headBad = !heads.length || incompleteHeads >= Math.ceil(heads.length * 0.5);
  const copyBad = isIncompleteText(block.copy);
  const ctaBad = isIncompleteText(block.cta);
  return headBad && (copyBad || ctaBad);
}

export function generateMostlyIncomplete(
  locales: GenerateLocales | undefined,
  headlines?: string[],
  copy?: string,
  cta?: string,
): boolean {
  if (locales && (locales.he || locales.ar || locales.en)) {
    const blocks = [locales.he, locales.ar, locales.en].filter(Boolean) as LocaleCopyBlock[];
    if (!blocks.length) return true;
    const bad = blocks.filter((b) => localeMostlyIncomplete(b)).length;
    return bad >= Math.ceil(blocks.length * 0.5);
  }
  const heads = headlines || [];
  if (!heads.length && !copy && !cta) return true;
  const incompleteHeads = heads.filter((h) => isIncompleteText(h)).length;
  return (
    (!heads.length || incompleteHeads >= Math.ceil(Math.max(heads.length, 1) * 0.5)) &&
    isIncompleteText(copy) &&
    isIncompleteText(cta)
  );
}

/** High-quality HE+AR+EN packs from intake facts via spoken/template engine. */
export function spokenGenerateOk(body: GenerateBody): GenerateOk {
  const intake = factsToIntake(body);
  const language = asLang(body.language) || "he";
  const variants = generateVariants(intake);
  const locales: GenerateLocales = {};
  for (const loc of ["he", "ar", "en"] as GenerateLang[]) {
    const pack = variants.filter((v) => v.locale === loc);
    const headlines = VARIANT_KIND_ORDER.map(
      (k) => pack.find((v) => v.kind === k)?.headline || spokenHeadline(k, intake, loc),
    ).filter((h) => h.trim());
    const primary =
      pack.find((v) => v.kind === "strong_offer") ||
      pack[0] || {
        headline: spokenHeadline("strong_offer", intake, loc),
        primaryText: spokenBody("strong_offer", intake, loc),
        cta: spokenCta(intake, loc),
      };
    locales[loc] = {
      headlines: headlines.length ? headlines.slice(0, 6) : [primary.headline],
      copy: primary.primaryText || spokenBody("strong_offer", intake, loc),
      cta: primary.cta || spokenCta(intake, loc),
    };
  }
  const channels: GenerateChannels = {
    facebook: {
      he: { headline: locales.he!.headlines[0]!, body: locales.he!.copy, cta: locales.he!.cta },
      ar: { headline: locales.ar!.headlines[0]!, body: locales.ar!.copy, cta: locales.ar!.cta },
      en: { headline: locales.en!.headlines[0]!, body: locales.en!.copy, cta: locales.en!.cta },
    },
    instagram: {
      he: { headline: locales.he!.headlines[1] || locales.he!.headlines[0]!, body: locales.he!.copy, cta: locales.he!.cta },
      ar: { headline: locales.ar!.headlines[1] || locales.ar!.headlines[0]!, body: locales.ar!.copy, cta: locales.ar!.cta },
      en: { headline: locales.en!.headlines[1] || locales.en!.headlines[0]!, body: locales.en!.copy, cta: locales.en!.cta },
    },
    reels: {
      he: { script: spokenBody("very_short", intake, "he") },
      ar: { script: spokenBody("very_short", intake, "ar") },
      en: { script: spokenBody("very_short", intake, "en") },
    },
    tiktok: {
      he: { script: spokenBody("emotional", intake, "he") },
      ar: { script: spokenBody("emotional", intake, "ar") },
      en: { script: spokenBody("emotional", intake, "en") },
    },
    whatsapp: {
      he: { script: whatsappScript(intake, "he") },
      ar: { script: whatsappScript(intake, "ar") },
      en: { script: whatsappScript(intake, "en") },
    },
    landing: {
      he: { title: landingH1(intake, "he"), body: landingBody(intake, "he") },
      ar: { title: landingH1(intake, "ar"), body: landingBody(intake, "ar") },
      en: { title: landingH1(intake, "en"), body: landingBody(intake, "en") },
    },
  };
  const anglesRaw: CampaignAngles = {};
  for (const id of ANGLE_IDS) {
    const kind = ANGLE_TO_KIND[id];
    anglesRaw[id] = {
      he: {
        headline: spokenHeadline(kind, intake, "he"),
        copy: spokenBody(kind, intake, "he"),
        cta: spokenCta(intake, "he"),
      },
      ar: {
        headline: spokenHeadline(kind, intake, "ar"),
        copy: spokenBody(kind, intake, "ar"),
        cta: spokenCta(intake, "ar"),
      },
      en: {
        headline: spokenHeadline(kind, intake, "en"),
        copy: spokenBody(kind, intake, "en"),
        cta: spokenCta(intake, "en"),
      },
    };
  }
  // Keep social_proof incomplete when no proof facts — honesty.
  const angles = sanitizeAngles(anglesRaw, intake);
  const compat = compatFrom({ locales, headlines: locales[language]?.headlines, copy: locales[language]?.copy, cta: locales[language]?.cta }, language);
  const text = JSON.stringify({ he: locales.he, ar: locales.ar, en: locales.en, channels, angles, source: "spoken" });
  return {
    ok: true,
    text,
    ...compat,
    locales,
    channels,
    ...(angles ? { angles } : {}),
    source: "spoken",
  };
}

function mergeSpokenOverIncomplete(gemini: GenerateOk, spoken: GenerateOk): GenerateOk {
  const locales: GenerateLocales = { ...(gemini.locales || {}) };
  for (const loc of ["he", "ar", "en"] as GenerateLang[]) {
    const g = locales[loc];
    const s = spoken.locales?.[loc];
    if (!s) continue;
    if (localeMostlyIncomplete(g)) {
      locales[loc] = s;
    } else if (g) {
      const headlines = (g.headlines || []).map((h, i) => (isIncompleteText(h) ? s.headlines[i] || s.headlines[0] || h : h));
      locales[loc] = {
        headlines: headlines.length ? headlines : s.headlines,
        copy: isIncompleteText(g.copy) ? s.copy : g.copy,
        cta: isIncompleteText(g.cta) ? s.cta : g.cta,
      };
    }
  }
  const language = asLang(undefined) || "he";
  const compat = compatFrom({ locales }, language);
  return {
    ...gemini,
    ...compat,
    locales,
    channels: gemini.channels && Object.keys(gemini.channels).length ? gemini.channels : spoken.channels,
    angles: gemini.angles || spoken.angles,
    source: gemini.source || "gemini",
  };
}

export async function runGeminiGenerate(body: GenerateBody): Promise<GenerateResult> {
  if (!bodyHasFacts(body)) {
    recordGeminiOutcome({ provider: "none", reason: "no_facts" });
    return { ok: false, reason: "no_facts", useTemplates: true };
  }
  const spoken = () => spokenGenerateOk(body);
  try {
    const mode = asMode(body.mode);
    const language = asLang(body.language);
    const userMessage = buildUserMessage(body);
    const completed = await completeGemini({
      parts: [{ text: userMessage }],
      temperature: body.medical === true ? 0.2 : 0.4,
      tier: tierForGenerateMode(mode),
      timeoutMs: tierForGenerateMode(mode) === "pro" ? 28_000 : GEMINI_TIMEOUT_MS,
    });
    if (!completed.ok) {
      // Never leave the client with empty/broken ads when facts exist.
      return spoken();
    }
    const text = completed.text;
    const parsed = parseStructured(text);
    const compat = compatFrom(parsed, language);
    const angles = parsed.angles
      ? sanitizeAngles(parsed.angles, factsToIntake(body))
      : undefined;
    let out: GenerateOk = {
      ok: true,
      text,
      ...compat,
      ...(parsed.locales ? { locales: parsed.locales } : {}),
      ...(parsed.channels ? { channels: parsed.channels } : {}),
      ...(angles ? { angles } : {}),
      source: "gemini",
      model: completed.model,
      provider: completed.provider,
      tier: tierForGenerateMode(mode),
    };
    if (mode === "scan" && parsed.brand) {
      out.brand = parsed.brand;
    }
    if (
      generateMostlyIncomplete(out.locales, out.headlines, out.copy, out.cta) ||
      (!out.locales && !out.headlines?.length)
    ) {
      out = mergeSpokenOverIncomplete(out, spoken());
      out.source = "spoken";
    }
    return out;
  } catch {
    return spoken();
  }
}


export const GEMINI_MODEL = "gemini-3.5-flash";
export const GEMINI_MODELS = AI_STUDIO_GEMINI_MODELS;

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

export function factsToIntake(body: { description?: unknown; audience?: unknown; facts?: unknown }): Intake {
  const intake = emptyIntake();
  const facts = body.facts;
  if (typeof facts === "string" && facts.trim()) {
    intake.description = facts.trim();
  } else if (facts && typeof facts === "object" && !Array.isArray(facts)) {
    const o = facts as Record<string, unknown>;
    const str = (k: string) => (typeof o[k] === "string" ? (o[k] as string) : "");
    intake.businessName = str("businessName") || str("name") || str("clinicName");
    intake.category = str("category") || str("vertical");
    intake.description = str("description") || str("facts") || intake.description;
    intake.location = str("location") || str("city") || str("address");
    intake.audience = str("audience");
    intake.biggestProblem = str("biggestProblem") || str("problem");
    intake.uniqueAdvantage = str("uniqueAdvantage") || str("advantage");
    intake.mainGoal = str("mainGoal") || str("goal");
    intake.offer = str("offer") || intake.offer;
    intake.pastAds = str("pastAds");
    intake.pastResults = str("pastResults");
    intake.website = str("website") || str("url") || str("site");
    intake.whatsapp = str("whatsapp") || str("phone") || str("tel") || str("mobile");
    intake.clinicHours = str("clinicHours") || str("hours") || str("openingHours");
    intake.brandTone = str("brandTone");
    intake.brandPositioning = str("brandPositioning");
    if (str("kupaFileBy")) intake.kupaFileBy = str("kupaFileBy");
    if (str("kupaMemberFrom")) intake.kupaMemberFrom = str("kupaMemberFrom");
  }
  if (typeof body.description === "string" && body.description.trim()) {
    intake.description = [intake.description, body.description.trim()].filter(Boolean).join("\n");
  }
  if (typeof body.audience === "string" && body.audience.trim()) {
    intake.audience = body.audience.trim();
  }
  return intake;
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
    const intake = factsToIntake(body);
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
      tier: "pro",
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
    const intake = factsToIntake(body);
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
      tier: "pro",
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
