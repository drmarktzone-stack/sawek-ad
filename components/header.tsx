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
import { FunctionMenuLinks } from "./function-rail";
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

export function LanguageToggle({
  compact = false,
  tone = "light",
}: {
  compact?: boolean;
  tone?: "light" | "ink";
}) {
  const { locale, setLocale } = useI18n();
  const ink = tone === "ink";
  return (
    <div
      className={cn(
        "flex items-center rounded-[12px] p-0.5",
        ink ? "border border-white/15 bg-white/6" : "border border-navy/10 bg-white",
        compact && "scale-90 origin-center",
      )}
    >
      {LOCALES.map((l) => (
        <button
          key={l.id}
          type="button"
          onClick={() => setLocale(l.id)}
          className={cn(
            "tap-target inline-flex items-center justify-center rounded-[10px] px-3 py-1.5 text-sm font-semibold transition-colors",
            locale === l.id
              ? ink
                ? "bg-teal text-white"
                : "bg-teal text-white"
              : ink
                ? "text-[#C9D0D8] hover:text-[#F7F3EA]"
                : "text-muted hover:text-navy",
          )}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}

function AuthChip({ tone = "light" }: { tone?: "light" | "ink" }) {
  const { t } = useI18n();
  const { user, plan, logout, ready } = useAuth();
  const ink = tone === "ink";
  if (!ready) return null;
  if (!user) {
    return (
      <LangLink
        href="/login"
        className={cn(
          "shrink-0 rounded-[12px] px-3.5 py-1.5 text-sm font-black",
          ink ? "bg-white text-ink hover:bg-[#F7F3EA]" : "bg-navy px-3.5 py-1.5 text-white hover:bg-navy-soft",
        )}
      >
        {t("nav.login")}
      </LangLink>
    );
  }
  return (
    <div className="flex max-w-[9.5rem] items-center gap-1.5 sm:max-w-[16rem]">
      <div className="min-w-0 text-end leading-tight">
        <p className={cn("truncate text-xs font-black", ink ? "text-[#F7F3EA]" : "text-navy")} title={user.email}>
          {user.email}
        </p>
        <p className="text-xs font-black text-teal">{isPro(plan) ? t("auth.plan.pro") : t("auth.plan.free")}</p>
      </div>
      <button
        type="button"
        className={cn("tap-target shrink-0 px-1 text-xs font-semibold", ink ? "text-[#C9D0D8] hover:text-white" : "text-muted hover:text-navy")}
        onClick={() => void logout()}
      >
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
    <header className="scan-sticky safe-pt border-b border-white/10 bg-[#08111F] text-[#F7F3EA]">
      <UrlIngest />
      <div className="h-px w-full bg-gradient-to-r from-transparent via-teal/55 to-transparent" />
      <div className="mx-auto flex max-w-[92rem] min-w-0 items-center gap-2 px-3 py-2.5 sm:py-3">
        <LangLink href="/" className="flex min-w-0 shrink flex-col leading-tight pe-1">
          <span className="truncate font-[family-name:var(--font-display-he)] text-lg font-bold tracking-tight text-[#F7F3EA] sm:text-2xl">
            {t("brand.name")}
          </span>
          <span className="truncate text-xs font-semibold text-[#9FD4C8] sm:text-sm">{t("brand.scripts")}</span>
          <span className="hidden text-sm text-[#C9D0D8] sm:inline">{t("brand.tagline")}</span>
        </LangLink>

        <nav className="ms-2 hidden min-w-0 flex-1 items-center gap-0.5 overflow-x-auto xl:flex">
          {NAV.slice(0, 8).map((item) => {
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
                  "flex shrink-0 items-center gap-1 rounded-[8px] px-2 py-1.5 text-[13px] font-semibold transition-colors",
                  active
                    ? "bg-white text-ink"
                    : "text-[#C9D0D8] hover:bg-white/8 hover:text-[#F7F3EA]",
                )}
              >
                <Icon className="size-3.5 opacity-70" />
                {t(item.key)}
              </LangLink>
            );
          })}
        </nav>

        <div className="ms-auto flex items-center gap-2">
          <GeminiStatusBadge className="border-white/15 bg-white/8 text-[#F7F3EA]" />
          <AuthChip tone="ink" />
          <Button asChild size="sm" variant="coral" className="hidden shrink-0 sm:inline-flex">
            <LangLink href="/" onClick={(e) => beginNewCampaign(e)}>
              {t("cta.new")}
            </LangLink>
          </Button>
          <div className="hidden sm:block">
            <LanguageToggle tone="ink" />
          </div>
          <button
            type="button"
            className="tap-target inline-flex items-center justify-center rounded-[12px] p-2.5 text-[#F7F3EA] lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label={t("menu")}
            aria-expanded={open}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="safe-pb max-h-[min(80dvh,32rem)] overflow-y-auto border-t border-white/10 bg-[#0A1524] px-4 py-3 lg:hidden">
          <div className="mb-3 sm:hidden">
            <LanguageToggle tone="ink" />
          </div>
          <div className="flex flex-col gap-1">
            <Button asChild variant="coral" className="btn-mobile-full mb-2">
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
                  className="tap-row flex items-center gap-2 rounded-[12px] px-3 py-3 text-base text-[#F7F3EA] hover:bg-white/8"
                >
                  <Icon className="size-4 shrink-0 text-[#9FD4C8]" />
                  {t(item.key)}
                </LangLink>
              );
            })}
            <FunctionMenuLinks onPick={() => setOpen(false)} tone="ink" />
            <div className="mt-2 px-3 py-1">
              <AuthChip tone="ink" />
            </div>
            <LangLink href="/pricing" onClick={() => setOpen(false)} className="tap-row rounded-[12px] px-3 py-3 text-base font-black text-[#F7F3EA] hover:bg-white/8">
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
    <footer className="safe-pb mt-auto border-t border-white/10 bg-[#08111F] py-12 text-center text-base text-[#C9D0D8]">
      <p className="mb-1 font-[family-name:var(--font-display-he)] text-xl font-bold text-[#F7F3EA]">
        {t("brand.name")} · {t("brand.scripts")}
      </p>
      {t("footer.line")}
      <p className="mt-2">
        <LangLink href="/status" className="font-semibold text-teal hover:underline">
          {t("nav.status")}
        </LangLink>
      </p>
    </footer>
  );
}
