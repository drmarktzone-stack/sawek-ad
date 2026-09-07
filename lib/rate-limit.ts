/**
 * Per-instance sliding-window limiter for Vertex / Imagen / Translate / research.
 * Anonymous template overlays stay available: callers must treat `rate_limited`
 * as "skip the paid model, use templates" — never as a hard 429 on campaign build.
 *
 * Cloud Run has one process per instance. This is defense-in-depth, not a global
 * quota store. Live GCP quotas still apply. UNKNOWN across instances.
 */

export type RateBucket = "vertex" | "imagen" | "translate" | "research" | "brand_voice";

export type RateDecision = {
  allowed: boolean;
  bucket: RateBucket;
  remaining: number;
  retryAfterSec: number;
  limit: number;
  windowMs: number;
};

type Window = { limit: number; windowMs: number };

const WINDOWS: Record<RateBucket, Window> = {
  vertex: { limit: 24, windowMs: 15 * 60_000 },
  imagen: { limit: 8, windowMs: 15 * 60_000 },
  translate: { limit: 40, windowMs: 15 * 60_000 },
  research: { limit: 20, windowMs: 15 * 60_000 },
  brand_voice: { limit: 40, windowMs: 15 * 60_000 },
};

const SIGNED_IN_BONUS = 2;

type Hit = { at: number };
const buckets = new Map<string, Hit[]>();

function clientIp(req: Request): string {
  const xf = req.headers.get("x-forwarded-for") ?? "";
  const first = xf.split(",")[0]?.trim();
  if (first) return first.slice(0, 80);
  const real = (req.headers.get("x-real-ip") ?? "").trim();
  if (real) return real.slice(0, 80);
  return "unknown";
}

export function rateClientKey(req: Request, userId?: string | null): string {
  const uid = String(userId ?? "").trim();
  if (uid) return `u:${uid.slice(0, 64)}`;
  return `ip:${clientIp(req)}`;
}

export function checkAiRateLimit(req: Request, bucket: RateBucket, userId?: string | null): RateDecision {
  const win = WINDOWS[bucket];
  const limit = userId ? win.limit * SIGNED_IN_BONUS : win.limit;
  const key = `${bucket}:${rateClientKey(req, userId)}`;
  const now = Date.now();
  const cutoff = now - win.windowMs;
  const prev = (buckets.get(key) ?? []).filter((h) => h.at > cutoff);
  if (prev.length >= limit) {
    buckets.set(key, prev);
    const oldest = prev[0]?.at ?? now;
    const retryAfterSec = Math.max(1, Math.ceil((oldest + win.windowMs - now) / 1000));
    return { allowed: false, bucket, remaining: 0, retryAfterSec, limit, windowMs: win.windowMs };
  }
  prev.push({ at: now });
  buckets.set(key, prev);
  return {
    allowed: true,
    bucket,
    remaining: Math.max(0, limit - prev.length),
    retryAfterSec: 0,
    limit,
    windowMs: win.windowMs,
  };
}

/** Test helper — never call from request handlers. */
export function resetRateLimitForTests() {
  buckets.clear();
}

export function rateLimitHeaders(decision: RateDecision): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(decision.limit),
    "X-RateLimit-Remaining": String(decision.remaining),
    ...(decision.allowed ? {} : { "Retry-After": String(decision.retryAfterSec) }),
  };
}

export function vertexRateLimitedBody() {
  return {
    ok: false as const,
    reason: "rate_limited",
    useTemplates: true as const,
    error: "rate_limited",
  };
}

export function imagenRateLimitedBody() {
  return { ok: false as const, reason: "rate_limited", images: [] as const, error: "rate_limited" };
}

export function translateRateLimitedBody() {
  return { ok: false as const, reason: "rate_limited", error: "rate_limited" };
}

export function proDeskRateLimitedBody() {
  return { tier: "pro" as const, down: true as const, reason: "rate_limited" };
}

export function researchRateLimitedNote() {
  return { reason: "rate_limited", fetched: true as const };
}

export async function userIdFromRequest(req: Request): Promise<string | null> {
  try {
    const { sessionFromRequest } = await import("./auth-server");
    const { session } = await sessionFromRequest(req);
    return session?.user.id ?? null;
  } catch {
    return null;
  }
}
