"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, WandSparkles } from "lucide-react";
import type { AgentId, AgentStatus, CampaignPack, Competitor, Intake, WizardStep } from "@/lib/types";
import { demoIntake, DEMO_LABEL, consumePendingDemo, clearPendingDemo, applyPediatricDemoDraft, isPediatricDemo, relocalizePediatricIntake, canonicalDoctorName } from "@/lib/demo";
import { installDemoPack } from "@/lib/active-pack";
import { cmoFieldsMissing, emptyIntake, wizardMissingFields, wizardReady } from "@/lib/engine/validate";
import { assemblePack, idleStatus, overlayPackAgency, runIntakeAndDiagnosis, runMedia, runOptimizerStage, runStrategic } from "@/lib/engine/run";
import { loadDraft, saveDraft, getCampaign, INGEST_APPLIED_EVENT } from "@/lib/storage";
import { syncCampaign } from "@/lib/supabase";
import { uid } from "@/lib/utils";
import { MAX_COMPETITORS } from "@/lib/factory-formats";
import { AREA_LABEL } from "@/lib/i18n";
import { markEmptyCampaign, wantsEmptyCampaign, clearEmptyCampaign, explicitDemoInUrl, applyEmptyCampaignHydrate, EMPTY_CAMPAIGN_EVENT, releaseEmptyIfTypedName, hasDemoSession, markDemoSession } from "@/lib/empty-campaign";
import { isBlockedEmptySessionName, intakeIsClinicDemo } from "@/lib/clinic-leak";
import { stripDemoParamsPreserveLang, withLang } from "@/lib/locale-url";
import {
  ADVANTAGE_CHIPS,
  CHANNEL_CHIPS,
  DEPTH_OPTIONS,
  OFFER_CHIPS,
  TYPE_OPTIONS,
  audienceChipsFor,
  formatChipField,
  parseChipField,
  resolveChipLabel,
  toggleChipValue,
} from "@/lib/chips";
import {
  applyOperatingModel,
  goalChipsFor,
  isFreeService,
  offerChipsFor,
  problemChipsFor,
  setPlanChannel,
  visiblePlanChannels,
} from "@/lib/operating-model";
import { showsKupaFields } from "@/lib/vertical";
import { MediaAssetUploader } from "@/components/media-asset-uploader";
import { DocumentIngest } from "@/components/document-ingest";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ChipGroup } from "@/components/chip-group";
import { ConquerHeadline, Stepper } from "@/components/stepper";
import { DepartmentRail } from "@/components/department-shell";
import { useI18n } from "@/components/i18n-provider";
import { CoachPanel } from "@/components/coach-panel";
import { coachIntake } from "@/lib/engine/coach";
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
    const emptyWanted = wantsEmptyCampaign();
    const urlDemo = !emptyWanted && (explicitDemoInUrl() || consumePendingDemo());
    if (urlDemo) {
      demoConsumed.current = true;
      markDemoSession();
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
        goal: false,
        offer: false,
      });
      setPhase("wizard");
    } else if (emptyWanted || (intakeIsClinicDemo(loadDraft().intake) && !hasDemoSession())) {
      const blankState = applyEmptyCampaignHydrate();
      setIntake(blankState.intake);
      setStep(1);
      setCustom({ audience: false, problem: false, advantage: false, goal: false, offer: false });
      setPhase("wizard");
      setPack(null);
      setAgentStatus(idleStatus());
    } else {
      const d = loadDraft();
      const named = String(d.intake?.businessName ?? "").trim();
      const intake = !named
        ? d.intake
        : isPediatricDemo(d.intake)
          ? relocalizePediatricIntake(d.intake, locale)
          : { ...d.intake, businessName: canonicalDoctorName(d.intake.businessName) };
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
    setHydrated(true);
  }, [client, hydrated, locale]);

  useEffect(() => {
    if (!client) return;
    const onEmpty = () => {
      const blankState = applyEmptyCampaignHydrate();
      setIntake(blankState.intake);
      setStep(1);
      setCustom({ audience: false, problem: false, advantage: false, goal: false, offer: false });
      setPhase("wizard");
      setPack(null);
      setAgentStatus(idleStatus());
    };
    window.addEventListener(EMPTY_CAMPAIGN_EVENT, onEmpty);
    return () => window.removeEventListener(EMPTY_CAMPAIGN_EVENT, onEmpty);
  }, [client]);

  useEffect(() => {
    if (!hydrated || !client) return;
    if (typeof window !== "undefined" && window.location.search.includes("demo=")) {
      router.replace(stripDemoParamsPreserveLang(locale));
    }
  }, [hydrated, client, router, locale]);

  useEffect(() => {
    if (!client) return;
    const onApplied = () => {
      const d = loadDraft();
      setIntake(d.intake);
      setStep(d.step);
      setCustom({
        audience: d.intake.audienceCustom,
        problem: d.intake.problemCustom,
        advantage: d.intake.advantageCustom,
        goal: d.intake.goalCustom,
        offer: d.intake.offerCustom,
      });
      const resume = d.phase === "interview" || d.phase === "agents" ? d.phase : "wizard";
      if (resume === "wizard") {
        setPhase("wizard");
        setPack(null);
        setAgentStatus(idleStatus());
      } else if (resume === "agents" && d.packId) {
        const existing = getCampaign(d.packId);
        if (existing) {
          setPack(existing);
          setAgentStatus(existing.agentStatus);
          setPhase("agents");
        } else {
          setPhase("wizard");
          setPack(null);
          setAgentStatus(idleStatus());
        }
      } else {
        setPhase(resume);
      }
    };
    window.addEventListener(INGEST_APPLIED_EVENT, onApplied);
    return () => window.removeEventListener(INGEST_APPLIED_EVENT, onApplied);
  }, [client]);

  useEffect(() => {
    if (!hydrated) return;
    if (wantsEmptyCampaign()) {
      if (releaseEmptyIfTypedName(intake.businessName)) {
        saveDraft({ intake, step, phase, packId: pack?.id, coach: coachIntake(intake) });
      } else {
        saveDraft({ intake: emptyIntake(), step: 1, phase: "wizard" });
      }
      return;
    }
    saveDraft({ intake, step, phase, packId: pack?.id, coach: coachIntake(intake) });
  }, [intake, step, phase, pack?.id, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    if (wantsEmptyCampaign()) return;
    if (!intake.businessName.trim()) return;
    if (isPediatricDemo(intake)) {
      setIntake((prev) => relocalizePediatricIntake(prev, locale));
    }
  }, [locale, hydrated]);

  useEffect(() => {
    if (phase !== "agents" && phase !== "interview") return;
    document.getElementById("studio")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [phase]);

  useEffect(() => {
    if (!hydrated || phase !== "wizard" || step !== 4) return;
    if (wantsEmptyCampaign()) return;
    if (!intake.businessName.trim() || isBlockedEmptySessionName(intake.businessName)) return;
    if (isFreeService(intake) || intake.channelNotes.trim()) return;
    setIntake((s) => (s.channelNotes.trim() || isFreeService(s) ? s : { ...s, channelNotes: "facebook, instagram" }));
  }, [hydrated, phase, step, intake.operatingModel, intake.channelNotes, intake.businessName]);

  const patch = (p: Partial<Intake>) => setIntake((s) => ({ ...s, ...p }));

  const coachReport = useMemo(() => coachIntake(intake), [intake]);

  function applyCoach(field: string, value: string) {
    const extra: Partial<Intake> = {};
    if (field === "audience") extra.audienceCustom = true;
    if (field === "biggestProblem") extra.problemCustom = true;
    if (field === "uniqueAdvantage") extra.advantageCustom = true;
    if (field === "mainGoal") extra.goalCustom = true;
    if (field === "offer") extra.offerCustom = true;
    setCustom((c) => ({
      ...c,
      audience: field === "audience" ? true : c.audience,
      problem: field === "biggestProblem" ? true : c.problem,
      advantage: field === "uniqueAdvantage" ? true : c.advantage,
      goal: field === "mainGoal" ? true : c.goal,
      offer: field === "offer" ? true : c.offer,
    }));
    patch({ [field]: value, ...extra } as Partial<Intake>);
  }


  function applyIngest(next: Intake) {
    setIntake(next);
    setCustom({
      audience: next.audienceCustom,
      problem: next.problemCustom,
      advantage: next.advantageCustom,
      goal: next.goalCustom,
      offer: next.offerCustom,
    });
  }

  const reviewRows = useMemo(
    () => [
      [t("biz.name"), intake.businessName],
      [t("step.1"), TYPE_OPTIONS.find((o) => o.id === intake.type)?.label[locale] ?? intake.type],
      [t("review.model"), isFreeService(intake) ? t("model.free") : t("model.paid")],
      [t("details.depth"), DEPTH_OPTIONS.find((o) => o.id === intake.depth)?.label[locale] ?? intake.depth],
      [t("biz.category"), intake.category],
      [t("biz.description"), intake.description],
      [t("details.audience"), resolveChipLabel(intake.audience, audienceChipsFor(intake), locale)],
      [t("details.problem"), resolveChipLabel(intake.biggestProblem, problemChipsFor(intake), locale)],
      [t("details.advantage"), resolveChipLabel(intake.uniqueAdvantage, ADVANTAGE_CHIPS, locale)],
      [t("details.goal"), resolveChipLabel(intake.mainGoal, goalChipsFor(intake), locale)],
      [t("details.offer"), resolveChipLabel(intake.offer, OFFER_CHIPS, locale)],
      [t("review.assets"), String((intake.mediaAssets ?? []).length)],
      [t("ingest.docs"), String((intake.ingestedDocs ?? []).length)],
      [t("biz.location"), intake.location],
      [t("biz.hours"), intake.clinicHours],
      [t("details.kupaFile"), intake.kupaFileBy],
      [t("details.kupaMember"), intake.kupaMemberFrom],
      [t("plan.channels"), visiblePlanChannels(intake).join(", ")],
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
      goal: false,
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
    const blank = emptyIntake();
    setIntake(blank);
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
    void syncCampaign(p);
    setPack(p);
    setAgentStatus(p.agentStatus);
    setRunning(false);
  }

  async function advanceHitl() {
    if (!pack) return;
    setRunning(true);
    if (agentStatus.diagnostic === "needs_approval") {
      const built = await runStrategic(intake, pack.diagnosis, onStatus);
      const next = await overlayPackAgency(assemblePack(intake, {
        report: pack.intakeReport,
        diagnosis: { ...pack.diagnosis, approved: true, approvedAt: new Date().toISOString() },
        variants: built.variants,
        strategy: built.strategy,
        angles: built.angles,
        id: pack.id,
        agentStatus: {
          intake: "complete",
          diagnostic: "approved",
          strategic: "needs_approval",
          media: "blocked",
          optimizer: "blocked",
        },
      }));
      void syncCampaign(next);
      setPack(next);
      setAgentStatus(next.agentStatus);
    } else if (agentStatus.strategic === "needs_approval") {
      const built = await runMedia(intake, onStatus);
      const next = await overlayPackAgency(assemblePack(intake, {
        report: pack.intakeReport,
        diagnosis: pack.diagnosis,
        variants: pack.variants,
        strategy: pack.strategy,
        media: built.media,
        angles: pack.angles,
        id: pack.id,
        agentStatus: {
          intake: "complete",
          diagnostic: "approved",
          strategic: "approved",
          media: "needs_approval",
          optimizer: "blocked",
        },
      }));
      void syncCampaign(next);
      setPack(next);
      setAgentStatus(next.agentStatus);
    } else if (agentStatus.media === "needs_approval") {
      const built = await runOptimizerStage(intake, pack.media, onStatus);
      const next = await overlayPackAgency(assemblePack(intake, {
        report: pack.intakeReport,
        diagnosis: pack.diagnosis,
        variants: pack.variants,
        strategy: pack.strategy,
        media: pack.media,
        optimizer: built.optimizer,
        angles: pack.angles,
        id: pack.id,
        agentStatus: {
          intake: "complete",
          diagnostic: "approved",
          strategic: "approved",
          media: "approved",
          optimizer: "complete",
        },
      }));
      const saved = { ...next, saved: true };
      void syncCampaign(saved);
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
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button
              type="button"
              size="lg"
              data-demo="pediatric"
              className="h-auto max-w-full whitespace-normal py-2 text-start font-black"
              onClick={loadDemo}
            >
              {DEMO_LABEL[locale]}
            </Button>
            <Button type="button" size="lg" onClick={newCampaign}>
              {t("cta.new")}
            </Button>
          </div>
          <p className="max-w-md text-center text-xs text-muted">{t("cta.newHint")}</p>
        </div>
      ) : (
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button
              type="button"
              size="lg"
              data-demo="pediatric"
              className="h-auto max-w-full whitespace-normal py-2 text-start font-black"
              onClick={loadDemo}
            >
              {DEMO_LABEL[locale]}
            </Button>
            <Button type="button" size="lg" onClick={newCampaign}>
              {t("cta.new")}
            </Button>
          </div>
          <p className="max-w-md text-center text-xs text-muted">{t("cta.newHint")}</p>
        </div>
      )}
      {!intake.businessName.trim() ? (
        <p className="mb-4 max-w-md mx-auto text-center text-xs text-muted">{t("gemini.waitFacts")}</p>
      ) : null}

      {phase === "wizard" && (
        <div className="agency-paper mt-4 rounded-[28px] px-4 py-6 sm:px-7 sm:py-8">
          <Stepper step={step} onStep={(n) => setStep(n)} />
          <CoachPanel report={coachReport} onApply={applyCoach} />
          {step > 1 && (
            <div className="mb-4 flex justify-center">
              <DocumentIngest intake={intake} onApply={applyIngest} variant="compact" />
            </div>
          )}
          {!embedded && <ConquerHeadline subtitle={step === 4 ? t("hero.review") : undefined} />}
          {embedded && step === 4 && (
            <p className="mb-6 text-center text-sm font-medium text-muted">{t("hero.review")}</p>
          )}

          {step === 1 && (
            <section>
              <h2 className="mb-2 text-center text-lg font-bold">{t("type.prompt")}</h2>
              <p className="mb-6 text-center text-sm text-muted">{t("type.hint")}</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => patch({ type: opt.id as Intake["type"] })}
                    className={`rounded-2xl border p-6 text-start text-xl font-black transition-all ${
                      intake.type === opt.id
                        ? "border-omni-yellow bg-navy text-white shadow-[0_12px_32px_rgba(27,42,74,0.12)]"
                        : "border-navy/10 bg-white text-navy hover:border-gold hover:shadow-[0_8px_24px_rgba(27,42,74,0.08)]"
                    }`}
                  >
                    {opt.label[locale]}
                  </button>
                ))}
              </div>
              <h2 className="mb-2 mt-10 text-center text-lg font-bold">{t("model.prompt")}</h2>
              <p className="mb-6 text-center text-sm text-muted">{t("model.hint")}</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {([
                  { id: "paid" as const, title: t("model.paid"), hint: t("model.paidHint") },
                  { id: "free_service" as const, title: t("model.free"), hint: t("model.freeHint") },
                ]).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setIntake((s) => applyOperatingModel(s, opt.id))}
                    className={`rounded-2xl border p-6 text-start transition-all ${
                      (intake.operatingModel ?? "paid") === opt.id
                        ? "border-omni-yellow bg-navy text-white shadow-[0_12px_32px_rgba(27,42,74,0.12)]"
                        : "border-navy/10 bg-white text-navy hover:border-gold hover:shadow-[0_8px_24px_rgba(27,42,74,0.08)]"
                    }`}
                  >
                    <span className="block text-xl font-black">{opt.title}</span>
                    <span className={`mt-2 block text-sm font-medium ${
                      (intake.operatingModel ?? "paid") === opt.id ? "text-black/70" : "text-muted"
                    }`}>{opt.hint}</span>
                  </button>
                ))}
              </div>
              <div className="mt-8">
                <DocumentIngest intake={intake} onApply={applyIngest} variant="primary" />
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="rounded-2xl border border-navy/10 bg-white p-5 sm:p-8">
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
              <Field label={t("biz.hours")}>
                <p className="mb-2 text-xs text-muted">{t("biz.hoursHint")}</p>
                <Textarea
                  value={intake.clinicHours ?? ""}
                  placeholder={t("biz.hoursPh")}
                  onChange={(e) => patch({ clinicHours: e.target.value })}
                />
              </Field>
            </section>
          )}

          {step === 3 && (
            <section className="space-y-8 rounded-2xl border border-navy/10 bg-white p-5 sm:p-8">
              <div>
                <Label>{t("details.depth")}</Label>
                <ChipGroup
                  options={DEPTH_OPTIONS}
                  value={intake.depth}
                  multi={false}
                  onChange={(_, opt) => patch({ depth: opt.id as Intake["depth"] })}
                />
              </div>
              <div>
                <Label>{t("details.audience")}</Label>
                <ChipGroup
                  options={audienceChipsFor(intake)}
                  value={intake.audience}
                  multi
                  showCustomField={custom.audience}
                  onChange={(_, opt) => {
                    const opts = audienceChipsFor(intake);
                    if (opt.custom) {
                      const nextOn = !custom.audience;
                      setCustom((c) => ({ ...c, audience: nextOn }));
                      if (!nextOn) {
                        const { ids } = parseChipField(intake.audience, opts);
                        patch({ audience: formatChipField(ids, ""), audienceCustom: false });
                      } else {
                        patch({ audienceCustom: true });
                      }
                    } else {
                      patch({ audience: toggleChipValue(intake.audience, opt, opts, true), audienceCustom: custom.audience });
                    }
                  }}
                  customValue={parseChipField(intake.audience, audienceChipsFor(intake)).customText}
                  onCustom={(v) => {
                    const { ids } = parseChipField(intake.audience, audienceChipsFor(intake));
                    patch({ audience: formatChipField(ids, v), audienceCustom: true });
                  }}
                />
              </div>
              <div>
                <Label>{t("details.problem")}</Label>
                <ChipGroup
                  options={problemChipsFor(intake)}
                  value={intake.biggestProblem}
                  multi
                  showCustomField={custom.problem}
                  onChange={(_, opt) => {
                    const opts = problemChipsFor(intake);
                    if (opt.custom) {
                      const nextOn = !custom.problem;
                      setCustom((c) => ({ ...c, problem: nextOn }));
                      if (!nextOn) {
                        const { ids } = parseChipField(intake.biggestProblem, opts);
                        patch({ biggestProblem: formatChipField(ids, ""), problemCustom: false });
                      } else {
                        patch({ problemCustom: true });
                      }
                    } else {
                      patch({ biggestProblem: toggleChipValue(intake.biggestProblem, opt, opts, true), problemCustom: custom.problem });
                    }
                  }}
                  customValue={parseChipField(intake.biggestProblem, problemChipsFor(intake)).customText}
                  onCustom={(v) => {
                    const { ids } = parseChipField(intake.biggestProblem, problemChipsFor(intake));
                    patch({ biggestProblem: formatChipField(ids, v), problemCustom: true });
                  }}
                />
              </div>
              <div>
                <Label>{t("details.advantage")}</Label>
                <ChipGroup
                  options={ADVANTAGE_CHIPS}
                  value={intake.uniqueAdvantage}
                  multi
                  showCustomField={custom.advantage}
                  onChange={(_, opt) => {
                    if (opt.custom) {
                      const nextOn = !custom.advantage;
                      setCustom((c) => ({ ...c, advantage: nextOn }));
                      if (!nextOn) {
                        const { ids } = parseChipField(intake.uniqueAdvantage, ADVANTAGE_CHIPS);
                        patch({ uniqueAdvantage: formatChipField(ids, ""), advantageCustom: false });
                      } else {
                        patch({ advantageCustom: true });
                      }
                    } else {
                      patch({ uniqueAdvantage: toggleChipValue(intake.uniqueAdvantage, opt, ADVANTAGE_CHIPS, true), advantageCustom: custom.advantage });
                    }
                  }}
                  customValue={parseChipField(intake.uniqueAdvantage, ADVANTAGE_CHIPS).customText}
                  onCustom={(v) => {
                    const { ids } = parseChipField(intake.uniqueAdvantage, ADVANTAGE_CHIPS);
                    patch({ uniqueAdvantage: formatChipField(ids, v), advantageCustom: true });
                  }}
                />
              </div>
              <div>
                <Label>{t("details.goal")}</Label>
                {isFreeService(intake) && (
                  <p className="mb-2 text-xs text-muted">{t("details.goalFreeHint")}</p>
                )}
                <ChipGroup
                  options={goalChipsFor(intake)}
                  value={intake.mainGoal}
                  multi
                  showCustomField={custom.goal}
                  onChange={(_, opt) => {
                    const opts = goalChipsFor(intake);
                    if (opt.custom) {
                      const nextOn = !custom.goal;
                      setCustom((c) => ({ ...c, goal: nextOn }));
                      if (!nextOn) {
                        const { ids } = parseChipField(intake.mainGoal, opts);
                        patch({ mainGoal: formatChipField(ids, ""), goalCustom: false });
                      } else {
                        patch({ goalCustom: true });
                      }
                    } else {
                      patch({ mainGoal: toggleChipValue(intake.mainGoal, opt, opts, true), goalCustom: custom.goal });
                    }
                  }}
                  customValue={parseChipField(intake.mainGoal, goalChipsFor(intake)).customText}
                  onCustom={(v) => {
                    const { ids } = parseChipField(intake.mainGoal, goalChipsFor(intake));
                    patch({ mainGoal: formatChipField(ids, v), goalCustom: true });
                  }}
                />
              </div>
              <div>
                <Label>{t("details.offer")}</Label>
                <p className="mb-2 text-xs text-muted">
                  {isFreeService(intake) ? t("details.offerLocked") : t("details.offerHint")}
                </p>
                <ChipGroup
                  options={offerChipsFor(intake)}
                  value={intake.offer}
                  multi
                  showCustomField={isFreeService(intake) ? false : custom.offer}
                  onChange={(_, opt) => {
                    if (isFreeService(intake)) {
                      patch({ offer: "no_offer", offerCustom: false });
                      return;
                    }
                    const opts = offerChipsFor(intake);
                    if (opt.custom) {
                      const nextOn = !custom.offer;
                      setCustom((c) => ({ ...c, offer: nextOn }));
                      if (!nextOn) {
                        const { ids } = parseChipField(intake.offer, opts);
                        patch({ offer: formatChipField(ids, "") || "no_offer", offerCustom: false });
                      } else {
                        patch({ offerCustom: true });
                      }
                    } else {
                      patch({ offer: toggleChipValue(intake.offer, opt, opts, true), offerCustom: custom.offer });
                    }
                  }}
                  customValue={parseChipField(intake.offer, offerChipsFor(intake)).customText}
                  onCustom={(v) => {
                    if (isFreeService(intake)) {
                      patch({ offer: "no_offer", offerCustom: false });
                      return;
                    }
                    const { ids } = parseChipField(intake.offer, offerChipsFor(intake));
                    patch({ offer: formatChipField(ids.filter((id) => id !== "no_offer"), v), offerCustom: true });
                  }}
                />
              </div>
              <MediaAssetUploader
                assets={intake.mediaAssets ?? []}
                intake={intake}
                onChange={(mediaAssets) => patch({ mediaAssets })}
              />
              {showsKupaFields(intake) && (
                <>
              <div>
                <Label>{t("details.kupaFile")}</Label>
                <p className="mb-2 text-xs text-muted">{t("details.kupaHint")}</p>
                <Input
                  value={intake.kupaFileBy ?? ""}
                  placeholder={t("details.kupaFilePh")}
                  onChange={(e) => patch({ kupaFileBy: e.target.value })}
                />
              </div>
              <div>
                <Label>{t("details.kupaMember")}</Label>
                <Input
                  value={intake.kupaMemberFrom ?? ""}
                  placeholder={t("details.kupaMemberPh")}
                  onChange={(e) => patch({ kupaMemberFrom: e.target.value })}
                />
              </div>
                </>
              )}
            </section>
          )}

          {step === 4 && (
            <section>
              <div className="overflow-hidden rounded-2xl border border-navy/10 bg-white">
                <div className="border-b border-navy/10 px-5 py-4 text-center text-sm font-bold text-omni-yellow">
                  {t("review.heading")}
                </div>
                <dl>
                  {reviewRows.map(([k, v]) => (
                    <div
                      key={k}
                      className="grid grid-cols-1 border-b border-navy/10 px-5 py-3 sm:grid-cols-[200px_1fr]"
                    >
                      <dt className="text-sm text-muted">{k}</dt>
                      <dd className="text-sm font-medium text-navy">
                        {v?.trim() ? v : <span className="text-muted">{t("empty.dash")}</span>}
                      </dd>
                    </div>
                  ))}
                </dl>
                {!isFreeService(intake) && (
                <div className="border-t border-navy/10 px-5 py-5">
                  <h3 className="mb-2 font-bold text-navy">{t("plan.channels")}</h3>
                  <p className="mb-3 text-sm text-muted">{t("plan.channelsHint")}</p>
                  <ChipGroup
                    options={CHANNEL_CHIPS.filter((c) => c.id !== "whatsapp" || intake.whatsapp.trim())}
                    value={visiblePlanChannels(intake).join(",")}
                    multi
                    onChange={(_, opt) => {
                      const on = !visiblePlanChannels(intake).includes(opt.id as "facebook" | "instagram" | "whatsapp");
                      patch({ channelNotes: setPlanChannel(intake, opt.id as "facebook" | "instagram" | "whatsapp", on) });
                    }}
                  />
                </div>
                )}
                <div className="px-5 py-5">
                  <h3 className="mb-2 font-bold text-navy">{t("review.competitors")}</h3>
                  <p className="mb-3 text-sm text-muted">{t("review.competitorsHint")}</p>
                  <ul className="mb-3 space-y-2">
                    {intake.competitors.map((c) => (
                      <li
                        key={c.id}
                        className="flex items-start justify-between gap-3 rounded-xl border border-navy/10 p-3"
                      >
                        <div>
                          <p className="font-semibold">{c.name}</p>
                          {c.url && <p className="text-xs text-muted">{c.url}</p>}
                          {c.notes && <p className="text-sm text-muted">{c.notes}</p>}
                        </div>
                        <button
                          type="button"
                          className="text-muted hover:text-omni-red"
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
                className="mt-6 w-full text-base font-black shadow-[0_12px_32px_rgba(27,42,74,0.12)]"
                disabled={!wizardReady(intake) || running}
                onClick={startBuild}
              >
                <WandSparkles className="size-5" />
                {t("cta.build")}
              </Button>
              {!wizardReady(intake) && (
                <div
                  className="mt-3 rounded-xl border border-omni-red/40 bg-omni-red/10 px-4 py-3 text-sm text-red-800"
                  dir={locale === "en" ? "ltr" : "rtl"}
                >
                  <p className="font-bold">{t("wizard.missingHeading")}</p>
                  <ul className="mt-1 list-disc ps-5">
                    {wizardMissingFields(intake).map((f) => (
                      <li key={String(f.field)}>{f.label[locale]}</li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          <div className="mt-8 flex justify-center gap-6">
            {step > 1 && (
              <button type="button" className="text-sm text-muted hover:text-navy" onClick={() => setStep((s) => (s - 1) as WizardStep)}>
                {t("cta.back")}
              </button>
            )}
            {step < 4 && (
              <Button type="button" onClick={() => setStep((s) => (s + 1) as WizardStep)}>
                {t("cta.next")}
              </Button>
            )}
          </div>
        </div>
      )}

      {phase === "interview" && (
        <section className="rounded-2xl border border-navy/10 bg-white p-5 sm:p-8">
          <CoachPanel report={coachReport} onApply={applyCoach} />
          <div className="mb-4">
            <DocumentIngest intake={intake} onApply={applyIngest} variant="compact" />
          </div>
          <h2 className="mb-2 text-2xl font-black">{t("interview.title")}</h2>
          <p className="mb-6 text-sm text-muted">{t("interview.lead")}</p>
          <Field label={isFreeService(intake) ? t("interview.modelFree") : t("interview.model")}>
            <Textarea value={intake.businessModel} onChange={(e) => patch({ businessModel: e.target.value })} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            {!isFreeService(intake) && (
              <>
                <Field label={t("interview.aov")}>
                  <Input value={intake.avgOrderValue} onChange={(e) => patch({ avgOrderValue: e.target.value })} />
                </Field>
                <Field label={t("interview.margin")}>
                  <Input value={intake.marginPercent} onChange={(e) => patch({ marginPercent: e.target.value })} />
                </Field>
                <Field label={t("interview.cac")}>
                  <Input value={intake.targetCac} onChange={(e) => patch({ targetCac: e.target.value })} />
                </Field>
              </>
            )}
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
            <button type="button" className="text-sm text-muted hover:text-navy" onClick={runAgents}>
              {t("interview.skip")}
            </button>
            <button type="button" className="text-sm text-muted" onClick={() => setPhase("wizard")}>
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
          onNewCampaign={newCampaign}
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
  onNewCampaign,
}: {
  pack: CampaignPack | null;
  agentStatus: Record<AgentId, AgentStatus>;
  running: boolean;
  onApprove: () => void;
  onBack: () => void;
  onNewCampaign: () => void;
}) {
  const { t, locale } = useI18n();
  return (
    <section>
      <h2 className="mb-2 text-center text-2xl font-black">{t("agents.title")}</h2>
      <p className="mb-6 text-center text-sm text-muted">{t("agents.hitl")}</p>
      <ul className="mb-8 space-y-2">
        {AGENT_KEYS.map((a, i) => (
          <li
            key={a.id}
            className="flex items-center justify-between rounded-xl border border-navy/10 bg-white px-4 py-3"
          >
            <span className="text-sm font-semibold">
              {i + 1}. {t(a.key)}
            </span>
            <StatusPill status={agentStatus[a.id]} />
          </li>
        ))}
      </ul>

      {pack && (
        <div className="rounded-2xl border border-omni-yellow/30 bg-white p-5">
          <p className="mb-4 text-sm text-muted">{pack.diagnosis.summary[locale]}</p>
          <div className="space-y-3">
            {pack.diagnosis.hypotheses.map((h, i) => (
              <article key={i} className="rounded-xl border border-navy/10 p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-omni-red/20 px-2 py-0.5 text-xs font-bold text-omni-red">
                    {AREA_LABEL[h.area][locale]}
                  </span>
                  <span className="text-xs text-muted">{h.confidence}</span>
                </div>
                <p className="font-semibold text-navy">{h.finding[locale]}</p>
                <p className="mt-1 text-sm text-muted">{h.evidence[locale]}</p>
                <p className="mt-2 text-sm text-omni-yellow">{h.recommendation[locale]}</p>
              </article>
            ))}
          </div>
          {pack.intakeReport.missing.length > 0 && (
            <div className="mt-4 rounded-xl border border-omni-yellow/30 bg-omni-yellow/5 p-3 text-sm text-foreground">
              {pack.intakeReport.missing.map((m) => (
                <p key={m.field}>
                  <strong>{m.label[locale]}:</strong> {m.reason[locale]}
                </p>
              ))}
            </div>
          )}
          {pack.intakeReport.inconsistencies.length > 0 && (
            <div className="mt-3 rounded-xl border border-omni-red/40 bg-omni-red/10 p-3 text-sm text-red-800">
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
          <button type="button" className="mt-3 w-full text-sm text-muted" onClick={onBack}>
            {t("cta.reject")}
          </button>
          <div className="mt-6 border-t border-navy/10 pt-5">
            <Button type="button" size="lg" className="w-full" onClick={onNewCampaign}>
              {t("cta.newOther")}
            </Button>
            <p className="mt-2 text-center text-sm text-muted">{t("cta.newHint")}</p>
          </div>
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
    idle: "bg-navy/10 text-muted",
    running: "bg-omni-yellow/20 text-omni-yellow animate-pulse",
    blocked: "bg-navy/5 text-muted",
    needs_approval: "bg-omni-red/20 text-omni-red",
    approved: "bg-navy text-white",
    complete: "bg-navy text-white",
    refused: "bg-omni-red text-white",
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-sm font-bold ${colors[status]}`}>
      {t(key)}
    </span>
  );
}
