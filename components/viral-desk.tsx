"use client";

import { useMemo, useRef, useState } from "react";
import { Check, Copy, Film, Loader2 } from "lucide-react";
import type {
  BioPack,
  CampaignPack,
  CarouselPack,
  Intake,
  Locale,
  RemixResult,
  TrendPack,
  VideoAnalysis,
  ViralDeskState,
  ViralScriptPack,
  VoiceProfile,
} from "@/lib/types";
import { applyVoiceToIntake, voiceFromIntake, voiceIsSaved } from "@/lib/engine/voice";
import {
  buildBioPack,
  buildCarouselPack,
  buildTrendPack,
  buildVideoAnalysis,
  buildViralScripts,
  remixFromSource,
  remixNeedTranscript,
} from "@/lib/engine/viral-content";
import { buildPostingCalendar, postingKindLabel } from "@/lib/engine/posting-calendar";
import { loadDraft, saveDraft } from "@/lib/storage";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { VoiceFields } from "@/components/voice-fields";
import { cn } from "@/lib/utils";

type Tab = "scripts" | "carousel" | "bio" | "trends" | "remix" | "analyze";

function factsPayload(intake: Intake) {
  return {
    businessName: intake.businessName,
    category: intake.category,
    description: intake.description,
    location: intake.location,
    audience: intake.audience,
    uniqueAdvantage: intake.uniqueAdvantage,
    biggestProblem: intake.biggestProblem,
    offer: intake.offer,
    whatsapp: intake.whatsapp,
    clinicHours: intake.clinicHours,
    brandTone: intake.brandTone,
    voice: intake.voice,
  };
}

async function firstFrame(file: File): Promise<{ mime: string; data: string; durationSec: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.src = url;
    const fail = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    video.onerror = fail;
    video.onloadedmetadata = () => {
      const seekTo = Math.min(0.4, Math.max(0, (video.duration || 1) * 0.05));
      const onSeek = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = Math.min(640, video.videoWidth || 480);
          canvas.height = Math.min(640, video.videoHeight || 480);
          const ctx = canvas.getContext("2d");
          if (!ctx) return fail();
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
          URL.revokeObjectURL(url);
          resolve({ mime: "image/jpeg", data: dataUrl, durationSec: video.duration || 0 });
        } catch {
          fail();
        }
      };
      video.currentTime = seekTo;
      video.onseeked = onSeek;
    };
  });
}

