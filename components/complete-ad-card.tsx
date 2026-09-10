"use client";

import { useState } from "react";
import type { CompleteAdPackage, Locale } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/i18n-provider";
import { cn } from "@/lib/utils";
import { OverlayStatus } from "@/components/command/primitives";
import { customerCopyHasLeak, localeScriptBleed } from "@/lib/copy-purity";

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
  const headline = customerCopyHasLeak(loc.headline) || localeScriptBleed(loc.headline, locale) ? loc.copy.split("\n")[0] || loc.headline : loc.headline;
  const hook = customerCopyHasLeak(loc.hook) || localeScriptBleed(loc.hook, locale) ? headline : loc.hook;
  const copy = customerCopyHasLeak(loc.copy) || localeScriptBleed(loc.copy, locale) ? "" : loc.copy;
  const text = [headline, copy, loc.cta].filter(Boolean).join("\n");
  const novelty =
    completeAd.noveltyStatus === "original"
      ? t("complete.noveltyOriginal")
      : completeAd.noveltyStatus === "evolved"
        ? t("complete.noveltyEvolved")
        : completeAd.noveltyStatus === "saturated"
          ? t("complete.noveltySaturated")
          : t("complete.noveltyUnknown");
  const visual = completeAd.visualPublicUrl || completeAd.visualSrc;

  return (
    <section
      className={cn(
        "mb-8 overflow-hidden rounded-[16px] border border-[var(--line)] bg-white p-5 shadow-[var(--shadow-card)] sm:p-7",
        compact && "mb-4 p-4",
      )}
      data-testid="complete-ad"
      data-complete-family={completeAd.family}
      data-fact-status={completeAd.factStatus}
      data-novelty={completeAd.noveltyStatus}
      data-validation={completeAd.validation.passed ? "pass" : "fail"}
      data-visual-source={completeAd.visualSource || "composition"}
      dir={dir}
    >
      <p className="os-kicker">{t("complete.kicker")}</p>
      <h2 className="os-title mt-2 text-3xl sm:text-5xl">{headline}</h2>
      {hook && hook !== headline ? (
        <p className="mt-3 text-xl font-semibold text-navy">{hook}</p>
      ) : null}

      {visual ? (
        <figure className="mt-6 overflow-hidden rounded-[18px] border-2 border-[var(--ink)] bg-[var(--ivory)]" data-testid="complete-ad-visual">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={visual} alt="" className="aspect-[1.91/1] w-full object-cover" />
        </figure>
      ) : null}

      <div className="mt-6 space-y-4">
        {copy ? (
          <p className="whitespace-pre-wrap text-base leading-relaxed text-navy">{copy}</p>
        ) : null}
        <span className="inline-block rounded-[18px] bg-lime px-5 py-2.5 text-sm font-black text-[var(--lime-ink)]">
          {loc.cta}
        </span>
      </div>

      {loc.offer ? (
        <p className="mt-4 text-sm text-navy">
          <span className="font-black">{t("complete.offer")}: </span>
          {loc.offer}
        </p>
      ) : (
        <p className="mt-4 text-sm text-muted">{t("complete.offerUnknown")}</p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="os-badge os-badge-warn">
          {t("complete.fact")}: {t(`complete.fact.${completeAd.factStatus}`)}
        </span>
        <span className="os-badge os-badge-ink">{novelty}</span>
        {completeAd.validation.passed ? (
          <span className="os-badge os-badge-ok">{t("complete.validated")}</span>
        ) : (
          <span className="os-badge os-badge-danger">{t("complete.repaired")}</span>
        )}
        {completeAd.metadata?.gcp ? (
          <span className="os-badge os-badge-line" data-testid="complete-ad-gcp">
            {[
              completeAd.metadata.gcp.pro ? t("complete.gcp.pro") : null,
              completeAd.metadata.gcp.flash ? t("complete.gcp.flash") : null,
              completeAd.metadata.gcp.imagen ? t("complete.gcp.imagen") : null,
              completeAd.metadata.gcp.translation ? t("complete.gcp.translation") : null,
              completeAd.metadata.gcp.grounding ? t("complete.gcp.grounding") : null,
            ]
              .filter(Boolean)
              .join(" · ") || t("complete.gcp.templates")}
          </span>
        ) : null}
        {onCopy ? (
          <Button type="button" size="sm" variant="outline" onClick={() => onCopy(text)}>
            {copied ? t("cta.copied") : t("cta.copy")}
          </Button>
        ) : null}
      </div>
      <OverlayStatus composition={completeAd.imageComposition} />

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
                <dt className="os-meta">{t("os.studio.concept")}</dt>
                <dd>{loc.concept}</dd>
              </div>
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
              {loc.proof ? (
                <div className="os-row">
                  <dt className="os-meta">{t("complete.proof")}</dt>
                  <dd>{loc.proof}</dd>
                </div>
              ) : null}
              {loc.visual ? (
                <div className="os-row">
                  <dt className="os-meta">{t("complete.visual")}</dt>
                  <dd>{loc.visual}</dd>
                </div>
              ) : null}
              {completeAd.marketUsed ? (
                <div className="os-row">
                  <dt className="os-meta">{t("complete.market")}</dt>
                  <dd>{completeAd.marketEvidence || t("complete.marketStrategy")}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
