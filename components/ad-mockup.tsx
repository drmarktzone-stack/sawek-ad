"use client";

import type { Locale, MediaAssetMeta } from "@/lib/types";
import { pickAsset } from "@/lib/media-assets";
import { useResolvedAssets } from "@/lib/use-resolved-assets";
import { sampleLabel } from "@/lib/operating-model";
import { cn } from "@/lib/utils";

export function AdVisual({
  locale,
  palette,
  asset,
  urls,
  className,
  children,
}: {
  locale: Locale;
  palette: string[];
  asset?: MediaAssetMeta;
  urls: Record<string, string>;
  className?: string;
  children?: React.ReactNode;
}) {
  const url = asset?.publicSrc || (asset ? urls[asset.id] : undefined);
  const sample = sampleLabel(locale);
  return (
    <div
      className={cn("relative flex flex-col justify-end overflow-hidden p-3", className ?? "h-36")}
      style={
        url && asset?.kind === "image"
          ? undefined
          : { background: `linear-gradient(160deg, ${palette[0]}, ${palette[1]} 70%, ${palette[2] ?? palette[0]})` }
      }
    >
      {url && asset?.kind === "image" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={asset.name} className="absolute inset-0 h-full w-full object-cover" />
      )}
      {url && asset?.kind === "video" && (
        <video src={url} className="absolute inset-0 h-full w-full object-cover" muted playsInline loop />
      )}
      {url && <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-black/10" />}
      {!url && (
        <span className="absolute start-2 top-2 rounded bg-black/55 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
          {sample}
        </span>
      )}
      <div className="relative z-[1]">{children}</div>
    </div>
  );
}

export function CampaignAdVisual({
  locale,
  palette,
  assets,
  index,
  className,
  children,
}: {
  locale: Locale;
  palette: string[];
  assets?: MediaAssetMeta[];
  index: number;
  className?: string;
  children?: React.ReactNode;
}) {
  const urls = useResolvedAssets(assets);
  const asset = pickAsset(assets, index);
  return (
    <AdVisual locale={locale} palette={palette} asset={asset} urls={urls} className={className}>
      {children}
    </AdVisual>
  );
}
