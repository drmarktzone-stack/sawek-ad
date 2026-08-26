"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/components/i18n-provider";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/medical", key: "med.nav.desk" as const },
  { href: "/medical/leads", key: "med.nav.leads" as const },
  { href: "/medical/appointments", key: "med.nav.appts" as const },
  { href: "/medical/credibility", key: "med.nav.cred" as const },
  { href: "/medical/optibrain", key: "med.nav.opti" as const },
];

export function MedicalNav() {
  const { t } = useI18n();
  const pathname = usePathname();
  return (
    <nav className="mb-6 flex flex-wrap gap-1">
      {ITEMS.map((item) => {
        const active = item.href === "/medical" ? pathname === "/medical" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-semibold",
              active ? "bg-omni-yellow text-black" : "border border-white/10 text-zinc-300 hover:border-omni-yellow/40",
            )}
          >
            {t(item.key)}
          </Link>
        );
      })}
    </nav>
  );
}
