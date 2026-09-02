"use client";

import type { Locale, MediaAssetMeta } from "@/lib/types";
import { pickAsset } from "@/lib/media-assets";
import { useResolvedAssets } from "@/lib/use-resolved-assets";
import { sampleLabel } from "@/lib/operating-model";
import { dirFor } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type AdPosterChannel = "facebook" | "instagram" | "tiktok" | "whatsapp";

function parseHex(hex: string): [number, number, number] | null {
  const raw = hex.replace("#", "").trim();
  if (raw.length === 3 && /^[0-9a-f]+$/i.test(raw)) {
    return [
      parseInt(raw[0] + raw[0], 16),
      parseInt(raw[1] + raw[1], 16),
      parseInt(raw[2] + raw[2], 16),
    ];
  }
  if (raw.length === 6 && /^[0-9a-f]+$/i.test(raw)) {
    return [parseInt(raw.slice(0, 2), 16), parseInt(raw.slice(2, 4), 16), parseInt(raw.slice(4, 6), 16)];
  }
  return null;
}

function luminance(hex: string): number {
  const rgb = parseHex(hex);
  if (!rgb) return 0.15;
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function isLight(hex: string): boolean {
  return luminance(hex) > 0.45;
}

function inkOn(bg: string): string {
  return isLight(bg) ? "#111111" : "#f7f7f5";
}

function Atmosphere({
  palette,
  channel,
}: {
  palette: string[];
  channel?: AdPosterChannel;
}) {
  const bg = palette[0] ?? "#111111";
  const accent = palette[1] ?? "#ffe500";
  const secondary = palette[2] ?? accent;
  return (
    <div className="absolute inset-0" aria-hidden style={{ background: bg }}>
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(165deg, ${bg} 0%, ${bg} 42%, ${accent}22 78%, ${secondary}33 100%)`,
        }}
      />
      <div
        className="absolute -top-[18%] rounded-full blur-3xl"
        style={{
          background: accent,
          opacity: 0.34,
          width: channel === "facebook" ? "58%" : "72%",
          height: channel === "tiktok" ? "42%" : "62%",
          insetInlineEnd: channel === "facebook" ? "-8%" : "-18%",
        }}
      />
      <div
        className="absolute -bottom-[22%] rounded-full blur-3xl"
        style={{
          background: secondary,
          opacity: 0.28,
          width: "62%",
          height: "55%",
          insetInlineStart: "-16%",
        }}
      />
      <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: accent }} />
      {channel === "facebook" ? (
        <div
          className="absolute top-6 h-[62%] w-[3px] rounded-full"
          style={{ background: accent, insetInlineStart: 14, opacity: 0.85 }}
        />
      ) : null}
      {channel === "instagram" ? (
        <div
          className="absolute inset-x-8 top-[14%] h-px"
          style={{ background: accent, opacity: 0.45 }}
        />
      ) : null}
      {channel === "tiktok" ? (
        <div
          className="absolute top-10 h-36 w-1.5 rounded-full"
          style={{ background: accent, insetInlineStart: 16 }}
        />
      ) : null}
      {channel === "whatsapp" ? (
        <div
          className="absolute bottom-0 inset-x-0 h-1/3"
          style={{ background: `linear-gradient(to top, ${bg}, transparent)` }}
        />
      ) : null}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(-45deg, transparent, transparent 11px, #fff 11px, #fff 12px)",
        }}
      />
    </div>
  );
}

function TypeBlock({
  locale,
  channel,
  kicker,
  headline,
  body,
  cta,
  ink,
  accent,
  onPhoto,
}: {
  locale: Locale;
  channel?: AdPosterChannel;
  kicker?: string;
  headline: string;
  body?: string;
  cta?: string;
  ink: string;
  accent: string;
  onPhoto: boolean;
}) {
  const dir = dirFor(locale);
  const ctaColor = inkOn(accent);
  const fb = channel === "facebook";
  const ig = channel === "instagram";
  const tt = channel === "tiktok";
  const wa = channel === "whatsapp";
  const muted = onPhoto ? "rgba(255,255,255,0.88)" : isLight(ink) ? "rgba(247,247,245,0.82)" : "rgba(17,17,17,0.72)";
  return (
    <div
      dir={dir}
      className={cn(
        "relative z-[1] flex h-full min-h-0 flex-col text-start",
        fb && "w-[78%] justify-end px-5 py-4",
        ig && "justify-between px-5 py-6",
        tt && "justify-start px-5 pb-[40%] pt-12",
        wa && "justify-end p-4",
        !channel && "justify-end p-4",
      )}
    >
      <div>
        {kicker ? (
          <p
            className="mb-2 text-[10px] font-black uppercase tracking-[0.22em]"
            style={{ color: accent, margin: 0 }}
          >
            {kicker}
          </p>
        ) : null}
        <h2
          className={cn(
            "font-black tracking-tight",
            fb && "line-clamp-3 text-[22px] leading-[1.08]",
            ig && "line-clamp-4 text-[26px] leading-[1.06]",
            tt && "line-clamp-4 text-[28px] leading-[1.05]",
            wa && "line-clamp-3 text-[18px] leading-[1.1]",
            !channel && "line-clamp-3 text-xl leading-tight",
          )}
          style={{ color: ink, margin: 0 }}
        >
          {headline}
        </h2>
        {body && !tt ? (
          <p
            className={cn(
              "mt-2 font-medium",
              fb && "line-clamp-2 text-[12px] leading-snug",
              ig && "line-clamp-3 text-[13px] leading-snug",
              wa && "line-clamp-2 text-[12px] leading-snug",
              !channel && "line-clamp-2 text-xs",
            )}
            style={{ color: muted, margin: 0 }}
          >
            {body}
          </p>
        ) : null}
      </div>
      {cta ? (
        <span
          className={cn(
            "inline-flex w-fit max-w-full truncate rounded-full px-3.5 py-1.5 text-[11px] font-black",
            fb && "mt-3",
            ig && "mt-4",
            tt && "mt-4",
            wa && "mt-3",
            !channel && "mt-3",
          )}
          style={{ background: accent, color: ctaColor }}
        >
          {cta}
        </span>
      ) : null}
    </div>
  );
}

export function AdVisual({
  locale,
  palette,
  asset,
  urls,
  className,
  children,
  overrideSrc,
  aiLabel,
  graphicOnlyLabel,
  headline,
  body,
  cta,
  kicker,
  channel,
}: {
  locale: Locale;
  palette: string[];
  asset?: MediaAssetMeta;
  urls: Record<string, string>;
  className?: string;
  children?: React.ReactNode;
  overrideSrc?: string | null;
  aiLabel?: string;
  graphicOnlyLabel?: string;
  headline?: string;
  body?: string;
  cta?: string;
  kicker?: string;
  channel?: AdPosterChannel;
}) {
  const assetUrl = asset?.publicSrc || (asset ? urls[asset.id] : undefined);
  const fromAsset = Boolean(assetUrl && asset);
  const fromAi = Boolean(!fromAsset && overrideSrc);
  const url = fromAsset ? assetUrl : overrideSrc || undefined;
  const sample = sampleLabel(locale);
  const showPhoto = Boolean(url && (!asset || asset.kind === "image" || fromAi));
  const showVideo = Boolean(fromAsset && asset?.kind === "video" && assetUrl);
  const hasPlate = Boolean(showPhoto || showVideo);
  const posterHeadline = (headline ?? "").trim();
  const hasPosterType = Boolean(posterHeadline);
  const bg = palette[0] ?? "#111111";
  const accent = palette[1] ?? "#ffe500";
  const ink = hasPlate ? "#f7f7f5" : inkOn(bg);
  const emptySample = !hasPlate && !hasPosterType && !children;

  return (
    <div
      className={cn(
        "relative overflow-hidden",
        !hasPosterType && "flex flex-col justify-end p-3",
        className ?? "h-36",
      )}
      style={hasPlate ? undefined : { background: bg }}
    >
      {!hasPlate ? <Atmosphere palette={palette} channel={channel} /> : null}
      {showPhoto && url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={asset?.name || ""} className="absolute inset-0 h-full w-full object-cover" />
      )}
      {showVideo && assetUrl && (
        <video src={assetUrl} className="absolute inset-0 h-full w-full object-cover" muted playsInline loop />
      )}
      {hasPlate && (
        <div
          className="absolute inset-0"
          style={{
            background:
              channel === "tiktok"
                ? "linear-gradient(to bottom, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.12) 42%, rgba(0,0,0,0.78) 100%)"
                : "linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.28) 42%, rgba(0,0,0,0.12) 100%)",
          }}
        />
      )}
      {emptySample ? (
        <span className="absolute start-2 top-2 z-[2] rounded bg-black/55 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
          {sample}
        </span>
      ) : null}
      {!hasPlate && graphicOnlyLabel && !fromAi ? (
        <span className="absolute start-2 top-2 z-[2] rounded bg-black/55 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-white/80">
          {graphicOnlyLabel}
        </span>
      ) : null}
      {fromAi && aiLabel ? (
        <span className="absolute start-2 top-2 z-[2] rounded bg-black/65 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-omni-yellow">
          {aiLabel}
        </span>
      ) : null}
      {hasPosterType ? (
        <TypeBlock
          locale={locale}
          channel={channel}
          kicker={kicker}
          headline={posterHeadline}
          body={body}
          cta={cta}
          ink={ink}
          accent={accent}
          onPhoto={hasPlate}
        />
      ) : null}
      {children ? <div className="relative z-[1]">{children}</div> : null}
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
