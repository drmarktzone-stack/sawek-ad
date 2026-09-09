"use client";

import { LangLink } from "@/components/lang-link";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/i18n-provider";
import { OsRow, OsSection, OsUnknown, ValueOrUnknown } from "@/components/command/primitives";
import type { CommandSignals } from "@/components/command/signals";

function lineOrUnknown(value?: string | null) {
  const v = value?.trim();
  return v ? v : null;
}

export function ContextBar({ signals }: { signals: CommandSignals }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-3 border-b border-[var(--line)] pb-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="os-kicker">{t("os.context")}</p>
        <p className="os-title mt-1 truncate text-2xl sm:text-3xl">
          {signals.businessName || t("os.noBusiness")}
        </p>
        <p className="mt-1 text-sm text-muted">
          {signals.campaignName ? `${t("os.campaign")}: ${signals.campaignName}` : t("os.noCampaign")}
          {signals.completeness != null ? ` · ${t("result.score")} ${signals.completeness}/100` : ""}
        </p>
      </div>
      <Button asChild size="lg" variant="coral" className="btn-mobile-full">
        <LangLink href="/task/ad">{t("complete.kicker")}</LangLink>
      </Button>
    </div>
  );
}

export function TodayBoard({ signals }: { signals: CommandSignals }) {
  const { t } = useI18n();
  const ws = signals.workspace;
  const signal =
    lineOrUnknown(ws?.market?.patterns[0] ? `${ws.market.patterns[0].name}: ${ws.market.patterns[0].language}` : "") ||
    lineOrUnknown(ws?.market?.notifications[0]?.text) ||
    lineOrUnknown(signals.intake.category);
  const opportunity = ws?.opportunities.find((o) => o.confidence !== "unknown") ?? ws?.opportunities[0];
  const problem = lineOrUnknown(signals.intake.biggestProblem) || lineOrUnknown(ws?.audience.nodes.find((n) => n.kind === "pain")?.text);
  const nba = lineOrUnknown(ws?.nba.action);

  return (
    <OsSection kicker={t("os.today")} title={t("os.todayTitle")}>
      <dl>
        <OsRow label={t("os.signal")}>{signal ? signal : <OsUnknown />}</OsRow>
        <OsRow label={t("os.opportunity")}>
          {opportunity ? (
            <span>
              {opportunity.title}
              {opportunity.confidence === "unknown" ? <span className="os-unknown"> · UNKNOWN</span> : null}
            </span>
          ) : (
            <OsUnknown />
          )}
        </OsRow>
        <OsRow label={t("os.problem")}>{problem ? problem : <OsUnknown />}</OsRow>
        <OsRow label={t("os.nba")}>
          {nba ? (
            <span>
              {nba}
              {ws?.nba.reason ? <span className="mt-1 block text-sm font-normal text-muted">{ws.nba.reason}</span> : null}
            </span>
          ) : signals.hasBusiness ? (
            t("complete.kicker")
          ) : (
            <OsUnknown />
          )}
        </OsRow>
      </dl>
    </OsSection>
  );
}

