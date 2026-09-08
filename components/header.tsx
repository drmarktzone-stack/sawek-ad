"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronDown, Menu, X } from "lucide-react";
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
import { ALL_NAV, MORE_NAV, PRIMARY_NAV, navActive } from "@/components/command/nav";
import { MobileDock } from "@/components/command/mobile-dock";

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
        "flex items-center rounded-[10px] p-0.5",
        ink ? "border border-white/15 bg-white/6" : "border border-navy/10 bg-[var(--paper)]",
        compact && "scale-90 origin-center",
      )}
    >
      {LOCALES.map((l) => (
        <button
          key={l.id}
          type="button"
          onClick={() => setLocale(l.id)}
          className={cn(
            "tap-target inline-flex items-center justify-center rounded-[8px] px-3 py-1.5 text-sm font-semibold transition-colors",
            locale === l.id
              ? "bg-teal text-white"
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
          "shrink-0 rounded-[10px] px-3.5 py-1.5 text-sm font-black",
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

function NavLink({
  href,
  label,
  active,
  onClick,
}: {
  href: string;
  label: string;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <LangLink
      href={href}
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center rounded-[8px] px-2.5 py-1.5 text-[13px] font-semibold transition-colors",
        active ? "bg-white text-ink" : "text-[#C9D0D8] hover:bg-white/8 hover:text-[#F7F3EA]",
      )}
    >
      {label}
    </LangLink>
  );
}

export function Header() {
  const { t } = useI18n();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [more, setMore] = useState(false);

  if (pathname.startsWith("/lp/")) return null;

  return (
    <>
    <header className="scan-sticky safe-pt border-b border-white/10 bg-[#08111F] text-[#F7F3EA]">
      <UrlIngest />
      <div className="h-px w-full bg-gradient-to-r from-transparent via-teal/55 to-transparent" />
      <div className="mx-auto flex max-w-[92rem] min-w-0 items-center gap-2 px-3 py-2 sm:py-2.5">
        <LangLink href="/dashboard" className="flex min-w-0 shrink flex-col leading-tight pe-1">
          <span className="truncate font-[family-name:var(--font-display-he)] text-lg font-bold tracking-tight text-[#F7F3EA] sm:text-xl">
            {t("brand.name")}
          </span>
          <span className="truncate text-[11px] font-semibold text-[#9FD4C8] sm:text-xs">{t("os.kicker")}</span>
        </LangLink>

        <nav className="ms-2 hidden min-w-0 flex-1 items-center gap-0.5 overflow-x-auto xl:flex" aria-label={t("os.kicker")}>
          {PRIMARY_NAV.map((item) => (
            <NavLink key={item.href} href={item.href} label={t(item.key)} active={navActive(pathname, item.href)} />
          ))}
          <div className="relative">
            <button
              type="button"
              className={cn(
                "flex shrink-0 items-center gap-1 rounded-[8px] px-2.5 py-1.5 text-[13px] font-semibold",
                more ? "bg-white text-ink" : "text-[#C9D0D8] hover:bg-white/8 hover:text-[#F7F3EA]",
              )}
              aria-expanded={more}
              onClick={() => setMore((v) => !v)}
            >
              {t("nav.more")}
              <ChevronDown className="size-3.5" />
            </button>
            {more ? (
              <div className="os-more">
                {MORE_NAV.map((item) => {
                  const Icon = item.icon;
                  return (
                    <LangLink
                      key={item.href}
                      href={item.href}
                      onClick={() => setMore(false)}
                      className="tap-row flex items-center gap-2 rounded-[8px] px-3 py-2.5 text-sm text-[#F7F3EA] hover:bg-white/8"
                    >
                      <Icon className="size-3.5 text-[#9FD4C8]" />
                      {t(item.key)}
                    </LangLink>
                  );
                })}
              </div>
            ) : null}
          </div>
        </nav>

        <div className="ms-auto flex items-center gap-2">
          <GeminiStatusBadge className="hidden border-white/15 bg-white/8 text-[#F7F3EA] sm:inline-flex" />
          <AuthChip tone="ink" />
          <Button asChild size="sm" variant="coral" className="hidden shrink-0 sm:inline-flex">
            <LangLink href="/task/ad">{t("nav.create")}</LangLink>
          </Button>
          <div className="hidden sm:block">
            <LanguageToggle tone="ink" />
          </div>
          <button
            type="button"
            className="tap-target inline-flex items-center justify-center rounded-[10px] p-2.5 text-[#F7F3EA] xl:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label={t("menu")}
            aria-expanded={open}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="safe-pb max-h-[min(80dvh,32rem)] overflow-y-auto border-t border-white/10 bg-[#0A1524] px-4 py-3 xl:hidden">
          <div className="mb-3 sm:hidden">
            <LanguageToggle tone="ink" />
          </div>
          <div className="flex flex-col gap-1">
            <Button asChild variant="coral" className="btn-mobile-full mb-2">
              <LangLink href="/task/ad" onClick={() => setOpen(false)}>
                {t("complete.kicker")}
              </LangLink>
            </Button>
            <Button asChild variant="outline" className="btn-mobile-full mb-2 border-white/20 bg-white/8 text-[#F7F3EA]">
              <LangLink href="/" onClick={(e) => { beginNewCampaign(e); setOpen(false); }}>
                {t("cta.new")}
              </LangLink>
            </Button>
            {ALL_NAV.map((item) => {
              const Icon = item.icon;
              return (
                <LangLink
                  key={`${item.href}-${item.key}`}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="tap-row flex items-center gap-2 rounded-[10px] px-3 py-3 text-base text-[#F7F3EA] hover:bg-white/8"
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
          </div>
        </div>
      )}
    </header>
    <MobileDock onMore={() => setOpen(true)} />
    </>
  );
}

export function Footer() {
  const { t } = useI18n();
  const pathname = usePathname();
  if (pathname.startsWith("/lp/")) return null;
  return (
    <footer className="has-dock mt-auto border-t border-white/10 bg-[#08111F] py-10 text-center text-sm text-[#C9D0D8]">
      <p className="mb-1 font-[family-name:var(--font-display-he)] text-lg font-bold text-[#F7F3EA]">
        {t("brand.name")} · {t("os.kicker")}
      </p>
      {t("footer.line")}
      <p className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
        <LangLink href="/about" className="tap-target inline-flex items-center font-semibold text-[#F7F3EA] hover:text-teal hover:underline">
          {t("nav.about")}
        </LangLink>
        <LangLink href="/privacy" className="tap-target inline-flex items-center font-semibold text-[#F7F3EA] hover:text-teal hover:underline">
          {t("nav.privacy")}
        </LangLink>
        <LangLink href="/terms" className="tap-target inline-flex items-center font-semibold text-[#F7F3EA] hover:text-teal hover:underline">
          {t("nav.terms")}
        </LangLink>
        <LangLink href="/pricing" className="tap-target inline-flex items-center font-semibold text-[#F7F3EA] hover:text-teal hover:underline">
          {t("home.cta.pricing")}
        </LangLink>
        <LangLink href="/status" className="tap-target inline-flex items-center font-semibold text-[#9FD4C8] hover:text-[#F7F3EA] hover:underline">
          {t("nav.status")}
        </LangLink>
      </p>
    </footer>
  );
}
