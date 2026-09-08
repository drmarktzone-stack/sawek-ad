"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import type { AgentId, CampaignPack, Locale } from "@/lib/types";
import { installDemoPack, latestPack } from "@/lib/active-pack";
import { EMPTY_CAMPAIGN_EVENT, wantsEmptyCampaign } from "@/lib/empty-campaign";
import { DemoPicker } from "@/components/demo-picker";
import { LOCALES } from "@/lib/i18n";
import { useI18n } from "@/components/i18n-provider";
import { useIsClient } from "@/lib/use-is-client";
import { Button } from "@/components/ui/button";
import { ConquerHeadline } from "@/components/stepper";
import { cn } from "@/lib/utils";
import { LangLink } from "@/components/lang-link";
import { CampaignJourney } from "@/components/campaign-journey";

const AGENT_LABEL: Record<AgentId, Record<Locale, string>> = {
  intake: { he: "קליטה", ar: "الاستقبال", en: "Intake" },
  diagnostic: { he: "אבחון", ar: "التشخيص", en: "Diagnostic" },
  strategic: { he: "אסטרטגיה", ar: "الاستراتيجية", en: "Strategic" },
  media: { he: "מדיה", ar: "الميديا", en: "Media" },
  optimizer: { he: "אופטימיזר", ar: "المُحسِّن", en: "Optimizer" },
};

const DEPT_RAIL = [
  { href: "/dashboard", key: "nav.command" as const },
  { href: "/task/ad", key: "nav.create" as const },
  { href: "/campaigns", key: "nav.campaigns" as const },
  { href: "/studio", key: "nav.studio" as const },
  { href: "/growth/market", key: "nav.intel" as const },
  { href: "/growth/dna", key: "nav.dna" as const },
  { href: "/growth/experiments", key: "nav.experiments" as const },
  { href: "/leads", key: "nav.leads" as const },
  { href: "/", key: "nav.build" as const },
  { href: "/discovery", key: "nav.discovery" as const },
  { href: "/strategy", key: "nav.strategy" as const },
  { href: "/viral", key: "nav.viral" as const },
  { href: "/media", key: "nav.media" as const },
  { href: "/medical/optibrain", key: "nav.medical" as const },
  { href: "/growth", key: "nav.growth" as const },
  { href: "/lab", key: "nav.lab" as const },
  { href: "/self", key: "nav.self" as const },
  { href: "/tools/core-message", key: "nav.voice" as const },
  { href: "/tools/offer", key: "nav.offerTool" as const },
  { href: "/tools/hso", key: "nav.hso" as const },
];

export function DepartmentRail() {
  const { t } = useI18n();
  const pathname = usePathname();
  return (
    <nav className="os-tabs mb-6" aria-label={t("os.kicker")}>
      {DEPT_RAIL.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <LangLink
            key={item.href}
            href={item.href}
            className={cn("os-tab", active && "is-active")}
          >
            {t(item.key)}
          </LangLink>
        );
      })}
    </nav>
  );
}

export function ProducedBy({ agents }: { agents: AgentId[] }) {
  const { locale, t } = useI18n();
  return (
    <p className="mb-4 text-sm text-muted">
      {t("dept.producedBy")}{" "}
      {agents.map((a) => AGENT_LABEL[a][locale]).join(" · ")}
    </p>
  );
}

export function PackLangToggle({
  value,
  onChange,
}: {
  value: Locale;
  onChange: (l: Locale) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted">{t("result.packLang")}</span>
      <div className="flex rounded-full border border-navy/10 p-0.5">
        {LOCALES.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => onChange(l.id)}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-semibold",
              value === l.id ? "bg-navy text-white" : "text-muted",
            )}
          >
            {l.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function DepartmentShell({
  titleKey,
  leadKey,
  children,
}: {
  titleKey: Parameters<ReturnType<typeof useI18n>["t"]>[0];
  leadKey: Parameters<ReturnType<typeof useI18n>["t"]>[0];
  children: (ctx: { pack: CampaignPack; packLang: Locale; onPack: (p: CampaignPack) => void }) => ReactNode;
}) {
  const { t, locale } = useI18n();
  const client = useIsClient();
  const [pack, setPack] = useState<CampaignPack | null>(null);
  const [booted, setBooted] = useState(false);
  const [packLang, setPackLang] = useState<Locale>(locale);

  if (client && !booted) {
    const latest = latestPack();
    if (latest) setPack(latest);
    setPackLang(locale);
    setBooted(true);
  }

  useEffect(() => {
    setPackLang(locale);
  }, [locale]);

  useEffect(() => {
    function onEmpty() {
      if (wantsEmptyCampaign()) setPack(null);
    }
    window.addEventListener(EMPTY_CAMPAIGN_EVENT, onEmpty);
    return () => window.removeEventListener(EMPTY_CAMPAIGN_EVENT, onEmpty);
  }, []);

  function loadDemo(idOrSlug: string = "samer") {
    const next = installDemoPack(idOrSlug, packLang);
    setPack(next);
  }

  return (
    <div className="os-page max-w-6xl">
      <CampaignJourney compact />
      <ConquerHeadline subtitle={t(titleKey)} />
      <p className="mx-auto mb-4 max-w-2xl text-center text-sm text-muted">{t(leadKey)}</p>
      <DepartmentRail />

      {!booted && <p className="os-state">{t("os.loading")}</p>}

      {booted && !pack && (
        <div className="agency-empty px-5 py-8 text-center">
          <p className="text-muted">{t("dept.empty")}</p>
          <div className="mt-5 flex flex-col items-center gap-3">
            <DemoPicker onSelect={(id) => loadDemo(id)} size="default" />
            <Button asChild variant="dark">
              <LangLink href="/">{t("nav.build")}</LangLink>
            </Button>
          </div>
        </div>
      )}

      {pack && (
        <>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] pb-4">
            <div>
              <p className="os-kicker">{t("os.studio.campaign")}</p>
              <p className="text-lg font-black text-navy">{pack.name}</p>
              <p className="text-sm text-muted">
                {t("result.score")}: {pack.intakeReport.completeness}/100 · {pack.intake.offer}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <PackLangToggle value={packLang} onChange={setPackLang} />
              <DemoPicker onSelect={(id) => loadDemo(id)} size="sm" />
              <Button asChild size="sm" variant="outline">
                <LangLink href={`/campaigns/${pack.id}`}>{t("campaigns.open")}</LangLink>
              </Button>
            </div>
          </div>
          {children({ pack, packLang, onPack: setPack })}
        </>
      )}
    </div>
  );
}

export function Card({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="os-section">
      <h2 className="os-kicker mb-3">{title}</h2>
      {children}
    </section>
  );
}
