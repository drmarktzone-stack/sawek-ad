import type {
  BioPack,
  CarouselPack,
  Intake,
  Locale,
  RemixResult,
  TrendPack,
  VideoAnalysis,
  ViralHookPack,
  ViralScriptPack,
} from "../types";
import { runImagenMany } from "../imagen";
import { inventsForbidden } from "./coach";
import { completeGemini, factsToIntake, geminiFailFromEnv } from "./gemini-generate";
import { voiceFactLines, voiceFromIntake } from "./voice";
import {
  analysisDisclaimer,
  buildBioPack,
  buildCarouselPack,
  buildHookBank,
  buildRetentionCurve,
  buildTrendPack,
  buildVideoAnalysis,
  buildViralScripts,
  remixFromSource,
  remixNeedTranscript,
  viralTextForbidden,
} from "./viral-content";

export type ViralMode = "scripts" | "hooks" | "remix" | "trends" | "carousel" | "bio" | "analyze";

export type ViralBody = {
  mode?: unknown;
  language?: unknown;
  idea?: unknown;
  sourceUrl?: unknown;
  transcript?: unknown;
  caption?: unknown;
  durationSec?: unknown;
  imageBase64?: unknown;
  mime?: unknown;
  facts?: unknown;
  description?: unknown;
  audience?: unknown;
};

const SYSTEM =
  "You are SAWEK AD. Write short-form marketing copy in Hebrew, Arabic, and English from ONLY the facts given. Never invent prices, discounts, ratings, testimonials, ROAS, CAC, likes, or followers. If a fact is missing, write [יש להשלים] / [يجب الاستكمال] / [TO COMPLETE]. Follow the saved niche / core message / personal voice and dialect. Arabic: recreate in the stated dialect (Levantine / Gulf / MSA) — never a literal translation. Reply with JSON only.";

const ANALYZE_SYSTEM =
  "You are SAWEK AD pre-publish planner. Score THIS script/frame only. Output estimated Hook Rate %, estimated Avg Watch %, and a retention curve as Gemini Pro planning estimates. NEVER claim these are live Meta, TikTok, or YouTube analytics. Never invent ROAS, likes, or followers. Reply with JSON only.";

const TREND_SYSTEM =
  "You are SAWEK AD. Use Google Search grounding for current public social-content formats relevant to this niche. Cite a public URL when the tool returns one. Label freshness with today's date. Do NOT invent view counts, rankings, charts, likes, or ROAS. If grounding is unavailable, say so. Reply with JSON only.";

function asLocale(v: unknown): Locale {
  if (v === "he" || v === "ar" || v === "en") return v;
  return "he";
}

function asMode(v: unknown): ViralMode {
  if (v === "scripts" || v === "hooks" || v === "remix" || v === "trends" || v === "carousel" || v === "bio" || v === "analyze") return v;
  return "scripts";
}

