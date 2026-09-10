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
  "gad_source",
  "gad_campaignid",
  "gadclid",
  "gclsrc",
  "srsltid",
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

/** App chrome / wordmark that leaks into mobile paste (RTL selection). */
const BRAND_LEAK_RE =
  /نظام\s*تسويق\s*هادي|ظام\s*تسويق\s*هادي|مערכת\s*שיווק\s*שקטה|calm\s*marketing\s*os|sawek\s*ad|ساويك|סאווק|رابط\s*الموقع(?:\s*للمسح)?|امسح\s*الموقع|כתובת\s*האתר(?:\s*לסריקה)?/gi;

const HTTP_URL_RE = /https?:\/\/[^\s<>"'،,;]+/i;
const DOMAIN_RE =
  /\b(?:www\.)?[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+\b(?:\/[^\s]*)?/i;

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
    const path = u.pathname || "/";
    return `${u.protocol}//${u.host}${path}${qs ? `?${qs}` : ""}`;
  } catch {
    return trimmed;
  }
}

function stripBrandLeak(raw: string): string {
  return String(raw ?? "")
    .replace(/[\u200e\u200f\u202a-\u202e]/g, "")
    .replace(BRAND_LEAK_RE, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function firstUrlCandidate(raw: string): string {
  const cleaned = stripBrandLeak(raw);
  if (!cleaned) return "";
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(cleaned) && !/^https?:\/\//i.test(cleaned)) {
    return "";
  }
  const http = cleaned.match(HTTP_URL_RE);
  if (http?.[0]) return http[0].replace(/[)\]}>.,;:]+$/, "");
  if (/^https?:\/\/\S+$/i.test(cleaned) && !/[\u0600-\u06FF\u0590-\u05FF\s]/.test(cleaned)) {
    return cleaned.split("#")[0] ?? cleaned;
  }
  const domain = cleaned.match(DOMAIN_RE);
  if (domain?.[0] && !/^https?:\/\//i.test(domain[0])) {
    return `https://${domain[0].replace(/[)\]}>.,;:]+$/, "")}`;
  }
  return "";
}

function scrubContaminatedPath(pathname: string): string {
  let path = pathname || "/";
  try {
    path = decodeURIComponent(path);
  } catch {
    /* keep encoded */
  }
  const spaceCut = path.search(/[\s\u00a0]/);
  if (spaceCut >= 0) path = path.slice(0, spaceCut);
  // Branding glued onto a homepage path (no space): /نظام تسويق or /ظام تسويق
  if (/تسويق|שיווק|sawek|marketing\s*os/i.test(path)) {
    const brandAt = path.search(/[\u0600-\u06FF\u0590-\u05FF]|sawek|marketing/i);
    if (brandAt > 0) path = path.slice(0, brandAt);
    else path = "/";
  }
  const core = path.replace(/^\//, "").replace(/\/+$/, "");
  // RTL chrome fragment with no ASCII slug — not a real product path.
  if (core && !/[a-z0-9]/i.test(core) && /[\u0600-\u06FF\u0590-\u05FF]/.test(core)) {
    path = "/";
  }
  path = path.replace(/\/+$/, "") || "/";
  if (!path.startsWith("/")) path = `/${path}`;
  return path;
}

/**
 * Extract a fetchable http(s) URL from a dirty paste.
 * Strips trailing/leading app chrome (نظام تسويق هادي) and tracking params.
 */
export function sanitizePastedUrl(raw: string): string {
  const brandless = stripBrandLeak(raw);
  const single = brandless.trim();
  if (
    /^https?:\/\/[^\s<>"'،,;]+$/i.test(single) &&
    !/[\u0600-\u06FF\u0590-\u05FF]/.test(single) &&
    !/%20|%d[89a-f]/i.test(single)
  ) {
    return stripTrackingParams(single.split("#")[0] || single) || single.split("#")[0] || "";
  }
  const candidate = firstUrlCandidate(raw);
  if (!candidate) return "";
  try {
    const u = new URL(candidate);
    if (u.protocol !== "http:" && u.protocol !== "https:") return "";
    if (!u.hostname) return "";
    u.hash = "";
    u.pathname = scrubContaminatedPath(u.pathname);
    const rebuilt = `${u.protocol}//${u.host}${u.pathname}${u.search}`;
    return stripTrackingParams(rebuilt) || rebuilt;
  } catch {
    return "";
  }
}

export function looksLikeDirtyUrlPaste(raw: string): boolean {
  const s = String(raw ?? "");
  if (!s.trim()) return false;
  BRAND_LEAK_RE.lastIndex = 0;
  if (BRAND_LEAK_RE.test(s)) return true;
  if (/\s/.test(s.trim()) && /https?:\/\//i.test(s)) return true;
  return /https?:\/\/\S*[\u0600-\u06FF\u0590-\u05FF]/.test(s);
}

/** True when the string is only app chrome (نظام تسويق هادي), not a business name. */
export function isBrandChromeText(raw: string): boolean {
  const s = String(raw ?? "").trim();
  if (!s) return false;
  const stripped = stripBrandLeak(s);
  if (!stripped) return true;
  BRAND_LEAK_RE.lastIndex = 0;
  if (BRAND_LEAK_RE.test(s)) return true;
  const leftover = stripped.replace(/https?:\/\/\S+/gi, "").replace(/[/.]/g, "").trim();
  return leftover.length < 8 && /تسويق|שיווק|sawek|marketing\s*os/i.test(s);
}

/** Dirty paste: if a URL is present, that is the website — leftovers are chrome, never the business name. */
export function interpretCampaignPaste(raw: string): { website: string; name: string } {
  const website = sanitizePastedUrl(raw);
  if (website) return { website, name: "" };
  let name = stripBrandLeak(raw).replace(/^https?:\/\/\S+/i, "").trim();
  if (isBrandChromeText(name) || isBrandChromeText(raw) || looksLikeDirtyUrlPaste(raw)) name = "";
  return { website: "", name };
}