export function ModuleSummaries({ signals }: { signals: CommandSignals }) {
  const { t } = useI18n();
  const ws = signals.workspace;
  const modules = [
    {
      href: "/growth/market",
      title: t("nav.intel"),
      body: ws?.market?.patterns[0]
        ? `${ws.market.patterns[0].name}`
        : t("os.unknown"),
    },
    {
      href: "/growth/performance",
      title: t("nav.analytics"),
      body: ws?.performance.observed[0]
        ? `${ws.performance.observed[0].label}: ${ws.performance.observed[0].value}`
        : t("os.unknown"),
    },
    {
      href: "/growth/experiments",
      title: t("nav.experiments"),
      body: ws?.experiments[0] ? `${ws.experiments[0].name} · ${ws.experiments[0].status}` : t("os.unknown"),
    },
    {
      href: "/growth",
      title: t("os.learnings"),
      body: ws?.learnings[0]?.summary || t("os.unknown"),
    },
    {
      href: "/campaigns",
      title: t("nav.campaigns"),
      body: signals.campaigns.length ? String(signals.campaigns.length) : t("os.unknown"),
    },
    {
      href: "/growth/dna",
      title: t("nav.dna"),
      body: ws?.dna.traits[0]?.topic || t("os.unknown"),
    },
  ] as const;

  return (
    <OsSection kicker={t("os.modules")} title={t("os.modulesTitle")}>
      <ul className="divide-y divide-[var(--line)]">
        {modules.map((m) => (
          <li key={m.href}>
            <LangLink href={m.href} className="os-row tap-row hover:text-teal">
              <span className="os-meta">{m.title}</span>
              <span className="min-w-0 truncate text-sm font-semibold text-navy">{m.body}</span>
            </LangLink>
          </li>
        ))}
      </ul>
    </OsSection>
  );
}

export function CommandHero({
  signals,
  onScan,
  onEmpty,
}: {
  signals: CommandSignals;
  onScan: () => void;
  onEmpty: () => void;
}) {
  const { t } = useI18n();
  return (
    <section className="agency-hero-glow relative isolate overflow-hidden">
      <div aria-hidden className="agency-grain absolute inset-0 opacity-10" />
      <div className="relative mx-auto max-w-6xl px-4 pb-12 pt-8 sm:pb-14 sm:pt-12">
        <p className="agency-kicker mb-3 text-center">{t("os.kicker")}</p>
        <h1 className="agency-display-cream mx-auto max-w-4xl text-center text-[2.1rem] leading-[1.12] sm:text-5xl lg:text-[3.6rem]">
          {t("os.headline")}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-center text-base font-semibold text-muted sm:text-lg">
          {t("os.pitch")}
        </p>
        <div className="mt-8 flex flex-col items-center gap-3">
          <div className="mobile-stack w-full justify-center">
            <Button asChild size="lg" variant="coral" className="btn-mobile-full text-base font-black">
              <LangLink href="/task/ad">{t("complete.kicker")}</LangLink>
            </Button>
            <Button type="button" size="lg" variant="outline" className="btn-mobile-full" onClick={onScan}>
              {t("home.cta.primary")}
            </Button>
            <Button type="button" size="lg" variant="outline" className="btn-mobile-full" onClick={onEmpty}>
              {t("cta.new")}
            </Button>
          </div>
          {signals.hasBusiness ? (
            <p className="text-sm text-muted">
              {t("os.context")}: {signals.businessName}
              {signals.completeness != null ? ` · ${signals.completeness}/100` : ""}
            </p>
          ) : (
            <p className="text-sm text-muted">{t("os.noBusiness")}</p>
          )}
        </div>
      </div>
    </section>
  );
}

export function CampaignTable({ signals }: { signals: CommandSignals }) {
  const { t } = useI18n();
  if (!signals.campaigns.length) {
    return (
      <OsSection kicker={t("nav.campaigns")} title={t("os.activeCampaigns")}>
        <p className="os-unknown">{t("dash.empty")}</p>
      </OsSection>
    );
  }
  return (
    <OsSection kicker={t("nav.campaigns")} title={t("os.activeCampaigns")}>
      <div className="overflow-x-auto">
        <table className="os-table">
          <thead>
            <tr>
              <th>{t("os.campaign")}</th>
              <th>{t("result.score")}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {signals.campaigns.slice(0, 8).map((c) => (
              <tr key={c.id}>
                <td className="font-semibold text-navy">{c.name || t("dash.campaign")}</td>
                <td>
                  <ValueOrUnknown value={c.intakeReport.completeness} />
                  /100
                </td>
                <td className="text-end">
                  <LangLink href={`/campaigns/${c.id}`} className="text-sm font-bold text-teal hover:underline">
                    {t("campaigns.open")}
                  </LangLink>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </OsSection>
  );
}
