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

export function FunctionRail({ compact = false }: { compact?: boolean }) {
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
              className="flex min-h-10 shrink-0 items-center gap-1 rounded-full border border-navy/20 bg-white px-2.5 py-1 text-sm font-bold text-navy hover:border-teal hover:bg-teal/10"
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
      <p className="mb-2 text-center text-sm font-bold uppercase tracking-[0.22em] text-gold">
        {t("fn.title")} · {t("fn.engines")}
      </p>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-7">
        {PRODUCT_FUNCTIONS.map((fn) => {
          const Icon = fn.icon;
          return (
            <li key={fn.id}>
              <LangLink
                href={fn.href}
                className={cn(
                  "agency-paper flex h-full flex-col rounded-[22px] p-3 hover:border-teal hover:bg-teal/10",
                )}
              >
                <span className="flex items-center gap-2 text-sm font-black text-navy">
                  <Icon className="size-4 text-gold" />
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

export function FunctionMenuLinks({ onPick }: { onPick?: () => void }) {
  const { t } = useI18n();
  return (
    <div className="mt-2 border-t border-navy/10 pt-2">
      <p className="mb-1 px-3 text-sm font-bold uppercase tracking-[0.18em] text-navy">{t("fn.title")}</p>
      {PRODUCT_FUNCTIONS.map((fn) => {
        const Icon = fn.icon;
        return (
          <LangLink
            key={fn.id}
            href={fn.href}
            onClick={onPick}
            className="flex min-h-12 items-center gap-2 rounded-xl px-3 py-3 text-base text-navy hover:bg-teal/10"
          >
            <Icon className="size-4 text-gold" />
            {t(fn.key)}
            <span className="ms-auto text-sm text-muted">{t(fn.hint)}</span>
          </LangLink>
        );
      })}
    </div>
  );
}
