"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, Download, FileText, Lightbulb, Link2, Pencil, Save, Shield, WandSparkles } from "lucide-react";
import type { CampaignPack, Locale, OptimizerResultInput } from "@/lib/types";
import { LOCALES, STRATEGY_META, VARIANT_META, t } from "@/lib/i18n";
import { DESIGN_STYLES } from "@/lib/design-styles";
import { copyAllAds, downloadTxt, printPdf } from "@/lib/export";
import { produceAd } from "@/lib/engine/produce-ad";
import { adviseFromResults } from "@/lib/engine/optimizer";
import { highlightsOf, missionOf, pillarsOf } from "@/lib/engine/brief";
import { saveDraft, upsertCampaign } from "@/lib/storage";
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

export function ResultView({
  pack,
  onChange,
}: {
  pack: CampaignPack;
  onChange: (p: CampaignPack) => void;
}) {
  const { locale, t: tr } = useI18n();
  const router = useRouter();
  const [packLang, setPackLang] = useState<Locale>(locale);
  const [copied, setCopied] = useState<string | null>(null);
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
  const featured = ads.find((a) => a.kind === "strong_offer");
  const rest = ads.filter((a) => a.kind !== "strong_offer");

  async function copyText(id: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  }

  function save() {
    const next = { ...pack, saved: true };
    upsertCampaign(next);
    onChange(next);
  }

  function makeAd(styleId: string) {
    const ad = produceAd(pack.intake, styleId, idea, packLang);
    const next = { ...pack, producedAds: [ad, ...pack.producedAds] };
    upsertCampaign(next);
    onChange(next);
  }

  function activatePlan() {
    const next = { ...pack, planActivated: true, saved: true };
    upsertCampaign(next);
    onChange(next);
  }

  function copyLink() {
    void copyText("link", window.location.href);
  }

  function edit() {
    saveDraft({ intake: pack.intake, step: 4 });
    router.push("/");
  }

  function runOpt() {
    const advice = adviseFromResults(pack.intake, pack.media, optIn);
    const next = { ...pack, optimizerRuns: [advice, ...pack.optimizerRuns] };
    upsertCampaign(next);
    onChange(next);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white">{tr("result.ready")}</h1>
          <p className="mt-1 text-zinc-400">{pack.name}</p>
        </div>
        <Button asChild>
          <Link href="/">
            <WandSparkles className="size-4" />
            {tr("cta.new")}
          </Link>
        </Button>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Button type="button" onClick={save} variant={pack.saved ? "dark" : "default"}>
          <Save className="size-4" />
          {pack.saved ? tr("cta.saved") : tr("cta.save")}
        </Button>
        <Button type="button" variant="dark" onClick={() => printPdf(pack, packLang)}>
          <Download className="size-4" />
          {tr("cta.pdf")}
        </Button>
        <Button type="button" variant="dark" onClick={() => downloadTxt(pack, packLang)}>
          <FileText className="size-4" />
          {tr("cta.txt")}
        </Button>
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
        <Button type="button" variant={pack.planActivated ? "dark" : "default"} onClick={activatePlan}>
          <Shield className="size-4" />
          {pack.planActivated ? tr("cta.activated") : tr("cta.activatePlan")}
        </Button>
        <div className="ms-auto flex items-center gap-2">
          <span className="text-xs text-zinc-500">{tr("result.packLang")}</span>
          <div className="flex rounded-full border border-white/10 p-0.5">
            {LOCALES.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => setPackLang(l.id)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-semibold",
                  packLang === l.id ? "bg-omni-yellow text-black" : "text-zinc-300",
                )}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-omni-card p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">
            {tr("result.score")}
          </p>
          <p className="mt-1 text-3xl font-black text-omni-yellow">
            {pack.intakeReport.completeness}/100
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full bg-omni-yellow"
              style={{ width: `${pack.intakeReport.completeness}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            {locale === "he"
              ? "כמה מהשדות מולאו — לא ציון ביצועים."
              : locale === "ar"
                ? "كم من الحقول مُلئت — ليس درجة أداء."
                : "How many fields were filled — not a performance score."}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-omni-card p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">
            {tr("result.scenario")}
          </p>
          {pack.media.scenarioFromUserNumbers ? (
            <>
              <p className="mt-2 text-sm text-zinc-200">{pack.media.worstCase[locale]}</p>
              <p className="mt-2 text-sm text-zinc-200">{pack.media.realistic[locale]}</p>
            </>
          ) : (
            <p className="mt-2 text-sm text-zinc-400">{tr("result.noScenario")}</p>
          )}
        </div>
      </div>

      <div className="mb-8 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-omni-yellow/25 bg-omni-card p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-omni-yellow">{tr("result.mission")}</p>
          <p className="mt-2 text-sm leading-relaxed text-zinc-200">{missionOf(pack.intake)[locale]}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-omni-card p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-omni-yellow">{tr("result.highlights")}</p>
          <ul className="mt-2 list-disc space-y-1 pe-5 text-sm text-zinc-300">
            {highlightsOf(pack).map((h, i) => (
              <li key={i}>{h[locale]}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="mb-3 text-lg font-black">{tr("result.pillars")}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {pillarsOf(pack.intake).map((p) => (
            <div key={p.name} className="rounded-2xl border border-white/10 bg-omni-card p-4">
              <p className="text-sm font-black text-omni-yellow">{p.name}</p>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">{p.body[locale]}</p>
            </div>
          ))}
        </div>
      </div>

      {pack.intakeReport.missing.length > 0 && (
        <div className="mb-4 rounded-2xl border border-omni-yellow/30 bg-omni-yellow/5 p-4 text-sm text-zinc-200">
          {pack.intakeReport.missing.slice(0, 6).map((m) => (
            <p key={m.field}>
              <strong>{m.label[locale]}:</strong> {m.reason[locale]} — {m.impact[locale]}
            </p>
          ))}
        </div>
      )}
      {pack.intakeReport.inconsistencies.length > 0 && (
        <div className="mb-8 rounded-2xl border border-omni-red/40 bg-red-950/40 p-4 text-sm text-red-100">
          {pack.intakeReport.inconsistencies.map((inc, i) => (
            <p key={i}>
              <strong>{inc.issue[locale]}:</strong> {inc.detail[locale]}
            </p>
          ))}
        </div>
      )}

      <h2 className="mb-4 text-xl font-black">{tr("result.adsReady")}</h2>
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

      <div className="mt-10 rounded-2xl border border-white/10 bg-omni-card p-5">
        <h2 className="mb-4 text-lg font-black">{tr("media.title")}</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {pack.media.split.map((ch) => (
            <div key={ch.channel} className="rounded-xl border border-white/10 p-4">
              <p className="text-sm font-black uppercase text-omni-yellow">{ch.channel}</p>
              <p className="text-2xl font-black">{ch.budgetSharePercent}%</p>
              {ch.monthlyBudget != null && (
                <p className="text-xs text-zinc-400">{ch.monthlyBudget} ₪ / {ch.dailyBudget} ₪</p>
              )}
              <p className="mt-2 text-sm text-zinc-300">{ch.role[locale]}</p>
              <p className="mt-2 text-xs text-zinc-500">{ch.notes[locale]}</p>
            </div>
          ))}
        </div>
        <ul className="mt-4 list-disc pe-5 text-xs text-zinc-500">
          {pack.media.assumptions.map((a, i) => (
            <li key={i}>{a[locale]}</li>
          ))}
        </ul>
      </div>

      <div className="mt-10">
        <Accordion type="multiple" className="rounded-2xl border border-white/10 bg-omni-card px-4">
          {pack.strategy.map((block) => {
            const meta = STRATEGY_META.find((s) => s.id === block.id);
            return (
              <AccordionItem key={block.id} value={block.id}>
                <AccordionTrigger>
                  <span className="flex items-center gap-2">
                    {block.id === "marketing_diagnosis" && (
                      <Lightbulb className="size-4 text-omni-yellow" />
                    )}
                    {meta?.label[locale] ?? block.id}
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3">
                    {block.items.map((it, i) => (
                      <div key={i}>
                        <p className="font-semibold text-white">{it.title[locale]}</p>
                        <p className="whitespace-pre-wrap text-zinc-400">{it.body[locale]}</p>
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
          {DESIGN_STYLES.map((s, idx) => {
            const v = ads[idx % Math.max(ads.length, 1)];
            const dark = true;
            return (
              <article
                key={s.id}
                className="overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_0_24px_rgba(255,26,26,0.12)]"
              >
                <div
                  className="flex h-36 flex-col justify-end p-3"
                  style={{
                    background: `linear-gradient(160deg, ${s.palette[0]}, ${s.palette[1]} 70%, ${s.palette[2]})`,
                  }}
                >
                  <p className={`text-lg font-black leading-tight ${dark ? "text-white" : "text-black"}`}>
                    {v?.headline ?? pack.intake.businessName}
                  </p>
                </div>
                <div className="space-y-3 bg-omni-card p-4">
                  <p className="line-clamp-3 text-xs text-zinc-400">
                    {v?.primaryText ?? pack.intake.uniqueAdvantage}
                  </p>
                  <span className="inline-block rounded-full bg-omni-yellow px-3 py-1 text-[11px] font-black text-black">
                    {v?.cta ?? tr("design.produce")}
                  </span>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-bold text-zinc-500">{s.name[locale]}</p>
                    <div className="flex gap-1">
                      {s.palette.map((c) => (
                        <span
                          key={c}
                          className="size-3 rounded-full border border-white/20"
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
                <div
                  key={ad.id}
                  className="min-h-48 rounded-2xl p-6"
                  style={{
                    background: `linear-gradient(160deg, ${style?.palette[0]}, ${style?.palette[1]})`,
                    color: style?.palette[0] === "#f4f1ea" || style?.id === "pastel" || style?.id === "minimal-light" ? "#111" : "#fff",
                  }}
                >
                  <p className="text-xs font-bold uppercase opacity-70">{style?.name[locale]}</p>
                  <h3 className="mt-2 text-2xl font-black">{ad.headline}</h3>
                  <p className="mt-2 text-sm opacity-90">{ad.body}</p>
                  <p className="mt-4 text-xs opacity-70">{ad.visualNotes[locale]}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-10 rounded-2xl border border-white/10 bg-omni-card p-5">
        <h2 className="mb-4 text-lg font-black">{tr("opt.title")}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Spend ₪</Label>
            <Input value={optIn.spend} onChange={(e) => setOptIn({ ...optIn, spend: e.target.value })} />
          </div>
          <div>
            <Label>Leads</Label>
            <Input value={optIn.leads} onChange={(e) => setOptIn({ ...optIn, leads: e.target.value })} />
          </div>
          <div>
            <Label>Purchases / bookings</Label>
            <Input
              value={optIn.purchases}
              onChange={(e) => setOptIn({ ...optIn, purchases: e.target.value })}
            />
          </div>
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
        <ul className="mt-4 space-y-2 text-sm text-zinc-300">
          {pack.optimizer.ifThen.map((r, i) => (
            <li key={i}>
              <strong>IF</strong> {r.if[locale]} — <strong>THEN</strong> {r.then[locale]}
            </li>
          ))}
        </ul>
        {pack.optimizerRuns.map((run) => (
          <div key={run.createdAt} className="mt-3 rounded-xl border border-omni-yellow/20 p-3 text-sm">
            {run.advice.map((a, i) => (
              <p key={i}>{a[locale]}</p>
            ))}
          </div>
        ))}
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-omni-card p-5">
          <h3 className="mb-3 font-black">{tr("truth.quality")}</h3>
          <ul className="list-disc space-y-1 pe-5 text-sm text-zinc-400">
            <li>
              {locale === "he"
                ? "מספרים לא הומצאו. תרחישים רק מתוך תקציב/CAC שסיפקת."
                : locale === "ar"
                  ? "لم تُخترع أرقام. السيناريوهات فقط من ميزانية/CAC التي أعطيتها."
                  : "Numbers were not invented. Scenarios only from budget/CAC you supplied."}
            </li>
            <li>
              {locale === "he"
                ? "אין דירוגים, המלצות או אחוזי הצלחה בדויים."
                : locale === "ar"
                  ? "لا تقييمات أو توصيات أو نسب نجاح مختلقة."
                  : "No invented ratings, testimonials, or success rates."}
            </li>
            <li>
              {locale === "he"
                ? "תרחיש גרוע מוצג ליד תרחיש ריאלי — לא הבטחה ורודה."
                : locale === "ar"
                  ? "السيناريو السيئ بجانب الواقعي — لا وعد وردي."
                  : "Worst-case sits next to realistic — no rosy promise."}
            </li>
          </ul>
        </div>
        <div className="rounded-2xl border border-white/10 bg-omni-card p-5">
          <h3 className="mb-3 font-black">{tr("truth.layer")}</h3>
          <ul className="list-disc space-y-1 pe-5 text-sm text-zinc-400">
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
        "rounded-2xl border bg-omni-card p-5",
        featured ? "border-omni-yellow/50" : "border-white/10",
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-omni-yellow">{label}</p>
        <Button type="button" size="sm" variant="ghost" onClick={onCopy}>
          <Copy className="size-3.5" />
          {copied ? t(locale, "cta.copied") : t(locale, "cta.copy")}
        </Button>
      </div>
      <h3 className="text-xl font-black text-white">{headline}</h3>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">{body}</p>
      <span className="mt-4 inline-block rounded-lg bg-omni-yellow px-3 py-1 text-xs font-black text-black">
        {cta}
      </span>
    </article>
  );
}
