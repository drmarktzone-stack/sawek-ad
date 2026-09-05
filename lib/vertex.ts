import { runtimeEnv } from "./runtime-env";

/** Same billing pack as Vertex Imagen. Not a secret. */
export const DEFAULT_VERTEX_PROJECT = "project-8fd8a005-ae6d-4139-ab4";
export const DEFAULT_VERTEX_LOCATION = "us-central1";

export type GeminiTier = "pro" | "flash";

/**
 * Owner asked Gemini 1.5 Pro / 1.5 Flash. Those publishers are retired on Vertex.
 * Live mapping in this GCP project: 1.5 Pro → gemini-2.5-pro, 1.5 Flash → gemini-2.5-flash.
 * See docs/VERTEX_STACK.md.
 */
export const VERTEX_MODEL_MAPPING = {
  requestedPro: "gemini-1.5-pro",
  requestedFlash: "gemini-1.5-flash",
  livePro: "gemini-2.5-pro",
  liveFlash: "gemini-2.5-flash",
  liveImagen: "imagen-3.0-generate-001",
  translation: "cloud-translation-v3",
  reason:
    "Gemini 1.5 Pro/Flash are retired on Vertex AI. SAWEK AD maps them to the current Pro/Flash publishers on the $300 GCP pack.",
} as const;

/** Deep jobs: CMO strategy, site audit, calendars, script packs, agency copy. */
export const VERTEX_GEMINI_PRO_MODELS = ["gemini-2.5-pro", "gemini-2.0-pro"] as const;

/** Burst jobs: dozens of headlines, Meta/WhatsApp/Google Ads shorts. */
export const VERTEX_GEMINI_FLASH_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-3.5-flash",
] as const;

/** @deprecated Prefer VERTEX_GEMINI_FLASH_MODELS / modelsForTier("flash"). */
export const VERTEX_GEMINI_MODELS = VERTEX_GEMINI_FLASH_MODELS;

/** Vertex Imagen 3 first; current Imagen aliases after. Never a fake SVG. */
export const VERTEX_IMAGEN_MODELS = [
  "imagen-3.0-generate-001",
  "imagen-3.0-fast-generate-001",
  "imagen-4.0-generate-001",
] as const;

/**
 * AI Studio model IDs. New API keys cannot call gemini-2.5-flash (404 → use 3.5 / flash-latest).
 * Prefer models that still accept free-tier traffic before quota-exhausted 3.6.
 */
export const AI_STUDIO_GEMINI_FLASH_MODELS = [
  "gemini-3.5-flash",
  "gemini-flash-latest",
  "gemini-3.1-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-3.6-flash",
] as const;

export const AI_STUDIO_GEMINI_PRO_MODELS = ["gemini-2.5-pro", "gemini-3-pro-preview"] as const;

/** @deprecated Prefer AI_STUDIO_GEMINI_FLASH_MODELS / modelsForTier. */
export const AI_STUDIO_GEMINI_MODELS = AI_STUDIO_GEMINI_FLASH_MODELS;

export function modelsForTier(tier: GeminiTier, provider: "vertex" | "ai_studio"): readonly string[] {
  if (provider === "vertex") {
    return tier === "pro" ? VERTEX_GEMINI_PRO_MODELS : VERTEX_GEMINI_FLASH_MODELS;
  }
  return tier === "pro" ? AI_STUDIO_GEMINI_PRO_MODELS : AI_STUDIO_GEMINI_FLASH_MODELS;
}

export function defaultModelForTier(tier: GeminiTier): string {
  return tier === "pro" ? VERTEX_MODEL_MAPPING.livePro : VERTEX_MODEL_MAPPING.liveFlash;
}

export type GeminiProvider = "vertex" | "ai_studio" | "none";

export type GeminiPublicStatus = {
  configured: boolean;
  provider: GeminiProvider;
  quota: boolean;
  model?: string;
  /** Vertex hit 429 recently; product may still use AI Studio. */
  vertexQuota?: boolean;
  /** GEMINI_API_KEY is present as fallback after Vertex quota. */
  aiStudioFallback?: boolean;
};