export function ViralDesk({
  pack,
  packLang,
  onPack,
  embedded = false,
}: {
  pack?: CampaignPack | null;
  packLang?: Locale;
  onPack?: (p: CampaignPack) => void;
  embedded?: boolean;
}) {
  const { t, locale } = useI18n();
  const lang = packLang ?? locale;
  const draft = loadDraft();
  const intake0 = pack?.intake ?? draft.intake;
  const [voice, setVoice] = useState<VoiceProfile>(() => voiceFromIntake(intake0));
  const [savedFlash, setSavedFlash] = useState(false);
  const [saveHint, setSaveHint] = useState("");
  const [idea, setIdea] = useState(pack?.viral?.idea ?? "");
  const [tab, setTab] = useState<Tab>("scripts");
  const [busy, setBusy] = useState<Tab | "voice" | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [scripts, setScripts] = useState<ViralScriptPack | undefined>(pack?.viral?.scripts);
  const [carousel, setCarousel] = useState<CarouselPack | undefined>(pack?.viral?.carousel);
  const [bios, setBios] = useState<BioPack | undefined>(pack?.viral?.bios);
  const [trends, setTrends] = useState<TrendPack | undefined>(pack?.viral?.trends);
  const [remix, setRemix] = useState<RemixResult | undefined>(pack?.viral?.remix);
  const [analysis, setAnalysis] = useState<VideoAnalysis | undefined>(pack?.viral?.analysis);
  const [remixUrl, setRemixUrl] = useState("");
  const [remixText, setRemixText] = useState("");
  const [caption, setCaption] = useState("");
  const [videoName, setVideoName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const videoFile = useRef<File | null>(null);

  const currentIntake = useMemo((): Intake => {
    const base = pack?.intake ?? loadDraft().intake;
    return applyVoiceToIntake(base, voice);
  }, [pack?.intake, voice]);

  function persistVoice() {
    if (!voiceIsSaved(voice)) {
      setSaveHint(t("viral.voiceNeed"));
      return;
    }
    const nextIntake = applyVoiceToIntake(pack?.intake ?? loadDraft().intake, voice);
    const d = loadDraft();
    saveDraft({ ...d, intake: { ...d.intake, ...nextIntake, voice } });
    if (pack && onPack) {
      onPack({ ...pack, intake: nextIntake, updatedAt: new Date().toISOString() });
    }
    setSaveHint(t("viral.voiceSaved"));
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1600);
  }

  function commitViral(partial: Partial<ViralDeskState>) {
    if (!pack || !onPack) return;
    const viral: ViralDeskState = {
      idea,
      scripts,
      carousel,
      bios,
      trends,
      remix,
      analysis,
      ...partial,
    };
    onPack({ ...pack, viral, updatedAt: new Date().toISOString() });
  }

  async function callViral(mode: Tab, extra: Record<string, unknown> = {}) {
    setBusy(mode);
    try {
      const res = await fetch("/api/viral", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          language: lang,
          idea,
          facts: factsPayload(currentIntake),
          ...extra,
        }),
      });
      const data = (await res.json()) as {
        scripts?: ViralScriptPack;
        carousel?: CarouselPack;
        bios?: BioPack;
        trends?: TrendPack;
        remix?: RemixResult;
        analysis?: VideoAnalysis;
      };
      if (mode === "scripts") {
        const next = data.scripts ?? buildViralScripts(currentIntake, idea, lang);
        setScripts(next);
        setTab("scripts");
        commitViral({ idea, scripts: next });
      } else if (mode === "carousel") {
        const next = data.carousel ?? buildCarouselPack(currentIntake, idea, lang);
        setCarousel(next);
        setTab("carousel");
        commitViral({ idea, carousel: next });
      } else if (mode === "bio") {
        const next = data.bios ?? buildBioPack(currentIntake, lang);
        setBios(next);
        setTab("bio");
        commitViral({ bios: next });
      } else if (mode === "trends") {
        const next = data.trends ?? buildTrendPack(currentIntake, lang);
        setTrends(next);
        setTab("trends");
        commitViral({ trends: next });
      } else if (mode === "remix") {
        const next = data.remix ?? remixNeedTranscript(lang, remixUrl);
        setRemix(next);
        setTab("remix");
        commitViral({ remix: next });
      } else if (mode === "analyze") {
        const next = data.analysis ?? buildVideoAnalysis(currentIntake, lang, { caption });
        setAnalysis(next);
        setTab("analyze");
        commitViral({ analysis: next });
      }
    } catch {
      if (mode === "scripts") {
        const next = buildViralScripts(currentIntake, idea, lang);
        setScripts(next);
        commitViral({ idea, scripts: next });
      }
    } finally {
      setBusy(null);
    }
  }

  async function copyText(id: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1400);
  }

  async function onRemix() {
    if (!remixText.trim() && !remixUrl.trim()) {
      const next = remixNeedTranscript(lang);
      setRemix(next);
      setTab("remix");
      return;
    }
    if (remixText.trim() && !remixUrl.trim()) {
      await callViral("remix", { transcript: remixText });
      return;
    }
    await callViral("remix", { sourceUrl: remixUrl, transcript: remixText });
    if (!remixText.trim()) {
      /* API may still return need_transcript — local fallback if fetch failed */
      if (!remix) setRemix(remixFromSource(currentIntake, lang, { sourceText: remixText, sourceUrl: remixUrl }));
    }
  }

  async function onAnalyze() {
    let extra: Record<string, unknown> = { caption, transcript: caption };
    const file = videoFile.current;
    if (file) {
      const frame = await firstFrame(file);
      if (frame) {
        extra = { ...extra, imageBase64: frame.data, mime: frame.mime, durationSec: frame.durationSec };
      }
    }
    await callViral("analyze", extra);
  }

  const days = pack ? buildPostingCalendar(pack, lang, 30) : [];
  const tabs: { id: Tab; key: `viral.tab${string}` }[] = [
    { id: "scripts", key: "viral.tabScripts" },
    { id: "carousel", key: "viral.tabCarousel" },
    { id: "bio", key: "viral.tabBio" },
    { id: "trends", key: "viral.tabTrends" },
    { id: "remix", key: "viral.tabRemix" },
    { id: "analyze", key: "viral.tabAnalyze" },
  ];

  return (
    <section id="viral" data-testid="viral-desk" className={embedded ? "mt-8" : ""}>
      {!embedded && (
        <>
          <p className="agency-kicker">{t("viral.title")}</p>
          <h2 className="agency-display mt-2 text-3xl sm:text-4xl">{t("viral.title")}</h2>
          <p className="mt-3 max-w-2xl text-base text-muted">{t("viral.lead")}</p>
        </>
      )}
      {embedded && (
        <h2 className="mb-2 text-xl font-black text-navy">{t("viral.title")}</h2>
      )}

      <ol className="mt-6 grid gap-3 sm:grid-cols-3">
        {(
          [
            ["01", "viral.step1", "viral.step1b"],
            ["02", "viral.step2", "viral.step2b"],
            ["03", "viral.step3", "viral.step3b"],
          ] as const
        ).map(([n, title, body]) => (
          <li key={n} className="rounded-[20px] border border-[rgba(8,17,31,0.08)] bg-white p-4 shadow-[var(--shadow-card)]">
            <p className="inline-flex size-8 items-center justify-center rounded-full bg-teal text-sm font-black text-white">{n}</p>
            <p className="mt-3 text-lg font-black text-navy">{t(title)}</p>
            <p className="mt-1 text-sm text-muted">{t(body)}</p>
          </li>
        ))}
      </ol>

      <div className="mt-6 rounded-[20px] border border-[rgba(8,17,31,0.08)] bg-white p-5 shadow-[var(--shadow-card)] sm:p-7">
        <p className="agency-kicker">{t("viral.step")} 01</p>
        <h3 className="mt-2 text-xl font-black text-navy">{t("viral.step1")}</h3>
        <div className="mt-4">
          <VoiceFields value={voice} onChange={setVoice} />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button type="button" data-testid="viral-save-voice" onClick={persistVoice}>
            {savedFlash ? <Check className="size-4" /> : null}
            {t("viral.saveVoice")}
          </Button>
          {saveHint ? (
            <p data-testid="viral-voice-saved" className="text-sm font-bold text-teal">
              {saveHint}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 rounded-[20px] border border-[rgba(8,17,31,0.08)] bg-white p-5 shadow-[var(--shadow-card)] sm:p-7">
        <p className="agency-kicker">{t("viral.step")} 02</p>
        <h3 className="mt-2 text-xl font-black text-navy">{t("viral.step2")}</h3>
        <Label className="mt-4">{t("viral.idea")}</Label>
        <Textarea
          data-testid="viral-idea"
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          placeholder={t("viral.ideaPh")}
          className="min-h-20"
        />
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" data-testid="viral-make-7" disabled={busy !== null} onClick={() => void callViral("scripts")}>
            {busy === "scripts" ? <Loader2 className="size-4 animate-spin" /> : null}
            {t("viral.make7")}
          </Button>
          <Button type="button" variant="outline" disabled={busy !== null} onClick={() => void callViral("carousel")}>
            {t("viral.carousel")}
          </Button>
          <Button type="button" variant="outline" disabled={busy !== null} onClick={() => void callViral("bio")}>
            {t("viral.bio")}
          </Button>
          <Button type="button" variant="outline" disabled={busy !== null} onClick={() => void callViral("trends")}>
            {t("viral.trends")}
          </Button>
        </div>
      </div>

      <div className="mt-4 rounded-[20px] border border-[rgba(8,17,31,0.08)] bg-white p-5 shadow-[var(--shadow-card)] sm:p-7">
        <p className="agency-kicker">{t("viral.step")} 03</p>
        <h3 className="mt-2 text-xl font-black text-navy">{t("viral.step3")}</h3>
        <div className="mt-4 flex flex-wrap gap-1">
          {tabs.map((tabRow) => (
            <button
              key={tabRow.id}
              type="button"
              onClick={() => setTab(tabRow.id)}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-bold",
                tab === tabRow.id ? "bg-ink text-[#F7F3EA]" : "bg-ivory text-navy hover:bg-sand/40",
              )}
            >
              {t(tabRow.key as "viral.tabScripts")}
            </button>
          ))}
        </div>

        {tab === "scripts" && (
          <div className="mt-4 space-y-3" data-testid="viral-scripts">
            {!scripts ? <p className="text-sm text-muted">{t("viral.make7")}</p> : null}
            {scripts?.source === "gemini" ? <p className="text-xs font-bold text-teal">{t("viral.sourceGemini")}</p> : scripts ? <p className="text-xs text-muted">{t("viral.sourceTemplate")}</p> : null}
            {scripts?.scripts.map((s) => (
              <article key={s.id} className="rounded-[16px] border border-[rgba(8,17,31,0.08)] bg-ivory p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-teal">{s.style[lang]}</p>
                <p className="mt-2 text-lg font-black text-navy">{s.hook}</p>
                <p className="mt-2 text-sm leading-relaxed text-foreground">{s.spoken}</p>
                <p className="mt-2 text-sm font-bold text-teal">{s.cta}</p>
                <ul className="mt-2 text-xs text-muted">
                  {s.beats.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  onClick={() => void copyText(s.id, `${s.hook}\n${s.spoken}\n${s.cta}`)}
                >
                  <Copy className="size-3.5" />
                  {copied === s.id ? t("viral.copied") : t("viral.copy")}
                </Button>
              </article>
            ))}
          </div>
        )}

        {tab === "carousel" && (
          <div className="mt-4" data-testid="viral-carousel">
            {!carousel ? <p className="text-sm text-muted">{t("viral.carousel")}</p> : null}
            {carousel ? (
              <>
                <p className="text-sm font-bold text-navy">{t("viral.caption")}: {carousel.caption}</p>
                <ol className="mt-3 grid gap-2 sm:grid-cols-2">
                  {carousel.slides.map((slide) => (
                    <li key={slide.index} className="rounded-[16px] border border-[rgba(8,17,31,0.08)] bg-ivory p-3">
                      <p className="text-xs font-black text-teal">{t("viral.slide")} {slide.index}</p>
                      <p className="mt-1 font-black text-navy">{slide.headline}</p>
                      <p className="mt-1 text-sm text-muted">{slide.body}</p>
                      <p className="mt-2 text-xs text-muted">{slide.visual}</p>
                    </li>
                  ))}
                </ol>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  onClick={() => void copyText("carousel", `${carousel.caption}\n${carousel.slides.map((s) => `${s.index}. ${s.headline}\n${s.body}`).join("\n")}`)}
                >
                  <Copy className="size-3.5" />
                  {copied === "carousel" ? t("viral.copied") : t("viral.copy")}
                </Button>
              </>
            ) : null}
          </div>
        )}

        {tab === "bio" && (
          <div className="mt-4 space-y-2" data-testid="viral-bios">
            {!bios ? <p className="text-sm text-muted">{t("viral.bio")}</p> : null}
            {bios
              ? (["instagram", "tiktok", "facebook", "linkedin", "whatsapp"] as const).map((k) => (
                  <article key={k} className="rounded-[16px] border border-[rgba(8,17,31,0.08)] bg-ivory p-3">
                    <p className="text-xs font-black uppercase text-teal">{k}</p>
                    <p className="mt-1 text-sm text-navy">{bios[k]}</p>
                    <Button type="button" size="sm" variant="ghost" onClick={() => void copyText(k, bios[k])}>
                      {copied === k ? t("viral.copied") : t("viral.copy")}
                    </Button>
                  </article>
                ))
              : null}
          </div>
        )}

        {tab === "trends" && (
          <div className="mt-4" data-testid="viral-trends">
            {!trends ? <p className="text-sm text-muted">{t("viral.trends")}</p> : null}
            {trends ? (
              <>
                <p className="rounded-[12px] bg-ivory px-3 py-2 text-xs font-bold text-navy">{trends.disclaimer}</p>
                <ul className="mt-3 space-y-2">
                  {trends.angles.map((a) => (
                    <li key={a.id} className="rounded-[16px] border border-[rgba(8,17,31,0.08)] p-3">
                      <p className="font-black text-navy">{a.title}</p>
                      <p className="mt-1 text-sm text-foreground">{a.hook}</p>
                      <p className="mt-1 text-xs text-muted">{a.why}</p>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>
        )}

        {tab === "remix" && (
          <div className="mt-4 space-y-3" data-testid="viral-remix">
            <Label>{t("viral.url")}</Label>
            <Input data-testid="viral-remix-url" value={remixUrl} placeholder={t("viral.urlPh")} onChange={(e) => setRemixUrl(e.target.value)} />
            <Label>{t("viral.transcript")}</Label>
            <Textarea
              data-testid="viral-remix-text"
              value={remixText}
              placeholder={t("viral.transcriptPh")}
              onChange={(e) => setRemixText(e.target.value)}
            />
            <Button type="button" data-testid="viral-remix-go" disabled={busy !== null} onClick={() => void onRemix()}>
              {busy === "remix" ? <Loader2 className="size-4 animate-spin" /> : null}
              {t("viral.remixGo")}
            </Button>
            {remix?.status === "need_transcript" ? (
              <p data-testid="viral-remix-fallback" className="rounded-[12px] border border-coral/30 bg-coral-mist p-3 text-sm font-bold text-navy">
                {t("viral.needTranscript")}: {remix.note}
              </p>
            ) : null}
            {remix?.status === "ok" && remix.script ? (
              <article className="rounded-[16px] bg-ivory p-4">
                <p className="text-xs text-muted">{remix.note}</p>
                <p className="mt-2 text-lg font-black text-navy">{remix.script.hook}</p>
                <p className="mt-2 text-sm">{remix.script.spoken}</p>
                <Button type="button" size="sm" className="mt-3" variant="outline" onClick={() => void copyText("remix", `${remix.script!.hook}\n${remix.script!.spoken}\n${remix.script!.cta}`)}>
                  {copied === "remix" ? t("viral.copied") : t("viral.copy")}
                </Button>
              </article>
            ) : null}
          </div>
        )}

        {tab === "analyze" && (
          <div className="mt-4 space-y-3" data-testid="viral-analyze">
            <Label>{t("viral.upload")}</Label>
            <input
              ref={fileRef}
              type="file"
              accept="video/mp4,video/webm"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                videoFile.current = f;
                setVideoName(f?.name ?? "");
              }}
            />
            <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
              <Film className="size-4" />
              {videoName || t("viral.upload")}
            </Button>
            <Label>{t("viral.transcript")}</Label>
            <Textarea data-testid="viral-analyze-caption" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder={t("viral.transcriptPh")} />
            <Button type="button" data-testid="viral-analyze-go" disabled={busy !== null} onClick={() => void onAnalyze()}>
              {busy === "analyze" ? <Loader2 className="size-4 animate-spin" /> : null}
              {t("viral.analyzeGo")}
            </Button>
            {analysis ? (
              <div className="rounded-[16px] border border-[rgba(8,17,31,0.08)] bg-ivory p-4">
                <p className="text-xs font-bold text-navy">{analysis.disclaimer}</p>
                <dl className="mt-3 grid gap-2 sm:grid-cols-3">
                  <div>
                    <dt className="text-xs text-muted">{t("viral.hookPotential")}</dt>
                    <dd className="text-2xl font-black text-navy" data-testid="viral-score-hook">{analysis.hookPotential}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">{t("viral.clarity")}</dt>
                    <dd className="text-2xl font-black text-navy">{analysis.clarity}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">{t("viral.ctaScore")}</dt>
                    <dd className="text-2xl font-black text-navy">{analysis.ctaClarity}</dd>
                  </div>
                </dl>
                <ul className="mt-3 list-disc space-y-1 pe-4 text-sm text-muted">
                  {analysis.notes.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {days.length >= 30 ? (
        <section data-testid="viral-calendar-30" className="mt-6">
          <h3 className="text-lg font-black text-navy">{t("viral.calendar")}</h3>
          <ol className="mobile-card-grid cols-2 mt-3 sm:grid-cols-3 lg:grid-cols-5">
            {days.slice(0, 30).map((d) => (
              <li key={d.day} className="min-w-0 rounded-[16px] border border-[rgba(8,17,31,0.08)] bg-white p-3">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-teal">
                  {t("cal7.day")} {d.day} · {postingKindLabel(d.kind, lang)}
                </p>
                <p className="mt-1 text-xs text-muted">{d.channelLabel[lang]}</p>
                <p className="mt-1 line-clamp-3 text-sm font-black leading-snug text-navy">{d.headline}</p>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </section>
  );
}
