"use client";

import { useState } from "react";
import type { CompleteAdPackage, Locale } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/i18n-provider";
import { cn } from "@/lib/utils";

export function CompleteAdCard({
  completeAd,
  locale,
  compact = false,
  copied,
  onCopy,
}: {
  completeAd: CompleteAdPackage;
  locale: Locale;
  compact?: boolean;
  copied?: boolean;
  onCopy?: (text: string) => void;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const loc = completeAd.locales[locale] || completeAd.locales.he;
  const dir = locale === "en" ? "ltr" : "rtl";
  const text = [loc.headline, loc.copy, loc.cta].filter(Boolean).join("\n");
  const novelty =
    completeAd.noveltyStatus === "original"
      ? t("complete.noveltyOriginal")
      : completeAd.noveltyStatus === "evolved"
        ? t("complete.noveltyEvolved")
        : completeAd.noveltyStatus === "saturated"
          ? t("complete.noveltySaturated")
          : t("complete.noveltyUnknown");

  return (
    <section
      className={cn("agency-ink mb-8 p-5 sm:p-7", compact && "mb-4")}
      data-testid="complete-ad"
      data-complete-family={completeAd.family}
      data-fact-status={completeAd.factStatus}
      data-novelty={completeAd.noveltyStatus}
      data-validation={completeAd.validation.passed ? "pass" : "fail"}
      dir={dir}
    >
      <p className="text-[12px] font-black uppercase tracking-[0.22em] text-[#F5C518]">{t("complete.kicker")}</p>
      <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-[#9FD4C8]">{loc.concept}</p>
      <h2 className="agency-display-cream mt-2 text-2xl sm:text-4xl">{loc.headline}</h2>
      <p className="mt-3 text-lg font-semibold text-[#F7F3EA]">{loc.hook}</p>
      <p className="mt-3 whitespace-pre-wrap text-base leading-relaxed text-[#E8E2D4]">{loc.copy}</p>
      {loc.offer ? (
        <p className="mt-3 text-sm text-[#F5C518]">
          <span className="font-black">{t("complete.offer")}: </span>
          {loc.offer}
        </p>
      ) : (
        <p className="mt-3 text-sm text-[#C9D0D8]">{t("complete.offerUnknown")}</p>
      )}
      {loc.proof ? (
        <p className="mt-1 text-sm text-[#9FD4C8]">
          <span className="font-black">{t("complete.proof")}: </span>
          {loc.proof}
        </p>
      ) : (
        <p className="mt-1 text-sm text-[#C9D0D8]">{t("complete.proofUnknown")}</p>
      )}
      <span className="mt-5 inline-block rounded-[10px] bg-coral px-3 py-1.5 text-xs font-black text-white">{loc.cta}</span>
      <div className="mt-4 flex flex-wrap gap-2 text-xs text-[#C9D0D8]">
        <span className="rounded-full border border-white/15 px-2 py-1">{t("complete.why")}: {loc.why}</span>
        <span className="rounded-full border border-white/15 px-2 py-1">{t("complete.audience")}: {loc.audience}</span>
        <span className="rounded-full border border-white/15 px-2 py-1">{t("complete.angle")}: {loc.angle}</span>
        <span className="rounded-full border border-white/15 px-2 py-1">{loc.platform} · {loc.format}</span>
      </div>
      <p className="mt-3 text-sm text-[#C9D0D8]">{t("complete.visual")}: {loc.visual}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="rounded-[8px] bg-[#F5C518] px-2 py-1 text-[11px] font-black text-black">
          {t("complete.fact")}: {completeAd.factStatus}
        </span>
        <span className="rounded-[8px] bg-white/10 px-2 py-1 text-[11px] font-black text-[#F7F3EA]">{novelty}</span>
        {completeAd.validation.passed ? (
          <span className="rounded-[8px] bg-[#1F6F5B] px-2 py-1 text-[11px] font-black text-white">{t("complete.validated")}</span>
        ) : (
          <span className="rounded-[8px] bg-[#7A1F1F] px-2 py-1 text-[11px] font-black text-white">{t("complete.repaired")}</span>
        )}
        {onCopy ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-white/20 bg-white/8 text-[#F7F3EA] hover:bg-white hover:text-ink"
            onClick={() => onCopy(text)}
          >
            {copied ? t("cta.copied") : t("cta.copy")}
          </Button>
        ) : null}
      </div>
      {!compact ? (
        <div className="mt-4">
          <button
            type="button"
            className="text-xs font-bold uppercase tracking-[0.14em] text-[#9FD4C8]"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? t("complete.hideMeta") : t("complete.showMeta")}
          </button>
          {open ? (
            <dl className="mt-3 grid gap-2 text-sm text-[#C9D0D8] sm:grid-cols-2">
              <div>
                <dt className="font-black text-[#9FD4C8]">{t("complete.family")}</dt>
                <dd>{completeAd.family}</dd>
              </div>
              <div>
                <dt className="font-black text-[#9FD4C8]">{t("complete.language")}</dt>
                <dd>{locale.toUpperCase()}</dd>
              </div>
              {loc.imagePrompt ? (
                <div className="sm:col-span-2">
                  <dt className="font-black text-[#9FD4C8]">{t("complete.imagePrompt")}</dt>
                  <dd>{loc.imagePrompt}</dd>
                </div>
              ) : null}
              {completeAd.marketUsed ? (
                <div className="sm:col-span-2">
                  <dt className="font-black text-[#9FD4C8]">{t("complete.market")}</dt>
                  <dd>{completeAd.marketEvidence || t("complete.marketStrategy")}</dd>
                </div>
              ) : null}
              {completeAd.metadata?.scores ? (
                <div className="sm:col-span-2">
                  <dt className="font-black text-[#9FD4C8]">{t("complete.scores")}</dt>
                  <dd>total {completeAd.metadata.scores.total} · novelty {completeAd.metadata.scores.novelty} · safety {completeAd.metadata.scores.factualSafety}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
