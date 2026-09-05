"use client";

import { useEffect, useState } from "react";
import { Activity, Loader2 } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { ConquerHeadline } from "@/components/stepper";
import { cn } from "@/lib/utils";

type Service = {
  id: "gemini_pro" | "gemini_flash" | "imagen" | "translation";
  live?: boolean;
  model?: string;
  role?: string;
  provider?: string;
  reason?: string;
};

type Stack = {
  configured?: boolean;
  provider?: string;
  quota?: boolean;
  project?: string;
  location?: string;
  hasAdc?: boolean;
  mapping?: {
    requestedPro?: string;
    requestedFlash?: string;
    livePro?: string;
    liveFlash?: string;
    liveImagen?: string;
    translation?: string;
    reason?: string;
  };
  services?: Service[];
  lastGemini?: { model?: string; reason?: string; tier?: string; provider?: string };
  lastImagen?: { model?: string; reason?: string };
  lastTranslation?: { reason?: string };
};

const LABELS: Record<Service["id"], "gcp.svc.pro" | "gcp.svc.flash" | "gcp.svc.imagen" | "gcp.svc.translation"> = {
  gemini_pro: "gcp.svc.pro",
  gemini_flash: "gcp.svc.flash",
  imagen: "gcp.svc.imagen",
  translation: "gcp.svc.translation",
};

function reasonNote(
  t: (key: "gcp.note.quota" | "gcp.note.noAdc" | "gcp.note.denied" | "gcp.note.imagen" | "gcp.note.translation" | "gcp.note.down") => string,
  reason?: string,
): string {
  if (!reason || reason === "ok") return "";
  if (reason === "quota") return t("gcp.note.quota");
  if (reason === "no_adc" || reason === "not_configured" || reason === "no_key") return t("gcp.note.noAdc");
  if (reason === "vertex_denied") return t("gcp.note.denied");
  if (reason === "imagen_error") return t("gcp.note.imagen");
  if (reason === "translation_error") return t("gcp.note.translation");
  return t("gcp.note.down");
}

export function GcpStatusPage() {
  const { t } = useI18n();
  const [stack, setStack] = useState<Stack | null>(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/gemini-status", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: Stack) => {
        if (!cancelled) setStack(data);
      })
      .catch(() => {
        if (!cancelled) setStack({ configured: false, services: [] });
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const services = stack?.services ?? [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <ConquerHeadline subtitle={t("gcp.title")} />
      <p className="mx-auto mb-8 max-w-2xl text-center text-sm text-muted">{t("gcp.lead")}</p>
      {busy ? (
        <p className="flex items-center justify-center gap-2 text-sm font-semibold text-navy">
          <Loader2 className="size-4 animate-spin" />
          {t("gcp.loading")}
        </p>
      ) : null}
      <div className="grid gap-3">
        {services.map((s) => (
          <article
            key={s.id}
            data-gcp-service={s.id}
            className={cn(
              "rounded-2xl border bg-white p-5",
              s.live ? "border-teal/40" : "border-gold/40",
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-base font-black text-navy">{t(LABELS[s.id])}</p>
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-[11px] font-black uppercase",
                  s.live ? "bg-teal/15 text-teal" : "bg-gold/20 text-navy",
                )}
              >
                {s.live ? t("gcp.live") : t("gcp.down")}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted">{s.role}</p>
            <p className="mt-2 font-mono text-[13px] text-navy">{s.model}</p>
            <p className="text-[12px] text-muted">
              {s.provider === "vertex" ? t("gemini.vertex") : s.provider === "ai_studio" ? t("gemini.studio") : t("gcp.noProvider")}
            </p>
            {!s.live ? <p className="mt-2 text-sm font-semibold text-gold">{reasonNote(t, s.reason)}</p> : null}
          </article>
        ))}
      </div>
      {stack?.mapping ? (
        <section className="mt-8 rounded-2xl border border-navy/10 bg-white p-5">
          <p className="flex items-center gap-2 text-[13px] font-black uppercase tracking-[0.18em] text-gold">
            <Activity className="size-4" />
            {t("gcp.mapping")}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-foreground">{stack.mapping.reason}</p>
          <ul className="mt-3 space-y-1 font-mono text-[13px] text-navy">
            <li>{stack.mapping.requestedPro} → {stack.mapping.livePro}</li>
            <li>{stack.mapping.requestedFlash} → {stack.mapping.liveFlash}</li>
            <li>Imagen 3 → {stack.mapping.liveImagen}</li>
            <li>Translation → {stack.mapping.translation}</li>
          </ul>
          <p className="mt-3 text-[12px] text-muted">
            {t("gcp.project")}: {stack.project} · {stack.location}
            {stack.hasAdc ? ` · ADC` : ""}
          </p>
        </section>
      ) : null}
    </div>
  );
}
