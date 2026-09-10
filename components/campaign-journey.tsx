"use client";

import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { useI18n } from "@/components/i18n-provider";
import { LangLink } from "@/components/lang-link";
import { useIsClient } from "@/lib/use-is-client";
import { loadCampaignTools } from "@/lib/campaign-tools";
import { CAMPAIGN_STEPS, resolveCampaignPath } from "@/lib/campaign-path";
import { cn } from "@/lib/utils";

export function CampaignJourney({ compact = false }: { compact?: boolean }) {
  const { t, locale } = useI18n();
  const pathname = usePathname();
  const client = useIsClient();
  const snap = useMemo(() => (client ? loadCampaignTools() : null), [client, pathname]);
  const path = useMemo(() => (snap ? resolveCampaignPath(snap) : null), [snap]);
  const locked = Boolean(path?.done.client);

  return (
    <nav
      className={cn("mb-5 rounded-[22px] border-2 border-[var(--ink)] bg-white px-3 py-3 shadow-[var(--shadow-card)]", compact && "mb-3 py-2")}
      aria-label={t("journey.kicker")}
      data-testid="campaign-journey"
      dir={locale === "en" ? "ltr" : "rtl"}
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="os-kicker">{t("journey.kicker")}</p>
        <LangLink
          href="/tools/core-message"
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-black",
            locked ? "bg-lime text-[var(--lime-ink)]" : "border border-[var(--line)] text-navy hover:border-teal",
          )}
          data-testid="journey-voice"
        >
          {locked ? t("journey.voice") : t("journey.voiceOpen")}
        </LangLink>
      </div>
      <ol className="flex min-w-0 items-center gap-1 overflow-x-auto pb-0.5">
        {CAMPAIGN_STEPS.map((step, i) => {
          const done = Boolean(path?.done[step.id]);
          const current = path?.current === step.id;
          return (
            <li key={step.id} className="flex shrink-0 items-center gap-1">
              {i > 0 ? <span className="px-0.5 text-muted" aria-hidden>→</span> : null}
              <LangLink
                href={step.href}
                data-testid={`journey-${step.id}`}
                className={cn(
                  "tap-row rounded-[10px] px-2.5 py-1.5 text-sm font-bold",
                  current ? "bg-teal text-white" : done ? "bg-lime/35 text-navy" : "text-muted hover:text-navy",
                )}
              >
                {t(step.key)}
                {step.id === "offer" && snap?.intake.offerSkipConfirmed && !done ? (
                  <span className="ms-1 text-[10px] font-semibold opacity-80">{t("journey.offerSkip")}</span>
                ) : null}
              </LangLink>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
