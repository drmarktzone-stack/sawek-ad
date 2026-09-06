"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { isOwnerEmail } from "@/lib/plan";
import { LangLink } from "@/components/lang-link";
import { ManualPayPanel, type BillingCfg } from "@/components/manual-pay-panel";

type Pending = {
  id: string;
  email: string | null;
  plan: string | null;
  bank_marked_paid_at: string | null;
  bit_marked_paid_at: string | null;
  bank_confirmed_at: string | null;
};

export default function BankBillingPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [cfg, setCfg] = useState<BillingCfg>({});
  const [msg, setMsg] = useState("");
  const [pending, setPending] = useState<Pending[]>([]);
  const [confirmEmail, setConfirmEmail] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/public-config");
        const data = (await res.json()) as BillingCfg;
        if (!cancelled) setCfg(data);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!user || !isOwnerEmail(user.email)) return;
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
  }, [user]);

  async function confirm(email: string) {
    await fetch("/api/billing/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email }),
    });
    setMsg(t("auth.plan.pro"));
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-black text-navy">{t("bank.title")}</h1>
      <p className="mt-2 text-sm text-muted">{t("bank.lead")}</p>
      <div className="mt-6">
        <ManualPayPanel cfg={cfg} />
      </div>
      {msg ? <p className="mt-4 text-sm font-semibold text-navy">{msg}</p> : null}

      {user && isOwnerEmail(user.email) ? (
        <section className="mt-8 rounded-[22px] border border-gold/40 bg-white p-5">
          <h2 className="font-black text-navy">{t("bank.confirm")}</h2>
          <p className="mt-1 text-xs text-muted">{t("bank.confirmHint")}</p>
          <ul className="mt-3 space-y-2 text-sm">
            {pending.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2">
                <span>
                  {p.email} · {p.plan} · bank {p.bank_marked_paid_at ? "✓" : "—"} bit {p.bit_marked_paid_at ? "✓" : "—"}
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
      ) : null}

      <p className="mt-6 text-sm">
        <LangLink href="/pricing" className="underline">
          {t("nav.pricing")}
        </LangLink>
      </p>
    </div>
  );
}
