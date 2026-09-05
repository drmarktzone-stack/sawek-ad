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

const TILE: Record<string, { wash: string; mark: string }> = {
  clinic: { wash: "from-[#0C7A6B] via-[#0A4F4A] to-[#08111F]", mark: "מרפאה" },
  restaurant: { wash: "from-[#C9B896] via-[#6B5A3A] to-[#1A1610]", mark: "מטבח" },
  retail: { wash: "from-[#E24B3A] via-[#8A2E26] to-[#140A09]", mark: "בוטיק" },
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
    <div className={cn("flex w-full max-w-4xl flex-col items-stretch gap-3", className)}>
      <p className={cn("text-center text-sm font-bold", ink ? "text-[#C9D0D8]" : "text-navy/70")}>
        {locale === "he" ? "בחרו הדגמה" : locale === "ar" ? "اختاروا عرضاً" : "Choose a demo"}
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {DEMO_CATALOG.map((d) => {
          const ideas = ideaNamesById[d.id] ?? [];
          const theme = TILE[d.kind] ?? TILE.clinic;
          return (
            <button
              key={d.id}
              type="button"
              data-demo={d.slug}
              onClick={() => {
                if (onSelect) onSelect(d.id);
                else startDemoFlow(d.id, locale);
              }}
              title={d.labels[locale]}
              className={cn(
                "group relative overflow-hidden rounded-[20px] border p-0 text-start shadow-[var(--shadow-card)] transition hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]",
                ink ? "border-white/12" : "border-[rgba(8,17,31,0.1)]",
              )}
            >
              <div className={cn("relative min-h-[11.5rem] bg-gradient-to-br px-4 py-4 text-[#F7F3EA]", theme.wash)}>
                <p className="text-[0.68rem] font-black uppercase tracking-[0.22em] text-white/70">
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
                </p>
                <p className="agency-display-cream mt-3 text-2xl leading-tight">{d.shortLabels[locale]}</p>
                {ideas.length > 0 ? (
                  <p className="mt-3 text-[13px] font-semibold leading-snug text-white/80">{ideas.join(" · ")}</p>
                ) : null}
                <span className="absolute bottom-3 end-3 text-[11px] font-black uppercase tracking-[0.16em] text-white/45">
                  SAWEK
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
