import { runtimeEnv } from "./runtime-env";
import type { Locale } from "./types";

export type ImagenOk = { ok: true; mime: string; imageBase64: string };
export type ImagenFail = { ok: false; reason: "not_configured" | "imagen_error" };
export type ImagenResult = ImagenOk | ImagenFail;

const DEFAULT_PROJECT = "project-8fd8a005-ae6d-4139-ab4";
const DEFAULT_LOCATION = "us-central1";
const VERTEX_MODELS = ["imagen-3.0-generate-001", "imagen-3.0-fast-generate-001"] as const;
const GOOGLE_AI_MODELS = ["imagen-3.0-generate-001", "imagen-3.0-fast-generate-001"] as const;

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
  return null;
}

const PARAMETERS = {
  sampleCount: 1,
  aspectRatio: "1:1",
  personGeneration: "dont_allow",
  safetySetting: "block_medium_and_above",
  addWatermark: true,
};

async function vertexPredict(token: string, project: string, location: string, model: string, prompt: string): Promise<ImagenOk | null> {
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
  if (status < 200 || status >= 300) return null;
  const img = extractImage(json);
  return img ? { ok: true, ...img } : null;
}

async function googleAiPredict(apiKey: string, model: string, prompt: string): Promise<ImagenOk | null> {
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
      if (status < 200 || status >= 300) continue;
      const img = extractImage(json);
      if (img) return { ok: true, ...img };
    } catch {
      /* next attempt */
    }
  }
  return null;
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

  if (token) {
    for (const model of VERTEX_MODELS) {
      try {
        const hit = await vertexPredict(token, project, location, model, prompt);
        if (hit) return hit;
      } catch {
        /* try next model */
      }
    }
  }

  if (geminiKey) {
    for (const model of GOOGLE_AI_MODELS) {
      try {
        const hit = await googleAiPredict(geminiKey, model, prompt);
        if (hit) return hit;
      } catch {
        /* try next model */
      }
    }
  }

  return { ok: false, reason: "imagen_error" };
}
