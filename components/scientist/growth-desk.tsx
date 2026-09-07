"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/components/i18n-provider";
import { LangLink } from "@/components/lang-link";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { ConquerHeadline } from "@/components/stepper";
import { DepartmentRail } from "@/components/department-shell";
import { useAuth } from "@/components/auth-provider";
import { loadCampaigns } from "@/lib/storage";
import { ingestPack } from "@/lib/scientist/store";
import {
  addManualRevenue,
  completeExperiment,
  fetchRemoteWorkspaces,
  getPrimaryWorkspace,
  loadScientistWorkspaces,
  mergeRemoteWorkspaces,
  recordExperiment,
} from "@/lib/scientist/store";
import type { GrowthWorkspace, KnowledgeKind, Uncertainty } from "@/lib/scientist/types";
import { cn } from "@/lib/utils";

export type GrowthSection =
  | "home"
  | "dna"
  | "audience"
  | "competitors"
  | "radar"
  | "hypotheses"
  | "experiments"
  | "performance";

const SECTIONS: { id: GrowthSection; key: `sci.nav.${GrowthSection}` }[] = [
  { id: "home", key: "sci.nav.home" },
  { id: "dna", key: "sci.nav.dna" },
  { id: "audience", key: "sci.nav.audience" },
  { id: "competitors", key: "sci.nav.competitors" },
  { id: "radar", key: "sci.nav.radar" },
  { id: "hypotheses", key: "sci.nav.hypotheses" },
  { id: "experiments", key: "sci.nav.experiments" },
  { id: "performance", key: "sci.nav.performance" },
];

function badge(level: Uncertainty | KnowledgeKind) {
  if (level === "high") return "sci.unc.high" as const;
  if (level === "medium") return "sci.unc.medium" as const;
  if (level === "low") return "sci.unc.low" as const;
  if (level === "know") return "sci.know.know" as const;
  if (level === "think") return "sci.know.think" as const;
  if (level === "dont_know") return "sci.know.dont" as const;
  return "sci.unc.unknown" as const;
}

function Unc({ level }: { level: Uncertainty | KnowledgeKind }) {
  const { t } = useI18n();
  const tone =
    level === "high" || level === "know"
      ? "bg-[#F5C518] text-black"
      : level === "medium" || level === "think"
        ? "bg-white/10 text-[#F7F3EA]"
        : "border border-white/20 text-[#C9D0D8]";
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide", tone)}>
      {t(badge(level))}
    </span>
  );
}

