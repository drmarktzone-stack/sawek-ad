"use client";

import { Children, cloneElement, isValidElement, useEffect, useId, useMemo, useRef, useState, type ReactElement, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, WandSparkles } from "lucide-react";
import type { AgentId, AgentStatus, CampaignPack, Competitor, Intake, WizardStep } from "@/lib/types";
import { demoIntake, clearPendingDemo, applyPediatricDemoDraft, applyCatalogDemoDraft, isPediatricDemo, isAnyDemoIntake, relocalizePediatricIntake, relocalizeCatalogIntake, canonicalDoctorName } from "@/lib/demo";
import { installDemoPack } from "@/lib/active-pack";
import { DemoPicker } from "@/components/demo-picker";
import {
  cmoFieldsMissing,
  emptyIntake,
  intakeLandingStep,
  WIZARD_PICK_FIELDS,
  wizardFieldDomId,
  wizardMissingFields,
  wizardReady,
  wizardSectionDomId,
  type WizardRequiredField,
} from "@/lib/engine/validate";
import { assemblePack, idleStatus, overlayPackAgency, runIntakeAndDiagnosis, runMedia, runOptimizerStage, runStrategic } from "@/lib/engine/run";
import { hydrateScanIntake } from "@/lib/intake-locale";
import { businessKey } from "@/lib/engine/ad-engine/sources";
import { loadDraft, saveDraft, INGEST_APPLIED_EVENT } from "@/lib/storage";
import { loadCampaignTools } from "@/lib/campaign-tools";
import { charterAllowsCampaign } from "@/lib/operating-niche";
import { NextStepCard } from "@/components/next-step-card";
import { NicheGateCard } from "@/components/niche-gate";
import { nextHitlGate } from "@/lib/engine/hitl";
import { OfferGateBanner } from "@/components/offer-gate-banner";
import { syncCampaign } from "@/lib/supabase";
import { uid } from "@/lib/utils";
import { MAX_COMPETITORS } from "@/lib/factory-formats";
import { AREA_LABEL } from "@/lib/i18n";
import { markEmptyCampaign, wantsEmptyCampaign, clearEmptyCampaign, explicitDemoInUrl, demoParamFromUrl, applyEmptyCampaignHydrate, EMPTY_CAMPAIGN_EVENT, releaseEmptyIfTypedName } from "@/lib/empty-campaign";
import { stripDemoParamsPreserveLang, withLang } from "@/lib/locale-url";
import { interpretCampaignPaste, sanitizePastedUrl } from "@/lib/url-clean";
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
import { DiagnosisCmoStrip, DiagnosisGaps } from "@/components/diagnosis-gaps";
import { ResearchDesk } from "@/components/research-desk";
import { ImageOfferPicker } from "@/components/image-offer-picker";
import { VoiceFields } from "@/components/voice-fields";
import { emptyVoice, voiceFromIntake } from "@/lib/engine/voice";
import { coachIntake } from "@/lib/engine/coach";
import { useIsClient } from "@/lib/use-is-client";
import { cn } from "@/lib/utils";
import { CompleteAdCard } from "@/components/complete-ad-card";

function attachFieldId(
  node: ReactNode,
  id: string,
  describedBy?: string,
  invalid?: boolean,
): ReactNode {
  if (!isValidElement(node)) return node;
  const type = node.type;
  const isControl = type === Input || type === Textarea || type === "input" || type === "textarea";
  if (!isControl) return node;
  const prev = node as ReactElement<{
    id?: string;
    className?: string;
    "aria-describedby"?: string;
    "aria-invalid"?: boolean;
  }>;
  return cloneElement(prev, {
    id,
    ...(describedBy ? { "aria-describedby": describedBy } : {}),
    ...(invalid ? { "aria-invalid": true } : {}),
    className: cn(
      prev.props.className,
      invalid && "border-danger focus:border-danger focus:shadow-[0_0_0_4px_rgba(196,74,58,0.18)]",
    ),
  });
}

