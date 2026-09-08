"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "./i18n-provider";
import type { WizardStep } from "@/lib/types";

const KEYS = ["step.1", "step.2", "step.3", "step.4"] as const;

export function Stepper({
  step,
  onStep,
}: {
  step: WizardStep;
  onStep?: (n: WizardStep) => void;
}) {
  const { t } = useI18n();
  return (
    <ol className="mx-auto mb-8 flex max-w-2xl items-start justify-between gap-1 px-2">
      {KEYS.map((key, i) => {
        const n = (i + 1) as WizardStep;
        const done = step > n;
        const active = step === n;
        const canJump = Boolean(onStep) && n <= step;
        return (
          <li key={key} className="flex flex-1 flex-col items-center gap-2.5">
            <div className="flex w-full items-center">
              {i > 0 && (
                <div className={cn("h-0.5 flex-1 rounded-full", step >= n ? "bg-teal" : "bg-navy/12")} />
              )}
              <button
                type="button"
                disabled={!canJump}
                onClick={() => canJump && onStep?.(n)}
                aria-current={active ? "step" : undefined}
                className={cn(
                  "flex shrink-0 items-center justify-center rounded-[12px] text-sm font-black transition-all",
                  canJump && "cursor-pointer hover:scale-105",
                  !canJump && "cursor-default",
                  active
                    ? "size-12 bg-ink text-[#F7F3EA] shadow-[0_12px_28px_rgba(8,17,31,0.22)] ring-4 ring-teal/20"
                    : "size-10",
                  !active && (done ? "bg-teal text-white" : "bg-navy/8 text-muted"),
                )}
              >
                {done ? <Check className="size-4" strokeWidth={3} /> : n}
              </button>
              {i < 3 && (
                <div className={cn("h-0.5 flex-1 rounded-full", step > n ? "bg-teal" : "bg-navy/12")} />
              )}
            </div>
            <span className={cn("max-w-[4.75rem] text-center text-[0.75rem] font-bold leading-tight sm:max-w-none sm:text-sm", active || done ? "text-navy" : "text-muted")}>
              {t(key)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function ConquerHeadline({ subtitle }: { subtitle?: string }) {
  const { t } = useI18n();
  return (
    <div className="mb-8 text-center">
      <p className="os-kicker mb-2">{t("os.kicker")}</p>
      <h1 className="os-title text-3xl sm:text-4xl">
        {t("hero.titlePrefix")}{" "}
        <span className="text-teal">{t("hero.conquer")}</span>{" "}
        {t("hero.titleSuffix")}
      </h1>
      {subtitle && <p className="mt-3 text-base font-medium text-muted">{subtitle}</p>}
    </div>
  );
}
