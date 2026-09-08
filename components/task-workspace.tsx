"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, LayoutDashboard, Sparkles, WandSparkles } from "lucide-react";
import type { CampaignPack, Intake } from "@/lib/types";
import { WizardFlow } from "@/components/wizard-flow";
import { CompleteAdCard } from "@/components/complete-ad-card";
import { ResearchDesk } from "@/components/research-desk";
import { CampaignAdVisual } from "@/components/ad-mockup";
import { Button } from "@/components/ui/button";
import { LangLink } from "@/components/lang-link";
import { useI18n } from "@/components/i18n-provider";
import { loadDraft, getCampaign, INGEST_APPLIED_EVENT, saveDraft } from "@/lib/storage";
import { assemblePack, overlayPackAgency } from "@/lib/engine/run";
import { validateIntake } from "@/lib/engine/validate";
import { diagnose } from "@/lib/engine/diagnose";
import { generateVariants } from "@/lib/engine/copy";
import { syncCampaign } from "@/lib/supabase";
import { emptyIntake } from "@/lib/engine/validate";
import { buildTaskContext } from "@/lib/engine/task-context";
import { paletteForIntake } from "@/lib/brand-kit";
import { studioStillsForIntake } from "@/lib/studio-stills";
import { useIsClient } from "@/lib/use-is-client";
import { useAuth } from "@/components/auth-provider";
import { OsDisclosure, OsEmpty, OsLoading, OsPage, OsRow, OsSection, OsUnknown, OverlayStatus, ValueOrUnknown } from "@/components/command/primitives";
import { CampaignJourney } from "@/components/campaign-journey";
import { OfferGateBanner } from "@/components/offer-gate-banner";
import { offerGate } from "@/lib/engine/offer-builder";

