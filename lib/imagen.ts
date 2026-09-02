import { GoogleGenerativeAI } from "@google/generative-ai";
import { runtimeEnv } from "./runtime-env";
import type { Locale } from "./types";

export type ImagenFailReason = "not_configured" | "imagen_error" | "quota" | "vertex_denied";
export type ImagenOk = { ok: true; mime: string; imageBase64: string };
export type ImagenFail = { ok: false; reason: ImagenFailReason };
export type ImagenResult = ImagenOk | ImagenFail;

type AttemptReason = ImagenFailReason | "not_found";
type Attempt = ImagenOk | { ok: false; reason: AttemptReason };

const DEFAULT_PROJECT = "project-8fd8a005-ae6d-4139-ab4";
const DEFAULT_LOCATION = "us-central1";
const VERTEX_MODELS = ["imagen-3.0-generate-001", "imagen-3.0-fast-generate-001"] as const;
const GOOGLE_AI_MODELS = ["imagen-3.0-generate-001", "imagen-3.0-fast-generate-001"] as const;
const GEMINI_IMAGE_MODELS = [
  "gemini-2.5-flash-image",
  "gemini-3.0-flash-preview-image",
  "gemini-2.0-flash-preview-image",
  "gemini-3.6-flash",
] as const;

export type ImagenFacts = {
  businessName?: unknown;
  category?: unknown;
  headline?: unknown;
  locale?: unknown;
};

function asText(v: unknown, max = 180): string {
  if (typeof v !== "string") return "";
  return v.replace(/\s+/g, " ").trim().slice(0, max);
}

function localeOf(v: unknown): Locale {
  return v === "ar" || v === "en" || v === "he" ? v : "en";
}

/** Marketing still only. Never ask for prices, claims, faces, or fake reviews. */
export function buildImagenPrompt(facts: ImagenFacts): string {
  const name = asText(facts.businessName, 80) || "a local business";
  const category = asText(facts.category, 80) || "local service";
  const headline = asText(facts.headline, 140);
  const locale = localeOf(facts.locale);
  const region =
    locale === "he" ? "Israel, natural Mediterranean light"
    : locale === "ar" ? "Levant / Arabic-speaking street, warm daylight"
    : "clean contemporary setting, natural light";
  const mood = headline ? `Campaign mood (do not typeset or paint this text): ${headline}.` : "";
  return [
    "Tasteful marketing photography still for an advertisement.",
    `Business: ${name}. Category: ${category}. Setting: ${region}.`,
    mood,
    "Style: cinematic product-or-place mood, shallow depth, realistic materials, no collage.",
    "No text, letters, numbers, logos, watermarks, UI chrome, or captions in the image.",
    "Do NOT invent prices, discounts, coupons, medical claims, before/after comparisons, star ratings, or fake reviews.",
    "Do NOT depict a photoreal identifiable doctor, patient, or any recognizable person. Empty place, product, facade, or abstract wellness atmosphere only.",
    "No clinical procedure, no body close-up, no injection, no surgery.",
  ].join(" ");
}

async function fetchJson(url: string, init: RequestInit, timeoutMs: number): Promise<{ status: number; json: unknown }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal, cache: "no-store" });
    let json: unknown = null;
    try {
      json = await res.json();
    } catch {
      json = null;
    }
    return { status: res.status, json };
  } finally {
    clearTimeout(timer);
  }
}

async function metadataAccessToken(): Promise<string | null> {
  try {
    const { status, json } = await fetchJson(
      "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token",
      { headers: { "Metadata-Flavor": "Google" } },
      1500,
    );
    if (status < 200 || status >= 300 || !json || typeof json !== "object") return null;
    const token = (json as { access_token?: unknown }).access_token;
    return typeof token === "string" && token.trim() ? token.trim() : null;
  } catch {
    return null;
  }
}

function jsonBlob(json: unknown): string {
  try {
    return JSON.stringify(json ?? "").toLowerCase();
  } catch {
    return "";
  }
}

function classifyHttp(status: number, json: unknown, source: "vertex" | "google"): AttemptReason {
  const blob = jsonBlob(json);
  if (status === 429 || /resource_exhausted|quotaexceeded|quota exceeded|rate.?limit|too many requests/.test(blob)) {
    return "quota";
  }
  if (status === 404 || /not_found|"status":\s*"not_found"|is not found|not supported for/.test(blob)) {
    return "not_found";
  }
  if (
    source === "vertex" &&
    (status === 401 ||
      status === 403 ||
      /permissiondenied|permission_denied|access denied|iam permission|forbidden/.test(blob))
  ) {
    return "vertex_denied";
  }
  return "imagen_error";
}

