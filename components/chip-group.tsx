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
                "rounded-[12px] border px-3.5 py-2 text-sm font-semibold transition-colors",
                selected
                  ? "border-ink bg-ink text-[#F7F3EA]"
                  : "border-[rgba(8,17,31,0.14)] bg-white text-navy hover:border-teal",
              )}
            >
              {label}
            </button>
          );
        })}
      </div>
      {showCustomField && (
        <input
          className="mt-3 h-12 w-full rounded-[12px] border border-teal/45 bg-white px-4 text-base text-ink outline-none focus:border-teal focus:shadow-[0_0_0_4px_rgba(12,122,107,0.16)]"
          placeholder={t("details.writeOwn")}
          value={customValue ?? value}
          onChange={(e) => onCustom?.(e.target.value)}
        />
      )}
    </div>
  );
}
