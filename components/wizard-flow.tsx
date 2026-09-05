"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, WandSparkles } from "lucide-react";
import type { AgentId, AgentStatus, CampaignPack, Competitor, Intake, WizardStep } from "@/lib/types";
import { demoIntake, consumePendingDemo, clearPendingDemo, applyPediatricDemoDraft, applyCatalogDemoDraft, isPediatricDemo, isAnyDemoIntake, relocalizePediatricIntake, relocalizeCatalogIntake, canonicalDoctorName, resolvePendingDemoId } from "@/lib/demo";
import { installDemoPack } from "@/lib/active-pack";
import { DemoPicker } from "@/components/demo-picker";
import { cmoFieldsMissing, emptyIntake, wizardMissingFields, wizardReady } from "@/lib/engine/validate";
import { assemblePack, idleStatus, overlayPackAgency, runIntakeAndDiagnosis, runMedia, runOptimizerStage, runStrategic } from "@/lib/engine/run";
import { loadDraft, saveDraft, getCampaign, INGEST_APPLIED_EVENT } from "@/lib/storage";
import { syncCampaign } from "@/lib/supabase";
import { uid } from "@/lib/utils";
import { MAX_COMPETITORS } from "@/lib/factory-formats";
import { AREA_LABEL } from "@/lib/i18n";
import { markEmptyCampaign, wantsEmptyCampaign, clearEmptyCampaign, explicitDemoInUrl, demoParamFromUrl, applyEmptyCampaignHydrate, EMPTY_CAMPAIGN_EVENT, releaseEmptyIfTypedName } from "@/lib/empty-campaign";
import { isBlockedEmptySessionName } from "@/lib/clinic-leak";
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
import { DiagnosisCmoStrip, DiagnosisGaps } from "@/components/diagnosis-gaps";
import { ImageOfferPicker } from "@/components/image-offer-picker";
import { coachIntake } from "@/lib/engine/coach";
import { useIsClient } from "@/lib/use-is-client";
import { cn } from "@/lib/utils";

