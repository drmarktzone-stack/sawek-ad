"use client";

import { useState } from "react";
import type { CompleteAdPackage, Locale } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/i18n-provider";
import { cn } from "@/lib/utils";
import { OverlayStatus } from "@/components/command/primitives";

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
      className={cn("mb-8 border-t border-[var(--line)] pt-5", compact && "mb-4")}
      data-testid="complete-ad"
      data-complete-family={completeAd.family}
      data-fact-status={completeAd.factStatus}
      data-novelty={completeAd.noveltyStatus}
      data-validation={completeAd.validation.passed ? "pass" : "fail"}
      dir={dir}
    >
      <p className="os-kicker">{t("complete.kicker")}</p>
      <p className="mt-2 os-meta">{t("os.studio.concept")} · {loc.concept}</p>
      <h2 className="os-title mt-2 text-3xl sm:text-5xl">{loc.headline}</h2>

      <div className="mt-6 space-y-4">
        <div>
          <p className="os-meta">{t("os.hook")}</p>
          <p className="mt-1 text-xl font-semibold text-navy">{loc.hook}</p>
        </div>
        <div>
          <p className="os-meta">{t("os.primaryCopy")}</p>
          <p className="mt-1 whitespace-pre-wrap text-base leading-relaxed text-navy">{loc.copy}</p>
        </div>
        <div>
          <p className="os-meta">{t("os.studio.export")}</p>
          <span className="mt-2 inline-block bg-coral px-4 py-2 text-sm font-black text-white">{loc.cta}</span>
        </div>
      </div>

      {loc.offer ? (
        <p className="mt-4 text-sm text-navy">
          <span className="font-black">{t("complete.offer")}: </span>
          {loc.offer}
        </p>
      ) : (
        <p className="mt-4 text-sm text-muted">{t("complete.offerUnknown")}</p>
      )}
      {loc.proof ? (
        <p className="mt-1 text-sm text-navy">
          <span className="font-black">{t("complete.proof")}: </span>
          {loc.proof}
        </p>
      ) : (
        <p className="mt-1 text-sm text-muted">{t("complete.proofUnknown")}</p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="os-badge os-badge-warn">
          {t("complete.fact")}: {completeAd.factStatus}
        </span>
        <span className="os-badge os-badge-ink">{novelty}</span>
        {completeAd.validation.passed ? (
          <span className="os-badge os-badge-ok">{t("complete.validated")}</span>
        ) : (
          <span className="os-badge os-badge-danger">{t("complete.repaired")}</span>
        )}
        {onCopy ? (
          <Button type="button" size="sm" variant="outline" onClick={() => onCopy(text)}>
            {copied ? t("cta.copied") : t("cta.copy")}
          </Button>
        ) : null}
      </div>
      <OverlayStatus composition={completeAd.imageComposition} />
      <p className="mt-3 text-sm text-muted">{t("complete.visual")}: {loc.visual}</p>

      {!compact ? (
        <div className="mt-4">
          <button
            type="button"
            className="os-kicker"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? t("complete.hideMeta") : t("os.whyOpen")}
          </button>
          {open ? (
            <dl className="mt-3 divide-y divide-[var(--line)] text-sm">
              <div className="os-row">
                <dt className="os-meta">{t("complete.why")}</dt>
                <dd>{loc.why}</dd>
              </div>
              <div className="os-row">
                <dt className="os-meta">{t("complete.audience")}</dt>
                <dd>{loc.audience}</dd>
              </div>
              <div className="os-row">
                <dt className="os-meta">{t("complete.angle")}</dt>
                <dd>{loc.angle}</dd>
              </div>
              <div className="os-row">
                <dt className="os-meta">{t("complete.family")}</dt>
                <dd>{completeAd.family}</dd>
              </div>
              <div className="os-row">
                <dt className="os-meta">{loc.platform}</dt>
                <dd>{loc.format} · {locale.toUpperCase()}</dd>
              </div>
              {loc.imagePrompt ? (
                <div className="os-row">
                  <dt className="os-meta">{t("complete.imagePrompt")}</dt>
                  <dd>{loc.imagePrompt}</dd>
                </div>
              ) : null}
              {completeAd.marketUsed ? (
                <div className="os-row">
                  <dt className="os-meta">{t("complete.market")}</dt>
                  <dd>{completeAd.marketEvidence || t("complete.marketStrategy")}</dd>
                </div>
              ) : null}
              {completeAd.metadata?.scores ? (
                <div className="os-row">
                  <dt className="os-meta">{t("complete.scores")}</dt>
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
