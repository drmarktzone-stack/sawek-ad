"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import {
  Bookmark,
  Download,
  Globe,
  Heart,
  ImagePlus,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Music2,
  Send,
  Share2,
  ThumbsUp,
} from "lucide-react";
import type { CampaignPack, Locale, MediaAssetMeta } from "@/lib/types";
import { dirFor } from "@/lib/i18n";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { AdVisual } from "@/components/ad-mockup";
import { pickAsset, pickLogo } from "@/lib/media-assets";
import { useResolvedAssets } from "@/lib/use-resolved-assets";
import { channelFields, downloadNodePng } from "@/lib/channel-copy";
import { stylesForVertical } from "@/lib/design-styles";
import { detectVertical } from "@/lib/vertical";
import { paletteForIntake } from "@/lib/brand-kit";
import { cn } from "@/lib/utils";

const autoImagenPacks = new Set<string>();

export type PreviewImage = { mime: string; dataUrl: string } | null;

function palettes(intake: CampaignPack["intake"]): [string, string, string][] {
  const brand = paletteForIntake(intake);
  const styles = stylesForVertical(detectVertical(intake)).map((st) => st.palette);
  if (intake.brandKit?.source === "scan" && (intake.brandKit.colors?.length ?? 0) >= 2) {
    return [brand, ...styles];
  }
  return styles.length ? styles : [brand];
}

function isWaCta(cta: string): boolean {
  return /whatsapp|וואטסאפ|واتساب|wa\.me/i.test(cta);
}

function handleOf(pageName: string): string {
  const raw = pageName.replace(/\s+/g, "").slice(0, 22);
  return raw || "page";
}

function Avatar({
  name,
  logoUrl,
  ring,
  size = 36,
  bg = "#1877F2",
}: {
  name: string;
  logoUrl?: string;
  ring?: boolean;
  size?: number;
  bg?: string;
}) {
  const initial = (name || "?").trim().charAt(0).toUpperCase();
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt=""
        width={size}
        height={size}
        className={cn("shrink-0 rounded-full object-cover", ring && "ring-2 ring-offset-1 ring-offset-black")}
        style={ring ? { width: size, height: size, borderRadius: 999, objectFit: "cover", padding: 2, background: "linear-gradient(135deg,#f9ce34,#ee2a7b,#6228d7)" } : { width: size, height: size, borderRadius: 999, objectFit: "cover" }}
      />
    );
  }
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full font-extrabold text-white"
      style={{
        width: size,
        height: size,
        background: ring ? "linear-gradient(135deg,#f9ce34,#ee2a7b,#6228d7)" : bg,
        fontSize: Math.round(size * 0.38),
      }}
    >
      {initial}
    </span>
  );
}

export function FacebookFeedCard({
  refEl,
  packLang,
  fields,
  asset,
  urls,
  logoUrl,
  palette,
  generatedSrc,
  aiLabel,
  graphicOnlyLabel,
  sponsored,
  like,
  comment,
  share,
}: {
  refEl?: RefObject<HTMLDivElement | null>;
  packLang: Locale;
  fields: ReturnType<typeof channelFields>;
  asset?: MediaAssetMeta;
  urls: Record<string, string>;
  logoUrl?: string;
  palette: string[];
  generatedSrc?: string | null;
  aiLabel?: string;
  graphicOnlyLabel?: string;
  sponsored: string;
  like: string;
  comment: string;
  share: string;
}) {
  const dir = dirFor(packLang);
  const wa = isWaCta(fields.cta);
  return (
    <div
      ref={refEl}
      dir={dir}
      className="overflow-hidden rounded-xl border border-white/10 text-start"
      style={{ background: "#242526", color: "#e4e6eb", fontFamily: "Helvetica, Arial, sans-serif" }}
    >
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <Avatar name={fields.pageName} logoUrl={logoUrl} size={40} bg="#1877F2" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-bold leading-tight" style={{ margin: 0 }}>
            {fields.pageName}
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-[11px]" style={{ color: "#b0b3b8", margin: 0 }}>
            {sponsored}
            <Globe style={{ width: 10, height: 10 }} />
          </p>
        </div>
        <MoreHorizontal className="size-4 shrink-0" style={{ color: "#b0b3b8" }} />
      </div>
      <p className="whitespace-pre-wrap px-3 pb-2 text-[13px] leading-[1.45]" style={{ margin: 0 }}>
        {fields.shortBody}
      </p>
      <AdVisual
        locale={packLang}
        palette={palette}
        asset={asset}
        urls={urls}
        overrideSrc={generatedSrc}
        aiLabel={aiLabel}
        graphicOnlyLabel={graphicOnlyLabel}
        kicker={fields.pageName}
        headline={fields.headline}
        body={fields.shortBody}
        cta={fields.cta}
        channel="facebook"
        className="aspect-[1.91/1] h-auto min-h-0 rounded-none p-0"
      />
      <div
        className="flex items-center justify-between gap-2 px-3 py-2.5"
        style={{ background: "#3a3b3c" }}
      >
        <div className="min-w-0">
          <p className="truncate text-[13px] font-bold leading-tight" style={{ margin: 0 }}>
            {fields.headline}
          </p>
          <p className="truncate text-[11px] uppercase tracking-wide" style={{ color: "#b0b3b8", margin: 0 }}>
            {fields.pageName}
          </p>
        </div>
        <span
          className="shrink-0 rounded-md px-3 py-1.5 text-[12px] font-extrabold"
          style={{
            background: wa ? "#25D366" : "#0866FF",
            color: "#fff",
          }}
        >
          {fields.cta}
        </span>
      </div>
      <div
        className="flex justify-around px-2 py-2 text-[12px] font-bold"
        style={{ borderTop: "1px solid #3e4042", color: "#b0b3b8" }}
      >
        <span className="inline-flex items-center gap-1.5">
          <ThumbsUp style={{ width: 16, height: 16 }} /> {like}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <MessageCircle style={{ width: 16, height: 16 }} /> {comment}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Share2 style={{ width: 16, height: 16 }} /> {share}
        </span>
      </div>
    </div>
  );
}

