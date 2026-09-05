"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ImagePlus, Loader2, X } from "lucide-react";
import type { CampaignPack, Locale, MediaAssetMeta } from "@/lib/types";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { graphicPostersForIntake, posterToAsset } from "@/lib/graphic-posters";
import { assetsFromPublicUrls, isOfferedAsset, stockToAsset } from "@/lib/media-assets";
import { buildSiteAudit } from "@/lib/engine/site-audit";
import { syncCampaign } from "@/lib/supabase";
import { detectVertical } from "@/lib/vertical";
import { IMAGEN_PICKER_COUNT } from "@/lib/imagen-scenes";
import { cn } from "@/lib/utils";

export type OfferKind = "graphic" | "imagen" | "site" | "stock";

export type OfferOption = {
  id: string;
  kind: OfferKind;
  label: string;
  src: string;
  asset: MediaAssetMeta;
};

type StockHit = {
  id: string;
  thumb: string;
  full: string;
  title: string;
  attribution: string;
  source: string;
};

function packWithAssets(pack: CampaignPack, assets: MediaAssetMeta[]): CampaignPack {
  const intake = { ...pack.intake, mediaAssets: assets };
  return {
    ...pack,
    intake,
    siteAudit: buildSiteAudit(intake),
    saved: true,
    updatedAt: new Date().toISOString(),
  };
}

function primaryPhoto(assets: MediaAssetMeta[] | undefined): MediaAssetMeta | undefined {
  const list = assets ?? [];
  return list.find((a) => a.kind === "image" && a.label !== "logo" && isOfferedAsset(a))
    ?? list.find((a) => a.kind === "image" && a.label !== "logo");
}

function keepNonOffered(assets: MediaAssetMeta[] | undefined, dropId?: string): MediaAssetMeta[] {
  return (assets ?? []).filter((a) => {
    if (dropId && a.id === dropId) return false;
    if (a.label === "logo") return true;
    if (isOfferedAsset(a)) return false;
    return true;
  });
}

function hitsToOptions(hits: StockHit[], t: (k: string) => string): OfferOption[] {
  return hits
    .filter((img) => {
      const ok = (u: string) => /^https:\/\//i.test(u) || u.startsWith("data:image/");
      return ok(img.thumb) && ok(img.full);
    })
    .map((img) => {
      const vertex = img.source === "vertex" || img.id.startsWith("vertex-");
      return {
        id: img.id,
        kind: (vertex ? "imagen" : "stock") as OfferKind,
        label: img.title || (vertex ? t("audit.aiStill") : t("audit.tabStock")),
        src: img.thumb,
        asset: stockToAsset(img),
      };
    });
}

