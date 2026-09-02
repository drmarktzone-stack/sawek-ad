"use client";

import { useRef, useState } from "react";
import { Download } from "lucide-react";
import type { CampaignPack, Locale } from "@/lib/types";
import { AdVisual } from "@/components/ad-mockup";
import { useResolvedAssets } from "@/lib/use-resolved-assets";
import { pickHero, pickLogo } from "@/lib/media-assets";
import { channelFields, downloadNodePng } from "@/lib/channel-copy";
import { RESIZE_FORMATS } from "@/lib/resize-formats";
import { paletteForIntake } from "@/lib/brand-kit";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ResizeStrip({
  pack,
  packLang,
  generatedImage,
}: {
  pack: CampaignPack;
  packLang: Locale;
  generatedImage?: string | null;
}) {
  const { t } = useI18n();
  const assets = pack.intake.mediaAssets ?? [];
  const urls = useResolvedAssets(assets);
  const fields = channelFields(pack, packLang);
  const palette = paletteForIntake(pack.intake);
  const hero = pickHero(assets);
  const logo = pickLogo(assets);
  const refs = useRef<Record<string, HTMLDivElement | null>>({});
  const [busy, setBusy] = useState<string | null>(null);

  async function save(id: string, width: number) {
    setBusy(id);
    try {
      const node = refs.current[id];
      await downloadNodePng(node ?? null, `sawek-${id}-${pack.id}.png`, width);
    } finally {
      setBusy(null);
    }
  }

  return (
    <section data-resize="magic" className="mb-10">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-black text-navy">{t("resize.title")}</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">{t("resize.lead")}</p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {RESIZE_FORMATS.map((fmt) => (
          <article key={fmt.id} className="rounded-[22px] border border-navy/10 bg-white p-4 shadow-[0_10px_28px_rgba(27,42,74,0.07)]">
            <p className="mb-2 text-[13px] font-black uppercase tracking-[0.12em] text-gold">
              {fmt.label[packLang]} · {fmt.ratio}
            </p>
            <div
              ref={(n) => {
                refs.current[fmt.id] = n;
              }}
              data-kit-png={`resize-${fmt.id}`}
              data-kit-width={String(fmt.width)}
              className="overflow-hidden rounded-xl"
              style={{ aspectRatio: fmt.css }}
            >
              <AdVisual
                locale={packLang}
                palette={palette}
                asset={hero}
                urls={urls}
                overrideSrc={generatedImage}
                kicker={fmt.channel === "facebook" || fmt.channel === "tiktok" ? undefined : fields.pageName}
                headline={fields.posterHeadline}
                body={fields.posterSupport}
                cta={fmt.channel === "tiktok" ? undefined : fields.cta}
                hoursChips={fields.hoursChips}
                channel={fmt.channel}
                className="h-full min-h-0 box-border p-0"
              />
            </div>
            {(logo?.publicSrc || pack.intake.brandKit?.logoSrc) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo?.publicSrc || pack.intake.brandKit?.logoSrc} alt="" className="mt-2 h-6 w-auto object-contain" />
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-2 w-full"
              disabled={busy === fmt.id}
              onClick={() => void save(fmt.id, fmt.width)}
            >
              <Download className="size-3.5" />
              {busy === fmt.id ? t("resize.saving") : t("resize.download")}
            </Button>
          </article>
        ))}
      </div>
    </section>
  );
}

export function ResizeDownloadBar({
  pack,
  packLang,
  generatedImage,
  className,
}: {
  pack: CampaignPack;
  packLang: Locale;
  generatedImage?: string | null;
  className?: string;
}) {
  return (
    <div className={cn("mt-10", className)}>
      <ResizeStrip pack={pack} packLang={packLang} generatedImage={generatedImage} />
    </div>
  );
}
