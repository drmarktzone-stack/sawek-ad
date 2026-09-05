import type { AdVariant, CampaignPack, Locale } from "./types";
import { clipAtWord, isWalkIn, localizeFactBlob, shortName, spokenAdvantage } from "./engine/spoken";
import { hoursChips, isHoursWall, stripHoursWall } from "./hours-chips";

const HE_RE = /[\u0590-\u05FF]/;
const AR_RE = /[\u0600-\u06FF]/;

/** True when kicker repeats the headline (doctor name stacked as thin green + bold ink). */
export function isRedundantKicker(kicker: string | undefined, headline: string | undefined): boolean {
  const k = (kicker ?? "").replace(/\s+/g, " ").trim();
  const h = (headline ?? "").replace(/\s+/g, " ").trim();
  if (!k) return true;
  if (!h) return false;
  const kn = k.toLowerCase();
  const hn = h.toLowerCase();
  if (kn === hn) return true;
  if (hn.startsWith(kn) || hn.includes(` ${kn}`) || hn.includes(`${kn} `) || hn.includes(`${kn}—`) || hn.includes(`${kn} -`) || hn.includes(`${kn}–`)) {
    return true;
  }
  if (kn.includes(hn) && hn.length >= 8) return true;
  return false;
}

function hasLocaleScript(text: string, locale: Locale): boolean {
  if (locale === "he") return HE_RE.test(text);
  if (locale === "ar") return AR_RE.test(text);
  return /[A-Za-z]/.test(text);
}

/**
 * One clean locale for posters: map known fact phrases, then strip foreign script runs.
 * Never leaves HE+AR stacked on the same line.
 */
export function sanitizeForLocale(text: string, locale: Locale): string {
  let s = localizeFactBlob(String(text ?? "").replace(/\s+/g, " ").trim(), locale);
  if (!s) return "";
  if (locale === "he") {
    if (AR_RE.test(s)) s = s.replace(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]+/g, " ");
  } else if (locale === "ar") {
    if (HE_RE.test(s)) s = s.replace(/[\u0590-\u05FF]+/g, " ");
  } else {
    if (HE_RE.test(s) || AR_RE.test(s)) {
      s = s.replace(/[\u0590-\u05FF]+/g, " ").replace(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]+/g, " ");
    }
  }
  return s.replace(/\s+/g, " ").replace(/[·+,|/]\s*$/u, "").replace(/^\s*[·+,|/]+\s*/u, "").trim();
}

export function incompleteLabel(locale: Locale): string {
  return locale === "he" ? "יש להשלים" : locale === "ar" ? "يجب الاستكمال" : "TO COMPLETE";
}

export function fieldOrIncomplete(value: string | undefined | null, locale: Locale): string {
  const s = (value ?? "").trim();
  return s ? s : incompleteLabel(locale);
}

export function spokenVariant(pack: CampaignPack, locale: Locale): AdVariant | undefined {
  const ads = pack.variants.filter((v) => v.locale === locale);
  return ads.find((v) => v.kind === "strong_offer") ?? ads[0];
}

export function agencyPiece(
  pack: CampaignPack,
  format: string,
  locale: Locale,
): { title: string; body: string } | undefined {
  return pack.agency?.creative.pieces.find((x) => x.format === format && x.locale === locale);
}

export function isIncompleteMarker(text: string, locale: Locale): boolean {
  const t = text.trim();
  if (!t) return true;
  if (t === incompleteLabel(locale)) return true;
  if (t === "[יש להשלים]" || t === "[يجب الاستكمال]" || t === "[TO COMPLETE]") return true;
  return false;
}

export interface ChannelFields {
  headline: string;
  posterHeadline: string;
  posterSupport: string;
  hoursChips: string[];
  body: string;
  shortBody: string;
  cta: string;
  waScript: string;
  landingTitle: string;
  landingBody: string;
  primaryText: string;
  caption: string;
  pageName: string;
  tiktokCaption: string;
  tiktokCta: string;
}

function walkInSupport(locale: Locale): string {
  if (locale === "he") return "קבלה לפי סדר הגעה, בלי תור";
  if (locale === "ar") return "جت أولاً، بدون طوابير";
  return "Walk-in, first come, no queue";
}