export type LastGeminiOutcome = {
  provider: GeminiProvider;
  reason?: "ok" | "quota" | "gemini_error" | "no_key" | "vertex_denied" | "no_facts";
  model?: string;
  tier?: GeminiTier;
  at: number;
};

export type LastImagenOutcome = {
  reason?: "ok" | "quota" | "imagen_error" | "not_configured" | "vertex_denied";
  model?: string;
  at: number;
};

export type LastTranslationOutcome = {
  reason?: "ok" | "quota" | "translation_error" | "not_configured" | "vertex_denied";
  at: number;
};

export type GcpServiceId = "gemini_pro" | "gemini_flash" | "imagen" | "translation";

export type GcpServiceStatus = {
  id: GcpServiceId;
  live: boolean;
  model: string;
  role: string;
  provider: GeminiProvider | "vertex" | "none";
  reason?: string;
};

export type GcpStackStatus = GeminiPublicStatus & {
  mapping: typeof VERTEX_MODEL_MAPPING;
  project: string;
  location: string;
  hasAdc: boolean;
  services: GcpServiceStatus[];
  lastGemini?: LastGeminiOutcome;
  lastImagen?: LastImagenOutcome;
  lastTranslation?: LastTranslationOutcome;
};

let lastOutcome: LastGeminiOutcome = { provider: "none", at: 0 };
let lastImagen: LastImagenOutcome = { at: 0 };
let lastTranslation: LastTranslationOutcome = { at: 0 };
let cachedToken: { token: string; exp: number } | null = null;
let cachedStatus: { at: number; status: GeminiPublicStatus } | null = null;
let cachedStack: { at: number; status: GcpStackStatus } | null = null;
/** After Vertex 429, skip Vertex until this timestamp so AI Studio can serve. */
let vertexQuotaUntil = 0;
const STATUS_TTL_MS = 45_000;
const TOKEN_TTL_MS = 50_000;
/** Short TTL so Vertex can recover; sticky forever was blocking AI Studio. */
export const VERTEX_QUOTA_TTL_MS = 3 * 60_000;

export function vertexProject(): string {
  return runtimeEnv("GOOGLE_CLOUD_PROJECT") || DEFAULT_VERTEX_PROJECT;
}

export function vertexLocation(): string {
  return runtimeEnv("VERTEX_LOCATION") || DEFAULT_VERTEX_LOCATION;
}

export function recordGeminiOutcome(next: Omit<LastGeminiOutcome, "at">) {
  lastOutcome = { ...next, at: Date.now() };
  cachedStatus = null;
  cachedStack = null;
}

export function lastGeminiOutcome(): LastGeminiOutcome {
  return lastOutcome;
}

export function recordImagenOutcome(next: Omit<LastImagenOutcome, "at">) {
  lastImagen = { ...next, at: Date.now() };
  cachedStack = null;
}

export function lastImagenOutcome(): LastImagenOutcome {
  return lastImagen;
}

export function recordTranslationOutcome(next: Omit<LastTranslationOutcome, "at">) {
  lastTranslation = { ...next, at: Date.now() };
  cachedStack = null;
}

export function lastTranslationOutcome(): LastTranslationOutcome {
  return lastTranslation;
}

export function markVertexQuota(ttlMs: number = VERTEX_QUOTA_TTL_MS) {
  vertexQuotaUntil = Date.now() + Math.max(30_000, ttlMs);
  cachedStatus = null;
  cachedStack = null;
}

export function clearVertexQuota() {
  vertexQuotaUntil = 0;
  cachedStatus = null;
  cachedStack = null;
}

