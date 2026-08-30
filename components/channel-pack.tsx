"use client";

import { useState } from "react";
import { Copy, ExternalLink, Send } from "lucide-react";
import type { CampaignPack, Locale, MediaAssetMeta } from "@/lib/types";
import { dirFor } from "@/lib/i18n";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { AdVisual } from "@/components/ad-mockup";
import { pickAsset } from "@/lib/media-assets";
import { useResolvedAssets } from "@/lib/use-resolved-assets";
import { withLang } from "@/lib/locale-url";
import { LangLink } from "@/components/lang-link";
import { channelFields, incompleteLabel, waMeUrl } from "@/lib/channel-copy";
import { cn } from "@/lib/utils";
import { stylesForVertical } from "@/lib/design-styles";
import { detectVertical } from "@/lib/vertical";
import {
  FacebookFeedCard,
  InstagramFeedCard,
  LivePreviewStrip,
  TikTokFeedCard,
} from "@/components/live-preview-cards";

const FB_PALETTE = ["#111111", "#1877F2", "#F5C518"];
const LP_PALETTE = ["#050505", "#F5C518", "#FF1A1A"];

function palettesForPack(intake: CampaignPack["intake"]): [string, string, string][] {
  const styles = stylesForVertical(detectVertical(intake));
  return styles.map((st) => st.palette);
}

export function ChannelPack({
  pack,
  packLang,
  generatedImage,
  onGeneratedImage,
  skipLivePreview = false,
}: {
  pack: CampaignPack;
  packLang: Locale;
  generatedImage?: string | null;
  onGeneratedImage?: (dataUrl: string | null) => void;
  skipLivePreview?: boolean;
}) {
  const { t } = useI18n();
  const dir = dirFor(packLang);
  const pals = palettesForPack(pack.intake);
  const lpPalette = pals[2] ?? pals[0] ?? LP_PALETTE;
  const accent = (pals[0] ?? FB_PALETTE)[1];
  const assets = pack.intake.mediaAssets ?? [];
  const urls = useResolvedAssets(assets);
  const fields = channelFields(pack, packLang);
  const waUrl = waMeUrl(pack.intake.whatsapp, fields.waScript, packLang);
  const [copied, setCopied] = useState<string | null>(null);
  const lpPath = `/lp/${pack.id}`;

  async function copyId(id: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1600);
  }

  function landingUrl(): string {
    const path = withLang(lpPath, packLang);
    if (typeof window === "undefined") return path;
    return `${window.location.origin}${path}`;
  }

  return (
    <section data-end-product="ready" className="mb-10">
      {skipLivePreview ? (
        <>
          <h2 className="text-2xl font-black text-white">{t("end.title")}</h2>
          <p className="mt-1 text-sm text-zinc-400">{t("end.lead")}</p>
        </>
      ) : (
        <LivePreviewStrip
          pack={pack}
          packLang={packLang}
          generatedImage={generatedImage}
          onGeneratedImage={onGeneratedImage}
        />
      )}

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-white/10 bg-omni-card p-4">
          <p className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-omni-yellow">
            {t("end.whatsapp")}
          </p>
          <WhatsAppFrame dir={dir} fields={fields} number={pack.intake.whatsapp} missing={t("end.incomplete")} accent={accent} />
          {waUrl ? (
            <Button type="button" className="mt-3 w-full" asChild>
              <a href={waUrl} target="_blank" rel="noreferrer">
                <Send className="size-4" />
                {t("end.openWa")}
              </a>
            </Button>
          ) : (
            <>
              <Button type="button" className="mt-3 w-full" disabled>
                <Send className="size-4" />
                {t("end.openWa")}
              </Button>
              <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">{t("end.waMissing")}</p>
            </>
          )}
        </article>

        <article className="rounded-2xl border border-white/10 bg-omni-card p-4">
          <p className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-omni-yellow">
            {t("end.landing")} · /lp/{pack.id}
          </p>
          <PackLandingCard
            pack={pack}
            packLang={packLang}
            fields={fields}
            asset={pickAsset(assets, 2)}
            urls={urls}
            palette={lpPalette}
            accent={accent}
            generatedSrc={generatedImage}
            compact
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              className="flex-1"
              onClick={() => void copyId("lp", landingUrl())}
            >
              <Copy className="size-4" />
              {copied === "lp" ? t("cta.copied") : t("end.copyLink")}
            </Button>
            <Button type="button" variant="dark" className="flex-1" asChild>
              <LangLink href={lpPath}>
                <ExternalLink className="size-4" />
                {t("end.openLp")}
              </LangLink>
            </Button>
          </div>
        </article>
      </div>

      <div className="mt-5 rounded-2xl border border-omni-yellow/25 bg-omni-card p-4">
        <Button type="button" disabled className="w-full sm:w-auto" title={t("end.publishNeedLogin")}>
          {t("end.publish")}
        </Button>
        <p className="mt-2 text-xs leading-relaxed text-zinc-400">{t("end.publishHint")}</p>
        <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-omni-yellow">
          {t("end.publishNeedLogin")}
        </p>
      </div>
    </section>
  );
}

