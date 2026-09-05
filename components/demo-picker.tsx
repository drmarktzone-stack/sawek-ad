"use client";

import { Button } from "@/components/ui/button";
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
};

export function DemoPicker({ onSelect, className, size = "lg" }: Props) {
  const { locale } = useI18n();

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
    <div className={cn("flex w-full max-w-3xl flex-col items-stretch gap-2 sm:items-center", className)}>
      <p className="text-center text-sm font-bold text-navy/70">
        {locale === "he" ? "בחרו הדגמה" : locale === "ar" ? "اختاروا عرضاً" : "Choose a demo"}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {DEMO_CATALOG.map((d) => {
          const ideas = ideaNamesById[d.id] ?? [];
          return (
            <Button
              key={d.id}
              type="button"
              size={size}
              variant={d.fictional ? "outline" : "coral"}
              data-demo={d.slug}
              className="h-auto max-w-full whitespace-normal px-4 py-2.5 text-start text-sm font-black sm:text-base"
              onClick={() => {
                if (onSelect) onSelect(d.id);
                else startDemoFlow(d.id, locale);
              }}
              title={d.labels[locale]}
            >
              <span className="flex flex-col gap-0.5">
                <span>{d.shortLabels[locale]}</span>
                {d.fictional ? (
                  <span className="text-[11px] font-semibold opacity-70">
                    {locale === "he" ? "בדיוני · לדוגמה" : locale === "ar" ? "خيالي · للعرض" : "Fictional · sample"}
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold opacity-70">
                    {locale === "he" ? "מרפאה אמיתית" : locale === "ar" ? "عيادة حقيقية" : "Real clinic"}
                  </span>
                )}
                {ideas.length > 0 ? (
                  <span className="mt-1 text-[11px] font-semibold leading-snug opacity-80">
                    {ideas.join(" · ")}
                  </span>
                ) : null}
              </span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