export function GrowthDesk({ section = "home" }: { section?: GrowthSection }) {
  const { t, locale } = useI18n();
  const { ready, user } = useAuth();
  const [ws, setWs] = useState<GrowthWorkspace | null>(null);
  const [booted, setBooted] = useState(false);
  const [expName, setExpName] = useState("");
  const [expMetric, setExpMetric] = useState("leads");
  const [expBaseline, setExpBaseline] = useState("");
  const [expActual, setExpActual] = useState("");
  const [revAmount, setRevAmount] = useState("");
  const [revSource, setRevSource] = useState("");

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    (async () => {
      const remote = await fetchRemoteWorkspaces();
      if (remote.length) mergeRemoteWorkspaces(remote);
      const packs = loadCampaigns().filter((p) => !p.demoMeta);
      for (const p of packs.slice(0, 8)) {
        try {
          ingestPack(p);
        } catch {
          /* ignore */
        }
      }
      if (cancelled) return;
      setWs(getPrimaryWorkspace() ?? loadScientistWorkspaces()[0] ?? null);
      setBooted(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, user?.id]);

  const dir = locale === "en" ? "ltr" : "rtl";

  const href = (id: GrowthSection) => (id === "home" ? "/growth" : `/growth/${id}`);

  const createExperiment = () => {
    if (!ws || !expName.trim()) return;
    const baseline = expBaseline.trim() ? Number(expBaseline) : undefined;
    const actual = expActual.trim() ? Number(expActual) : undefined;
    const next = recordExperiment(ws, {
      name: expName.trim(),
      status: typeof actual === "number" ? "completed" : "running",
      variants: [
        { id: "a", name: "A", notes: "" },
        { id: "b", name: "B", notes: "" },
      ],
      metrics: [{ name: expMetric.trim() || "leads", baseline: Number.isFinite(baseline) ? baseline : undefined, actual: Number.isFinite(actual) ? actual : undefined }],
      notes: "",
      hypothesisId: ws.hypotheses.find((h) => h.status === "open")?.id,
    });
    setWs(next);
    setExpName("");
    setExpBaseline("");
    setExpActual("");
  };

  const finishFirst = () => {
    if (!ws) return;
    const running = ws.experiments.find((e) => e.status === "running");
    if (!running) return;
    const actual = expActual.trim() ? Number(expActual) : undefined;
    if (actual == null || !Number.isFinite(actual)) return;
    const metrics = running.metrics.map((m, i) => (i === 0 ? { ...m, actual } : m));
    setWs(completeExperiment(ws, running.id, metrics));
    setExpActual("");
  };

  const addRev = () => {
    if (!ws) return;
    const n = Number(revAmount);
    if (!Number.isFinite(n) || n <= 0) return;
    setWs(addManualRevenue(ws, n, revSource));
    setRevAmount("");
    setRevSource("");
  };

  if (!booted) return <p className="p-10 text-center text-muted">…</p>;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8" dir={dir}>
      <ConquerHeadline subtitle={t("sci.title")} />
      <p className="mx-auto mb-6 max-w-2xl text-center text-sm text-muted">{t("sci.lead")}</p>
      <DepartmentRail />
      <nav className="mb-6 flex gap-1 overflow-x-auto pb-1" aria-label={t("sci.title")}>
        {SECTIONS.map((s) => (
          <LangLink
            key={s.id}
            href={href(s.id)}
            className={cn(
              "shrink-0 rounded-[10px] px-3 py-1.5 text-xs font-semibold",
              section === s.id ? "bg-ink text-[#F7F3EA]" : "border border-[rgba(8,17,31,0.12)] text-muted hover:border-teal",
            )}
          >
            {t(s.key)}
          </LangLink>
        ))}
      </nav>

      {!ws && (
        <div className="rounded-2xl border border-navy/10 bg-white p-8 text-center">
          <p className="text-muted">{t("sci.empty")}</p>
          <Button asChild className="mt-4">
            <LangLink href="/">{t("nav.build")}</LangLink>
          </Button>
        </div>
      )}

      {ws && section === "home" && <HomeBoard ws={ws} />}
      {ws && section === "dna" && <DnaBoard ws={ws} />}
      {ws && section === "audience" && <AudienceBoard ws={ws} />}
      {ws && section === "competitors" && <CompetitorBoard ws={ws} />}
      {ws && section === "radar" && <RadarBoard ws={ws} />}
      {ws && section === "hypotheses" && <HypothesisBoard ws={ws} />}
      {ws && section === "experiments" && (
        <ExperimentBoard
          ws={ws}
          expName={expName}
          setExpName={setExpName}
          expMetric={expMetric}
          setExpMetric={setExpMetric}
          expBaseline={expBaseline}
          setExpBaseline={setExpBaseline}
          expActual={expActual}
          setExpActual={setExpActual}
          onCreate={createExperiment}
          onFinish={finishFirst}
        />
      )}
      {ws && section === "performance" && (
        <PerformanceBoard ws={ws} revAmount={revAmount} setRevAmount={setRevAmount} revSource={revSource} setRevSource={setRevSource} onRev={addRev} />
      )}
    </div>
  );
}

function Panel({ title, children, dark = false }: { title: string; children: React.ReactNode; dark?: boolean }) {
  return (
    <section className={cn("rounded-2xl border p-5", dark ? "border-white/10 bg-ink text-[#F7F3EA]" : "border-navy/10 bg-white")}>
      <h2 className={cn("mb-3 text-sm font-black uppercase tracking-wide", dark ? "text-[#F5C518]" : "text-teal")}>{title}</h2>
      {children}
    </section>
  );
}

