"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Copy, Download, ExternalLink, FileText, Lightbulb, Link2, Pencil, Save, Shield } from "lucide-react";
import type { CampaignPack, Locale, OptimizerResultInput } from "@/lib/types";
import { LOCALES, STRATEGY_META, VARIANT_META, orderedStrategy, t } from "@/lib/i18n";
import { DESIGN_STYLES, stylesForVertical } from "@/lib/design-styles";
import { detectVertical } from "@/lib/vertical";
import { copyAllAds, downloadTxt, printBible, printPdf } from "@/lib/export";
import { DepartmentRail } from "@/components/department-shell";
import { produceAd } from "@/lib/engine/produce-ad";
import { geminiAdCopy } from "@/lib/engine/gemini-enrich";
import { adviseFromResults } from "@/lib/engine/optimizer";
import { highlightsOf, missionOf, pillarsOf } from "@/lib/engine/brief";
import { saveDraft } from "@/lib/storage";
import { syncCampaign } from "@/lib/supabase";
import { NewCampaignCta } from "@/components/new-campaign-cta";
import { LangLink } from "@/components/lang-link";
import { withLang } from "@/lib/locale-url";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useI18n } from "@/components/i18n-provider";
import { LanguageToggle } from "@/components/header";
import { cn } from "@/lib/utils";
import { isFreeService } from "@/lib/operating-model";
import { CampaignAdVisual } from "@/components/ad-mockup";
import { studioStillsForIntake } from "@/lib/studio-stills";
import { ChannelPack } from "@/components/channel-pack";
import { LivePreviewStrip } from "@/components/live-preview-cards";
import { AnglesStrip } from "@/components/angles-strip";
import { CmoIdeasStrip } from "@/components/cmo-ideas-strip";
import { DiagnosisGaps } from "@/components/diagnosis-gaps";
import { buildCmoIdeasPack } from "@/lib/engine/cmo-ideas";
import { CoachImprovedStrip } from "@/components/coach-panel";
import { PublishToSocial } from "@/components/publish-to-social";
import { SiteAuditPanel } from "@/components/site-audit-panel";
import { VariationsPanel } from "@/components/variations-panel";
import { DeliveryKitButton } from "@/components/delivery-kit-button";
import { useAuth } from "@/components/auth-provider";
import { PlanGate } from "@/components/plan-gate";
import { canSaveAnotherCampaign, canUse } from "@/lib/plan";
import { loadCampaigns } from "@/lib/storage";

