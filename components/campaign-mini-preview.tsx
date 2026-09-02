"use client";

import type { CampaignPack, Locale } from "@/lib/types";
import { AdVisual } from "@/components/ad-mockup";
import { channelFields } from "@/lib/channel-copy";
import { paletteForIntake } from "@/lib/brand-kit";
import { pickAsset } from "@/lib/media-assets";
import { useResolvedAssets } from "@/lib/use-resolved-assets";
import { graphicPostersForIntake } from "@/lib/graphic-posters";

export function CampaignMiniPreview({ pack, locale }: { pack: CampaignPack; locale: Locale }) {
  const fields = channelFields(pack, locale);
  const palette = paletteForIntake(pack.intake);
  const assets = pack.intake.mediaAssets ?? [];
  const urls = useResolvedAssets(assets);
  const asset = pickAsset(assets, 0);
  const fallback = !asset ? graphicPostersForIntake(pack.intake)[0]?.dataUrl : undefined;
  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-white/10">
      <AdVisual
        locale={locale}
        palette={palette}
        asset={asset}
        urls={urls}
        overrideSrc={fallback}
        headline={fields.posterHeadline}
        body={fields.posterSupport}
        cta={fields.cta}
        hoursChips={fields.hoursChips}
        channel="facebook"
        className="aspect-[1.91/1] h-auto min-h-[110px] p-0"
      />
    </div>
  );
}