function HomeBoard({ ws }: { ws: GrowthWorkspace }) {
  const { t } = useI18n();
  const happened = useMemo(() => {
    const last = ws.performance.observed.slice(0, 3);
    if (last.length) return last.map((o) => `${o.label}: ${o.value}`);
    return [t("sci.unknown.perf")];
  }, [ws, t]);
  const learned = ws.learnings[0]?.summary || t("sci.unknown.learn");
  const opp = ws.opportunities.find((o) => o.confidence !== "unknown") ?? ws.opportunities[0];
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Panel title={t("sci.home.happened")} dark>
        <ul className="space-y-2 text-sm">
          {happened.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </Panel>
      <Panel title={t("sci.home.learned")}>
        <p className="text-sm text-navy">{learned}</p>
      </Panel>
      <Panel title={t("sci.home.opportunity")}>
        {opp ? (
          <>
            <p className="font-bold text-navy">{opp.title}</p>
            <p className="mt-1 text-sm text-muted">{opp.whyNow}</p>
            <div className="mt-2">
              <Unc level={opp.confidence} />
            </div>
            <p className="mt-2 text-xs text-muted">{t("sci.noProb")}</p>
          </>
        ) : (
          <p className="text-sm text-muted">{t("sci.unknown.opp")}</p>
        )}
      </Panel>
      <Panel title={t("sci.home.next")} dark>
        <p className="text-lg font-black">{ws.nba.action || t("sci.unknown.nba")}</p>
        <p className="mt-2 text-sm text-[#C9D0D8]">{ws.nba.reason}</p>
        <div className="mt-3">
          <Unc level={ws.nba.uncertainty} />
        </div>
      </Panel>
      <div className="md:col-span-2">
        <KnowledgeBoard ws={ws} />
      </div>
    </div>
  );
}

