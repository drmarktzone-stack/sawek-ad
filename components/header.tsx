"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Folder,
  HelpCircle,
  Menu,
  Pencil,
  SlidersHorizontal,
  WandSparkles,
  X,
} from "lucide-react";
import { LOCALES } from "@/lib/i18n";
import { useI18n } from "./i18n-provider";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", key: "nav.build" as const, icon: WandSparkles },
  { href: "/studio", key: "nav.studio" as const, icon: Pencil },
  { href: "/campaigns", key: "nav.campaigns" as const, icon: Folder },
  { href: "/about", key: "nav.about" as const, icon: HelpCircle },
  { href: "/self", key: "nav.self" as const, icon: SlidersHorizontal },
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

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-black/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <Link href="/" className="flex shrink-0 flex-col leading-tight">
          <span className="bg-gradient-to-l from-omni-yellow to-omni-red bg-clip-text text-xl font-black tracking-tight text-transparent">
            {t("brand.name")}
          </span>
          <span className="text-[10px] font-semibold text-zinc-300">{t("brand.scripts")}</span>
          <span className="text-[9px] text-zinc-500">{t("brand.tagline")}</span>
        </Link>

        <nav className="ms-2 hidden min-w-0 flex-1 items-center gap-1 lg:flex">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                  active
                    ? "bg-omni-yellow text-black"
                    : "text-zinc-300 hover:bg-white/5 hover:text-white",
                )}
              >
                <Icon className="size-3.5" />
                {t(item.key)}
              </Link>
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
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-zinc-200 hover:bg-white/5"
                >
                  <Icon className="size-4 text-omni-yellow" />
                  {t(item.key)}
                </Link>
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
  return (
    <footer className="mt-auto border-t border-white/10 py-8 text-center text-xs text-zinc-500">
      {t("footer.line")}
    </footer>
  );
}
