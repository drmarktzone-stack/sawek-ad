"use client";

import { Clapperboard, Compass, FlaskConical, FolderKanban, LayoutDashboard, Megaphone, Palette, Store } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { LangLink } from "@/components/lang-link";
import { cn } from "@/lib/utils";

/** Named product functions → existing OS routes. No stub pages. */
export const PRODUCT_FUNCTIONS = [
  {
    id: "branding",
    href: "/discovery",
    extraHref: "/strategy",
    extraKey: "nav.strategy" as const,
    key: "fn.branding" as const,
    hint: "fn.brandingHint" as const,
    icon: Palette,
  },
  {
    id: "marketing",
    href: "/",
    extraHref: undefined,
    extraKey: undefined,
    key: "fn.marketing" as const,
    hint: "fn.marketingHint" as const,
    icon: Store,
  },
  {
    id: "promotion",
    href: "/media",
    extraHref: "/leads",
    extraKey: "nav.leads" as const,
    key: "fn.promotion" as const,
    hint: "fn.promotionHint" as const,
    icon: Megaphone,
  },
  {
    id: "ads",
    href: "/studio",
    extraHref: undefined,
    extraKey: undefined,
    key: "fn.ads" as const,
    hint: "fn.adsHint" as const,
    icon: Clapperboard,
  },
  {
    id: "campaigns",
    href: "/campaigns",
    extraHref: "/",
    extraKey: "nav.build" as const,
    key: "fn.campaigns" as const,
    hint: "fn.campaignsHint" as const,
    icon: FolderKanban,
  },
  {
    id: "lab",
    href: "/lab",
    extraHref: undefined,
    extraKey: undefined,
    key: "fn.lab" as const,
    hint: "fn.labHint" as const,
    icon: FlaskConical,
  },
  {
    id: "dashboard",
    href: "/dashboard",
    extraHref: undefined,
    extraKey: undefined,
    key: "fn.dashboard" as const,
    hint: "fn.dashboardHint" as const,
    icon: LayoutDashboard,
  },
] as const;

export function FunctionRail({ compact = false, tone = "light" }: { compact?: boolean; tone?: "light" | "ink" }) {
  const { t } = useI18n();
  if (compact) {
    return (
      <nav className="flex min-w-0 items-center gap-1 overflow-x-auto" aria-label={t("fn.title")}>
        {PRODUCT_FUNCTIONS.map((fn) => {
          const Icon = fn.icon;
          return (
            <LangLink
              key={fn.id}
              href={fn.href}
              className={cn(
                "tap-row flex shrink-0 items-center gap-1 rounded-[10px] border px-3 py-2 text-sm font-bold",
                tone === "ink"
                  ? "border-white/15 text-[#F7F3EA] hover:bg-white/10"
                  : "border-navy/15 text-navy hover:bg-teal/10",
              )}
            >
              <Icon className="size-3" />
              {t(fn.key)}
            </LangLink>
          );
        })}
      </nav>
    );
  }
  return (
    <section className="mx-auto max-w-5xl px-4 pb-2">
      <p className="agency-kicker mb-3 text-center">
        {t("fn.title")} · {t("fn.engines")}
      </p>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-7 [&>li]:min-w-0">
        {PRODUCT_FUNCTIONS.map((fn) => {
          const Icon = fn.icon;
          return (
            <li key={fn.id}>
              <LangLink
                href={fn.href}
                className={cn(
                  "flex h-full flex-col rounded-[20px] border border-[rgba(8,17,31,0.1)] bg-white p-3.5 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:border-teal/40",
                )}
              >
                <span className="flex items-center gap-2 text-sm font-black text-navy">
                  <Icon className="size-4 text-teal" />
                  {t(fn.key)}
                </span>
                <span className="mt-1 text-sm text-muted">{t(fn.hint)}</span>
              </LangLink>
              {fn.extraHref && fn.extraKey && (
                <LangLink href={fn.extraHref} className="mt-1 inline-block px-1 text-sm text-muted hover:text-navy">
                  {t(fn.extraKey)}
                </LangLink>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-2 flex items-center justify-center gap-2 text-sm text-muted">
        <Compass className="size-3" />
        {t("fn.engines")}
      </p>
    </section>
  );
}

export function FunctionMenuLinks({ onPick, tone = "light" }: { onPick?: () => void; tone?: "light" | "ink" }) {
  const { t } = useI18n();
  const ink = tone === "ink";
  return (
    <div className={cn("mt-2 border-t pt-2", ink ? "border-white/10" : "border-navy/10")}>
      <p className={cn("mb-1 px-3 text-sm font-bold uppercase tracking-[0.18em]", ink ? "text-[#9FD4C8]" : "text-navy")}>
        {t("fn.title")}
      </p>
      {PRODUCT_FUNCTIONS.map((fn) => {
        const Icon = fn.icon;
        return (
          <LangLink
            key={fn.id}
            href={fn.href}
            onClick={onPick}
            className={cn(
              "tap-row flex items-center gap-2 rounded-[12px] px-3 py-3 text-base",
              ink ? "text-[#F7F3EA] hover:bg-white/8" : "text-navy hover:bg-navy/5",
            )}
          >
            <Icon className={cn("size-4 shrink-0", ink ? "text-[#9FD4C8]" : "text-teal")} />
            <span className="min-w-0 flex-1 truncate">{t(fn.key)}</span>
            <span className={cn("ms-auto hidden max-w-[45%] truncate text-sm sm:inline", ink ? "text-[#C9D0D8]" : "text-muted")}>
              {t(fn.hint)}
            </span>
          </LangLink>
        );
      })}
    </div>
  );
}
