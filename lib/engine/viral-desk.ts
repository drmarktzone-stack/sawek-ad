import type { Intake, Locale } from "../types";
import { runImagenMany, type ImagenOk } from "../imagen";
import { completeGemini, factsToIntake, type GenerateBody } from "./gemini-generate";
import { inventsForbidden } from "./coach";

/**
 * Mohtawak-style jobs for the future viral-desk PR.
 * All scores are Gemini Pro *estimates* from supplied copy — never live
 * TikTok/Meta/YouTube metrics, never ROAS.
 */
export type ViralDeskJob =
  | "scripts"
  | "hooks"
  | "predict"
  | "rewrite"
  | "carousel"
  | "calendar30"
  | "trends";

export const VIRAL_DESK_JOBS: Record<
  ViralDeskJob,
  { tier: "pro" | "flash" | "imagen"; grounding?: boolean; note: string }
> = {
  scripts: { tier: "pro", note: "Exactly 7 viral scripts HE/AR/EN from facts" },
  hooks: { tier: "flash", note: "Hook bank — short opening lines" },
  predict: { tier: "pro", note: "Estimated hook/retention 1–100 — not live platform metrics" },
  rewrite: { tier: "pro", note: "Rewrite a video script from facts + source text" },
  carousel: { tier: "imagen", note: "Imagen 3 sequential stills — real bytes only" },
  calendar30: { tier: "pro", note: "30-day planning calendar — no fake ROAS" },
  trends: { tier: "pro", grounding: true, note: "Search-grounded trend notes — no invented views" },
};

export type ViralScript = { id: string; hook: Record<Locale, string>; body: Record<Locale, string> };
export type ViralHook = { id: string; text: Record<Locale, string> };
export type HookRetentionEstimate = {
  kind: "gemini_pro_estimate";
  notLiveMetrics: true;
  hook: number;
  retention: number;
  avgWatch: number;
  retentionCurve: { t: number; v: number }[];
  rationale: Record<Locale, string>;
  model?: string;
};
export type Calendar30Day = { day: number; theme: Record<Locale, string>; action: Record<Locale, string> };
export type GroundedTrend = { title: Record<Locale, string>; note: Record<Locale, string>; source?: string };

export type ViralDeskOk = {
  ok: true;
  job: ViralDeskJob;
  model?: string;
  provider?: "vertex" | "ai_studio";
  scripts?: ViralScript[];
  hooks?: ViralHook[];
  predict?: HookRetentionEstimate;
  rewrite?: Record<Locale, string>;
  carousel?: ImagenOk[];
  calendar?: Calendar30Day[];
  trends?: GroundedTrend[];
};
export type ViralDeskFail = {
  ok: false;
  job: ViralDeskJob;
  reason: "no_facts" | "no_key" | "gemini_error" | "quota" | "vertex_denied" | "imagen_error" | "not_configured";
};
export type ViralDeskResult = ViralDeskOk | ViralDeskFail;

