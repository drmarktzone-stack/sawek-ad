import type { Locale } from "./types";

export const LANG_PARAM = "lang";

export function parseLocale(v: string | null | undefined): Locale | null {
  if (v === "he" || v === "ar" || v === "en") return v;
  return null;
}

/** Read `?lang=` (and a `lang=` pair inside the hash, if present). */
export function readLocaleFromLocation(): Locale | null {
  if (typeof window === "undefined") return null;
  try {
    const url = new URL(window.location.href);
    const fromQuery = parseLocale(url.searchParams.get(LANG_PARAM));
    if (fromQuery) return fromQuery;
    const hash = url.hash.replace(/^#/, "");
    if (hash.includes("=")) {
      const fromHash = parseLocale(new URLSearchParams(hash).get(LANG_PARAM));
      if (fromHash) return fromHash;
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** Keep the current path, other query params, and hash; set `lang`. */
export function writeLocaleToLocation(locale: Locale) {
  if (typeof window === "undefined") return;
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get(LANG_PARAM) === locale) return;
    url.searchParams.set(LANG_PARAM, locale);
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  } catch {
    /* ignore */
  }
}

export function withLang(href: string, locale: Locale): string {
  if (!href || href.startsWith("http") || href.startsWith("mailto:") || href.startsWith("tel:")) {
    return href;
  }
  const hashIdx = href.indexOf("#");
  const hash = hashIdx >= 0 ? href.slice(hashIdx) : "";
  const withoutHash = hashIdx >= 0 ? href.slice(0, hashIdx) : href;
  if (!withoutHash) return hash;
  const qIdx = withoutHash.indexOf("?");
  const path = qIdx >= 0 ? withoutHash.slice(0, qIdx) : withoutHash;
  const query = qIdx >= 0 ? withoutHash.slice(qIdx + 1) : "";
  const params = new URLSearchParams(query);
  params.set(LANG_PARAM, locale);
  return `${path}?${params.toString()}${hash}`;
}

export function stripDemoParamsPreserveLang(locale: Locale): string {
  if (typeof window === "undefined") return withLang("/", locale);
  const url = new URL(window.location.href);
  url.searchParams.delete("demo");
  url.searchParams.delete("empty");
  url.searchParams.set(LANG_PARAM, locale);
  return url.pathname + url.search + url.hash;
}
