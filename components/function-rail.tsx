"use client";

import { Brain, Clapperboard, Compass, FlaskConical, FolderKanban, LayoutDashboard, Megaphone, Palette, Sparkles, Store } from "lucide-react";
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
    extraHref: "/task/ad",
    extraKey: "nav.task" as const,
    key: "fn.marketing" as const,
    hint: "fn.marketingHint" as const,
    icon: Store,
  },
  {
    id: "tools",
    href: "/tools/offer",
    extraHref: "/tools/hso",
    extraKey: "nav.hso" as const,
    key: "fn.tools" as const,
    hint: "fn.toolsHint" as const,
    icon: Compass,
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
    extraHref: "/viral",
    extraKey: "nav.viral" as const,
    key: "fn.ads" as const,
    hint: "fn.adsHint" as const,
    icon: Clapperboard,
  },
  {
    id: "viral",
    href: "/viral",
    extraHref: "/studio",
    extraKey: "nav.studio" as const,
    key: "fn.viral" as const,
    hint: "fn.viralHint" as const,
    icon: Sparkles,
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
  {
    id: "growth",
    href: "/growth",
    extraHref: "/growth/experiments",
    extraKey: "sci.nav.experiments" as const,
    key: "fn.growth" as const,
    hint: "fn.growthHint" as const,
    icon: Brain,
  },
] as const;

export function FunctionRail({ compact = false, tone = "light" }: { compact?: boolean; tone?: "light" | "ink" }) {
  const { t } = useI18n();
  return (
    <nav className={cn("mx-auto max-w-6xl px-4", compact ? "py-1" : "py-3")} aria-label={t("fn.title")}>
      {!compact && (
        <p className="os-kicker mb-2 text-center">
          {t("fn.title")} · {t("fn.engines")}
        </p>
      )}
      <ul className="flex min-w-0 items-center gap-1 overflow-x-auto pb-1">
        {PRODUCT_FUNCTIONS.map((fn) => {
          const Icon = fn.icon;
          return (
            <li key={fn.id} className="shrink-0">
              <LangLink
                href={fn.href}
                className={cn(
                  "tap-row inline-flex items-center gap-1.5 border-b-2 border-transparent px-2.5 py-2 text-sm font-bold",
                  tone === "ink"
                    ? "text-[#F7F3EA] hover:border-[#9FD4C8]"
                    : "text-navy hover:border-teal",
                )}
                title={t(fn.hint)}
              >
                <Icon className="size-3.5 text-teal" />
                {t(fn.key)}
              </LangLink>
              {fn.extraHref && fn.extraKey && (
                <LangLink href={fn.extraHref} className="ms-1 text-xs text-muted hover:text-navy">
                  {t(fn.extraKey)}
                </LangLink>
              )}
            </li>
          );
        })}
      </ul>
      {!compact && (
        <p className="mt-1 flex items-center justify-center gap-2 text-xs text-muted">
          <Compass className="size-3" />
          {t("fn.engines")}
        </p>
      )}
    </nav>
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
              "tap-row flex items-center gap-2 rounded-[10px] px-3 py-3 text-base",
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
