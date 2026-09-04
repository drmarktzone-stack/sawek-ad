"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Brain,
  Coins,
  Compass,
  FlaskConical,
  Folder,
  HelpCircle,
  LayoutDashboard,
  Menu,
  Megaphone,
  Pencil,
  Search,
  SlidersHorizontal,
  Users,
  WandSparkles,
  X,
} from "lucide-react";
import { LOCALES } from "@/lib/i18n";
import { useI18n } from "./i18n-provider";
import { LangLink } from "./lang-link";
import { FunctionMenuLinks, FunctionRail } from "./function-rail";
import { UrlIngest } from "./url-ingest";
import { cn } from "@/lib/utils";
import { beginNewCampaign } from "@/lib/empty-campaign";
import { Button } from "@/components/ui/button";
import { GeminiStatusBadge } from "@/components/gemini-status-badge";
import { useAuth } from "@/components/auth-provider";
import { isPro } from "@/lib/plan";

/** Captured OmniAd chrome + user list — one link per route, no Creative/Studio or Ops/Campaigns duplicates. */
const NAV = [
  { href: "/", key: "nav.build" as const, icon: WandSparkles },
  { href: "/discovery", key: "nav.discovery" as const, icon: Search },
  { href: "/strategy", key: "nav.strategy" as const, icon: Compass },
  { href: "/studio", key: "nav.studio" as const, icon: Pencil },
  { href: "/media", key: "nav.media" as const, icon: Megaphone },
  { href: "/leads", key: "nav.leads" as const, icon: Users },
  { href: "/medical/optibrain", key: "nav.medical" as const, icon: Brain },
  { href: "/campaigns", key: "nav.campaigns" as const, icon: Folder },
  { href: "/dashboard", key: "nav.dashboard" as const, icon: LayoutDashboard },
  { href: "/lab", key: "nav.lab" as const, icon: FlaskConical },
  { href: "/pricing", key: "nav.pricing" as const, icon: Coins },
  { href: "/about", key: "nav.about" as const, icon: HelpCircle },
  { href: "/self", key: "nav.self" as const, icon: SlidersHorizontal },
];

export function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useI18n();
  return (
    <div
      className={cn(
        "flex items-center rounded-full border border-navy/10 bg-white p-0.5",
        compact && "scale-90 origin-center",
      )}
    >
      {LOCALES.map((l) => (
        <button
          key={l.id}
          type="button"
          onClick={() => setLocale(l.id)}
          className={cn(
            "rounded-full px-2.5 py-1 text-sm font-semibold transition-colors",
            locale === l.id
              ? "bg-teal text-white"
              : "text-muted hover:text-navy",
          )}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}

function AuthChip() {
  const { t } = useI18n();
  const { user, plan, logout, ready } = useAuth();
  if (!ready) return null;
  if (!user) {
    return (
      <LangLink
        href="/login"
        className="shrink-0 rounded-full bg-navy px-3.5 py-1.5 text-sm font-black text-white hover:bg-navy-soft"
      >
        {t("nav.login")}
      </LangLink>
    );
  }
  return (
    <div className="flex max-w-[16rem] items-center gap-1.5">
      <div className="min-w-0 text-end leading-tight">
        <p className="truncate text-xs font-black text-navy" title={user.email}>
          {user.email}
        </p>
        <p className="text-xs font-black text-teal">{isPro(plan) ? t("auth.plan.pro") : t("auth.plan.free")}</p>
      </div>
      <button type="button" className="shrink-0 text-xs font-semibold text-muted hover:text-navy" onClick={() => void logout()}>
        {t("nav.logout")}
      </button>
    </div>
  );
}

export function Header() {
  const { t } = useI18n();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  if (pathname.startsWith("/lp/")) return null;

  return (
    <header className="sticky top-0 z-40 border-b border-navy/10 bg-white/90 backdrop-blur-xl">
      <UrlIngest />
      <div className="h-px w-full bg-gradient-to-r from-transparent via-teal/50 to-transparent" />
      <div className="mx-auto flex max-w-[92rem] items-center gap-2 px-3 py-3">
        <LangLink href="/" className="flex shrink-0 flex-col leading-tight pe-1">
          <span className="text-xl font-black tracking-tight text-navy sm:text-2xl agency-display">
            {t("brand.name")}
          </span>
          <span className="text-sm font-semibold text-teal">{t("brand.scripts")}</span>
          <span className="text-sm text-muted">{t("brand.tagline")}</span>
        </LangLink>

        <nav className="ms-2 hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto lg:flex">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <LangLink
                key={item.key}
                href={item.href}
                className={cn(
                  "flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1.5 text-sm font-semibold transition-colors",
                  active
                    ? "bg-navy text-white"
                    : "text-muted hover:bg-navy/5 hover:text-navy",
                )}
              >
                <Icon className="size-3.5" />
                {t(item.key)}
              </LangLink>
            );
          })}
        </nav>

        <div className="ms-auto flex items-center gap-2">
          <GeminiStatusBadge />
          <AuthChip />
          <Button asChild size="sm" variant="coral" className="shrink-0">
            <LangLink href="/" onClick={(e) => beginNewCampaign(e)}>
              {t("cta.new")}
            </LangLink>
          </Button>
          <div className="hidden sm:block">
            <LanguageToggle />
          </div>
          <button
            type="button"
            className="rounded-lg p-2 text-navy lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label={t("menu")}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>
      <div className="hidden border-t border-navy/10 md:block">
        <div className="mx-auto flex max-w-[92rem] items-center gap-2 overflow-x-auto px-3 py-1.5">
          <span className="shrink-0 text-sm font-bold uppercase tracking-[0.18em] text-navy">{t("fn.title")}</span>
          <FunctionRail compact />
          <span className="ms-auto shrink-0 text-sm text-muted">{t("fn.engines")}</span>
        </div>
      </div>

      {open && (
        <div className="border-t border-navy/10 bg-white px-4 py-3 lg:hidden">
          <div className="mb-3 sm:hidden">
            <LanguageToggle />
          </div>
          <div className="flex flex-col gap-1">
            <Button asChild variant="coral" className="mb-2">
              <LangLink href="/" onClick={(e) => { beginNewCampaign(e); setOpen(false); }}>
                {t("cta.new")}
              </LangLink>
            </Button>
            {NAV.map((item) => {
              const Icon = item.icon;
              return (
                <LangLink
                  key={item.key}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-base text-navy hover:bg-navy/5"
                >
                  <Icon className="size-4 text-teal" />
                  {t(item.key)}
                </LangLink>
              );
            })}
            <FunctionMenuLinks onPick={() => setOpen(false)} />
            <div className="mt-2 px-3 py-1">
              <AuthChip />
            </div>
            <LangLink href="/pricing" onClick={() => setOpen(false)} className="rounded-xl px-3 py-2 text-base font-black text-navy hover:bg-navy/5">
              {t("home.cta.pricing")}
            </LangLink>
          </div>
        </div>
      )}
    </header>
  );
}

export function Footer() {
  const { t } = useI18n();
  const pathname = usePathname();
  if (pathname.startsWith("/lp/")) return null;
  return (
    <footer className="mt-auto border-t border-navy/10 bg-sand/50 py-10 text-center text-base text-muted">
      <p className="mb-1 font-black text-navy">{t("brand.name")} · {t("brand.scripts")}</p>
      {t("footer.line")}
    </footer>
  );
}
