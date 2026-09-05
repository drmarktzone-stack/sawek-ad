"use client";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/i18n-provider";
import { DEMO_CATALOG } from "@/lib/demo-catalog";
import { startDemoFlow } from "@/lib/start-demo";
import { cn } from "@/lib/utils";

type Props = {
  onSelect?: (idOrSlug: string) => void;
  className?: string;
  size?: "default" | "lg" | "sm";
};

export function DemoPicker({ onSelect, className, size = "lg" }: Props) {
  const { locale } = useI18n();

  return (
    <div className={cn("flex w-full max-w-3xl flex-col items-stretch gap-2 sm:items-center", className)}>
      <p className="text-center text-sm font-bold text-navy/70">
        {locale === "he" ? "בחרו הדגמה" : locale === "ar" ? "اختاروا عرضاً" : "Choose a demo"}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {DEMO_CATALOG.map((d) => (
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
            </span>
          </Button>
        ))}
      </div>
    </div>
  );
}
