"use client";

import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { useI18n } from "@/components/i18n-provider";
import { LangLink } from "@/components/lang-link";
import { useIsClient } from "@/lib/use-is-client";
import { loadCampaignTools } from "@/lib/campaign-tools";
import { offerBlueprintIsSaved } from "@/lib/engine/offer-builder";
import { voiceIsLocked } from "@/lib/engine/voice";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: "start", href: "/", key: "journey.start" as const },
  { id: "offer", href: "/tools/offer", key: "journey.offer" as const },
  { id: "ads", href: "/tools/hso", key: "journey.ads" as const },
  { id: "content", href: "/studio", key: "journey.content" as const },
  { id: "track", href: "/growth/performance", key: "journey.track" as const },
] as const;

function stepActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/" || pathname.startsWith("/task");
  if (href === "/tools/hso") return pathname.startsWith("/tools/hso") || pathname.startsWith("/task/ad");
  if (href === "/studio") return pathname.startsWith("/studio") || pathname.startsWith("/viral");
  if (href === "/growth/performance") return pathname.startsWith("/growth") || pathname.startsWith("/campaigns");
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function CampaignJourney({ compact = false }: { compact?: boolean }) {
  const { t, locale } = useI18n();
  const pathname = usePathname();
  const client = useIsClient();
  const snap = useMemo(() => (client ? loadCampaignTools() : null), [client, pathname]);
  const locked = snap ? voiceIsLocked(snap.intake.voice) : false;
  const offerSaved = snap ? offerBlueprintIsSaved(snap.intake.offerBlueprint ?? snap.pack?.offerBlueprint) : false;
  const skipped = Boolean(snap?.intake.offerSkipConfirmed || snap?.intake.offerBlueprint?.skipped);

  return (
    <nav
      className={cn("mb-5 rounded-[14px] border border-[var(--line)] bg-[var(--paper)] px-3 py-3", compact && "mb-3 py-2")}
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
            locked ? "bg-teal text-white" : "border border-navy/15 text-navy hover:border-teal",
          )}
          data-testid="journey-voice"
        >
          {locked ? t("journey.voice") : t("journey.voiceOpen")}
        </LangLink>
      </div>
      <ol className="flex min-w-0 items-center gap-1 overflow-x-auto pb-0.5">
        {STEPS.map((step, i) => {
          const active = stepActive(pathname, step.href);
          const done =
            (step.id === "offer" && (offerSaved || skipped)) ||
            (step.id === "ads" && Boolean(snap?.pack?.hsoStudio?.variants.length || snap?.pack?.completeAd));
          return (
            <li key={step.id} className="flex shrink-0 items-center gap-1">
              {i > 0 ? <span className="px-0.5 text-muted" aria-hidden>→</span> : null}
              <LangLink
                href={step.href}
                data-testid={`journey-${step.id}`}
                className={cn(
                  "tap-row rounded-[10px] px-2.5 py-1.5 text-sm font-bold",
                  active ? "bg-ink text-[#F7F3EA]" : done ? "bg-teal/15 text-navy" : "text-muted hover:text-navy",
                )}
              >
                {t(step.key)}
                {step.id === "offer" && skipped && !offerSaved ? (
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
