"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import type { CampaignPack, Locale, MarketResearch, ResearchSourceCard } from "@/lib/types";
import { applyResearchToPack } from "@/lib/engine/research-overlay";
import { buildResearchSkeleton } from "@/lib/engine/research-public";
import { useI18n } from "@/components/i18n-provider";

function factsFromIntake(pack: CampaignPack) {
  const i = pack.intake;
  return {
    businessName: i.businessName,
    category: i.category,
    description: i.description,
    audience: i.audience,
    uniqueAdvantage: i.uniqueAdvantage,
    biggestProblem: i.biggestProblem,
    offer: i.offer,
    location: i.location,
    website: i.website,
    niche: i.voice?.niche,
    mainGoal: i.mainGoal,
  };
}

function SourceCard({ card, locale, onRetry }: { card: ResearchSourceCard; locale: Locale; onRetry?: () => void }) {
  const { t } = useI18n();
  const empty = !card.examples.length && !card.notes.length;
  return (
    <article
      data-research-source={card.id}
      className="rounded-[16px] border border-white/10 bg-white/[0.05] p-4"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[12px] font-black uppercase tracking-wide text-[#F5C518]">
          {card.label[locale] || card.label.en}
        </p>
        <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] font-bold text-[#C9D0D8]">
          {t(`research.status.${card.status}` as "research.status.ok")}
        </span>
      </div>
      {empty ? (
        <div className="mt-3">
          <p className="text-sm leading-relaxed text-[#C9D0D8]">
            {card.emptyReason?.[locale] || card.emptyReason?.en || t("research.empty")}
          </p>
          <p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-[#C9B896]">{t("research.unknownHonest")}</p>
          {card.queryUsed ? (
            <p className="mt-1 text-[11px] text-[#9FD4C8]" data-testid="research-query-used">
              {t("research.queryUsed")}: {card.queryUsed}
            </p>
          ) : null}
          {card.alternateSources?.length ? (
            <ul className="mt-2 space-y-1">
              {card.alternateSources.map((alt) => (
                <li key={alt.url}>
                  <a href={alt.url} target="_blank" rel="noreferrer" className="text-[12px] font-bold text-[#9FD4C8]">
                    {t("research.alternate")}: {alt.label[locale] || alt.label.en}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
          {onRetry && (card.retryable || empty) ? (
            <button type="button" className="mt-3 text-[12px] font-black text-[#F5C518] underline-offset-2 hover:underline" onClick={onRetry}>
              {t("research.retry")}
            </button>
          ) : null}
        </div>
      ) : (
        <ul className="mt-3 space-y-3">
          {card.examples.map((ex) => (
            <li key={ex.id} className="text-sm leading-relaxed text-[#F7F3EA]">
              <p className="font-black">{ex.title[locale] || ex.title.en}</p>
              <p className="mt-0.5 text-[11px] font-bold uppercase tracking-wide text-[#9FD4C8]">
                {t("research.source")}: {card.label[locale] || card.id}
                {ex.kind === "search_suggestion" ? ` · ${t("research.searchIdea")}` : ""}
                {ex.queryUsed ? ` · ${t("research.queryUsed")}: ${ex.queryUsed}` : ""}
              </p>
              {ex.advertiser || ex.page ? (
                <p className="mt-0.5 text-xs text-[#9FD4C8]">
                  {t("research.advertiser")}: {ex.advertiser || ex.page}
                </p>
              ) : null}
              <p className="mt-1 text-[13px] text-[#C9D0D8]">{ex.snippet[locale] || ex.snippet.en}</p>
              <p className="mt-1 text-[11px] text-[#C9B896]">
                {t("research.asOf")} {ex.asOf.slice(0, 10)}
              </p>
              <a
                href={ex.url}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-[12px] font-bold text-[#F5C518] underline-offset-2 hover:underline"
              >
                {t("research.openExample")} <ExternalLink className="size-3" />
              </a>
            </li>
          ))}
          {card.notes.map((n, i) => (
            <li key={`${card.id}-n-${i}`} className="text-sm leading-relaxed text-[#E8E2D4]">
              <p className="font-black text-[#F7F3EA]">{n.title[locale] || n.title.en}</p>
              <p className="mt-1">{n.note[locale] || n.note.en}</p>
              <p className="mt-1 text-[11px] text-[#C9B896]">
                {t("research.asOf")} {n.asOf.slice(0, 10)}
                {n.sourceUrl ? (
                  <>
                    {" · "}
                    <a href={n.sourceUrl} target="_blank" rel="noreferrer" className="text-[#F5C518]">
                      {n.sourceUrl.replace(/^https?:\/\//, "").slice(0, 48)}
                    </a>
                  </>
                ) : null}
              </p>
            </li>
          ))}
        </ul>
      )}
      <a
        href={card.exploreUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-flex items-center gap-1 text-[12px] font-bold text-[#9FD4C8]"
      >
        {t("research.explore")} <ExternalLink className="size-3" />
      </a>
    </article>
  );
}

export function ResearchDesk({
  pack,
  locale,
  onPack,
  compact,
}: {
  pack: CampaignPack;
  locale: Locale;
  onPack?: (p: CampaignPack) => void;
  compact?: boolean;
}) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);
  const research = pack.research ?? buildResearchSkeleton(pack.intake);

  useEffect(() => {
    if (!onPack || !pack.id) return;
    if (pack.research?.fetched) return;
    let cancelled = false;
    setBusy(true);
    const facts = factsFromIntake(pack);
    const snapshot = pack;
    fetch("/api/research", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: facts, audience: pack.intake.audience, facts, retry: retryNonce > 0 }),
    })
      .then((r) => r.json())
      .then((data: MarketResearch) => {
        if (cancelled || !data?.sources) return;
        onPack(applyResearchToPack(snapshot, data));
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
    // Fetch once per campaign until research.fetched is true. Retry bumps nonce.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pack.id, pack.research?.fetched, retryNonce]);

  const notes = research?.notes ?? pack.cmoIdeas?.groundedNotes ?? [];
  const sources = [...(research?.sources ?? [])].sort((a, b) => {
    const rank = (id: string) => (id === "google_suggest" ? 0 : id === "youtube_suggest" ? 1 : 2);
    return rank(a.id) - rank(b.id);
  });

  function retry() {
    if (!onPack) return;
    const skeleton = buildResearchSkeleton(pack.intake);
    setRetryNonce((n) => n + 1);
    onPack({ ...pack, research: { ...skeleton, fetched: false }, updatedAt: new Date().toISOString() });
  }

  return (
    <section
      data-research="desk"
      data-testid="research-desk"
      className="agency-ink mb-8 mt-4 p-5 sm:p-7"
    >
      <p className="text-[13px] font-black uppercase tracking-[0.22em] text-[#F5C518]">{t("research.kicker")}</p>
      <h2 className="agency-display-cream mt-2 text-2xl sm:text-3xl">{t("research.title")}</h2>
      <p className="mt-2 text-sm leading-relaxed text-[#C9D0D8]">{t("research.lead")}</p>
      {research?.query ? (
        <p className="mt-2 text-xs text-[#9FD4C8]">
          {t("research.query")}: {research.query} · {t("research.geo")}: {research.geo}
          {research.asOf ? ` · ${t("research.asOf")} ${research.asOf.slice(0, 10)}` : ""}
        </p>
      ) : null}
      {research?.queries?.length ? (
        <p className="mt-1 text-[11px] text-[#C9B896]" data-testid="research-queries">
          {t("research.queries")}: {research.queries.join(" · ")}
        </p>
      ) : null}
      <p className="mt-2 text-xs font-semibold text-[#C9B896]">
        {research?.disclaimer?.[locale] || t("research.disclaimer")}
      </p>
      {onPack ? (
        <button
          type="button"
          data-testid="research-retry"
          className="mt-3 text-[12px] font-black text-[#F5C518] underline-offset-2 hover:underline"
          onClick={retry}
        >
          {t("research.retry")}
        </button>
      ) : null}
      {busy && !research?.fetched ? (
        <p className="mt-4 text-sm text-[#9FD4C8]">{t("research.loading")}</p>
      ) : null}
      <div className={`mt-5 grid gap-3 ${compact ? "grid-cols-1 sm:grid-cols-2" : "md:grid-cols-2"}`}>
        {sources.map((card) => (
          <SourceCard key={card.id} card={card} locale={locale} onRetry={onPack ? retry : undefined} />
        ))}
      </div>
      {notes.length ? (
        <div className="mt-5 rounded-[14px] border border-dashed border-white/15 bg-white/5 p-4">
          <p className="text-xs font-black uppercase tracking-wide text-[#F5C518]">{t("research.groundedNotes")}</p>
          <ul className="mt-2 space-y-2">
            {notes.slice(0, 6).map((n, i) => (
              <li key={`note-${i}`} className="text-sm text-[#E8E2D4]">
                <span className="font-black text-[#F7F3EA]">{n.title[locale] || n.title.en}</span>
                {" — "}
                {n.note[locale] || n.note.en}
                <span className="mt-1 block text-[11px] text-[#C9B896]">
                  {t("research.asOf")} {n.asOf.slice(0, 10)}
                  {n.sourceUrl ? (
                    <>
                      {" · "}
                      <a href={n.sourceUrl} target="_blank" rel="noreferrer" className="text-[#F5C518]">
                        {n.sourceUrl.replace(/^https?:\/\//, "").slice(0, 56)}
                      </a>
                    </>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
