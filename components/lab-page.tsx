"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Copy, FlaskConical, ImagePlus } from "lucide-react";
import type {
  CampaignAngles,
  Intake,
  LabFeatureType,
  LabRun,
  Locale,
  ScoreResult,
  VisionResult,
} from "@/lib/types";
import { INCOMPLETE } from "@/lib/engine/angles";
import { loadDraft, getLabRun } from "@/lib/storage";
import { saveLabRun } from "@/lib/supabase";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Label, Textarea } from "@/components/ui/input";
import { AnglesStrip } from "@/components/angles-strip";
import { ConquerHeadline } from "@/components/stepper";
import { cn } from "@/lib/utils";
import { VISION_MAX_BYTES } from "@/lib/engine/gemini-client-caps";

type Tab = "angles" | "vision" | "score";

type GenerateAnglesRes = {
  ok?: boolean;
  useTemplates?: boolean;
  reason?: string;
  angles?: CampaignAngles;
};

type VisionApi = { ok?: boolean; useTemplates?: boolean; reason?: string } & Partial<VisionResult>;
type ScoreApi = { ok?: boolean; useTemplates?: boolean; reason?: string } & Partial<ScoreResult>;

type FailKind = "none" | "templates" | "gemini";

function failKindFrom(data: { ok?: boolean; useTemplates?: boolean; reason?: string } | null | undefined): FailKind {
  if (data?.reason === "no_key" || data?.useTemplates) return "templates";
  return "gemini";
}

