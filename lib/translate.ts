import type { Locale } from "./types";
import {
  classifyVertexHttp,
  fetchGoogleJson,
  recordTranslationOutcome,
  vertexAccessToken,
  vertexProject,
} from "./vertex";

export type TranslateFailReason = "not_configured" | "translation_error" | "quota" | "vertex_denied";
export type TranslateOk = { ok: true; texts: string[]; source?: string; target: Locale };
export type TranslateFail = { ok: false; reason: TranslateFailReason };
export type TranslateResult = TranslateOk | TranslateFail;

const BCP47: Record<Locale, string> = { he: "he", ar: "ar", en: "en" };

function asLocale(v: unknown): Locale | null {
  return v === "he" || v === "ar" || v === "en" ? v : null;
}

/**
 * Cloud Translation API v3 (Neural MT) — HE ↔ AR ↔ EN.
 * Not string replace. Uses the same ADC / Cloud Run SA as Vertex.
 */
export async function translateTexts(opts: {
  texts: string[];
  target: Locale;
  source?: Locale;
}): Promise<TranslateResult> {
  const texts = opts.texts.map((s) => String(s ?? "").slice(0, 2000));
  if (!texts.length) return { ok: true, texts: [], target: opts.target };
  const project = vertexProject();
  const token = await vertexAccessToken();
  if (!project || !token) {
    recordTranslationOutcome({ reason: "not_configured" });
    return { ok: false, reason: "not_configured" };
  }

  const v3 = await translateV3(token, project, texts, opts.target, opts.source);
  if (v3.ok) {
    recordTranslationOutcome({ reason: "ok" });
    return v3;
  }
  if (v3.reason === "quota" || v3.reason === "vertex_denied") {
    recordTranslationOutcome({ reason: v3.reason });
    return v3;
  }

  const v2 = await translateV2(token, texts, opts.target, opts.source);
  recordTranslationOutcome({ reason: v2.ok ? "ok" : v2.reason });
  return v2;
}

async function translateV3(
  token: string,
  project: string,
  texts: string[],
  target: Locale,
  source?: Locale,
): Promise<TranslateResult> {
  try {
    const url = `https://translation.googleapis.com/v3/projects/${encodeURIComponent(project)}:translateText`;
    const body: Record<string, unknown> = {
      contents: texts,
      mimeType: "text/plain",
      targetLanguageCode: BCP47[target],
    };
    if (source) body.sourceLanguageCode = BCP47[source];
    const { status, json } = await fetchGoogleJson(
      url,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
      20000,
    );
    const kind = classifyVertexHttp(status, json);
    if (kind === "ok") {
      const out = extractV3(json);
      if (out.length) return { ok: true, texts: padTo(out, texts.length), target, source };
      return { ok: false, reason: "translation_error" };
    }
    if (kind === "quota") return { ok: false, reason: "quota" };
    if (kind === "vertex_denied") return { ok: false, reason: "vertex_denied" };
    return { ok: false, reason: "translation_error" };
  } catch {
    return { ok: false, reason: "translation_error" };
  }
}

async function translateV2(
  token: string,
  texts: string[],
  target: Locale,
  source?: Locale,
): Promise<TranslateResult> {
  try {
    const url = "https://translation.googleapis.com/language/translate/v2";
    const params = new URLSearchParams();
    for (const t of texts) params.append("q", t);
    params.set("target", BCP47[target]);
    params.set("format", "text");
    if (source) params.set("source", BCP47[source]);
    const { status, json } = await fetchGoogleJson(
      url,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      },
      20000,
    );
    const kind = classifyVertexHttp(status, json);
    if (kind === "ok") {
      const out = extractV2(json);
      if (out.length) return { ok: true, texts: padTo(out, texts.length), target, source };
      return { ok: false, reason: "translation_error" };
    }
    if (kind === "quota") return { ok: false, reason: "quota" };
    if (kind === "vertex_denied") return { ok: false, reason: "vertex_denied" };
    return { ok: false, reason: "translation_error" };
  } catch {
    return { ok: false, reason: "translation_error" };
  }
}

function extractV3(json: unknown): string[] {
  if (!json || typeof json !== "object") return [];
  const translations = (json as { translations?: unknown }).translations;
  if (!Array.isArray(translations)) return [];
  return translations
    .map((row) => {
      if (!row || typeof row !== "object") return "";
      const t = (row as { translatedText?: unknown }).translatedText;
      return typeof t === "string" ? t : "";
    })
    .filter((s) => s.length > 0 || true);
}

function extractV2(json: unknown): string[] {
  if (!json || typeof json !== "object") return [];
  const data = (json as { data?: { translations?: unknown } }).data;
  const translations = data && typeof data === "object" ? data.translations : undefined;
  if (!Array.isArray(translations)) return [];
  return translations.map((row) => {
    if (!row || typeof row !== "object") return "";
    const t = (row as { translatedText?: unknown }).translatedText;
    return typeof t === "string" ? t : "";
  });
}

function padTo(list: string[], n: number): string[] {
  const out = list.slice(0, n);
  while (out.length < n) out.push("");
  return out;
}

export type LocaleTriple = { he?: string; ar?: string; en?: string };

/** Fill missing HE/AR/EN slots from a source locale via Cloud Translation. */
export async function localizeTriple(
  triple: LocaleTriple,
  source: Locale = "he",
): Promise<{ triple: LocaleTriple; reason: TranslateFailReason | null }> {
  const srcText = (triple[source] || triple.he || triple.en || triple.ar || "").trim();
  if (!srcText) return { triple, reason: null };
  const targets = (["he", "ar", "en"] as Locale[]).filter((loc) => loc !== source && !String(triple[loc] || "").trim());
  if (!targets.length) return { triple, reason: null };
  const next: LocaleTriple = { ...triple };
  let lastFail: TranslateFailReason | null = null;
  for (const target of targets) {
    const hit = await translateTexts({ texts: [srcText], target, source });
    if (hit.ok && hit.texts[0]?.trim()) {
      next[target] = hit.texts[0].trim();
    } else if (!hit.ok) {
      lastFail = hit.reason;
    }
  }
  return { triple: next, reason: lastFail };
}

export async function localizeStringList(
  texts: string[],
  target: Locale,
  source?: Locale,
): Promise<TranslateResult> {
  return translateTexts({ texts, target, source });
}

export function localeFromUnknown(v: unknown): Locale | null {
  return asLocale(v);
}
