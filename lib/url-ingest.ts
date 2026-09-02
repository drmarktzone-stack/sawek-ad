import { lookup } from "node:dns/promises";
import {
  advantageAfterQuestionSplit,
  distinctPageAdvantage,
  extractFieldsFromText,
  fillEmptyFromPageProse,
  formatIlPhone,
  isCatalogHeading,
  isJunkUiText,
  type IngestFieldId,
} from "./document-ingest";
import { extractCssColors, extractLogoUrl } from "./brand-kit";
import {
  detectSocialKind,
  facebookAboutUrl,
  facebookMbasicUrl,
  mergeSocialParses,
  parseSocialPage,
  SOCIAL_BROWSER_UA,
  type SocialKind,
  type SocialPageParse,
  type SocialPost,
} from "./social-page";
import type { PastCampaignAudit } from "./types";

/** Extra-page per-request timeout. Homepage uses URL_HOMEPAGE_TIMEOUT_MS. */
export const URL_FETCH_TIMEOUT_MS = 8_000;
/** Slow WooCommerce homepages (~1.5MB) need more than 8s; extras stay shorter. */
export const URL_HOMEPAGE_TIMEOUT_MS = 25_000;
/** Wall-clock budget for all extra nav fetches together (parallel). */
export const URL_EXTRA_PAGES_BUDGET_MS = 14_000;
/** Abort the body once we have enough HTML to parse (do not wait for the catalog). */
export const URL_PARSE_BODY_CAP = 512 * 1024;
export const URL_MAX_BODY = Math.floor(1.5 * 1024 * 1024);
export const URL_MAX_REDIRECTS = 5;
export const URL_TEXT_CAP = 20_000;
export const URL_MAX_EXTRA_PAGES = 12;
export const URL_MAX_IMAGES = 16;

export type UrlIngestErrorCode =
  | "invalid_url"
  | "blocked"
  | "timeout"
  | "non_html"
  | "empty"
  | "too_large"
  | "network"
  | "social_login_wall";

export type UrlIngestFields = Partial<Record<IngestFieldId, string>>;

export interface UrlIngestOk {
  ok: true;
  url: string;
  title: string;
  text: string;
  fields: UrlIngestFields;
  ogImage?: string;
  images?: string[];
  logo?: string;
  colors?: string[];
  jsonLdHits?: string[];
  posts?: SocialPost[];
  sourceKind?: "website" | "facebook" | "instagram";
  pastCampaignAudit?: PastCampaignAudit;
}

export interface UrlIngestErr {
  ok: false;
  error: UrlIngestErrorCode;
}

export type UrlIngestResult = UrlIngestOk | UrlIngestErr;

const GENERIC_SCHEMA = new Set(["localbusiness", "organization", "thing", "place", "webpage", "website"]);

const BUSINESS_SCHEMA = new Set([
  "localbusiness",
  "organization",
  "restaurant",
  "foodestablishment",
  "fastfoodrestaurant",
  "bakery",
  "cafeorcoffeeshop",
  "barorpub",
  "store",
  "clothingstore",
  "grocerystore",
  "medicalclinic",
  "physician",
  "dentist",
  "medicalorganization",
  "hospital",
  "professionalservice",
  "legalservice",
  "attorney",
  "automotivebusiness",
  "autodealer",
  "healthandbeautybusiness",
  "dayspa",
  "hairsalon",
  "lodgingbusiness",
  "hotel",
  "sportsactivitylocation",
  "gym",
  "employmentagency",
  "realestateagent",
  "electrician",
  "generaldcontractor",
  "homeandconstructionbusiness",
  "plumber",
  "locksmith",
]);

function clip(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return t.slice(0, max).trim();
}

function clipPreserveNewlines(s: string, max: number): string {
  const t = String(s ?? "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  if (t.length <= max) return t;
  return t.slice(0, max).trim();
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => {
      const n = parseInt(h, 16);
      return Number.isFinite(n) ? String.fromCodePoint(n) : "";
    })
    .replace(/&#(\d+);/g, (_, d) => {
      const n = Number(d);
      return Number.isFinite(n) ? String.fromCodePoint(n) : "";
    });
}

function stripZone(host: string): string {
  return host.toLowerCase().replace(/\.$/, "").replace(/^\[|\]$/g, "");
}

export function isBlockedHostname(host: string): boolean {
  const h = stripZone(host);
  if (!h) return true;
  if (h === "localhost" || h.endsWith(".localhost")) return true;
  if (h.endsWith(".local") || h.endsWith(".internal") || h.endsWith(".lan")) return true;
  if (h === "metadata.google.internal" || h.endsWith(".metadata.google.internal")) return true;
  if (h.endsWith(".trycloudflare.com") || h.endsWith(".cfargotunnel.com")) return true;
  if (h === "0.0.0.0" || h === "::" || h === "0:0:0:0:0:0:0:0") return true;
  return false;
}

export function isBlockedIPv4(ip: string): boolean {
  const parts = ip.split(".").map((x) => Number(x));
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a, b] = parts;
  if (a === 0 || a === 127 || a === 10 || a === 255) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 192 && b === 0) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a === 198 && b === 51 && parts[2] === 100) return true;
  if (a === 203 && b === 0 && parts[2] === 113) return true;
  return false;
}

function expandIpv6(ip: string): number[] | null {
  const raw = stripZone(ip).split("%")[0];
  if (!raw.includes(":")) return null;
  let v = raw;
  if (v.startsWith("::ffff:")) {
    const mapped = v.slice(7);
    if (mapped.includes(".")) {
      const p = mapped.split(".").map(Number);
      if (p.length === 4 && p.every((n) => Number.isInteger(n) && n >= 0 && n <= 255)) {
        return [0, 0, 0, 0, 0, 0xffff, (p[0] << 8) | p[1], (p[2] << 8) | p[3]];
      }
    }
  }
  const sides = v.split("::");
  if (sides.length > 2) return null;
  const parseSide = (s: string): number[] =>
    s
      ? s.split(":").map((h) => {
          if (!h || /[^0-9a-f]/i.test(h) || h.length > 4) return NaN;
          return parseInt(h, 16);
        })
      : [];
  let head = parseSide(sides[0] ?? "");
  let tail = sides.length === 2 ? parseSide(sides[1] ?? "") : [];
  if (head.some((n) => !Number.isInteger(n)) || tail.some((n) => !Number.isInteger(n))) return null;
  if (head.length + tail.length > 8) return null;
  const mid = Array.from({ length: 8 - head.length - tail.length }, () => 0);
  const full = [...head, ...mid, ...tail];
  return full.length === 8 ? full : null;
}

export function isBlockedIp(ip: string): boolean {
  const h = stripZone(ip);
  if (isBlockedIPv4(h)) return true;
  const v6 = expandIpv6(h);
  if (!v6) return h === "::1";
  // IPv4-mapped
  if (v6[0] === 0 && v6[1] === 0 && v6[2] === 0 && v6[3] === 0 && v6[4] === 0 && v6[5] === 0xffff) {
    const a = (v6[6] >> 8) & 255;
    const b = v6[6] & 255;
    const c = (v6[7] >> 8) & 255;
    const d = v6[7] & 255;
    return isBlockedIPv4(`${a}.${b}.${c}.${d}`);
  }
  // ::1
  if (v6.every((n, i) => (i === 7 ? n === 1 : n === 0))) return true;
  // unspecified
  if (v6.every((n) => n === 0)) return true;
  // fe80::/10 link-local
  if ((v6[0] & 0xffc0) === 0xfe80) return true;
  // fc00::/7 unique local
  if ((v6[0] & 0xfe00) === 0xfc00) return true;
  return false;
}

function hostLooksLikeIpv4(host: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
}

