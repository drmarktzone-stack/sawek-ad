import type { AdVariant, CampaignAngles, FactoryPiece, Intake, Locale } from "../types";
import { filled } from "../utils";
import { inventsForbidden } from "./coach";
import { isClinicLike } from "../vertical";
import { overlayAnglesOnVariants, parseCampaignAngles, sanitizeAngles } from "./angles";

const ABORT_MS = 14_000;
const OVERLAY_ABORT_MS = 18_000;
const GENERATE_PATH = "/api/generate";

const VARIANT_KINDS = [
  "strong_offer",
  "very_short",
  "emotional",
  "narrative",
  "direct_sales",
  "unique_advantage",
] as const;

export type GeminiAdCopy = {
  headline?: string;
  copy?: string;
  cta?: string;
};

export type GeminiChannelCopy = {
  headline?: string;
  body?: string;
  cta?: string;
};

export type GeminiChannelScript = {
  script?: string;
};

export type GeminiChannelLanding = {
  title?: string;
  body?: string;
};

export type GeminiChannels = {
  facebook?: Partial<Record<Locale, GeminiChannelCopy>>;
  instagram?: Partial<Record<Locale, GeminiChannelCopy>>;
  reels?: Partial<Record<Locale, GeminiChannelScript>>;
  tiktok?: Partial<Record<Locale, GeminiChannelScript>>;
  whatsapp?: Partial<Record<Locale, GeminiChannelScript>>;
  landing?: Partial<Record<Locale, GeminiChannelLanding>>;
};

type LocalePack = {
  headlines: string[];
  copy?: string;
  cta?: string;
};

type GeminiResponse = {
  ok?: boolean;
  reason?: string;
  useTemplates?: boolean;
  headlines?: unknown;
  copy?: unknown;
  cta?: unknown;
  text?: unknown;
  locales?: unknown;
  channels?: unknown;
  angles?: unknown;
  he?: unknown;
  ar?: unknown;
  en?: unknown;
};

type GenerateMode = "ads" | "scan" | "channels";

let channelCache: { key: string; channels: GeminiChannels } | null = null;

function asObj(v: unknown): Record<string, unknown> | null {
  if (v && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>;
  return null;
}

function asTrimmed(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  return s || undefined;
}

function asHeadlines(v: unknown): string[] {
  if (typeof v === "string" && v.trim()) return [v.trim()];
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === "string")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 6);
}

function factLine(label: string, value: string | undefined): string | undefined {
  if (!filled(value)) return undefined;
  return `${label}: ${value!.trim()}`;
}

/** Description payload — intake facts only, never invented claims. */
function descriptionFromIntake(intake: Intake): string {
  return [
    factLine("businessName", intake.businessName),
    factLine("category", intake.category),
    factLine("description", intake.description),
    factLine("location", intake.location),
    factLine("offer", intake.offer),
    factLine("uniqueAdvantage", intake.uniqueAdvantage),
    factLine("biggestProblem", intake.biggestProblem),
    factLine("mainGoal", intake.mainGoal),
    factLine("website", intake.website),
    factLine("whatsapp", intake.whatsapp),
    factLine("clinicHours", intake.clinicHours),
    factLine("kupaFileBy", intake.kupaFileBy),
    factLine("kupaMemberFrom", intake.kupaMemberFrom),
    factLine("brandTone", intake.brandTone),
    factLine("brandPositioning", intake.brandPositioning),
  ]
    .filter(Boolean)
    .join("\n");
}

function intakeKey(intake: Intake): string {
  return `${descriptionFromIntake(intake)}\n${intake.audience.trim()}`;
}

function rememberChannels(intake: Intake, channels: GeminiChannels | undefined): void {
  if (!channels) return;
  channelCache = { key: intakeKey(intake), channels };
}

function cachedChannelsFor(intake: Intake): GeminiChannels | null {
  if (channelCache && channelCache.key === intakeKey(intake)) return channelCache.channels;
  return null;
}

