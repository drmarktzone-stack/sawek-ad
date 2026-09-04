/** Marketing / click-id query keys — strip for fetch + stored website (keep path). */
const TRACKING_QUERY_KEYS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  "utm_reader",
  "gclid",
  "gbraid",
  "wbraid",
  "fbclid",
  "msclkid",
  "mc_cid",
  "mc_eid",
  "igshid",
  "ttclid",
  "_ga",
  "_gl",
  "yclid",
  "dclid",
]);

/** Drop utm_* / click ids before fetch and before storing website. */
export function stripTrackingParams(raw: string): string {
  const trimmed = String(raw ?? "").trim().split("#")[0];
  if (!trimmed) return "";
  try {
    const u = new URL(trimmed);
    let changed = false;
    for (const key of [...u.searchParams.keys()]) {
      const low = key.toLowerCase();
      if (TRACKING_QUERY_KEYS.has(low) || low.startsWith("utm_")) {
        u.searchParams.delete(key);
        changed = true;
      }
    }
    if (!changed) return trimmed;
    const qs = u.searchParams.toString();
    // Rebuild without forcing URL.href path normalization when possible.
    const path = u.pathname || "/";
    return `${u.protocol}//${u.host}${path}${qs ? `?${qs}` : ""}`;
  } catch {
    return trimmed;
  }
}
