"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import type { AgentId, CampaignPack, Locale } from "@/lib/types";
import { installDemoPack, latestPack } from "@/lib/active-pack";
import { LOCALES } from "@/lib/i18n";
import { useI18n } from "@/components/i18n-provider";
import { useIsClient } from "@/lib/use-is-client";
import { Button } from "@/components/ui/button";
import { ConquerHeadline } from "@/components/stepper";
import { cn } from "@/lib/utils";
import { LangLink } from "@/components/lang-link";
import { wantsEmptyCampaign } from "@/lib/empty-campaign";

const AGENT_LABEL: Record<AgentId, Record<Locale, string>> = {
  intake: { he: "קליטה", ar: "الاستقبال", en: "Intake" },
  diagnostic: { he: "אבחון", ar: "التشخيص", en: "Diagnostic" },
  strategic: { he: "אסטרטגיה", ar: "الاستراتيجية", en: "Strategic" },
  media: { he: "מדיה", ar: "الميديا", en: "Media" },
  optimizer: { he: "אופטימיזר", ar: "المُحسِّن", en: "Optimizer" },
};

const DEPT_RAIL = [
  { href: "/", key: "nav.build" as const },
  { href: "/discovery", key: "nav.discovery" as const },
  { href: "/strategy", key: "nav.strategy" as const },
  { href: "/studio", key: "nav.studio" as const },
  { href: "/media", key: "nav.media" as const },
  { href: "/leads", key: "nav.leads" as const },
  { href: "/medical/optibrain", key: "nav.medical" as const },
  { href: "/campaigns", key: "nav.campaigns" as const },
  { href: "/self", key: "nav.self" as const },
];

export function DepartmentRail() {
  const { t } = useI18n();
  const pathname = usePathname();
  return (
    <nav className="mb-6 flex gap-1 overflow-x-auto pb-1">
      {DEPT_RAIL.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <LangLink
            key={item.href}
            href={item.href}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold",
              active
                ? "bg-omni-yellow text-black"
                : "border border-white/10 text-zinc-300 hover:border-omni-yellow/40",
            )}
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
    <p className="mb-4 text-xs text-zinc-500">
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
      <span className="text-xs text-zinc-500">{t("result.packLang")}</span>
      <div className="flex rounded-full border border-white/10 p-0.5">
        {LOCALES.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => onChange(l.id)}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-semibold",
              value === l.id ? "bg-omni-yellow text-black" : "text-zinc-300",
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
    else if (!wantsEmptyCampaign() && locale !== "ar") {
      setPack(installDemoPack());
    }
    setPackLang(locale);
    setBooted(true);
  }

  useEffect(() => {
    setPackLang(locale);
  }, [locale]);

  function loadDemo() {
    const next = installDemoPack();
    setPack(next);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <ConquerHeadline subtitle={t(titleKey)} />
      <p className="mx-auto mb-6 max-w-2xl text-center text-sm text-zinc-400">{t(leadKey)}</p>
      <DepartmentRail />

      {!booted && <p className="text-center text-zinc-500">…</p>}

      {booted && !pack && (
        <div className="rounded-2xl border border-white/10 bg-omni-card p-8 text-center">
          <p className="text-zinc-300">{t("dept.empty")}</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Button type="button" onClick={loadDemo}>
              {t("dept.loadDemo")}
            </Button>
            <Button asChild variant="dark">
              <LangLink href="/">{t("nav.build")}</LangLink>
            </Button>
          </div>
        </div>
      )}

      {pack && (
        <>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-omni-card px-4 py-3">
            <div>
              <p className="text-sm font-black text-white">{pack.name}</p>
              <p className="text-[11px] text-zinc-500">
                {t("result.score")}: {pack.intakeReport.completeness}/100 · {pack.intake.offer}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <PackLangToggle value={packLang} onChange={setPackLang} />
              <Button type="button" size="sm" variant="dark" onClick={loadDemo}>
                {t("dept.loadDemo")}
              </Button>
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
    <section className="rounded-2xl border border-white/10 bg-omni-card p-5">
      <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-omni-yellow">{title}</h2>
      {children}
    </section>
  );
}
