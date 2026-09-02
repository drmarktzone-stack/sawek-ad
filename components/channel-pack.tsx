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
import { channelFields, waMeUrl } from "@/lib/channel-copy";
import { cn } from "@/lib/utils";
import { stylesForVertical } from "@/lib/design-styles";
import { detectVertical } from "@/lib/vertical";
import { paletteForIntake } from "@/lib/brand-kit";
import { PackLandingScreen } from "@/components/pack-landing";
import { ResizeStrip } from "@/components/resize-strip";
import { PostingWeek } from "@/components/posting-week";
import { DeliveryKitButton } from "@/components/delivery-kit-button";
import {
  FacebookFeedCard,
  InstagramFeedCard,
  LivePreviewStrip,
  TikTokFeedCard,
} from "@/components/live-preview-cards";

const FB_PALETTE = ["#111111", "#1877F2", "#F5C518"];
const LP_PALETTE = ["#050505", "#F5C518", "#FF1A1A"];

function palettesForPack(intake: CampaignPack["intake"]): [string, string, string][] {
  const brand = paletteForIntake(intake);
  const styles = stylesForVertical(detectVertical(intake)).map((st) => st.palette);
  if (intake.brandKit?.source === "scan" && (intake.brandKit.colors?.length ?? 0) >= 2) {
    return [brand, ...styles.filter((p) => p[0] !== brand[0])];
  }
  return styles.length ? styles : [brand];
}

export function ChannelPack({
  pack,
  packLang,
  generatedImage,
  onGeneratedImage,
  onPack,
  skipLivePreview = false,
}: {
  pack: CampaignPack;
  packLang: Locale;
  generatedImage?: string | null;
  onGeneratedImage?: (dataUrl: string | null) => void;
  onPack?: (p: CampaignPack) => void;
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
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black text-navy">{t("end.title")}</h2>
            <p className="mt-1 text-sm text-muted">{t("end.lead")}</p>
          </div>
          <DeliveryKitButton pack={pack} />
        </div>
      ) : (
        <LivePreviewStrip
          pack={pack}
          packLang={packLang}
          generatedImage={generatedImage}
          onGeneratedImage={onGeneratedImage}
          onPack={onPack}
        />
      )}

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-navy/10 bg-white p-4">
          <p className="mb-3 text-[13px] font-black uppercase tracking-[0.14em] text-omni-yellow">
            {t("end.whatsapp")}
          </p>
          <WhatsAppFrame
            dir={dir}
            packLang={packLang}
            fields={fields}
            number={pack.intake.whatsapp}
            missing={t("end.incomplete")}
            accent={accent}
            palette={pals[3] ?? pals[0] ?? FB_PALETTE}
            asset={pickAsset(assets, 0)}
            urls={urls}
            generatedSrc={generatedImage}
            aiLabel={generatedImage ? t("end.aiGenerated") : undefined}
            graphicOnlyLabel={t("end.graphicOnly")}
          />
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
              <p className="mt-2 text-sm leading-relaxed text-muted">{t("end.waMissing")}</p>
            </>
          )}
        </article>

        <article className="rounded-2xl border border-navy/10 bg-white p-4">
          <p className="mb-3 text-[13px] font-black uppercase tracking-[0.14em] text-omni-yellow">
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
                {t("end.clientLanding")}
              </LangLink>
            </Button>
          </div>
        </article>
      </div>

      <ResizeStrip pack={pack} packLang={packLang} generatedImage={generatedImage} />
      <PostingWeek pack={pack} locale={packLang} />

      <div className="mt-5 rounded-2xl border border-omni-yellow/25 bg-white p-4">
        <Button type="button" disabled className="w-full sm:w-auto" title={t("end.publishNeedLogin")}>
          {t("end.publish")}
        </Button>
        <p className="mt-2 text-xs leading-relaxed text-muted">{t("end.publishHint")}</p>
        <p className="mt-1 text-sm font-bold uppercase tracking-wide text-omni-yellow">
          {t("end.publishNeedLogin")}
        </p>
      </div>
    </section>
  );
}

function WhatsAppFrame({
  dir,
  packLang,
  fields,
  number,
  missing,
  accent,
  palette,
  asset,
  urls,
  generatedSrc,
  aiLabel,
  graphicOnlyLabel,
}: {
  dir: "rtl" | "ltr";
  packLang: Locale;
  fields: ReturnType<typeof channelFields>;
  number: string;
  missing: string;
  accent: string;
  palette: string[];
  asset?: MediaAssetMeta;
  urls: Record<string, string>;
  generatedSrc?: string | null;
  aiLabel?: string;
  graphicOnlyLabel?: string;
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
        <AdVisual
          locale={packLang}
          palette={palette}
          asset={asset}
          urls={urls}
          overrideSrc={generatedSrc}
          aiLabel={aiLabel}
          graphicOnlyLabel={graphicOnlyLabel}
          kicker={fields.pageName}
          headline={fields.posterHeadline}
          body={fields.posterSupport}
          cta={fields.cta}
          hoursChips={fields.hoursChips}
          channel="whatsapp"
          className="mb-2.5 aspect-square h-auto min-h-[160px] rounded-lg p-0"
        />
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
      className={cn("overflow-hidden rounded-xl bg-white text-foreground", compact && "border border-navy/10")}
    >
      <AdVisual
        locale={packLang}
        palette={palette}
        asset={asset}
        urls={urls}
        overrideSrc={generatedSrc}
        className={compact ? "h-40 p-4" : "min-h-[280px] p-6"}
      >
        <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-omni-yellow">{fields.pageName}</p>
        <h3 className={cn("mt-1 font-black leading-tight text-navy", compact ? "text-xl" : "text-3xl")}>
          {fields.headline}
        </h3>
      </AdVisual>
      <div className="space-y-2 p-4">
        <p className="text-sm leading-relaxed text-muted">{fields.shortBody}</p>
        {loc ? <p className="text-xs text-muted">{loc}</p> : null}
        {hours ? <p className="text-sm leading-relaxed text-muted">{hours.split(/[·\n]/)[0]}</p> : null}
        <span
          className="inline-block rounded-full px-3 py-1 text-xs font-black"
          style={{ background: accent, color: "#1B2A4A" }}
        >
          {fields.cta}
        </span>
      </div>
    </div>
  );
}

export { PackLandingScreen };

export { FacebookFeedCard, InstagramFeedCard, TikTokFeedCard, LivePreviewStrip };
