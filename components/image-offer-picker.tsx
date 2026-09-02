"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ImagePlus, Loader2, X } from "lucide-react";
import type { CampaignPack, Locale, MediaAssetMeta } from "@/lib/types";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { graphicPostersForIntake, imagenToAsset, posterToAsset } from "@/lib/graphic-posters";
import { assetsFromPublicUrls, isOfferedAsset, stockToAsset } from "@/lib/media-assets";
import { buildSiteAudit } from "@/lib/engine/site-audit";
import { syncCampaign } from "@/lib/supabase";
import { detectVertical } from "@/lib/vertical";
import { cn } from "@/lib/utils";

export type OfferKind = "graphic" | "imagen" | "site" | "stock";

export type OfferOption = {
  id: string;
  kind: OfferKind;
  label: string;
  src: string;
  asset: MediaAssetMeta;
};

type Tab = "all" | "site" | "stock" | "graphic" | "ai";

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
  const hasOffered = (pack.intake.mediaAssets ?? []).some((a) => a.kind === "image" && isOfferedAsset(a));
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = openProp ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const posters = useMemo(
    () => graphicPostersForIntake(pack.intake),
    [pack.intake.category, pack.intake.businessName, pack.intake.operatingModel],
  );
  const [imagen, setImagen] = useState<OfferOption[]>([]);
  const [site, setSite] = useState<OfferOption[]>([]);
  const [stock, setStock] = useState<OfferOption[]>([]);
  const [stockPage, setStockPage] = useState(1);
  const [stockNext, setStockNext] = useState<number | null>(1);
  const [stockBusy, setStockBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [siteBusy, setSiteBusy] = useState(false);
  const [imgError, setImgError] = useState("");
  const [tab, setTab] = useState<Tab>("all");

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

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setAiBusy(true);
    setImgError("");
    (async () => {
      try {
        const res = await fetch("/api/imagen", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            businessName: pack.intake.businessName,
            category: pack.intake.category,
            headline: pack.intake.uniqueAdvantage || pack.intake.businessName,
            locale,
          }),
        });
        const data = (await res.json()) as { ok?: boolean; mime?: string; imageBase64?: string; reason?: string };
        if (cancelled) return;
        if (!data?.ok || !data.imageBase64) {
          setImgError(t("audit.imagenDown"));
          return;
        }
        const mime = data.mime && data.mime.startsWith("image/") ? data.mime : "image/png";
        const dataUrl = `data:${mime};base64,${data.imageBase64}`;
        const asset = imagenToAsset(dataUrl, mime);
        setImagen((prev) => {
          if (prev.some((p) => p.src === dataUrl)) return prev;
          return [
            ...prev,
            {
              id: `imagen-${prev.length + 1}`,
              kind: "imagen" as const,
              label: t("audit.aiStill"),
              src: dataUrl,
              asset,
            },
          ].slice(0, 2);
        });
      } catch {
        if (!cancelled) setImgError(t("audit.imagenDown"));
      } finally {
        if (!cancelled) setAiBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pack.id]);

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
        const assets = assetsFromPublicUrls(urls, pack.intake.businessName, 16).filter((a) => a.label !== "logo");
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

  async function loadStock(page: number, append: boolean) {
    setStockBusy(true);
    try {
      const vertical = detectVertical(pack.intake);
      const params = new URLSearchParams({
        vertical,
        category: pack.intake.category || "",
        location: pack.intake.location || "",
        q: (pack.intake.description || pack.intake.uniqueAdvantage || "").slice(0, 160),
        limit: "48",
        page: String(page),
      });
      const res = await fetch(`/api/stock-images?${params.toString()}`);
      const data = (await res.json()) as {
        ok?: boolean;
        images?: StockHit[];
        nextPage?: number | null;
        page?: number;
      };
      const hits = data?.images ?? [];
      const opts: OfferOption[] = hits
        .filter((img) => {
          const ok = (u: string) => /^https:\/\//i.test(u) || u.startsWith("data:image/");
          return ok(img.thumb) && ok(img.full);
        })
        .map((img) => {
          const vertex = img.source === "vertex" || img.id.startsWith("vertex-");
          return {
            id: img.id,
            kind: (vertex ? "imagen" : "stock") as OfferKind,
            label: img.title || t("audit.tabStock"),
            src: img.thumb,
            asset: stockToAsset(img),
          };
        });
      setStock((prev) => {
        const merged = append ? [...prev, ...opts] : opts;
        const seen = new Set<string>();
        return merged.filter((o) => {
          if (seen.has(o.id) || seen.has(o.src)) return false;
          seen.add(o.id);
          seen.add(o.src);
          return true;
        });
      });
      setStockPage(data.page ?? page);
      setStockNext(data.nextPage ?? null);
    } catch {
      if (!append) setStock([]);
      setStockNext(null);
    } finally {
      setStockBusy(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    void loadStock(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pack.id, pack.intake.category, pack.intake.location]);

  async function moreAi() {
    if (aiBusy || imagen.length >= 2) return;
    setAiBusy(true);
    try {
      const res = await fetch("/api/imagen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: pack.intake.businessName,
          category: pack.intake.category,
          headline: pack.intake.uniqueAdvantage || pack.intake.businessName,
          locale,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; mime?: string; imageBase64?: string };
      if (!data?.ok || !data.imageBase64) {
        setImgError(t("audit.imagenDown"));
        return;
      }
      const mime = data.mime && data.mime.startsWith("image/") ? data.mime : "image/png";
      const dataUrl = `data:${mime};base64,${data.imageBase64}`;
      const asset = imagenToAsset(dataUrl, mime);
      setImagen((prev) =>
        [
          ...prev,
          {
            id: `imagen-${prev.length + 1}`,
            kind: "imagen" as const,
            label: t("audit.aiStill"),
            src: dataUrl,
            asset,
          },
        ].slice(0, 2),
      );
    } catch {
      setImgError(t("audit.imagenDown"));
    } finally {
      setAiBusy(false);
    }
  }

  function apply(opt: OfferOption) {
    if (!onPack) return;
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

  const tabs: { id: Tab; label: string }[] = [
    { id: "all", label: t("audit.tabAll") },
    { id: "site", label: t("audit.tabSite") },
    { id: "stock", label: t("audit.tabStock") },
    { id: "graphic", label: t("audit.tabGraphic") },
    { id: "ai", label: t("audit.tabAi") },
  ];

  const mainGrid: OfferOption[] = (() => {
    if (tab === "site") return site;
    if (tab === "stock") return stock;
    if (tab === "graphic") return graphicOpts;
    if (tab === "ai") return imagen;
    return [...stock, ...site, ...imagen];
  })();

  const showGraphicRow = tab === "all";
  const loadingMain = (tab === "stock" || tab === "all") && stockBusy && stock.length === 0;
  const skeletonCount = loadingMain ? 36 : Math.max(0, 36 - mainGrid.length);
  const showSkeletons = loadingMain || ((tab === "all" || tab === "stock") && stockBusy && mainGrid.length < 36);

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" onClick={() => setOpen(!open)}>
          {stockBusy || siteBusy || aiBusy ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
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
        <div className="mt-3 rounded-[22px] border border-navy/10 bg-white p-4 shadow-[0_10px_28px_rgba(27,42,74,0.07)]">
          <p className="text-sm leading-relaxed text-foreground">{t("audit.offerPhotosLead")}</p>
          {imgError ? <p className="mt-1 text-sm text-omni-red">{imgError}</p> : null}

          <div className="mt-3 flex flex-wrap gap-2">
            {tabs.map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => setTab(chip.id)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors",
                  tab === chip.id
                    ? "border-navy bg-navy text-white"
                    : "border-navy/15 bg-white text-navy hover:border-gold",
                )}
              >
                {chip.label}
              </button>
            ))}
            {hasOffered ? (
              <button
                type="button"
                onClick={clearSelection}
                className="rounded-full border border-omni-red/30 bg-white px-3 py-1.5 text-sm font-semibold text-omni-red hover:border-omni-red"
              >
                {t("audit.clearSelection")}
              </button>
            ) : null}
          </div>

          {loadingMain ? <p className="mt-2 text-[13px] text-muted">{t("audit.loadingStock")}</p> : null}

          <div className="mt-3 max-h-[70vh] overflow-y-auto pe-1">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6 lg:grid-cols-8">
              {mainGrid.map((opt) => {
                const on = optionSelected(opt);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => apply(opt)}
                    className={cn(
                      "relative overflow-hidden rounded-xl border text-start transition",
                      on ? "border-gold ring-2 ring-gold ring-offset-2 ring-offset-white" : "border-navy/15 hover:border-gold",
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={opt.src} alt="" className="aspect-square w-full object-cover" referrerPolicy="no-referrer" />
                    {on ? (
                      <span className="absolute start-1.5 top-1.5 inline-flex size-6 items-center justify-center rounded-full bg-gold text-navy shadow">
                        <Check className="size-3.5 stroke-[3]" />
                      </span>
                    ) : null}
                    <span className="block truncate bg-white px-2 py-1.5 text-[12px] font-bold text-navy">
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
              })}
              {showSkeletons
                ? Array.from({ length: skeletonCount }).map((_, i) => (
                    <div
                      key={`sk-${i}`}
                      className="aspect-square animate-pulse rounded-xl border border-navy/10 bg-navy/5"
                    />
                  ))
                : null}
            </div>

            {tab === "stock" && !stockBusy && stock.length === 0 ? (
              <p className="mt-3 text-sm text-muted">{t("audit.stockEmpty")}</p>
            ) : null}

            {showGraphicRow ? (
              <div className="mt-4">
                <p className="mb-2 text-[12px] font-black uppercase tracking-[0.14em] text-gold">
                  {t("audit.graphicFallback")}
                </p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {graphicOpts.map((opt) => {
                    const on = optionSelected(opt);
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => apply(opt)}
                        className={cn(
                          "relative w-24 shrink-0 overflow-hidden rounded-xl border text-start",
                          on ? "border-gold ring-2 ring-gold" : "border-navy/15 hover:border-gold",
                        )}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={opt.src} alt="" className="aspect-[4/5] w-full object-cover" />
                        {on ? (
                          <span className="absolute start-1 top-1 inline-flex size-5 items-center justify-center rounded-full bg-gold text-navy">
                            <Check className="size-3 stroke-[3]" />
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {(tab === "all" || tab === "stock") && stockNext ? (
              <Button type="button" size="sm" variant="outline" disabled={stockBusy} onClick={() => void loadStock(stockPage + 1, true)}>
                {stockBusy ? <Loader2 className="size-4 animate-spin" /> : null}
                {t("audit.loadMore")}
              </Button>
            ) : null}
            {(tab === "all" || tab === "ai") && imagen.length < 2 ? (
              <Button type="button" size="sm" variant="outline" disabled={aiBusy} onClick={() => void moreAi()}>
                {aiBusy ? <Loader2 className="size-4 animate-spin" /> : null}
                {t("audit.moreAi")}
              </Button>
            ) : null}
            {hasOffered ? (
              <Button type="button" size="sm" variant="outline" onClick={clearSelection}>
                <X className="size-4" />
                {t("audit.clearSelection")}
              </Button>
            ) : null}
          </div>
          <p className="mt-2 text-[13px] text-muted">{t("audit.pickPhoto")}</p>
          <p className="mt-1 text-[12px] text-muted">{t("audit.stockCredit")}</p>
        </div>
      ) : null}
    </div>
  );
}

export { packWithAssets };
