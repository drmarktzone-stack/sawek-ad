"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useI18n } from "@/components/i18n-provider";
import { LangLink } from "@/components/lang-link";
import { Button } from "@/components/ui/button";
import { readLocalPending } from "@/lib/payments";

export function CheckoutPendingPage() {
  const { t } = useI18n();
  const params = useSearchParams();
  const [orderCode, setOrderCode] = useState("");
  const stripeOk = params.get("checkout") === "success";

  useEffect(() => {
    const pending = readLocalPending();
    if (pending?.orderCode) setOrderCode(pending.orderCode);
  }, []);

  return (
    <div className="relative mx-auto max-w-2xl overflow-hidden px-4 py-14">
      <div aria-hidden className="agency-grain absolute inset-0" />
      <div className="relative">
        <div className="agency-ink p-8 shadow-[var(--shadow-lift)]">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-teal">{t("checkout.pendingKicker")}</p>
          <h1 className="agency-display-cream mt-2 text-4xl">{t("checkout.pendingTitle")}</h1>
          <p className="mt-3 text-base leading-relaxed text-muted">
            {stripeOk ? t("pricing.success") : t("checkout.pendingLead")}
          </p>
          {orderCode ? (
            <p className="mt-4 rounded-[14px] border border-[var(--line)] bg-white px-4 py-3 font-black tracking-[0.14em] text-navy" dir="ltr" data-testid="pending-order-code">
              {orderCode}
            </p>
          ) : null}
        </div>
        <section className="agency-board mt-6 p-6">
          <h2 className="text-lg font-black text-navy">{t("checkout.whatNext")}</h2>
          <ol className="mt-4 space-y-3 text-sm text-navy">
            <li>1. {t("checkout.next1")}</li>
            <li>2. {t("checkout.next2")}</li>
            <li>3. {t("checkout.next3")}</li>
          </ol>
          <p className="mt-4 text-sm text-muted">{t("pay.pendingBody")}</p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Button asChild className="w-full sm:w-auto">
              <LangLink href="/">{t("checkout.backDesk")}</LangLink>
            </Button>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <LangLink href="/pricing">{t("checkout.backPricing")}</LangLink>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
