"use client";

import { useI18n } from "@/components/i18n-provider";
import { DEMO_CATALOG, catalogIntake, DEMO_ID } from "@/lib/demo-catalog";
import { demoIntake } from "@/lib/demo";
import { pickIdeas } from "@/lib/engine/cmo-ideas";
import { startDemoFlow } from "@/lib/start-demo";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

type Props = {
  onSelect?: (idOrSlug: string) => void;
  className?: string;
  size?: "default" | "lg" | "sm";
  tone?: "light" | "ink";
};

export function DemoPicker({ onSelect, className, tone = "light" }: Props) {
  const { locale } = useI18n();
  const ink = tone === "ink";

  const ideaNamesById = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const d of DEMO_CATALOG) {
      const intake = d.id === DEMO_ID ? demoIntake(locale) : catalogIntake(d.id, locale);
      if (!intake) continue;
      map[d.id] = pickIdeas(intake, locale)
        .slice(0, 3)
        .map((i) => i.name[locale] || i.name.he);
    }
    return map;
  }, [locale]);

  return (
    <div className={cn("flex w-full max-w-4xl flex-col items-stretch gap-2", className)}>
      <p className={cn("text-center text-sm font-bold", ink ? "text-[#C9D0D8]" : "text-navy/70")}>
        {locale === "he" ? "בחרו הדגמה" : locale === "ar" ? "اختاروا عرضاً" : "Choose a demo"}
      </p>
      <ul className="divide-y divide-[var(--line)]">
        {DEMO_CATALOG.filter((d) => d.kind !== "retail").map((d) => {
          const ideas = ideaNamesById[d.id] ?? [];
          return (
            <li key={d.id}>
              <button
                type="button"
                data-demo={d.slug}
                onClick={() => {
                  if (onSelect) onSelect(d.id);
                  else startDemoFlow(d.id, locale);
                }}
                title={d.labels[locale]}
                className={cn(
                  "tap-row flex w-full flex-col items-start gap-0.5 py-3 text-start",
                  ink ? "text-[#F7F3EA] hover:text-[#9FD4C8]" : "text-navy hover:text-teal",
                )}
              >
                <span className="os-meta">
                  {d.fictional
                    ? locale === "he"
                      ? "בדיוני · לדוגמה"
                      : locale === "ar"
                        ? "خيالي · للعرض"
                        : "Fictional · sample"
                    : locale === "he"
                      ? "מרפאה אמיתית"
                      : locale === "ar"
                        ? "عيادة حقيقية"
                        : "Real clinic"}
                </span>
                <span className="text-lg font-black">{d.shortLabels[locale]}</span>
                {ideas.length > 0 ? (
                  <span className={cn("text-sm", ink ? "text-[#C9D0D8]" : "text-muted")}>{ideas.join(" · ")}</span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
