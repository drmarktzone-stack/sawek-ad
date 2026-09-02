"use client";

import { useEffect, useMemo, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import type { CampaignPack, Locale, MediaAssetMeta } from "@/lib/types";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { graphicPostersForIntake, imagenToAsset, posterToAsset } from "@/lib/graphic-posters";
import { assetsFromPublicUrls } from "@/lib/media-assets";
import { buildSiteAudit } from "@/lib/engine/site-audit";
import { syncCampaign } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export type OfferKind = "graphic" | "imagen" | "site";

export type OfferOption = {
  id: string;
  kind: OfferKind;
  label: string;
  src: string;
  asset: MediaAssetMeta;
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

export function ImageOfferPicker({
  pack,
  locale,
  onPack,
  open: openProp,
  onOpenChange,
}: {
  pack: CampaignPack;
  locale: Locale;
  onPack?: (p: CampaignPack) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const { t } = useI18n();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const posters = useMemo(() => graphicPostersForIntake(pack.intake), [pack.intake.category, pack.intake.businessName, pack.intake.operatingModel]);
  const [imagen, setImagen] = useState<OfferOption | null>(null);
  const [site, setSite] = useState<OfferOption[]>([]);
  const [busy, setBusy] = useState<"imagen" | "site" | null>(null);
  const [imgError, setImgError] = useState("");

  const graphicOpts: OfferOption[] = posters.map((p) => ({
    id: p.id,
    kind: "graphic",
    label: p.name[locale],
    src: p.dataUrl,
    asset: posterToAsset(p, p.name[locale]),
  }));

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setBusy("imagen");
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
          setImagen(null);
          return;
        }
        const mime = data.mime && data.mime.startsWith("image/") ? data.mime : "image/png";
        const dataUrl = `data:${mime};base64,${data.imageBase64}`;
        const asset = imagenToAsset(dataUrl, mime);
        setImagen({
          id: "imagen",
          kind: "imagen",
          label: t("audit.aiStill"),
          src: dataUrl,
          asset,
        });
      } catch {
        if (!cancelled) setImagen(null);
      } finally {
        if (!cancelled) setBusy((b) => (b === "imagen" ? null : b));
      }
    })();
    return () => {
      cancelled = true;
    };
    // Open once per pack; posters already fill the grid if Imagen is down.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pack.id]);

  useEffect(() => {
    if (!open) return;
    const website = pack.intake.website?.trim() ?? "";
    if (!/^https?:\/\//i.test(website)) return;
    let cancelled = false;
    setBusy((b) => b ?? "site");
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
        const assets = assetsFromPublicUrls(urls, pack.intake.businessName, 8).filter((a) => a.label !== "logo");
        if (!cancelled) {
          setSite(
            assets.map((asset, i) => ({
              id: `site-${asset.id}`,
              kind: "site" as const,
              label: `${t("audit.sitePhoto")} ${i + 1}`,
              src: asset.publicSrc || "",
              asset,
            })),
          );
        }
      } catch {
        /* ingest optional */
      } finally {
        if (!cancelled) setBusy((b) => (b === "site" ? null : b));
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pack.id, pack.intake.website]);

  const options = [...(imagen ? [imagen] : []), ...graphicOpts, ...site].slice(0, 10);

  function apply(opt: OfferOption) {
    if (!onPack) return;
    const existing = pack.intake.mediaAssets ?? [];
    const next = packWithAssets(pack, [opt.asset, ...existing.filter((a) => a.id !== opt.asset.id)]);
    onPack(next);
    void syncCampaign(next);
    setOpen(false);
  }

  return (
    <div className="mt-3">
      <Button type="button" size="sm" onClick={() => setOpen(!open)}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
        {t("audit.offerPhotos")}
      </Button>
      {open ? (
        <div className="mt-3 rounded-xl border border-omni-yellow/30 bg-black/40 p-3">
          <p className="text-sm leading-relaxed text-zinc-200">{t("audit.offerPhotosLead")}</p>
          {imgError ? <p className="mt-1 text-sm text-omni-red">{imgError}</p> : null}
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => apply(opt)}
                className={cn(
                  "overflow-hidden rounded-xl border border-white/15 text-start transition hover:border-omni-yellow",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={opt.src} alt="" className="aspect-[4/5] w-full object-cover" />
                <span className="block bg-black/60 px-2 py-1.5 text-[13px] font-bold text-white">
                  {opt.kind === "imagen"
                    ? t("audit.aiStill")
                    : opt.kind === "site"
                      ? t("audit.sitePhoto")
                      : opt.label}
                </span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-[13px] text-zinc-300">{t("audit.pickPhoto")}</p>
        </div>
      ) : null}
    </div>
  );
}

export { packWithAssets };
