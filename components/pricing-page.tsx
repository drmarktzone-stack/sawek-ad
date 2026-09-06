"use client";

import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { useI18n } from "@/components/i18n-provider";
import { LangLink } from "@/components/lang-link";
import { Button } from "@/components/ui/button";
import { PRICE_MONTHLY_ILS, PRICE_YEARLY_ILS } from "@/lib/plan";

export function PricingPage() {
  const { t } = useI18n();
  const { plan } = useAuth();
  const params = useSearchParams();
  const flash = params.get("checkout");

  const freeItems = ["pricing.f1", "pricing.f2", "pricing.f3", "pricing.f4", "pricing.f5"] as const;
  const proItems = ["pricing.p1", "pricing.p2", "pricing.p3", "pricing.p4", "pricing.p5"] as const;

  return (
    <div className="relative mx-auto max-w-5xl overflow-hidden px-4 py-14">
      <div aria-hidden className="agency-grain absolute inset-0" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-56 agency-hero-glow" />
      <div className="relative">
        <p className="text-center text-sm font-bold uppercase tracking-[0.28em] text-teal">{t("pricing.kicker")}</p>
        <h1 className="mt-2 agency-display text-center text-4xl sm:text-5xl">{t("pricing.title")}</h1>
        <p className="mx-auto mt-3 max-w-2xl text-center text-base text-muted sm:text-lg">{t("pricing.lead")}</p>
        {plan === "pro" ? <p className="mt-3 text-center text-sm font-black text-navy">{t("auth.plan.pro")}</p> : null}
        {flash === "success" ? <p className="mt-3 text-center text-sm font-semibold text-navy">{t("pricing.success")}</p> : null}
        {flash === "cancel" ? <p className="mt-3 text-center text-sm text-muted">{t("pricing.cancel")}</p> : null}

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <article className="agency-shell p-7">
            <h2 className="text-2xl font-black text-navy">{t("pricing.freeName")}</h2>
            <p className="mt-2 text-4xl font-black text-navy">{t("pricing.freePrice")}</p>
            <p className="text-sm text-muted">{t("pricing.freeForever")}</p>
            <ul className="mt-5 space-y-2 text-base text-navy">
              {freeItems.map((k) => (
                <li key={k}>• {t(k)}</li>
              ))}
            </ul>
            <Button asChild className="mt-6 w-full" variant="outline">
              <LangLink href="/">{t("pricing.cta.free")}</LangLink>
            </Button>
          </article>

          <article className="agency-ink p-7 shadow-[var(--shadow-lift)] ring-1 ring-white/10" data-testid="pricing-pro">
            <p className="text-xs font-black uppercase tracking-[0.26em] text-[#9FD4C8]">{t("pricing.proName")}</p>
            <p className="agency-display-cream mt-2 text-4xl">₪{PRICE_MONTHLY_ILS}</p>
            <p className="text-sm text-[#C9D0D8]">{t("pricing.month")}</p>
            <p className="mt-1 text-lg font-black text-[#F7F3EA]">
              ₪{PRICE_YEARLY_ILS} · {t("pricing.year")}
            </p>
            <p className="text-sm text-[#C9D0D8]">{t("pricing.yearHint")}</p>
            <ul className="mt-5 space-y-2 text-base text-[#E8E2D4]">
              {proItems.map((k) => (
                <li key={k}>• {t(k)}</li>
              ))}
            </ul>
            <Button asChild variant="coral" className="mt-6 w-full" data-testid="pricing-upgrade">
              <LangLink href="/checkout?interval=monthly">{t("pricing.cta.upgrade")}</LangLink>
            </Button>
            <Button asChild variant="outline" className="mt-2 w-full border-white/20 bg-transparent text-[#F7F3EA] hover:bg-white/8">
              <LangLink href="/checkout?interval=yearly">{t("pricing.cta.year")}</LangLink>
            </Button>
            <p className="mt-4 text-center text-xs font-semibold text-[#C9D0D8]">{t("pricing.checkoutHint")}</p>
          </article>
        </div>
      </div>
    </div>
  );
}