export function InstagramFeedCard({
  refEl,
  packLang,
  fields,
  asset,
  urls,
  logoUrl,
  palette,
  generatedSrc,
  aiLabel,
  graphicOnlyLabel,
  ctaComment,
}: {
  refEl?: RefObject<HTMLDivElement | null>;
  packLang: Locale;
  fields: ReturnType<typeof channelFields>;
  asset?: MediaAssetMeta;
  urls: Record<string, string>;
  logoUrl?: string;
  palette: string[];
  generatedSrc?: string | null;
  aiLabel?: string;
  graphicOnlyLabel?: string;
  ctaComment: string;
}) {
  const dir = dirFor(packLang);
  const handle = handleOf(fields.pageName);
  return (
    <div
      ref={refEl}
      dir={dir}
      className="overflow-hidden rounded-xl border border-white/10 text-start"
      style={{ background: "#000", color: "#f5f5f5", fontFamily: "Helvetica, Arial, sans-serif" }}
    >
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <Avatar name={fields.pageName} logoUrl={logoUrl} ring size={32} />
        <p className="min-w-0 flex-1 truncate text-[13px] font-bold" style={{ margin: 0 }}>
          {handle}
        </p>
        <MoreHorizontal className="size-4 shrink-0" />
      </div>
      <AdVisual
        locale={packLang}
        palette={palette}
        asset={asset}
        urls={urls}
        overrideSrc={generatedSrc}
        aiLabel={aiLabel}
        graphicOnlyLabel={graphicOnlyLabel}
        kicker={fields.pageName}
        headline={fields.headline}
        body={fields.shortBody}
        cta={fields.cta}
        channel="instagram"
        className="aspect-[4/5] h-auto min-h-0 rounded-none p-0"
      />
      <div className="flex items-center gap-3.5 px-3 py-2">
        <Heart style={{ width: 24, height: 24 }} />
        <MessageCircle style={{ width: 24, height: 24 }} />
        <Send style={{ width: 24, height: 24 }} />
        <span className="ms-auto">
          <Bookmark style={{ width: 24, height: 24 }} />
        </span>
      </div>
      <p className="px-3 text-[13px] leading-snug" style={{ margin: 0 }}>
        <strong>{handle}</strong> {fields.headline}{" "}
        <span style={{ color: "#a8a8a8" }}>{fields.shortBody}</span>
      </p>
      <p className="px-3 pb-3 pt-1.5 text-[12px]" style={{ color: "#a8a8a8", margin: 0 }}>
        <strong style={{ color: "#f5f5f5" }}>{handle}</strong> {ctaComment}: {fields.cta}
      </p>
    </div>
  );
}

