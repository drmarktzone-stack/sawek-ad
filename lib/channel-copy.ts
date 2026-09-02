import type { AdVariant, CampaignPack, Locale } from "./types";
import { clipAtWord, isWalkIn, shortName } from "./engine/spoken";
import { hoursChips, isHoursWall, stripHoursWall } from "./hours-chips";

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
  const adv = stripHoursWall(pack.intake.uniqueAdvantage || "");
  if (adv && adv !== headline && adv.length >= 4) return clipAtWord(adv, 72);
  const pos = stripHoursWall(pack.intake.brandPositioning || "");
  if (pos && pos !== headline) return clipAtWord(pos, 72);
  if (isWalkIn(pack.intake)) return walkInSupport(locale);
  const loc = (pack.intake.location || "").trim();
  if (loc) return clipAtWord(loc, 72);
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
  const waScript = fieldOrIncomplete(waFromIntake || waPiece?.body, locale);
  const landingTitle = fieldOrIncomplete(lpPiece?.title || v?.headline, locale);
  const landingBody = fieldOrIncomplete(lpPiece?.body, locale);
  const posterHeadline = clipAtWord(stripHoursWall(headline) || headline, 56);
  const posterSupport = oneSupportLine(pack, locale, posterHeadline);
  const chips = hoursChips(pack.intake.clinicHours || "", locale, 3);
  const cleanedPrimary = v?.primaryText?.trim() ? stripHoursWall(v.primaryText.replace(/\s+/g, " ")) : "";
  const shortBody = cleanedPrimary
    ? clipAtWord(cleanedPrimary, 90)
    : posterSupport || incompleteLabel(locale);
  const primaryText = [v?.headline, v?.primaryText, v?.cta].filter((x) => (x ?? "").trim()).join("\n\n");
  const caption = primaryText.trim() ? primaryText : incompleteLabel(locale);
  const pageName = fieldOrIncomplete(shortName(pack.intake, locale) || pack.intake.businessName, locale);
  const reelsPiece = agencyPiece(pack, "reels", locale);
  const tiktokPiece = agencyPiece(pack, "tiktok", locale);
  const reelBody = stripHoursWall((tiktokPiece?.body || reelsPiece?.body || "").trim());
  const tiktokCaption = clipAtWord(
    reelBody && !isHoursWall(reelBody)
      ? reelBody
      : [posterHeadline, posterSupport].filter(Boolean).join(" · "),
    90,
  );
  const tiktokCta = fieldOrIncomplete(v?.cta, locale);
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
    const html2canvas = (await import("html2canvas")).default;
    const w = Math.max(node.offsetWidth, 1);
    const scale = Math.min(4, Math.max(2, targetWidth / w));
    const canvas = await html2canvas(node, {
      backgroundColor: "#000000",
      scale,
      useCORS: true,
      allowTaint: true,
      logging: false,
      foreignObjectRendering: false,
    });
    const blob = await new Promise<Blob | null>((resolve) => {
      try {
        canvas.toBlob(resolve, "image/png");
      } catch {
        resolve(null);
      }
    });
    if (blob) return blob;
    const dataUrl = canvas.toDataURL("image/png");
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
  a.click();
  URL.revokeObjectURL(url);
  return true;
}
