/**
 * Content extraction + classification + business identity.
 * DOM/semantic regions (nav/header/footer/main/json-ld/og) are first-class evidence.
 */
import type { BusinessIdentity, ContentClass, ContentUnit, PageRegion, SourceType } from "./types";
import {
  ACCOUNT_PATH_RE,
  DEMO_GENERATED_RE,
  EDITORIAL_PATH_RE,
  GENERIC_HYPE_RE,
  REVIEW_PATH_RE,
  REVIEW_TEXT_RE,
  THIRD_PARTY_HOST_RE,
  WIDGET_HINT_RE,
  identityTokens,
  isContactFact,
  isEcommerceChromeText,
  isExplicitAudienceStatement,
  isPainStatement,
  isUiChromeText,
  splitSentences,
  tokenOverlap,
} from "./patterns";

function clip(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim();
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

function stripTags(html: string): string {
  return clip(
    decodeEntities(
      html
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " "),
    ),
    2000,
  );
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

function tagInner(html: string, tag: string): string {
  const m = html.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return m?.[1] || "";
}

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "";
  }
}

function pathOf(url: string): string {
  try {
    return new URL(url).pathname || "/";
  } catch {
    return "/";
  }
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

function jsonLdAddressText(n: Record<string, unknown>): string {
  const a = n.address;
  if (typeof a === "string") return clip(a, 280);
  if (a && typeof a === "object") {
    const o = a as Record<string, unknown>;
    const parts = [o.streetAddress, o.addressLocality, o.addressRegion, o.postalCode]
      .map((x) => (typeof x === "string" ? x.trim() : ""))
      .filter(Boolean);
    return clip(parts.join(", "), 280);
  }
  return "";
}

function jsonLdHoursText(n: Record<string, unknown>): string {
  const h = n.openingHours;
  if (typeof h === "string") return clip(h, 280);
  if (Array.isArray(h)) return clip(h.map((x) => (typeof x === "string" ? x : "")).filter(Boolean).join(" · "), 280);
  return "";
}

function asName(v: unknown): string {
  if (typeof v === "string") return clip(v, 160);
  if (v && typeof v === "object" && "name" in (v as object)) return asName((v as { name: unknown }).name);
  return "";
}

function walkJsonLd(node: unknown, hits: Record<string, unknown>[]): void {
  if (!node) return;
  if (Array.isArray(node)) {
    for (const x of node) walkJsonLd(x, hits);
    return;
  }
  if (typeof node !== "object") return;
  const o = node as Record<string, unknown>;
  if (o["@graph"]) walkJsonLd(o["@graph"], hits);
  if (o["@type"]) hits.push(o);
}

export function parseJsonLdNodes(html: string): Record<string, unknown>[] {
  const hits: Record<string, unknown>[] = [];
  const re = /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const m of html.matchAll(re)) {
    const raw = decodeEntities(m[1] || "").trim();
    if (!raw) continue;
    try {
      walkJsonLd(JSON.parse(raw), hits);
    } catch {
      /* ignore */
    }
  }
  return hits;
}

function pushUnit(
  units: ContentUnit[],
  text: string,
  region: PageRegion,
  sourceType: SourceType,
  hint?: string,
  url?: string,
): void {
  const t = clip(text, 500);
  if (!t || t.length < 2) return;
  if (units.some((u) => u.text === t && u.region === region && u.sourceType === sourceType)) return;
  units.push({
    id: `u${units.length}`,
    text: t,
    region,
    sourceType,
    contentClass: "UNKNOWN",
    semanticHint: hint,
    url,
    identityBound: false,
  });
}

function regionFromHint(hint: string): PageRegion {
  const h = hint.toLowerCase();
  if (h.includes("nav")) return "nav";
  if (h.includes("header")) return "header";
  if (h.includes("footer")) return "footer";
  if (h.includes("article") || h.includes("blog")) return "article";
  if (h.includes("aside") || h.includes("related") || h.includes("recommend")) return "aside";
  if (h.includes("iframe")) return "iframe";
  if (h.includes("form")) return "form";
  if (h.includes("main")) return "main";
  return "unknown";
}