function parseJson(text: string): Record<string, unknown> | null {
  const stripped = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  try {
    const v = JSON.parse(stripped) as unknown;
    if (v && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>;
  } catch {
    /* fall through */
  }
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const v = JSON.parse(m[0]) as unknown;
    if (v && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>;
  } catch {
    return null;
  }
  return null;
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function overlayScripts(base: ViralScriptPack, obj: Record<string, unknown>, intake: Intake): ViralScriptPack {
  const rows = Array.isArray(obj.scripts) ? obj.scripts : [];
  if (rows.length < 7) return base;
  const next = base.scripts.map((s, i) => {
    const row = rows[i] && typeof rows[i] === "object" ? (rows[i] as Record<string, unknown>) : {};
    const hook = str(row.hook) || s.hook;
    const spoken = str(row.spoken) || s.spoken;
    const onScreen = str(row.onScreen) || s.onScreen;
    const cta = str(row.cta) || s.cta;
    const blob = `${hook}\n${spoken}\n${cta}`;
    if (viralTextForbidden(blob) || inventsForbidden(blob, intake)) return s;
    return { ...s, hook, spoken, onScreen, cta };
  });
  return { ...base, scripts: next, source: "gemini" };
}

function overlayCarousel(base: CarouselPack, obj: Record<string, unknown>, intake: Intake): CarouselPack {
  const slidesRaw = Array.isArray(obj.slides) ? obj.slides : [];
  if (slidesRaw.length < 5) return base;
  const slides = base.slides.map((s, i) => {
    const row = slidesRaw[i] && typeof slidesRaw[i] === "object" ? (slidesRaw[i] as Record<string, unknown>) : {};
    const headline = str(row.headline) || s.headline;
    const body = str(row.body) || s.body;
    const visual = str(row.visual) || s.visual;
    if (viralTextForbidden(`${headline} ${body}`) || inventsForbidden(`${headline} ${body}`, intake)) return s;
    return { ...s, headline, body, visual };
  });
  const caption = str(obj.caption) || base.caption;
  const cta = str(obj.cta) || base.cta;
  if (viralTextForbidden(`${caption} ${cta}`) || inventsForbidden(`${caption} ${cta}`, intake)) {
    return { ...base, slides, source: "gemini" };
  }
  return { ...base, slides, caption, cta, source: "gemini" };
}

function overlayBios(base: BioPack, obj: Record<string, unknown>, intake: Intake): BioPack {
  const pick = (k: keyof BioPack) => {
    const v = str(obj[k]);
    if (!v) return base[k];
    if (viralTextForbidden(v) || inventsForbidden(v, intake)) return base[k];
    return v;
  };
  return {
    ...base,
    instagram: String(pick("instagram")),
    tiktok: String(pick("tiktok")),
    facebook: String(pick("facebook")),
    linkedin: String(pick("linkedin")),
    whatsapp: String(pick("whatsapp")),
    source: "gemini",
  };
}

function overlayTrends(base: TrendPack, obj: Record<string, unknown>, intake: Intake): TrendPack {
  const rows = Array.isArray(obj.angles) ? obj.angles : [];
  if (!rows.length) return { ...base, source: "gemini" };
  const angles = base.angles.map((a, i) => {
    const row = rows[i] && typeof rows[i] === "object" ? (rows[i] as Record<string, unknown>) : {};
    const title = str(row.title) || a.title;
    const angle = str(row.angle) || a.angle;
    const hook = str(row.hook) || a.hook;
    const why = str(row.why) || a.why;
    const blob = `${title} ${angle} ${hook} ${why}`;
    if (viralTextForbidden(blob) || inventsForbidden(blob, intake)) return a;
    const sourceUrl = str(row.sourceUrl || row.source);
    return { ...a, title, angle, hook, why, ...(sourceUrl.startsWith("http") ? { sourceUrl } : {}) };
  });
  return { ...base, angles, source: "gemini", grounded: true };
}

function overlayRemix(base: RemixResult, obj: Record<string, unknown>, intake: Intake): RemixResult {
  if (base.status !== "ok" || !base.script) return base;
  const hook = str(obj.hook) || base.script.hook;
  const spoken = str(obj.spoken) || base.script.spoken;
  const blob = `${hook}\n${spoken}`;
  if (viralTextForbidden(blob) || inventsForbidden(blob, intake)) return { ...base, source: "gemini" };
  return { ...base, script: { ...base.script, hook, spoken, onScreen: hook.slice(0, 48) }, source: "gemini" };
}

function overlayHooks(base: ViralHookPack, obj: Record<string, unknown>, intake: Intake): ViralHookPack {
  const rows = Array.isArray(obj.hooks) ? obj.hooks : [];
  if (rows.length < 5) return base;
  const hooks = base.hooks.map((h, i) => {
    const row = rows[i];
    const text = typeof row === "string" ? row.trim() : str((row as Record<string, unknown> | undefined)?.text);
    if (!text || viralTextForbidden(text) || inventsForbidden(text, intake)) return h;
    return { ...h, text: text.slice(0, 90), seconds: "0-3" as const };
  });
  return { ...base, hooks, source: "gemini" };
}

function overlayAnalysis(base: VideoAnalysis, obj: Record<string, unknown>): VideoAnalysis {
  const n = (k: string, fallback: number) => {
    const v = Number(obj[k]);
    if (!Number.isFinite(v)) return fallback;
    return Math.max(1, Math.min(100, Math.round(v)));
  };
  const notesRaw = Array.isArray(obj.notes)
    ? obj.notes.filter((x): x is string => typeof x === "string").map((s) => s.trim()).filter(Boolean)
    : [];
  const notes = notesRaw.filter((s) => !/\b(ROAS|likes?|followers?)\b/i.test(s)).slice(0, 6);
  const estimatedHookRate = n("estimatedHookRate", n("hookRate", base.estimatedHookRate));
  const estimatedAvgWatch = n("estimatedAvgWatch", n("avgWatch", base.estimatedAvgWatch));
  const curveRaw = Array.isArray(obj.retentionCurve) ? obj.retentionCurve : [];
  const retentionCurve =
    curveRaw.length >= 4
      ? curveRaw
          .map((p) => {
            const o = p && typeof p === "object" ? (p as Record<string, unknown>) : {};
            const t = Number(o.t);
            const v = Number(o.v);
            return {
              t: Number.isFinite(t) ? Math.max(0, Math.min(30, Math.round(t))) : 0,
              v: Number.isFinite(v) ? Math.max(1, Math.min(100, Math.round(v))) : 50,
            };
          })
          .slice(0, 12)
      : buildRetentionCurve(estimatedHookRate, estimatedAvgWatch);
  return {
    ...base,
    hookPotential: n("hookPotential", estimatedHookRate),
    clarity: n("clarity", base.clarity),
    ctaClarity: n("ctaClarity", base.ctaClarity),
    estimatedHookRate,
    estimatedAvgWatch,
    retentionCurve,
    notes: notes.length ? [...notes, base.disclaimer] : base.notes,
    source: "gemini",
    disclaimer: analysisDisclaimer(base.locale),
    kind: "planning_heuristic",
    estimateKind: "gemini_pro_estimate",
    notLiveMetrics: true,
  };
}

function factsBlock(intake: Intake): string {
  return [
    intake.businessName && `businessName: ${intake.businessName}`,
    intake.category && `category: ${intake.category}`,
    intake.description && `description: ${intake.description}`,
    intake.location && `location: ${intake.location}`,
    intake.audience && `audience: ${intake.audience}`,
    intake.uniqueAdvantage && `uniqueAdvantage: ${intake.uniqueAdvantage}`,
    intake.biggestProblem && `biggestProblem: ${intake.biggestProblem}`,
    intake.offer && `offer: ${intake.offer}`,
    intake.whatsapp && `whatsapp: ${intake.whatsapp}`,
    intake.clinicHours && `clinicHours: ${intake.clinicHours}`,
    ...voiceFactLines(intake),
  ]
    .filter(Boolean)
    .join("\n");
}

function decodeFrame(body: ViralBody): { mime: string; data: string } | null {
  const mimeHint = typeof body.mime === "string" ? body.mime.trim().toLowerCase() : "";
  const raw = typeof body.imageBase64 === "string" ? body.imageBase64.trim() : "";
  if (!raw) return null;
  const m = raw.match(/^data:([^;]+);base64,(.+)$/i);
  const mime = (m?.[1] || mimeHint || "image/jpeg").toLowerCase();
  const data = (m?.[2] || raw).replace(/\s/g, "");
  if (!/^image\/(jpeg|jpg|png|webp)$/.test(mime)) return null;
  if (data.length < 80) return null;
  return { mime: mime === "image/jpg" ? "image/jpeg" : mime, data };
}

export async function runViralDesk(body: ViralBody): Promise<{
  ok: true;
  mode: ViralMode;
  locale: Locale;
  source: "gemini" | "template";
  scripts?: ViralScriptPack;
  hooks?: ViralHookPack;
  carousel?: CarouselPack;
  bios?: BioPack;
  trends?: TrendPack;
  remix?: RemixResult;
  analysis?: VideoAnalysis;
  reason?: string;
}> {
  const locale = asLocale(body.language);
  const mode = asMode(body.mode);
  const intake = factsToIntake(body);
  if (typeof body.facts === "object" && body.facts && !Array.isArray(body.facts)) {
    const o = body.facts as Record<string, unknown>;
    if (o.voice && typeof o.voice === "object") {
      intake.voice = voiceFromIntake({ ...intake, voice: o.voice as Intake["voice"] });
    }
    if (typeof o.coreNiche === "string") {
      intake.voice = { ...voiceFromIntake(intake), niche: o.coreNiche };
    }
    if (typeof o.coreMessage === "string") {
      intake.voice = { ...voiceFromIntake(intake), coreMessage: o.coreMessage };
    }
    if (typeof o.personalVoice === "string") {
      intake.voice = { ...voiceFromIntake(intake), personalVoice: o.personalVoice };
    }
  }
  const idea = typeof body.idea === "string" ? body.idea.trim() : "";
  const transcript = typeof body.transcript === "string" ? body.transcript.trim() : "";
  const caption = typeof body.caption === "string" ? body.caption.trim() : "";
  const sourceUrl = typeof body.sourceUrl === "string" ? body.sourceUrl.trim() : "";
  const durationSec = typeof body.durationSec === "number" ? body.durationSec : Number(body.durationSec);
  const frame = decodeFrame(body);

  if (mode === "scripts") {
    const base = buildViralScripts(intake, idea, locale);
    const completed = await completeGemini({
      temperature: 0.5,
      tier: "pro",
      systemInstruction: SYSTEM,
      parts: [
        {
          text: [
            `Facts:\n${factsBlock(intake)}`,
            `Idea: ${idea || "(use core message)"}`,
            `Primary locale: ${locale}`,
            "Write 7 short-form scripts ready to film (15s): quiet_catalyst, data, trend, story, contrast, proof, direct.",
            "Each: hook, spoken, onScreen, cta. Use only facts. data style: only numbers present in facts.",
            `JSON: {"scripts":[{"hook":"","spoken":"","onScreen":"","cta":""}, ... x7]}`,
          ].join("\n\n"),
        },
      ],
    });
    if (!completed.ok) {
      return { ok: true, mode, locale, source: "template", scripts: base, reason: completed.reason };
    }
    const parsed = parseJson(completed.text);
    return { ok: true, mode, locale, source: parsed ? "gemini" : "template", scripts: parsed ? overlayScripts(base, parsed, intake) : base };
  }

  if (mode === "hooks") {
    const base = buildHookBank(intake, idea, locale);
    const completed = await completeGemini({
      temperature: 0.55,
      tier: "flash",
      systemInstruction: SYSTEM,
      parts: [
        {
          text: [
            `Facts:\n${factsBlock(intake)}`,
            `Idea: ${idea || "(use core message)"}`,
            `Locale: ${locale}`,
            "Write 10 distinct first-3-seconds viral HOOKS (openers only, ready to film). No body. Facts only.",
            `JSON: {"hooks":["...", "..."]}`,
          ].join("\n\n"),
        },
      ],
    });
    if (!completed.ok) {
      return { ok: true, mode, locale, source: "template", hooks: base, reason: completed.reason };
    }
    const parsed = parseJson(completed.text);
    return { ok: true, mode, locale, source: parsed ? "gemini" : "template", hooks: parsed ? overlayHooks(base, parsed, intake) : base };
  }

  if (mode === "carousel") {
    const base = buildCarouselPack(intake, idea, locale);
    const completed = await completeGemini({
      temperature: 0.45,
      tier: "pro",
      systemInstruction: SYSTEM,
      parts: [
        {
          text: [
            `Facts:\n${factsBlock(intake)}`,
            `Idea: ${idea || "(use core message)"}`,
            `Locale: ${locale}`,
            "6-slide IG/FB carousel: headline, body, visual note per slide. Plus caption + cta. Facts only.",
            `JSON: {"caption":"","cta":"","slides":[{"headline":"","body":"","visual":""}]}`,
          ].join("\n\n"),
        },
      ],
    });
    if (!completed.ok) {
      return { ok: true, mode, locale, source: "template", carousel: base, reason: completed.reason };
    }
    const parsed = parseJson(completed.text);
    const pack = parsed ? overlayCarousel(base, parsed, intake) : base;
    const prompts = pack.slides.map(
      (s, i) =>
        `Carousel slide ${i + 1} of ${pack.slides.length} for ${intake.businessName || "local business"}. ${s.visual || s.headline}. Tasteful cinematic still, no text, no logos, no faces, no prices.`,
    );
    const batch = await runImagenMany(
      {
        businessName: intake.businessName,
        category: intake.category,
        location: intake.location,
        description: intake.description,
        locale,
        sampleCount: pack.slides.length,
        prompts,
      },
      prompts,
    );
    const slides = pack.slides.map((s, i) => {
      const img = batch.images[i];
      if (!img) return s;
      return { ...s, imageUrl: img.publicUrl || `data:${img.mime};base64,${img.imageBase64}`, imageSource: "imagen" as const };
    });
    const imagenNote = batch.images.length
      ? undefined
      : locale === "ar"
        ? "Imagen 3 غير متاح الآن — الخطوط جاهزة بلا خلفيات مولَّدة."
        : locale === "he"
          ? "Imagen 3 לא זמין כרגע — המתארים מוכנים בלי רקעים שנוצרו."
          : "Imagen 3 is unavailable right now — slide outlines only, no generated backgrounds.";
    return {
      ok: true,
      mode,
      locale,
      source: parsed ? "gemini" : "template",
      carousel: { ...pack, slides, imagenNote },
    };
  }

  if (mode === "bio") {
    const base = buildBioPack(intake, locale);
    const completed = await completeGemini({
      temperature: 0.4,
      tier: "flash",
      systemInstruction: SYSTEM,
      parts: [
        {
          text: [
            `Facts:\n${factsBlock(intake)}`,
            `Locale: ${locale}`,
            "Platform bios (length caps): instagram 150, tiktok 80, facebook 100, linkedin 200, whatsapp 80. No fake follower counts.",
            `JSON: {"instagram":"","tiktok":"","facebook":"","linkedin":"","whatsapp":""}`,
          ].join("\n\n"),
        },
      ],
    });
    if (!completed.ok) {
      return { ok: true, mode, locale, source: "template", bios: base, reason: completed.reason };
    }
    const parsed = parseJson(completed.text);
    return { ok: true, mode, locale, source: parsed ? "gemini" : "template", bios: parsed ? overlayBios(base, parsed, intake) : base };
  }

  if (mode === "trends") {
    const asOf = new Date().toISOString();
    const base = buildTrendPack(intake, locale, asOf);
    const completed = await completeGemini({
      temperature: 0.5,
      tier: "pro",
      grounding: true,
      timeoutMs: 32_000,
      systemInstruction: TREND_SYSTEM,
      parts: [
        {
          text: [
            `Facts:\n${factsBlock(intake)}`,
            `Locale: ${locale}`,
            `Today: ${asOf.slice(0, 10)}`,
            "Using Search grounding, propose 7 current topic ANGLES for this niche. Include source URL when the tool cites one. Label as suggestions as of today's date. Do NOT invent trending charts, view counts, or platform rankings.",
            `JSON: {"angles":[{"title":"","angle":"","hook":"","why":"","sourceUrl":""}]}`,
          ].join("\n\n"),
        },
      ],
    });
    if (!completed.ok) {
      return { ok: true, mode, locale, source: "template", trends: base, reason: completed.reason };
    }
    const parsed = parseJson(completed.text);
    return { ok: true, mode, locale, source: parsed ? "gemini" : "template", trends: parsed ? overlayTrends(base, parsed, intake) : base };
  }

  if (mode === "remix") {
    const sourceText = transcript || caption;
    if (!sourceText && !sourceUrl) {
      return { ok: true, mode, locale, source: "template", remix: remixNeedTranscript(locale, sourceUrl) };
    }
    if (!sourceText) {
      return { ok: true, mode, locale, source: "template", remix: remixNeedTranscript(locale, sourceUrl) };
    }
    const base = remixFromSource(intake, locale, { sourceText, sourceUrl, idea });
    if (base.status !== "ok") {
      return { ok: true, mode, locale, source: "template", remix: base };
    }
    const completed = await completeGemini({
      temperature: 0.5,
      tier: "pro",
      systemInstruction: SYSTEM,
      parts: [
        {
          text: [
            `Facts:\n${factsBlock(intake)}`,
            `Public source text (NOT a claim we watched a private video):\n${sourceText.slice(0, 800)}`,
            `Rewrite in the user's voice as one 15s script. Locale: ${locale}`,
            `JSON: {"hook":"","spoken":"","onScreen":"","cta":""}`,
          ].join("\n\n"),
        },
      ],
    });
    if (!completed.ok) {
      return { ok: true, mode, locale, source: "template", remix: base, reason: completed.reason };
    }
    const parsed = parseJson(completed.text);
    return { ok: true, mode, locale, source: parsed ? "gemini" : "template", remix: parsed ? overlayRemix(base, parsed, intake) : base };
  }

  const base = buildVideoAnalysis(intake, locale, {
    caption: caption || transcript,
    durationSec: Number.isFinite(durationSec) ? durationSec : undefined,
    hasFrame: Boolean(frame),
    source: "template",
  });
  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
  if (frame) parts.push({ inlineData: { mimeType: frame.mime, data: frame.data } });
  parts.push({
    text: [
      `Facts:\n${factsBlock(intake)}`,
      caption || transcript ? `User caption/transcript:\n${(caption || transcript).slice(0, 800)}` : "No caption.",
      Number.isFinite(durationSec) ? `Client-reported duration seconds: ${durationSec}` : "",
      frame ? "A first FRAME image is attached — not a live platform analytics feed." : "No frame attached.",
      "Score estimated Hook Rate % (1–100), estimated Avg Watch % (1–100), and a 7-point retention curve (t seconds 0–15, v %).",
      "Also hookPotential, clarity, ctaClarity (planning 1–100).",
      "These are Gemini Pro planning estimates — NEVER live Meta/TikTok/YouTube analytics. No likes, followers, or ROAS.",
      `JSON: {"estimatedHookRate":1,"estimatedAvgWatch":1,"hookPotential":1,"clarity":1,"ctaClarity":1,"retentionCurve":[{"t":0,"v":100}],"notes":["..."]}`,
    ]
      .filter(Boolean)
      .join("\n\n"),
  });
  const completed = await completeGemini({
    temperature: 0.3,
    tier: "pro",
    systemInstruction: ANALYZE_SYSTEM,
    parts,
  });
  if (!completed.ok) {
    return { ok: true, mode: "analyze", locale, source: "template", analysis: base, reason: completed.reason };
  }
  const parsed = parseJson(completed.text);
  return {
    ok: true,
    mode: "analyze",
    locale,
    source: parsed ? "gemini" : "template",
    analysis: parsed ? overlayAnalysis(base, parsed) : base,
  };
}

export { geminiFailFromEnv };
