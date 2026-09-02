import type { ClientBrandKit, Intake, Locale, MediaAssetMeta } from "./types";
import { stylesForVertical, CLINIC_POSTER_PALETTE, isNeonPosterHex } from "./design-styles";
import { detectVertical } from "./vertical";

export function emptyBrandKit(): ClientBrandKit {
  return { colors: [], source: "none" };
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'");
}

function clipHex(raw: string): string | null {
  const s = raw.trim().toLowerCase();
  const m = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/);
  if (!m) return null;
  let h = m[1];
  if (h.length === 8) h = h.slice(0, 6);
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h === "00000000") return null;
  return `#${h}`;
}

function rgbToHex(r: number, g: number, b: number): string | null {
  if (![r, g, b].every((n) => Number.isInteger(n) && n >= 0 && n <= 255)) return null;
  const hex = [r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("");
  return `#${hex}`;
}

export function parseHexColor(raw: string): string | null {
  return clipHex(raw);
}

function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function saturation(hex: string): number {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === 0) return 0;
  return (max - min) / max;
}

function nearGray(hex: string): boolean {
  return saturation(hex) < 0.08;
}

function nearWhite(hex: string): boolean {
  return luminance(hex) > 0.92;
}

function nearBlack(hex: string): boolean {
  return luminance(hex) < 0.04;
}