function oneSupportLine(pack: CampaignPack, locale: Locale, headline: string): string {
  const adv = sanitizeForLocale(spokenAdvantage(pack.intake, locale), locale);
  if (adv && adv !== headline && adv.length >= 4) return clipAtWord(adv, 72);
  const pos = sanitizeForLocale(stripHoursWall(pack.intake.brandPositioning || ""), locale);
  if (pos && pos !== headline && pos.length >= 4 && hasLocaleScript(pos, locale)) return clipAtWord(pos, 72);
  if (isWalkIn(pack.intake)) return walkInSupport(locale);
  const loc = sanitizeForLocale(stripHoursWall(pack.intake.location || ""), locale);
  if (loc && hasLocaleScript(loc, locale) && loc.length >= 4) return clipAtWord(loc, 72);
  return "";
}

/** Copy only from pack.variants / agency landing+whatsapp / intake. Never invent claims. */
export function channelFields(pack: CampaignPack, locale: Locale): ChannelFields {
  const v = spokenVariant(pack, locale);
  const waPiece = agencyPiece(pack, "whatsapp", locale);
  const lpPiece = agencyPiece(pack, "landing", locale);
  const headline = fieldOrIncomplete(v?.headline, locale);
  const body = fieldOrIncomplete(v?.primaryText, locale);
  const cta = fieldOrIncomplete(v?.cta, locale);
  const waFromIntake = pack.intake.whatsappTemplates?.trim() ?? "";
  const waRaw = stripHoursWall(waFromIntake || waPiece?.body || "");
  const waClean = waRaw
    .replace(/\[יש להשלים\]|\[يجب الاستكمال\]|\[TO COMPLETE\]/g, "")
    .replace(/\bיש להשלים\b|\bيجب الاستكمال\b|\bTO COMPLETE\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const waHasFacts = Boolean((pack.intake.whatsapp || "").trim() || (pack.intake.businessName || "").trim());
  const waScript =
    waRaw && !isIncompleteMarker(waRaw, locale)
      ? waRaw
      : waHasFacts && waClean
        ? waClean
        : waHasFacts
          ? fieldOrIncomplete(pack.intake.businessName || pack.intake.whatsapp, locale)
          : fieldOrIncomplete(waRaw, locale);
  const landingTitle = fieldOrIncomplete(lpPiece?.title || v?.headline, locale);
  const landingBody = fieldOrIncomplete(lpPiece?.body, locale);
  const posterHeadline = clipAtWord(
    sanitizeForLocale(stripHoursWall(headline) || headline, locale) || incompleteLabel(locale),
    56,
  );
  const posterSupport = oneSupportLine(pack, locale, posterHeadline);
  const chips = hoursChips(pack.intake.clinicHours || "", locale, 3);
  const cleanedPrimary = v?.primaryText?.trim()
    ? sanitizeForLocale(stripHoursWall(v.primaryText.replace(/\s+/g, " ")), locale)
    : "";
  const shortBody = cleanedPrimary
    ? clipAtWord(cleanedPrimary, 90)
    : posterSupport || incompleteLabel(locale);
  const primaryText = [v?.headline, v?.primaryText, v?.cta]
    .map((x) => sanitizeForLocale(x ?? "", locale))
    .filter((x) => x.trim())
    .join("\n\n");
  const caption = primaryText.trim() ? primaryText : incompleteLabel(locale);
  const pageName = fieldOrIncomplete(
    sanitizeForLocale(shortName(pack.intake, locale) || pack.intake.businessName, locale),
    locale,
  );
  const reelsPiece = agencyPiece(pack, "reels", locale);
  const tiktokPiece = agencyPiece(pack, "tiktok", locale);
  const reelBody = sanitizeForLocale(stripHoursWall((tiktokPiece?.body || reelsPiece?.body || "").trim()), locale);
  const tiktokCaption = clipAtWord(
    reelBody && !isHoursWall(reelBody)
      ? reelBody
      : [posterHeadline, posterSupport].filter(Boolean).join(" · "),
    90,
  );
  const tiktokCta = fieldOrIncomplete(sanitizeForLocale(v?.cta || "", locale) || v?.cta, locale);
  return {
    headline,
    posterHeadline,
    posterSupport,
    hoursChips: chips,
    body,
    shortBody,
    cta,
    waScript,
    landingTitle,
    landingBody,
    primaryText: primaryText.trim() ? primaryText : incompleteLabel(locale),
    caption,
    pageName,
    tiktokCaption,
    tiktokCta,
  };
}

/**
 * Digits for wa.me from a user-supplied number only.
 * Never invents a number. Local 0xx Israel numbers become 972xx (not a guess — same digits).
 */
export function waMeDigits(raw: string | undefined | null): string | null {
  if (!raw || !String(raw).trim()) return null;
  let d = String(raw).replace(/[^\d]/g, "");
  if (!d) return null;
  if (d.length < 8) return null;
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("972") && d.length >= 11) return d;
  if (d.startsWith("0") && d.length >= 9) return `972${d.slice(1)}`;
  if (d.length >= 8) return d;
  return null;
}