/** Extract labeled page regions + metadata as content units (unclassified). */
export function extractContentUnits(html: string, pageUrl: string, extraText = ""): ContentUnit[] {
  const units: ContentUnit[] = [];
  const raw = String(html || "");

  const title = stripTags(tagInner(raw, "title"));
  if (title) pushUnit(units, title, "head", "meta", "title", pageUrl);
  const ogSite = metaContent(raw, "og:site_name");
  if (ogSite) pushUnit(units, ogSite, "head", "og", "og:site_name", pageUrl);
  const ogTitle = metaContent(raw, "og:title");
  if (ogTitle) pushUnit(units, ogTitle, "head", "og", "og:title", pageUrl);
  const ogDesc = metaContent(raw, "og:description") || metaContent(raw, "description");
  if (ogDesc) {
    for (const s of splitSentences(ogDesc)) {
      pushUnit(units, s, "head", "og", "og:description", pageUrl);
    }
  }

  for (const n of parseJsonLdNodes(raw)) {
    const types = schemaTypes(n["@type"]);
    const name = asName(n.name);
    const desc = asName(n.description);
    const tel = asName(n.telephone);
    const addr = jsonLdAddressText(n);
    const hours = jsonLdHoursText(n);
    const blob = [name, desc, tel, addr, hours].filter(Boolean).join(" · ");
    if (blob) pushUnit(units, clip(blob, 400), "head", "jsonld", types.join(",") || "jsonld", pageUrl);
    if (name) pushUnit(units, name, "head", "jsonld", `org:${name}|name`, pageUrl);
    if (tel) pushUnit(units, `טלפון: ${tel}`, "head", "jsonld", `org:${name}|telephone`, pageUrl);
    if (addr) pushUnit(units, `כתובת: ${addr}`, "head", "jsonld", `org:${name}|address`, pageUrl);
    if (hours) pushUnit(units, `שעות: ${hours}`, "head", "jsonld", `org:${name}|hours`, pageUrl);
    if (desc) {
      for (const s of splitSentences(desc)) {
        pushUnit(units, s, "head", "jsonld", `org:${name}|desc`, pageUrl);
      }
    }
  }

  const takeTagged = (tag: string, region: PageRegion, source: SourceType) => {
    for (const m of raw.matchAll(new RegExp(`<${tag}\\b([^>]*)>([\\s\\S]*?)</${tag}>`, "gi"))) {
      const attrs = m[1] || "";
      const inner = m[2] || "";
      const hint = `${tag} ${attrs}`.slice(0, 180);
      const text = stripTags(inner);
      if (!text) continue;
      if (tag === "nav" || region === "nav") {
        for (const s of splitSentences(text)) pushUnit(units, s, "nav", "nav", hint, pageUrl);
        continue;
      }
      for (const s of splitSentences(text)) {
        pushUnit(units, s, region, source, hint, pageUrl);
      }
    }
  };

  takeTagged("nav", "nav", "nav");
  takeTagged("header", "header", "header");
  takeTagged("footer", "footer", "footer");
  takeTagged("article", "article", "article");
  takeTagged("aside", "aside", "aside");
  takeTagged("main", "main", "main");

  for (const m of raw.matchAll(/<(h[1-3])\b[^>]*>([\s\S]*?)<\/h[1-3]>/gi)) {
    const t = stripTags(m[2] || "");
    if (t) pushUnit(units, t, "main", "heading", m[1], pageUrl);
  }

  for (const m of raw.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)) {
    const t = stripTags(m[1] || "");
    if (t) pushUnit(units, t, "main", "visible", "p", pageUrl);
  }
  for (const m of raw.matchAll(/<address\b[^>]*>([\s\S]*?)<\/address>/gi)) {
    const t = stripTags(m[1] || "");
    if (t) pushUnit(units, t, "main", "visible", "address", pageUrl);
  }
  for (const m of raw.matchAll(
    /<(?:div|section|p|span)\b([^>]*class\s*=\s*["'][^"']*(?:banner|promo|offer|sale|tagline|slogan)[^"']*["'][^>]*)>([\s\S]*?)<\/(?:div|section|p|span)>/gi,
  )) {
    const t = stripTags(m[2] || "");
    const attrs = m[1] || "";
    if (t) pushUnit(units, t, /header/i.test(attrs) ? "header" : "main", "visible", attrs.slice(0, 120), pageUrl);
  }

  for (const m of raw.matchAll(/<(?:div|section|form|ul)\b([^>]*)>([\s\S]*?)<\/(?:div|section|form|ul)>/gi)) {
    const attrs = (m[1] || "").slice(0, 240);
    if (!WIDGET_HINT_RE.test(attrs) && !/role\s*=\s*["']navigation["']/i.test(attrs)) continue;
    const text = stripTags(m[2] || "");
    const region = /role\s*=\s*["']navigation["']/i.test(attrs) ? "nav" : regionFromHint(attrs);
    const source: SourceType = region === "nav" ? "nav" : "widget";
    for (const s of splitSentences(text)) pushUnit(units, s, region, source, attrs, pageUrl);
    if (units.length > 220) break;
  }

  for (const m of raw.matchAll(/<iframe\b([^>]*)>/gi)) {
    const attrs = m[1] || "";
    const src = (attrs.match(/src\s*=\s*["']([^"']+)["']/i) || [])[1] || "";
    pushUnit(units, src || "iframe", "iframe", "iframe", attrs.slice(0, 120), src || pageUrl);
  }

  if (extraText.trim()) {
    for (const s of splitSentences(extraText).slice(0, 80)) {
      pushUnit(units, s, "unknown", "script", "bundle", pageUrl);
    }
  }

  return units.slice(0, 280);
}

export function buildBusinessIdentity(
  units: ContentUnit[],
  pageUrl: string,
  fallbackName = "",
): BusinessIdentity {
  const domain = domainOf(pageUrl);
  const ogName =
    units.find((u) => u.semanticHint === "og:site_name")?.text ||
    units.find((u) => u.sourceType === "heading" && /^h1$/i.test(u.semanticHint || ""))?.text ||
    fallbackName;
  const jsonNames = units
    .filter((u) => u.sourceType === "jsonld" && /^name:/i.test(u.semanticHint || ""))
    .map((u) => u.text);
  let name = clip(ogName || "", 120);
  let best = name ? 40 : 0;
  for (const n of jsonNames) {
    const score = (name ? tokenOverlap(n, name) * 30 : 0) + Math.min(n.length, 40);
    if (tokenOverlap(n, name || n) >= 1 && score > best) {
      best = score;
      name = n;
    }
  }
  if (!name) name = clip(jsonNames[0] || domain.split(".")[0] || "", 80);
  const tokens = identityTokens(`${name} ${domain.replace(/\./g, " ")}`);
  const orgTypes = [
    ...new Set(
      units
        .filter((u) => u.sourceType === "jsonld" && u.semanticHint && !u.semanticHint.startsWith("name:"))
        .flatMap((u) => (u.semanticHint || "").split(",").map((s) => s.trim()).filter(Boolean)),
    ),
  ];
  return {
    name,
    domain,
    canonicalUrl: pageUrl,
    orgTypes,
    tokens,
    locationHints: [],
  };
}

function jsonLdOrgName(hint: string): string {
  const m = String(hint || "").match(/^org:([^|]+)/i);
  return (m?.[1] || "").trim();
}

function jsonLdUnmatched(unit: ContentUnit, identity: BusinessIdentity): boolean {
  if (unit.sourceType !== "jsonld") return false;
  if (!identity.name) return false;
  const org = jsonLdOrgName(unit.semanticHint || "");
  const probe = org || (unit.text.split(" · ")[0] || unit.text);
  if (identityTokens(probe).length < 1) return false;
  return tokenOverlap(probe, identity.name) < 1 && tokenOverlap(unit.text, identity.name) < 1;
}

export function classifyUnit(unit: ContentUnit, identity: BusinessIdentity, pageUrl: string): ContentClass {
  const t = unit.text;
  const path = pathOf(pageUrl);
  const hint = `${unit.semanticHint || ""} ${unit.url || ""}`;

  if (DEMO_GENERATED_RE.test(t)) return "GENERATED_DEMO";
  if (unit.region === "iframe" || unit.sourceType === "iframe" || THIRD_PARTY_HOST_RE.test(hint)) return "THIRD_PARTY";
  if (EDITORIAL_PATH_RE.test(path) || unit.region === "article") return "BLOG_EDITORIAL";
  if (REVIEW_PATH_RE.test(path) || REVIEW_TEXT_RE.test(t) && unit.sourceType === "widget") return "REVIEWS";
  if (ACCOUNT_PATH_RE.test(path)) return "PAGE_CHROME";
  if (jsonLdUnmatched(unit, identity)) return "THIRD_PARTY";
  if (unit.region === "nav" || unit.sourceType === "nav") return "NAV_UI";
  if (unit.sourceType === "widget" && WIDGET_HINT_RE.test(hint)) return "PAGE_CHROME";
  if (isUiChromeText(t)) return "NAV_UI";
  if (isEcommerceChromeText(t)) return "PAGE_CHROME";
  if (unit.region === "footer" || unit.sourceType === "footer") {
    return isContactFact(t) ? "BUSINESS_FACTS" : "PAGE_CHROME";
  }
  if (unit.region === "aside") return "PAGE_CHROME";
  if (GENERIC_HYPE_RE.test(t) && unit.region !== "main" && unit.sourceType !== "jsonld") return "GENERIC";
  if (unit.sourceType === "jsonld" || unit.sourceType === "og" || unit.sourceType === "heading") {
    if (isEcommerceChromeText(t) || isUiChromeText(t)) return "PAGE_CHROME";
    if (isPainStatement(t) || isExplicitAudienceStatement(t) || tokenOverlap(t, identity.name) >= 1) {
      return "BUSINESS_FACTS";
    }
    if (unit.sourceType === "heading") return "BUSINESS_FACTS";
    if (unit.sourceType === "og" && !isEcommerceChromeText(t) && !isUiChromeText(t)) {
      // Incidental demographic / hype in OG is GENERIC, not a fact.
      if (/parents love|women'?s health|parent organization/i.test(t) && !isExplicitAudienceStatement(t) && !isPainStatement(t)) {
        return "GENERIC";
      }
      return "BUSINESS_FACTS";
    }
    return "BUSINESS_FACTS";
  }
  if (unit.region === "main" || unit.sourceType === "main") return "BUSINESS_FACTS";
  if (unit.region === "header") {
    if (isEcommerceChromeText(t) || isUiChromeText(t)) return "PAGE_CHROME";
    if (tokenOverlap(t, identity.name) >= 1) return "BUSINESS_FACTS";
    return "PAGE_CHROME";
  }
  if (unit.sourceType === "script") {
    return isContactFact(t) || tokenOverlap(t, identity.name) >= 1 ? "BUSINESS_FACTS" : "GENERIC";
  }
  return "UNKNOWN";
}

export function classifyUnits(units: ContentUnit[], identity: BusinessIdentity, pageUrl: string): ContentUnit[] {
  return units.map((u) => {
    const contentClass = classifyUnit(u, identity, pageUrl);
    const identityBound =
      contentClass === "BUSINESS_FACTS" &&
      (u.sourceType === "jsonld" || u.sourceType === "og" || tokenOverlap(u.text, identity.name) >= 1 || isContactFact(u.text));
    return { ...u, contentClass, identityBound };
  });
}

export function businessCorpus(units: ContentUnit[]): string {
  return units
    .filter((u) => u.contentClass === "BUSINESS_FACTS")
    .map((u) => {
      if (u.sourceType === "heading") {
        const tag = (u.semanticHint || "h2").toUpperCase();
        return `${tag}: ${u.text}`;
      }
      if (u.sourceType === "og" && u.semanticHint === "og:description") return `תיאור: ${u.text}`;
      if (u.sourceType === "jsonld" && /\|name$/i.test(u.semanticHint || "")) return `שם העסק: ${u.text}`;
      if (u.sourceType === "jsonld" && /\|(?:telephone|address|hours)$/i.test(u.semanticHint || "")) return u.text;
      return u.text;
    })
    .join("\n");
}

export function rawScanText(units: ContentUnit[]): string {
  return units.map((u) => u.text).join("\n");
}