export function vertexQuotaActive(): boolean {
  if (vertexQuotaUntil <= 0) return false;
  if (Date.now() >= vertexQuotaUntil) {
    vertexQuotaUntil = 0;
    return false;
  }
  return true;
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

type ServiceAccountJson = {
  type?: string;
  client_email?: string;
  private_key?: string;
  token_uri?: string;
};

type UserAdcJson = {
  type?: string;
  client_id?: string;
  client_secret?: string;
  refresh_token?: string;
};

async function readAdcJson(): Promise<unknown | null> {
  if (typeof window !== "undefined") return null;
  try {
    const [{ readFileSync }, { homedir }, { join }] = await Promise.all([
      import("fs"),
      import("os"),
      import("path"),
    ]);
    const fromEnv = runtimeEnv("GOOGLE_APPLICATION_CREDENTIALS");
    const candidates = [
      fromEnv,
      join(homedir(), ".config/gcloud/application_default_credentials.json"),
    ].filter(Boolean);
    for (const path of candidates) {
      try {
        const raw = readFileSync(path, "utf8");
        const parsed: unknown = JSON.parse(raw);
        if (parsed && typeof parsed === "object") return parsed;
      } catch {
        /* try next path */
      }
    }
  } catch {
    return null;
  }
  return null;
}

function b64url(input: string | Buffer): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function serviceAccountAccessToken(sa: ServiceAccountJson): Promise<string | null> {
  if (!sa.client_email || !sa.private_key) return null;
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/cloud-platform",
      aud: sa.token_uri || "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const unsigned = `${header}.${claim}`;
  let signature: string;
  try {
    const { createSign } = await import("crypto");
    signature = b64url(createSign("RSA-SHA256").update(unsigned).sign(sa.private_key));
  } catch {
    return null;
  }
  try {
    const { status, json } = await fetchGoogleJson(
      sa.token_uri || "https://oauth2.googleapis.com/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
          assertion: `${unsigned}.${signature}`,
        }).toString(),
      },
      8000,
    );
    if (status < 200 || status >= 300 || !json || typeof json !== "object") return null;
    const token = (json as { access_token?: unknown }).access_token;
    return typeof token === "string" && token.trim() ? token.trim() : null;
  } catch {
    return null;
  }
}

async function userAdcAccessToken(adc: UserAdcJson): Promise<string | null> {
  if (!adc.client_id || !adc.client_secret || !adc.refresh_token) return null;
  try {
    const { status, json } = await fetchGoogleJson(
      "https://oauth2.googleapis.com/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          client_id: adc.client_id,
          client_secret: adc.client_secret,
          refresh_token: adc.refresh_token,
        }).toString(),
      },
      8000,
    );
    if (status < 200 || status >= 300 || !json || typeof json !== "object") return null;
    const token = (json as { access_token?: unknown }).access_token;
    return typeof token === "string" && token.trim() ? token.trim() : null;
  } catch {
    return null;
  }
}

async function fileAdcAccessToken(): Promise<string | null> {
  const parsed = await readAdcJson();
  if (!parsed || typeof parsed !== "object") return null;
  const o = parsed as ServiceAccountJson & UserAdcJson;
  if (o.type === "service_account" || (o.client_email && o.private_key)) {
    return serviceAccountAccessToken(o);
  }
  if (o.refresh_token && o.client_id) {
    return userAdcAccessToken(o);
  }
  return null;
}

/** Cloud Run SA via metadata, then local ADC file. Never logs the token. */
export async function vertexAccessToken(): Promise<string | null> {
  if (cachedToken && cachedToken.exp > Date.now()) return cachedToken.token;
  const token = (await metadataAccessToken()) || (await fileAdcAccessToken());
  if (!token) return null;
  cachedToken = { token, exp: Date.now() + TOKEN_TTL_MS };
  return token;
}

export function adcConfigured(): boolean {
  return Boolean(runtimeEnv("GOOGLE_APPLICATION_CREDENTIALS"));
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
  const vQuota = vertexQuotaActive();
  const hasStudio = geminiApiKeyPresent();
  const studioQuota =
    last.provider === "ai_studio" &&
    last.reason === "quota" &&
    Date.now() - last.at < VERTEX_QUOTA_TTL_MS;
  // Do not treat Vertex sticky quota as "no Gemini forever" when AI Studio key exists.
  const token = vQuota ? null : await vertexAccessToken();
  let status: GeminiPublicStatus;
  if (token && !vQuota) {
    status = {
      configured: true,
      provider: "vertex",
      quota: false,
      model: last.model || VERTEX_GEMINI_MODELS[0],
      vertexQuota: false,
      aiStudioFallback: hasStudio,
    };
  } else if (hasStudio && !studioQuota) {
    status = {
      configured: true,
      provider: "ai_studio",
      quota: false,
      model: last.provider === "ai_studio" ? last.model : undefined,
      vertexQuota: vQuota,
      aiStudioFallback: true,
    };
  } else if (hasStudio && studioQuota) {
    status = {
      configured: false,
      provider: "ai_studio",
      quota: true,
      model: last.model,
      vertexQuota: vQuota,
      aiStudioFallback: true,
    };
  } else if (vQuota) {
    status = {
      configured: false,
      provider: "vertex",
      quota: true,
      model: last.model,
      vertexQuota: true,
      aiStudioFallback: false,
    };
  } else {
    status = {
      configured: false,
      provider: "none",
      quota: true,
      vertexQuota: false,
      aiStudioFallback: false,
    };
  }
  cachedStatus = { at: Date.now(), status };
  return status;
}

