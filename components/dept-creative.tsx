"use client";

import { useMemo, useState } from "react";
import type { CampaignPack, Locale } from "@/lib/types";
import { FACTORY_FORMATS } from "@/lib/factory-formats";
import { DESIGN_STYLES } from "@/lib/design-styles";
import { produceAd } from "@/lib/engine/produce-ad";
import { upsertCampaign } from "@/lib/storage";
import { useI18n } from "@/components/i18n-provider";
import { Card, ProducedBy } from "@/components/department-shell";
import { Button } from "@/components/ui/button";
import { Label, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";

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
        <Label>{t("design.idea")}</Label>
        <Textarea
          className="mb-4"
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          placeholder={pack.intake.uniqueAdvantage}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DESIGN_STYLES.map((s, idx) => {
            const ads = pack.variants.filter((v) => v.locale === packLang);
            const v = ads[idx % Math.max(ads.length, 1)];
            return (
              <article key={s.id} className="overflow-hidden rounded-2xl border border-white/10 bg-black">
                <div
                  className="flex h-28 flex-col justify-end p-3"
                  style={{
                    background: `linear-gradient(160deg, ${s.palette[0]}, ${s.palette[1]} 70%, ${s.palette[2]})`,
                  }}
                >
                  <p className="text-sm font-black leading-tight text-white">
                    {v?.headline ?? pack.intake.businessName}
                  </p>
                </div>
                <div className="space-y-2 bg-omni-card p-3">
                  <p className="text-[11px] font-bold text-zinc-500">{s.name[packLang]}</p>
                  <Button type="button" size="sm" className="w-full" onClick={() => makeAd(s.id)}>
                    {t("design.make")}
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