function Field({
  label,
  hint,
  filled,
  children,
}: {
  label: string;
  hint?: string;
  filled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      <Label className={filled ? "text-teal" : "text-navy"}>{label}</Label>
      {hint ? <p className="mb-2 text-sm font-medium text-muted">{hint}</p> : null}
      <div className={filled ? "agency-field-wrap-filled" : undefined}>{children}</div>
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
      const demoId = resolvePendingDemoId() || demoParamFromUrl() || "samer";
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
          : relocalizeCatalogIntake(
              { ...d.intake, businessName: canonicalDoctorName(d.intake.businessName) },
              locale,
            );
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
    if (isPediatricDemo(intake) || isAnyDemoIntake(intake)) {
      setIntake((prev) => relocalizeCatalogIntake(prev, locale));
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

  function loadDemo() {
    applyDemo("samer");
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
    if (cmoFieldsMissing(intake)) {
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
    <div className={embedded ? "mx-auto w-full min-w-0 max-w-3xl px-3 py-5 sm:px-4 sm:py-8" : "mx-auto w-full min-w-0 max-w-3xl px-3 py-6 sm:px-4 sm:py-12"}>
      {!embedded && <DepartmentRail />}
      {embedded ? (
        <div className="mb-6 flex flex-col items-center gap-3">
          <DemoPicker onSelect={(id) => applyDemo(id)} />
          <Button type="button" size="lg" onClick={newCampaign}>
            {t("cta.new")}
          </Button>
          <p className="max-w-md text-center text-sm text-muted">{t("cta.newHint")}</p>
        </div>
      ) : (
        <div className="mb-6 flex flex-col items-center gap-3">
          <DemoPicker onSelect={(id) => applyDemo(id)} />
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
              <p className="mb-6 text-center text-base text-muted">{t("type.hint")}</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => patch({ type: opt.id as Intake["type"] })}
                    className={`rounded-[20px] border p-6 text-start text-xl font-black transition-all ${
                      intake.type === opt.id
                        ? "border-ink bg-ink text-[#F7F3EA] shadow-[var(--shadow-lift)]"
                        : "border-[rgba(8,17,31,0.1)] bg-white text-navy hover:border-teal hover:shadow-[var(--shadow-card)]"
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
                        ? "border-ink bg-ink text-[#F7F3EA] shadow-[var(--shadow-lift)]"
                        : "border-[rgba(8,17,31,0.1)] bg-white text-navy hover:border-teal hover:shadow-[var(--shadow-card)]"
                    }`}
                  >
                    <span className="block text-xl font-black">{opt.title}</span>
                    <span className={`mt-2 block text-sm font-medium ${
                      (intake.operatingModel ?? "paid") === opt.id ? "text-[#C9D0D8]" : "text-muted"
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
            <section className="agency-board p-5 sm:p-8">
              <div className="agency-guidance mb-6 rounded-[14px] px-4 py-3 text-sm font-semibold">
                {t("wizard.formHint")}
              </div>
              <Field label={t("biz.name")} filled={Boolean(intake.businessName.trim())}>
                <Input
                  value={intake.businessName}
                  placeholder={t("biz.namePh")}
                  onChange={(e) => patch({ businessName: e.target.value })}
                />
              </Field>
              <Field label={t("biz.category")} filled={Boolean(intake.category.trim())}>
                <Input
                  value={intake.category}
                  placeholder={t("biz.categoryPh")}
                  onChange={(e) => patch({ category: e.target.value })}
                />
              </Field>
              <Field label={t("biz.description")} filled={Boolean(intake.description.trim())}>
                <Textarea
                  value={intake.description}
                  placeholder={t("biz.descPh")}
                  onChange={(e) => patch({ description: e.target.value })}
                />
              </Field>
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
                  onChange={(e) => patch({ website: e.target.value })}
                />
              </Field>
              <Field label={t("biz.whatsapp")} filled={Boolean((intake.whatsapp ?? "").trim())}>
                <Input
                  value={intake.whatsapp ?? ""}
                  placeholder={t("biz.whatsappPh")}
                  onChange={(e) => patch({ whatsapp: e.target.value })}
                  inputMode="tel"
                />
              </Field>
              <Field label={t("biz.hours")} filled={Boolean((intake.clinicHours ?? "").trim())}>
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
            <section className="agency-board space-y-8 p-5 sm:p-8">
              <div className="agency-guidance rounded-[14px] px-4 py-3 text-sm font-semibold">
                {t("wizard.formHint")}
              </div>
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

              <Button
                type="button"
                size="lg"
                className="mt-6 w-full text-base font-black shadow-[0_12px_32px_rgba(15,39,68,0.12)]"
                disabled={!wizardReady(intake) || running}
                onClick={startBuild}
              >
                <WandSparkles className="size-5" />
                {t("cta.build")}
              </Button>
              {!wizardReady(intake) && (
                <div
                  className="mt-3 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger"
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
          onApprove={advanceHitl}
          onBack={() => {
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
  onApprove,
  onBack,
  onNewCampaign,
  onPack,
}: {
  pack: CampaignPack | null;
  agentStatus: Record<AgentId, AgentStatus>;
  running: boolean;
  onApprove: () => void;
  onBack: () => void;
  onNewCampaign: () => void;
  onPack?: (p: CampaignPack) => void;
}) {
  const { t, locale } = useI18n();
  return (
    <section>
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

      {pack && (
        <div className="agency-board p-5 sm:p-7">
          <DiagnosisCmoStrip cmoIdeas={pack.cmoIdeas} locale={locale} />
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
    running: "bg-gold/20 text-gold animate-pulse",
    blocked: "bg-navy/5 text-muted",
    needs_approval: "bg-danger/20 text-danger",
    approved: "bg-navy text-white",
    complete: "bg-navy text-white",
    refused: "bg-danger text-white",
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-sm font-bold ${colors[status]}`}>
      {t(key)}
    </span>
  );
}
