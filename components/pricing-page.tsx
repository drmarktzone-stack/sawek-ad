"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { useI18n } from "@/components/i18n-provider";
import { LangLink } from "@/components/lang-link";
import { Button } from "@/components/ui/button";
import { ManualPayPanel, type BillingCfg } from "@/components/manual-pay-panel";
import { PRICE_MONTHLY_ILS, PRICE_YEARLY_ILS } from "@/lib/plan";

type PublicBilling = BillingCfg & {
  stripeEnabled?: boolean;
  stripePublishableKey?: string;
};

export function PricingPage() {
  const { t } = useI18n();
  const { user, plan } = useAuth();
  const params = useSearchParams();
  const [cfg, setCfg] = useState<PublicBilling>({});
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/public-config");
        const data = (await res.json()) as PublicBilling;
        if (!cancelled) setCfg(data);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const flash = params.get("checkout");

  async function checkout(interval: "monthly" | "yearly") {
    setErr("");
    if (!user) {
      setErr(t("pricing.needLogin"));
      return;
    }
    if (!cfg.stripeEnabled) {
      setErr(t("pricing.stripeWait"));
      return;
    }
    setBusy(`card-${interval}`);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ interval, method: "card" }),
      });
      const data = (await res.json()) as { ok?: boolean; url?: string; messageHe?: string };
      if (!res.ok || !data.ok || !data.url) {
        setErr(data.messageHe || t("pricing.stripeWait"));
        return;
      }
      window.location.href = data.url;
    } catch {
      setErr(t("pricing.stripeWait"));
    } finally {
      setBusy("");
    }
  }

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

        <article className="agency-shell border-teal/45 p-7 ring-1 ring-teal/30">
          <h2 className="text-2xl font-black text-navy">{t("pricing.proName")}</h2>
          <p className="mt-2 text-4xl font-black text-navy">₪{PRICE_MONTHLY_ILS}</p>
          <p className="text-sm text-muted">{t("pricing.month")}</p>
          <p className="mt-1 text-lg font-black text-navy">₪{PRICE_YEARLY_ILS} · {t("pricing.year")}</p>
          <p className="text-sm text-muted">{t("pricing.yearHint")}</p>
          <ul className="mt-5 space-y-2 text-base text-navy">
            {proItems.map((k) => (
              <li key={k}>• {t(k)}</li>
            ))}
          </ul>

          <div className="mt-6">
            <ManualPayPanel cfg={cfg} showTitle />
          </div>

          {cfg.stripeEnabled ? (
            <div className="mt-4 flex flex-col gap-2">
              <p className="text-xs font-bold uppercase tracking-wide text-muted">{t("pricing.cardOptional")}</p>
              <Button type="button" className="w-full" disabled={Boolean(busy)} onClick={() => void checkout("monthly")}>
                {busy === "card-monthly" ? t("auth.busy") : t("pricing.cta.month")}
              </Button>
              <Button type="button" variant="coral" className="w-full" disabled={Boolean(busy)} onClick={() => void checkout("yearly")}>
                {busy === "card-yearly" ? t("auth.busy") : t("pricing.cta.year")}
              </Button>
            </div>
          ) : (
            <p className="mt-4 text-xs text-muted">{t("pricing.stripeWait")}</p>
          )}
        </article>
      </div>
      {err ? <p className="mt-4 text-center text-sm font-semibold text-danger">{err}</p> : null}
      {!user ? <p className="mt-4 text-center text-sm text-muted">{t("pricing.needLogin")} <LangLink href="/login" className="font-semibold underline">{t("nav.login")}</LangLink></p> : null}
      </div>
    </div>
  );
}
