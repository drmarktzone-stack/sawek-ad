/** Public site identity — used by SEO, legal pages, and optional analytics. */

export const SITE_NAME = "SAWEK AD";
export const CONTACT_EMAIL = "drmarktzone@gmail.com";
export const DEFAULT_SITE_URL = "https://sawek-ad-308665814452.me-west1.run.app";
export const OG_IMAGE_PATH = "/og.png";

export const DEFAULT_TITLE = "SAWEK AD — سوِّق إعلانك بنفسك / סאווק";
export const DEFAULT_DESCRIPTION =
  "SAWEK AD: paste a business website, get finished ads for Facebook, Instagram, TikTok and WhatsApp in Hebrew and Arabic, plus a landing page and download. No invented ROAS.";

export function siteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.APP_BASE_URL ||
    DEFAULT_SITE_URL;
  return String(raw).trim().replace(/\/$/, "") || DEFAULT_SITE_URL;
}

export function absoluteUrl(path = "/"): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${siteUrl()}${p === "/" ? "/" : p}`;
}