export function TikTokFeedCard({
  refEl,
  packLang,
  fields,
  asset,
  urls,
  logoUrl,
  palette,
  generatedSrc,
  aiLabel,
  graphicOnlyLabel,
  like,
}: {
  refEl?: RefObject<HTMLDivElement | null>;
  packLang: Locale;
  fields: ReturnType<typeof channelFields>;
  asset?: MediaAssetMeta;
  urls: Record<string, string>;
  logoUrl?: string;
  palette: string[];
  generatedSrc?: string | null;
  aiLabel?: string;
  graphicOnlyLabel?: string;
  like: string;
}) {
  const dir = dirFor(packLang);
  const handle = handleOf(fields.pageName);
  return (
    <div className="mx-auto w-full max-w-[280px]">
      <div
        ref={refEl}
        dir={dir}
        className="relative overflow-hidden rounded-[28px] border-[3px] border-zinc-600 bg-black text-start shadow-[0_0_0_2px_#111]"
        style={{ fontFamily: "Helvetica, Arial, sans-serif", color: "#fff" }}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center pt-2">
          <span className="h-1.5 w-24 rounded-full bg-zinc-800" />
        </div>
        <AdVisual
          locale={packLang}
          palette={palette}
          asset={asset}
          urls={urls}
          overrideSrc={generatedSrc}
          aiLabel={aiLabel}
          graphicOnlyLabel={graphicOnlyLabel}
          kicker={fields.pageName}
          headline={fields.headline}
          body={fields.shortBody}
          cta={fields.tiktokCta}
          channel="tiktok"
          className="aspect-[9/16] h-auto min-h-0 rounded-none p-0"
        />
        {/* TikTok chrome keeps the engagement stack on the physical right, like the real app. */}
        <div className="absolute right-2 bottom-24 z-[2] flex flex-col items-center gap-4 text-white">
          <Avatar name={fields.pageName} logoUrl={logoUrl} size={44} bg="#fe2c55" />
          <span className="flex flex-col items-center gap-0.5">
            <Heart className="size-8 fill-white" />
            <span className="text-[11px] font-bold">128</span>
          </span>
          <span className="flex flex-col items-center gap-0.5">
            <MessageCircle className="size-8" />
            <span className="text-[11px] font-bold">24</span>
          </span>
          <span className="flex flex-col items-center gap-0.5">
            <Share2 className="size-8" />
            <span className="text-[11px] font-bold">{like}</span>
          </span>
          <span className="flex size-10 items-center justify-center rounded-full bg-zinc-800 ring-2 ring-white/20">
            <Music2 className="size-4" />
          </span>
        </div>
        <div className="absolute inset-x-0 bottom-0 z-[2] bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3 pb-4 pt-16">
          <p className="text-[13px] font-extrabold" style={{ margin: 0 }}>
            @{handle}
          </p>
          <p className="mt-1 line-clamp-3 text-[12px] leading-snug text-white/90" style={{ margin: 0 }}>
            {fields.tiktokCaption}
          </p>
          <span
            className="mt-2 inline-block rounded-md px-3 py-1 text-[11px] font-black"
            style={{ background: "#fe2c55", color: "#fff" }}
          >
            {fields.tiktokCta}
          </span>
        </div>
      </div>
    </div>
  );
}