const SERVICE_ROLES: Record<GcpServiceId, string> = {
  gemini_pro:
    "Primary marketing brain — audience analysis, CMO strategy, site audit, long-form calendars, script packs",
  gemini_flash:
    "Real-time burst — dozens of ad variations, headlines, short Meta/WhatsApp/Google Ads texts",
  imagen: "HD banner / ad visuals concept-matched to the copy (Imagen 3 on Vertex)",
  translation: "Cloud Translation API — culturally-aware HE ↔ AR ↔ EN pack and variation localization",
};

export async function publicGcpStackStatus(): Promise<GcpStackStatus> {
  if (cachedStack && Date.now() - cachedStack.at < STATUS_TTL_MS) return cachedStack.status;
  const gemini = await publicGeminiStatus();
  const token = gemini.provider === "vertex" && gemini.configured ? true : Boolean(await vertexAccessToken());
  const imagen = lastImagen;
  const translation = lastTranslation;
  const last = lastOutcome;
  const imagenLive = token && imagen.reason === "ok";
  const translationLive = token && translation.reason === "ok";
  const proLive =
    (gemini.provider === "vertex" && gemini.configured && !gemini.quota) ||
    (last.tier === "pro" && last.reason === "ok");
  const flashLive =
    (gemini.configured && !gemini.quota) || (last.tier === "flash" && last.reason === "ok");

  const services: GcpServiceStatus[] = [
    {
      id: "gemini_pro",
      live: Boolean(proLive || (token && gemini.configured)),
      model: last.tier === "pro" && last.model ? last.model : VERTEX_MODEL_MAPPING.livePro,
      role: SERVICE_ROLES.gemini_pro,
      provider: token ? "vertex" : gemini.provider,
      reason: !token && !gemini.configured ? "no_adc" : gemini.quota ? "quota" : last.reason,
    },
    {
      id: "gemini_flash",
      live: Boolean(flashLive || (token && gemini.configured) || geminiApiKeyPresent()),
      model: last.tier === "flash" && last.model ? last.model : VERTEX_MODEL_MAPPING.liveFlash,
      role: SERVICE_ROLES.gemini_flash,
      provider: token ? "vertex" : gemini.provider,
      reason: !token && !geminiApiKeyPresent() ? "no_adc" : gemini.quota ? "quota" : last.reason,
    },
    {
      id: "imagen",
      live: Boolean(imagenLive || (token && imagen.reason !== "not_configured" && imagen.reason !== "vertex_denied")),
      model: imagen.model || VERTEX_MODEL_MAPPING.liveImagen,
      role: SERVICE_ROLES.imagen,
      provider: token ? "vertex" : "none",
      reason: !token ? "no_adc" : imagen.reason,
    },
    {
      id: "translation",
      live: Boolean(translationLive || (token && translation.reason !== "not_configured" && translation.reason !== "vertex_denied")),
      model: VERTEX_MODEL_MAPPING.translation,
      role: SERVICE_ROLES.translation,
      provider: token ? "vertex" : "none",
      reason: !token ? "no_adc" : translation.reason,
    },
  ];

  const status: GcpStackStatus = {
    ...gemini,
    mapping: VERTEX_MODEL_MAPPING,
    project: vertexProject(),
    location: vertexLocation(),
    hasAdc: Boolean(token) || adcConfigured(),
    services,
    lastGemini: last,
    lastImagen: imagen,
    lastTranslation: translation,
  };
  cachedStack = { at: Date.now(), status };
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