function asObj(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function parseLooseJson(text: string): Record<string, unknown> | null {
  const stripped = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  try {
    return asObj(JSON.parse(stripped));
  } catch {
    const m = stripped.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try {
      return asObj(JSON.parse(m[0]));
    } catch {
      return null;
    }
  }
}

function asTri(v: unknown): Record<Locale, string> | undefined {
  const o = asObj(v);
  if (!o) return undefined;
  const he = typeof o.he === "string" ? o.he.trim() : "";
  const ar = typeof o.ar === "string" ? o.ar.trim() : "";
  const en = typeof o.en === "string" ? o.en.trim() : "";
  if (!he && !ar && !en) return undefined;
  return { he, ar, en };
}

function factsBlock(intake: Intake): string {
  return [
    intake.businessName && `businessName: ${intake.businessName}`,
    intake.category && `category: ${intake.category}`,
    intake.description && `description: ${intake.description}`,
    intake.location && `location: ${intake.location}`,
    intake.audience && `audience: ${intake.audience}`,
    intake.offer && `offer: ${intake.offer}`,
    intake.uniqueAdvantage && `uniqueAdvantage: ${intake.uniqueAdvantage}`,
    intake.biggestProblem && `biggestProblem: ${intake.biggestProblem}`,
    intake.brandTone && `brandTone: ${intake.brandTone}`,
    intake.voice?.niche && `niche: ${intake.voice.niche}`,
    intake.voice?.coreMessage && `coreMessage: ${intake.voice.coreMessage}`,
    intake.voice?.personalVoice && `personalVoice: ${intake.voice.personalVoice}`,
    intake.voice?.dialect && `dialect: ${intake.voice.dialect}`,
  ]
    .filter(Boolean)
    .join("\n");
}

const SYSTEM =
  "You are SAWEK AD viral desk. Use ONLY supplied facts. Never invent prices, discounts, ratings, ROAS, CAC, views, likes, watch time, or competitor names. Scores are planning estimates, not live platform metrics. Recreate HE/AR/EN — do not literal-translate. Reply JSON only.";

export async function runViralDeskJob(
  job: ViralDeskJob,
  body: GenerateBody & { script?: unknown; slides?: unknown },
): Promise<ViralDeskResult> {
  const intake = factsToIntake(body);
  if (!intake.businessName.trim() && !intake.description.trim() && !intake.website.trim()) {
    return { ok: false, job, reason: "no_facts" };
  }
  if (job === "carousel") return runCarousel(intake, body);
  return runTextJob(job, intake, body);
}

async function runCarousel(intake: Intake, body: GenerateBody & { slides?: unknown }): Promise<ViralDeskResult> {
  const n = Math.max(3, Math.min(7, Math.floor(Number(body.slides) || 5)));
  const prompts = Array.from({ length: n }, (_, i) =>
    [
      `Carousel slide ${i + 1} of ${n} for a marketing ad.`,
      `Business: ${intake.businessName || "local business"}. Category: ${intake.category || "local service"}.`,
      "Tasteful cinematic still, no text, no logos, no faces, no prices.",
    ].join(" "),
  );
  const batch = await runImagenMany(
    {
      businessName: intake.businessName,
      category: intake.category,
      vertical: intake.category,
      locale: "en",
      sampleCount: n,
      prompts,
    },
    prompts,
  );
  if (!batch.images.length) {
    return { ok: false, job: "carousel", reason: batch.reason ?? "imagen_error" };
  }
  return { ok: true, job: "carousel", carousel: batch.images, model: batch.images[0]?.model };
}

async function runTextJob(
  job: Exclude<ViralDeskJob, "carousel">,
  intake: Intake,
  body: GenerateBody & { script?: unknown },
): Promise<ViralDeskResult> {
  const spec = VIRAL_DESK_JOBS[job];
  const sourceScript = typeof body.script === "string" ? body.script.trim().slice(0, 4000) : "";
  const prompt = promptFor(job, intake, sourceScript);
  const completed = await completeGemini({
    parts: [{ text: prompt }],
    temperature: job === "predict" ? 0.2 : 0.45,
    timeoutMs: spec.grounding ? 32_000 : 26_000,
    tier: spec.tier === "flash" ? "flash" : "pro",
    grounding: spec.grounding === true,
    systemInstruction: SYSTEM,
  });
  if (!completed.ok) {
    return { ok: false, job, reason: completed.reason };
  }
  const obj = parseLooseJson(completed.text);
  if (!obj) return { ok: false, job, reason: "gemini_error" };
  if (inventsForbidden(JSON.stringify(obj), intake)) {
    return { ok: false, job, reason: "gemini_error" };
  }
  const base = { ok: true as const, job, model: completed.model, provider: completed.provider };
  if (job === "scripts") {
    const scripts = (Array.isArray(obj.scripts) ? obj.scripts : [])
      .map((row, i) => {
        const o = asObj(row);
        const hook = asTri(o?.hook);
        const scriptBody = asTri(o?.body ?? o?.script);
        if (!hook && !scriptBody) return null;
        return { id: `vs-${i + 1}`, hook: hook || { he: "", ar: "", en: "" }, body: scriptBody || { he: "", ar: "", en: "" } };
      })
      .filter((x): x is ViralScript => Boolean(x))
      .slice(0, 7);
    return { ...base, scripts };
  }
  if (job === "hooks") {
    const hooks = (Array.isArray(obj.hooks) ? obj.hooks : [])
      .map((row, i) => {
        const tri = asTri(row) || asTri(asObj(row)?.text);
        if (!tri) return null;
        return { id: `hk-${i + 1}`, text: tri };
      })
      .filter((x): x is ViralHook => Boolean(x))
      .slice(0, 16);
    return { ...base, hooks };
  }
  if (job === "predict") {
    const hook = clampScore(obj.hook ?? obj.estimatedHookRate);
    const retention = clampScore(obj.retention ?? obj.estimatedAvgWatch);
    const avgWatch = clampScore(obj.avgWatch ?? obj.estimatedAvgWatch ?? retention);
    const rationale = asTri(obj.rationale) || { he: "", ar: "", en: "" };
    const curveRaw = Array.isArray(obj.retentionCurve) ? obj.retentionCurve : [];
    const retentionCurve =
      curveRaw.length >= 4
        ? curveRaw.slice(0, 12).map((p, i) => {
            const o = p && typeof p === "object" ? (p as Record<string, unknown>) : {};
            return { t: clampScore(o.t ?? i), v: clampScore(o.v) };
          })
        : [0, 1, 3, 5, 8, 12, 15].map((t) => ({
            t,
            v: t === 0 ? 100 : clampScore(100 - ((100 - avgWatch) * t) / 15),
          }));
    return {
      ...base,
      predict: {
        kind: "gemini_pro_estimate",
        notLiveMetrics: true,
        hook,
        retention,
        avgWatch,
        retentionCurve,
        rationale,
        model: completed.model,
      },
    };
  }
  if (job === "rewrite") {
    const rewrite = asTri(obj.rewrite ?? obj);
    if (!rewrite) return { ok: false, job, reason: "gemini_error" };
    return { ...base, rewrite };
  }
  if (job === "calendar30") {
    const calendar = (Array.isArray(obj.days) ? obj.days : [])
      .map((row, i) => {
        const o = asObj(row);
        const theme = asTri(o?.theme);
        const action = asTri(o?.action);
        if (!theme || !action) return null;
        return { day: Number(o?.day) || i + 1, theme, action };
      })
      .filter((x): x is Calendar30Day => Boolean(x))
      .slice(0, 30);
    return { ...base, calendar };
  }
  const trends = (Array.isArray(obj.trends) ? obj.trends : [])
    .map((row) => {
      const o = asObj(row);
      const title = asTri(o?.title);
      const note = asTri(o?.note);
      if (!title || !note) return null;
      const source = typeof o?.source === "string" ? o.source.trim() : undefined;
      return { title, note, ...(source ? { source } : {}) };
    })
    .filter((x): x is GroundedTrend => Boolean(x))
    .slice(0, 8);
  return { ...base, trends };
}

function clampScore(v: unknown): number {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function promptFor(job: Exclude<ViralDeskJob, "carousel">, intake: Intake, script: string): string {
  const facts = factsBlock(intake);
  if (job === "scripts") {
    return `Facts:\n${facts}\n\nProduce EXACTLY 7 viral short-video scripts. JSON:\n{"scripts":[{"hook":{"he":"","ar":"","en":""},"body":{"he":"","ar":"","en":""}}]}`;
  }
  if (job === "hooks") {
    return `Facts:\n${facts}\n\nProduce 10–16 short hooks. JSON:\n{"hooks":[{"he":"","ar":"","en":""}]}`;
  }
  if (job === "predict") {
    return `Facts:\n${facts}\n${script ? `Script to score:\n${script}` : ""}\n\nEstimate Hook Rate %, Avg Watch %, and a retention curve from THIS COPY only (planning scores 1–100). These are NOT live Meta/TikTok/YouTube analytics, CTR, ROAS, or views. JSON:\n{"hook":0,"retention":0,"avgWatch":0,"estimatedHookRate":0,"estimatedAvgWatch":0,"retentionCurve":[{"t":0,"v":100}],"rationale":{"he":"","ar":"","en":""},"kind":"gemini_pro_estimate"}`;
  }
  if (job === "rewrite") {
    return `Facts:\n${facts}\n\nRewrite this video script (keep facts, improve hook/pacing). Source:\n${script || "(none — write a tight 15s from facts)"}\nJSON:\n{"he":"","ar":"","en":""}`;
  }
  if (job === "calendar30") {
    return `Facts:\n${facts}\n\n30-day content calendar. Planning only — no ROAS, no best-time science. JSON:\n{"days":[{"day":1,"theme":{"he":"","ar":"","en":""},"action":{"he":"","ar":"","en":""}}]}`;
  }
  return `Facts:\n${facts}\n\nUsing Search grounding, list 4–8 *current public* content-format trends relevant to this business category. Cite a public source URL when the tool returns one. Do NOT invent view counts, likes, or ROAS. If grounding is unavailable, say so in the note. JSON:\n{"trends":[{"title":{"he":"","ar":"","en":""},"note":{"he":"","ar":"","en":""},"source":""}]}`;
}
