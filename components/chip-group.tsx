"use client";

import { cn } from "@/lib/utils";
import type { ChipOption } from "@/lib/chips";
import { useI18n } from "./i18n-provider";

export function ChipGroup({
  options,
  value,
  onChange,
  customValue,
  onCustom,
  showCustomField,
}: {
  options: ChipOption[];
  value: string;
  onChange: (label: string, option: ChipOption) => void;
  customValue?: string;
  onCustom?: (v: string) => void;
  showCustomField?: boolean;
}) {
  const { locale, t } = useI18n();
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const label = opt.label[locale];
          const selected = opt.custom
            ? showCustomField
            : value === label || value === opt.id || Object.values(opt.label).includes(value);
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(label, opt)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                selected
                  ? "border-omni-yellow bg-omni-yellow text-black"
                  : "border-white/15 bg-white/5 text-zinc-200 hover:border-omni-yellow/50",
              )}
            >
              {label}
            </button>
          );
        })}
      </div>
      {showCustomField && (
        <input
          className="mt-3 h-11 w-full rounded-xl border border-omni-yellow/40 bg-black/40 px-3 text-sm text-white outline-none"
          placeholder={t("details.writeOwn")}
          value={customValue ?? value}
          onChange={(e) => onCustom?.(e.target.value)}
        />
      )}
    </div>
  );
}
