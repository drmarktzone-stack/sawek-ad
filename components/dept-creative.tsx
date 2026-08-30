"use client";

import { useMemo, useState } from "react";
import type { CampaignPack, Locale } from "@/lib/types";
import { FACTORY_FORMATS } from "@/lib/factory-formats";
import { DESIGN_STYLES, stylesForVertical } from "@/lib/design-styles";
import { detectVertical, type Vertical } from "@/lib/vertical";
import { LAYOUT_THUMBS } from "@/lib/creative-bank";
import { produceAd } from "@/lib/engine/produce-ad";
import { upsertCampaign } from "@/lib/storage";
import { useI18n } from "@/components/i18n-provider";
import { Card, ProducedBy } from "@/components/department-shell";
import { Button } from "@/components/ui/button";
import { Label, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { CampaignAdVisual } from "@/components/ad-mockup";
import { MediaAssetUploader } from "@/components/media-asset-uploader";

export function CreativeDeptView({
  pack,
  packLang,
  onPack,
}: {
  pack: CampaignPack;
  packLang: Locale;
  onPack: (p: CampaignPack) => void;
}) {
  const { t } = useI18n();
  const c = pack.agency!.creative;
  const l = packLang;
  const [format, setFormat] = useState(FACTORY_FORMATS[0].id);
  const [idea, setIdea] = useState("");
  const packVertical = detectVertical(pack.intake);
  const [styleFilter, setStyleFilter] = useState<"all" | Vertical>(packVertical);
  const visibleStyles = styleFilter === "all" ? DESIGN_STYLES : stylesForVertical(styleFilter);

  const pieces = useMemo(
    () => c.pieces.filter((p) => p.locale === l && (p.format === format || p.format.startsWith(`${format}`))),
    [c.pieces, format, l],
  );

  function makeAd(styleId: string) {
    const ad = produceAd(pack.intake, styleId, idea, packLang);
    const next = { ...pack, producedAds: [ad, ...pack.producedAds] };
    upsertCampaign(next);
    onPack(next);
  }

  return (
    <div className="space-y-4">
      <ProducedBy agents={c.producedBy} />
      {(pack.intake.pastCreatives ?? []).length > 0 && (
        <Card title={t("dept.pastCreative")}>
          <ul className="space-y-3">
            {(pack.intake.pastCreatives ?? []).map((past) => (
              <li key={past.id} className="rounded-xl border border-white/10 p-3 text-sm">
                <p className="text-[10px] font-black uppercase tracking-widest text-omni-red">past_creative</p>
                <p className="mt-1 font-semibold text-white">{past.headline || past.sourceName}</p>
                {past.body && <pre className="mt-1 whitespace-pre-wrap font-sans text-zinc-300">{past.body}</pre>}
                {past.cta && <p className="mt-1 text-omni-yellow">CTA: {past.cta}</p>}
                <p className="mt-2 text-[11px] text-zinc-500">{t("ingest.pastTag")}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <Card title={t("dept.brandkit")}>
        <div className="flex flex-wrap items-center gap-3">
          {(["black", "red", "yellow"] as const).map((k) => (
            <span key={k} className="flex items-center gap-2 text-xs text-zinc-300">
              <i
                className="size-6 rounded-full border border-white/20"
                style={{ background: c.brandKit.sawek[k] }}
              />
              SAWEK {k}
            </span>
          ))}
        </div>
        <p className="mt-3 text-sm text-zinc-400">{c.brandKit.note[l]}</p>
      </Card>
      <Card title={t("dept.hooks")}>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {c.hooks.map((h) => (
            <article key={h.id} className="rounded-xl border border-white/10 p-3">
              <p className="text-xs font-black uppercase text-omni-yellow">{h.angle[l]}</p>
              <p className="mt-1 text-sm text-zinc-200">{h.hook[l]}</p>
            </article>
          ))}
        </div>
      </Card>
      <Card title={t("dept.angles")}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-start text-sm">
            <thead className="text-xs uppercase text-zinc-500">
              <tr>
                <th className="p-2">{t("dept.angles")}</th>
                <th className="p-2">{t("details.advantage")}</th>
                <th className="p-2">CTA</th>
              </tr>
            </thead>
            <tbody>
              {c.angleMatrix.map((row, i) => (
                <tr key={i} className="border-t border-white/10">
                  <td className="p-2 text-zinc-200">{row.angle[l]}</td>
                  <td className="p-2 text-zinc-400">{row.proof[l]}</td>
                  <td className="p-2 font-semibold text-omni-yellow">{row.cta[l]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card title={t("dept.factory")}>
        <div className="mb-4 flex flex-wrap gap-1">
          {FACTORY_FORMATS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFormat(f.id)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold",
                format === f.id ? "bg-omni-yellow text-black" : "border border-white/10 text-zinc-300",
              )}
            >
              {f.label[l]}
            </button>
          ))}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {pieces.map((p, i) => (
            <article key={`${p.format}-${p.locale}-${i}`} className="rounded-xl border border-white/10 p-4">
              <p className="text-xs font-bold uppercase text-omni-yellow">{p.title}</p>
              <pre className="mt-2 whitespace-pre-wrap font-sans text-sm text-zinc-300">{p.body}</pre>
            </article>
          ))}
        </div>
      </Card>
      <Card title={t("dept.mockups")}>
        <div className="mb-4">
          <MediaAssetUploader
            assets={pack.intake.mediaAssets ?? []}
            intake={pack.intake}
            onChange={(mediaAssets) => {
              const next = { ...pack, intake: { ...pack.intake, mediaAssets } };
              upsertCampaign(next);
              onPack(next);
            }}
          />
        </div>
        <Label>{t("design.idea")}</Label>
        <Textarea
          className="mb-4"
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          placeholder={pack.intake.uniqueAdvantage}
        />
        <div className="mb-4 flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => setStyleFilter("all")}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold",
              styleFilter === "all" ? "bg-omni-yellow text-black" : "border border-white/10 text-zinc-300",
            )}
          >
            {t("design.filterAll")}
          </button>
          <button
            type="button"
            onClick={() => setStyleFilter(packVertical)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold",
              styleFilter === packVertical ? "bg-omni-yellow text-black" : "border border-white/10 text-zinc-300",
            )}
          >
            {packVertical}
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleStyles.map((s, idx) => {
            const ads = pack.variants.filter((v) => v.locale === packLang);
            const v = ads[idx % Math.max(ads.length, 1)];
            return (
              <article key={s.id} className="overflow-hidden rounded-2xl border border-white/10 bg-black">
                <CampaignAdVisual
                  locale={packLang}
                  palette={s.palette}
                  assets={pack.intake.mediaAssets}
                  index={idx}
                  className="h-28"
                >
                  <p className="text-sm font-black leading-tight text-white drop-shadow">
                    {v?.headline ?? pack.intake.businessName}
                  </p>
                </CampaignAdVisual>
                <div className="space-y-2 bg-omni-card p-3">
                  <div className="flex gap-1" aria-label={t("design.swatch")}>
                    {s.palette.map((c) => (
                      <i key={c} className="h-4 flex-1 rounded-sm border border-white/10" style={{ background: c }} />
                    ))}
                  </div>
                  <p className="text-[11px] font-bold text-zinc-300">{s.name[packLang]}</p>
                  <p className="line-clamp-2 text-[11px] text-zinc-500">{s.description[packLang]}</p>
                  <Button type="button" size="sm" className="w-full" onClick={() => makeAd(s.id)}>
                    {t("design.make")}
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      </Card>
      <Card title={t("design.layouts")}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {LAYOUT_THUMBS.map((lay, idx) => {
            const pal = visibleStyles[idx % Math.max(visibleStyles.length, 1)]?.palette ?? ["#111", "#ffe500", "#ff1a1a"];
            return (
              <article key={lay.id} className="overflow-hidden rounded-xl border border-white/10 bg-black">
                <CampaignAdVisual
                  locale={packLang}
                  palette={pal}
                  assets={pack.intake.mediaAssets}
                  index={idx}
                  className={cn("w-full", lay.aspect, "h-auto min-h-0")}
                >
                  <p className="text-[10px] font-black leading-tight text-white drop-shadow">{pack.intake.businessName}</p>
                </CampaignAdVisual>
                <p className="px-2 py-1.5 text-center text-[10px] font-bold text-zinc-400">{lay.label[packLang]}</p>
              </article>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