function WhatsAppFrame({
  dir,
  fields,
  number,
  missing,
  accent,
}: {
  dir: "rtl" | "ltr";
  fields: ReturnType<typeof channelFields>;
  number: string;
  missing: string;
  accent: string;
}) {
  const shown = (number ?? "").trim() || missing;
  return (
    <div
      dir={dir}
      style={{ background: "#0b141a", color: "#e9edef", fontFamily: "Helvetica, Arial, sans-serif" }}
      className="overflow-hidden rounded-xl"
    >
      <div style={{ background: "#202c33", padding: "10px 12px" }}>
        <p style={{ margin: 0, fontWeight: 800, fontSize: 13 }}>{fields.pageName}</p>
        <p style={{ margin: 0, fontSize: 11, color: "#8696a0" }}>{shown}</p>
      </div>
      <div style={{ padding: 12, minHeight: 160, background: "#0b141a" }}>
        <div
          style={{
            maxWidth: "92%",
            background: "#005c4b",
            color: "#e9edef",
            borderRadius: dir === "rtl" ? "10px 10px 4px 10px" : "10px 10px 10px 4px",
            padding: "8px 10px",
            fontSize: 13,
            lineHeight: 1.5,
            whiteSpace: "pre-wrap",
          }}
        >
          {fields.waScript}
        </div>
        <p
          style={{
            margin: "10px 0 0",
            display: "inline-block",
            background: accent,
            color: "#050505",
            borderRadius: 999,
            padding: "4px 10px",
            fontSize: 11,
            fontWeight: 800,
          }}
        >
          {fields.cta}
        </p>
      </div>
    </div>
  );
}

function PackLandingCard({
  pack,
  packLang,
  fields,
  asset,
  urls,
  compact,
  palette,
  accent,
  generatedSrc,
}: {
  pack: CampaignPack;
  packLang: Locale;
  fields: ReturnType<typeof channelFields>;
  asset?: MediaAssetMeta;
  urls: Record<string, string>;
  compact?: boolean;
  palette: string[];
  accent: string;
  generatedSrc?: string | null;
}) {
  const loc = pack.intake.location?.trim() ?? "";
  const hours = pack.intake.clinicHours?.trim() ?? "";
  return (
    <div
      dir={dirFor(packLang)}
      style={{ background: "#0a0a0a", color: "#f4f4f4" }}
      className={cn("overflow-hidden rounded-xl", compact && "border border-white/10")}
    >
      <AdVisual
        locale={packLang}
        palette={palette}
        asset={asset}
        urls={urls}
        overrideSrc={generatedSrc}
        className={compact ? "h-40 p-4" : "min-h-[280px] p-6"}
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-omni-yellow">{fields.pageName}</p>
        <h3 className={cn("mt-1 font-black leading-tight text-white", compact ? "text-xl" : "text-3xl")}>
          {fields.headline}
        </h3>
      </AdVisual>
      <div className="space-y-2 p-4">
        <p className="text-sm leading-relaxed text-zinc-300">{fields.shortBody}</p>
        {loc ? <p className="text-xs text-zinc-500">{loc}</p> : null}
        {hours ? <p className="text-xs text-zinc-500">{hours}</p> : null}
        <span
          className="inline-block rounded-full px-3 py-1 text-xs font-black"
          style={{ background: accent, color: "#050505" }}
        >
          {fields.cta}
        </span>
      </div>
    </div>
  );
}

export function PackLandingScreen({ pack, locale }: { pack: CampaignPack; locale: Locale }) {
  const assets = pack.intake.mediaAssets ?? [];
  const urls = useResolvedAssets(assets);
  const fields = channelFields(pack, locale);
  const pals = palettesForPack(pack.intake);
  const lpPalette = pals[2] ?? pals[0] ?? LP_PALETTE;
  const accent = (pals[0] ?? LP_PALETTE)[1];
  const waUrl = waMeUrl(pack.intake.whatsapp, fields.waScript, locale);
  const loc = pack.intake.location?.trim() ?? "";
  const hours = pack.intake.clinicHours?.trim() ?? "";
  const site = pack.intake.website?.trim() ?? "";
  return (
    <div dir={dirFor(locale)} className="min-h-screen" style={{ background: "#050505", color: "#f4f4f4" }}>
      <AdVisual locale={locale} palette={lpPalette} asset={pickAsset(assets, 0)} urls={urls} className="min-h-[52vh] p-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-omni-yellow">{fields.pageName}</p>
        <h1 className="mt-2 max-w-3xl text-4xl font-black leading-tight text-white sm:text-5xl">{fields.headline}</h1>
        {waUrl ? (
          <a
            href={waUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-block rounded-full px-5 py-2 text-sm font-black"
            style={{ background: accent, color: "#050505" }}
          >
            {fields.cta}
          </a>
        ) : (
          <span
            className="mt-5 inline-block rounded-full px-5 py-2 text-sm font-black"
            style={{ background: accent, color: "#050505" }}
          >
            {fields.cta}
          </span>
        )}
      </AdVisual>
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-8">
        <p className="whitespace-pre-wrap text-base leading-relaxed text-zinc-300">{fields.body}</p>
        {loc ? <p className="text-sm text-zinc-400">{loc}</p> : null}
        {hours ? <p className="text-sm text-zinc-400">{hours}</p> : null}
        {site ? (
          <a
            href={site.startsWith("http") ? site : `https://${site}`}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-bold text-omni-yellow"
          >
            {site}
          </a>
        ) : null}
        {fields.landingBody && fields.landingBody !== incompleteLabel(locale) ? (
          <pre className="whitespace-pre-wrap font-sans text-sm leading-6 text-zinc-400">{fields.landingBody}</pre>
        ) : null}
      </div>
    </div>
  );
}

export { FacebookFeedCard, InstagramFeedCard, TikTokFeedCard, LivePreviewStrip };
