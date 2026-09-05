import type { Intake, Locale } from "../types";
import { inventsForbidden } from "./coach";
import { completeGemini } from "./gemini-generate";
import type { ProDeskInsights } from "./pro-desk-overlay";

export type { ProDeskInsights };

const SYSTEM =
  "You are SAWEK AD Pro — the CMO brain. Deep audience analysis and high-converting strategy from facts only. Never invent prices, discounts, ratings, testimonials, VIP, ROAS, CAC, lead counts, competitors, or medical claims. Missing fact → [יש להשלים] / [يجب الاستكمال] / [TO COMPLETE]. Recreate HE/AR/EN — do not literal-translate. Reply JSON only.";

function asObj(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function parseLooseJson(text: string): Record<string, unknown> | null {
  const stripped = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  try {
    const parsed: unknown = JSON.parse(stripped);
    return asObj(parsed);
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
    intake.mainGoal && `mainGoal: ${intake.mainGoal}`,
    intake.website && `website: ${intake.website}`,
    intake.whatsapp && `whatsapp: ${intake.whatsapp}`,
    intake.clinicHours && `clinicHours: ${intake.clinicHours}`,
    intake.pastAds && `pastAds: ${intake.pastAds}`,
    intake.pastResults && `pastResults: ${intake.pastResults}`,
  ]
    .filter(Boolean)
    .join("\n");
}

const DESK_SHAPE = `{
  "audience":{"he":"","ar":"","en":""},
  "strategy":{"he":"","ar":"","en":""},
  "psychology":{"he":"","ar":"","en":""},
  "audit":[{"he":"","ar":"","en":""},{"he":"","ar":"","en":""},{"he":"","ar":"","en":""}],
  "weeks":[{"week":1,"theme":{"he":"","ar":"","en":""},"action":{"he":"","ar":"","en":""}}],
  "scripts":[{"channel":"reels","he":"","ar":"","en":""},{"channel":"whatsapp","he":"","ar":"","en":""},{"channel":"tiktok","he":"","ar":"","en":""}]
}`;

/**
 * One Pro-tier Vertex call covering CMO strategy, site-audit insights,
 * long-form calendar, and script packs. Overlay only — never invents numbers.
 */
export async function runProDesk(intake: Intake): Promise<ProDeskInsights> {
  if (!intake.businessName.trim() && !intake.description.trim() && !intake.website.trim()) {
    return { tier: "pro", down: true, reason: "no_facts" };
  }
  const prompt = `Facts (use only these):\n${factsBlock(intake)}\n\nYou are the CMO. Produce:\n1) audience — who they are and what they feel, from facts\n2) strategy — positioning + offer stack language (no fake discounts)\n3) psychology — buying motives from the stated problem/advantage\n4) audit — 3 site/campaign insight lines\n5) weeks — 8 week calendar (theme + action). Planning only, no ROAS\n6) scripts — reels / whatsapp / tiktok packs\nJSON:\n${DESK_SHAPE}`;

  try {
    const completed = await completeGemini({
      parts: [{ text: prompt }],
      temperature: 0.35,
      timeoutMs: 28_000,
      tier: "pro",
      systemInstruction: SYSTEM,
    });
    if (!completed.ok) {
      return { tier: "pro", down: true, reason: completed.reason };
    }
    const obj = parseLooseJson(completed.text);
    if (!obj) return { tier: "pro", down: true, reason: "gemini_error", model: completed.model, provider: completed.provider };
    const blob = JSON.stringify(obj);
    if (inventsForbidden(blob, intake)) {
      return { tier: "pro", down: true, reason: "invented", model: completed.model, provider: completed.provider };
    }
    const auditRaw = Array.isArray(obj.audit) ? obj.audit : [];
    const weeksRaw = Array.isArray(obj.weeks) ? obj.weeks : [];
    const scriptsRaw = Array.isArray(obj.scripts) ? obj.scripts : [];
    return {
      tier: "pro",
      model: completed.model,
      provider: completed.provider,
      audience: asTri(obj.audience),
      strategy: asTri(obj.strategy),
      psychology: asTri(obj.psychology),
      audit: auditRaw.map(asTri).filter((x): x is Record<Locale, string> => Boolean(x)).slice(0, 5),
      calendarWeeks: weeksRaw
        .map((row) => {
          const o = asObj(row);
          if (!o) return null;
          const theme = asTri(o.theme);
          const action = asTri(o.action);
          const week = Number(o.week) || 0;
          if (!theme || !action) return null;
          return { week: week || 0, theme, action };
        })
        .filter((x): x is NonNullable<typeof x> => Boolean(x))
        .slice(0, 13)
        .map((w, i) => ({ ...w, week: w.week || i + 1 })),
      scripts: scriptsRaw
        .map((row) => {
          const o = asObj(row);
          if (!o) return null;
          const channel = typeof o.channel === "string" ? o.channel.trim() : "reels";
          const he = typeof o.he === "string" ? o.he.trim() : "";
          const ar = typeof o.ar === "string" ? o.ar.trim() : "";
          const en = typeof o.en === "string" ? o.en.trim() : "";
          if (!he && !ar && !en) return null;
          return { channel, he, ar, en };
        })
        .filter((x): x is NonNullable<typeof x> => Boolean(x))
        .slice(0, 6),
    };
  } catch {
    return { tier: "pro", down: true, reason: "gemini_error" };
  }
}
