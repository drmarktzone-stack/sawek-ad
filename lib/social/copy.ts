import type { CampaignPack, Locale } from "@/lib/types";
import { agencyPiece, spokenVariant } from "@/lib/channel-copy";

function joinParts(...parts: Array<string | undefined | null>): string {
  return parts
    .map((p) => (p ?? "").trim())
    .filter(Boolean)
    .join("\n\n");
}

/**
 * Default caption for Publish to Social. Uses already-generated campaign copy only.
 * Prefer agency facebook/instagram (or feed) body; else variants headline+body+CTA; else pack.name.
 */
export function publishMessage(pack: CampaignPack, locale: Locale): string {
  const fb =
    agencyPiece(pack, "facebook", locale) ??
    agencyPiece(pack, "feed", locale);
  const ig =
    agencyPiece(pack, "instagram", locale) ??
    agencyPiece(pack, "story", locale);
  const piece = fb ?? ig;
  const v = spokenVariant(pack, locale) ?? pack.variants.find((x) => x.locale === locale) ?? pack.variants[0];
  const cta = (v?.cta ?? "").trim();

  if (piece) {
    const body = joinParts(piece.title, piece.body);
    if (body) return cta && !body.includes(cta) ? joinParts(body, cta) : body;
  }

  if (v) {
    const text = joinParts(v.headline, v.primaryText, v.cta);
    if (text) return text;
  }

  return (pack.name ?? "").trim();
}

export function packPublicImageUrl(pack: CampaignPack, baseUrl?: string): string | undefined {
  const img = (pack.intake.mediaAssets ?? []).find((a) => a.kind === "image" && a.publicSrc);
  const src = img?.publicSrc?.trim();
  if (!src) return undefined;
  if (src.startsWith("data:") || src.startsWith("blob:")) return undefined;
  if (/^https?:\/\//i.test(src)) return src;
  const base = (baseUrl ?? "").replace(/\/$/, "");
  if (!base) return src.startsWith("/") ? src : `/${src}`;
  return `${base}${src.startsWith("/") ? "" : "/"}${src}`;
}

export function packHasLocalImage(pack: CampaignPack): boolean {
  return (pack.intake.mediaAssets ?? []).some((a) => a.kind === "image");
}
