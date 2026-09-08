import type { CampaignPack, Locale } from "@/lib/types";
import { agencyPiece, spokenVariant } from "@/lib/channel-copy";
import { gateCustomerAd, purifyCustomerText, copyFactsFromIntake } from "@/lib/copy-purity";

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

  const facts = copyFactsFromIntake(pack.intake);
  if (piece) {
    const body = purifyCustomerText(joinParts(piece.title, piece.body), locale, facts);
    if (body) {
      const gated = gateCustomerAd({ headline: piece.title, body, cta }, pack.intake, locale);
      return [gated.headline, gated.body, gated.cta].filter(Boolean).join("\n\n");
    }
  }

  if (v) {
    const gated = gateCustomerAd({ headline: v.headline, body: v.primaryText, cta: v.cta }, pack.intake, locale);
    const text = joinParts(gated.headline, gated.body, gated.cta);
    if (text) return text;
  }

  return purifyCustomerText((pack.name ?? "").trim(), locale, facts);
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
