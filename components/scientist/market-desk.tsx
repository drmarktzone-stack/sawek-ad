"use client";

import { useI18n } from "@/components/i18n-provider";
import { localizeTopicKey } from "@/lib/copy-purity";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { LangLink } from "@/components/lang-link";
import type { GrowthWorkspace } from "@/lib/scientist/types";
import type { ClaimLabel, MarketScanControls } from "@/lib/scientist/market-types";
import { cn } from "@/lib/utils";

function Claim({ label }: { label: ClaimLabel }) {
  const tone =
    label === "OBSERVED_FACT"
      ? "bg-[#F5C518] text-black"
      : label === "INFERENCE"
        ? "bg-mint/60 text-navy"
        : label === "ESTIMATE"
          ? "border border-[var(--line)] text-muted"
          : "border border-dashed border-[var(--line)] text-muted";
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide", tone)}>
      {label.replace("_", " ")}
    </span>
  );
}

function Panel({ title, children, dark = false }: { title: string; children: React.ReactNode; dark?: boolean }) {
  return (
    <section className={cn("os-section", dark && "agency-ink px-4 py-5")}>
      <h2 className={cn("os-kicker mb-3", dark && "text-teal")}>{title}</h2>
      {children}
    </section>
  );
}

export function MarketScanBar({
  controls,
  setControls,
  scanning,
  watching,
  lastReason,
  onScan,
  onWatch,
}: {
  controls: MarketScanControls;
  setControls: (c: MarketScanControls) => void;
  scanning: boolean;
  watching: boolean;
  lastReason?: string;
  onScan: () => void;
  onWatch: () => void;
}) {
  const { t } = useI18n();
  const field = (key: keyof MarketScanControls, label: string) => (
    <div>
      <Label>{label}</Label>
      <Input
        value={String(controls[key] ?? "")}
        onChange={(e) =>
          setControls({
            ...controls,
            [key]: key === "lookbackDays" ? Number(e.target.value) || 7 : e.target.value,
          })
        }
      />
    </div>
  );
  return (
    <Panel title={t("sci.mkt.scan")}>
      <p className="mb-3 text-sm text-muted">{t("sci.mkt.scanLead")}</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {field("region", t("sci.mkt.region"))}
        {field("language", t("sci.mkt.language"))}
        {field("industry", t("sci.mkt.industry"))}
        {field("objective", t("sci.mkt.objective"))}
        {field("lookbackDays", t("sci.mkt.lookback"))}
        {field("competitorCategory", t("sci.mkt.category"))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" onClick={onScan} disabled={scanning}>
          {scanning ? t("sci.mkt.scanning") : t("sci.mkt.scanNow")}
        </Button>
        <Button type="button" variant="outline" onClick={onWatch}>
          {watching ? t("sci.mkt.watching") : t("sci.mkt.watch")}
        </Button>
        <LangLink href="/growth/experiments" className="inline-flex items-center text-sm font-bold text-teal">
          {t("sci.mkt.toExp")}
        </LangLink>
      </div>
      {lastReason && <p className="mt-2 text-xs text-muted">{lastReason}</p>}
    </Panel>
  );
}

export function MarketBoard({
  ws,
  onAdopt,
}: {
  ws: GrowthWorkspace;
  onAdopt: (id?: string) => void;
}) {
  const { t } = useI18n();
  const m = ws.market;
  const nbe = m?.nextBestExperiment;
  const ads = (m?.ads ?? []).filter((a) => a.kind === "public_ad").slice(0, 8);
  const notes = (m?.ads ?? []).filter((a) => a.kind !== "public_ad").slice(0, 6);
  const newest = (m?.notifications ?? []).slice(0, 4);
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Panel title={t("sci.mkt.happening")} dark>
          {!m?.scans.length && <p className="text-sm text-muted">{t("sci.mkt.empty")}</p>}
          {m?.scans[0] && (
            <>
              <p className="text-sm">
                {t("sci.mkt.lastScan")}: {m.scans[0].finishedAt.slice(0, 16)}
                {m.scans[0].cached ? " · cache" : ""}
                {m.scans[0].reason ? ` · ${m.scans[0].reason}` : ""}
              </p>
              <ul className="mt-2 space-y-1 text-sm">
                {m.sources.map((s) => (
                  <li key={s.id}>
                    {s.platform}: {s.status}
                  </li>
                ))}
              </ul>
            </>
          )}
        </Panel>
        <Panel title={t("sci.mkt.competitors")}>
          {!ads.length && <p className="text-sm text-muted">{t("sci.mkt.noAds")}</p>}
          <ul className="space-y-2">
            {ads.map((a) => (
              <li key={a.id} className="border-b border-[var(--line)] py-3 last:border-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold text-navy">{a.advertiser || t("sci.mkt.unnamed")}</p>
                  <Claim label={a.claim} />
                </div>
                <p className="mt-1 text-sm">{a.title}</p>
                <p className="mt-1 text-xs text-muted">
                  {a.platform} · {a.dates.asOf.slice(0, 10)}
                </p>
                <a href={a.url} target="_blank" rel="noreferrer" className="text-xs font-bold text-teal">
                  {t("sci.mkt.source")}
                </a>
                {!a.performance.length && <p className="mt-1 text-xs text-muted">{t("sci.mkt.noMetrics")}</p>}
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title={t("sci.mkt.patterns")}>
          {!m?.patterns.length && <p className="text-sm text-muted">{t("sci.mkt.noPatterns")}</p>}
          <ul className="space-y-2">
            {(m?.patterns ?? []).slice(0, 6).map((p) => (
              <li key={p.id} className="border-b border-[var(--line)] py-3 last:border-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold text-navy">{p.name}</p>
                  <Claim label={p.claim} />
                </div>
                <p className="mt-1 text-sm">{p.language}</p>
                <p className="text-xs text-muted">
                  {p.platforms.join(", ") || "—"} · {t("sci.mkt.relevance")}: {p.relevance}
                </p>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title={t("sci.mkt.new")} dark>
          {!newest.length && <p className="text-sm text-muted">{t("sci.mkt.noNew")}</p>}
          <ul className="space-y-2 text-sm">
            {newest.map((n) => (
              <li key={n.id}>{n.text}</li>
            ))}
          </ul>
        </Panel>
        <Panel title={t("sci.mkt.relevant")}>
          <ul className="space-y-2 text-sm">
            {(m?.insights ?? []).slice(0, 6).map((i) => (
              <li key={i.id} className="border-b border-[var(--line)] py-3 last:border-0">
                <div className="flex flex-wrap gap-2">
                  <Claim label={i.claim} />
                  <span className="text-xs text-muted">
                    {i.historicallyTested ? t("sci.mkt.tested") : t("sci.mkt.untested")}
                  </span>
                </div>
                <p className="mt-1">{i.gap}</p>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title={t("sci.mkt.nbe")} dark>
          {nbe ? (
            <>
              <p className="text-lg font-black">{nbe.title}</p>
              <p className="mt-2 text-sm text-muted">{nbe.why}</p>
              <div className="mt-2">
                <Claim label={nbe.claim} />
              </div>
              <Button type="button" className="mt-3" onClick={() => onAdopt(nbe.id)} disabled={nbe.claim === "UNKNOWN"}>
                {t("sci.mkt.adopt")}
              </Button>
            </>
          ) : (
            <p className="text-sm">{t("sci.mkt.noNbe")}</p>
          )}
        </Panel>
      </div>
      {!!notes.length && (
        <Panel title={t("sci.mkt.notes")}>
          <ul className="space-y-2 text-sm">
            {notes.map((n) => (
              <li key={n.id}>
                <Claim label={n.claim} /> {n.title} — {n.snippet}
              </li>
            ))}
          </ul>
        </Panel>
      )}
      <p className="text-xs text-muted">{t("sci.mkt.honest")}</p>
    </div>
  );
}

export function PatternsBoard({ ws }: { ws: GrowthWorkspace }) {
  const { t } = useI18n();
  const patterns = ws.market?.patterns ?? [];
  return (
    <Panel title={t("sci.mkt.patternEngine")}>
      <p className="mb-3 text-sm text-muted">{t("sci.mkt.patternLead")}</p>
      {!patterns.length && <p className="text-sm text-muted">{t("sci.mkt.noPatterns")}</p>}
      <ul className="space-y-3">
        {patterns.map((p) => (
          <li key={p.id} className="border-b border-[var(--line)] py-3 last:border-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-bold text-navy">{p.name}</p>
              <Claim label={p.claim} />
            </div>
            <p className="mt-1 text-sm">{p.language}</p>
            <p className="mt-1 text-xs text-muted">{p.description}</p>
            <p className="mt-1 text-xs text-muted">
              {t("sci.mkt.platforms")}: {p.platforms.join(", ") || "UNKNOWN"} · {t("sci.mkt.regions")}:{" "}
              {p.regions.join(", ") || "UNKNOWN"} · {t("sci.mkt.objectives")}: {p.objectives.join(", ") || "UNKNOWN"}
            </p>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export function MarketDnaStrip({ ws }: { ws: GrowthWorkspace }) {
  const { t, locale } = useI18n();
  const traits = ws.market?.dna.traits ?? [];
  if (!traits.length) return null;
  return (
    <Panel title={t("sci.mkt.dna")}>
      <ul className="grid gap-2 md:grid-cols-2">
        {traits.slice(0, 8).map((tr) => (
          <li key={tr.id} className="border-b border-[var(--line)] py-3 text-sm last:border-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-navy">{localizeTopicKey(tr.topic, locale)}</span>
              <Claim label={tr.label} />
            </div>
            <p className="mt-1">{tr.claim}</p>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
