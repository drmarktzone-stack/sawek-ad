"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { LangLink } from "@/components/lang-link";
import {
  readLocalPending,
  writeLocalPending,
  type ManualPayMethod,
  type PublicPayments,
} from "@/lib/payments";

export type BillingCfg = Partial<PublicPayments> & {
  bankInstructions?: string;
  bitInstructions?: string;
};

function CopyRow({
  label,
  value,
  dir = "ltr",
}: {
  label: string;
  value: string;
  dir?: "ltr" | "rtl";
}) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  return (
    <div className="flex items-center justify-between gap-3 border-b border-navy/8 py-2 last:border-b-0">
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wide text-muted">{label}</p>
        <p className="mt-0.5 font-black text-navy" dir={dir}>
          {value}
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="shrink-0"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1600);
          } catch {
            /* ignore */
          }
        }}
      >
        {copied ? t("pay.copied") : t("pay.copy")}
      </Button>
    </div>
  );
}

export function ManualPayPanel({
  cfg,
  showTitle = false,
}: {
  cfg: BillingCfg;
  showTitle?: boolean;
}) {
  const { t } = useI18n();
  const { user } = useAuth();
  const [busy, setBusy] = useState("");
  const [pending, setPending] = useState<ReturnType<typeof readLocalPending>>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    setPending(readLocalPending());
  }, []);

  async function mark(method: ManualPayMethod) {
    setMsg("");
    setBusy(method);
    const local = writeLocalPending(method);
    setPending(local);
    try {
      await fetch("/api/billing/mark-paid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ method }),
      });
    } catch {
      /* local pending is enough — never upgrade */
    } finally {
      setBusy("");
      setMsg(t("bank.marked"));
    }
  }

  const bitOn = cfg.bitConfigured !== false && Boolean(cfg.bitPhone || cfg.bitInstructions);
  const bankOn = cfg.bankConfigured !== false && Boolean(cfg.bankAccount || cfg.bankInstructions);
  const extraBank = (cfg.bankInstructions || "").trim();
  const extraBit = (cfg.bitInstructions || "").trim();

  return (
    <div className="space-y-4" data-testid="manual-pay-panel">
      {showTitle ? (
        <div>
          <h2 className="text-lg font-black text-navy">{t("pay.how")}</h2>
          <p className="mt-1 text-sm text-muted">{t("pay.howLead")}</p>
        </div>
      ) : null}

      {pending ? (
        <div
          className="rounded-[16px] border border-teal/35 bg-mint px-4 py-3"
          data-testid="pay-pending"
        >
          <p className="text-sm font-black text-navy">{t("pay.pendingTitle")}</p>
          <p className="mt-1 text-sm text-navy">{t("pay.pendingBody")}</p>
        </div>
      ) : null}

      {bitOn ? (
        <section
          className="rounded-[18px] border border-navy/10 bg-ivory/80 p-4"
          data-testid="pay-bit"
        >
          <h3 className="text-base font-black text-navy">{t("pricing.bit")}</h3>
          <p className="mt-1 text-sm text-muted">{t("pay.bitLead")}</p>
          <div className="mt-3">
            <CopyRow label={t("pay.bitPhone")} value={cfg.bitPhone || ""} />
          </div>
          {extraBit && cfg.bitPhone && !extraBit.includes(cfg.bitPhone) ? (
            <pre className="mt-2 whitespace-pre-wrap text-sm text-navy">{extraBit}</pre>
          ) : null}
          <Button
            type="button"
            className="mt-4 w-full"
            disabled={Boolean(busy)}
            onClick={() => void mark("bit")}
          >
            {busy === "bit" ? t("auth.busy") : t("bank.markBit")}
          </Button>
        </section>
      ) : (
        <p className="text-sm text-muted">{t("pricing.bankEmpty")}</p>
      )}

      {bankOn ? (
        <section
          className="rounded-[18px] border border-navy/10 bg-ivory/80 p-4"
          data-testid="pay-bank"
        >
          <h3 className="text-base font-black text-navy">{t("pricing.bank")}</h3>
          <p className="mt-1 text-sm text-muted">{t("pay.bankLead")}</p>
          <div className="mt-3">
            <CopyRow label={t("pay.bankName")} value={cfg.bankName || ""} dir="rtl" />
            {cfg.bankCode ? <CopyRow label={t("pay.bankCode")} value={cfg.bankCode} /> : null}
            <CopyRow label={t("pay.bankBranch")} value={cfg.bankBranch || ""} />
            <CopyRow label={t("pay.bankAccount")} value={cfg.bankAccount || ""} />
            <CopyRow label={t("pay.bankHolder")} value={cfg.bankHolder || ""} dir="rtl" />
          </div>
          <p className="mt-2 text-xs text-muted">{t("pay.noIban")}</p>
          {extraBank && cfg.bankAccount && !extraBank.includes(cfg.bankAccount) ? (
            <pre className="mt-2 whitespace-pre-wrap text-sm text-navy">{extraBank}</pre>
          ) : null}
          <Button
            type="button"
            variant="coral"
            className="mt-4 w-full"
            disabled={Boolean(busy)}
            onClick={() => void mark("bank")}
          >
            {busy === "bank" ? t("auth.busy") : t("bank.mark")}
          </Button>
        </section>
      ) : null}

      <div
        className="rounded-[16px] border border-navy/10 bg-white px-4 py-3 opacity-80"
        data-testid="pay-paypal-offline"
      >
        <p className="text-sm font-black text-navy">{t("pricing.paypal")} — {t("pay.paypalOff")}</p>
        <p className="mt-1 text-xs text-muted">{t("pricing.paypalHint")}</p>
      </div>

      {msg ? <p className="text-sm font-semibold text-navy">{msg}</p> : null}
      {!user ? (
        <p className="text-sm text-muted">
          {t("pricing.needLogin")}{" "}
          <LangLink href="/login" className="font-semibold underline">
            {t("nav.login")}
          </LangLink>
        </p>
      ) : null}
    </div>
  );
}
