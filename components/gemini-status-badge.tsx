"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/components/i18n-provider";
import { cn } from "@/lib/utils";

type Status = {
  configured?: boolean;
  provider?: "vertex" | "ai_studio" | "none";
  quota?: boolean;
};

export function GeminiStatusBadge({ className }: { className?: string }) {
  const { t } = useI18n();
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/gemini-status", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: Status) => {
        if (!cancelled && data && typeof data === "object") setStatus(data);
      })
      .catch(() => {
        if (!cancelled) setStatus({ configured: false, quota: true, provider: "none" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!status) return null;
  const vertexUp = status.provider === "vertex" && status.configured && !status.quota;
  return (
    <span
      className={cn(
        "hidden max-w-[9.5rem] truncate rounded-full border px-2 py-0.5 text-[11px] font-bold sm:inline-block",
        vertexUp ? "border-gold/50 bg-gold/15 text-navy" : "border-navy/10 bg-navy/5 text-muted",
        className,
      )}
      title={vertexUp ? t("gemini.vertex") : t("gemini.quota")}
    >
      {vertexUp ? t("gemini.vertex") : t("gemini.quota")}
    </span>
  );
}
