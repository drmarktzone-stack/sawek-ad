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

export function TaskWorkspace() {
  const { t, locale } = useI18n();
  const client = useIsClient();
  const { user } = useAuth();
  const [intake, setIntake] = useState<Intake>(emptyIntake());
  const [pack, setPack] = useState<CampaignPack | null>(null);
  const [ready, setReady] = useState(false);
  const [building, setBuilding] = useState(false);

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
    setBuilding(true);
    try {
      const report = validateIntake(intake);
      const diagnosis = diagnose(intake, report);
      const variants = generateVariants(intake);
      const assembled = assemblePack(intake, {
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
      const next = await overlayPackAgency(assembled);
      void syncCampaign(next);
      saveDraft({ intake, step: 4, phase: "agents", packId: next.id });
      setPack(next);
    } finally {
      setBuilding(false);
    }
  }

  if (!ready) {
    return <p className="p-10 text-center text-muted">…</p>;
  }

  const palette = paletteForIntake(intake);
  const complete = pack?.completeAd;

  return (
    <div className="mx-auto w-full min-w-0 max-w-4xl px-3 py-6 sm:px-4 sm:py-8" data-testid="task-workspace" dir={locale === "en" ? "ltr" : "rtl"}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <LangLink href="/dashboard" className="inline-flex items-center gap-2 text-sm font-bold text-muted hover:text-navy">
          <LayoutDashboard className="size-4" />
          {t("nav.dashboard")}
        </LangLink>
        <LangLink href="/" className="inline-flex items-center gap-2 text-sm font-bold text-muted hover:text-navy">
          <ArrowLeft className="size-4" />
          {t("task.backHome")}
        </LangLink>
      </div>

      <p className="agency-kicker">{t("task.kicker")}</p>
      <h1 className="agency-display mt-2 text-3xl sm:text-5xl">{t("task.title")}</h1>
      <p className="mt-3 max-w-2xl text-base text-muted">{t("task.lead")}</p>

      {ctx.empty ? (
        <div className="agency-empty mt-8 rounded-[20px] px-5 py-8 text-center" data-testid="task-empty">
          <p className="agency-display text-2xl">{t("task.empty")}</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">{t("task.emptyHint")}</p>
          <Button asChild className="mt-5">
            <LangLink href="/">{t("home.cta.primary")}</LangLink>
          </Button>
        </div>
      ) : (
        <>
          <section className="agency-board mt-8 p-5 sm:p-6" data-testid="task-business" data-business-id={ctx.businessId}>
            <p className="text-[12px] font-black uppercase tracking-[0.18em] text-teal">{t("task.understanding")}</p>
            <h2 className="mt-2 text-2xl font-black text-navy">{ctx.facts.name || t("task.unnamed")}</h2>
            <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted">{t("task.category")}</dt>
                <dd className="font-semibold">{ctx.facts.category || "UNKNOWN"}</dd>
              </div>
              <div>
                <dt className="text-muted">{t("complete.audience")}</dt>
                <dd className="font-semibold">{ctx.facts.audience || "UNKNOWN"}</dd>
              </div>
              <div>
                <dt className="text-muted">{t("complete.offer")}</dt>
                <dd className="font-semibold">{ctx.facts.offer || t("complete.offerUnknown")}</dd>
              </div>
              <div>
                <dt className="text-muted">{t("task.objective")}</dt>
                <dd className="font-semibold">{ctx.facts.objective || "UNKNOWN"}</dd>
              </div>
              <div>
                <dt className="text-muted">{t("task.location")}</dt>
                <dd className="font-semibold">{ctx.facts.location || "UNKNOWN"}</dd>
              </div>
              <div>
                <dt className="text-muted">{t("task.assets")}</dt>
                <dd className="font-semibold">{ctx.facts.assets}</dd>
              </div>
            </dl>
            {ctx.facts.advantage ? <p className="mt-3 text-sm text-navy">{ctx.facts.advantage}</p> : null}
            {ctx.facts.problem ? <p className="mt-1 text-sm text-muted">{ctx.facts.problem}</p> : null}
            <p className="mt-3 text-[11px] text-muted">{t("task.isolation")}: {ctx.businessId} · {t("task.historyCount")}: {ctx.history.length}</p>
          </section>

          <section className="agency-ink mt-4 p-5 sm:p-6" data-testid="task-detected">
            <p className="text-[12px] font-black uppercase tracking-[0.18em] text-[#F5C518]">{t("task.detected")}</p>
            <h2 className="agency-display-cream mt-2 text-2xl">{t("task.createAd")}</h2>
            <p className="mt-2 text-sm text-[#C9D0D8]">{t("task.createAdLead")}</p>
            <Button
              type="button"
              size="lg"
              variant="coral"
              className="mt-5"
              disabled={building}
              data-testid="task-complete-ad"
              onClick={() => void createCompleteAd()}
            >
              <WandSparkles className="size-5" />
              {building ? t("task.building") : t("complete.kicker")}
            </Button>
          </section>

          {complete ? (
            <div className="mt-6">
              <CompleteAdCard completeAd={complete} locale={locale} />
              {complete.directionsExhausted ? (
                <p className="mb-4 text-sm font-semibold text-muted" data-testid="task-exhausted">
                  {complete.noveltyReason || t("task.exhausted")}
                </p>
              ) : null}
              <div className="overflow-hidden rounded-[16px] border border-navy/10">
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

          <section className="mt-6 rounded-[16px] border border-navy/10 bg-white p-5">
            <p className="flex items-center gap-2 text-sm font-black text-navy">
              <Sparkles className="size-4 text-teal" />
              {t("task.next")}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
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
          </section>

          <div className="mt-8 border-t border-navy/10 pt-6">
            <p className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-muted">{t("task.fullCampaign")}</p>
            <WizardFlow embedded taskMode />
          </div>
        </>
      )}
    </div>
  );
}
