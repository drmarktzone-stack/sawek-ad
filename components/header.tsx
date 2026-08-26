"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Compass,
  Folder,
  HelpCircle,
  Menu,
  Megaphone,
  Pencil,
  Search,
  SlidersHorizontal,
  Stethoscope,
  Users,
  WandSparkles,
  X,
} from "lucide-react";
import { LOCALES } from "@/lib/i18n";
import { useI18n } from "./i18n-provider";
import { LangLink } from "./lang-link";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", key: "nav.build" as const, icon: WandSparkles },
  { href: "/discovery", key: "nav.discovery" as const, icon: Search },
  { href: "/strategy", key: "nav.strategy" as const, icon: Compass },
  { href: "/studio", key: "nav.creative" as const, icon: Pencil },
  { href: "/studio", key: "nav.studio" as const, icon: Pencil },
  { href: "/media", key: "nav.media" as const, icon: Megaphone },
  { href: "/leads", key: "nav.leads" as const, icon: Users },
  { href: "/medical/optibrain", key: "nav.medical" as const, icon: Stethoscope },
  { href: "/campaigns", key: "nav.ops" as const, icon: Folder },
  { href: "/campaigns", key: "nav.campaigns" as const, icon: Folder },
  { href: "/self", key: "nav.self" as const, icon: SlidersHorizontal },
  { href: "/about", key: "nav.about" as const, icon: HelpCircle },
];

export function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useI18n();
  return (
    <div
      className={cn(
        "flex items-center rounded-full border border-white/10 bg-black/40 p-0.5",
        compact && "scale-90 origin-center",
      )}
    >
      {LOCALES.map((l) => (
        <button
          key={l.id}
          type="button"
          onClick={() => setLocale(l.id)}
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-semibold transition-colors",
            locale === l.id
              ? "bg-omni-yellow text-black"
              : "text-zinc-300 hover:text-white",
          )}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}

export function Header() {
  const { t } = useI18n();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  if (pathname.startsWith("/lp/")) return null;

  return (
    <header className="sticky top-0 z-40 border-b border-omni-yellow/20 bg-black/85 backdrop-blur-md">
      <div className="h-1 w-full bg-gradient-to-l from-omni-yellow via-omni-red to-omni-yellow" />
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <LangLink href="/" className="flex shrink-0 flex-col leading-tight">
          <span className="bg-gradient-to-l from-omni-yellow to-omni-red bg-clip-text text-xl font-black tracking-tight text-transparent sm:text-2xl">
            {t("brand.name")}
          </span>
          <span className="text-[10px] font-semibold text-omni-yellow">{t("brand.scripts")}</span>
          <span className="text-[9px] text-zinc-500">{t("brand.tagline")}</span>
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
                  "flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-semibold transition-colors",
                  active
                    ? "bg-omni-yellow text-black"
                    : "text-zinc-300 hover:bg-white/5 hover:text-white",
                )}
              >
                <Icon className="size-3.5" />
                {t(item.key)}
              </LangLink>
            );
          })}
        </nav>

        <div className="ms-auto flex items-center gap-2">
          <div className="hidden sm:block">
            <LanguageToggle />
          </div>
          <button
            type="button"
            className="rounded-lg p-2 text-white lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label={t("menu")}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-white/10 bg-black px-4 py-3 lg:hidden">
          <div className="mb-3 sm:hidden">
            <LanguageToggle />
          </div>
          <div className="flex flex-col gap-1">
            {NAV.map((item) => {
              const Icon = item.icon;
              return (
                <LangLink
                  key={item.key}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-zinc-200 hover:bg-white/5"
                >
                  <Icon className="size-4 text-omni-yellow" />
                  {t(item.key)}
                </LangLink>
              );
            })}
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
    <footer className="mt-auto border-t border-omni-red/30 bg-black py-8 text-center text-xs text-zinc-500">
      <p className="mb-1 font-black text-omni-yellow">{t("brand.name")} · {t("brand.scripts")}</p>
      {t("footer.line")}
    </footer>
  );
}