export function ResultView({
  pack,
  onChange,
}: {
  pack: CampaignPack;
  onChange: (p: CampaignPack) => void;
}) {
  const { locale, t: tr } = useI18n();
  const { plan } = useAuth();
  const router = useRouter();
  const [packLang, setPackLang] = useState<Locale>(locale);

  useEffect(() => {
    setPackLang(locale);
  }, [locale]);
  const [copied, setCopied] = useState<string | null>(null);
  const [saveLimit, setSaveLimit] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [idea, setIdea] = useState("");
  const [optIn, setOptIn] = useState<OptimizerResultInput>({
    spend: "",
    leads: "",
    purchases: "",
    ctr: "",
    notes: "",
  });

  const ads = useMemo(
    () => pack.variants.filter((v) => v.locale === packLang),
    [pack.variants, packLang],
  );
  /** Every campaign result gets CMO platforms + planning scorecard + gap plan — rebuild if an old pack lacks them. */
  const cmoIdeas = useMemo(
    () => (pack.cmoIdeas?.selected?.length ? pack.cmoIdeas : buildCmoIdeasPack(pack.intake, packLang)),
    [pack.cmoIdeas, pack.intake, packLang],
  );
  useEffect(() => {
    if (pack.cmoIdeas?.selected?.length) return;
    if (!cmoIdeas.selected.length) return;
    onChange({ ...pack, cmoIdeas, updatedAt: new Date().toISOString() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pack.id]);
  const featured = ads.find((a) => a.kind === "strong_offer");
  const rest = ads.filter((a) => a.kind !== "strong_offer");

  async function copyText(id: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  }

  function save() {
    const list = loadCampaigns();
    const exists = list.some((c) => c.id === pack.id);
    if (!canSaveAnotherCampaign(plan, list.length, exists)) {
      setSaveLimit(true);
      return;
    }
    const next = { ...pack, saved: true };
    void syncCampaign(next);
    onChange(next);
  }

  async function makeAd(styleId: string) {
    const ad = produceAd(pack.intake, styleId, idea, packLang);
    const overlay = await geminiAdCopy(pack.intake, packLang);
    const finalAd = overlay
      ? {
          ...ad,
          ...(overlay.headline ? { headline: overlay.headline } : {}),
          ...(overlay.copy ? { body: overlay.copy } : {}),
        }
      : ad;
    const next = { ...pack, producedAds: [finalAd, ...pack.producedAds] };
    void syncCampaign(next);
    onChange(next);
  }

  function activatePlan() {
    const next = { ...pack, planActivated: true, saved: true };
    void syncCampaign(next);
    onChange(next);
  }

  function copyLink() {
    void copyText("link", window.location.href);
  }

  function edit() {
    saveDraft({ intake: pack.intake, step: 4, phase: "wizard", packId: pack.id });
    router.push(withLang("/", locale));
  }

  function runOpt() {
    const advice = adviseFromResults(pack.intake, pack.media, optIn);
    const next = { ...pack, optimizerRuns: [advice, ...pack.optimizerRuns] };
    void syncCampaign(next);
    onChange(next);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <DepartmentRail />
      <div className="agency-ink mb-8 overflow-hidden p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[12px] font-black uppercase tracking-[0.22em] text-[#9FD4C8]">{tr("result.ready")}</p>
            <h1 className="agency-display-cream mt-2 text-3xl sm:text-5xl">{pack.name}</h1>
            {canUse(plan, "landing") ? (
            <LangLink
              href={`/lp/${pack.id}`}
              className="mt-4 inline-flex items-center gap-2 rounded-[12px] bg-coral px-4 py-2 text-sm font-black text-white"
            >
              <ExternalLink className="size-4" />
              {tr("end.clientLanding")}
            </LangLink>
            ) : (
              <PlanGate feature="landing" className="mt-3" />
            )}
          </div>
          <NewCampaignCta other hint className="items-end text-end [&_p]:text-[#C9D0D8]" />
        </div>
      </div>

      <SiteAuditPanel pack={pack} locale={packLang} onPack={onChange} />

      <LivePreviewStrip
        pack={pack}
        packLang={packLang}
        generatedImage={generatedImage}
        onGeneratedImage={setGeneratedImage}
        onPack={onChange}
      />

      <CmoIdeasStrip cmoIdeas={cmoIdeas} locale={packLang} />

      <ChannelPack
        pack={pack}
        packLang={packLang}
        generatedImage={generatedImage}
        onGeneratedImage={setGeneratedImage}
        onPack={onChange}
        skipLivePreview
      />

      <VariationsPanel pack={pack} locale={packLang} onPack={onChange} />

      <AnglesStrip angles={pack.angles} locale={packLang} />

      <div className="my-6 flex justify-center">
        <NewCampaignCta other hint className="items-center text-center" />
      </div>

      <div className="agency-board mb-6 p-5">
        <p className="agency-kicker mb-4">
          {tr("agents.title")}
        </p>
        <ul className="grid gap-2 sm:grid-cols-5">
          {(
            [
              ["intake", "agents.intake"],
              ["diagnostic", "agents.diagnostic"],
              ["strategic", "agents.strategic"],
              ["media", "agents.media"],
              ["optimizer", "agents.optimizer"],
            ] as const
          ).map(([id, key]) => (
            <li key={id} className="rounded-[14px] border border-[rgba(8,17,31,0.08)] bg-ivory px-3 py-3">
              <p className="text-[13px] font-semibold text-navy">{tr(key)}</p>
              <p className="mt-1 text-[13px] font-bold uppercase tracking-wide text-teal">
                {pack.agentStatus[id] === "approved" || pack.agentStatus[id] === "complete"
                  ? tr("status.complete")
                  : tr("status.needs_approval")}
              </p>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted">{tr("agents.hitl")}</p>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Button type="button" onClick={save} variant={pack.saved ? "dark" : "default"}>
          <Save className="size-4" />
          {pack.saved ? tr("cta.saved") : tr("cta.save")}
        </Button>
        {saveLimit ? <PlanGate feature="extraCampaign" /> : null}
        <Button type="button" variant="dark" onClick={() => printBible(pack, packLang)}>
          <Download className="size-4" />
          {tr("cta.bible")}
        </Button>
        <Button type="button" variant="dark" onClick={() => printPdf(pack, packLang)}>
          <Download className="size-4" />
          {tr("cta.pdf")}
        </Button>
        <Button type="button" variant="dark" onClick={() => downloadTxt(pack, packLang)}>
          <FileText className="size-4" />
          {tr("cta.txt")}
        </Button>
        <DeliveryKitButton pack={pack} compact />
        <Button
          type="button"
          variant="dark"
          onClick={() => copyText("all", copyAllAds(pack, packLang))}
        >
          <Copy className="size-4" />
          {copied === "all" ? tr("cta.copied") : tr("cta.copyAll")}
        </Button>
        <Button type="button" variant="dark" onClick={copyLink}>
          <Link2 className="size-4" />
          {copied === "link" ? tr("cta.copied") : tr("cta.copyLink")}
        </Button>
        <Button type="button" variant="dark" onClick={edit}>
          <Pencil className="size-4" />
          {tr("cta.edit")}
        </Button>
        <Button asChild variant="dark">
          <LangLink href={`/plan/${pack.id}`}>{tr("cta.plan")}</LangLink>
        </Button>
        <Button type="button" variant={pack.planActivated ? "dark" : "default"} onClick={activatePlan}>
          <Shield className="size-4" />
          {pack.planActivated ? tr("cta.activated") : tr("cta.activatePlan")}
        </Button>
        <PublishToSocial campaignId={pack.id} pack={pack} locale={packLang} compact />
        <div className="ms-auto flex items-center gap-2">
          <span className="text-xs text-muted">{tr("result.packLang")}</span>
          <div className="flex rounded-full border border-navy/10 p-0.5">
            {LOCALES.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => setPackLang(l.id)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-semibold",
                  packLang === l.id ? "bg-navy text-white" : "text-muted",
                )}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-2">
        <div className="agency-ink p-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9FD4C8]">
            {tr("result.score")}
          </p>
          <p className="agency-display-cream mt-2 text-5xl">
            {pack.intakeReport.completeness}
            <span className="text-2xl text-[#C9D0D8]">/100</span>
          </p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full bg-teal"
              style={{ width: `${pack.intakeReport.completeness}%` }}
            />
          </div>
          <p className="mt-3 text-sm text-[#C9D0D8]">
            {tr("result.scoreHint")}
          </p>
        </div>
        <div className="agency-board p-6">
          <p className="agency-kicker">
            {tr("result.scenario")}
          </p>
          {pack.media.scenarioFromUserNumbers ? (
            <>
              <p className="mt-2 text-sm text-foreground">{pack.media.worstCase[locale]}</p>
              <p className="mt-2 text-sm text-foreground">{pack.media.realistic[locale]}</p>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted">{tr("result.noScenario")}</p>
          )}
        </div>
      </div>

      {pack.coach && <CoachImprovedStrip report={pack.coach} locale={packLang} />}

      <div className="mb-8 grid gap-4 lg:grid-cols-2">
        <div className="agency-board p-6">
          <p className="agency-kicker">{tr("result.mission")}</p>
          <p className="mt-3 text-base leading-relaxed text-foreground">{missionOf(pack.intake)[locale]}</p>
        </div>
        <div className="agency-board p-6">
          <p className="agency-kicker">{tr("result.highlights")}</p>
          <ul className="mt-2 list-disc space-y-1 pe-5 text-sm text-muted">
            {highlightsOf(pack).map((h, i) => (
              <li key={i}>{h[locale]}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { href: "/discovery", key: "nav.discovery" as const, body: pack.agency?.discovery.icp[locale] },
          { href: "/strategy", key: "nav.strategy" as const, body: pack.agency?.strategy.positioning[locale] },
          { href: "/studio", key: "nav.studio" as const, body: cmoIdeas.selected[0] ? `${cmoIdeas.selected[0].name[locale] || cmoIdeas.selected[0].name.he} — ${cmoIdeas.selected[0].whyItWins[locale] || cmoIdeas.selected[0].whyItWins.he}` : pack.agency?.creative.hooks[0]?.hook[locale] },
          { href: "/media", key: "nav.media" as const, body: pack.agency?.mediaExtra.planOnly[locale] },
          { href: "/leads", key: "nav.leads" as const, body: pack.agency?.leads.magnet[locale] },
          { href: "/campaigns", key: "nav.campaigns" as const, body: tr("dept.opsLead") },
        ].map((card) => (
          <LangLink
            key={card.href}
            href={card.href}
            className="agency-board p-4 transition hover:-translate-y-0.5 hover:border-teal/40"
          >
            <p className="agency-kicker">{tr(card.key)}</p>
            <p className="mt-2 line-clamp-3 text-sm text-muted">{card.body}</p>
          </LangLink>
        ))}
      </div>

      <div className="mb-8">
        <h2 className="agency-display mb-4 text-2xl">{tr("result.pillars")}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {pillarsOf(pack.intake).map((p) => (
            <div key={p.name} className="agency-board p-4">
              <p className="text-sm font-black text-teal">{p.name}</p>
              <p className="mt-2 text-xs leading-relaxed text-muted">{p.body[locale]}</p>
            </div>
          ))}
        </div>
      </div>

      <DiagnosisGaps
        report={pack.intakeReport}
        moves={pack.cmoIdeas?.gapPlan?.moves}
        locale={locale}
        compact
      />
      {pack.intakeReport.inconsistencies.length > 0 && (
        <div className="mb-8 rounded-2xl border border-danger/40 bg-coral/10 p-4 text-sm text-danger">
          {pack.intakeReport.inconsistencies.map((inc, i) => (
            <p key={i}>
              <strong>{inc.issue[locale]}:</strong> {inc.detail[locale]}
            </p>
          ))}
        </div>
      )}

      <h2 className="agency-display mb-4 text-3xl">{tr("result.adsReady")}</h2>
      {featured && (
        <AdCard
          featured
          locale={packLang}
          headline={featured.headline}
          body={featured.primaryText}
          cta={featured.cta}
          kind={featured.kind}
          copied={copied === featured.kind}
          onCopy={() =>
            copyText(featured.kind, `${featured.headline}\n${featured.primaryText}\n${featured.cta}`)
          }
        />
      )}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {rest.map((v) => (
          <AdCard
            key={v.kind}
            locale={packLang}
            headline={v.headline}
            body={v.primaryText}
            cta={v.cta}
            kind={v.kind}
            copied={copied === v.kind}
            onCopy={() => copyText(v.kind, `${v.headline}\n${v.primaryText}\n${v.cta}`)}
          />
        ))}
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {(pack.agency?.creative.pieces ?? [])
          .filter(
            (p) =>
              (p.format === "landing" || p.format === "whatsapp") && p.locale === packLang,
          )
          .map((p) => (
            <article
              key={`${p.format}-${p.locale}`}
              className="agency-board p-5"
            >
              <p className="agency-kicker">
                {p.format === "landing" ? tr("end.landing") : tr("end.whatsapp")}
              </p>
              <h3 className="mt-1 font-black text-navy">{p.title}</h3>
              <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-6 text-muted">
                {p.body}
              </pre>
              {p.format === "landing" && pack.intake.website ? (
                <a
                  href={
                    pack.intake.website.startsWith("http")
                      ? pack.intake.website
                      : `https://${pack.intake.website}`
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-block text-xs font-bold text-gold"
                >
                  {pack.intake.website}
                </a>
              ) : null}
            </article>
          ))}
      </div>

      <div className="agency-board mt-10 p-5">
        <h2 className="mb-4 text-lg font-black">{tr("media.title")}</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {pack.media.split.map((ch) => (
            <div key={ch.channel} className="rounded-xl border border-navy/10 p-4">
              <p className="text-sm font-black uppercase text-gold">{ch.channel}</p>
              <p className="text-2xl font-black">{ch.budgetSharePercent}%</p>
              {ch.monthlyBudget != null && (
                <p className="text-xs text-muted">{ch.monthlyBudget} ₪ / {ch.dailyBudget} ₪</p>
              )}
              <p className="mt-2 text-sm text-muted">{ch.role[locale]}</p>
              <p className="mt-2 text-xs text-muted">{ch.notes[locale]}</p>
            </div>
          ))}
        </div>
        <ul className="mt-4 list-disc pe-5 text-xs text-muted">
          {pack.media.assumptions.map((a, i) => (
            <li key={i}>{a[locale]}</li>
          ))}
        </ul>
      </div>

      <div className="mt-10">
        <Accordion type="multiple" className="agency-board px-4">
          {orderedStrategy(pack.strategy).map((block) => {
            const meta = STRATEGY_META.find((s) => s.id === block.id);
            return (
              <AccordionItem key={block.id} value={block.id}>
                <AccordionTrigger>
                  <span className="flex items-center gap-2">
                    {block.id === "marketing_diagnosis" && (
                      <Lightbulb className="size-4 text-gold" />
                    )}
                    {meta?.label[locale] ?? block.id}
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3">
                    {block.items.map((it, i) => (
                      <div key={i}>
                        <p className="font-semibold text-navy">{it.title[locale]}</p>
                        <p className="whitespace-pre-wrap text-muted">{it.body[locale]}</p>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>

      <div className="mt-10">
        <h2 className="mb-2 text-xl font-black">{tr("result.mockups")}</h2>
        <Label>{tr("design.idea")}</Label>
        <Textarea
          className="mb-4"
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          placeholder={pack.intake.uniqueAdvantage}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stylesForVertical(detectVertical(pack.intake)).map((s, idx) => {
            const v = ads[idx % Math.max(ads.length, 1)];
            return (
              <article
                key={s.id}
                className="agency-board overflow-hidden"
              >
                <CampaignAdVisual
                  locale={locale}
                  palette={s.palette}
                  assets={pack.intake.mediaAssets}
                  index={idx}
                  className="h-44"
                  headline={v?.headline ?? pack.intake.businessName}
                  cta={v?.cta}
                  fallbackSrc={studioStillsForIntake(pack.intake)[idx % 8]?.dataUrl}
                />
                <div className="space-y-3 bg-white p-4">
                  <p className="line-clamp-3 text-xs text-muted">
                    {v?.primaryText ?? pack.intake.uniqueAdvantage}
                  </p>
                  <span className="inline-block rounded-full bg-navy px-3 py-1 text-[13px] font-black text-white">
                    {v?.cta ?? tr("design.produce")}
                  </span>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[13px] font-bold text-muted">{s.name[locale]}</p>
                    <div className="flex gap-1">
                      {s.palette.map((c) => (
                        <span
                          key={c}
                          className="size-3 rounded-full border border-navy/15"
                          style={{ background: c }}
                        />
                      ))}
                    </div>
                  </div>
                  <Button type="button" size="sm" className="w-full" onClick={() => makeAd(s.id)}>
                    {tr("design.make")}
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
        {pack.producedAds.length > 0 && (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {pack.producedAds.map((ad) => {
              const style = DESIGN_STYLES.find((s) => s.id === ad.styleId);
              return (
                <div key={ad.id} className="overflow-hidden rounded-2xl border border-navy/10">
                  <CampaignAdVisual
                    locale={locale}
                    palette={style?.palette ?? ["#111", "#333"]}
                    assets={pack.intake.mediaAssets}
                    index={0}
                    className="min-h-40"
                  >
                    <p className="text-xs font-bold uppercase text-navy/70">{style?.name[locale]}</p>
                    <h3 className="mt-2 text-2xl font-black text-navy">{ad.headline}</h3>
                  </CampaignAdVisual>
                  <div className="bg-white p-4">
                    <p className="text-sm text-muted">{ad.body}</p>
                    <p className="mt-3 text-xs text-muted">{ad.visualNotes[locale]}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="agency-board mt-10 p-5">
        <h2 className="mb-4 text-lg font-black">{tr("opt.title")}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Spend ₪</Label>
            <Input value={optIn.spend} onChange={(e) => setOptIn({ ...optIn, spend: e.target.value })} />
          </div>
          <div>
            <Label>{isFreeService(pack.intake) ? tr("opt.visits") : "Leads"}</Label>
            <Input value={optIn.leads} onChange={(e) => setOptIn({ ...optIn, leads: e.target.value })} />
          </div>
          {!isFreeService(pack.intake) && (
            <div>
              <Label>Purchases / bookings</Label>
              <Input
                value={optIn.purchases}
                onChange={(e) => setOptIn({ ...optIn, purchases: e.target.value })}
              />
            </div>
          )}
          <div>
            <Label>CTR %</Label>
            <Input value={optIn.ctr} onChange={(e) => setOptIn({ ...optIn, ctr: e.target.value })} />
          </div>
        </div>
        <div className="mt-3">
          <Label>Notes</Label>
          <Textarea value={optIn.notes} onChange={(e) => setOptIn({ ...optIn, notes: e.target.value })} />
        </div>
        <Button type="button" className="mt-4" onClick={runOpt}>
          {tr("opt.run")}
        </Button>
        <ul className="mt-4 space-y-2 text-sm text-muted">
          {pack.optimizer.ifThen.map((r, i) => (
            <li key={i}>
              <strong>IF</strong> {r.if[locale]} — <strong>THEN</strong> {r.then[locale]}
            </li>
          ))}
        </ul>
        {pack.optimizerRuns.map((run) => (
          <div key={run.createdAt} className="mt-3 rounded-xl border border-gold/20 p-3 text-sm">
            {run.advice.map((a, i) => (
              <p key={i}>{a[locale]}</p>
            ))}
          </div>
        ))}
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <div className="agency-board p-5">
          <h3 className="mb-3 font-black">{tr("truth.quality")}</h3>
          <ul className="list-disc space-y-1 pe-5 text-sm text-muted">
            <li>{tr("truth.numbers")}</li>
            <li>{tr("truth.noFake")}</li>
            <li>{tr("truth.worst")}</li>
          </ul>
        </div>
        <div className="agency-board p-5">
          <h3 className="mb-3 font-black">{tr("truth.layer")}</h3>
          <ul className="list-disc space-y-1 pe-5 text-sm text-muted">
            {pack.intakeReport.refusedGuesses.map((g, i) => (
              <li key={i}>{g[locale]}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-8 flex justify-center">
        <LanguageToggle />
      </div>
    </div>
  );
}

function AdCard({
  featured,
  locale,
  headline,
  body,
  cta,
  kind,
  copied,
  onCopy,
}: {
  featured?: boolean;
  locale: Locale;
  headline: string;
  body: string;
  cta: string;
  kind: string;
  copied: boolean;
  onCopy: () => void;
}) {
  const label = VARIANT_META[kind]?.label[locale] ?? kind;
  return (
    <article
      className={cn(
        "p-6",
        featured ? "agency-ink" : "agency-board",
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className={cn("text-xs font-bold uppercase tracking-[0.16em]", featured ? "text-[#9FD4C8]" : "text-teal")}>{label}</p>
        <Button type="button" size="sm" variant={featured ? "outline" : "ghost"} onClick={onCopy} className={featured ? "border-white/20 bg-white/8 text-[#F7F3EA] hover:bg-white hover:text-ink" : undefined}>
          <Copy className="size-3.5" />
          {copied ? t(locale, "cta.copied") : t(locale, "cta.copy")}
        </Button>
      </div>
      <h3 className={cn("text-2xl font-black", featured ? "agency-display-cream" : "agency-display")}>{headline}</h3>
      <p className={cn("mt-3 whitespace-pre-wrap text-base leading-relaxed", featured ? "text-[#E8E2D4]" : "text-muted")}>{body}</p>
      <span className={cn("mt-5 inline-block rounded-[10px] px-3 py-1.5 text-xs font-black", featured ? "bg-coral text-white" : "bg-ink text-[#F7F3EA]")}>
        {cta}
      </span>
    </article>
  );
}
