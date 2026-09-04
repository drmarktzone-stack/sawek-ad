"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/components/i18n-provider";
import { cn } from "@/lib/utils";

type Status = {
  configured?: boolean;
  provider?: "vertex" | "ai_studio" | "none";
  quota?: boolean;
  vertexQuota?: boolean;
  aiStudioFallback?: boolean;
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
  const studioUp =
    status.provider === "ai_studio" && status.configured && !status.quota;
  const vertexQuotaStudio =
    Boolean(status.vertexQuota) && Boolean(status.aiStudioFallback) && studioUp;
  const label = vertexUp
    ? t("gemini.vertex")
    : vertexQuotaStudio
      ? t("gemini.vertexQuotaStudio")
      : studioUp
        ? t("gemini.studio")
        : t("gemini.quota");
  const ok = vertexUp || studioUp;
  return (
    <span
      className={cn(
        "hidden max-w-[11rem] truncate rounded-full border px-2 py-0.5 text-[11px] font-bold sm:inline-block",
        ok ? "border-teal/50 bg-teal/15 text-navy" : "border-navy/15 bg-navy/5 text-muted",
        className,
      )}
      title={label}
    >
      {label}
    </span>
  );
}
