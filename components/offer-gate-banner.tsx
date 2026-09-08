"use client";

import { Button } from "@/components/ui/button";
import { LangLink } from "@/components/lang-link";
import { useI18n } from "@/components/i18n-provider";
import { persistSkipOffer } from "@/lib/campaign-tools";
import type { Locale } from "@/lib/types";

export function OfferGateBanner({
  onSkip,
}: {
  onSkip?: () => void;
}) {
  const { t, locale } = useI18n();
  return (
    <div
      className="mt-4 rounded-[14px] border border-coral/40 bg-coral/10 px-4 py-3"
      data-testid="offer-gate"
      dir={locale === "en" ? "ltr" : "rtl"}
    >
      <p className="font-black text-navy">{t("gate.title")}</p>
      <p className="mt-1 text-sm text-muted">{t("gate.body")}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button asChild size="sm">
          <LangLink href="/tools/offer">{t("gate.build")}</LangLink>
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          data-testid="offer-gate-skip"
          onClick={() => {
            persistSkipOffer(locale as Locale);
            onSkip?.();
          }}
        >
          {t("gate.skip")}
        </Button>
      </div>
    </div>
  );
}
