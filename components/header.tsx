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
  void tone;
  return (
    <div
      className={cn(
        "flex items-center rounded-[10px] border border-[var(--line)] bg-white p-0.5",
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
            locale === l.id ? "bg-lime text-[var(--lime-ink)]" : "text-muted hover:text-navy",
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
  void tone;
  if (!ready) return null;
  if (!user) {
    return (
      <LangLink
        href="/login"
        className="shrink-0 rounded-[18px] bg-lime px-3.5 py-1.5 text-sm font-black text-[var(--lime-ink)] hover:bg-[var(--lime-deep)]"
      >
        {t("nav.login")}
      </LangLink>
    );
  }
  return (
    <div className="flex max-w-[9.5rem] items-center gap-1.5 sm:max-w-[16rem]">
      <div className="min-w-0 text-end leading-tight">
        <p className="truncate text-xs font-black text-navy" title={user.email}>
          {user.email}
        </p>
        <p className="text-xs font-black text-teal">{isPro(plan) ? t("auth.plan.pro") : t("auth.plan.free")}</p>
      </div>
      <button
        type="button"
        className="tap-target shrink-0 px-1 text-xs font-semibold text-muted hover:text-navy"
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
        active ? "bg-teal text-white" : "text-muted hover:bg-mint/70 hover:text-navy",
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
    <header className="scan-sticky safe-pt border-b border-[var(--line)] bg-white/92 text-navy backdrop-blur-xl">
      <UrlIngest />
      <div className="h-px w-full bg-gradient-to-r from-transparent via-lime to-transparent" />
      <div className="mx-auto flex max-w-[92rem] min-w-0 items-center gap-2 px-3 py-2 sm:py-2.5">
        <LangLink href="/dashboard" className="flex min-w-0 shrink flex-col leading-tight pe-1">
          <span className="truncate font-[family-name:var(--font-display-he)] text-lg font-bold tracking-tight text-ink sm:text-xl">
            {t("brand.name")}
          </span>
          <span className="brand-kicker truncate text-[11px] font-semibold text-teal sm:text-xs">{t("os.kicker")}</span>
        </LangLink>

        <nav className="ms-2 hidden min-w-0 flex-1 items-center gap-0.5 overflow-x-auto xl:flex" aria-label={t("os.kicker")}>
          {PRIMARY_NAV.map((item) => (
            <NavLink key={`${item.href}-${item.key}`} href={item.href} label={t(item.key)} active={navActive(pathname, item.href)} />
          ))}
          <div className="relative">
            <button
              type="button"
              className={cn(
                "flex shrink-0 items-center gap-1 rounded-[8px] px-2.5 py-1.5 text-[13px] font-semibold",
                more ? "bg-teal text-white" : "text-muted hover:bg-mint/70 hover:text-navy",
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
                      key={`${item.href}-${item.key}`}
                      href={item.href}
                      onClick={() => setMore(false)}
                      className="tap-row flex items-center gap-2 rounded-[8px] px-3 py-2.5 text-sm text-navy hover:bg-mint/60"
                    >
                      <Icon className="size-3.5 text-teal" />
                      {t(item.key)}
                    </LangLink>
                  );
                })}
              </div>
            ) : null}
          </div>
        </nav>

        <div className="ms-auto flex items-center gap-2">
          <GeminiStatusBadge className="hidden border-[var(--line)] bg-white text-navy sm:inline-flex" />
          <AuthChip />
          <Button asChild size="sm" variant="coral" className="hidden shrink-0 sm:inline-flex">
            <LangLink href="/task/ad">{t("nav.create")}</LangLink>
          </Button>
          <div className="hidden sm:block">
            <LanguageToggle />
          </div>
          <button
            type="button"
            className="tap-target inline-flex items-center justify-center rounded-[10px] p-2.5 text-navy xl:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label={t("menu")}
            aria-expanded={open}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="safe-pb max-h-[min(80dvh,32rem)] overflow-y-auto border-t border-[var(--line)] bg-white px-4 py-3 xl:hidden">
          <div className="mb-3 sm:hidden">
            <LanguageToggle />
          </div>
          <div className="flex flex-col gap-1">
            <Button asChild variant="coral" className="btn-mobile-full mb-2">
              <LangLink href="/task/ad" onClick={() => setOpen(false)}>
                {t("complete.kicker")}
              </LangLink>
            </Button>
            <Button asChild variant="outline" className="btn-mobile-full mb-2">
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
                  className="tap-row flex items-center gap-2 rounded-[10px] px-3 py-3 text-base text-navy hover:bg-mint/60"
                >
                  <Icon className="size-4 shrink-0 text-teal" />
                  {t(item.key)}
                </LangLink>
              );
            })}
            <FunctionMenuLinks onPick={() => setOpen(false)} />
            <div className="mt-2 px-3 py-1">
              <AuthChip />
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
    <footer className="has-dock mt-auto bg-[var(--navy-deep)] py-12 text-center text-sm text-white/60">
      <p className="mb-2 font-[family-name:var(--font-display-he)] text-xl font-bold text-white">
        {t("brand.name")}
      </p>
      <p className="mx-auto max-w-xl px-4">{t("footer.line")}</p>
      <p className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
        <LangLink href="/about" className="tap-target inline-flex items-center font-semibold text-white/80 hover:text-lime hover:underline">
          {t("nav.about")}
        </LangLink>
        <LangLink href="/privacy" className="tap-target inline-flex items-center font-semibold text-white/80 hover:text-lime hover:underline">
          {t("nav.privacy")}
        </LangLink>
        <LangLink href="/terms" className="tap-target inline-flex items-center font-semibold text-white/80 hover:text-lime hover:underline">
          {t("nav.terms")}
        </LangLink>
        <LangLink href="/pricing" className="tap-target inline-flex items-center font-semibold text-white/80 hover:text-lime hover:underline">
          {t("home.cta.pricing")}
        </LangLink>
        <LangLink href="/status" className="tap-target inline-flex items-center font-semibold text-white/80 hover:text-lime hover:underline">
          {t("nav.status")}
        </LangLink>
      </p>
    </footer>
  );
}
