"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/components/i18n-provider";
import { LangLink } from "@/components/lang-link";
import { cn } from "@/lib/utils";

type Service = { id?: string; live?: boolean };
type Status = {
  configured?: boolean;
  provider?: "vertex" | "ai_studio" | "none";
  quota?: boolean;
  vertexQuota?: boolean;
  aiStudioFallback?: boolean;
  services?: Service[];
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
  const anyDown = (status.services ?? []).some((s) => s.live === false);
  const label = vertexUp
    ? t("gemini.vertex")
    : vertexQuotaStudio
      ? t("gemini.vertexQuotaStudio")
      : studioUp
        ? t("gemini.studio")
        : t("gemini.quota");
  const ok = vertexUp || studioUp;
  return (
    <LangLink
      href="/status"
      className={cn(
        "hidden max-w-[11rem] truncate rounded-full border px-2 py-0.5 text-[11px] font-bold sm:inline-block",
        ok && !anyDown ? "border-gold/50 bg-gold/15 text-navy" : "border-gold/40 bg-gold/10 text-navy",
        className,
      )}
      title={anyDown ? t("gcp.note.down") : label}
    >
      {anyDown ? t("gcp.badge.partial") : label}
    </LangLink>
  );
}
