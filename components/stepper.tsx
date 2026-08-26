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
    <ol className="mx-auto flex max-w-xl items-start justify-between gap-1 px-2">
      {KEYS.map((key, i) => {
        const n = (i + 1) as WizardStep;
        const done = step > n;
        const active = step === n;
        const canJump = Boolean(onStep) && n <= step;
        return (
          <li key={key} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex w-full items-center">
              {i > 0 && (
                <div
                  className={cn(
                    "h-0.5 flex-1",
                    step >= n ? "bg-omni-yellow" : "bg-white/15",
                  )}
                />
              )}
              <button
                type="button"
                disabled={!canJump}
                onClick={() => canJump && onStep?.(n)}
                aria-current={active ? "step" : undefined}
                className={cn(
                  "flex shrink-0 items-center justify-center rounded-full text-sm font-black transition-all",
                  canJump && "cursor-pointer hover:scale-105",
                  !canJump && "cursor-default",
                  active ? "size-12 bg-omni-yellow text-black shadow-[0_0_24px_rgba(255,229,0,0.55)]" : "size-9",
                  !active && (done ? "bg-omni-yellow text-black" : "bg-white/10 text-zinc-400"),
                )}
              >
                {done ? <Check className="size-4" strokeWidth={3} /> : n}
              </button>
              {i < 3 && (
                <div
                  className={cn(
                    "h-0.5 flex-1",
                    step > n ? "bg-omni-yellow" : "bg-white/15",
                  )}
                />
              )}
            </div>
            <span
              className={cn(
                "text-xs font-semibold",
                active || done ? "text-omni-yellow" : "text-zinc-500",
              )}
            >
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
      <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
        {t("hero.titlePrefix")}{" "}
        <span className="relative inline-block rounded-md bg-omni-yellow px-2 text-black">
          {t("hero.conquer")}
          <span className="absolute inset-x-1 -bottom-1 h-1.5 rounded-full bg-omni-red" />
        </span>{" "}
        {t("hero.titleSuffix")}
      </h1>
      {subtitle && (
        <p className="mt-3 text-sm font-medium text-zinc-400">{subtitle}</p>
      )}
    </div>
  );
}