/** Extract 3–5 unique hex colors from CSS / theme-color. Never invent. */
export function extractCssColors(html: string, cap = 5): string[] {
  const raw = String(html ?? "");
  if (!raw.trim()) return [];
  const found: string[] = [];
  const push = (hex: string | null) => {
    if (!hex) return;
    if (found.includes(hex)) return;
    found.push(hex);
  };
  const theme = raw.match(
    /<meta\b[^>]*(?:name)\s*=\s*["']theme-color["'][^>]*content\s*=\s*["']([^"']+)["'][^>]*>|<meta\b[^>]*content\s*=\s*["']([^"']+)["'][^>]*name\s*=\s*["']theme-color["'][^>]*>/i,
  );
  push(clipHex((theme?.[1] || theme?.[2] || "").trim()));
  const ms = raw.match(
    /<meta\b[^>]*name\s*=\s*["']msapplication-TileColor["'][^>]*content\s*=\s*["']([^"']+)["']/i,
  );
  push(clipHex((ms?.[1] || "").trim()));

  const cssChunks: string[] = [];
  for (const m of raw.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) {
    if (m[1]) cssChunks.push(m[1]);
  }
  for (const m of raw.matchAll(/style\s*=\s*["']([^"']{0,800})["']/gi)) {
    if (m[1]) cssChunks.push(m[1]);
  }
  const blob = cssChunks.join("\n");
  for (const m of blob.matchAll(/#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})\b/gi)) {
    push(clipHex(m[0]));
  }
  for (const m of blob.matchAll(/rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/gi)) {
    push(rgbToHex(Number(m[1]), Number(m[2]), Number(m[3])));
  }
  const chromatic = found.filter((c) => !nearGray(c) && !nearWhite(c) && !nearBlack(c));
  const darks = found.filter((c) => nearBlack(c) || luminance(c) < 0.18);
  const lights = found.filter((c) => nearWhite(c));
  const ranked = [
    ...chromatic.sort((a, b) => saturation(b) - saturation(a)),
    ...darks,
    ...found.filter((c) => nearGray(c) && !nearWhite(c) && !nearBlack(c)),
    ...lights,
  ];
  const out: string[] = [];
  for (const c of ranked) {
    if (!out.includes(c)) out.push(c);
    if (out.length >= cap) break;
  }
  return out.slice(0, Math.max(0, cap));
}

function absHttp(maybe: string, base: string): string {
  if (!maybe) return "";
  try {
    const u = new URL(decodeEntities(maybe.trim()), base);
    if (u.protocol !== "http:" && u.protocol !== "https:") return "";
    return u.href;
  } catch {
    return "";
  }
}

const SKIP_LOGO = /sprite|pixel|1x1|tracking|spacer|blank\.gif|data:image\/gif|woocommerce-placeholder/i;

function logoScore(href: string, hint: string): number {
  const blob = `${href} ${hint}`.toLowerCase();
  if (SKIP_LOGO.test(blob)) return -1;
  if (/apple-touch-icon/i.test(hint)) return 100;
  if (/json-ld|schema.*logo/i.test(hint)) return 90;
  if (/logo|לוגו|شعار/i.test(blob)) return 80;
  if (/apple-touch/i.test(blob)) return 75;
  if (/\.png|\.svg|\.webp/i.test(href) && /icon|favicon/i.test(blob)) return 60;
  if (/rel=["'](?:shortcut )?icon/i.test(hint) || /favicon/i.test(blob)) return 40;
  return 10;
}

/** Favicon / apple-touch / header logo / JSON-LD logo. Never invent. */
export function extractLogoUrl(html: string, baseUrl: string): string {
  const raw = String(html ?? "");
  const scored: { href: string; score: number }[] = [];
  const push = (href: string, hint: string) => {
    const abs = absHttp(href, baseUrl);
    if (!abs || SKIP_LOGO.test(abs)) return;
    const score = logoScore(abs, hint);
    if (score < 0) return;
    scored.push({ href: abs, score });
  };
  for (const m of raw.matchAll(/<link\b([^>]*)>/gi)) {
    const attrs = m[1] || "";
    const rel = (attrs.match(/rel\s*=\s*["']([^"']+)["']/i) || [])[1] || "";
    const href = (attrs.match(/href\s*=\s*["']([^"']+)["']/i) || [])[1] || "";
    if (!href) continue;
    if (/apple-touch-icon|icon|shortcut icon|mask-icon/i.test(rel)) {
      push(href, `rel=${rel} ${attrs}`);
    }
  }
  for (const m of raw.matchAll(/<img\b([^>]*)>/gi)) {
    const attrs = m[1] || "";
    const src = (attrs.match(/(?:src|data-src)\s*=\s*["']([^"']+)["']/i) || [])[1];
    if (!src) continue;
    const hint = attrs;
    if (/logo|לוגו|شعار|brand/i.test(`${src} ${hint}`)) push(src, `header-img ${hint}`);
  }
  for (const m of raw.matchAll(/"logo"\s*:\s*"(https?:[^"]+)"/gi)) {
    if (m[1]) push(m[1], "json-ld logo");
  }
  for (const m of raw.matchAll(/"logo"\s*:\s*\{[^}]{0,500}?"url"\s*:\s*"(https?:[^"]+)"/gi)) {
    if (m[1]) push(m[1], "json-ld logo");
  }
  return scored.sort((a, b) => b.score - a.score)[0]?.href || "";
}

export function normalizeBrandKit(raw: unknown): ClientBrandKit {
  if (!raw || typeof raw !== "object") return emptyBrandKit();
  const o = raw as Record<string, unknown>;
  const colors = Array.isArray(o.colors)
    ? o.colors.map((c) => (typeof c === "string" ? clipHex(c) : null)).filter((c): c is string => Boolean(c))
    : [];
  const logoSrc = typeof o.logoSrc === "string" && /^https?:\/\//i.test(o.logoSrc) ? o.logoSrc : undefined;
  const source = o.source === "scan" && (colors.length || logoSrc) ? "scan" : "none";
  return { ...(logoSrc ? { logoSrc } : {}), colors: colors.slice(0, 5), source };
}

/** Scanned colors when ≥2; otherwise vertical design palette (not invented brand colors). */
export function paletteForIntake(intake: Intake): [string, string, string] {
  const colors = (intake.brandKit?.colors ?? [])
    .map((c) => clipHex(c))
    .filter((c): c is string => typeof c === "string" && !isNeonPosterHex(c));
  if (colors.length >= 2) {
    const sorted = [...colors].sort((a, b) => luminance(a) - luminance(b));
    const bg = sorted[0];
    const rest = colors.filter((c) => c !== bg);
    const accent = [...rest].sort((a, b) => saturation(b) - saturation(a))[0] || sorted[sorted.length - 1];
    const third = rest.find((c) => c !== accent) || sorted[sorted.length - 1] || accent;
    return [bg, accent, third];
  }
  const vertical = detectVertical(intake);
  const styles = stylesForVertical(vertical);
  if (vertical === "clinic") return styles[0]?.palette ?? CLINIC_POSTER_PALETTE;
  return (styles[0]?.palette ?? CLINIC_POSTER_PALETTE) as [string, string, string];
}

export function inkOn(bg: string): string {
  return luminance(bg) > 0.45 ? "#111111" : "#f7f7f5";
}

export function brandNote(kit: ClientBrandKit | undefined, locale: Locale): string {
  const colors = kit?.colors ?? [];
  const logo = kit?.logoSrc ? (locale === "he" ? "לוגו מהאתר" : locale === "ar" ? "شعار من الموقع" : "logo from the site") : "";
  if (!colors.length && !logo) {
    return locale === "he"
      ? "צבעי לקוח לא נמצאו בסריקה — ערכת העיצוב לפי תחום."
      : locale === "ar"
        ? "ألوان العميل ما انوجدت بالمسح — طقم التصميم حسب المجال."
        : "No client colors in the scan — design kit follows the vertical.";
  }
  const swatch = colors.join(" · ");
  if (locale === "he") return `ערכת לקוח מהסריקה${logo ? " · " + logo : ""}: ${swatch}`.trim();
  if (locale === "ar") return `طقم العميل من المسح${logo ? " · " + logo : ""}: ${swatch}`.trim();
  return `Client kit from scan${logo ? " · " + logo : ""}: ${swatch}`.trim();
}

export function pickHeroAsset(metas: MediaAssetMeta[] | undefined): MediaAssetMeta | undefined {
  const list = (metas ?? []).filter((m) => m.kind === "image");
  if (!list.length) return undefined;
  const scored = list.map((m) => {
    const blob = `${m.publicSrc || ""} ${m.name} ${m.label} ${m.note}`;
    let s = 5;
    if (m.label === "logo") s = 1;
    if (/hero|og|cover|banner|gallery|product|exterior/i.test(blob)) s += 8;
    if (m.publicSrc) s += 2;
    if (/logo|favicon|icon/i.test(blob)) s -= 4;
    return { m, s };
  });
  scored.sort((a, b) => b.s - a.s);
  return scored[0]?.m;
}