function promptAllLocales(): string {
  const kinds = VARIANT_KINDS.join(", ");
  return `Produce JSON with ALL three locales (he, ar, en), channel packs, AND angles {pain,benefit,social_proof,story} each with he/ar/en {headline,copy,cta}. Exactly 6 headlines per locale in this order: ${kinds}. Recreate per language — do not translate literally. Hebrew: direct, action-driving. Arabic: rich marketing, regional, RTL. English: modern SaaS/global. Use ONLY facts in description and audience. Never invent prices, discounts, ratings, testimonials, VIP, ROAS, CAC, medical claims, or competitors. Social proof: only ratings/reviews/customer counts present in facts; otherwise [יש להשלים] / [يجب الاستكمال] / [TO COMPLETE].`;
}

function promptFor(locale: Locale, sixHeadlines: boolean): string {
  const kinds = VARIANT_KINDS.join(", ");
  const langName = locale === "he" ? "Hebrew" : locale === "ar" ? "Arabic" : "English";
  const missing =
    locale === "he" ? "[יש להשלים]" : locale === "ar" ? "[يجب الاستكمال]" : "[TO COMPLETE]";
  if (sixHeadlines) {
    return `Produce JSON {"headlines":["...","...","...","...","...","..."],"copy":"...","cta":"..."}. Exactly 6 headlines in this order: ${kinds}. Language: ${langName}. Use ONLY facts in description and audience. Never invent prices, discounts, ratings, testimonials, VIP, ROAS, CAC, medical claims, or competitors. If a fact is missing, write ${missing}.`;
  }
  return `Produce JSON {"headlines":["..."],"copy":"...","cta":"..."}. One headline, copy, and CTA. Language: ${langName}. Use ONLY facts in description and audience. Never invent prices, discounts, ratings, testimonials, VIP, ROAS, CAC, medical claims, or competitors. If a fact is missing, write ${missing}.`;
}

function generateUrl(): string {
  if (typeof window !== "undefined") return GENERATE_PATH;
  const base = process.env.NEXT_PUBLIC_BASE_URL?.trim() || "http://127.0.0.1:43147";
  return `${base.replace(/\/$/, "")}${GENERATE_PATH}`;
}

function payloadFromIntake(
  intake: Intake,
  language: Locale,
  sixHeadlines: boolean,
  mode: GenerateMode = "ads",
): {
  description: string;
  audience: string;
  language: Locale;
  medical: boolean;
  prompt: string;
  mode: GenerateMode;
} {
  const allLocales = sixHeadlines;
  return {
    description: descriptionFromIntake(intake),
    audience: intake.audience.trim(),
    language,
    medical: isClinicLike(intake),
    prompt: allLocales ? promptAllLocales() : promptFor(language, sixHeadlines),
    mode,
  };
}

function safeText(text: string | undefined, intake: Intake): string | undefined {
  if (!text) return undefined;
  if (inventsForbidden(text, intake)) return undefined;
  return text;
}

