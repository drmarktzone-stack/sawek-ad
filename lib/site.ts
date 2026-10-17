/** Public site identity — used by SEO, legal pages, and optional analytics. */

export const SITE_NAME = "SAWEK AD";
export const CONTACT_EMAIL = "drmarktzone@gmail.com";
/** Used when no public host is configured (local `npm run dev`). Not a Cloud Run URL. */
export const DEFAULT_SITE_URL = "http://127.0.0.1:43147";
export const OG_IMAGE_PATH = "/og.png";

export const DEFAULT_TITLE = "SAWEK AD — سوِّق إعلانك بنفسك / סאווק";
export const DEFAULT_DESCRIPTION =
  "SAWEK AD: paste a business website, get finished ads for Facebook, Instagram, TikTok and WhatsApp in Hebrew and Arabic, plus a landing page and download. No invented ROAS.";

export function siteUrl(): string {
  const explicit = String(process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_BASE_URL || "")
    .trim()
    .replace(/\/$/, "");
  if (explicit) return explicit;
  const vercel = String(process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL || "")
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");
  if (vercel) return `https://${vercel}`;
  return DEFAULT_SITE_URL;
}

export function absoluteUrl(path = "/"): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${siteUrl()}${p === "/" ? "/" : p}`;
}
