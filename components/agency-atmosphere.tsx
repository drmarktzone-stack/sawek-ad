"use client";

import { ATMOSPHERE_STILLS } from "@/lib/atmosphere";
import { useI18n } from "@/components/i18n-provider";
import { cn } from "@/lib/utils";

export function AgencyAtmosphere({
  className,
  caption,
}: {
  className?: string;
  caption?: string;
}) {
  const { locale } = useI18n();
  return (
    <section className={cn("mx-auto max-w-5xl px-4", className)}>
      {caption ? (
        <p className="mb-3 text-center text-sm font-bold uppercase tracking-[0.22em] text-gold">{caption}</p>
      ) : null}
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {ATMOSPHERE_STILLS.map((still) => (
          <li key={still.id} className="agency-frame overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={still.src} alt={still[locale]} className="aspect-[16/9] w-full object-cover" />
            <p className="px-3 py-2 text-center text-xs font-black uppercase tracking-[0.16em] text-navy">
              {still[locale]}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function AgencyHeroStill({
  src = "/atmosphere/street-shop.svg",
  alt = "",
  className,
}: {
  src?: string;
  alt?: string;
  className?: string;
}) {
  return (
    <div className={cn("agency-frame overflow-hidden", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="aspect-[16/7] w-full object-cover" />
    </div>
  );
}
