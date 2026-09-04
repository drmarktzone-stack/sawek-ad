"use client";

import { useEffect, useState } from "react";
import { Clock, MapPin, MessageCircle, Phone } from "lucide-react";
import type { CampaignPack, Locale, MediaAssetMeta } from "@/lib/types";
import { dirFor } from "@/lib/i18n";
import { channelFields, incompleteLabel, isIncompleteMarker, waMeUrl } from "@/lib/channel-copy";
import { paletteForIntake, inkOn, pickHeroAsset } from "@/lib/brand-kit";
import { pickLogo } from "@/lib/media-assets";
import { useResolvedAssets } from "@/lib/use-resolved-assets";
import { isNoOffer } from "@/lib/no-offer";
import { filled } from "@/lib/utils";
import { shortName } from "@/lib/engine/spoken";
import { hoursChips } from "@/lib/hours-chips";
import { ResizeStrip } from "@/components/resize-strip";
import { PostingWeek } from "@/components/posting-week";

const SEC: Record<Locale, { about: string; offer: string; hours: string; address: string; gallery: string; contact: string; call: string; wa: string }> = {
  he: { about: "אודות", offer: "ההצעה", hours: "שעות", address: "כתובת", gallery: "גלריה", contact: "צור קשר", call: "התקשרו", wa: "וואטסאפ" },
  ar: { about: "من نحن", offer: "العرض", hours: "الساعات", address: "العنوان", gallery: "المعرض", contact: "تواصل", call: "اتّصلوا", wa: "واتساب" },
  en: { about: "About", offer: "Offer", hours: "Hours", address: "Address", gallery: "Gallery", contact: "Contact", call: "Call", wa: "WhatsApp" },
};

function telHref(raw: string): string | null {
  const d = String(raw || "").replace(/[^\d+]/g, "");
  if (d.replace(/\D/g, "").length < 8) return null;
  return `tel:${d}`;
}

function photoSrc(asset: MediaAssetMeta | undefined, urls: Record<string, string>): string | undefined {
  if (!asset) return undefined;
  return asset.publicSrc || urls[asset.id];
}