function factsFromIntake(intake: Intake): string {
  return [
    intake.businessName && `businessName: ${intake.businessName}`,
    intake.category && `category: ${intake.category}`,
    intake.description && `description: ${intake.description}`,
    intake.audience && `audience: ${intake.audience}`,
    intake.biggestProblem && `biggestProblem: ${intake.biggestProblem}`,
    intake.uniqueAdvantage && `uniqueAdvantage: ${intake.uniqueAdvantage}`,
    intake.offer && `offer: ${intake.offer}`,
    intake.pastResults && `pastResults: ${intake.pastResults}`,
    intake.pastAds && `pastAds: ${intake.pastAds}`,
    intake.location && `location: ${intake.location}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function LabPage() {
  const { t, locale } = useI18n();
  const search = useSearchParams();
  const [tab, setTab] = useState<Tab>("angles");
  const [facts, setFacts] = useState("");
  const [busy, setBusy] = useState(false);
  const [failKind, setFailKind] = useState<FailKind>("none");
  const [copied, setCopied] = useState<string | null>(null);

  const [angles, setAngles] = useState<CampaignAngles | undefined>();
  const [vision, setVision] = useState<VisionResult | undefined>();
  const [preview, setPreview] = useState<string | null>(null);
  const [imageB64, setImageB64] = useState<string | null>(null);
  const [mime, setMime] = useState("image/jpeg");
  const [fileError, setFileError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const [adText, setAdText] = useState("");
  const [score, setScore] = useState<ScoreResult | undefined>();
  const [applied, setApplied] = useState(false);

  const intakeFacts = useMemo(() => facts, [facts]);

  useEffect(() => {
    const d = loadDraft();
    setFacts(factsFromIntake(d.intake));
    const runId = search.get("run");
    const qTab = search.get("tab");
    if (qTab === "angles" || qTab === "vision" || qTab === "score") setTab(qTab);
    if (!runId) return;
    const run = getLabRun(runId);
    if (!run) return;
    restoreRun(run);
  }, [search]);

  function restoreRun(run: LabRun) {
    const ft = run.featureType;
    if (ft === "angles" || ft === "vision" || ft === "score") setTab(ft);
    const out = run.output as Record<string, unknown> | undefined;
    if (ft === "angles" && out && typeof out === "object") {
      setAngles((out as { angles?: CampaignAngles }).angles ?? (out as CampaignAngles));
    }
    if (ft === "vision" && out && typeof out === "object") {
      setVision(out as unknown as VisionResult);
    }
    if (ft === "score" && out && typeof out === "object") {
      setScore(out as unknown as ScoreResult);
      const inp = run.input as { text?: unknown } | undefined;
      if (typeof inp?.text === "string") setAdText(inp.text);
    }
  }

  async function copy(id: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  }

  async function persist(featureType: LabFeatureType, input: unknown, output: unknown) {
    try {
      await saveLabRun(featureType, input, output);
    } catch {
      /* local path inside saveLabRun */
    }
  }

  async function runAngles() {
    setBusy(true);
    setFailKind("none");
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: intakeFacts,
          language: locale,
          mode: "angles",
          facts: intakeFacts,
        }),
      });
      const data = (await res.json()) as GenerateAnglesRes;
      if (!data?.ok || data.useTemplates || !data.angles) {
        setFailKind(failKindFrom(data));
        setAngles(undefined);
        return;
      }
      setAngles(data.angles);
      await persist("angles", { facts: intakeFacts, language: locale }, { angles: data.angles });
    } catch {
      setFailKind("gemini");
    } finally {
      setBusy(false);
    }
  }

  function onFile(file: File | undefined) {
    setFileError("");
    setVision(undefined);
    setPreview(null);
    setImageB64(null);
    if (!file) return;
    const okType = /image\/(jpeg|jpg|png|webp)/i.test(file.type) || /\.(jpe?g|png|webp)$/i.test(file.name);
    if (!okType) {
      setFileError(t("lab.badType"));
      return;
    }
    if (file.size > VISION_MAX_BYTES) {
      setFileError(t("lab.tooBig"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result ?? "");
      setPreview(url);
      const comma = url.indexOf(",");
      setImageB64(comma >= 0 ? url.slice(comma + 1) : url);
      setMime(file.type === "image/jpg" ? "image/jpeg" : file.type || "image/jpeg");
    };
    reader.readAsDataURL(file);
  }

  async function runVision() {
    if (!imageB64) return;
    setBusy(true);
    setFailKind("none");
    try {
      const res = await fetch("/api/vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: imageB64,
          mime,
          language: locale,
          facts: intakeFacts,
          description: intakeFacts,
        }),
      });
      const data = (await res.json()) as VisionApi;
      if (!data?.ok || data.useTemplates) {
        setFailKind(failKindFrom(data));
        setVision(undefined);
        return;
      }
      const out: VisionResult = {
        elements: data.elements ?? [],
        visualFixes: data.visualFixes ?? [],
        reels: data.reels ?? [],
      };
      setVision(out);
      await persist("vision", { mime, facts: intakeFacts, language: locale }, out);
    } catch {
      setFailKind("gemini");
    } finally {
      setBusy(false);
    }
  }

  async function runScore() {
    if (!adText.trim()) return;
    setBusy(true);
    setFailKind("none");
    setApplied(false);
    try {
      const res = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: adText,
          language: locale,
          facts: intakeFacts,
        }),
      });
      const data = (await res.json()) as ScoreApi;
      if (!data?.ok || data.useTemplates || typeof data.score !== "number") {
        setFailKind(failKindFrom(data));
        setScore(undefined);
        return;
      }
      const out: ScoreResult = {
        score: data.score,
        weaknesses: data.weaknesses ?? [],
        rewrite: data.rewrite ?? {},
      };
      setScore(out);
      await persist("score", { text: adText, facts: intakeFacts, language: locale }, out);
    } catch {
      setFailKind("gemini");
    } finally {
      setBusy(false);
    }
  }

  function applyRewrite() {
    const pack = score?.rewrite?.[locale] ?? score?.rewrite?.he;
    if (!pack) return;
    setAdText([pack.headline, pack.copy, pack.cta].filter(Boolean).join("\n\n"));
    setApplied(true);
  }

  const tabs: { id: Tab; key: "lab.tab.angles" | "lab.tab.vision" | "lab.tab.score" }[] = [
    { id: "angles", key: "lab.tab.angles" },
    { id: "vision", key: "lab.tab.vision" },
    { id: "score", key: "lab.tab.score" },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <ConquerHeadline subtitle={t("lab.title")} />
      <p className="mx-auto mb-6 max-w-2xl text-center text-sm text-zinc-400">{t("lab.lead")}</p>

      <div className="mb-6 flex flex-wrap justify-center gap-2">
        {tabs.map((tb) => (
          <button
            key={tb.id}
            type="button"
            onClick={() => setTab(tb.id)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-bold",
              tab === tb.id ? "bg-omni-yellow text-black" : "border border-white/15 text-zinc-300",
            )}
          >
            {t(tb.key)}
          </button>
        ))}
      </div>

      <div className="mb-6 rounded-2xl border border-white/10 bg-omni-card p-4">
        <Label>{t("lab.facts")}</Label>
        <Textarea value={facts} onChange={(e) => setFacts(e.target.value)} rows={5} />
      </div>

      {failKind === "templates" && (
        <p className="mb-4 text-center text-sm text-omni-yellow">{t("lab.fallback")}</p>
      )}
      {failKind === "gemini" && (
        <p className="mb-4 text-center text-sm text-omni-yellow">{t("lab.geminiError")}</p>
      )}

      {tab === "angles" && (
        <section>
          <Button type="button" onClick={() => void runAngles()} disabled={busy}>
            <FlaskConical className="size-4" />
            {busy ? t("lab.working") : t("lab.generate")}
          </Button>
          <div className="mt-6">
            <AnglesStrip angles={angles} locale={locale} />
          </div>
        </section>
      )}

      {tab === "vision" && (
        <section>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
              <ImagePlus className="size-4" />
              {t("lab.pickImage")}
            </Button>
            <Button type="button" onClick={() => void runVision()} disabled={busy || !imageB64}>
              {busy ? t("lab.working") : t("lab.analyze")}
            </Button>
          </div>
          {fileError && <p className="mt-2 text-sm text-omni-red">{fileError}</p>}
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="mt-4 max-h-56 rounded-xl border border-white/10 object-contain" />
          )}
          {vision && (
            <div className="mt-6 space-y-6">
              <div>
                <h3 className="mb-2 text-sm font-black text-omni-yellow">{t("lab.elements")}</h3>
                <ul className="list-disc space-y-1 pe-5 text-sm text-zinc-300">
                  {vision.elements.map((el, i) => (
                    <li key={i}>{el}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="mb-2 text-sm font-black text-omni-yellow">{t("lab.fixes")}</h3>
                <ol className="list-decimal space-y-1 pe-5 text-sm text-zinc-300">
                  {vision.visualFixes.slice(0, 3).map((el, i) => (
                    <li key={i}>{el}</li>
                  ))}
                </ol>
              </div>
              <div>
                <h3 className="mb-2 text-sm font-black text-omni-yellow">{t("lab.scripts")}</h3>
                <div className="grid gap-3 md:grid-cols-3">
                  {vision.reels.map((reel, i) => {
                    const pack = reel[locale] ?? reel.he;
                    const body = [
                      pack?.headline,
                      pack?.copy,
                      pack?.cta,
                      ...reel.shots.map((s) => `${s.t} · ${s.scene} · ${s.onScreen} · ${s.vo}`),
                    ]
                      .filter(Boolean)
                      .join("\n");
                    return (
                      <article key={`${reel.channel}-${i}`} className="rounded-2xl border border-white/10 bg-black/40 p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-omni-yellow">
                          {reel.channel}
                        </p>
                        <p className="mt-2 text-sm font-black text-white">{pack?.headline || INCOMPLETE[locale]}</p>
                        <p className="mt-1 text-xs text-zinc-300">{pack?.copy}</p>
                        <ul className="mt-3 space-y-1 text-[11px] text-zinc-400">
                          {reel.shots.map((s, j) => (
                            <li key={j}>
                              <span className="font-bold text-zinc-200">{s.t}</span> {s.scene} — {s.onScreen} / {s.vo}
                            </li>
                          ))}
                        </ul>
                        <Button
                          type="button"
                          size="sm"
                          variant="dark"
                          className="mt-3"
                          onClick={() => void copy(`reel-${i}`, body)}
                        >
                          <Copy className="size-3.5" />
                          {copied === `reel-${i}` ? t("lab.copied") : t("lab.copy")}
                        </Button>
                      </article>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {tab === "score" && (
        <section>
          <Label>{t("lab.adText")}</Label>
          <Textarea value={adText} onChange={(e) => setAdText(e.target.value)} rows={6} />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" onClick={() => void runScore()} disabled={busy || !adText.trim()}>
              {busy ? t("lab.working") : t("lab.score")}
            </Button>
            {score?.rewrite && (
              <Button type="button" variant="dark" onClick={applyRewrite}>
                {applied ? t("lab.applied") : t("lab.apply")}
              </Button>
            )}
          </div>
          {score && (
            <div className="mt-6 space-y-4">
              <p className="text-3xl font-black text-omni-yellow">{score.score}/100</p>
              <div>
                <h3 className="mb-2 text-sm font-black text-omni-yellow">{t("lab.weaknesses")}</h3>
                <ol className="list-decimal space-y-1 pe-5 text-sm text-zinc-300">
                  {score.weaknesses.slice(0, 3).map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ol>
              </div>
              <div>
                <h3 className="mb-2 text-sm font-black text-omni-yellow">{t("lab.rewrite")}</h3>
                <div className="grid gap-3 md:grid-cols-3">
                  {(["he", "ar", "en"] as Locale[]).map((loc) => {
                    const pack = score.rewrite[loc];
                    if (!pack) return null;
                    const text = [pack.headline, pack.copy, pack.cta].join("\n");
                    return (
                      <article key={loc} className="rounded-2xl border border-white/10 p-4" dir={loc === "en" ? "ltr" : "rtl"}>
                        <p className="text-[10px] font-black uppercase text-omni-yellow">{loc}</p>
                        <p className="mt-2 text-sm font-black text-white">{pack.headline}</p>
                        <p className="mt-1 text-xs text-zinc-300">{pack.copy}</p>
                        <p className="mt-2 text-xs font-bold text-omni-yellow">{pack.cta}</p>
                        <Button
                          type="button"
                          size="sm"
                          variant="dark"
                          className="mt-3"
                          onClick={() => void copy(`rw-${loc}`, text)}
                        >
                          <Copy className="size-3.5" />
                          {copied === `rw-${loc}` ? t("lab.copied") : t("lab.copy")}
                        </Button>
                      </article>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