export function waMeUrl(phone: string | undefined | null, text: string, locale: Locale): string | null {
  const digits = waMeDigits(phone);
  if (!digits) return null;
  const payload = isIncompleteMarker(text, locale) ? "" : text.trim();
  const q = payload ? `?text=${encodeURIComponent(payload)}` : "";
  return `https://wa.me/${digits}${q}`;
}

export async function nodeToPngBlob(
  node: HTMLElement | null,
  targetWidth: number,
): Promise<Blob | null> {
  if (!node || typeof document === "undefined") return null;
  try {
    if (document.fonts?.ready) {
      try {
        await document.fonts.ready;
      } catch {
        /* ignore font wait failures */
      }
    }
    // Two frames so layout/fonts settle without scrolling the live page.
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

    const html2canvas = (await import("html2canvas")).default;
    const rect = node.getBoundingClientRect();
    const w = Math.max(node.offsetWidth, Math.ceil(rect.width), 1);
    const h = Math.max(node.offsetHeight, Math.ceil(rect.height), 1);
    const dpr = typeof window !== "undefined" ? Math.min(3, Math.max(1, window.devicePixelRatio || 1)) : 2;
    const scale = Math.min(3, Math.max(2, Math.max(targetWidth / w, dpr)));
    const bg =
      (typeof getComputedStyle === "function" && getComputedStyle(node).backgroundColor) ||
      "#000000";
    const canvas = await html2canvas(node, {
      backgroundColor: bg === "rgba(0, 0, 0, 0)" || bg === "transparent" ? "#000000" : bg,
      scale,
      width: w,
      height: h,
      windowWidth: Math.max(w, Math.ceil(document.documentElement.clientWidth || w)),
      windowHeight: Math.max(h, Math.ceil(document.documentElement.clientHeight || h)),
      useCORS: true,
      allowTaint: true,
      logging: false,
      foreignObjectRendering: false,
      imageTimeout: 15000,
      onclone: (_doc, cloned) => {
        cloned.style.boxSizing = "border-box";
        cloned.style.width = `${w}px`;
        cloned.style.height = `${h}px`;
        cloned.style.maxWidth = `${w}px`;
        cloned.style.transform = "none";
        cloned.style.setProperty("-webkit-font-smoothing", "antialiased");
      },
    });
    const blob = await new Promise<Blob | null>((resolve) => {
      try {
        canvas.toBlob(resolve, "image/png");
      } catch {
        resolve(null);
      }
    });
    if (blob && blob.size > 32) return blob;
    const dataUrl = canvas.toDataURL("image/png");
    if (!dataUrl || dataUrl.length < 64) return null;
    const res = await fetch(dataUrl);
    return await res.blob();
  } catch {
    return null;
  }
}

export async function downloadNodePng(
  node: HTMLElement | null,
  filename: string,
  targetWidth: number,
): Promise<boolean> {
  if (!node || typeof document === "undefined") return false;
  const blob = await nodeToPngBlob(node, targetWidth);
  if (!blob) return false;
  const a = document.createElement("a");
  const url = URL.createObjectURL(blob);
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke after the browser has started the download — avoids blank/broken files on mobile.
  window.setTimeout(() => URL.revokeObjectURL(url), 2500);
  return true;
}