export function PackLandingScreen({ pack, locale }: { pack: CampaignPack; locale: Locale }) {
  const assets = pack.intake.mediaAssets ?? [];
  const urls = useResolvedAssets(assets);
  const fields = channelFields(pack, locale);
  const palette = paletteForIntake(pack.intake);
  const bg = palette[0];
  const accent = palette[1];
  const ink = inkOn(accent);
  const pageInk = inkOn(bg);
  const hero = pickHeroAsset(assets);
  const logo = pickLogo(assets);
  const heroSrc = photoSrc(hero, urls);
  const gallery = assets.filter((a) => a.kind === "image" && (a.publicSrc || urls[a.id]) && a.id !== hero?.id && a.label !== "logo").slice(0, 12);
  const loc = pack.intake.location?.trim() ?? "";
  const hours = pack.intake.clinicHours?.trim() ?? "";
  const about = pack.intake.description?.trim() ?? "";
  const offer = pack.intake.offer?.trim() ?? "";
  const showOffer = filled(offer) && !isNoOffer(offer);
  const site = pack.intake.website?.trim() ?? "";
  const name = shortName(pack.intake, locale) || pack.intake.businessName.trim() || fields.pageName;
  const headline = !isIncompleteMarker(fields.headline, locale) ? fields.headline : (pack.intake.uniqueAdvantage || pack.intake.brandPositioning || name);
  const waUrl = waMeUrl(pack.intake.whatsapp, fields.waScript, locale);
  const phoneUrl = telHref(pack.intake.whatsapp);
  const copy = SEC[locale];
  const [aiHero, setAiHero] = useState<string | null>(null);

  useEffect(() => {
    if (heroSrc) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/imagen", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            businessName: pack.intake.businessName,
            category: pack.intake.category,
            headline,
            locale,
          }),
        });
        const data = (await res.json()) as { ok?: boolean; mime?: string; imageBase64?: string };
        if (cancelled || !data?.ok || !data.imageBase64) return;
        const mime = data.mime && data.mime.startsWith("image/") ? data.mime : "image/png";
        setAiHero(`data:${mime};base64,${data.imageBase64}`);
      } catch {
        /* quota / error — still ship type + scanned photos */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [heroSrc, pack.intake.businessName, pack.intake.category, headline, locale]);

  const plate = heroSrc || aiHero;
  const logoSrc = logo?.publicSrc || (logo ? urls[logo.id] : undefined) || pack.intake.brandKit?.logoSrc;

  return (
    <div dir={dirFor(locale)} className="min-h-screen bg-background text-foreground">
      <section className="relative flex min-h-[100svh] flex-col justify-end overflow-hidden">
        {plate ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={plate} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(165deg, #F7F3EA 0%, #F7F3EA 42%, ${accent}33 100%)`,
            }}
          />
        )}
        <div
          className="absolute inset-0"
          style={{
            background: plate
              ? "linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.28) 45%, rgba(0,0,0,0.12) 100%)"
              : `radial-gradient(1200px 600px at 80% 10%, ${accent}44, transparent 55%)`,
          }}
        />
        <div className="relative z-[1] mx-auto w-full max-w-5xl px-6 pb-16 pt-24 sm:px-10">
          {logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoSrc} alt="" className="mb-6 h-14 w-auto object-contain drop-shadow" />
          ) : null}
          <p className="text-sm font-bold uppercase tracking-[0.28em]" style={{ color: accent }}>
            {name}
          </p>
          <h1 className={`mt-4 max-w-4xl text-4xl font-black leading-[1.05] sm:text-6xl lg:text-7xl ${plate ? "text-white" : "text-navy"}`}>
            {headline}
          </h1>
          {filled(pack.intake.uniqueAdvantage) && pack.intake.uniqueAdvantage !== headline ? (
            <p className={`mt-5 max-w-2xl text-lg leading-relaxed ${plate ? "text-white/85" : "text-muted"}`}>{pack.intake.uniqueAdvantage}</p>
          ) : null}
          <div className="mt-8 flex flex-wrap gap-3">
            {waUrl ? (
              <a
                href={waUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-black"
                style={{ background: accent, color: ink }}
              >
                <MessageCircle className="size-4" />
                {isIncompleteMarker(fields.cta, locale) ? copy.wa : fields.cta}
              </a>
            ) : phoneUrl ? (
              <a
                href={phoneUrl}
                className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-black"
                style={{ background: accent, color: ink }}
              >
                <Phone className="size-4" />
                {copy.call}
              </a>
            ) : (
              <span
                className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-black"
                style={{ background: accent, color: ink }}
              >
                {isIncompleteMarker(fields.cta, locale) ? copy.contact : fields.cta}
              </span>
            )}
          </div>
        </div>
      </section>

      {about ? (
        <section className="mx-auto max-w-5xl px-6 py-16 sm:px-10">
          <p className="text-sm font-black uppercase tracking-[0.22em]" style={{ color: accent }}>
            {copy.about}
          </p>
          <p className="mt-4 max-w-3xl whitespace-pre-wrap text-xl font-medium leading-relaxed sm:text-2xl">{about}</p>
        </section>
      ) : null}

      {showOffer ? (
        <section className="mx-auto max-w-5xl px-6 pb-16 sm:px-10">
          <div className="rounded-[2rem] px-8 py-10" style={{ background: accent, color: ink }}>
            <p className="text-sm font-black uppercase tracking-[0.22em] opacity-70">{copy.offer}</p>
            <p className="mt-3 text-3xl font-black leading-tight">{offer}</p>
          </div>
        </section>
      ) : null}

      {(hours || loc) ? (
        <section className="mx-auto grid max-w-5xl gap-6 px-6 pb-16 sm:grid-cols-2 sm:px-10">
          {hours ? (
            <div className="rounded-[1.5rem] border border-navy/10 bg-white p-6 shadow-[0_8px_24px_rgba(15,39,68,0.06)]">
              <p className="flex items-center gap-2 text-[13px] font-black uppercase tracking-[0.22em]" style={{ color: accent }}>
                <Clock className="size-4" /> {copy.hours}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {hoursChips(hours, locale, 6).map((c) => (
                  <span key={c} className="rounded-full border border-navy/15 bg-white px-3 py-1.5 text-sm font-semibold">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          {loc ? (
            <div className="rounded-[1.5rem] border border-navy/10 bg-white p-6 shadow-[0_8px_24px_rgba(15,39,68,0.06)]">
              <p className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.22em]" style={{ color: accent }}>
                <MapPin className="size-4" /> {copy.address}
              </p>
              <p className="mt-3 text-lg leading-relaxed">{loc}</p>
            </div>
          ) : null}
        </section>
      ) : null}

      {gallery.length ? (
        <section className="mx-auto max-w-6xl px-6 pb-16 sm:px-10">
          <p className="mb-6 text-sm font-black uppercase tracking-[0.22em]" style={{ color: accent }}>
            {copy.gallery}
          </p>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {gallery.map((a) => {
              const src = photoSrc(a, urls);
              if (!src) return null;
              return (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={a.id}
                  src={src}
                  alt=""
                  className="aspect-[4/5] h-full w-full rounded-2xl object-cover"
                />
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="mx-auto max-w-5xl px-6 pb-20 sm:px-10">
        <p className="text-sm font-black uppercase tracking-[0.22em]" style={{ color: accent }}>
          {copy.contact}
        </p>
        <div className="mt-4 flex flex-wrap gap-4 text-lg">
          {pack.intake.whatsapp.trim() ? <p>{pack.intake.whatsapp.trim()}</p> : null}
          {loc ? <p>{loc}</p> : null}
          {site ? (
            <a
              href={site.startsWith("http") ? site : `https://${site}`}
              target="_blank"
              rel="noreferrer"
              style={{ color: accent }}
              className="font-bold"
            >
              {site}
            </a>
          ) : null}
        </div>
        {fields.landingBody && fields.landingBody !== incompleteLabel(locale) ? (
          <p className="mt-6 max-w-2xl whitespace-pre-wrap text-sm leading-relaxed opacity-80">{fields.landingBody}</p>
        ) : null}
        {waUrl ? (
          <a
            href={waUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-8 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-black"
            style={{ background: accent, color: ink }}
          >
            <MessageCircle className="size-4" />
            {copy.wa}
          </a>
        ) : null}
      </section>

      <div className="border-t border-navy/10 bg-white px-4 py-10 text-foreground">
        <div className="mx-auto max-w-6xl">
          <ResizeStrip pack={pack} packLang={locale} generatedImage={aiHero} />
          <PostingWeek pack={pack} locale={locale} />
        </div>
      </div>
    </div>
  );
}
