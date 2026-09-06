"use client";

import { useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import type { Intake, MediaAssetLabel, MediaAssetMeta } from "@/lib/types";
import {
  ASSET_LABELS,
  classifyFile,
  deleteAssetBlob,
  ingestFile,
  sizeErrorCopy,
} from "@/lib/media-assets";
import { useResolvedAssets } from "@/lib/use-resolved-assets";
import { assetLabelsFor } from "@/lib/vertical";
import { sampleLabel } from "@/lib/operating-model";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";

export function MediaAssetUploader({
  assets,
  onChange,
  intake,
}: {
  assets: MediaAssetMeta[];
  onChange: (next: MediaAssetMeta[]) => void;
  intake?: Pick<Intake, "businessName" | "category" | "description">;
}) {
  const { locale, t } = useI18n();
  const labelOptions = assetLabelsFor(intake, ASSET_LABELS);
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const urls = useResolvedAssets(assets);

  async function onFiles(list: FileList | null) {
    if (!list?.length) return;
    setError("");
    const next = [...assets];
    for (const file of Array.from(list)) {
      const classified = classifyFile(file);
      if (classified.kind === null) {
        setError(sizeErrorCopy(locale, classified.reason === "size" ? (file.type.startsWith("video") ? "video" : "image") : "type"));
        continue;
      }
      try {
        next.push(await ingestFile(file));
      } catch (e) {
        const name = e instanceof Error ? e.name : "";
        setError(sizeErrorCopy(locale, name === "AssetSizeError" ? classified.kind : "type"));
      }
    }
    onChange(next);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function remove(id: string) {
    await deleteAssetBlob(id);
    onChange(assets.filter((a) => a.id !== id));
  }

  function patch(id: string, p: Partial<MediaAssetMeta>) {
    onChange(assets.map((a) => (a.id === id ? { ...a, ...p } : a)));
  }

  return (
    <div>
      <Label htmlFor="media-assets">{t("details.assets")}</Label>
      <p className="mb-2 text-xs text-muted">{t("details.assetsHint")}</p>
      <input
        ref={inputRef}
        id="media-assets"
        type="file"
        accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,.jpg,.jpeg,.png,.webp,.mp4,.webm"
        multiple
        className="hidden"
        aria-label={t("details.assetsAdd")}
        onChange={(e) => void onFiles(e.target.files)}
      />
      <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
        <ImagePlus className="size-4" />
        {t("details.assetsAdd")}
      </Button>
      {error && <p className="mt-2 text-sm font-semibold text-danger">{error}</p>}
      {assets.length === 0 && (
        <p className="mt-3 rounded-xl border border-dashed border-navy/15 bg-background px-3 py-6 text-center text-xs font-bold uppercase tracking-[0.18em] text-muted">
          {sampleLabel(locale)}
        </p>
      )}
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {assets.map((a) => (
          <li key={a.id} className="overflow-hidden rounded-xl border border-navy/10 bg-background">
            <div className="relative h-28 bg-zinc-900">
              {(a.publicSrc || urls[a.id]) && a.kind === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.publicSrc || urls[a.id]} alt={a.name} className="h-full w-full object-cover" />
              ) : (a.publicSrc || urls[a.id]) && a.kind === "video" ? (
                <video src={a.publicSrc || urls[a.id]} className="h-full w-full object-cover" muted playsInline />
              ) : (
                <div className="flex h-full items-center justify-center text-sm font-black uppercase tracking-widest text-muted">
                  {sampleLabel(locale)}
                </div>
              )}
            </div>
            <div className="space-y-2 p-3">
              <p className="truncate text-xs text-muted">{a.name}</p>
              <select
                className="h-9 w-full rounded-lg border border-navy/15 bg-background px-2 text-xs text-navy"
                value={a.label}
                aria-label={t("details.assetKind")}
                onChange={(e) => patch(a.id, { label: e.target.value as MediaAssetLabel })}
              >
                {labelOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label[locale]}
                  </option>
                ))}
              </select>
              <input
                className="h-9 w-full rounded-lg border border-navy/10 bg-background px-2 text-xs text-navy"
                placeholder={t("details.assetNote")}
                aria-label={t("details.assetNote")}
                value={a.note}
                onChange={(e) => patch(a.id, { note: e.target.value })}
              />
              <button
                type="button"
                className="flex items-center gap-1 text-xs text-muted hover:text-danger"
                onClick={() => void remove(a.id)}
              >
                <Trash2 className="size-3.5" />
                {t("review.remove")}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