function KnowledgeBoard({ ws }: { ws: GrowthWorkspace }) {
  const { t } = useI18n();
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <Panel title={t("sci.know.know")}>
        <ul className="space-y-1 text-sm">
          {(ws.knowledge.know.slice(0, 8).length ? ws.knowledge.know.slice(0, 8) : [{ text: t("sci.unknown.know"), evidence: [] }]).map((k) => (
            <li key={k.text}>{k.text}</li>
          ))}
        </ul>
      </Panel>
      <Panel title={t("sci.know.think")}>
        <ul className="space-y-1 text-sm">
          {(ws.knowledge.think.slice(0, 8).length ? ws.knowledge.think.slice(0, 8) : [{ text: t("sci.unknown.think"), evidence: [] }]).map((k) => (
            <li key={k.text}>{k.text}</li>
          ))}
        </ul>
      </Panel>
      <Panel title={t("sci.know.dont")}>
        <ul className="space-y-1 text-sm">
          {(ws.knowledge.dontKnow.slice(0, 8).length ? ws.knowledge.dontKnow.slice(0, 8) : [{ text: t("sci.unknown.dont"), evidence: [] }]).map((k) => (
            <li key={k.text}>{k.text}</li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

function DnaBoard({ ws }: { ws: GrowthWorkspace }) {
  const { t } = useI18n();
  return (
    <Panel title={t("sci.dna.title")}>
      <p className="mb-3 text-sm text-muted">{t("sci.dna.lead")}</p>
      {!ws.dna.traits.length && <p className="text-sm text-muted">{t("sci.unknown.dna")}</p>}
      <ul className="space-y-3">
        {ws.dna.traits.map((tr) => (
          <li key={tr.id} className="rounded-xl border border-navy/10 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-bold text-navy">{tr.topic}</p>
              <Unc level={tr.confidence} />
              <Unc level={tr.kind} />
            </div>
            <p className="mt-1 text-sm">{tr.claim}</p>
            {tr.evidence[0] && (
              <p className="mt-1 text-xs text-muted">
                {t("sci.evidence")}: {tr.evidence[0].ref} · {tr.evidence[0].layer}
              </p>
            )}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function AudienceBoard({ ws }: { ws: GrowthWorkspace }) {
  const { t } = useI18n();
  return (
    <Panel title={t("sci.aud.title")}>
      <p className="mb-3 text-sm text-muted">{t("sci.aud.lead")}</p>
      {!ws.audience.nodes.length && <p className="text-sm text-muted">{t("sci.unknown.aud")}</p>}
      <ul className="grid gap-3 md:grid-cols-2">
        {ws.audience.nodes.map((n) => (
          <li key={n.id} className="rounded-xl border border-navy/10 p-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase text-teal">{n.kind}</span>
              <Unc level={n.uncertainty} />
            </div>
            <p className="mt-1 text-sm">{n.text}</p>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function CompetitorBoard({ ws }: { ws: GrowthWorkspace }) {
  const { t } = useI18n();
  return (
    <Panel title={t("sci.comp.title")}>
      <p className="mb-3 text-sm text-muted">{t("sci.comp.lead")}</p>
      {ws.competitors.missing && <p className="text-sm text-muted">{t("sci.unknown.comp")}</p>}
      <ul className="space-y-3">
        {ws.competitors.gaps.map((g) => (
          <li key={g.id} className="rounded-xl border border-navy/10 p-3">
            <div className="flex items-center gap-2">
              <p className="font-bold text-navy">{g.competitorName}</p>
              <Unc level={g.uncertainty} />
            </div>
            <p className="mt-1 text-sm">{g.observation}</p>
            {g.gap && <p className="mt-1 text-sm text-muted">{g.gap}</p>}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function RadarBoard({ ws }: { ws: GrowthWorkspace }) {
  const { t } = useI18n();
  return (
    <Panel title={t("sci.radar.title")}>
      <p className="mb-3 text-sm text-muted">{t("sci.radar.lead")}</p>
      <ul className="space-y-3">
        {ws.opportunities.map((o) => (
          <li key={o.id} className="rounded-xl border border-navy/10 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-bold text-navy">{o.title}</p>
              <Unc level={o.confidence} />
            </div>
            <p className="mt-1 text-sm">{o.whyNow}</p>
            <p className="mt-2 text-sm font-semibold">{t("sci.home.next")}: {o.action}</p>
            <p className="mt-1 text-xs text-muted">{t("sci.noProb")}</p>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function HypothesisBoard({ ws }: { ws: GrowthWorkspace }) {
  const { t } = useI18n();
  return (
    <Panel title={t("sci.hyp.title")}>
      <p className="mb-3 text-sm text-muted">{t("sci.hyp.lead")}</p>
      {!ws.hypotheses.length && <p className="text-sm text-muted">{t("sci.unknown.hyp")}</p>}
      <ul className="space-y-3">
        {ws.hypotheses.map((h) => (
          <li key={h.id} className="rounded-xl border border-navy/10 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-black uppercase text-teal">{h.status}</span>
              <Unc level={h.confidence} />
              <span className="text-xs text-muted">{h.area}</span>
            </div>
            <p className="mt-1 text-sm font-bold">{h.statement}</p>
            {h.result && <p className="mt-1 text-sm">{h.result}</p>}
            {h.conclusion && <p className="mt-1 text-xs text-muted">{h.conclusion}</p>}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function ExperimentBoard({
  ws,
  expName,
  setExpName,
  expMetric,
  setExpMetric,
  expBaseline,
  setExpBaseline,
  expActual,
  setExpActual,
  onCreate,
  onFinish,
}: {
  ws: GrowthWorkspace;
  expName: string;
  setExpName: (v: string) => void;
  expMetric: string;
  setExpMetric: (v: string) => void;
  expBaseline: string;
  setExpBaseline: (v: string) => void;
  expActual: string;
  setExpActual: (v: string) => void;
  onCreate: () => void;
  onFinish: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="space-y-4">
      <Panel title={t("sci.exp.create")}>
        <p className="mb-3 text-sm text-muted">{t("sci.exp.lead")}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>{t("sci.exp.name")}</Label>
            <Input value={expName} onChange={(e) => setExpName(e.target.value)} />
          </div>
          <div>
            <Label>{t("sci.exp.metric")}</Label>
            <Input value={expMetric} onChange={(e) => setExpMetric(e.target.value)} />
          </div>
          <div>
            <Label>{t("sci.exp.baseline")}</Label>
            <Input inputMode="decimal" value={expBaseline} onChange={(e) => setExpBaseline(e.target.value)} />
          </div>
          <div>
            <Label>{t("sci.exp.actual")}</Label>
            <Input inputMode="decimal" value={expActual} onChange={(e) => setExpActual(e.target.value)} />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" onClick={onCreate}>
            {t("sci.exp.save")}
          </Button>
          <Button type="button" variant="outline" onClick={onFinish}>
            {t("sci.exp.finish")}
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted">{t("sci.exp.nosig")}</p>
      </Panel>
      <Panel title={t("sci.exp.list")}>
        {!ws.experiments.length && <p className="text-sm text-muted">{t("sci.unknown.exp")}</p>}
        <ul className="space-y-3">
          {ws.experiments.map((e) => (
            <li key={e.id} className="rounded-xl border border-navy/10 p-3">
              <p className="font-bold text-navy">
                {e.name} · {e.status} · {e.outcome}
              </p>
              <p className="text-sm text-muted">
                {e.metrics.map((m) => `${m.name}: ${m.baseline ?? "—"} → ${m.actual ?? "UNKNOWN"}`).join(" · ")}
              </p>
              {e.deltas.map((d) => (
                <p key={d.name} className="text-xs">
                  {d.name} Δ {d.delta} — {d.note}
                </p>
              ))}
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

function PerformanceBoard({
  ws,
  revAmount,
  setRevAmount,
  revSource,
  setRevSource,
  onRev,
}: {
  ws: GrowthWorkspace;
  revAmount: string;
  setRevAmount: (v: string) => void;
  revSource: string;
  setRevSource: (v: string) => void;
  onRev: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="space-y-4">
      <Panel title={t("sci.perf.layers")}>
        <p className="mb-3 text-sm text-muted">{t("sci.perf.lead")}</p>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <h3 className="text-xs font-black uppercase text-teal">{t("sci.perf.observed")}</h3>
            {!ws.performance.observed.length && <p className="text-sm text-muted">{t("sci.unknown.perf")}</p>}
            {ws.performance.observed.map((o) => (
              <p key={o.label} className="text-sm">
                {o.label}: {o.value}
              </p>
            ))}
          </div>
          <div>
            <h3 className="text-xs font-black uppercase text-teal">{t("sci.perf.calculated")}</h3>
            {!ws.performance.calculated.length && <p className="text-sm text-muted">UNKNOWN</p>}
            {ws.performance.calculated.map((o) => (
              <p key={o.label} className="text-sm">
                {o.label}: {o.value} <span className="text-xs text-muted">({o.formula})</span>
              </p>
            ))}
          </div>
          <div>
            <h3 className="text-xs font-black uppercase text-teal">{t("sci.perf.ai")}</h3>
            {ws.performance.aiInterpretation.slice(0, 4).map((o) => (
              <p key={o.text} className="text-sm">
                {o.text}
              </p>
            ))}
            {!ws.performance.aiInterpretation.length && <p className="text-sm text-muted">UNKNOWN</p>}
          </div>
          <div>
            <h3 className="text-xs font-black uppercase text-teal">{t("sci.perf.funnel")}</h3>
            {ws.performance.funnel.map((s) => (
              <p key={s.name} className="text-sm">
                {s.name}: {s.present ? s.value : "UNKNOWN"}
              </p>
            ))}
          </div>
        </div>
      </Panel>
      <Panel title={t("sci.rev.title")}>
        <p className="mb-2 text-sm">{ws.revenue.note}</p>
        <p className="text-sm font-bold">
          {t("sci.rev.total")}: {ws.revenue.total != null ? `${ws.revenue.total} ${ws.revenue.currency ?? ""}` : "UNKNOWN"}
        </p>
        <div className="mt-2">
          <Unc level={ws.revenue.confidence} />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <Label>{t("sci.rev.amount")}</Label>
            <Input inputMode="decimal" value={revAmount} onChange={(e) => setRevAmount(e.target.value)} />
          </div>
          <div>
            <Label>{t("sci.rev.source")}</Label>
            <Input value={revSource} onChange={(e) => setRevSource(e.target.value)} />
          </div>
        </div>
        <Button type="button" className="mt-3" onClick={onRev}>
          {t("sci.rev.add")}
        </Button>
      </Panel>
      <Panel title={t("sci.battle.title")}>
        <p className="mb-3 text-sm text-muted">{t("sci.battle.lead")}</p>
        <ul className="space-y-2">
          {ws.creativeBattle.scores.slice(0, 12).map((s) => (
            <li key={s.variantId} className="rounded-xl border border-navy/10 p-3 text-sm">
              <p className="font-bold">{s.label}</p>
              <p>
                {t("sci.battle.pre")}: {s.prePublishScore ?? "UNKNOWN"} — {s.prePublishNote}
              </p>
              <p>
                {t("sci.battle.actual")}: {s.actualMetric ?? "UNKNOWN"} — {s.actualNote}
              </p>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

export function DecisionStrip({ ws }: { ws: GrowthWorkspace | null }) {
  const { t } = useI18n();
  if (!ws) return null;
  return (
    <aside className="mb-6 rounded-2xl border border-navy/10 bg-ink p-4 text-[#F7F3EA]">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#F5C518]">{t("sci.strip.kicker")}</p>
      <p className="mt-2 text-sm font-black">{ws.nba.action || t("sci.unknown.nba")}</p>
      <p className="mt-1 text-xs text-[#C9D0D8]">{ws.nba.reason}</p>
      <LangLink href="/growth" className="mt-3 inline-block text-xs font-bold text-[#F5C518]">
        {t("sci.strip.open")}
      </LangLink>
    </aside>
  );
}