export function ImageOfferPicker({
  pack,
  locale,
  onPack,
  open: openProp,
  onOpenChange,
  defaultOpen = true,
}: {
  pack: CampaignPack;
  locale: Locale;
  onPack?: (p: CampaignPack) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
}) {
  const { t } = useI18n();
  const vertical = detectVertical(pack.intake);
  const hasOffered = (pack.intake.mediaAssets ?? []).some((a) => a.kind === "image" && isOfferedAsset(a));
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = openProp ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const posters = useMemo(
    () => graphicPostersForIntake(pack.intake),
    [pack.intake.category, pack.intake.businessName, pack.intake.operatingModel, pack.intake.description],
  );
  const existingSite = useMemo(() => {
    return (pack.intake.mediaAssets ?? [])
      .filter((a) => {
        if (a.kind !== "image") return false;
        if (a.label === "logo") return false;
        if (isOfferedAsset(a)) return false;
        const src = a.publicSrc || "";
        if (!src || /\.svg(\?|$)/i.test(src)) return false;
        if (/\/icons?\/|apple-touch|favicon|sprite/i.test(src)) return false;
        return true;
      })
      .slice(0, 16)
      .map((asset, i) => ({
        id: `pack-site-${asset.id}`,
        kind: "site" as const,
        label: `${t("audit.sitePhoto")} ${i + 1}`,
        src: asset.publicSrc || "",
        asset: { ...asset, note: asset.note?.startsWith("offer:site:") ? asset.note : `offer:site:${asset.publicSrc || asset.note}` },
      }));
  }, [pack.intake.mediaAssets, t]);

  const [imagen, setImagen] = useState<OfferOption[]>([]);
  const [site, setSite] = useState<OfferOption[]>([]);
  const [stock, setStock] = useState<OfferOption[]>([]);
  const [stockLoaded, setStockLoaded] = useState(false);
  const [stockBusy, setStockBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [siteBusy, setSiteBusy] = useState(false);
  const [imgError, setImgError] = useState("");

  const graphicOpts: OfferOption[] = posters.map((p) => ({
    id: p.id,
    kind: "graphic",
    label: p.name[locale],
    src: p.dataUrl,
    asset: posterToAsset(p, p.name[locale]),
  }));

  const selected = primaryPhoto(pack.intake.mediaAssets);
  const selectedSrc = selected?.publicSrc || "";

  function optionSelected(opt: OfferOption): boolean {
    if (!selectedSrc && !selected) return false;
    if (selectedSrc && (opt.src === selectedSrc || opt.asset.publicSrc === selectedSrc)) return true;
    if (selected && (opt.asset.note === selected.note || opt.id === selected.id)) return true;
    return false;
  }

  async function loadImagen() {
    setAiBusy(true);
    setImgError("");
    try {
      const params = new URLSearchParams({
        source: "imagen",
        vertical,
        category: pack.intake.category || "",
        location: pack.intake.location || "",
        q: (pack.intake.description || pack.intake.uniqueAdvantage || "").slice(0, 160),
        description: (pack.intake.description || "").slice(0, 160),
        offer: (pack.intake.offer || "").slice(0, 80),
        limit: String(IMAGEN_PICKER_COUNT),
      });
      const res = await fetch(`/api/stock-images?${params.toString()}`);
      const data = (await res.json()) as {
        ok?: boolean;
        imagen?: StockHit[];
        images?: StockHit[];
        curated?: StockHit[];
        imagenRequested?: number;
        imagenGot?: number;
        emptyMessage?: string;
      };
      const imagenHits = data.imagen ?? [];
      const opts = hitsToOptions(imagenHits, t).filter((o) => o.kind === "imagen");
      setImagen(opts);
      if (!opts.length && data.emptyMessage && !stock.length) {
        setImgError(data.emptyMessage);
      }
    } catch {
      setImgError(t("audit.retryVertex"));
    } finally {
      setAiBusy(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    void loadImagen();
    void loadFreeStock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pack.id, pack.intake.category, pack.intake.description, pack.intake.offer]);

  useEffect(() => {
    if (!open) return;
    const website = pack.intake.website?.trim() ?? "";
    if (!/^https?:\/\//i.test(website)) return;
    let cancelled = false;
    setSiteBusy(true);
    (async () => {
      try {
        const res = await fetch("/api/ingest-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: website }),
        });
        const data = (await res.json()) as { ok?: boolean; images?: string[]; ogImage?: string; logo?: string };
        if (cancelled || !data?.ok) return;
        const urls = [...(data.images ?? [])];
        if (data.ogImage && !urls.includes(data.ogImage)) urls.unshift(data.ogImage);
        if (data.logo && !urls.includes(data.logo)) urls.push(data.logo);
        const assets = assetsFromPublicUrls(urls, pack.intake.businessName, 16).filter((a) => {
          if (a.label === "logo") return false;
          const src = a.publicSrc || "";
          if (/\.svg(\?|$)/i.test(src)) return false;
          if (/\/icons?\/|apple-touch|favicon|sprite/i.test(src)) return false;
          return true;
        });
        if (!cancelled) {
          setSite(
            assets.map((asset, i) => ({
              id: `site-${asset.id}`,
              kind: "site" as const,
              label: `${t("audit.sitePhoto")} ${i + 1}`,
              src: asset.publicSrc || "",
              asset: { ...asset, note: `offer:site:${asset.publicSrc || asset.note}` },
            })),
          );
        }
      } catch {
        /* ingest optional */
      } finally {
        if (!cancelled) setSiteBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pack.id, pack.intake.website]);

  async function loadFreeStock() {
    if (stockBusy) return;
    setStockBusy(true);
    try {
      const params = new URLSearchParams({
        source: "live",
        vertical,
        category: pack.intake.category || "",
        location: pack.intake.location || "",
        q: (pack.intake.description || pack.intake.uniqueAdvantage || "").slice(0, 160),
        description: (pack.intake.description || "").slice(0, 160),
        offer: (pack.intake.offer || "").slice(0, 80),
        limit: "48",
        page: "1",
      });
      const res = await fetch(`/api/stock-images?${params.toString()}`);
      const data = (await res.json()) as { images?: StockHit[]; emptyMessage?: string };
      const opts = hitsToOptions(data.images ?? [], t).filter((o) => o.kind === "stock");
      setStock(opts);
      setStockLoaded(true);
      if (!opts.length && data.emptyMessage) setImgError(data.emptyMessage);
      else if (opts.length) setImgError("");
    } catch {
      setStock([]);
      setStockLoaded(true);
    } finally {
      setStockBusy(false);
    }
  }

  function apply(opt: OfferOption) {
    if (!onPack) return;
    if (optionSelected(opt)) {
      const next = packWithAssets(pack, keepNonOffered(pack.intake.mediaAssets));
      onPack(next);
      void syncCampaign(next);
      return;
    }
    const next = packWithAssets(pack, [opt.asset, ...keepNonOffered(pack.intake.mediaAssets, opt.asset.id)]);
    onPack(next);
    void syncCampaign(next);
  }

  function clearSelection() {
    if (!onPack) return;
    const next = packWithAssets(pack, keepNonOffered(pack.intake.mediaAssets));
    onPack(next);
    void syncCampaign(next);
  }

  const siteOpts = site.length ? site : existingSite;
  const liveCount = siteOpts.length + stock.length;
  const shown = liveCount
    ? [...siteOpts, ...stock, ...imagen]
    : imagen.length
      ? [...imagen, ...graphicOpts.slice(0, 4)]
      : graphicOpts;
  const making = t("audit.loadingStock");
  const liveBusy = stockBusy || siteBusy;

  function Tile({ opt }: { opt: OfferOption }) {
    const on = optionSelected(opt);
    return (
      <button
        type="button"
        onClick={() => apply(opt)}
        className={cn(
          "relative overflow-hidden rounded-[14px] border text-start transition",
          on ? "border-ink ring-2 ring-teal/40 ring-offset-2 ring-offset-white" : "border-[rgba(8,17,31,0.12)] hover:border-teal/50",
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={opt.src} alt="" className="aspect-square w-full object-cover" referrerPolicy="no-referrer" />
        {on ? (
          <span className="absolute start-1.5 top-1.5 inline-flex size-6 items-center justify-center rounded-full bg-navy text-white shadow">
            <Check className="size-3.5 stroke-[3]" />
          </span>
        ) : null}
        <span className="block truncate bg-white px-2 py-1.5 text-[12px] font-semibold text-navy">
          {opt.kind === "imagen"
            ? t("audit.aiStill")
            : opt.kind === "site"
              ? t("audit.sitePhoto")
              : opt.kind === "stock"
                ? t("audit.tabStock")
                : opt.label}
        </span>
      </button>
    );
  }

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" onClick={() => setOpen(!open)}>
          {aiBusy || siteBusy || stockBusy ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
          {t("audit.offerPhotos")}
        </Button>
        {hasOffered ? (
          <Button type="button" size="sm" variant="outline" onClick={clearSelection}>
            <X className="size-4" />
            {t("audit.clearSelection")}
          </Button>
        ) : null}
      </div>
      {open ? (
        <div className="agency-board mt-3 p-5">
          <p className="text-base leading-relaxed text-navy">{t("audit.offerPhotosLead")}</p>
          {liveBusy || aiBusy ? (
            <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-navy">
              <Loader2 className="size-4 animate-spin text-teal" />
              {making}
            </p>
          ) : null}
          {!liveBusy && stockLoaded && !stock.length && imgError ? (
            <div className="agency-empty mt-3 flex flex-wrap items-center gap-3 rounded-2xl p-4">
              <p className="text-base font-semibold text-navy/80">{t("audit.stockEmpty")}</p>
              <Button type="button" size="sm" variant="outline" onClick={() => void loadFreeStock()}>
                {t("audit.loadMore")}
              </Button>
            </div>
          ) : null}

          <div className="mt-4 max-h-[70vh] overflow-y-auto pe-1">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6">
              {shown.map((opt) => (
                <Tile key={opt.id} opt={opt} />
              ))}
              {liveBusy
                ? Array.from({ length: Math.max(0, 12 - shown.length) }).map((_, i) => (
                    <div
                      key={`sk-${i}`}
                      className="agency-skeleton aspect-square rounded-2xl border border-teal/20"
                    />
                  ))
                : null}
              {!liveBusy && !shown.length ? (
                <div className="agency-empty col-span-full flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-[22px] p-6 text-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/textures/empty-frame.svg" alt="" className="h-36 w-36 opacity-90" />
                  <p className="max-w-sm text-base font-semibold text-navy/70">{t("audit.stockEmpty")}</p>
                </div>
              ) : null}
            </div>

            <p className="mt-3 text-[12px] text-muted">{t("audit.stockCredit")}</p>

            <Accordion type="single" collapsible className="mt-2">
              <AccordionItem value="ai">
                <AccordionTrigger>{t("audit.moreAi")}</AccordionTrigger>
                <AccordionContent>
                  {aiBusy && !imagen.length ? (
                    <p className="flex items-center gap-2 text-sm font-semibold text-navy">
                      <Loader2 className="size-4 animate-spin text-teal" />
                      {t("audit.makingVertex")}
                    </p>
                  ) : null}
                  {imagen.length ? (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-6">
                      {imagen.map((opt) => (
                        <Tile key={`ai-${opt.id}`} opt={opt} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-navy/70">{t("audit.imagenDown")}</p>
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" variant="outline" disabled={aiBusy} onClick={() => void loadImagen()}>
              {aiBusy ? <Loader2 className="size-4 animate-spin" /> : null}
              {t("audit.retryImagen")}
            </Button>
            {hasOffered ? (
              <Button type="button" size="sm" variant="outline" onClick={clearSelection}>
                <X className="size-4" />
                {t("audit.clearSelection")}
              </Button>
            ) : null}
          </div>
          <p className="mt-2 text-[13px] text-muted">{t("audit.pickPhoto")}</p>
        </div>
      ) : null}
    </div>
  );
}

export { packWithAssets };
