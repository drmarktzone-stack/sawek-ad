import { runtimeEnv } from "./runtime-env";

/** Same billing pack as Vertex Imagen. Not a secret. */
export const DEFAULT_VERTEX_PROJECT = "project-8fd8a005-ae6d-4139-ab4";
export const DEFAULT_VERTEX_LOCATION = "us-central1";

export const VERTEX_GEMINI_MODELS = ["gemini-2.5-flash", "gemini-3.6-flash"] as const;

export type GeminiProvider = "vertex" | "ai_studio" | "none";

export type GeminiPublicStatus = {
  configured: boolean;
  provider: GeminiProvider;
  quota: boolean;
  model?: string;
};

export type LastGeminiOutcome = {
  provider: GeminiProvider;
  reason?: "ok" | "quota" | "gemini_error" | "no_key" | "vertex_denied" | "no_facts";
  model?: string;
  at: number;
};

let lastOutcome: LastGeminiOutcome = { provider: "none", at: 0 };
let cachedToken: { token: string; exp: number } | null = null;
let cachedStatus: { at: number; status: GeminiPublicStatus } | null = null;
const STATUS_TTL_MS = 45_000;
const TOKEN_TTL_MS = 50_000;

export function vertexProject(): string {
  return runtimeEnv("GOOGLE_CLOUD_PROJECT") || DEFAULT_VERTEX_PROJECT;
}

export function vertexLocation(): string {
  return runtimeEnv("VERTEX_LOCATION") || DEFAULT_VERTEX_LOCATION;
}

export function recordGeminiOutcome(next: Omit<LastGeminiOutcome, "at">) {
  lastOutcome = { ...next, at: Date.now() };
  cachedStatus = null;
}

export function lastGeminiOutcome(): LastGeminiOutcome {
  return lastOutcome;
}

export async function fetchGoogleJson(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<{ status: number; json: unknown }> {
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

export function vertexHttpBlob(json: unknown): string {
  try {
    return JSON.stringify(json ?? "").toLowerCase();
  } catch {
    return "";
  }
}

export function classifyVertexHttp(status: number, json: unknown): "ok" | "quota" | "not_found" | "vertex_denied" | "error" {
  const blob = vertexHttpBlob(json);
  if (status >= 200 && status < 300) return "ok";
  if (status === 429 || /resource_exhausted|quotaexceeded|quota exceeded|rate.?limit|too many requests/.test(blob)) {
    return "quota";
  }
  if (status === 404 || /not_found|"status":\s*"not_found"|is not found|not supported for/.test(blob)) {
    return "not_found";
  }
  if (
    status === 401 ||
    status === 403 ||
    /permissiondenied|permission_denied|access denied|iam permission|forbidden/.test(blob)
  ) {
    return "vertex_denied";
  }
  return "error";
}

async function metadataAccessToken(): Promise<string | null> {
  try {
    const { status, json } = await fetchGoogleJson(
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

/** Cloud Run SA via metadata. Never logs the token. */
export async function vertexAccessToken(): Promise<string | null> {
  if (cachedToken && cachedToken.exp > Date.now()) return cachedToken.token;
  const token = await metadataAccessToken();
  if (!token) return null;
  cachedToken = { token, exp: Date.now() + TOKEN_TTL_MS };
  return token;
}

export function vertexConfigured(): boolean {
  return Boolean(vertexProject());
}

export function geminiApiKeyPresent(): boolean {
  return Boolean(runtimeEnv("GEMINI_API_KEY"));
}

export async function publicGeminiStatus(): Promise<GeminiPublicStatus> {
  if (cachedStatus && Date.now() - cachedStatus.at < STATUS_TTL_MS) return cachedStatus.status;
  const last = lastOutcome;
  const quota = last.reason === "quota";
  const token = quota ? null : await vertexAccessToken();
  let status: GeminiPublicStatus;
  if (quota) {
    status = {
      configured: false,
      provider: last.provider === "vertex" ? "vertex" : last.provider,
      quota: true,
      model: last.model,
    };
  } else if (token) {
    status = {
      configured: true,
      provider: "vertex",
      quota: false,
      model: last.model || VERTEX_GEMINI_MODELS[0],
    };
  } else if (last.provider === "ai_studio" && last.reason === "ok") {
    status = { configured: true, provider: "ai_studio", quota: false, model: last.model };
  } else if (geminiApiKeyPresent() && last.reason !== "quota") {
    // Key exists but may 429. Do not claim Vertex. UI shows אין מכסה until a generate succeeds.
    status = { configured: false, provider: "none", quota: true };
  } else {
    status = { configured: false, provider: "none", quota: true };
  }
  cachedStatus = { at: Date.now(), status };
  return status;
}

export function extractGenerateText(json: unknown): string {
  if (!json || typeof json !== "object") return "";
  const root = json as Record<string, unknown>;
  const candidates = Array.isArray(root.candidates) ? root.candidates : [];
  const chunks: string[] = [];
  for (const cand of candidates) {
    if (!cand || typeof cand !== "object") continue;
    const content = (cand as Record<string, unknown>).content;
    const parts = content && typeof content === "object" ? (content as Record<string, unknown>).parts : undefined;
    if (!Array.isArray(parts)) continue;
    for (const part of parts) {
      if (!part || typeof part !== "object") continue;
      const text = (part as { text?: unknown }).text;
      if (typeof text === "string" && text.trim()) chunks.push(text);
    }
  }
  if (typeof root.text === "string" && root.text.trim()) chunks.push(root.text);
  return chunks.join("\n").trim();
}