function walkInlineParts(parts: unknown): { mime: string; imageBase64: string } | null {
  if (!Array.isArray(parts)) return null;
  for (const part of parts) {
    if (!part || typeof part !== "object") continue;
    const o = part as Record<string, unknown>;
    const inlineRaw = o.inlineData ?? o.inline_data;
    const inner =
      inlineRaw && typeof inlineRaw === "object" ? (inlineRaw as Record<string, unknown>) : null;
    const b64 =
      (inner && typeof inner.data === "string" && inner.data) ||
      (typeof o.data === "string" && o.data) ||
      "";
    const cleaned = b64.replace(/^data:[^;]+;base64,/, "").replace(/\s/g, "");
    if (cleaned.length < 80) continue;
    const mimeRaw =
      (inner && typeof inner.mimeType === "string" && inner.mimeType) ||
      (inner && typeof inner.mime_type === "string" && inner.mime_type) ||
      (typeof o.mimeType === "string" && o.mimeType) ||
      "image/png";
    const mime = mimeRaw === "image/jpg" ? "image/jpeg" : mimeRaw;
    return { mime, imageBase64: cleaned };
  }
  return null;
}

function extractImage(json: unknown): { mime: string; imageBase64: string } | null {
  if (!json || typeof json !== "object") return null;
  const root = json as Record<string, unknown>;
  const buckets: unknown[] = [];
  if (Array.isArray(root.predictions)) buckets.push(...root.predictions);
  if (Array.isArray(root.generatedImages)) buckets.push(...root.generatedImages);
  const nested = root.data;
  if (nested && typeof nested === "object") {
    const d = nested as Record<string, unknown>;
    if (Array.isArray(d.generatedImages)) buckets.push(...d.generatedImages);
    if (Array.isArray(d.predictions)) buckets.push(...d.predictions);
  }
  for (const item of buckets) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const inner = o.image && typeof o.image === "object" ? (o.image as Record<string, unknown>) : o;
    const b64 =
      (typeof inner.bytesBase64Encoded === "string" && inner.bytesBase64Encoded) ||
      (typeof inner.bytesBase64 === "string" && inner.bytesBase64) ||
      (typeof inner.imageBytes === "string" && inner.imageBytes) ||
      (typeof o.bytesBase64Encoded === "string" && o.bytesBase64Encoded) ||
      "";
    const cleaned = b64.replace(/^data:[^;]+;base64,/, "").replace(/\s/g, "");
    if (cleaned.length < 80) continue;
    const mimeRaw =
      (typeof inner.mimeType === "string" && inner.mimeType) ||
      (typeof o.mimeType === "string" && o.mimeType) ||
      "image/png";
    const mime = mimeRaw === "image/jpg" ? "image/jpeg" : mimeRaw;
    return { mime, imageBase64: cleaned };
  }

  const candidates = Array.isArray(root.candidates) ? root.candidates : [];
  for (const cand of candidates) {
    if (!cand || typeof cand !== "object") continue;
    const content = (cand as Record<string, unknown>).content;
    const parts = content && typeof content === "object" ? (content as Record<string, unknown>).parts : undefined;
    const hit = walkInlineParts(parts);
    if (hit) return hit;
  }
  const direct = walkInlineParts(root.parts);
  if (direct) return direct;
  return null;
}

const PARAMETERS = {
  sampleCount: 1,
  aspectRatio: "1:1",
  personGeneration: "dont_allow",
  safetySetting: "block_medium_and_above",
  addWatermark: true,
};

function foldReason(prev: ImagenFailReason | null, next: AttemptReason): ImagenFailReason | null {
  if (next === "not_found") return prev;
  if (next === "quota" || prev === "quota") return "quota";
  if (next === "vertex_denied" || prev === "vertex_denied") return "vertex_denied";
  return prev ?? "imagen_error";
}