export function LivePreviewStrip({
  pack,
  packLang,
  generatedImage,
  onGeneratedImage,
  showDownloads = true,
}: {
  pack: CampaignPack;
  packLang: Locale;
  generatedImage?: string | null;
  onGeneratedImage?: (dataUrl: string | null) => void;
  showDownloads?: boolean;
}) {
  const { t } = useI18n();
  const pals = palettes(pack.intake);
  const fbPalette = pals[0] ?? ["#111111", "#1877F2", "#F5C518"];
  const igPalette = pals[1] ?? pals[0] ?? ["#050505", "#E1306C", "#F5C518"];
  const ttPalette = pals[2] ?? pals[0] ?? ["#010101", "#FE2C55", "#25F4EE"];
  const assets = pack.intake.mediaAssets ?? [];
  const urls = useResolvedAssets(assets);
  const fields = channelFields(pack, packLang);
  const logo = pickLogo(assets);
  const logoUrl = logo ? logo.publicSrc || urls[logo.id] : undefined;
  const fbRef = useRef<HTMLDivElement>(null);
  const igRef = useRef<HTMLDivElement>(null);
  const ttRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [imgError, setImgError] = useState("");
  const [localImg, setLocalImg] = useState<string | null>(null);
  const generatedSrc = generatedImage ?? localImg;
  const aiLabel = generatedSrc ? t("end.aiGenerated") : undefined;
  const graphicOnlyLabel = t("end.graphicOnly");
  const autoKey = useRef("");

  function imagenFailCopy(reason?: string): string {
    if (reason === "quota") return t("end.imagenQuota");
    if (reason === "vertex_denied") return t("end.imagenVertexDenied");
    if (reason === "not_configured") return t("end.imagenNotConfigured");
    return t("end.imagenError");
  }

  async function generateImage() {
    setBusy("imagen");
    setImgError("");
    try {
      const res = await fetch("/api/imagen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: pack.intake.businessName,
          category: pack.intake.category,
          headline: fields.headline,
          locale: packLang,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; mime?: string; imageBase64?: string; reason?: string };
      if (!data?.ok || !data.imageBase64) {
        setImgError(imagenFailCopy(data?.reason));
        return;
      }
      const mime = data.mime && data.mime.startsWith("image/") ? data.mime : "image/png";
      const dataUrl = `data:${mime};base64,${data.imageBase64}`;
      setLocalImg(dataUrl);
      onGeneratedImage?.(dataUrl);
    } catch {
      setImgError(t("end.imagenError"));
    } finally {
      setBusy(null);
    }
  }

  useEffect(() => {
    const hasUserPhoto = (pack.intake.mediaAssets ?? []).some((a) => a.kind === "image");
    if (hasUserPhoto) return;
    if (generatedImage || localImg) return;
    const key = pack.id;
    if (autoKey.current === key || autoImagenPacks.has(key)) return;
    autoKey.current = key;
    autoImagenPacks.add(key);
    void generateImage();
    // Auto-fill once per pack when there is no user photo and no generated still.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pack.id, generatedImage]);

  async function savePng(which: "fb" | "ig" | "tt") {
    setBusy(which);
    try {
      const node = which === "fb" ? fbRef.current : which === "ig" ? igRef.current : ttRef.current;
      const name =
        which === "fb"
          ? `sawek-facebook-${pack.id}.png`
          : which === "ig"
            ? `sawek-instagram-${pack.id}.png`
            : `sawek-tiktok-${pack.id}.png`;
      const width = which === "tt" ? 1080 : which === "ig" ? 1080 : 1200;
      await downloadNodePng(node, name, width);
    } finally {
      setBusy(null);
    }
  }

  const cardProps = {
    packLang,
    fields,
    urls,
    logoUrl,
    generatedSrc,
    aiLabel,
    graphicOnlyLabel,
  };

  return (
    <section data-live-preview="feed" className="mb-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-white">{t("end.previewTitle")}</h2>
          <p className="mt-1 text-sm text-zinc-400">{t("end.previewLead")}</p>
        </div>
        <Button type="button" onClick={() => void generateImage()} disabled={busy === "imagen"}>
          {busy === "imagen" ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
          {busy === "imagen" ? t("end.generatingImage") : t("end.generateImage")}
        </Button>
      </div>
      {imgError ? <p className="mt-2 text-xs text-omni-red">{imgError}</p> : null}

      <div className="mt-5 grid items-start gap-4 lg:grid-cols-3">
        <article className="rounded-2xl border border-white/10 bg-omni-card p-4">
          <p className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-omni-yellow">
            {t("end.facebook")} · 1.91:1
          </p>
          <FacebookFeedCard
            refEl={fbRef}
            {...cardProps}
            asset={pickAsset(assets, 0)}
            palette={fbPalette}
            sponsored={t("end.sponsored")}
            like={t("end.like")}
            comment={t("end.comment")}
            share={t("end.share")}
          />
          {showDownloads ? (
            <Button type="button" variant="dark" className="mt-3 w-full" onClick={() => void savePng("fb")} disabled={busy === "fb"}>
              <Download className="size-4" />
              {t("end.fbButton")}
            </Button>
          ) : null}
        </article>

        <article className="rounded-2xl border border-white/10 bg-omni-card p-4">
          <p className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-omni-yellow">
            {t("end.instagram")} · 4:5
          </p>
          <InstagramFeedCard
            refEl={igRef}
            {...cardProps}
            asset={pickAsset(assets, 1)}
            palette={igPalette}
            ctaComment={t("end.ctaComment")}
          />
          {showDownloads ? (
            <Button type="button" variant="dark" className="mt-3 w-full" onClick={() => void savePng("ig")} disabled={busy === "ig"}>
              <Download className="size-4" />
              {t("end.igButton")}
            </Button>
          ) : null}
        </article>

        <article className="rounded-2xl border border-white/10 bg-omni-card p-4">
          <p className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-omni-yellow">
            {t("end.tiktok")} · 9:16
          </p>
          <TikTokFeedCard
            refEl={ttRef}
            {...cardProps}
            asset={pickAsset(assets, 2)}
            palette={ttPalette}
            like={t("end.share")}
          />
          {showDownloads ? (
            <Button type="button" variant="dark" className="mt-3 w-full" onClick={() => void savePng("tt")} disabled={busy === "tt"}>
              <Download className="size-4" />
              {t("end.tiktokButton")}
            </Button>
          ) : null}
        </article>
      </div>
    </section>
  );
}
