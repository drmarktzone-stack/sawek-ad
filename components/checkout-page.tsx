"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { useI18n } from "@/components/i18n-provider";
import { LangLink } from "@/components/lang-link";
import { PaymentInstructions } from "@/components/payment-instructions";
import { Button } from "@/components/ui/button";
import { withLang } from "@/lib/locale-url";
import { PRICE_MONTHLY_ILS, PRICE_YEARLY_ILS } from "@/lib/plan";
import {
  parseInterval,
  parsePayMethod,
  writeLocalPending,
  type BillingInterval,
  type ManualPayMethod,
  type PublicPayments,
  type ReceiveDetails,
} from "@/lib/payments";
import { cn } from "@/lib/utils";

type Flags = Pick<PublicPayments, "stripeEnabled" | "bitConfigured" | "bankConfigured">;

export function CheckoutPage() {
  const { t, locale } = useI18n();
  const { user, ready, plan } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [interval, setInterval] = useState<BillingInterval>(parseInterval(params.get("interval")));
  const [method, setMethod] = useState<ManualPayMethod | null>(parsePayMethod(params.get("method")));
  const [flags, setFlags] = useState<Flags>({ stripeEnabled: false, bitConfigured: true, bankConfigured: true });
  const [details, setDetails] = useState<ReceiveDetails | null>(null);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");

  const returnTo = useMemo(() => {
    const q = new URLSearchParams();
    q.set("interval", interval);
    return `/checkout?${q.toString()}`;
  }, [interval]);

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace(withLang(`/login?next=${encodeURIComponent(returnTo)}`, locale));
    }
  }, [ready, user, router, locale, returnTo]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/public-config", { cache: "no-store" });
        const data = (await res.json()) as Flags;
        if (!cancelled) {
          setFlags({
            stripeEnabled: Boolean(data.stripeEnabled),
            bitConfigured: data.bitConfigured !== false,
            bankConfigured: data.bankConfigured !== false,
          });
        }
      } catch {
        /* flags stay on */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!user || !method) {
      setDetails(null);
      return;
    }
    let cancelled = false;
    setErr("");
    setBusy("details");
    (async () => {
      try {
        const res = await fetch("/api/billing/receive-details", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ method, interval }),
        });
        const data = (await res.json()) as ReceiveDetails & { ok?: boolean };
        if (cancelled) return;
        if (!res.ok || !data.ok) {
          setDetails(null);
          setErr(t("checkout.detailsError"));
          return;
        }
        setDetails(data);
      } catch {
        if (!cancelled) {
          setDetails(null);
          setErr(t("checkout.detailsError"));
        }
      } finally {
        if (!cancelled) setBusy("");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, method, interval, t]);

  async function markPaid() {
    if (!details) return;
    setBusy("paid");
    setErr("");
    writeLocalPending({ method: details.method, interval: details.interval, orderCode: details.orderCode });
    try {
      const res = await fetch("/api/billing/mark-paid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ method: details.method, interval: details.interval, orderCode: details.orderCode }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; persisted?: boolean; error?: string };
      if (res.status === 401 || data.error === "auth") {
        setErr(t("bank.needLogin"));
        return;
      }
      if (!res.ok || data.ok === false || data.persisted === false) {
        setErr(t("checkout.notQueued"));
        return;
      }
      router.push(withLang("/checkout/pending", locale));
    } catch {
      setErr(t("checkout.detailsError"));
    } finally {
      setBusy("");
    }
  }

  async function cardCheckout() {
    setErr("");
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

  const amount = interval === "yearly" ? PRICE_YEARLY_ILS : PRICE_MONTHLY_ILS;
  const proItems = ["pricing.p1", "pricing.p2", "pricing.p3", "pricing.p4", "pricing.p5"] as const;

  if (!ready || !user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="text-sm font-semibold text-muted">{t("checkout.loading")}</p>
      </div>
    );
  }

  return (
    <div className="relative mx-auto max-w-5xl overflow-hidden px-4 py-12">
      <div aria-hidden className="agency-grain absolute inset-0" />
      <div className="relative">
        <p className="agency-kicker">{t("checkout.kicker")}</p>
        <h1 className="mt-2 agency-display text-4xl sm:text-5xl">{t("checkout.title")}</h1>
        <p className="mt-2 max-w-2xl text-base text-muted">{t("checkout.lead")}</p>
        {plan === "pro" ? <p className="mt-3 text-sm font-black text-navy">{t("auth.plan.pro")}</p> : null}
        {params.get("checkout") === "cancel" ? <p className="mt-3 text-sm text-muted">{t("pricing.cancel")}</p> : null}

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <aside className="agency-ink p-6 shadow-[var(--shadow-lift)]">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-teal">{t("checkout.summary")}</p>
            <h2 className="agency-display-cream mt-2 text-3xl">{t("checkout.plan")}</h2>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                className={cn(
                  "rounded-[14px] border px-3 py-3 text-start",
                  interval === "monthly" ? "border-teal bg-mint/40" : "border-[var(--line)] bg-transparent",
                )}
                onClick={() => setInterval("monthly")}
              >
                <p className="text-xs font-bold text-muted">{t("checkout.monthly")}</p>
                <p className="mt-1 text-lg font-black text-navy">₪{PRICE_MONTHLY_ILS}</p>
              </button>
              <button
                type="button"
                className={cn(
                  "rounded-[14px] border px-3 py-3 text-start",
                  interval === "yearly" ? "border-teal bg-mint/40" : "border-[var(--line)] bg-transparent",
                )}
                onClick={() => setInterval("yearly")}
              >
                <p className="text-xs font-bold text-muted">{t("checkout.yearly")}</p>
                <p className="mt-1 text-lg font-black text-navy">₪{PRICE_YEARLY_ILS}</p>
              </button>
            </div>
            <p className="mt-4 text-sm text-muted">{t("checkout.due")}</p>
            <p className="text-3xl font-black text-navy">₪{amount}</p>
            <ul className="mt-5 space-y-2 text-sm text-muted">
              {proItems.map((k) => (
                <li key={k}>• {t(k)}</li>
              ))}
            </ul>
            <p className="mt-6 text-xs leading-relaxed text-muted">
              {t("checkout.legal")}{" "}
              <LangLink href="/terms" className="underline">
                {t("nav.terms")}
              </LangLink>
              {" · "}
              <LangLink href="/privacy" className="underline">
                {t("nav.privacy")}
              </LangLink>
            </p>
            <p className="mt-2 text-xs font-semibold text-teal">{t("checkout.honest")}</p>
          </aside>

          <section className="agency-board p-6">
            <h2 className="text-xl font-black text-navy">{t("checkout.methods")}</h2>
            <p className="mt-1 text-sm text-muted">{t("checkout.methodsLead")}</p>
            <div className="mt-4 space-y-3">
              {flags.bitConfigured ? (
                <MethodCard
                  testId="pay-method-bit"
                  active={method === "bit"}
                  title={t("pricing.bit")}
                  hint={t("checkout.bitHint")}
                  onClick={() => setMethod("bit")}
                />
              ) : null}
              {flags.bankConfigured ? (
                <MethodCard
                  testId="pay-method-bank"
                  active={method === "bank"}
                  title={t("pricing.bank")}
                  hint={t("checkout.bankHint")}
                  onClick={() => setMethod("bank")}
                />
              ) : null}
              <div
                className="rounded-[16px] border border-navy/10 bg-ivory/70 px-4 py-3 opacity-70"
                data-testid="pay-paypal-offline"
                aria-disabled
              >
                <p className="text-sm font-black text-navy">
                  {t("pricing.paypal")} — {t("pay.paypalOff")}
                </p>
                <p className="mt-1 text-xs text-muted">{t("pricing.paypalHint")}</p>
              </div>
              {flags.stripeEnabled ? (
                <button
                  type="button"
                  className="w-full rounded-[16px] border border-navy/10 bg-white px-4 py-3 text-start hover:border-teal"
                  onClick={() => void cardCheckout()}
                  disabled={Boolean(busy)}
                >
                  <p className="text-sm font-black text-navy">{t("pricing.cardOptional")}</p>
                  <p className="mt-1 text-xs text-muted">{t("checkout.cardHint")}</p>
                </button>
              ) : (
                <p className="text-xs text-muted">{t("pricing.stripeWait")}</p>
              )}
            </div>

            {details ? (
              <PaymentInstructions details={details} busy={busy === "paid"} onPaid={() => void markPaid()} />
            ) : busy === "details" ? (
              <p className="mt-5 text-sm text-muted">{t("checkout.loading")}</p>
            ) : null}
            {err ? <p className="mt-4 text-sm font-semibold text-danger">{err}</p> : null}
          </section>
        </div>
        <p className="mt-6 text-sm">
          <LangLink href="/pricing" className="font-semibold underline">
            {t("checkout.backPricing")}
          </LangLink>
        </p>
      </div>
    </div>
  );
}

function MethodCard({
  title,
  hint,
  active,
  onClick,
  testId,
}: {
  title: string;
  hint: string;
  active: boolean;
  onClick: () => void;
  testId: string;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      className={cn(
        "w-full rounded-[16px] border px-4 py-3 text-start transition",
        active ? "border-teal bg-mint/60 ring-2 ring-teal/30" : "border-navy/10 bg-white hover:border-teal/50",
      )}
    >
      <p className="text-sm font-black text-navy">{title}</p>
      <p className="mt-1 text-xs text-muted">{hint}</p>
    </button>
  );
}
