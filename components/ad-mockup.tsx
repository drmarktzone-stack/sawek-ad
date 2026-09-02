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
        className="absolute rounded-full blur-3xl"
        style={{
          background: accent,
          opacity: 0.34,
          width: channel === "facebook" ? "50%" : "64%",
          height: channel === "tiktok" ? "36%" : "52%",
          top: "8%",
          insetInlineEnd: channel === "facebook" ? "-4%" : "-12%",
        }}
      />
      <div
        className="absolute rounded-full blur-3xl"
        style={{
          background: secondary,
          opacity: 0.28,
          width: "52%",
          height: "42%",
          bottom: "6%",
          insetInlineStart: "-10%",
        }}
      />
      {/* Inset bars so Magic Resize never clips the accent. */}
      <div
        className="absolute inset-x-3 top-2 h-1.5 rounded-full"
        style={{ background: accent }}
      />
      {channel === "facebook" ? (
        <div
          className="absolute top-6 bottom-6 w-[3px] rounded-full"
          style={{ background: accent, insetInlineStart: 10, opacity: 0.85 }}
        />
      ) : null}
      {channel === "instagram" ? (
        <div
          className="absolute inset-x-8 top-[12%] h-px"
          style={{ background: accent, opacity: 0.45 }}
        />
      ) : null}
      {channel === "tiktok" ? (
        <div
          className="absolute top-14 h-28 w-1.5 rounded-full"
          style={{ background: accent, insetInlineStart: 14 }}
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

function HoursChips({
  chips,
  ink,
  accent,
  compact,
}: {
  chips?: string[];
  ink: string;
  accent: string;
  compact?: boolean;
}) {
  const list = (chips ?? []).filter(Boolean).slice(0, 3);
  if (!list.length) return null;
  return (
    <div className={cn("flex flex-wrap", compact ? "mt-1.5 gap-1" : "mt-2 gap-1.5")}>
      {list.map((c) => (
        <span
          key={c}
          className={cn(
            "inline-flex max-w-full rounded-full border px-2 font-bold leading-tight",
            compact ? "py-0.5 text-[13px]" : "py-1 text-[13px]",
          )}
          style={{
            color: ink,
            borderColor: accent,
            background: "rgba(0,0,0,0.28)",
          }}
        >
          {c}
        </span>
      ))}
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
  hoursChips,
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
  hoursChips?: string[];
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
  const muted = onPhoto ? "rgba(255,255,255,0.92)" : isLight(ink) ? "rgba(247,247,245,0.88)" : "rgba(17,17,17,0.78)";
  const showKicker = Boolean(kicker) && !fb && !tt;
  const showCta = Boolean(cta) && !tt;
  return (
    <div
      dir={dir}
      className={cn(
        "relative z-[1] box-border flex h-full min-h-0 w-full flex-col text-start",
        fb && "justify-between gap-2 px-5 py-3 ps-7",
        ig && "justify-between gap-2 px-5 py-5",
        tt && "justify-start gap-2 px-4 pb-[34%] pe-[4.75rem] pt-14",
        wa && "justify-end gap-2 p-4",
        !channel && "justify-end gap-2 p-4",
      )}
    >
      <div className="min-h-0 overflow-hidden">
        {showKicker ? (
          <p
            className="mb-1.5 text-[13px] font-black uppercase tracking-[0.16em]"
            style={{ color: accent, margin: 0 }}
          >
            {kicker}
          </p>
        ) : null}
        <h2
          className={cn(
            "font-black tracking-tight break-words",
            fb && "text-[clamp(15px,3.6vw,20px)] leading-[1.12]",
            ig && "text-[clamp(18px,4.2vw,26px)] leading-[1.08]",
            tt && "text-[clamp(18px,5vw,26px)] leading-[1.1]",
            wa && "text-[18px] leading-[1.12]",
            !channel && "text-xl leading-tight",
          )}
          style={{ color: ink, margin: 0, overflowWrap: "anywhere" }}
        >
          {headline}
        </h2>
        {body && !tt ? (
          <p
            className={cn(
              "mt-1.5 font-medium break-words",
              fb && "text-[13px] leading-snug",
              ig && "text-[14px] leading-snug",
              wa && "text-[13px] leading-snug",
              !channel && "text-sm leading-snug",
            )}
            style={{ color: muted, margin: 0, overflowWrap: "anywhere" }}
          >
            {body}
          </p>
        ) : null}
        <HoursChips chips={hoursChips} ink={ink} accent={accent} compact={fb} />
      </div>
      {showCta ? (
        <span
          className={cn(
            "inline-flex w-fit max-w-full shrink-0 items-center rounded-full px-3.5 py-1.5 text-[13px] font-black leading-tight",
            "whitespace-normal text-center",
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
  hoursChips,
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
  hoursChips?: string[];
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
        "relative box-border overflow-hidden",
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
        <span className="absolute start-2 top-2 z-[2] rounded bg-black/55 px-2 py-0.5 text-[13px] font-black uppercase tracking-[0.14em] text-zinc-200">
          {sample}
        </span>
      ) : null}
      {!hasPlate && graphicOnlyLabel && !fromAi ? (
        <span className="absolute start-2 top-2 z-[2] rounded bg-black/70 px-2 py-0.5 text-[13px] font-black uppercase tracking-[0.12em] text-white">
          {graphicOnlyLabel}
        </span>
      ) : null}
      {fromAi && aiLabel ? (
        <span className="absolute start-2 top-2 z-[2] rounded bg-black/70 px-2 py-0.5 text-[13px] font-black uppercase tracking-[0.12em] text-omni-yellow">
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
          hoursChips={hoursChips}
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
