"use client";

import { Compass, Fingerprint, Link2, Users, WandSparkles } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { LangLink } from "@/components/lang-link";
import { CAMPAIGN_STEPS } from "@/lib/campaign-path";
import { cn } from "@/lib/utils";

const STEP_ICON = {
  scan: Link2,
  client: Fingerprint,
  offer: Compass,
  trust: WandSparkles,
  list: Users,
} as const;

/** Named product functions = the one campaign journey. */
export const PRODUCT_FUNCTIONS = CAMPAIGN_STEPS.map((step) => ({
  id: step.id,
  href: step.href,
  key: step.key,
  hint: step.cta,
  icon: STEP_ICON[step.id],
}));

export function FunctionRail({ compact = false, tone = "light" }: { compact?: boolean; tone?: "light" | "ink" }) {
  const { t } = useI18n();
  return (
    <nav className={cn("mx-auto max-w-6xl px-4", compact ? "py-1" : "py-3")} aria-label={t("journey.kicker")}>
      {!compact && (
        <p className="os-kicker mb-2 text-center">
          {t("journey.kicker")}
        </p>
      )}
      <ul className="flex min-w-0 items-center gap-1 overflow-x-auto pb-1">
        {PRODUCT_FUNCTIONS.map((fn) => {
          const Icon = fn.icon;
          return (
            <li key={fn.id} className="shrink-0">
              <LangLink
                href={fn.href}
                className={cn(
                  "tap-row inline-flex items-center gap-1.5 border-b-2 border-transparent px-2.5 py-2 text-sm font-bold",
                  tone === "ink"
                    ? "text-[#F7F3EA] hover:border-[#9FD4C8]"
                    : "text-navy hover:border-teal",
                )}
                title={t(fn.hint)}
              >
                <Icon className="size-3.5 text-teal" />
                {t(fn.key)}
              </LangLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function FunctionMenuLinks({ onPick, tone = "light" }: { onPick?: () => void; tone?: "light" | "ink" }) {
  const { t } = useI18n();
  const ink = tone === "ink";
  return (
    <div className={cn("mt-2 border-t pt-2", ink ? "border-white/10" : "border-navy/10")}>
      <p className={cn("mb-1 px-3 text-sm font-bold uppercase tracking-[0.18em]", ink ? "text-[#9FD4C8]" : "text-navy")}>
        {t("journey.kicker")}
      </p>
      {PRODUCT_FUNCTIONS.map((fn) => {
        const Icon = fn.icon;
        return (
          <LangLink
            key={fn.id}
            href={fn.href}
            onClick={onPick}
            className={cn(
              "tap-row flex items-center gap-2 rounded-[10px] px-3 py-3 text-base",
              ink ? "text-[#F7F3EA] hover:bg-white/8" : "text-navy hover:bg-navy/5",
            )}
          >
            <Icon className={cn("size-4 shrink-0", ink ? "text-[#9FD4C8]" : "text-teal")} />
            <span className="min-w-0 flex-1 truncate">{t(fn.key)}</span>
            <span className={cn("ms-auto hidden max-w-[45%] truncate text-sm sm:inline", ink ? "text-[#C9D0D8]" : "text-muted")}>
              {t(fn.hint)}
            </span>
          </LangLink>
        );
      })}
    </div>
  );
}
