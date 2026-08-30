/** Redact secrets from Graph/LinkedIn error text so they never reach logs or the browser. */
export function redact(text: string): string {
  return text
    .replace(/access_token=[^&\s"]+/gi, "access_token=redacted")
    .replace(/fb_exchange_token=[^&\s"]+/gi, "fb_exchange_token=redacted")
    .replace(/client_secret=[^&\s"]+/gi, "client_secret=redacted")
    .replace(/code=[^&\s"]+/gi, "code=redacted")
    .replace(/Bearer\s+[A-Za-z0-9._~+/-]+/gi, "Bearer redacted");
}

export async function fetchJson(
  url: string,
  init?: RequestInit,
): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  const res = await fetch(url, init);
  const raw = await res.text();
  let data: Record<string, unknown> = {};
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      data = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : { raw: parsed };
    } catch {
      data = { error: redact(raw.slice(0, 300)) };
    }
  }
  return { ok: res.ok, status: res.status, data };
}

export function graphError(data: Record<string, unknown>, fallback = "request_failed"): string {
  const err = data.error;
  if (err && typeof err === "object") {
    const o = err as { message?: unknown; code?: unknown; error_subcode?: unknown };
    const msg = typeof o.message === "string" ? redact(o.message) : "";
    if (msg) return msg.slice(0, 240);
  }
  if (typeof data.message === "string") return redact(data.message).slice(0, 240);
  return fallback;
}