async function vertexPredict(
  token: string,
  project: string,
  location: string,
  model: string,
  prompt: string,
): Promise<Attempt> {
  try {
    const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${encodeURIComponent(project)}/locations/${encodeURIComponent(location)}/publishers/google/models/${encodeURIComponent(model)}:predict`;
    const { status, json } = await fetchJson(
      url,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: PARAMETERS,
        }),
      },
      40000,
    );
    if (status >= 200 && status < 300) {
      const img = extractImage(json);
      return img ? { ok: true, ...img } : { ok: false, reason: "imagen_error" };
    }
    return { ok: false, reason: classifyHttp(status, json, "vertex") };
  } catch {
    return { ok: false, reason: "imagen_error" };
  }
}

async function googleAiPredict(apiKey: string, model: string, prompt: string): Promise<Attempt> {
  const bodies: { url: string; body: unknown }[] = [
    {
      url: `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:predict`,
      body: { instances: [{ prompt }], parameters: { sampleCount: 1, personGeneration: "dont_allow", aspectRatio: "1:1" } },
    },
    {
      url: `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateImages`,
      body: { prompt, config: { numberOfImages: 1, personGeneration: "DONT_ALLOW", aspectRatio: "1:1" } },
    },
  ];
  let last: AttemptReason = "imagen_error";
  for (const attempt of bodies) {
    try {
      const { status, json } = await fetchJson(
        attempt.url,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify(attempt.body),
        },
        40000,
      );
      if (status >= 200 && status < 300) {
        const img = extractImage(json);
        if (img) return { ok: true, ...img };
        last = "imagen_error";
        continue;
      }
      const reason = classifyHttp(status, json, "google");
      if (reason === "quota") return { ok: false, reason: "quota" };
      if (reason === "not_found") {
        last = "not_found";
        continue;
      }
      last = reason;
    } catch {
      last = "imagen_error";
    }
  }
  return { ok: false, reason: last };
}

const GEMINI_IMAGE_CONFIGS: Record<string, unknown>[] = [
  { responseModalities: ["IMAGE", "TEXT"] },
  { responseModalities: ["IMAGE"] },
  { responseModalities: ["TEXT", "IMAGE"], imageConfig: { aspectRatio: "1:1" } },
];

async function geminiNativeRest(apiKey: string, model: string, prompt: string): Promise<Attempt> {
  let last: AttemptReason = "imagen_error";
  for (const generationConfig of GEMINI_IMAGE_CONFIGS) {
    try {
      const { status, json } = await fetchJson(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig,
          }),
        },
        45000,
      );
      if (status >= 200 && status < 300) {
        const img = extractImage(json);
        if (img) return { ok: true, ...img };
        last = "imagen_error";
        continue;
      }
      const reason = classifyHttp(status, json, "google");
      if (reason === "quota") return { ok: false, reason: "quota" };
      if (reason === "not_found") return { ok: false, reason: "not_found" };
      last = reason;
    } catch {
      last = "imagen_error";
    }
  }
  return { ok: false, reason: last };
}

async function geminiNativeSdk(apiKey: string, model: string, prompt: string): Promise<Attempt> {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const m = genAI.getGenerativeModel({
      model,
      generationConfig: {
        // Native image models accept responseModalities; SDK types lag behind.
        responseModalities: ["IMAGE", "TEXT"],
      } as { temperature?: number },
    });
    const result = await m.generateContent(prompt);
    const payload = result.response as unknown;
    const img = extractImage(payload);
    if (img) return { ok: true, ...img };
    const candidates =
      payload && typeof payload === "object"
        ? (payload as { candidates?: unknown }).candidates
        : undefined;
    const fromCands = extractImage({ candidates });
    if (fromCands) return { ok: true, ...fromCands };
    return { ok: false, reason: "imagen_error" };
  } catch (err) {
    const msg = err instanceof Error ? err.message.toLowerCase() : "";
    if (/429|resource_exhausted|quota/.test(msg)) return { ok: false, reason: "quota" };
    if (/404|not found|not supported/.test(msg)) return { ok: false, reason: "not_found" };
    return { ok: false, reason: "imagen_error" };
  }
}

async function geminiNativeImage(apiKey: string, model: string, prompt: string): Promise<Attempt> {
  const rest = await geminiNativeRest(apiKey, model, prompt);
  if (rest.ok) return rest;
  if (rest.reason === "quota" || rest.reason === "not_found") return rest;
  const sdk = await geminiNativeSdk(apiKey, model, prompt);
  if (sdk.ok) return sdk;
  if (sdk.reason === "quota" || sdk.reason === "not_found") return sdk;
  return rest;
}

export async function runImagen(facts: ImagenFacts): Promise<ImagenResult> {
  const project = runtimeEnv("GOOGLE_CLOUD_PROJECT") || DEFAULT_PROJECT;
  const location = runtimeEnv("VERTEX_LOCATION") || DEFAULT_LOCATION;
  const geminiKey = runtimeEnv("GEMINI_API_KEY");
  const prompt = buildImagenPrompt(facts);

  let token: string | null = null;
  try {
    token = await metadataAccessToken();
  } catch {
    token = null;
  }

  if (!token && !geminiKey) {
    return { ok: false, reason: "not_configured" };
  }

  let folded: ImagenFailReason | null = null;

  if (token) {
    for (const model of VERTEX_MODELS) {
      try {
        const hit = await vertexPredict(token, project, location, model, prompt);
        if (hit.ok) return hit;
        folded = foldReason(folded, hit.reason);
      } catch {
        folded = foldReason(folded, "imagen_error");
      }
    }
  }

  if (geminiKey) {
    for (const model of GOOGLE_AI_MODELS) {
      try {
        const hit = await googleAiPredict(geminiKey, model, prompt);
        if (hit.ok) return hit;
        folded = foldReason(folded, hit.reason);
      } catch {
        folded = foldReason(folded, "imagen_error");
      }
    }
    for (const model of GEMINI_IMAGE_MODELS) {
      try {
        const hit = await geminiNativeImage(geminiKey, model, prompt);
        if (hit.ok) return hit;
        folded = foldReason(folded, hit.reason);
      } catch {
        folded = foldReason(folded, "imagen_error");
      }
    }
  }

  return { ok: false, reason: folded ?? "imagen_error" };
}
