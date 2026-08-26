"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, WandSparkles } from "lucide-react";
import type { AgentId, AgentStatus, CampaignPack, Competitor, Intake, WizardStep } from "@/lib/types";
import { demoIntake, DEMO_LABEL, consumePendingDemo, clearPendingDemo, applyPediatricDemoDraft, isPediatricDemo, relocalizePediatricIntake } from "@/lib/demo";
import { installDemoPack } from "@/lib/active-pack";
import { cmoFieldsMissing, emptyIntake, wizardReady } from "@/lib/engine/validate";
import { assemblePack, idleStatus, runIntakeAndDiagnosis, runMedia, runOptimizerStage, runStrategic } from "@/lib/engine/run";
import { loadDraft, saveDraft, upsertCampaign, getCampaign } from "@/lib/storage";
import { uid } from "@/lib/utils";
import { MAX_COMPETITORS } from "@/lib/factory-formats";
import { AREA_LABEL } from "@/lib/i18n";
import { markEmptyCampaign, wantsEmptyCampaign, clearEmptyCampaign, explicitDemoInUrl } from "@/lib/empty-campaign";
import { stripDemoParamsPreserveLang, withLang } from "@/lib/locale-url";
import {
  ADVANTAGE_CHIPS,
  AUDIENCE_CHIPS,
  DEPTH_OPTIONS,
  GOAL_CHIPS,
  OFFER_CHIPS,
  PROBLEM_CHIPS,
  TYPE_OPTIONS,
  resolveChipLabel,
} from "@/lib/chips";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ChipGroup } from "@/components/chip-group";
import { ConquerHeadline, Stepper } from "@/components/stepper";
import { DepartmentRail } from "@/components/department-shell";
import { useI18n } from "@/components/i18n-provider";
import { useIsClient } from "@/lib/use-is-client";
import { cn } from "@/lib/utils";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export function WizardFlow({ embedded = false }: { embedded?: boolean }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const client = useIsClient();
  const [step, setStep] = useState<WizardStep>(1);
  const [intake, setIntake] = useState<Intake>(emptyIntake);
  const [phase, setPhase] = useState<"wizard" | "interview" | "agents">("wizard");
  const [hydrated, setHydrated] = useState(false);
  const [agentStatus, setAgentStatus] = useState(idleStatus);
  const [pack, setPack] = useState<CampaignPack | null>(null);
  const [running, setRunning] = useState(false);
  const [compOpen, setCompOpen] = useState(false);
  const [compDraft, setCompDraft] = useState<Competitor>({ id: "", name: "", url: "", notes: "" });
  const [custom, setCustom] = useState({
    audience: false,
    problem: false,
    advantage: false,
    goal: false,
    offer: false,
  });
  const demoConsumed = useRef(false);

  useEffect(() => {
    if (!client || hydrated) return;
    const urlDemo = explicitDemoInUrl() || consumePendingDemo();
    const emptyWanted = wantsEmptyCampaign();
    if (urlDemo && !emptyWanted) {
      demoConsumed.current = true;
      const d = demoIntake(locale);
      clearPendingDemo();
      clearEmptyCampaign();
      saveDraft({ intake: d, step: 2, phase: "wizard" });
      setIntake(d);
      setStep(2);
      setCustom({
        audience: true,
        problem: true,
        advantage: true,
        goal: true,
        offer: false,
      });
      setPhase("wizard");
    } else {
      const d = loadDraft();
      const skipDemo =
        emptyWanted ||
        (locale === "ar" && isPediatricDemo(d.intake)) ||
        (emptyWanted && isPediatricDemo(d.intake));
      if (skipDemo) {
        const blank = emptyIntake();
        saveDraft({ intake: blank, step: 1, phase: "wizard" });
        setIntake(blank);
        setStep(1);
        setCustom({ audience: false, problem: false, advantage: false, goal: false, offer: false });
        setPhase("wizard");
      } else {
        const intake = isPediatricDemo(d.intake) ? relocalizePediatricIntake(d.intake, locale) : d.intake;
        setIntake(intake);
        setStep(d.step);
        setCustom({
          audience: intake.audienceCustom,
          problem: intake.problemCustom,
          advantage: intake.advantageCustom,
          goal: intake.goalCustom,
          offer: intake.offerCustom,
        });
        const resume = d.phase === "agents" || d.phase === "interview" ? d.phase : "wizard";
        if (resume === "agents" && d.packId) {
          const existing = getCampaign(d.packId);
          if (existing) {
            setPack(existing);
            setAgentStatus(existing.agentStatus);
            setPhase("agents");
          } else {
            setPhase("wizard");
          }
        } else {
          setPhase(resume);
        }
      }
    }
    setHydrated(true);
  }, [client, hydrated, locale]);

  useEffect(() => {
    if (!hydrated || !client) return;
    if (typeof window !== "undefined" && window.location.search.includes("demo=")) {
      router.replace(stripDemoParamsPreserveLang(locale));
    }
  }, [hydrated, client, router, locale]);

  useEffect(() => {
    if (!hydrated) return;
    saveDraft({ intake, step, phase, packId: pack?.id });
    if (intake.businessName.trim() && !isPediatricDemo(intake)) {
      clearEmptyCampaign();
    }
  }, [intake, step, phase, pack?.id, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    if (isPediatricDemo(intake)) {
      setIntake((prev) => relocalizePediatricIntake(prev, locale));
    }
  }, [locale, hydrated]);

  useEffect(() => {
    if (phase !== "agents" && phase !== "interview") return;
    document.getElementById("studio")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [phase]);

  const patch = (p: Partial<Intake>) => setIntake((s) => ({ ...s, ...p }));

  const reviewRows = useMemo(
    () => [
      [t("biz.name"), intake.businessName],
      [t("step.1"), TYPE_OPTIONS.find((o) => o.id === intake.type)?.label[locale] ?? intake.type],
      [t("details.depth"), DEPTH_OPTIONS.find((o) => o.id === intake.depth)?.label[locale] ?? intake.depth],
      [t("biz.category"), intake.category],
      [t("biz.description"), intake.description],
      [t("details.audience"), resolveChipLabel(intake.audience, AUDIENCE_CHIPS, locale)],
      [t("details.problem"), resolveChipLabel(intake.biggestProblem, PROBLEM_CHIPS, locale)],
      [t("details.advantage"), resolveChipLabel(intake.uniqueAdvantage, ADVANTAGE_CHIPS, locale)],
      [t("details.goal"), resolveChipLabel(intake.mainGoal, GOAL_CHIPS, locale)],
      [t("details.offer"), resolveChipLabel(intake.offer, OFFER_CHIPS, locale)],
      [t("biz.location"), intake.location],
      [t("biz.website"), intake.website],
      [t("biz.whatsapp"), intake.whatsapp],
    ],
    [intake, locale, t],
  );

  function applyDemo() {
    clearEmptyCampaign();
    const d = applyPediatricDemoDraft(locale);
    installDemoPack();
    clearPendingDemo();
    setIntake(d);
    setCustom({
      audience: true,
      problem: true,
      advantage: true,
      goal: true,
      offer: false,
    });
    setStep(2);
    setPhase("wizard");
    setPack(null);
    setAgentStatus(idleStatus());
  }

  function loadDemo() {
    applyDemo();
  }

  function newCampaign() {
    markEmptyCampaign();
    setIntake(emptyIntake());
    setStep(1);
    setPhase("wizard");
    setPack(null);
    setAgentStatus(idleStatus());
    setCustom({ audience: false, problem: false, advantage: false, goal: false, offer: false });
  }

  function onStatus(id: AgentId, status: AgentStatus) {
    setAgentStatus((s) => ({ ...s, [id]: status }));
  }

  async function startBuild() {
    if (!wizardReady(intake)) return;
    // Pediatric demo has no published budget/CAC — skip the CMO interview; unknowns stay blank.
    if (cmoFieldsMissing(intake) && !isPediatricDemo(intake)) {
      setPhase("interview");
      return;
    }
    await runAgents();
  }

  async function runAgents() {
    setPhase("agents");
    setRunning(true);
    setAgentStatus({
      intake: "running",
      diagnostic: "idle",
      strategic: "blocked",
      media: "blocked",
      optimizer: "blocked",
    });
    const { report, diagnosis } = await runIntakeAndDiagnosis(intake, onStatus);
    const p = assemblePack(intake, {
      report,
      diagnosis,
      agentStatus: {
        intake: "complete",
        diagnostic: "needs_approval",
        strategic: "blocked",
        media: "blocked",
        optimizer: "blocked",
      },
    });
    upsertCampaign(p);
    setPack(p);
    setAgentStatus(p.agentStatus);
    setRunning(false);
  }

  async function advanceHitl() {
    if (!pack) return;
    setRunning(true);
    if (agentStatus.diagnostic === "needs_approval") {
      const built = await runStrategic(intake, pack.diagnosis, onStatus);
      const next = assemblePack(intake, {
        report: pack.intakeReport,
        diagnosis: { ...pack.diagnosis, approved: true, approvedAt: new Date().toISOString() },
        variants: built.variants,
        strategy: built.strategy,
        id: pack.id,
        agentStatus: {
          intake: "complete",
          diagnostic: "approved",
          strategic: "needs_approval",
          media: "blocked",
          optimizer: "blocked",
        },
      });
      upsertCampaign(next);
      setPack(next);
      setAgentStatus(next.agentStatus);
    } else if (agentStatus.strategic === "needs_approval") {
      const built = await runMedia(intake, onStatus);
      const next = assemblePack(intake, {
        report: pack.intakeReport,
        diagnosis: pack.diagnosis,
        variants: pack.variants,
        strategy: pack.strategy,
        media: built.media,
        id: pack.id,
        agentStatus: {
          intake: "complete",
          diagnostic: "approved",
          strategic: "approved",
          media: "needs_approval",
          optimizer: "blocked",
        },
      });
      upsertCampaign(next);
      setPack(next);
      setAgentStatus(next.agentStatus);
    } else if (agentStatus.media === "needs_approval") {
      const built = await runOptimizerStage(intake, pack.media, onStatus);
      const next = assemblePack(intake, {
        report: pack.intakeReport,
        diagnosis: pack.diagnosis,
        variants: pack.variants,
        strategy: pack.strategy,
        media: pack.media,
        optimizer: built.optimizer,
        id: pack.id,
        agentStatus: {
          intake: "complete",
          diagnostic: "approved",
          strategic: "approved",
          media: "approved",
          optimizer: "complete",
        },
      });
      const saved = { ...next, saved: true };
      upsertCampaign(saved);
      setPack(saved);
      setAgentStatus(saved.agentStatus);
      setRunning(false);
      saveDraft({ intake, step: 4, phase: "wizard", packId: saved.id });
      router.push(withLang(`/campaigns/${saved.id}`, locale));
      return;
    }
    setRunning(false);
  }

  return (
    <div className={embedded ? "mx-auto w-full max-w-3xl px-4 py-6 sm:py-8" : "mx-auto w-full max-w-3xl px-4 py-8 sm:py-12"}>
      {!embedded && <DepartmentRail />}
      {embedded ? (
        <div className="mb-6 flex items-center justify-center">
          <div className="flex items-center rounded-full border border-white/10 bg-black/50 p-0.5">
            <button
              type="button"
              data-demo="pediatric"
              onClick={loadDemo}
              className={cn(
                "rounded-full px-4 py-1.5 text-xs font-black transition-colors",
                isPediatricDemo(intake)
                  ? "bg-omni-yellow text-black"
                  : "text-zinc-300 hover:text-white",
              )}
            >
              {t("cta.demoShort")}
            </button>
            <button
              type="button"
              onClick={newCampaign}
              className={cn(
                "rounded-full px-4 py-1.5 text-xs font-semibold transition-colors",
                !isPediatricDemo(intake)
                  ? "bg-omni-yellow text-black"
                  : "text-zinc-300 hover:text-white",
              )}
            >
              {t("cta.new")}
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
          <Button
            type="button"
            size="lg"
            data-demo="pediatric"
            className="h-auto max-w-full whitespace-normal py-2 text-start font-black"
            onClick={loadDemo}
          >
            {DEMO_LABEL[locale]}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={newCampaign}>
            {t("cta.new")}
          </Button>
        </div>
      )}

      {phase === "wizard" && (
        <>
          <Stepper step={step} onStep={(n) => setStep(n)} />
          {!embedded && <ConquerHeadline subtitle={step === 4 ? t("hero.review") : undefined} />}
          {embedded && step === 4 && (
            <p className="mb-6 text-center text-sm font-medium text-zinc-400">{t("hero.review")}</p>
          )}

          {step === 1 && (
            <section>
              <h2 className="mb-2 text-center text-lg font-bold">{t("type.prompt")}</h2>
              <p className="mb-6 text-center text-sm text-zinc-400">{t("type.hint")}</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => patch({ type: opt.id as Intake["type"] })}
                    className={`rounded-2xl border p-6 text-start text-xl font-black transition-all ${
                      intake.type === opt.id
                        ? "border-omni-yellow bg-omni-yellow text-black shadow-[0_12px_40px_rgba(255,26,26,0.45)]"
                        : "border-white/10 bg-omni-card text-white hover:border-omni-yellow/50 hover:shadow-[0_0_24px_rgba(255,229,0,0.12)]"
                    }`}
                  >
                    {opt.label[locale]}
                  </button>
                ))}
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="rounded-2xl border border-white/10 bg-omni-card p-5 sm:p-8">
              <Field label={t("biz.name")}>
                <Input
                  value={intake.businessName}
                  placeholder={t("biz.namePh")}
                  onChange={(e) => patch({ businessName: e.target.value })}
                />
              </Field>
              <Field label={t("biz.category")}>
                <Input
                  value={intake.category}
                  placeholder={t("biz.categoryPh")}
                  onChange={(e) => patch({ category: e.target.value })}
                />
              </Field>
              <Field label={t("biz.description")}>
                <Textarea
                  value={intake.description}
                  placeholder={t("biz.descPh")}
                  onChange={(e) => patch({ description: e.target.value })}
                />
              </Field>
              <Field label={t("biz.location")}>
                <Input
                  value={intake.location}
                  placeholder={t("biz.locationPh")}
                  onChange={(e) => patch({ location: e.target.value })}
                />
              </Field>
              <Field label={t("biz.website")}>
                <Input
                  value={intake.website}
                  placeholder="https://"
                  onChange={(e) => patch({ website: e.target.value })}
                />
              </Field>
              <Field label={t("biz.whatsapp")}>
                <Input
                  value={intake.whatsapp ?? ""}
                  placeholder={t("biz.whatsappPh")}
                  onChange={(e) => patch({ whatsapp: e.target.value })}
                  inputMode="tel"
                />
              </Field>
            </section>
          )}

          {step === 3 && (
            <section className="space-y-8 rounded-2xl border border-white/10 bg-omni-card p-5 sm:p-8">
              <div>
                <Label>{t("details.depth")}</Label>
                <ChipGroup
                  options={DEPTH_OPTIONS}
                  value={intake.depth}
                  onChange={(_, opt) => patch({ depth: opt.id as Intake["depth"] })}
                />
              </div>
              <div>
                <Label>{t("details.audience")}</Label>
                <ChipGroup
                  options={AUDIENCE_CHIPS}
                  value={intake.audience}
                  showCustomField={custom.audience}
                  onChange={(_, opt) => {
                    if (opt.custom) {
                      setCustom((c) => ({ ...c, audience: true }));
                      patch({ audienceCustom: true });
                    } else {
                      setCustom((c) => ({ ...c, audience: false }));
                      patch({ audience: opt.id, audienceCustom: false });
                    }
                  }}
                  customValue={intake.audience}
                  onCustom={(v) => patch({ audience: v, audienceCustom: true })}
                />
              </div>
              <div>
                <Label>{t("details.problem")}</Label>
                <ChipGroup
                  options={PROBLEM_CHIPS}
                  value={intake.biggestProblem}
                  showCustomField={custom.problem}
                  onChange={(_, opt) => {
                    if (opt.custom) setCustom((c) => ({ ...c, problem: true }));
                    else {
                      setCustom((c) => ({ ...c, problem: false }));
                      patch({ biggestProblem: opt.id, problemCustom: false });
                    }
                  }}
                  customValue={intake.biggestProblem}
                  onCustom={(v) => patch({ biggestProblem: v, problemCustom: true })}
                />
              </div>
              <div>
                <Label>{t("details.advantage")}</Label>
                <ChipGroup
                  options={ADVANTAGE_CHIPS}
                  value={intake.uniqueAdvantage}
                  showCustomField={custom.advantage}
                  onChange={(_, opt) => {
                    if (opt.custom) setCustom((c) => ({ ...c, advantage: true }));
                    else {
                      setCustom((c) => ({ ...c, advantage: false }));
                      patch({ uniqueAdvantage: opt.id, advantageCustom: false });
                    }
                  }}
                  customValue={intake.uniqueAdvantage}
                  onCustom={(v) => patch({ uniqueAdvantage: v, advantageCustom: true })}
                />
              </div>
              <div>
                <Label>{t("details.goal")}</Label>
                <ChipGroup
                  options={GOAL_CHIPS}
                  value={intake.mainGoal}
                  showCustomField={custom.goal}
                  onChange={(_, opt) => {
                    if (opt.custom) setCustom((c) => ({ ...c, goal: true }));
                    else {
                      setCustom((c) => ({ ...c, goal: false }));
                      patch({ mainGoal: opt.id, goalCustom: false });
                    }
                  }}
                  customValue={intake.mainGoal}
                  onCustom={(v) => patch({ mainGoal: v, goalCustom: true })}
                />
              </div>
              <div>
                <Label>{t("details.offer")}</Label>
                <p className="mb-2 text-xs text-zinc-500">{t("details.offerHint")}</p>
                <ChipGroup
                  options={OFFER_CHIPS}
                  value={intake.offer}
                  showCustomField={custom.offer}
                  onChange={(_, opt) => {
                    if (opt.custom) setCustom((c) => ({ ...c, offer: true }));
                    else {
                      setCustom((c) => ({ ...c, offer: false }));
                      patch({ offer: opt.id, offerCustom: false });
                    }
                  }}
                  customValue={intake.offer}
                  onCustom={(v) => patch({ offer: v, offerCustom: true })}
                />
              </div>
            </section>
          )}

          {step === 4 && (
            <section>
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-omni-card">
                <div className="border-b border-white/10 px-5 py-4 text-center text-sm font-bold text-omni-yellow">
                  {t("review.heading")}
                </div>
                <dl>
                  {reviewRows.map(([k, v]) => (
                    <div
                      key={k}
                      className="grid grid-cols-1 border-b border-white/5 px-5 py-3 sm:grid-cols-[200px_1fr]"
                    >
                      <dt className="text-sm text-zinc-400">{k}</dt>
                      <dd className="text-sm font-medium text-white">
                        {v?.trim() ? v : <span className="text-zinc-600">{t("empty.dash")}</span>}
                      </dd>
                    </div>
                  ))}
                </dl>
                <div className="px-5 py-5">
                  <h3 className="mb-2 font-bold text-white">{t("review.competitors")}</h3>
                  <p className="mb-3 text-sm text-zinc-400">{t("review.competitorsHint")}</p>
                  <ul className="mb-3 space-y-2">
                    {intake.competitors.map((c) => (
                      <li
                        key={c.id}
                        className="flex items-start justify-between gap-3 rounded-xl border border-white/10 p-3"
                      >
                        <div>
                          <p className="font-semibold">{c.name}</p>
                          {c.url && <p className="text-xs text-zinc-500">{c.url}</p>}
                          {c.notes && <p className="text-sm text-zinc-300">{c.notes}</p>}
                        </div>
                        <button
                          type="button"
                          className="text-zinc-500 hover:text-omni-red"
                          onClick={() =>
                            patch({ competitors: intake.competitors.filter((x) => x.id !== c.id) })
                          }
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={intake.competitors.length >= MAX_COMPETITORS}
                    onClick={() => {
                      setCompDraft({ id: uid("comp"), name: "", url: "", notes: "" });
                      setCompOpen(true);
                    }}
                  >
                    <Plus className="size-4" />
                    {t("review.addCompetitor")}
                  </Button>
                </div>
              </div>

              <Button
                type="button"
                size="lg"
                className="mt-6 w-full text-base font-black shadow-[0_12px_40px_rgba(255,26,26,0.55)]"
                disabled={!wizardReady(intake) || running}
                onClick={startBuild}
              >
                <WandSparkles className="size-5" />
                {t("cta.build")}
              </Button>
              {!wizardReady(intake) && (
                <p className="mt-2 text-center text-xs text-omni-red">
                  {t("wizard.missing")}
                </p>
              )}
            </section>
          )}

          <div className="mt-8 flex justify-center gap-6">
            {step > 1 && (
              <button type="button" className="text-sm text-zinc-400 hover:text-white" onClick={() => setStep((s) => (s - 1) as WizardStep)}>
                {t("cta.back")}
              </button>
            )}
            {step < 4 && (
              <Button type="button" onClick={() => setStep((s) => (s + 1) as WizardStep)}>
                {t("cta.next")}
              </Button>
            )}
          </div>
        </>
      )}

      {phase === "interview" && (
        <section className="rounded-2xl border border-white/10 bg-omni-card p-5 sm:p-8">
          <h2 className="mb-2 text-2xl font-black">{t("interview.title")}</h2>
          <p className="mb-6 text-sm text-zinc-400">{t("interview.lead")}</p>
          <Field label={t("interview.model")}>
            <Textarea value={intake.businessModel} onChange={(e) => patch({ businessModel: e.target.value })} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("interview.aov")}>
              <Input value={intake.avgOrderValue} onChange={(e) => patch({ avgOrderValue: e.target.value })} />
            </Field>
            <Field label={t("interview.margin")}>
              <Input value={intake.marginPercent} onChange={(e) => patch({ marginPercent: e.target.value })} />
            </Field>
            <Field label={t("interview.cac")}>
              <Input value={intake.targetCac} onChange={(e) => patch({ targetCac: e.target.value })} />
            </Field>
            <Field label={t("interview.budget")}>
              <Input value={intake.monthlyBudget} onChange={(e) => patch({ monthlyBudget: e.target.value })} />
            </Field>
          </div>
          <Field label={t("interview.past")}>
            <Textarea value={intake.pastAds} onChange={(e) => patch({ pastAds: e.target.value })} />
          </Field>
          <Field label={t("interview.results")}>
            <Textarea value={intake.pastResults} onChange={(e) => patch({ pastResults: e.target.value })} />
          </Field>
          <Field label={t("interview.failed")}>
            <Textarea value={intake.whatFailed} onChange={(e) => patch({ whatFailed: e.target.value })} />
          </Field>
          <div className="mt-6 flex flex-col gap-3">
            <Button type="button" size="lg" onClick={runAgents} disabled={running}>
              {t("cta.next")}
            </Button>
            <button type="button" className="text-sm text-zinc-400 hover:text-white" onClick={runAgents}>
              {t("interview.skip")}
            </button>
            <button type="button" className="text-sm text-zinc-500" onClick={() => setPhase("wizard")}>
              {t("cta.back")}
            </button>
          </div>
        </section>
      )}

      {phase === "agents" && (
        <AgentsPanel
          pack={pack}
          agentStatus={agentStatus}
          running={running}
          onApprove={advanceHitl}
          onBack={() => {
            setPhase("wizard");
            setStep(4);
          }}
        />
      )}

      <Dialog open={compOpen} onOpenChange={setCompOpen}>
        <DialogContent>
          <DialogTitle>{t("review.addCompetitor")}</DialogTitle>
          <div className="mt-4 space-y-3">
            <Field label={t("review.compName")}>
              <Input
                value={compDraft.name}
                onChange={(e) => setCompDraft((c) => ({ ...c, name: e.target.value }))}
              />
            </Field>
            <Field label={t("review.compUrl")}>
              <Input
                value={compDraft.url}
                onChange={(e) => setCompDraft((c) => ({ ...c, url: e.target.value }))}
              />
            </Field>
            <Field label={t("review.compNotes")}>
              <Textarea
                value={compDraft.notes}
                onChange={(e) => setCompDraft((c) => ({ ...c, notes: e.target.value }))}
              />
            </Field>
            <Button
              type="button"
              className="w-full"
              disabled={!compDraft.name.trim() || intake.competitors.length >= MAX_COMPETITORS}
              onClick={() => {
                patch({ competitors: [...intake.competitors, compDraft] });
                setCompOpen(false);
              }}
            >
              {t("review.saveComp")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const AGENT_KEYS: { id: AgentId; key: "agents.intake" | "agents.diagnostic" | "agents.strategic" | "agents.media" | "agents.optimizer" }[] = [
  { id: "intake", key: "agents.intake" },
  { id: "diagnostic", key: "agents.diagnostic" },
  { id: "strategic", key: "agents.strategic" },
  { id: "media", key: "agents.media" },
  { id: "optimizer", key: "agents.optimizer" },
];

function AgentsPanel({
  pack,
  agentStatus,
  running,
  onApprove,
  onBack,
}: {
  pack: CampaignPack | null;
  agentStatus: Record<AgentId, AgentStatus>;
  running: boolean;
  onApprove: () => void;
  onBack: () => void;
}) {
  const { t, locale } = useI18n();
  return (
    <section>
      <h2 className="mb-2 text-center text-2xl font-black">{t("agents.title")}</h2>
      <p className="mb-6 text-center text-sm text-zinc-400">{t("agents.hitl")}</p>
      <ul className="mb-8 space-y-2">
        {AGENT_KEYS.map((a, i) => (
          <li
            key={a.id}
            className="flex items-center justify-between rounded-xl border border-white/10 bg-omni-card px-4 py-3"
          >
            <span className="text-sm font-semibold">
              {i + 1}. {t(a.key)}
            </span>
            <StatusPill status={agentStatus[a.id]} />
          </li>
        ))}
      </ul>

      {pack && (
        <div className="rounded-2xl border border-omni-yellow/30 bg-omni-card p-5">
          <p className="mb-4 text-sm text-zinc-300">{pack.diagnosis.summary[locale]}</p>
          <div className="space-y-3">
            {pack.diagnosis.hypotheses.map((h, i) => (
              <article key={i} className="rounded-xl border border-white/10 p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-omni-red/20 px-2 py-0.5 text-xs font-bold text-omni-red">
                    {AREA_LABEL[h.area][locale]}
                  </span>
                  <span className="text-xs text-zinc-500">{h.confidence}</span>
                </div>
                <p className="font-semibold text-white">{h.finding[locale]}</p>
                <p className="mt-1 text-sm text-zinc-400">{h.evidence[locale]}</p>
                <p className="mt-2 text-sm text-omni-yellow">{h.recommendation[locale]}</p>
              </article>
            ))}
          </div>
          {pack.intakeReport.missing.length > 0 && (
            <div className="mt-4 rounded-xl border border-omni-yellow/30 bg-omni-yellow/5 p-3 text-sm text-zinc-200">
              {pack.intakeReport.missing.map((m) => (
                <p key={m.field}>
                  <strong>{m.label[locale]}:</strong> {m.reason[locale]}
                </p>
              ))}
            </div>
          )}
          {pack.intakeReport.inconsistencies.length > 0 && (
            <div className="mt-3 rounded-xl border border-omni-red/40 bg-omni-red/10 p-3 text-sm text-red-100">
              {pack.intakeReport.inconsistencies.map((inc, i) => (
                <p key={i}>
                  <strong>{inc.issue[locale]}:</strong> {inc.detail[locale]}
                </p>
              ))}
            </div>
          )}
          <Button type="button" size="lg" className="mt-6 w-full" disabled={running} onClick={onApprove}>
            {agentStatus.diagnostic === "needs_approval" ? t("cta.approve") : t("cta.continueStage")}
          </Button>
          <button type="button" className="mt-3 w-full text-sm text-zinc-400" onClick={onBack}>
            {t("cta.reject")}
          </button>
        </div>
      )}
    </section>
  );
}

const STATUS_I18N: Record<AgentStatus, "status.idle" | "status.running" | "status.blocked" | "status.needs_approval" | "status.approved" | "status.complete" | "status.refused"> = {
  idle: "status.idle",
  running: "status.running",
  blocked: "status.blocked",
  needs_approval: "status.needs_approval",
  approved: "status.approved",
  complete: "status.complete",
  refused: "status.refused",
};

function StatusPill({ status }: { status: AgentStatus }) {
  const { t } = useI18n();
  const key = STATUS_I18N[status];
  const colors: Record<AgentStatus, string> = {
    idle: "bg-white/10 text-zinc-400",
    running: "bg-omni-yellow/20 text-omni-yellow animate-pulse",
    blocked: "bg-white/5 text-zinc-600",
    needs_approval: "bg-omni-red/20 text-omni-red",
    approved: "bg-omni-yellow text-black",
    complete: "bg-omni-yellow text-black",
    refused: "bg-omni-red text-white",
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${colors[status]}`}>
      {t(key)}
    </span>
  );
}
