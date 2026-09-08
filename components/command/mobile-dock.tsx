"use client";

import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { DOCK_NAV, navActive } from "@/components/command/nav";
import { useI18n } from "@/components/i18n-provider";
import { LangLink } from "@/components/lang-link";
import { cn } from "@/lib/utils";

export function MobileDock({ onMore }: { onMore: () => void }) {
  const { t } = useI18n();
  const pathname = usePathname();
  if (pathname.startsWith("/lp/") || pathname.startsWith("/login") || pathname.startsWith("/signup") || pathname.startsWith("/checkout")) {
    return null;
  }
  return (
    <nav className="os-dock lg:hidden" aria-label={t("os.dock")}>
      {DOCK_NAV.map((item) => {
        const Icon = item.icon;
        const active = navActive(pathname, item.href);
        return (
          <LangLink key={item.href} href={item.href} className={cn(active && "is-active")}>
            <Icon className="size-4" />
            {t(item.key)}
          </LangLink>
        );
      })}
      <button type="button" className="flex flex-1 flex-col items-center justify-center gap-0.5 text-[0.62rem] font-extrabold uppercase tracking-wide text-[#C9D0D8]" onClick={onMore}>
        <Menu className="size-4" />
        {t("nav.more")}
      </button>
    </nav>
  );
}