async function postGenerate(
  body: {
    description: string;
    audience: string;
    language: Locale;
    medical: boolean;
    prompt: string;
    mode?: GenerateMode;
  },
  abortMs: number = ABORT_MS,
): Promise<GeminiResponse | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), abortMs);
  try {
    const res = await fetch(generateUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as GeminiResponse;
    if (!data || data.ok === false || data.reason === "no_key" || data.useTemplates) {
      return null;
    }
    return data;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function parseLocaleBlock(v: unknown): LocalePack | undefined {
  const o = asObj(v);
  if (!o) return undefined;
  const headlines = asHeadlines(o.headlines ?? o.headline);
  const copy = asTrimmed(o.copy ?? o.body ?? o.adCopy);
  const cta = asTrimmed(o.cta ?? o.CTA);
  if (!headlines.length && !copy && !cta) return undefined;
  return { headlines, copy, cta };
}

function parseLocales(data: GeminiResponse): Partial<Record<Locale, LocalePack>> {
  const nested = asObj(data.locales);
  const out: Partial<Record<Locale, LocalePack>> = {};
  for (const loc of ["he", "ar", "en"] as Locale[]) {
    const top = loc === "he" ? data.he : loc === "ar" ? data.ar : data.en;
    const block = parseLocaleBlock(nested?.[loc] ?? top);
    if (block) out[loc] = block;
  }
  if (!out.he) {
    const headlines = asHeadlines(data.headlines);
    const copy = asTrimmed(data.copy);
    const cta = asTrimmed(data.cta);
    if (headlines.length || copy || cta) {
      out.he = { headlines, copy, cta };
    }
  }
  return out;
}

function parseCopyTriple(v: unknown): GeminiChannelCopy | undefined {
  const o = asObj(v);
  if (!o) return undefined;
  const headline = asTrimmed(o.headline);
  const body = asTrimmed(o.body ?? o.copy);
  const cta = asTrimmed(o.cta ?? o.CTA);
  if (!headline && !body && !cta) return undefined;
  return {
    ...(headline ? { headline } : {}),
    ...(body ? { body } : {}),
    ...(cta ? { cta } : {}),
  };
}

function parseScript(v: unknown): GeminiChannelScript | undefined {
  const o = asObj(v);
  if (!o) return undefined;
  const script = asTrimmed(o.script ?? o.body);
  if (!script) return undefined;
  return { script };
}

function parseLanding(v: unknown): GeminiChannelLanding | undefined {
  const o = asObj(v);
  if (!o) return undefined;
  const title = asTrimmed(o.title ?? o.headline);
  const body = asTrimmed(o.body ?? o.copy);
  if (!title && !body) return undefined;
  return {
    ...(title ? { title } : {}),
    ...(body ? { body } : {}),
  };
}

function parseLangMap<T>(
  v: unknown,
  parseOne: (x: unknown) => T | undefined,
): Partial<Record<Locale, T>> | undefined {
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

export function parseGeminiChannels(v: unknown): GeminiChannels | undefined {
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

function overlayFromResponse(data: GeminiResponse, intake: Intake): GeminiAdCopy | null {
  const headlines = asHeadlines(data.headlines);
  const copy = safeText(asTrimmed(data.copy), intake);
  const cta = safeText(asTrimmed(data.cta), intake);
  const headline = safeText(headlines[0], intake);
  if (!headline && !copy && !cta) return null;
  return {
    ...(headline ? { headline } : {}),
    ...(copy ? { copy } : {}),
    ...(cta ? { cta } : {}),
  };
}

/**
 * Overlay Gemini headlines[0..5] / copy / cta onto he AND ar AND en variants
 * (6 kinds each). One generate call (language he, prompt demands all three locales).
 * Missing locale → leave templates. inventsForbidden drops unsafe strings.
 * No-op (same array) on no_key / useTemplates / network / timeout / invented claims.
 * Never logs secrets.
 */
export async function enrichVariantsWithGemini(
  intake: Intake,
  variants: AdVariant[],
): Promise<{ variants: AdVariant[]; angles?: CampaignAngles }> {
  const data = await postGenerate(payloadFromIntake(intake, "he", true, "ads"));
  if (!data) return { variants };

  const channels = parseGeminiChannels(data.channels);
  rememberChannels(intake, channels);

  const angles = sanitizeAngles(parseCampaignAngles(data.angles), intake);

  const packs = parseLocales(data);
  const hasAny = (["he", "ar", "en"] as Locale[]).some((loc) => {
    const p = packs[loc];
    if (!p) return false;
    return p.headlines.some((h) => safeText(h, intake)) || safeText(p.copy, intake) || safeText(p.cta, intake);
  });
  let next = variants;
  if (hasAny) {
    next = variants.map((v) => {
      const pack = packs[v.locale];
      if (!pack) return v;
      const kindIndex = VARIANT_KINDS.indexOf(v.kind);
      const headline = (kindIndex >= 0 ? safeText(pack.headlines[kindIndex], intake) : undefined) || v.headline;
      return {
        ...v,
        headline,
        primaryText: safeText(pack.copy, intake) ?? v.primaryText,
        cta: safeText(pack.cta, intake) ?? v.cta,
      };
    });
  }
  next = overlayAnglesOnVariants(next, angles);
  return { variants: next, ...(angles ? { angles } : {}) };
}

function textSafe(parts: (string | undefined)[], intake: Intake): boolean {
  const joined = parts.filter((s): s is string => Boolean(s && s.trim())).join("\n");
  if (!joined.trim()) return false;
  return !inventsForbidden(joined, intake);
}

function overlayCopyPiece(
  piece: FactoryPiece,
  copy: GeminiChannelCopy | undefined,
  intake: Intake,
): FactoryPiece {
  if (!copy) return piece;
  const title = copy.headline?.trim() || piece.title;
  const bodyBits = [copy.body, copy.cta].map((s) => s?.trim()).filter((s): s is string => Boolean(s));
  const body = bodyBits.length ? bodyBits.join("\n") : piece.body;
  if (!textSafe([title, body], intake)) return piece;
  return { ...piece, title, body };
}

function overlayScriptPiece(
  piece: FactoryPiece,
  script: string | undefined,
  intake: Intake,
): FactoryPiece {
  const s = script?.trim();
  if (!s) return piece;
  if (!textSafe([s], intake)) return piece;
  return { ...piece, body: s };
}

function overlayLandingPiece(
  piece: FactoryPiece,
  land: GeminiChannelLanding | undefined,
  intake: Intake,
): FactoryPiece {
  if (!land) return piece;
  const title = land.title?.trim() || piece.title;
  const body = land.body?.trim() || piece.body;
  if (!textSafe([title, body], intake)) return piece;
  return { ...piece, title, body };
}

function applyChannelOverlay(
  intake: Intake,
  pieces: FactoryPiece[],
  channels: GeminiChannels,
): FactoryPiece[] {
  return pieces.map((piece) => {
    const loc = piece.locale;
    if (piece.format === "feed") {
      return overlayCopyPiece(piece, channels.facebook?.[loc], intake);
    }
    if (piece.format === "story") {
      return overlayCopyPiece(piece, channels.instagram?.[loc], intake);
    }
    if (piece.format === "reels") {
      const reels = channels.reels?.[loc]?.script?.trim();
      const tiktok = channels.tiktok?.[loc]?.script?.trim();
      return overlayScriptPiece(piece, reels || tiktok, intake);
    }
    if (piece.format === "whatsapp") {
      return overlayScriptPiece(piece, channels.whatsapp?.[loc]?.script, intake);
    }
    if (piece.format === "landing") {
      return overlayLandingPiece(piece, channels.landing?.[loc], intake);
    }
    return piece;
  });
}

/**
 * Replace body/title for feed, story, reels, whatsapp, landing when Gemini channel
 * text is safe. facebook→feed, instagram→story, reels→reels, tiktok→reels if reels
 * empty, whatsapp→whatsapp, landing→landing. Timeout 18s. Reuses channels parsed
 * from enrichVariantsWithGemini when the intake matches.
 */
export async function overlayAgencyPieces(
  intake: Intake,
  pieces: FactoryPiece[],
): Promise<FactoryPiece[]> {
  const cached = cachedChannelsFor(intake);
  if (cached) return applyChannelOverlay(intake, pieces, cached);

  const data = await postGenerate(payloadFromIntake(intake, "he", true, "channels"), OVERLAY_ABORT_MS);
  if (!data) return pieces;
  const channels = parseGeminiChannels(data.channels);
  if (!channels) return pieces;
  rememberChannels(intake, channels);
  return applyChannelOverlay(intake, pieces, channels);
}

/** Single overlay for produceAd callers. Locale may be he/ar/en. Returns null on fallback. */
export async function geminiAdCopy(
  intake: Intake,
  locale: Locale,
): Promise<GeminiAdCopy | null> {
  const data = await postGenerate(payloadFromIntake(intake, locale, false, "ads"));
  if (!data) return null;
  return overlayFromResponse(data, intake);
}
