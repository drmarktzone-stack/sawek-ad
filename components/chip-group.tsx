"use client";

import { cn } from "@/lib/utils";
import type { ChipOption } from "@/lib/chips";
import { chipIsSelected } from "@/lib/chips";
import { useI18n } from "./i18n-provider";

export function ChipGroup({
  options,
  value,
  onChange,
  customValue,
  onCustom,
  showCustomField,
  multi = true,
}: {
  options: ChipOption[];
  value: string;
  onChange: (label: string, option: ChipOption) => void;
  customValue?: string;
  onCustom?: (v: string) => void;
  showCustomField?: boolean;
  /** Default true for audience/problem/advantage/goal/offer/channels. Pass false for depth. */
  multi?: boolean;
}) {
  const { locale, t } = useI18n();
  return (
    <div>
      {multi && <p className="mb-2 text-sm text-muted">{t("details.multiHint")}</p>}
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const label = opt.label[locale];
          const selected = opt.custom
            ? showCustomField
            : multi
              ? chipIsSelected(value, opt, options, showCustomField)
              : value === label || value === opt.id || Object.values(opt.label).includes(value);
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(label, opt)}
              className={cn(
                "min-h-11 rounded-full border-2 px-3.5 py-2 text-sm font-bold transition-colors",
                selected
                  ? "border-navy bg-navy text-white"
                  : "border-navy/20 bg-white text-navy hover:border-teal",
              )}
            >
              {label}
            </button>
          );
        })}
      </div>
      {showCustomField && (
        <input
          className="mt-3 h-12 w-full rounded-full border-2 border-teal/50 bg-white px-4 text-base text-navy outline-none focus:border-teal"
          placeholder={t("details.writeOwn")}
          value={customValue ?? value}
          onChange={(e) => onCustom?.(e.target.value)}
        />
      )}
    </div>
  );
}
