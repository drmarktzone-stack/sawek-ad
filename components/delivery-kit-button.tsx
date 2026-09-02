"use client";

import { useState } from "react";
import { Loader2, Package } from "lucide-react";
import type { CampaignPack } from "@/lib/types";
import { downloadDeliveryKit } from "@/lib/delivery-kit";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function DeliveryKitButton({
  pack,
  className,
  fullWidth,
  compact,
}: {
  pack: CampaignPack;
  className?: string;
  fullWidth?: boolean;
  compact?: boolean;
}) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function run() {
    setBusy(true);
    setErr("");
    try {
      const ok = await downloadDeliveryKit(pack);
      if (!ok) setErr(t("end.kitError"));
    } catch {
      setErr(t("end.kitError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cn("flex flex-col gap-1", fullWidth && "w-full", className)}>
      <Button
        type="button"
        variant="outline"
        className={cn(
          "border-navy/25 bg-background text-navy hover:border-navy hover:bg-navy hover:text-white",
          fullWidth && "w-full",
        )}
        disabled={busy}
        onClick={() => void run()}
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Package className="size-4" />}
        {busy ? t("end.kitBusy") : t("end.kit")}
      </Button>
      {compact ? null : <p className="max-w-[16rem] text-[11px] leading-snug text-muted">{t("end.kitHint")}</p>}
      {err ? <p className="text-xs text-omni-red">{err}</p> : null}
    </div>
  );
}