export function inspectUrl(
  raw: string,
  extraBlockedHosts: string[] = [],
): { ok: true; url: URL } | UrlIngestErr {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return { ok: false, error: "invalid_url" };
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, error: "invalid_url" };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, error: "invalid_url" };
  }
  const host = stripZone(parsed.hostname);
  if (!host) return { ok: false, error: "invalid_url" };
  if (isBlockedHostname(host)) return { ok: false, error: "blocked" };
  const extras = extraBlockedHosts.map(stripZone).filter(Boolean);
  if (extras.includes(host)) return { ok: false, error: "blocked" };
  if (hostLooksLikeIpv4(host) && isBlockedIPv4(host)) return { ok: false, error: "blocked" };
  if (host.includes(":") && isBlockedIp(host)) return { ok: false, error: "blocked" };
  return { ok: true, url: parsed };
}

async function resolvedIpsBlocked(hostname: string): Promise<boolean> {
  const host = stripZone(hostname);
  if (hostLooksLikeIpv4(host) || host.includes(":")) return isBlockedIp(host);
  try {
    const records = await lookup(host, { all: true, verbatim: true });
    if (!records.length) return true;
    return records.some((r) => isBlockedIp(r.address));
  } catch {
    return true;
  }
}

export async function assertSafeUrl(
  raw: string,
  extraBlockedHosts: string[] = [],
): Promise<{ ok: true; url: URL } | UrlIngestErr> {
  const inspected = inspectUrl(raw, extraBlockedHosts);
  if (!inspected.ok) return inspected;
  if (await resolvedIpsBlocked(inspected.url.hostname)) return { ok: false, error: "blocked" };
  return inspected;
}

function metaContent(html: string, key: string): string {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(
    `<meta\\b[^>]*(?:property|name)\\s*=\\s*["']${escaped}["'][^>]*content\\s*=\\s*["']([^"']*)["'][^>]*>|<meta\\b[^>]*content\\s*=\\s*["']([^"']*)["'][^>]*(?:property|name)\\s*=\\s*["']${escaped}["'][^>]*>`,
    "i",
  );
  const m = html.match(re);
  return decodeEntities((m?.[1] || m?.[2] || "").trim());
}

function tagText(html: string, tag: string): string {
  const m = html.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return clip(decodeEntities((m?.[1] || "").replace(/<[^>]+>/g, " ")), 300);
}

function visibleText(html: string): string {
  const stripped = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, " ")
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h1|h2|h3|h4|li|tr|section|article|header|footer|blockquote)>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  const decoded = decodeEntities(stripped);
  return decoded.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").replace(/[ \t]{2,}/g, " ").trim().slice(0, URL_TEXT_CAP);
}


function firstHeaderOrSeoParagraph(html: string): string {
  const seoIdx = html.search(/id=["']seo-snapshot["']|data-seo-source/i);
  let inner = "";
  if (seoIdx >= 0) {
    const slice = html.slice(seoIdx, seoIdx + 8000);
    const p = slice.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i);
    if (p) inner = p[1];
  }
  if (!inner) {
    const header = html.match(/<header\b[^>]*>([\s\S]*?)<\/header>/i);
    const p = header?.[1]?.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i);
    if (p) inner = p[1];
  }
  if (!inner) {
    const after = html.match(/<h1\b[^>]*>[\s\S]*?<\/h1>[\s\S]*?<p\b[^>]*>([\s\S]*?)<\/p>/i);
    if (after) inner = after[1];
  }
  if (!inner) return "";
  return clip(decodeEntities(inner.replace(/<[^>]+>/g, " ")), 500);
}

function hrefs(html: string, re: RegExp): string[] {
  const out: string[] = [];
  for (const m of html.matchAll(re)) {
    const v = decodeEntities((m[1] || "").trim());
    if (v && !out.includes(v)) out.push(v);
  }
  return out;
}

function schemaTypes(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.flatMap(schemaTypes);
  if (typeof raw === "string") {
    return raw
      .split(/\s+/)
      .map((s) => s.replace(/^https?:\/\/schema\.org\//i, "").trim())
      .filter(Boolean);
  }
  return [];
}

function isBusinessType(types: string[]): boolean {
  return types.some((t) => BUSINESS_SCHEMA.has(t.toLowerCase()));
}

function asString(v: unknown): string {
  if (typeof v === "string") return clip(v, 400);
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  if (Array.isArray(v)) {
    for (const x of v) {
      const s = asString(x);
      if (s) return s;
    }
  }
  if (v && typeof v === "object" && "name" in (v as object)) return asString((v as { name: unknown }).name);
  return "";
}

function formatAddress(addr: unknown): string {
  if (!addr) return "";
  if (typeof addr === "string") return clip(addr, 280);
  if (Array.isArray(addr)) return formatAddress(addr[0]);
  if (typeof addr !== "object") return "";
  const o = addr as Record<string, unknown>;
  const parts = [o.streetAddress, o.addressLocality, o.addressRegion, o.postalCode, o.addressCountry]
    .flatMap((x) => (Array.isArray(x) ? x : [x]))
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter(Boolean);
  return clip(parts.join(", "), 280);
}

function formatHours(node: Record<string, unknown>): string {
  const simple = node.openingHours;
  if (typeof simple === "string") return clip(simple, 280);
  if (Array.isArray(simple)) return clip(simple.map((x) => asString(x)).filter(Boolean).join(" · "), 280);
  const spec = node.openingHoursSpecification;
  const rows = Array.isArray(spec) ? spec : spec ? [spec] : [];
  const bits: string[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const days = asString(r.dayOfWeek);
    const opens = asString(r.opens);
    const closes = asString(r.closes);
    const bit = [days, opens && closes ? `${opens}–${closes}` : opens || closes].filter(Boolean).join(" ");
    if (bit) bits.push(bit);
  }
  return clip(bits.join(" · "), 280);
}

function walkJsonLd(node: unknown, hits: Record<string, unknown>[], sites: Record<string, unknown>[] = []): void {
  if (!node) return;
  if (Array.isArray(node)) {
    for (const x of node) walkJsonLd(x, hits, sites);
    return;
  }
  if (typeof node !== "object") return;
  const o = node as Record<string, unknown>;
  if (o["@graph"]) walkJsonLd(o["@graph"], hits, sites);
  const types = schemaTypes(o["@type"]);
  const low = types.map((x) => x.toLowerCase());
  if (low.includes("website") || low.includes("webpage")) sites.push(o);
  if (types.length && isBusinessType(types)) hits.push(o);
}

function parseJsonLd(html: string): { nodes: Record<string, unknown>[]; sites: Record<string, unknown>[]; types: string[] } {
  const nodes: Record<string, unknown>[] = [];
  const sites: Record<string, unknown>[] = [];
  const typeSet: string[] = [];
  const re = /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const m of html.matchAll(re)) {
    const raw = decodeEntities(m[1] || "").trim();
    if (!raw) continue;
    try {
      walkJsonLd(JSON.parse(raw), nodes, sites);
    } catch {
      /* ignore broken json-ld */
    }
  }
  for (const n of [...nodes, ...sites]) {
    for (const tt of schemaTypes(n["@type"])) {
      if (!typeSet.includes(tt)) typeSet.push(tt);
    }
  }
  return { nodes, sites, types: typeSet };
}

function jsonLdSiteName(sites: Record<string, unknown>[]): string {
  for (const n of sites) {
    const types = schemaTypes(n["@type"]).map((x) => x.toLowerCase());
    if (!types.includes("website")) continue;
    const name = asString(n.name);
    if (name) return clip(name, 120);
  }
  return "";
}

function labeledFromJsonLd(nodes: Record<string, unknown>[]): string[] {
  const lines: string[] = [];
  const push = (label: string, value: string) => {
    const v = value.trim();
    if (!v) return;
    const line = `${label}: ${v}`;
    if (!lines.includes(line)) lines.push(line);
  };
  for (const n of nodes) {
    push("שם העסק", asString(n.name));
    push("טלפון", asString(n.telephone));
    push("כתובת", formatAddress(n.address));
    push("אתר", asString(n.url));
    push("שעות", formatHours(n));
    push("תיאור", asString(n.description));
    const types = schemaTypes(n["@type"]).filter((t) => !GENERIC_SCHEMA.has(t.toLowerCase()));
    if (types[0]) push("תחום", types[0]);
    const services = asString(n.serviceType) || asString(n.knowsAbout) || asString(n.makesOffer);
    if (services && !/\$|₪|€|price|מחיר|سعر/i.test(services)) push("תיאור", services);
  }
  return lines;
}

function jsonLdName(nodes: Record<string, unknown>[]): string {
  for (const n of nodes) {
    const name = asString(n.name);
    if (name) return clip(name, 120);
  }
  return "";
}

function jsonLdCategory(nodes: Record<string, unknown>[]): string {
  for (const n of nodes) {
    const types = schemaTypes(n["@type"]).filter((t) => !GENERIC_SCHEMA.has(t.toLowerCase()));
    if (types[0]) return types[0];
  }
  return "";
}

function pageLooksLikeAd(finalUrl: string, text: string): boolean {
  let path = finalUrl;
  try {
    path = new URL(finalUrl).pathname;
  } catch {
    /* keep */
  }
  const file = (path.split("/").pop() || path).toLowerCase();
  const pathLooksAd = /ad\b|מודעה|اعلان|إعلان|creative|flyer|פלאייר|منشور|campaign|קמפיין|حملة/.test(file) ||
    /\/(ads?|campaigns?|מודעה|اعلان)\b/i.test(path);
  const labeledHead = /(^|\n)\s*(headline|כותרת|عنوان الإعلان)\s*[:：=]/im.test(text);
  const labeledCta = /(^|\n)\s*(cta|קריאה לפעולה|دعوة)\s*[:：=]/im.test(text);
  if (labeledHead && labeledCta) return true;
  if (pathLooksAd && labeledHead && labeledCta) return true;
  return false;
}

function filenameFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const last = u.pathname.split("/").filter(Boolean).pop() || "index.html";
    return last.includes(".") ? last : `${last || "homepage"}.html`;
  } catch {
    return "homepage.html";
  }
}

