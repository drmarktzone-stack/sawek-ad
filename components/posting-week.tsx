"use client";

import type { CampaignPack, Locale } from "@/lib/types";
import { buildPostingCalendar } from "@/lib/engine/posting-calendar";
import { useI18n } from "@/components/i18n-provider";

export function PostingWeek({ pack, locale }: { pack: CampaignPack; locale: Locale }) {
  const { t } = useI18n();
  const days = buildPostingCalendar(pack, locale);
  return (
    <section data-calendar="7day" className="mb-10">
      <h2 className="text-lg font-black text-white">{t("cal7.title")}</h2>
      <p className="mt-1 text-xs text-zinc-500">{t("cal7.lead")}</p>
      <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
        {days.map((d) => (
          <li key={d.day} className="rounded-2xl border border-white/10 bg-omni-card p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-omni-yellow">
              {t("cal7.day")} {d.day} · {d.channelLabel[locale]}
            </p>
            <p className="mt-1 text-[10px] text-zinc-500">{d.formatLabel[locale]}</p>
            <h3 className="mt-2 line-clamp-3 text-sm font-black leading-snug text-white">{d.headline}</h3>
            <p className="mt-2 line-clamp-4 text-xs leading-relaxed text-zinc-400">{d.body}</p>
            <p className="mt-2 text-[11px] font-bold text-omni-yellow">{d.cta}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
