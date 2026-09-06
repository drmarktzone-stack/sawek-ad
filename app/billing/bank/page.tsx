"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { isOwnerEmail } from "@/lib/plan";
import { LangLink } from "@/components/lang-link";
import { withLang } from "@/lib/locale-url";

type Pending = {
  id: string;
  email: string | null;
  plan: string | null;
  billing_interval: string | null;
  bank_marked_paid_at: string | null;
  bit_marked_paid_at: string | null;
  bank_confirmed_at: string | null;
};

export default function BankBillingPage() {
  const { t, locale } = useI18n();
  const { user, ready } = useAuth();
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [pending, setPending] = useState<Pending[]>([]);
  const [confirmEmail, setConfirmEmail] = useState("");

  const owner = Boolean(user && isOwnerEmail(user.email));

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace(withLang(`/login?next=${encodeURIComponent("/billing/bank")}`, locale));
      return;
    }
    if (!isOwnerEmail(user.email)) {
      router.replace(withLang("/checkout", locale));
    }
  }, [ready, user, router, locale]);

  useEffect(() => {
    if (!owner) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/billing/confirm", { credentials: "include" });
        const data = (await res.json()) as { pending?: Pending[] };
        if (!cancelled) setPending(data.pending ?? []);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [owner]);

  async function confirm(email: string) {
    await fetch("/api/billing/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email }),
    });
    setMsg(t("auth.plan.pro"));
    setPending((rows) => rows.map((p) => (p.email === email ? { ...p, bank_confirmed_at: new Date().toISOString(), plan: "pro" } : p)));
  }

  if (!ready || !owner) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="text-sm font-semibold text-muted">{t("bank.ownerOnly")}</p>
      </div>
    );
  }

  return (
    <div className="relative mx-auto max-w-2xl overflow-hidden px-4 py-12">
      <div aria-hidden className="agency-grain absolute inset-0" />
      <div className="relative">
        <div className="agency-ink p-6 shadow-[var(--shadow-lift)]">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#9FD4C8]">Desk Noir</p>
          <h1 className="agency-display-cream mt-2 text-3xl">{t("bank.title")}</h1>
          <p className="mt-2 text-sm text-[#E8E2D4]">{t("bank.lead")}</p>
        </div>

        {msg ? <p className="mt-4 text-sm font-semibold text-navy">{msg}</p> : null}

        <section className="agency-board mt-6 p-5">
          <h2 className="font-black text-navy">{t("bank.confirm")}</h2>
          <p className="mt-1 text-xs text-muted">{t("bank.confirmHint")}</p>
          {pending.length === 0 ? <p className="mt-4 text-sm text-muted">{t("bank.empty")}</p> : null}
          <ul className="mt-3 space-y-2 text-sm">
            {pending.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 rounded-[14px] border border-navy/8 bg-ivory/70 px-3 py-2">
                <span>
                  {p.email} · {p.plan} · {p.billing_interval || "—"} · bank {p.bank_marked_paid_at ? "✓" : "—"} bit{" "}
                  {p.bit_marked_paid_at ? "✓" : "—"}
                </span>
                {!p.bank_confirmed_at && p.email ? (
                  <Button type="button" size="sm" onClick={() => void confirm(p.email!)}>
                    {t("bank.confirm")}
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
          <div className="mt-4">
            <Label>{t("auth.email")}</Label>
            <Input value={confirmEmail} onChange={(e) => setConfirmEmail(e.target.value)} dir="ltr" />
            <Button type="button" className="mt-2" onClick={() => void confirm(confirmEmail)}>
              {t("bank.confirm")}
            </Button>
          </div>
        </section>

        <p className="mt-6 text-sm">
          <LangLink href="/pricing" className="underline">
            {t("nav.pricing")}
          </LangLink>
        </p>
      </div>
    </div>
  );
}