function absHttpUrl(maybe: string, base: string): string {
  if (!maybe) return "";
  try {
    const u = new URL(maybe, base);
    if (u.protocol !== "http:" && u.protocol !== "https:") return "";
    return u.href;
  } catch {
    return "";
  }
}


function originKey(u: URL): string {
  const host = stripZone(u.hostname).replace(/^www\./i, "");
  const port = u.port || (u.protocol === "https:" ? "443" : "80");
  return `${u.protocol}//${host}:${port}`;
}

function sameSiteOrigin(a: URL, b: URL): boolean {
  return originKey(a) === originKey(b);
}

function navLabelText(inner: string): string {
  return clip(decodeEntities((inner || "").replace(/<[^>]+>/g, " ")), 80);
}

function navChunks(html: string): string[] {
  const out: string[] = [];
  for (const m of html.matchAll(/<nav\b[^>]*>([\s\S]*?)<\/nav>/gi)) {
    if (m[1]) out.push(m[1]);
  }
  for (const m of html.matchAll(/<header\b[^>]*>([\s\S]*?)<\/header>/gi)) {
    if (m[1]) out.push(m[1]);
  }
  for (const m of html.matchAll(/<(?:div|ul|ol)\b[^>]*role\s*=\s*["']navigation["'][^>]*>([\s\S]*?)<\/(?:div|ul|ol)>/gi)) {
    if (m[1]) out.push(m[1]);
  }
  return out;
}

function navScore(href: string, label: string): number {
  const blob = `${href} ${label}`;
  if (/about|אודות|من نحن|حولنا|\bحول\b|about-us|who-we-are|our-story|מי אנחנו/i.test(blob)) return 100;
  if (/services|שירותים|خدمات|service/i.test(blob)) return 95;
  if (/contact|צור קשר|צור\b|اتصل|contact-us/i.test(blob)) return 90;
  if (/תפריט|\bmenu\b|قائمة/i.test(blob)) return 85;
  if (/shop|חנות|متجر|store|catalog|קטלוג|product/i.test(blob)) return 82;
  if (/offer|sale|מבצע|خصم|تنزيلات|promo/i.test(blob)) return 80;
  if (/hours|שעות|ساعات|opening/i.test(blob)) return 75;
  if (/team|צוות|فريق|staff|doctors/i.test(blob)) return 70;
  if (/gallery|גלריה|معرض|photos/i.test(blob)) return 68;
  if (/location|כתובת|عنوان|access|הגעה|find-us/i.test(blob)) return 60;
  return 10;
}

function skipNavUrl(u: URL, home: URL): boolean {
  if (u.protocol !== "http:" && u.protocol !== "https:") return true;
  if (!sameSiteOrigin(u, home)) return true;
  const path = u.pathname.replace(/\/+$/, "") || "/";
  const homePath = home.pathname.replace(/\/+$/, "") || "/";
  if (path === homePath && !u.search) return true;
  if (/\.(pdf|jpe?g|png|webp|gif|svg|zip|mp4|mp3|css|js)$/i.test(path)) return true;
  if (/\/(login|signin|sign-in|signup|sign-up|register|cart|basket|checkout|account|wp-admin|admin|password-reset|lost-password|forgot-password|my-account|wishlist|wp-login)(\/|$)/i.test(path)) return true;
  if (/[?&](add-to-cart|login)=/i.test(u.search)) return true;
  const inspected = inspectUrl(u.href);
  if (!inspected.ok) return true;
  return false;
}

function pushNavLink(
  scored: { href: string; score: number }[],
  seen: Set<string>,
  home: URL,
  rawHref: string,
  label: string,
  minScore: number,
) {
  if (!rawHref || rawHref.startsWith("mailto:") || rawHref.startsWith("tel:") || rawHref.startsWith("javascript:")) return;
  let u: URL;
  try {
    u = new URL(rawHref, home.href);
  } catch {
    return;
  }
  u.hash = "";
  if (skipNavUrl(u, home)) return;
  const key = `${u.origin}${u.pathname.replace(/\/+$/, "") || "/"}${u.search}`;
  if (seen.has(key)) return;
  const score = navScore(u.pathname + " " + u.href, label);
  if (score < minScore) return;
  seen.add(key);
  scored.push({ href: u.href, score });
}

/** Same-origin in-nav links, preferring About/Services/Contact/Shop/תפריט/من نحن. Caps extras. Skips blocked hosts. */
export function collectSameOriginNavUrls(html: string, baseUrl: string, cap = URL_MAX_EXTRA_PAGES): string[] {
  let home: URL;
  try {
    home = new URL(baseUrl);
  } catch {
    return [];
  }
  const scored: { href: string; score: number }[] = [];
  const seen = new Set<string>();
  const chunks = navChunks(html);
  for (const chunk of chunks) {
    for (const m of chunk.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
      const rawHref = decodeEntities((m[1] || "").trim());
      const label = navLabelText(m[2] || "");
      pushNavLink(scored, seen, home, rawHref, label, 0);
    }
  }
  for (const m of html.matchAll(/<footer\b[^>]*>([\s\S]*?)<\/footer>/gi)) {
    const foot = m[1] || "";
    for (const a of foot.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
      pushNavLink(scored, seen, home, decodeEntities((a[1] || "").trim()), navLabelText(a[2] || ""), 50);
    }
  }
  if (scored.length < cap) {
    for (const m of html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
      pushNavLink(scored, seen, home, decodeEntities((m[1] || "").trim()), navLabelText(m[2] || ""), 50);
      if (scored.length >= cap * 3) break;
    }
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, Math.max(0, cap)).map((x) => x.href);
}

const SKIP_SCRIPT_SRC = /gtag|googletagmanager|google-analytics|facebook\.net|hotjar|recaptcha|analytics|doubleclick/i;

/** Same-origin module/script bundles (SPA copy lives here). Caps count. Skips trackers. */
export function collectSameOriginScriptUrls(html: string, baseUrl: string, cap = 2): string[] {
  let home: URL;
  try {
    home = new URL(baseUrl);
  } catch {
    return [];
  }
  const out: string[] = [];
  const seen = new Set<string>();
  for (const m of html.matchAll(/<script\b[^>]*src\s*=\s*["']([^"']+)["'][^>]*>/gi)) {
    const rawHref = decodeEntities((m[1] || "").trim());
    if (!rawHref) continue;
    let u: URL;
    try {
      u = new URL(rawHref, home.href);
    } catch {
      continue;
    }
    if (u.protocol !== "http:" && u.protocol !== "https:") continue;
    if (!sameSiteOrigin(u, home)) continue;
    if (SKIP_SCRIPT_SRC.test(u.href) || SKIP_SCRIPT_SRC.test(u.pathname)) continue;
    if (!/\.m?js$/i.test(u.pathname) && !/\/assets\//i.test(u.pathname)) continue;
    const inspected = inspectUrl(u.href);
    if (!inspected.ok) continue;
    const key = `${u.origin}${u.pathname}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(u.href);
    if (out.length >= cap) break;
  }
  return out;
}

const JS_CONTACT_KEY =
  /(?:phone|telephone|mobile|whatsappDisplay|whatsapp|tel|addressDetails|streetAddress|addressLocality|address|locationName|location|openingHours|hours)\s*:\s*["']([^"']{3,280})["']/gi;

const HE_AR = /[\u0590-\u05FF\u0600-\u06FF]/;

/** Pull labeled contact facts + visible quoted copy from a JS bundle. Extract-only, generic keys. */
export function extractScriptBundleText(js: string): string {
  const raw = String(js ?? "");
  if (!raw.trim()) return "";
  const labeled: string[] = [];
  const human: string[] = [];
  const seen = new Set<string>();
  let phoneLabels = 0;
  const push = (label: string, value: string) => {
    const v = clip(decodeEntities(value), 280);
    if (!v || seen.has(`${label}:${v}`)) return;
    seen.add(`${label}:${v}`);
    labeled.push(`${label}: ${v}`);
  };
  for (const m of raw.matchAll(JS_CONTACT_KEY)) {
    const key = (m[0].split(":")[0] || "").toLowerCase();
    const val = m[1] || "";
    if (/phone|tel|mobile|whatsapp/.test(key)) {
      if (phoneLabels >= 3) continue;
      phoneLabels += 1;
      push(/whatsapp/.test(key) ? "וואטסאפ" : "טלפון", val);
    } else if (/address|location|street/.test(key)) push("כתובת", val);
    else if (/hour/.test(key)) push("שעות", val);
  }
  const hourRows: string[] = [];
  for (const m of raw.matchAll(
    /day\s*:\s*["']([^"']{2,40})["']\s*,\s*morning\s*:\s*["']([^"']{0,80})["']\s*,\s*evening\s*:\s*["']([^"']{0,80})["']/gi,
  )) {
    hourRows.push(`${m[1].trim()} ${m[2].trim()}${m[3].trim() ? ` / ${m[3].trim()}` : ""}`);
  }
  if (hourRows.length) push("שעות", hourRows.join(" · "));
  for (const m of raw.matchAll(/["']([^"'\\]{6,240})["']/g)) {
    const str = decodeEntities(m[1] || "").replace(/\s+/g, " ").trim();
    if (!str) continue;
    if (!HE_AR.test(str) && !/\d{1,2}:\d{2}/.test(str) && !/0\d[\s-]?\d{3}/.test(str)) continue;
    if (/^(?:https?:|\/assets\/|#|\.)/.test(str)) continue;
    if (/(?:className|px-|bg-|text-slate|rounded-|flex |font-\[|w-\d|h-\d)/.test(str)) continue;
    if (isJunkUiText(str) || isCatalogHeading(str)) continue;
    if (!human.includes(str)) human.push(str);
    if (human.length >= 80) break;
  }
  return clipPreserveNewlines([...labeled, ...human].join("\n"), URL_TEXT_CAP);
}

const KEEP_HOME_FIELDS = new Set<IngestFieldId>(["website", "businessName"]);

/** Fill empty extract-only slots from another page. Never overwrite, never invent. */
export function mergeExtractedFields(primary: UrlIngestFields, extra: UrlIngestFields): UrlIngestFields {
  const out: UrlIngestFields = { ...primary };
  for (const key of Object.keys(extra) as IngestFieldId[]) {
    if (KEEP_HOME_FIELDS.has(key)) continue;
    const add = String(extra[key] || "").trim();
    if (!add) continue;
    if (String(out[key] || "").trim()) continue;
    out[key] = extra[key];
  }
  return out;
}

const CTA_HINT =
  /install|download|הורד|تنزيل|join|הצטרפ|انضم|contact|צור קשר|اتصل|whatsapp|וואטסאפ|واتساب|order|קנו|اشتري|book|הזמנ|احجز|call now|התקשרו|start with|התחל|browse all|shop|buy now|consult|ייעוץ|join free|הוספה לסל|add to cart/i;

function extractCtaTexts(html: string): string[] {
  const out: string[] = [];
  for (const m of html.matchAll(/<(?:a|button)\b[^>]*>([\s\S]*?)<\/(?:a|button)>/gi)) {
    const t = clip(decodeEntities((m[1] || "").replace(/<[^>]+>/g, " ")), 80);
    if (!t || t.length > 60 || t.length < 2) continue;
    if (/home|ראשי|الرئيسية|privacy|cookie|terms|תנאי|سياسة/i.test(t)) continue;
    if (!CTA_HINT.test(t)) continue;
    if (!out.includes(t)) out.push(t);
    if (out.length >= 8) break;
  }
  return out;
}

function extractSlogan(html: string): string {
  const tagged = html.match(
    /<(?:p|span|div|h2|h3)\b[^>]*(?:class|id)\s*=\s*["'][^"']*(?:slogan|tagline|motto|tag-line)[^"']*["'][^>]*>([\s\S]*?)<\/(?:p|span|div|h2|h3)>/i,
  );
  if (tagged) {
    const t = clip(decodeEntities((tagged[1] || "").replace(/<[^>]+>/g, " ")), 160);
    if (t.length >= 4 && t.length <= 120) return t;
  }
  return "";
}

function addressFromHtml(html: string): string {
  const m = html.match(/<address\b[^>]*>([\s\S]*?)<\/address>/i);
  if (!m) return "";
  return clip(decodeEntities((m[1] || "").replace(/<[^>]+>/g, " ")), 280);
}

function jsonLdImageUrls(nodes: Record<string, unknown>[]): string[] {
  const out: string[] = [];
  const take = (v: unknown) => {
    if (typeof v === "string" && /^https?:\/\//i.test(v)) {
      if (!out.includes(v)) out.push(v);
      return;
    }
    if (Array.isArray(v)) {
      for (const x of v) take(x);
      return;
    }
    if (v && typeof v === "object" && "url" in (v as object)) take((v as { url: unknown }).url);
  };
  for (const n of nodes) {
    take(n.image);
    take(n.logo);
    take(n.photo);
  }
  return out;
}

const TRACKER_IMG = /sprite|favicon|pixel|1x1|tracking|spacer|blank\.gif|data:image\/gif|gravatar|emoji|icon-?\d{2}|woocommerce-placeholder|spinner|loader/i;

function srcsetLargest(srcset: string, base: string): string {
  let best = "";
  let bestW = -1;
  for (const part of srcset.split(",")) {
    const bits = part.trim().split(/\s+/);
    const u = absHttpUrl(bits[0] || "", base);
    const w = Number((bits[1] || "").replace(/w$/i, "")) || 0;
    if (u && w >= bestW) {
      best = u;
      bestW = w;
    }
  }
  return best;
}

function imageRank(url: string): number {
  const u = url.toLowerCase();
  if (TRACKER_IMG.test(u)) return -1;
  if (/hero|og|cover|banner|gallery|product|sale|חיסול/i.test(u)) return 10;
  if (/logo|לוגו|شعار/i.test(u)) return 3;
  return 5;
}

/** og:image, JSON-LD image/logo, hero/product/gallery imgs. Skip 1px/icons <64px. Cap URL_MAX_IMAGES. */
export function collectPageImages(html: string, baseUrl: string, jsonLdNodes: Record<string, unknown>[] = []): string[] {
  const out: string[] = [];
  const push = (raw: string) => {
    const abs = absHttpUrl(raw, baseUrl);
    if (!abs || out.includes(abs)) return;
    if (TRACKER_IMG.test(abs)) return;
    out.push(abs);
  };
  for (const u of jsonLdImageUrls(jsonLdNodes)) push(u);
  for (const m of html.matchAll(/<img\b([^>]*)>/gi)) {
    const attrs = m[1] || "";
    const srcset = (attrs.match(/(?:srcset|data-srcset)\s*=\s*["']([^"']+)["']/i) || [])[1];
    const fromSet = srcset ? srcsetLargest(srcset, baseUrl) : "";
    const src = fromSet || (attrs.match(/(?:src|data-src|data-lazy-src|data-full-url)\s*=\s*["']([^"']+)["']/i) || [])[1];
    if (!src) continue;
    const blob = `${src} ${attrs}`;
    if (TRACKER_IMG.test(blob)) continue;
    const w = Number((attrs.match(/width\s*=\s*["']?(\d+)/i) || [])[1] || 0);
    const h = Number((attrs.match(/height\s*=\s*["']?(\d+)/i) || [])[1] || 0);
    if ((w > 0 && w < 64) || (h > 0 && h < 64)) continue;
    try {
      const u = new URL(src, baseUrl);
      const home = new URL(baseUrl);
      const same = stripZone(u.hostname).replace(/^www\./i, "") === stripZone(home.hostname).replace(/^www\./i, "");
      const hero = /logo|hero|product|banner|og|cover|gallery|sale|חיסול/i.test(blob);
      if (!same && !hero) continue;
    } catch {
      continue;
    }
    push(src);
    if (out.length >= URL_MAX_IMAGES) break;
  }
  out.sort((a, b) => imageRank(b) - imageRank(a));
  return out.slice(0, URL_MAX_IMAGES);
}


const PAGE_ADDRESS_HINT =
  /(?:מחלף|רחוב\s+\S|שדרות\s+\S|כביש\s*\d|الشارع|شارع\s+|مجمع|الطابق|קומה|בצד|بجانب|street|avenue|\bfloor\b)/i;

export function parseFetchedHtml(
  html: string,
  finalUrl: string,
  submittedUrl?: string,
  extraText = "",
): UrlIngestResult {
  const raw = String(html ?? "");
  if (!raw.trim() && !String(extraText || "").trim()) return { ok: false, error: "empty" };
  const title = tagText(raw, "title");
  const ogSiteName = metaContent(raw, "og:site_name");
  const ogTitle = metaContent(raw, "og:title") || metaContent(raw, "twitter:title");
  const ogDescription =
    metaContent(raw, "og:description") || metaContent(raw, "twitter:description") || metaContent(raw, "description");
  const ogImageRaw = metaContent(raw, "og:image") || metaContent(raw, "twitter:image");
  const ogImage = absHttpUrl(ogImageRaw, finalUrl) || undefined;
  const { nodes, sites, types } = parseJsonLd(raw);
  const labeled = labeledFromJsonLd(nodes);
  const telScan = raw + "\n" + String(extraText || "");
  const tels = [
    ...hrefs(raw, /href\s*=\s*["']tel:([^"']+)["']/gi),
    ...[...telScan.matchAll(/tel:(\+?\d[\d\-\s]{7,18})/gi)].map((m) => m[1] || ""),
  ]
    .map((t) => t.replace(/^\/\//, ""))
    .filter(Boolean);
  for (const t of tels) labeled.push(`טלפון: ${formatIlPhone(t) || t}`);
  const was = [
    ...hrefs(raw, /href\s*=\s*["']https?:\/\/wa\.me\/([^"'?]+)/gi),
    ...hrefs(raw, /href\s*=\s*["']https?:\/\/api\.whatsapp\.com\/send\?[^"']*phone=([^"'&]+)/gi),
    ...[...telScan.matchAll(/wa\.me\/(\+?\d{8,15})/gi)].map((m) => m[1] || ""),
  ].filter(Boolean);
  for (const w of was) labeled.push(`וואטסאפ: ${formatIlPhone(w) || w}`);
  const addr = addressFromHtml(raw);
  if (addr) labeled.push(`כתובת: ${addr}`);
  const footer = raw.match(/<footer\b[^>]*>([\s\S]*?)<\/footer>/i);
  if (footer?.[1]) {
    const foot = footer[1];
    for (const tel of hrefs(foot, /href\s*=\s*["']tel:([^"']+)["']/gi).map((x) => x.replace(/^\/\//, ""))) {
      labeled.push(`טלפון: ${tel}`);
    }
    const footWas = [
      ...hrefs(foot, /href\s*=\s*["']https?:\/\/wa\.me\/([^"'?]+)/gi),
      ...hrefs(foot, /href\s*=\s*["']https?:\/\/api\.whatsapp\.com\/send\?[^"']*phone=([^"'&]+)/gi),
    ];
    for (const w of footWas) labeled.push(`וואטסאפ: ${w}`);
    const footText = decodeEntities(foot.replace(/<[^>]+>/g, " ")).replace(/[ \t]+/g, " ");
    for (const line of footText.split(/\n/)) {
      const s = line.replace(/\s+/g, " ").trim();
      if (s.length < 8 || s.length > 280) continue;
      if (/אימייל|email|סיסמה|password/i.test(s)) continue;
      if (PAGE_ADDRESS_HINT.test(s)) {
        labeled.push(`כתובת: ${s}`);
        break;
      }
    }
    if (!labeled.some((l) => l.startsWith("כתובת:"))) {
      const m = footText.match(/מחלף כביש\s*\d+\s*,\s*באקה(?:\s+אלגרביה)?/);
      if (m) labeled.push(`כתובת: ${m[0].trim()}`);
    }
  }
  for (const cta of extractCtaTexts(raw)) labeled.push(`CTA: ${cta}`);
  const slogan = extractSlogan(raw);
  if (slogan) labeled.push(`slogan: ${slogan}`);
  if (ogDescription) labeled.push(`תיאור: ${clip(ogDescription, 500)}`);
  const visible = visibleText(raw);
  if (!addr) {
    for (const line of visible.split(/\n/)) {
      const s = line.replace(/\s+/g, " ").trim();
      if (s.length < 8 || s.length > 280) continue;
      if (/אימייל|email|סיסמה|password/i.test(s)) continue;
      if (PAGE_ADDRESS_HINT.test(s)) {
        labeled.push(`כתובת: ${s}`);
        break;
      }
    }
  }
  const h1 = tagText(raw, "h1");
  const h2s: string[] = [];
  for (const m of raw.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)) {
    const t = clip(decodeEntities((m[1] || "").replace(/<[^>]+>/g, " ")), 160);
    if (t && !h2s.includes(t)) h2s.push(t);
    if (h2s.length >= 4) break;
  }
  const headerP = firstHeaderOrSeoParagraph(raw);
  const extraBits = [ogDescription, headerP].filter((s, i, a) => s && a.indexOf(s) === i);
  const extraProse = extraBits.join("\n");
  const extraCorpus = String(extraText || "").trim();
  const blob = [...labeled, h1 && `H1: ${h1}`, ...h2s.map((t) => `H2: ${t}`), visible, extraCorpus].filter(Boolean).join("\n");
  if (!blob.trim() && !title && !ogTitle && !nodes.length) return { ok: false, error: "empty" };

  const file = filenameFromUrl(finalUrl);
  let fields = extractFieldsFromText(blob, file);

  const siteUrl = submittedUrl || finalUrl;
  if (/^https?:\/\//i.test(siteUrl)) fields.website = siteUrl.split("#")[0];

  const usableName = (v: string): boolean => {
    const s = clip(v, 120);
    return Boolean(s) && !isJunkUiText(s) && !isCatalogHeading(s);
  };
  if (!fields.businessName || !usableName(fields.businessName)) {
    const fromLd = jsonLdName(nodes);
    const fromSite = jsonLdSiteName(sites);
    const fromOgTitle = clip(ogTitle || "", 120);
    const fromOgShort = fromOgTitle.split(/\s+[-–—]\s+/)[0].trim();
    if (usableName(fromLd)) fields.businessName = clip(fromLd, 120);
    else if (usableName(ogSiteName)) fields.businessName = clip(ogSiteName, 120);
    else if (usableName(fromSite)) fields.businessName = clip(fromSite, 120);
    else if (usableName(fromOgShort)) fields.businessName = fromOgShort;
    else if (usableName(fromOgTitle)) fields.businessName = fromOgTitle;
    else if (usableName(title)) fields.businessName = clip(title, 120);
    else delete fields.businessName;
  }
  if (ogDescription) {
    const current = String(fields.description || "").trim();
    if (!current || current.length < 40) fields.description = clip(ogDescription, 500);
  }
  if (!fields.category) {
    const cat = jsonLdCategory(nodes);
    if (cat && !isJunkUiText(cat) && !isCatalogHeading(cat)) fields.category = cat;
  }
  fields = fillEmptyFromPageProse(fields, blob, extraProse);
  if (!fields.uniqueAdvantage || fields.uniqueAdvantage === fields.description) {
    const distinct = distinctPageAdvantage([ogDescription, extraProse, blob].filter(Boolean).join("\n"), fields.description || "");
    if (distinct) fields.uniqueAdvantage = distinct;
    else if (fields.uniqueAdvantage === fields.description) delete fields.uniqueAdvantage;
  }
  if (slogan && !fields.brandPositioning) fields.brandPositioning = clip(slogan, 160);
  if (ogDescription && fields.biggestProblem && !isJunkUiText(fields.biggestProblem || "")) {
    const splitAdv = advantageAfterQuestionSplit(fields.uniqueAdvantage, ogDescription, fields.biggestProblem);
    if (splitAdv && splitAdv !== fields.description && !/^[\s,،;:·]+/.test(splitAdv)) {
      fields.uniqueAdvantage = splitAdv;
    }
  }

  if (pageLooksLikeAd(finalUrl, blob)) {
    const adLines = [
      ogTitle || title ? `כותרת: ${ogTitle || title}` : "",
      ogDescription ? `גוף: ${ogDescription}` : "",
    ].filter(Boolean);
    if (adLines.length) {
      const again = extractFieldsFromText([...adLines, blob].join("\n"), file);
      if (again.pastHeadline) fields.pastHeadline = again.pastHeadline;
      if (again.pastBody) fields.pastBody = again.pastBody;
      if (again.pastCta) fields.pastCta = again.pastCta;
    }
  } else {
    delete fields.pastHeadline;
    delete fields.pastBody;
    delete fields.pastCta;
  }

  const text = clip([title && `title: ${title}`, ...labeled, visible, extraCorpus].filter(Boolean).join("\n"), URL_TEXT_CAP);
  if (!text.trim() && !Object.values(fields).some((v) => String(v || "").trim())) {
    return { ok: false, error: "empty" };
  }

  const pageImages = collectPageImages(raw, finalUrl, nodes);
  if (ogImage && !pageImages.includes(ogImage)) pageImages.unshift(ogImage);
  const logo = extractLogoUrl(raw, finalUrl) || undefined;
  const colors = extractCssColors(raw, 5);

  const out: UrlIngestOk = {
    ok: true,
    url: siteUrl.split("#")[0],
    title: title || ogTitle || "",
    text,
    fields,
  };
  if (ogImage) out.ogImage = ogImage;
  if (pageImages.length) out.images = pageImages.slice(0, URL_MAX_IMAGES);
  if (logo) out.logo = logo;
  if (colors.length) out.colors = colors;
  if (types.length) out.jsonLdHits = types;
  return out;
}

function isHtmlResponse(contentType: string | null, sniff: string): boolean {
  const ct = (contentType || "").toLowerCase();
  if (ct.includes("text/html") || ct.includes("application/xhtml+xml")) return true;
  if (!ct || ct.includes("text/plain") || ct.includes("application/octet-stream")) {
    const head = sniff.slice(0, 256).toLowerCase();
    return /<!doctype html|<html[\s>]/.test(head);
  }
  return false;
}

function isScriptResponse(contentType: string | null, sniff: string): boolean {
  const ct = (contentType || "").toLowerCase();
  if (ct.includes("javascript") || ct.includes("ecmascript")) return true;
  if (!ct || ct.includes("text/plain") || ct.includes("application/octet-stream")) {
    const head = sniff.slice(0, 256);
    return /(?:^|[;\s])(?:import |export |const |let |var |function |document\.)/.test(head) || head.includes("createElement");
  }
  return false;
}

function concatChunks(chunks: Uint8Array[], size: number): Uint8Array {
  const buf = new Uint8Array(size);
  let off = 0;
  for (const c of chunks) {
    buf.set(c, off);
    off += c.byteLength;
  }
  return buf;
}

function looksLikeHtmlPrefix(buf: Uint8Array): boolean {
  const head = new TextDecoder("utf-8", { fatal: false }).decode(buf.slice(0, 256)).toLowerCase();
  return /<!doctype html|<html[\s>]|<head[\s>]/.test(head);
}

/** Read up to `max` bytes then abort the stream and return what we have (parse, do not 413). */
async function readCapped(res: Response, max: number): Promise<{ ok: true; buf: Uint8Array } | UrlIngestErr> {
  if (!res.body) {
    const ab = await res.arrayBuffer();
    const src = new Uint8Array(ab);
    return { ok: true, buf: src.byteLength > max ? src.slice(0, max) : src };
  }
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  const finish = async (cancel: boolean) => {
    if (cancel) {
      try {
        await reader.cancel();
      } catch {
        /* ignore */
      }
    }
    return { ok: true as const, buf: concatChunks(chunks, size) };
  };
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      const room = max - size;
      if (value.byteLength >= room) {
        if (room > 0) {
          chunks.push(value.subarray(0, room));
          size += room;
        }
        return finish(true);
      }
      chunks.push(value);
      size += value.byteLength;
    }
  } catch (e) {
    const name = e instanceof Error ? e.name : "";
    if (size >= 2048 && looksLikeHtmlPrefix(concatChunks(chunks, size))) {
      return finish(true);
    }
    if (name === "TimeoutError" || name === "AbortError") return { ok: false, error: "timeout" };
    return { ok: false, error: "network" };
  }
  return finish(false);
}

function mergeAbortSignals(timeoutMs: number, extra?: AbortSignal): AbortSignal {
  const timeout = AbortSignal.timeout(timeoutMs);
  if (!extra) return timeout;
  if (typeof AbortSignal.any === "function") return AbortSignal.any([timeout, extra]);
  const c = new AbortController();
  const abort = () => {
    try {
      c.abort();
    } catch {
      /* ignore */
    }
  };
  if (timeout.aborted || extra.aborted) {
    abort();
    return c.signal;
  }
  timeout.addEventListener("abort", abort, { once: true });
  extra.addEventListener("abort", abort, { once: true });
  return c.signal;
}

async function fetchHtmlDocument(
  raw: string,
  extraBlockedHosts: string[] = [],
  opts: { timeoutMs?: number; signal?: AbortSignal; accept?: "html" | "script"; browserLike?: boolean } = {},
): Promise<{ ok: true; html: string; finalUrl: string } | UrlIngestErr> {
  const submitted = String(raw ?? "").trim();
  let current: URL;
  const first = await assertSafeUrl(submitted, extraBlockedHosts);
  if (!first.ok) return first;
  current = first.url;
  const timeoutMs = opts.timeoutMs ?? URL_FETCH_TIMEOUT_MS;

  let res: Response | undefined;
  try {
    for (let hop = 0; hop <= URL_MAX_REDIRECTS; hop++) {
      if (opts.signal?.aborted) return { ok: false, error: "timeout" };
      const safe = hop === 0 ? first : await assertSafeUrl(current.href, extraBlockedHosts);
      if (!safe.ok) return safe;
      current = safe.url;
      try {
        res = await fetch(current.href, {
          method: "GET",
          redirect: "manual",
          signal: mergeAbortSignals(timeoutMs, opts.signal),
          headers: {
            Accept:
              opts.accept === "script"
                ? "application/javascript,text/javascript,*/*;q=0.1"
                : "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
            "User-Agent": opts.browserLike
              ? SOCIAL_BROWSER_UA
              : "Mozilla/5.0 (compatible; SAWEK-AD-Ingest/0.1)",
            ...(opts.browserLike ? { "Accept-Language": "he-IL,he;q=0.9,ar;q=0.8,en-US;q=0.7,en;q=0.6" } : {}),
          },
        });
      } catch (e) {
        const name = e instanceof Error ? e.name : "";
        if (name === "TimeoutError" || name === "AbortError") return { ok: false, error: "timeout" };
        return { ok: false, error: "network" };
      }
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get("location");
        if (!loc) return { ok: false, error: "network" };
        if (hop === URL_MAX_REDIRECTS) return { ok: false, error: "network" };
        let next: URL;
        try {
          next = new URL(loc, current.href);
        } catch {
          return { ok: false, error: "invalid_url" };
        }
        current = next;
        continue;
      }
      break;
    }
  } catch (e) {
    const name = e instanceof Error ? e.name : "";
    if (name === "TimeoutError" || name === "AbortError") return { ok: false, error: "timeout" };
    return { ok: false, error: "network" };
  }

  if (!res) return { ok: false, error: "network" };
  if (!res.ok) return { ok: false, error: "network" };

  const capped = await readCapped(res, URL_PARSE_BODY_CAP);
  if (!capped.ok) return capped;
  const sniff = new TextDecoder("utf-8", { fatal: false }).decode(capped.buf.slice(0, 512));
  const ct = res.headers.get("content-type");
  if (opts.accept === "script") {
    if (!isScriptResponse(ct, sniff) && !isHtmlResponse(ct, sniff)) return { ok: false, error: "non_html" };
  } else if (!isHtmlResponse(ct, sniff)) {
    return { ok: false, error: "non_html" };
  }
  const html = new TextDecoder("utf-8", { fatal: false }).decode(capped.buf);
  return { ok: true, html, finalUrl: current.href };
}

async function fetchExtraPages(
  urls: string[],
  extraBlockedHosts: string[],
): Promise<UrlIngestOk[]> {
  if (!urls.length) return [];
  const extras: UrlIngestOk[] = [];
  const budget = AbortSignal.timeout(URL_EXTRA_PAGES_BUDGET_MS);
  await Promise.allSettled(
    urls.map(async (href) => {
      if (budget.aborted) return;
      const doc = await fetchHtmlDocument(href, extraBlockedHosts, {
        timeoutMs: URL_FETCH_TIMEOUT_MS,
        signal: budget,
      });
      if (!doc.ok) return;
      const page = parseFetchedHtml(doc.html, doc.finalUrl, doc.finalUrl);
      if (page.ok) extras.push(page);
    }),
  );
  return extras;
}

function mergeUrlIngestResults(home: UrlIngestOk, extras: UrlIngestOk[]): UrlIngestOk {
  let fields: UrlIngestFields = { ...home.fields };
  for (const ex of extras) {
    fields = mergeExtractedFields(fields, ex.fields);
  }
  if (home.fields.website) fields.website = home.fields.website;
  if (home.fields.businessName) fields.businessName = home.fields.businessName;
  const text = clip([home.text, ...extras.map((e) => e.text)].filter(Boolean).join("\n"), URL_TEXT_CAP);
  const fromAll = extractFieldsFromText(text, filenameFromUrl(home.url));
  fields = mergeExtractedFields(fields, fromAll);
  fields = fillEmptyFromPageProse(fields, text);
  if (home.fields.website) fields.website = home.fields.website;
  if (home.fields.businessName) fields.businessName = home.fields.businessName;
  const ogImage = home.ogImage || extras.find((e) => e.ogImage)?.ogImage;
  const images: string[] = [...(home.images ?? [])];
  for (const e of extras) {
    for (const u of e.images ?? []) {
      if (!images.includes(u)) images.push(u);
    }
  }
  if (ogImage && !images.includes(ogImage)) images.unshift(ogImage);
  const jsonLdHits: string[] = [...(home.jsonLdHits ?? [])];
  for (const e of extras) {
    for (const t of e.jsonLdHits ?? []) {
      if (!jsonLdHits.includes(t)) jsonLdHits.push(t);
    }
  }
  const colors: string[] = [...(home.colors ?? [])];
  for (const e of extras) {
    for (const c of e.colors ?? []) {
      if (!colors.includes(c)) colors.push(c);
    }
  }
  const logo = home.logo || extras.find((e) => e.logo)?.logo;
  const out: UrlIngestOk = { ...home, fields, text };
  if (ogImage) out.ogImage = ogImage;
  if (images.length) out.images = images.slice(0, URL_MAX_IMAGES);
  if (logo) out.logo = logo;
  if (colors.length) out.colors = colors.slice(0, 5);
  if (jsonLdHits.length) out.jsonLdHits = jsonLdHits;
  return out;
}

async function fetchScriptCorpus(urls: string[], extraBlockedHosts: string[]): Promise<string> {
  if (!urls.length) return "";
  const budget = AbortSignal.timeout(URL_EXTRA_PAGES_BUDGET_MS);
  const parts: string[] = [];
  await Promise.allSettled(
    urls.map(async (href) => {
      if (budget.aborted) return;
      const doc = await fetchHtmlDocument(href, extraBlockedHosts, {
        timeoutMs: URL_FETCH_TIMEOUT_MS,
        signal: budget,
        accept: "script",
      });
      if (!doc.ok) return;
      const corpus = extractScriptBundleText(doc.html);
      if (corpus) parts.push(corpus);
    }),
  );
  return clipPreserveNewlines(parts.join("\n"), URL_TEXT_CAP);
}

function applySocialOntoParsed(
  parsed: UrlIngestOk,
  social: SocialPageParse,
  submitted: string,
  kind: SocialKind,
): UrlIngestOk {
  const fields: UrlIngestFields = { ...parsed.fields };
  if (social.name && (!fields.businessName || isJunkUiText(fields.businessName) || /^(facebook|instagram)$/i.test(fields.businessName))) {
    fields.businessName = clip(social.name, 120);
  }
  if (social.description && (!fields.description || fields.description.length < social.description.length)) {
    fields.description = clip(social.description, 500);
  }
  if (social.address && !fields.location) fields.location = clip(social.address, 280);
  if (social.phone && !fields.whatsapp) fields.whatsapp = social.phone;
  if (social.whatsapp && !fields.whatsapp) fields.whatsapp = social.whatsapp;
  if (social.hours && !fields.clinicHours) fields.clinicHours = clip(social.hours, 280);
  if (/^https?:\/\//i.test(submitted)) fields.website = submitted.split("#")[0];
  if (!fields.channelNotes) fields.channelNotes = kind;
  delete fields.pastHeadline;
  delete fields.pastBody;
  delete fields.pastCta;

  const images: string[] = [...(parsed.images ?? [])];
  const logo = social.ogImage || parsed.logo || parsed.ogImage;
  if (social.ogImage && !images.includes(social.ogImage)) images.unshift(social.ogImage);
  if (social.coverImage && !images.includes(social.coverImage)) images.push(social.coverImage);
  for (const p of social.posts) {
    if (p.image && !images.includes(p.image)) images.push(p.image);
  }
  const text = clip(
    [parsed.text, social.description, ...social.posts.map((p) => p.text)].filter(Boolean).join("\n"),
    URL_TEXT_CAP,
  );
  const out: UrlIngestOk = {
    ...parsed,
    url: submitted.split("#")[0],
    title: social.title || parsed.title,
    text,
    fields,
    sourceKind: kind,
    posts: social.posts,
  };
  if (logo) {
    out.logo = logo;
    out.ogImage = parsed.ogImage || social.ogImage;
  } else if (social.ogImage) {
    out.ogImage = social.ogImage;
  }
  if (images.length) out.images = images.slice(0, URL_MAX_IMAGES);
  return out;
}

function socialParseToIngest(social: SocialPageParse, submitted: string, kind: SocialKind): UrlIngestOk {
  const fields: UrlIngestFields = {};
  if (social.name) fields.businessName = clip(social.name, 120);
  if (social.description) fields.description = clip(social.description, 500);
  if (social.address) fields.location = clip(social.address, 280);
  if (social.phone) fields.whatsapp = social.phone;
  else if (social.whatsapp) fields.whatsapp = social.whatsapp;
  if (social.hours) fields.clinicHours = clip(social.hours, 280);
  fields.website = submitted.split("#")[0];
  fields.channelNotes = kind;
  const images: string[] = [];
  if (social.ogImage) images.push(social.ogImage);
  if (social.coverImage && !images.includes(social.coverImage)) images.push(social.coverImage);
  for (const p of social.posts) {
    if (p.image && !images.includes(p.image)) images.push(p.image);
  }
  const text = clip([social.description, ...social.posts.map((p) => p.text)].filter(Boolean).join("\n"), URL_TEXT_CAP);
  const out: UrlIngestOk = {
    ok: true,
    url: submitted.split("#")[0],
    title: social.title || social.name,
    text,
    fields,
    sourceKind: kind,
    posts: social.posts,
  };
  if (social.ogImage) {
    out.ogImage = social.ogImage;
    out.logo = social.ogImage;
  }
  if (images.length) out.images = images.slice(0, URL_MAX_IMAGES);
  return out;
}

async function fetchSocialDoc(
  href: string,
  extraBlockedHosts: string[],
): Promise<{ ok: true; html: string; finalUrl: string } | UrlIngestErr> {
  return fetchHtmlDocument(href, extraBlockedHosts, {
    timeoutMs: URL_HOMEPAGE_TIMEOUT_MS,
    browserLike: true,
  });
}

async function ingestSocialUrl(
  submitted: string,
  extraBlockedHosts: string[],
  kind: SocialKind,
  parsedUrl: URL,
): Promise<UrlIngestResult> {
  const targets: string[] = [];
  if (kind === "facebook") {
    const mbasic = facebookMbasicUrl(parsedUrl).href;
    targets.push(mbasic);
    if (parsedUrl.hostname.replace(/^www\./i, "").toLowerCase() !== "mbasic.facebook.com") {
      targets.push(parsedUrl.href);
    }
  } else {
    targets.push(parsedUrl.href);
  }

  const docs: { html: string; finalUrl: string }[] = [];
  const errors: UrlIngestErr[] = [];
  await Promise.allSettled(
    targets.map(async (href, idx) => {
      const doc = await fetchSocialDoc(href, extraBlockedHosts);
      if (doc.ok) docs[idx] = doc;
      else errors.push(doc);
    }),
  );
  const fetched = docs.filter(Boolean);

  if (kind === "facebook" && fetched[0]) {
    try {
      const aboutHref = facebookAboutUrl(new URL(fetched[0].finalUrl));
      if (aboutHref !== fetched[0].finalUrl) {
        const about = await fetchSocialDoc(aboutHref, extraBlockedHosts);
        if (about.ok) fetched.push(about);
      }
    } catch {
      /* ignore */
    }
  }

  if (!fetched.length) {
    const wall = errors.find((e) => e.error === "empty");
    return wall ?? errors[0] ?? { ok: false, error: "network" };
  }

  let social: SocialPageParse | undefined;
  for (const doc of fetched) {
    const parsed = parseSocialPage(doc.html, doc.finalUrl, kind);
    social = social ? mergeSocialParses(social, parsed) : parsed;
  }
  if (!social) return { ok: false, error: "empty" };

  const allWalls = fetched.every((d) => parseSocialPage(d.html, d.finalUrl, kind).loginWall) && !social.name;
  if (allWalls) return { ok: false, error: "social_login_wall" };

  const htmlDoc = fetched[0];
  const page = parseFetchedHtml(htmlDoc.html, htmlDoc.finalUrl, submitted);
  const merged = page.ok
    ? applySocialOntoParsed(page, social, submitted, kind)
    : socialParseToIngest(social, submitted, kind);
  if (!merged.fields.businessName && !merged.fields.description && !(merged.posts && merged.posts.length)) {
    return { ok: false, error: social.loginWall ? "social_login_wall" : "empty" };
  }
  return merged;
}

export async function ingestUrl(raw: string, extraBlockedHosts: string[] = []): Promise<UrlIngestResult> {
  const submitted = String(raw ?? "").trim().split("#")[0];
  const inspected = inspectUrl(submitted, extraBlockedHosts);
  if (!inspected.ok) return inspected;
  const kind = detectSocialKind(inspected.url);
  if (kind) return ingestSocialUrl(submitted, extraBlockedHosts, kind, inspected.url);

  const homeDoc = await fetchHtmlDocument(submitted, extraBlockedHosts, {
    timeoutMs: URL_HOMEPAGE_TIMEOUT_MS,
  });
  if (!homeDoc.ok) return homeDoc;

  let extraCorpus = "";
  try {
    const scriptUrls = collectSameOriginScriptUrls(homeDoc.html, homeDoc.finalUrl, 2);
    extraCorpus = await fetchScriptCorpus(scriptUrls, extraBlockedHosts);
  } catch {
    extraCorpus = "";
  }

  const parsed = parseFetchedHtml(homeDoc.html, homeDoc.finalUrl, submitted, extraCorpus);
  if (!parsed.ok) return parsed;

  const navUrls = collectSameOriginNavUrls(homeDoc.html, homeDoc.finalUrl, URL_MAX_EXTRA_PAGES);
  if (!navUrls.length) return parsed;

  try {
    const extras = await fetchExtraPages(navUrls, extraBlockedHosts);
    if (!extras.length) return parsed;
    return mergeUrlIngestResults(parsed, extras);
  } catch {
    return parsed;
  }
}
