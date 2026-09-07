"use client";

import type { CampaignPack, Locale } from "@/lib/types";
import { buildPostingCalendar, buildPostingWeek, postingKindLabel } from "@/lib/engine/posting-calendar";
import { useI18n } from "@/components/i18n-provider";

export function PostingWeek({
  pack,
  locale,
  days = 30,
}: {
  pack: CampaignPack;
  locale: Locale;
  days?: 7 | 30;
}) {
  const { t } = useI18n();
  const list = days === 7 ? buildPostingWeek(pack, locale) : buildPostingCalendar(pack, locale, 30);
  const week = days === 7;
  return (
    <section
      data-calendar={week ? "7day" : "30day"}
      data-testid={week ? "posting-calendar-7" : "posting-calendar-30"}
      className="mb-10"
    >
      <h2 className="text-lg font-black text-navy">{t(week ? "cal7.title7" : "cal7.title")}</h2>
      <p className="mt-1 text-xs text-muted">{t(week ? "cal7.lead7" : "cal7.lead")}</p>
      <ol className="mobile-card-grid cols-2 mt-4 sm:grid-cols-3 lg:grid-cols-5">
        {list.map((d) => (
          <li key={d.day} className="min-w-0 rounded-[16px] border border-[rgba(8,17,31,0.08)] bg-white p-3.5 sm:p-3">
            <p className="text-sm font-black uppercase tracking-[0.16em] text-teal">
              {t("cal7.day")} {d.day} · {d.channelLabel[locale]}
            </p>
            <p className="mt-1 text-sm text-muted">
              {postingKindLabel(d.kind, locale)} · {d.formatLabel[locale]}
            </p>
            <h3 className="mt-2 line-clamp-3 text-sm font-black leading-snug text-navy">{d.headline}</h3>
            {d.ideaName ? (
              <p
                className="mt-1 text-[11px] font-bold text-teal"
                data-calendar-idea={d.ideaName}
                data-calendar-day={d.day}
              >
                {d.ideaName}
              </p>
            ) : null}
            <p className="mt-2 line-clamp-4 text-xs leading-relaxed text-muted">{d.body}</p>
            <p className="mt-2 text-sm font-bold text-teal">{d.cta}</p>
            {d.trendHint ? (
              <p className="mt-2 text-[11px] leading-relaxed text-navy/70">
                {t("research.trendHint")}: {d.trendHint}
                {d.asOf ? ` · ${t("research.asOf")} ${d.asOf.slice(0, 10)}` : ""}
                {d.trendSource ? (
                  <>
                    {" · "}
                    <a href={d.trendSource} target="_blank" rel="noreferrer" className="text-teal underline">
                      {t("research.source")}
                    </a>
                  </>
                ) : null}
              </p>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
