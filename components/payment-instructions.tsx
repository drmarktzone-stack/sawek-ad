"use client";

import { useState } from "react";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import type { ReceiveDetails } from "@/lib/payments";

function CopyRow({
  label,
  value,
  dir = "ltr",
  testId,
}: {
  label: string;
  value: string;
  dir?: "ltr" | "rtl";
  testId?: string;
}) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  return (
    <div className="flex items-center justify-between gap-3 border-b border-navy/8 py-2.5 last:border-b-0">
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wide text-muted">{label}</p>
        <p className="mt-0.5 font-black text-navy" dir={dir} data-testid={testId}>
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

export function PaymentInstructions({
  details,
  busy,
  onPaid,
}: {
  details: ReceiveDetails;
  busy?: boolean;
  onPaid: () => void;
}) {
  const { t } = useI18n();
  return (
    <section className="mt-5 rounded-[18px] border border-teal/25 bg-ivory/90 p-4" data-testid="pay-instructions">
      <h3 className="text-base font-black text-navy">{t("checkout.reveal")}</h3>
      <p className="mt-1 text-sm text-muted">{details.method === "bit" ? t("pay.bitLead") : t("pay.bankLead")}</p>
      <div className="mt-3 rounded-[14px] border border-navy/10 bg-white px-3 py-3">
        <CopyRow label={t("checkout.orderCode")} value={details.orderCode} testId="pay-order-code" />
        <p className="pt-2 text-xs text-muted">{t("checkout.orderHint")}</p>
      </div>
      <div className="mt-3">
        <CopyRow label={t("checkout.amount")} value={`₪${details.amountIls}`} />
        <CopyRow label={t("pay.bankHolder")} value={details.holder} dir="rtl" />
        {details.method === "bit" ? (
          <CopyRow label={t("pay.bitPhone")} value={details.bitPhone} testId="pay-bit-phone" />
        ) : (
          <>
            <CopyRow label={t("pay.bankName")} value={details.bankName} dir="rtl" />
            {details.bankCode ? <CopyRow label={t("pay.bankCode")} value={details.bankCode} /> : null}
            <CopyRow label={t("pay.bankBranch")} value={details.bankBranch} testId="pay-bank-branch" />
            <CopyRow label={t("pay.bankAccount")} value={details.bankAccount} testId="pay-bank-account" />
          </>
        )}
      </div>
      {details.method === "bank" ? <p className="mt-2 text-xs text-muted">{t("pay.noIban")}</p> : null}
      <Button type="button" className="mt-4 w-full" disabled={busy} onClick={onPaid} data-testid="pay-i-paid">
        {busy ? t("auth.busy") : t("bank.mark")}
      </Button>
    </section>
  );
}
