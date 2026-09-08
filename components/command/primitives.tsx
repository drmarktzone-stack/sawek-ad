"use client";

import { useState, type ReactNode } from "react";
import type React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ImageCompositionDecision, ImageCompositionMode } from "@/lib/types";
import type { ExperimentStatus } from "@/lib/scientist/types";
import { useI18n } from "@/components/i18n-provider";

export function OsPage({ children, className, ...props }: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("os-page", className)} {...props}>{children}</div>;
}

export function OsSection({
  kicker,
  title,
  action,
  children,
  className,
}: {
  kicker?: string;
  title?: string;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("os-section", className)}>
      {(kicker || title || action) && (
        <header className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div className="min-w-0">
            {kicker ? <p className="os-kicker">{kicker}</p> : null}
            {title ? <h2 className="os-title mt-1 text-2xl sm:text-3xl">{title}</h2> : null}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function OsRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="os-row">
      <dt className="os-meta">{label}</dt>
      <dd className="min-w-0 text-start text-base font-semibold text-navy">{children}</dd>
    </div>
  );
}

export function OsUnknown({ label }: { label?: string }) {
  const { t } = useI18n();
  return <span className="os-unknown">{label || t("os.unknown")}</span>;
}

export function OsLoading() {
  const { t } = useI18n();
  return <p className="os-state">{t("os.loading")}</p>;
}

export function OsEmpty({ children }: { children?: ReactNode }) {
  const { t } = useI18n();
  return <div className="os-state agency-empty rounded-[14px] px-4 py-8">{children || t("os.empty")}</div>;
}

export function OsDisclosure({
  summary,
  children,
  defaultOpen = false,
}: {
  summary: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="os-section">
      <button
        type="button"
        className="tap-row flex w-full items-center justify-between gap-3 text-start"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="os-title text-xl sm:text-2xl">{summary}</span>
        <ChevronDown className={cn("size-5 shrink-0 text-muted transition-transform", open && "rotate-180")} />
      </button>
      {open ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}

export function OsTabs({
  tabs,
  value,
  onChange,
}: {
  tabs: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="os-tabs" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={value === tab.id}
          className={cn("os-tab", value === tab.id && "is-active")}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function overlayTone(mode?: ImageCompositionMode, collision?: boolean): "ok" | "warn" | "danger" {
  if (!mode || collision) return "danger";
  if (mode === "overlay_safe") return "ok";
  if (mode === "safe_zone_top" || mode === "safe_zone_bottom") return "warn";
  return "danger";
}

export function OverlayStatus({
  composition,
}: {
  composition?: ImageCompositionDecision;
}) {
  const { t } = useI18n();
  const tone = overlayTone(composition?.mode, composition?.collision);
  const label =
    tone === "ok" ? t("os.overlay.safe") : tone === "warn" ? t("os.overlay.limited") : t("os.overlay.not");
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2" data-testid="overlay-status" data-overlay={tone}>
      <span className={cn("os-badge", tone === "ok" ? "os-badge-ok" : tone === "warn" ? "os-badge-warn" : "os-badge-danger")}>
        {label}
      </span>
      {composition?.hasExistingText ? <span className="os-badge os-badge-line">{t("os.overlay.hasText")}</span> : null}
      {composition?.reason ? <span className="text-xs text-muted">{composition.reason}</span> : null}
    </div>
  );
}

export function ExperimentBadge({ status, learned }: { status: ExperimentStatus; learned?: boolean }) {
  const { t } = useI18n();
  if (learned || status === "completed") {
    return (
      <span className="os-badge os-badge-ok">
        {learned ? t("os.exp.learned") : t("os.exp.completed")}
      </span>
    );
  }
  if (status === "running") return <span className="os-badge os-badge-warn">{t("os.exp.running")}</span>;
  if (status === "abandoned") return <span className="os-badge os-badge-line">{t("os.exp.abandoned")}</span>;
  return <span className="os-badge os-badge-ink">{t("os.exp.planned")}</span>;
}

export function ValueOrUnknown({ value }: { value?: string | number | null }) {
  if (value === 0) return <>0</>;
  if (value == null || value === "") return <OsUnknown />;
  return <>{value}</>;
}