function Field({
  label,
  hint,
  filled,
  error,
  fieldId,
  flash,
  children,
}: {
  label: string;
  hint?: string;
  filled?: boolean;
  error?: string;
  fieldId?: string;
  flash?: boolean;
  children: React.ReactNode;
}) {
  const autoId = useId();
  const id = fieldId ?? autoId;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;
  const labeled = Children.map(children, (child) => attachFieldId(child, id, describedBy, Boolean(error)));
  return (
    <div
      className={cn("mb-5 rounded-[14px]", flash && "ring-2 ring-danger ring-offset-2 ring-offset-[var(--ivory)]")}
      data-wizard-field={fieldId}
    >
      <Label htmlFor={id} className={error ? "text-danger" : filled ? "text-teal" : "text-navy"}>
        {label}
      </Label>
      {hint ? (
        <p id={hintId} className="mb-2 text-sm font-medium text-muted">
          {hint}
        </p>
      ) : null}
      <div className={filled && !error ? "agency-field-wrap-filled" : undefined}>{labeled}</div>
      {error ? (
        <p id={errorId} className="mt-2 text-sm font-semibold text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function ChipField({
  label,
  hint,
  fieldId,
  error,
  flash,
  children,
}: {
  label: string;
  hint?: ReactNode;
  fieldId: string;
  error?: string;
  flash?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      id={fieldId}
      tabIndex={-1}
      data-wizard-field={fieldId}
      className={cn(
        "rounded-[16px] outline-none",
        error && "ring-2 ring-danger/70 ring-offset-2 ring-offset-[var(--ivory)]",
        flash && "ring-2 ring-danger ring-offset-2 ring-offset-[var(--ivory)]",
      )}
    >
      <Label className={error ? "text-danger" : undefined}>{label}</Label>
      {hint}
      <div className={error ? "rounded-[14px] border border-danger p-2" : undefined}>{children}</div>
      {error ? (
        <p className="mt-2 text-sm font-semibold text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function WizardFlow({ embedded = false, taskMode = false }: { embedded?: boolean; taskMode?: boolean }) {
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
  const [hitlError, setHitlError] = useState("");
  const advancing = useRef(false);
  const [offerBlocked, setOfferBlocked] = useState(false);
  const [compOpen, setCompOpen] = useState(false);
  const [compDraft, setCompDraft] = useState<Competitor>({ id: "", name: "", url: "", notes: "" });
  const [flashField, setFlashField] = useState("");
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
    const urlDemo = !emptyWanted && explicitDemoInUrl();
    if (urlDemo) {
      demoConsumed.current = true;
      const demoId = demoParamFromUrl() || "samer";
      const d =
        applyCatalogDemoDraft(demoId, locale) ||
        demoIntake(locale);
      clearPendingDemo();
      clearEmptyCampaign();
      saveDraft({ intake: d, step: 3, phase: "interview" });
      setIntake(d);
      setStep(3);
      setCustom({
        audience: true,
        problem: true,
        advantage: true,
        goal: false,
        offer: d.offerCustom,
      });
      setPhase("interview");
    } else if (emptyWanted) {
      const blankState = applyEmptyCampaignHydrate();
      setIntake(blankState.intake);
      setStep(2);
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
          : relocalizeCatalogIntake(
              { ...d.intake, businessName: canonicalDoctorName(d.intake.businessName) },
              locale,
            );
      setIntake(intake);
      setStep(intakeLandingStep(intake, d.step));
      setCustom({
        audience: intake.audienceCustom,
        problem: intake.problemCustom,
        advantage: intake.advantageCustom,
        goal: intake.goalCustom,
        offer: intake.offerCustom,
      });
      const resume = d.phase === "agents" || d.phase === "interview" ? d.phase : "wizard";
      const existing = loadCampaignTools().pack;
      const needHitl = Boolean(existing?.diagnosis?.hypotheses?.length && existing.diagnosis.approved === false);
      if (existing) {
        setPack(existing);
        setAgentStatus(existing.agentStatus);
        setHitlError("");
      }
      if (resume === "agents" && needHitl) {
        setPhase("agents");
      } else if (resume === "interview") {
        setPhase("interview");
      } else {
        setPhase("wizard");
      }
    }
    setHydrated(true);
  }, [client, hydrated, locale]);

  useEffect(() => {
    if (!client) return;
    const onEmpty = () => {
      const blankState = applyEmptyCampaignHydrate();
      setIntake(blankState.intake);
      setStep(2);
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
      setStep(intakeLandingStep(d.intake, d.step));
      setCustom({
        audience: d.intake.audienceCustom,
        problem: d.intake.problemCustom,
        advantage: d.intake.advantageCustom,
        goal: d.intake.goalCustom,
        offer: d.intake.offerCustom,
      });
      const resume = d.phase === "interview" || d.phase === "agents" ? d.phase : "wizard";
      const tools = loadCampaignTools();
      const existing = tools.pack;
      const needHitl = Boolean(existing?.diagnosis?.hypotheses?.length && existing.diagnosis.approved === false);
      if (resume === "wizard") {
        setPhase("wizard");
        if (tools.pack) {
          setPack(tools.pack);
          setAgentStatus(tools.pack.agentStatus);
          setHitlError("");
        } else {
          setPack(null);
          setAgentStatus(idleStatus());
        }
      } else if (resume === "agents" && needHitl && existing) {
        setPack(existing);
        setAgentStatus(existing.agentStatus);
        setHitlError("");
        setPhase("agents");
      } else if (resume === "agents") {
        setPack(existing);
        setAgentStatus(existing?.agentStatus ?? idleStatus());
        setPhase("wizard");
      } else {
        setPhase(resume);
      }
    };
    window.addEventListener(INGEST_APPLIED_EVENT, onApplied);
    return () => window.removeEventListener(INGEST_APPLIED_EVENT, onApplied);
  }, [client]);

  useEffect(() => {
    if (!hydrated) return;
    const samePack = Boolean(
      pack && businessKey(pack.intake.businessName) === businessKey(intake.businessName),
    );
    const persist = () =>
      saveDraft({
        intake,
        step,
        phase,
        packId: samePack ? pack?.id : undefined,
        coach: coachIntake(intake),
        hsoStudio: samePack ? loadDraft().hsoStudio : undefined,
        viral: samePack ? loadDraft().viral : undefined,
      });
    if (wantsEmptyCampaign()) {
      if (releaseEmptyIfTypedName(intake.businessName)) persist();
      else saveDraft({ intake: emptyIntake(), step: 1, phase: "wizard" });
      return;
    }
    persist();
  }, [intake, step, phase, pack?.id, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    if (wantsEmptyCampaign()) return;
    if (!intake.businessName.trim()) return;
    if (isPediatricDemo(intake) || isAnyDemoIntake(intake)) {
      setIntake((prev) => relocalizeCatalogIntake(prev, locale));
    } else {
      setIntake((prev) => hydrateScanIntake(prev, locale));
    }
  }, [locale, hydrated]);

  useEffect(() => {
    if (phase !== "agents" && phase !== "interview") return;
    document.getElementById("studio")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [phase]);

  const patch = (p: Partial<Intake>) => setIntake((s) => ({ ...s, ...p }));

  const missingRequired = wizardMissingFields(intake);
  const missingSet = new Set(missingRequired.map((m) => m.field));

  function requiredError(field: WizardRequiredField): string | undefined {
    if (!missingSet.has(field)) return undefined;
    return WIZARD_PICK_FIELDS.has(field) ? t("wizard.needPick") : t("wizard.needText");
  }

  function goSection(n: WizardStep) {
    setStep(n);
    document.getElementById(wizardSectionDomId(n))?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function focusWizardField(field: WizardRequiredField) {
    setFlashField(field);
    const id = wizardFieldDomId(field);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      const focusable = el.matches("input, textarea, button")
        ? el
        : el.querySelector<HTMLElement>("input, textarea, button");
      focusable?.focus();
    }
    window.setTimeout(() => {
      setFlashField((cur) => (cur === field ? "" : cur));
    }, 1600);
  }

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
      [t("viral.niche"), voiceFromIntake(intake).niche],
      [t("viral.core"), voiceFromIntake(intake).coreMessage],
      [t("viral.voice"), voiceFromIntake(intake).personalVoice],
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

  function applyDemo(idOrSlug: string = "samer") {
    clearEmptyCampaign();
    const d = applyCatalogDemoDraft(idOrSlug, locale) || applyPediatricDemoDraft(locale);
    installDemoPack(idOrSlug);
    clearPendingDemo();
    saveDraft({ intake: d, step: 3, phase: "interview" });
    setIntake(d);
    setCustom({
      audience: true,
      problem: true,
      advantage: true,
      goal: false,
      offer: d.offerCustom,
    });
    setStep(3);
    setPhase("interview");
    setPack(null);
    setAgentStatus(idleStatus());
  }

  function newCampaign() {
    markEmptyCampaign();
    const blank = emptyIntake();
    setIntake(blank);
    setStep(2);
    setPhase("wizard");
    setPack(null);
    setAgentStatus(idleStatus());
    setHitlError("");
    setCustom({ audience: false, problem: false, advantage: false, goal: false, offer: false });
  }

  function onStatus(id: AgentId, status: AgentStatus) {
    setAgentStatus((s) => ({ ...s, [id]: status }));
  }

  async function startBuild() {
    if (!wizardReady(intake)) return;
    if (!charterAllowsCampaign(intake)) return;
    setOfferBlocked(false);
    await runAgents();
  }

  async function runAgents() {
    setPhase("agents");
    setRunning(true);
    setHitlError("");
    setAgentStatus({
      intake: "running",
      diagnostic: "idle",
      strategic: "blocked",
      media: "blocked",
      optimizer: "blocked",
    });
    const { report, diagnosis } = await runIntakeAndDiagnosis(intake, onStatus);
    const draft = loadDraft();
    const p = {
      ...assemblePack(intake, {
        report,
        diagnosis,
        agentStatus: {
          intake: "complete",
          diagnostic: "needs_approval",
          strategic: "blocked",
          media: "blocked",
          optimizer: "blocked",
        },
      }),
      offerBlueprint: intake.offerBlueprint,
      hsoStudio: draft.hsoStudio,
    };
    void syncCampaign(p);
    setPack(p);
    setAgentStatus(p.agentStatus);
    setRunning(false);
    saveDraft({ intake, step: 4, phase: "agents", packId: p.id });
    if (!taskMode) {
      router.push(withLang("/task/ad", locale));
    }
  }

  async function advanceHitl() {
    if (advancing.current) return;
    setHitlError("");
    let current = pack;
    if (!current) {
      current = loadCampaignTools().pack;
      if (current) {
        setPack(current);
        setAgentStatus(current.agentStatus);
      }
    }
    if (!current) {
      if (wizardReady(intake)) {
        advancing.current = false;
        await runAgents();
        return;
      }
      setHitlError(t("agents.packMissing"));
      setRunning(false);
      return;
    }

    const gate = nextHitlGate(agentStatus, current);
    if (gate === "complete") {
      saveDraft({ intake, step: 4, phase: "wizard", packId: current.id });
      router.push(withLang(`/campaigns/${current.id}`, locale));
      return;
    }

    advancing.current = true;
    setRunning(true);
    try {
      if (gate === "diagnostic") {
        const built = await runStrategic(intake, current.diagnosis, onStatus);
        const next = await overlayPackAgency(assemblePack(intake, {
          report: current.intakeReport,
          diagnosis: { ...current.diagnosis, approved: true, approvedAt: new Date().toISOString() },
          variants: built.variants,
          strategy: built.strategy,
          angles: built.angles,
          id: current.id,
          agentStatus: {
            intake: "complete",
            diagnostic: "approved",
            strategic: "needs_approval",
            media: "blocked",
            optimizer: "blocked",
          },
        }), { locale });
        void syncCampaign(next);
        setPack(next);
        setAgentStatus(next.agentStatus);
        setPhase("wizard");
        saveDraft({ intake, step: 4, phase: "wizard", packId: next.id });
        router.push(withLang("/tools/core-message", locale));
        return;
      } else if (gate === "strategic") {
        const built = await runMedia(intake, onStatus);
        const next = await overlayPackAgency(assemblePack(intake, {
          report: current.intakeReport,
          diagnosis: current.diagnosis,
          variants: current.variants,
          strategy: current.strategy,
          media: built.media,
          angles: current.angles,
          id: current.id,
          agentStatus: {
            intake: "complete",
            diagnostic: "approved",
            strategic: "approved",
            media: "needs_approval",
            optimizer: "blocked",
          },
        }), { locale });
        void syncCampaign(next);
        setPack(next);
        setAgentStatus(next.agentStatus);
      } else {
        const built = await runOptimizerStage(intake, current.media, onStatus);
        const next = await overlayPackAgency(assemblePack(intake, {
          report: current.intakeReport,
          diagnosis: current.diagnosis,
          variants: current.variants,
          strategy: current.strategy,
          media: current.media,
          optimizer: built.optimizer,
          angles: current.angles,
          id: current.id,
          agentStatus: {
            intake: "complete",
            diagnostic: "approved",
            strategic: "approved",
            media: "approved",
            optimizer: "complete",
          },
        }), { locale });
        const saved = { ...next, saved: true };
        void syncCampaign(saved);
        setPack(saved);
        setAgentStatus(saved.agentStatus);
        saveDraft({ intake, step: 4, phase: "wizard", packId: saved.id });
        router.push(withLang(`/campaigns/${saved.id}`, locale));
      }
    } catch {
      setHitlError(t("agents.hitlError"));
    } finally {
      advancing.current = false;
      setRunning(false);
    }
  }

  return (
    <div className={embedded ? "mx-auto w-full min-w-0 max-w-3xl px-3 py-5 sm:px-4 sm:py-8" : "mx-auto w-full min-w-0 max-w-3xl px-3 py-6 sm:px-4 sm:py-12"}>
      {!embedded && <DepartmentRail />}
      {taskMode ? null : embedded ? (
        <div className="mb-6 flex flex-col items-center gap-3">
          {!intake.businessName.trim() || isAnyDemoIntake(intake) ? (
            <DemoPicker onSelect={(id) => applyDemo(id)} />
          ) : null}
          <Button type="button" size="lg" onClick={newCampaign}>
            {t("cta.new")}
          </Button>
          <p className="max-w-md text-center text-sm text-muted">{t("cta.newHint")}</p>
        </div>
      ) : (
        <div className="mb-6 flex flex-col items-center gap-3">
          {!intake.businessName.trim() || isAnyDemoIntake(intake) ? (
            <DemoPicker onSelect={(id) => applyDemo(id)} />
          ) : null}
          <Button type="button" size="lg" onClick={newCampaign}>
            {t("cta.new")}
          </Button>
          <p className="max-w-md text-center text-sm text-muted">{t("cta.newHint")}</p>
        </div>
      )}
      {!intake.businessName.trim() ? (
        <div className="agency-empty mb-6 rounded-[20px] px-5 py-6 text-center">
          <p className="agency-kicker">{t("cta.new")}</p>
          <p className="agency-display mt-2 text-2xl">{t("gemini.waitFacts")}</p>
          <p className="mx-auto mt-2 max-w-md text-sm font-medium text-muted">{t("cta.newHint")}</p>
        </div>
      ) : null}

      {phase === "wizard" && (
        <>
          <Stepper step={step} onStep={goSection} />
          <CoachPanel report={coachReport} onApply={applyCoach} />
          {!embedded && <ConquerHeadline subtitle={t("wizard.requiredHint")} />}
          {embedded && (
            <p className="mb-6 text-center text-sm font-medium text-muted">{t("wizard.requiredHint")}</p>
          )}

          <section id={wizardSectionDomId(1)}>
              <h2 className="mb-2 text-center text-lg font-bold">{t("type.prompt")}</h2>
              <p className="mb-6 text-center text-base text-muted">{t("type.hint")}</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => patch({ type: opt.id as Intake["type"] })}
                    className={`rounded-[20px] border p-6 text-start text-xl font-black transition-all ${
                      intake.type === opt.id
                        ? "border-teal bg-teal text-white shadow-[var(--shadow-card)]"
                        : "border-[rgba(21,71,52,0.14)] bg-white text-navy hover:border-teal hover:shadow-[var(--shadow-card)]"
                    }`}
                  >
                    {opt.label[locale]}
                  </button>
                ))}
              </div>
              <h2 className="mb-2 mt-10 text-center text-lg font-bold">{t("model.prompt")}</h2>
              <p className="mb-6 text-center text-base text-muted">{t("model.hint")}</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {([
                  { id: "paid" as const, title: t("model.paid"), hint: t("model.paidHint") },
                  { id: "free_service" as const, title: t("model.free"), hint: t("model.freeHint") },
                ]).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setIntake((s) => applyOperatingModel(s, opt.id))}
                    className={`rounded-[20px] border p-6 text-start transition-all ${
                      (intake.operatingModel ?? "paid") === opt.id
                        ? "border-teal bg-teal text-white shadow-[var(--shadow-card)]"
                        : "border-[rgba(21,71,52,0.14)] bg-white text-navy hover:border-teal hover:shadow-[var(--shadow-card)]"
                    }`}
                  >
                    <span className="block text-xl font-black">{opt.title}</span>
                    <span className={`mt-2 block text-sm font-medium ${
                      (intake.operatingModel ?? "paid") === opt.id ? "text-white/80" : "text-muted"
                    }`}>{opt.hint}</span>
                  </button>
                ))}
              </div>
              <div className="mt-8">
                <DocumentIngest intake={intake} onApply={applyIngest} variant="primary" />
              </div>
            </section>

            <section id={wizardSectionDomId(2)} className="agency-board mt-8 p-5 sm:p-8">
              <h2 className="mb-2 text-center text-lg font-black text-navy">{t("wizard.requiredHeading")}</h2>
              <div className="agency-guidance mb-6 rounded-[14px] px-4 py-3 text-sm font-semibold">
                {t("wizard.requiredHint")}
              </div>
              <Field
                label={t("biz.name")}
                filled={Boolean(intake.businessName.trim())}
                error={requiredError("businessName")}
                fieldId={wizardFieldDomId("businessName")}
                flash={flashField === "businessName"}
              >
                <Input
                  value={intake.businessName}
                  placeholder={t("biz.namePh")}
                  onPaste={(e) => {
                    const text = e.clipboardData.getData("text");
                    const parsed = interpretCampaignPaste(text);
                    if (parsed.website || parsed.name !== text.trim()) {
                      e.preventDefault();
                      patch({
                        businessName: parsed.name,
                        ...(parsed.website ? { website: parsed.website } : {}),
                      });
                    }
                  }}
                  onChange={(e) => {
                    const parsed = interpretCampaignPaste(e.target.value);
                    patch({
                      businessName: parsed.name,
                      ...(parsed.website ? { website: parsed.website } : {}),
                    });
                  }}
                  onBlur={() => {
                    const parsed = interpretCampaignPaste(intake.businessName);
                    if (parsed.name !== intake.businessName || parsed.website) {
                      patch({
                        businessName: parsed.name,
                        ...(parsed.website ? { website: parsed.website } : {}),
                      });
                    }
                  }}
                />
              </Field>
              <Field
                label={t("biz.description")}
                filled={Boolean(intake.description.trim())}
                error={requiredError("description")}
                fieldId={wizardFieldDomId("description")}
                flash={flashField === "description"}
              >
                <Textarea
                  value={intake.description}
                  placeholder={t("biz.descPh")}
                  onChange={(e) => patch({ description: e.target.value })}
                />
              </Field>
              <div className="mb-5">
                <ChipField
                  label={t("details.audience")}
                  fieldId={wizardFieldDomId("audience")}
                  error={requiredError("audience")}
                  flash={flashField === "audience"}
                >
                  <ChipGroup
                    invalid={Boolean(requiredError("audience"))}
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
                </ChipField>
              </div>
              <div className="mb-5">
                <ChipField
                  label={t("details.problem")}
                  fieldId={wizardFieldDomId("biggestProblem")}
                  error={requiredError("biggestProblem")}
                  flash={flashField === "biggestProblem"}
                >
                  <ChipGroup
                    invalid={Boolean(requiredError("biggestProblem"))}
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
                </ChipField>
              </div>
              <div className="mb-5">
                <ChipField
                  label={t("details.advantage")}
                  fieldId={wizardFieldDomId("uniqueAdvantage")}
                  error={requiredError("uniqueAdvantage")}
                  flash={flashField === "uniqueAdvantage"}
                >
                  <ChipGroup
                    invalid={Boolean(requiredError("uniqueAdvantage"))}
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
                </ChipField>
              </div>
              <div className="mb-2">
                <ChipField
                  label={t("details.goal")}
                  fieldId={wizardFieldDomId("mainGoal")}
                  error={requiredError("mainGoal")}
                  flash={flashField === "mainGoal"}
                  hint={isFreeService(intake) ? <p className="mb-2 text-xs text-muted">{t("details.goalFreeHint")}</p> : undefined}
                >
                  <ChipGroup
                    invalid={Boolean(requiredError("mainGoal"))}
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
                </ChipField>
              </div>
            </section>

            <section id={wizardSectionDomId(3)} className="agency-board mt-8 space-y-8 p-5 sm:p-8">
              <h2 className="text-center text-lg font-black text-navy">{t("wizard.optionalHeading")}</h2>
              <div className="agency-guidance rounded-[14px] px-4 py-3 text-sm font-semibold">
                {t("wizard.formHint")}
              </div>
              <Field label={t("biz.category")} filled={Boolean(intake.category.trim())}>
                <Input
                  value={intake.category}
                  placeholder={t("biz.categoryPh")}
                  onChange={(e) => patch({ category: e.target.value })}
                />
              </Field>
              <div className="mb-6 rounded-[16px] border border-[rgba(8,17,31,0.08)] bg-ivory p-4">
                <p className="agency-kicker">{t("viral.step1")}</p>
                <p className="mt-2 text-sm text-muted">{t("viral.step1b")}</p>
                <div className="mt-4">
                  <VoiceFields
                    value={intake.voice ?? emptyVoice()}
                    onChange={(voice) => patch({ voice, brandTone: voice.personalVoice || intake.brandTone })}
                  />
                </div>
              </div>
              <Field label={t("biz.location")} filled={Boolean(intake.location.trim())}>
                <Input
                  value={intake.location}
                  placeholder={t("biz.locationPh")}
                  onChange={(e) => patch({ location: e.target.value })}
                />
              </Field>
              <Field label={t("biz.website")} filled={Boolean(intake.website.trim())}>
                <Input
                  value={intake.website}
                  placeholder="https://"
                  dir="ltr"
                  onChange={(e) => {
                    const clean = sanitizePastedUrl(e.target.value);
                    patch({ website: clean || e.target.value });
                  }}
                />
              </Field>
              {intake.phone?.trim() &&
              intake.phone.replace(/\D/g, "") !== (intake.whatsapp || "").replace(/\D/g, "") ? (
                <Field label={t("biz.phone")} filled>
                  <Input value={intake.phone} dir="ltr" onChange={(e) => patch({ phone: e.target.value })} inputMode="tel" />
                </Field>
              ) : null}
              <Field label={t("biz.whatsapp")} filled={Boolean((intake.whatsapp ?? "").trim())}>
                <Input
                  value={intake.whatsapp ?? ""}
                  placeholder={t("biz.whatsappPh")}
                  onChange={(e) => patch({ whatsapp: e.target.value })}
                  inputMode="tel"
                />
              </Field>
              <Field label={t("biz.hours")} hint={t("biz.hoursHint")} filled={Boolean((intake.clinicHours ?? "").trim())}>
                <Textarea
                  value={intake.clinicHours ?? ""}
                  placeholder={t("biz.hoursPh")}
                  onChange={(e) => patch({ clinicHours: e.target.value })}
                />
              </Field>
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
              <div className="agency-board p-4">
                <p className="mb-3 text-sm font-black text-navy">{t("interview.title")}</p>
                <Field label={isFreeService(intake) ? t("interview.modelFree") : t("interview.model")} filled={Boolean(intake.businessModel.trim())}>
                  <Textarea value={intake.businessModel} onChange={(e) => patch({ businessModel: e.target.value })} />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  {!isFreeService(intake) && (
                    <>
                      <Field label={t("interview.aov")} filled={Boolean(intake.avgOrderValue.trim())}>
                        <Input value={intake.avgOrderValue} onChange={(e) => patch({ avgOrderValue: e.target.value })} />
                      </Field>
                      <Field label={t("interview.margin")} filled={Boolean(intake.marginPercent.trim())}>
                        <Input value={intake.marginPercent} onChange={(e) => patch({ marginPercent: e.target.value })} />
                      </Field>
                      <Field label={t("interview.cac")} filled={Boolean(intake.targetCac.trim())}>
                        <Input value={intake.targetCac} onChange={(e) => patch({ targetCac: e.target.value })} />
                      </Field>
                    </>
                  )}
                  <Field label={t("interview.budget")} filled={Boolean(intake.monthlyBudget.trim())}>
                    <Input value={intake.monthlyBudget} onChange={(e) => patch({ monthlyBudget: e.target.value })} />
                  </Field>
                </div>
              </div>
              {showsKupaFields(intake) && (
                <>
              <Field label={t("details.kupaFile")} hint={t("details.kupaHint")} filled={Boolean((intake.kupaFileBy ?? "").trim())}>
                <Input
                  value={intake.kupaFileBy ?? ""}
                  placeholder={t("details.kupaFilePh")}
                  onChange={(e) => patch({ kupaFileBy: e.target.value })}
                />
              </Field>
              <Field label={t("details.kupaMember")} filled={Boolean((intake.kupaMemberFrom ?? "").trim())}>
                <Input
                  value={intake.kupaMemberFrom ?? ""}
                  placeholder={t("details.kupaMemberPh")}
                  onChange={(e) => patch({ kupaMemberFrom: e.target.value })}
                />
              </Field>
                </>
              )}
            </section>

            <section id={wizardSectionDomId(4)} className="mt-8">
              <div className="overflow-hidden rounded-2xl border border-navy/10 bg-white">
                <div className="border-b border-navy/10 px-5 py-4 text-center text-base font-bold text-teal">
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
                          className="text-muted hover:text-danger"
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

              {!charterAllowsCampaign(intake) && (intake.businessName.trim() || intake.website.trim()) ? (
                <NicheGateCard intake={intake} />
              ) : (
                <>
                  {!wizardReady(intake) && (
                    <div
                      className="mt-4 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger"
                      dir={locale === "en" ? "ltr" : "rtl"}
                      data-testid="wizard-missing-fields"
                    >
                      <p className="sr-only">{t("wizard.missingHeading")}</p>
                      <ul className="list-disc ps-5">
                        {missingRequired.map((f) => (
                          <li key={String(f.field)}>
                            <button
                              type="button"
                              className="text-start font-semibold underline decoration-danger/50 underline-offset-4"
                              onClick={() => focusWizardField(f.field)}
                            >
                              {t("wizard.missingPillar").replace("{name}", f.label[locale])}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <Button
                    type="button"
                    size="lg"
                    variant={wizardReady(intake) ? "gold" : "outline"}
                    className={cn(
                      "mt-6 w-full text-base font-black shadow-[0_12px_32px_rgba(15,39,68,0.12)]",
                      !wizardReady(intake) && "border-danger text-danger hover:border-danger hover:text-danger",
                    )}
                    disabled={running}
                    data-testid="cta-build-full"
                    data-cta-state={wizardReady(intake) ? "ready" : "missing"}
                    onClick={() => {
                      if (!wizardReady(intake)) {
                        const first = missingRequired[0];
                        if (first) focusWizardField(first.field);
                        return;
                      }
                      void startBuild();
                    }}
                  >
                    {wizardReady(intake) ? (
                      <>
                        <WandSparkles className="size-5" />
                        {t("cta.buildReady")}
                        <span className="sr-only">{t("cta.build")}</span>
                      </>
                    ) : (
                      t("wizard.missingPillar").replace(
                        "{name}",
                        missingRequired[0]?.label[locale] ?? "",
                      )
                    )}
                  </Button>
                </>
              )}
              {offerBlocked ? (
                <OfferGateBanner
                  onSkip={() => {
                    const d = loadDraft();
                    setIntake(d.intake);
                    setOfferBlocked(false);
                  }}
                />
              ) : null}
            </section>
        </>
      )}

      {phase === "interview" && (
        <section className="agency-board p-5 sm:p-8">
          <CoachPanel report={coachReport} onApply={applyCoach} />
          <div className="mb-4">
            <DocumentIngest intake={intake} onApply={applyIngest} variant="compact" />
          </div>
          <div className="agency-guidance mb-6 rounded-[14px] px-4 py-3 text-sm font-semibold">
            {t("interview.guidance")}
          </div>
          <h2 className="agency-display mb-2 text-3xl">{t("interview.title")}</h2>
          {isAnyDemoIntake(intake) && !cmoFieldsMissing(intake) ? (
            <p className="mb-3 inline-flex rounded-[10px] bg-teal/15 px-3 py-1 text-xs font-black uppercase tracking-wide text-teal">
              {t("interview.demoBadge")}
            </p>
          ) : null}
          <p className="mb-6 text-sm text-muted">
            {cmoFieldsMissing(intake) ? t("interview.lead") : t("interview.leadFilled")}
          </p>
          <Field label={isFreeService(intake) ? t("interview.modelFree") : t("interview.model")} filled={Boolean(intake.businessModel.trim())}>
            <Textarea
              value={intake.businessModel}
              onChange={(e) => patch({ businessModel: e.target.value })}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            {!isFreeService(intake) && (
              <>
                <Field label={t("interview.aov")} filled={Boolean(intake.avgOrderValue.trim())}>
                  <Input value={intake.avgOrderValue} onChange={(e) => patch({ avgOrderValue: e.target.value })} />
                </Field>
                <Field label={t("interview.margin")} filled={Boolean(intake.marginPercent.trim())}>
                  <Input value={intake.marginPercent} onChange={(e) => patch({ marginPercent: e.target.value })} />
                </Field>
                <Field label={t("interview.cac")} filled={Boolean(intake.targetCac.trim())}>
                  <Input value={intake.targetCac} onChange={(e) => patch({ targetCac: e.target.value })} />
                </Field>
              </>
            )}
            <Field label={t("interview.budget")} filled={Boolean(intake.monthlyBudget.trim())}>
              <Input value={intake.monthlyBudget} onChange={(e) => patch({ monthlyBudget: e.target.value })} />
            </Field>
          </div>
          <Field label={t("interview.past")} filled={Boolean(intake.pastAds.trim())}>
            <Textarea value={intake.pastAds} onChange={(e) => patch({ pastAds: e.target.value })} />
          </Field>
          <Field label={t("interview.results")} filled={Boolean(intake.pastResults.trim())}>
            <Textarea value={intake.pastResults} onChange={(e) => patch({ pastResults: e.target.value })} />
          </Field>
          <Field label={t("interview.failed")} filled={Boolean(intake.whatFailed.trim())}>
            <Textarea value={intake.whatFailed} onChange={(e) => patch({ whatFailed: e.target.value })} />
          </Field>
          <div className="mt-2">
            <MediaAssetUploader
              assets={intake.mediaAssets ?? []}
              intake={intake}
              onChange={(mediaAssets) => patch({ mediaAssets })}
            />
          </div>
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
          hitlError={hitlError}
          onApprove={() => void advanceHitl()}
          onBack={() => {
            setHitlError("");
            setPhase("wizard");
            setStep(4);
          }}
          onNewCampaign={newCampaign}
          onPack={(next) => {
            setPack(next);
            setAgentStatus(next.agentStatus);
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
  hitlError,
  onApprove,
  onBack,
  onNewCampaign,
  onPack,
}: {
  pack: CampaignPack | null;
  agentStatus: Record<AgentId, AgentStatus>;
  running: boolean;
  hitlError: string;
  onApprove: () => void;
  onBack: () => void;
  onNewCampaign: () => void;
  onPack?: (p: CampaignPack) => void;
}) {
  const { t, locale } = useI18n();
  const gate = nextHitlGate(agentStatus, pack);
  const diagnosisReady = Boolean(pack?.diagnosis?.hypotheses?.length);
  const diagnosisApproved = Boolean(pack?.diagnosis?.approved);
  const approveLabel =
    running ? t("agents.advancing") : gate === "diagnostic" ? t("cta.approve") : t("cta.continueStage");
  return (
    <section className="hitl-agents">
      {diagnosisApproved ? (
        <NextStepCard compact />
      ) : (
        <>
          <h2 className="agency-display mb-2 text-center text-3xl">{t("agents.title")}</h2>
          <p className="mb-6 text-center text-sm text-muted">{t("agents.hitl")}</p>
          <ul className="mb-8 space-y-2">
            {AGENT_KEYS.map((a, i) => (
              <li
                key={a.id}
                className="agency-board flex items-center justify-between px-4 py-3"
              >
                <span className="text-sm font-semibold">
                  {i + 1}. {t(a.key)}
                </span>
                <StatusPill status={agentStatus[a.id]} />
              </li>
            ))}
          </ul>
        </>
      )}

      {pack && (
        <div className="agency-board p-5 sm:p-7">
          {pack.completeAd ? (
            <CompleteAdCard completeAd={pack.completeAd} locale={locale} compact />
          ) : null}
          <DiagnosisCmoStrip cmoIdeas={pack.cmoIdeas} locale={locale} />
          <ResearchDesk pack={pack} locale={locale} onPack={onPack} compact />
          <DiagnosisGaps
            report={pack.intakeReport}
            moves={pack.cmoIdeas?.gapPlan?.moves}
            locale={locale}
          />
          {onPack ? (
            <div className="mt-4" data-photo-offer="diagnosis">
              <p className="mb-2 text-sm font-black text-teal">{t("diagnosis.photoOffer")}</p>
              <ImageOfferPicker pack={pack} locale={locale} onPack={onPack} defaultOpen />
            </div>
          ) : null}
          {(pack.intake.mediaAssets ?? []).filter((a) => a.kind === "image" && a.publicSrc).length > 0 ? (
            <div className="mb-4 mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
              {(pack.intake.mediaAssets ?? [])
                .filter((a) => a.kind === "image" && a.publicSrc && !/\.svg$/i.test(a.publicSrc))
                .slice(0, 6)
                .map((a) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={a.id} src={a.publicSrc} alt={a.name} className="aspect-square w-full rounded-lg object-cover" />
                ))}
            </div>
          ) : null}
          <p className="mb-4 text-sm text-muted">{pack.diagnosis.summary[locale]}</p>
          <div className="space-y-3">
            {pack.diagnosis.hypotheses.map((h, i) => (
              <article key={i} className="agency-guidance rounded-[14px] p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-navy px-2 py-0.5 text-xs font-bold text-white">
                    {AREA_LABEL[h.area][locale]}
                  </span>
                  <span className="text-xs text-muted">{h.confidence}</span>
                </div>
                <p className="font-semibold text-navy">{h.finding[locale]}</p>
                <p className="mt-1 text-sm text-muted">{h.evidence[locale]}</p>
                <p className="mt-2 text-sm font-semibold text-teal">{h.recommendation[locale]}</p>
              </article>
            ))}
          </div>
          {pack.intakeReport.inconsistencies.length > 0 && (
            <div className="mt-3 rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
              {pack.intakeReport.inconsistencies.map((inc, i) => (
                <p key={i}>
                  <strong>{inc.issue[locale]}:</strong> {inc.detail[locale]}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="hitl-actions" data-testid="hitl-actions">
        {hitlError ? (
          <p className="mb-3 text-center text-sm font-semibold text-danger" role="alert" data-testid="hitl-error">
            {hitlError}
          </p>
        ) : null}
        {diagnosisReady && !diagnosisApproved ? (
          <Button
            type="button"
            size="lg"
            className="w-full"
            disabled={running}
            onClick={onApprove}
            data-testid="hitl-approve"
          >
            {approveLabel}
          </Button>
        ) : diagnosisApproved ? null : (
          <p className="mb-3 text-center text-sm font-semibold text-navy" data-testid="hitl-need-intake">
            {t("agents.needIntake")}
          </p>
        )}
        {diagnosisApproved ? null : (
          <button type="button" className="mt-3 w-full text-sm text-muted" onClick={onBack} data-testid="hitl-reject">
            {t("cta.reject")}
          </button>
        )}
        <div className="mt-6 border-t border-navy/10 pt-5">
          <Button type="button" size="lg" className="w-full" onClick={onNewCampaign} data-testid="hitl-new">
            {t("cta.newOther")}
          </Button>
          <p className="mt-2 text-center text-sm text-muted">{t("cta.newHint")}</p>
        </div>
      </div>
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
    idle: "bg-mint text-muted",
    running: "bg-lime/40 text-[var(--lime-ink)] animate-pulse",
    blocked: "bg-sand text-muted",
    needs_approval: "bg-danger/20 text-danger",
    approved: "bg-teal text-white",
    complete: "bg-teal text-white",
    refused: "bg-danger text-white",
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-sm font-bold ${colors[status]}`}>
      {t(key)}
    </span>
  );
}