export function TaskWorkspace() {
  const { t, locale } = useI18n();
  const client = useIsClient();
  const { user } = useAuth();
  const [intake, setIntake] = useState<Intake>(emptyIntake());
  const [pack, setPack] = useState<CampaignPack | null>(null);
  const [ready, setReady] = useState(false);
  const [building, setBuilding] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);

  function hydrate() {
    const d = loadDraft();
    setIntake(d.intake);
    const existing = d.packId ? getCampaign(d.packId) : null;
    setPack(existing ?? null);
    setReady(true);
  }

  useEffect(() => {
    if (!client) return;
    hydrate();
    const onApplied = () => hydrate();
    window.addEventListener(INGEST_APPLIED_EVENT, onApplied);
    return () => window.removeEventListener(INGEST_APPLIED_EVENT, onApplied);
  }, [client]);

  const ctx = useMemo(
    () => buildTaskContext({ intake, pack, ownerId: user?.id }),
    [intake, pack, user?.id],
  );

  async function createCompleteAd() {
    if (ctx.empty) return;
    const draft = loadDraft();
    const liveIntake = draft.intake;
    const gate = offerGate(liveIntake, pack);
    if (!gate.ok) {
      setIntake(liveIntake);
      setGateOpen(true);
      return;
    }
    setGateOpen(false);
    setBuilding(true);
    try {
      const report = validateIntake(liveIntake);
      const diagnosis = diagnose(liveIntake, report);
      const variants = generateVariants(liveIntake);
      const assembled = assemblePack(liveIntake, {
        report,
        diagnosis,
        variants,
        agentStatus: {
          intake: "complete",
          diagnostic: "complete",
          strategic: "complete",
          media: "complete",
          optimizer: "complete",
        },
        ...(pack?.id ? { id: pack.id } : {}),
      });
      const next = await overlayPackAgency({
        ...assembled,
        offerBlueprint: liveIntake.offerBlueprint ?? pack?.offerBlueprint,
        hsoStudio: pack?.hsoStudio ?? draft.hsoStudio,
      });
      void syncCampaign(next);
      saveDraft({ intake: liveIntake, step: 4, phase: "agents", packId: next.id, hsoStudio: next.hsoStudio });
      setIntake(liveIntake);
      setPack(next);
    } finally {
      setBuilding(false);
    }
  }

  if (!ready) {
    return <OsLoading />;
  }

  const palette = paletteForIntake(intake);
  const complete = pack?.completeAd;
  const openHitl =
    Boolean(pack) &&
    (loadDraft().phase === "agents" ||
      pack?.diagnosis.approved === false ||
      pack?.agentStatus.diagnostic === "needs_approval");

  return (
    <OsPage data-testid="task-workspace" dir={locale === "en" ? "ltr" : "rtl"}>
      <CampaignJourney compact />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <LangLink href="/dashboard" className="inline-flex items-center gap-2 text-sm font-bold text-muted hover:text-navy">
          <LayoutDashboard className="size-4" />
          {t("nav.command")}
        </LangLink>
        <LangLink href="/" className="inline-flex items-center gap-2 text-sm font-bold text-muted hover:text-navy">
          <ArrowLeft className="size-4" />
          {t("task.backHome")}
        </LangLink>
      </div>

      <p className="os-kicker">{t("task.kicker")}</p>
      <h1 className="os-title mt-2 text-3xl sm:text-5xl">{t("task.title")}</h1>
      <p className="mt-3 max-w-2xl text-base text-muted">{t("task.lead")}</p>

      {ctx.empty ? (
        <div className="mt-8" data-testid="task-empty">
          <OsEmpty>
            <p className="os-title text-2xl">{t("task.empty")}</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted">{t("task.emptyHint")}</p>
            <Button asChild className="mt-5">
              <LangLink href="/">{t("home.cta.primary")}</LangLink>
            </Button>
          </OsEmpty>
        </div>
      ) : (
        <>
          <OsSection kicker={t("os.scanSummary")} title={ctx.facts.name || t("task.unnamed")}>
            <section data-testid="task-business" data-business-id={ctx.businessId}>
              <dl>
                <OsRow label={t("task.category")}>
                  <ValueOrUnknown value={ctx.facts.category} />
                </OsRow>
                <OsRow label={t("complete.audience")}>
                  <ValueOrUnknown value={ctx.facts.audience} />
                </OsRow>
                <OsRow label={t("complete.offer")}>
                  {ctx.facts.offer || t("complete.offerUnknown")}
                </OsRow>
                <OsRow label={t("task.objective")}>
                  <ValueOrUnknown value={ctx.facts.objective} />
                </OsRow>
                <OsRow label={t("task.location")}>
                  <ValueOrUnknown value={ctx.facts.location} />
                </OsRow>
                <OsRow label={t("task.assets")}>{ctx.facts.assets}</OsRow>
                <OsRow label={t("os.confidence")}>
                  {pack?.intakeReport.completeness != null ? `${pack.intakeReport.completeness}/100` : <OsUnknown />}
                </OsRow>
              </dl>
              {ctx.facts.advantage ? <p className="mt-3 text-sm text-navy">{ctx.facts.advantage}</p> : null}
              {ctx.facts.problem ? <p className="mt-1 text-sm text-muted">{ctx.facts.problem}</p> : null}
              <p className="mt-3 text-[11px] text-muted">{t("task.isolation")}: {ctx.businessId} · {t("task.historyCount")}: {ctx.history.length}</p>
            </section>
          </OsSection>

          <section className="agency-ink mt-2 p-5 sm:p-6" data-testid="task-detected">
            <p className="text-[12px] font-black uppercase tracking-[0.18em] text-[#9FD4C8]">{t("task.detected")}</p>
            <h2 className="agency-display-cream mt-2 text-3xl">{t("complete.kicker")}</h2>
            <p className="mt-2 text-sm text-[#C9D0D8]">{t("task.createAdLead")}</p>
            <Button
              type="button"
              size="lg"
              variant="coral"
              className="mt-5 w-full sm:w-auto"
              disabled={building}
              data-testid="task-complete-ad"
              onClick={() => void createCompleteAd()}
            >
              <WandSparkles className="size-5" />
              {building ? t("task.building") : t("complete.kicker")}
            </Button>
            {gateOpen ? (
              <OfferGateBanner
                onSkip={() => {
                  const d = loadDraft();
                  setIntake(d.intake);
                  setGateOpen(false);
                }}
              />
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline" className="border-white/20 bg-white/8 text-[#F7F3EA] hover:bg-white hover:text-ink">
                <LangLink href="/tools/hso">{t("nav.hso")}</LangLink>
              </Button>
              <Button asChild size="sm" variant="outline" className="border-white/20 bg-white/8 text-[#F7F3EA] hover:bg-white hover:text-ink">
                <LangLink href="/tools/offer">{t("nav.offerTool")}</LangLink>
              </Button>
              <Button asChild size="sm" variant="outline" className="border-white/20 bg-white/8 text-[#F7F3EA] hover:bg-white hover:text-ink">
                <LangLink href="/growth/market">{t("os.findOpp")}</LangLink>
              </Button>
              <Button asChild size="sm" variant="outline" className="border-white/20 bg-white/8 text-[#F7F3EA] hover:bg-white hover:text-ink">
                <LangLink href="/">{t("os.buildCampaign")}</LangLink>
              </Button>
              <Button asChild size="sm" variant="outline" className="border-white/20 bg-white/8 text-[#F7F3EA] hover:bg-white hover:text-ink">
                <LangLink href="/growth/market">{t("os.analyzeMarket")}</LangLink>
              </Button>
              <Button asChild size="sm" variant="outline" className="border-white/20 bg-white/8 text-[#F7F3EA] hover:bg-white hover:text-ink">
                <LangLink href="/growth/experiments">{t("os.runExperiment")}</LangLink>
              </Button>
            </div>
          </section>

          {complete ? (
            <div className="mt-6">
              <CompleteAdCard completeAd={complete} locale={locale} />
              {complete.directionsExhausted ? (
                <p className="mb-4 text-sm font-semibold text-muted" data-testid="task-exhausted">
                  {complete.noveltyReason || t("task.exhausted")}
                </p>
              ) : null}
              <p className="os-kicker mb-2">{t("os.studio.preview")}</p>
              <div className="overflow-hidden rounded-[12px] border border-[var(--line)]">
                <CampaignAdVisual
                  locale={locale}
                  palette={palette}
                  assets={intake.mediaAssets}
                  index={0}
                  className="aspect-[1.91/1] h-auto min-h-[180px]"
                  headline={complete.locales[locale]?.headline}
                  cta={complete.locales[locale]?.cta}
                  fallbackSrc={studioStillsForIntake(intake)[0]?.dataUrl}
                  composition={complete.imageComposition}
                />
              </div>
              <OverlayStatus composition={complete.imageComposition} />
              {complete.locales[locale]?.imageTreatment ? (
                <p className="mt-2 text-xs text-muted" data-testid="image-treatment">
                  {t("complete.visual")}: {complete.locales[locale]?.imageTreatment}
                </p>
              ) : null}
            </div>
          ) : null}

          {pack ? (
            <ResearchDesk pack={pack} locale={locale} onPack={setPack} compact />
          ) : null}

          <OsSection kicker={t("task.next")}>
            <p className="mb-3 flex items-center gap-2 text-sm font-black text-navy">
              <Sparkles className="size-4 text-teal" />
              {t("task.next")}
            </p>
            <div className="flex flex-wrap gap-2">
              {pack ? (
                <Button asChild size="sm">
                  <LangLink href={`/campaigns/${pack.id}`}>{t("campaigns.open")}</LangLink>
                </Button>
              ) : null}
              <Button asChild size="sm" variant="outline">
                <LangLink href="/studio">{t("nav.studio")}</LangLink>
              </Button>
              <Button asChild size="sm" variant="outline">
                <LangLink href="/growth">{t("nav.growth")}</LangLink>
              </Button>
            </div>
          </OsSection>

          <OsDisclosure summary={t("task.fullCampaign")} defaultOpen={openHitl}>
            <WizardFlow embedded taskMode />
          </OsDisclosure>
        </>
      )}
    </OsPage>
  );
}
