/**
 * Creative Diversity Engine — strategic directions, novelty gate, no reword-recycle.
 * Deterministic. No extra Vertex calls.
 */
import type {
  CompleteAdLocale,
  CreativeFingerprint,
  Intake,
  StrategyFamily,
} from "../../types";
import { filled } from "../../utils";
import type { SourceLayers } from "./sources";
import {
  fingerprintsSimilar,
  noveltyAgainst,
  fingerprintHash,
} from "./fingerprint";
import type { ScoredCandidate } from "./candidates";
import { STRATEGY_FAMILIES } from "./candidates";
import { proofAllowed } from "./facts";

const TOKEN_RE = /[\w\u0590-\u05ff\u0600-\u06ff]+/g;

export function tokenize(s: string): Set<string> {
  const out = new Set<string>();
  const m = String(s || "").toLowerCase().match(TOKEN_RE) || [];
  for (const t of m) {
    if (t.length >= 3) out.add(t);
  }
  return out;
}

export function jaccard(a: string, b: string): number {
  const A = tokenize(a);
  const B = tokenize(b);
  if (!A.size && !B.size) return 1;
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter += 1;
  return inter / (A.size + B.size - inter);
}

export function strategicBlob(loc: CompleteAdLocale, family: StrategyFamily): string {
  return [family, loc.angle, loc.hook, loc.headline, loc.cta, loc.format, loc.platform, loc.visual, loc.concept].join(" ");
}

export function textTooSimilar(a: CompleteAdLocale, b: Pick<CreativeFingerprint, "angle" | "hook" | "cta" | "visual" | "format">): boolean {
  const left = `${a.angle} ${a.hook} ${a.headline} ${a.cta}`;
  const right = `${b.angle} ${b.hook} ${b.cta} ${b.visual} ${b.format}`;
  return jaccard(left, right) >= 0.55;
}

export function selectStrategicDirections(input: {
  intake: Intake;
  layers: SourceLayers;
  history: CreativeFingerprint[];
}): StrategyFamily[] {
  const { intake, layers, history } = input;
  const used = new Map<StrategyFamily, number>();
  for (const h of history) used.set(h.family, (used.get(h.family) || 0) + 1);

  const ranked = STRATEGY_FAMILIES.map((family) => {
    let fit = 40;
    if (family === "problem_led" && filled(intake.biggestProblem)) fit += 28;
    if (family === "offer_led" && filled(intake.offer) && !layers.businessTruth.offerIsNone) fit += 26;
    if (family === "story" && (filled(intake.audience) || filled(intake.biggestProblem))) fit += 18;
    if (family === "emotional" && filled(intake.audience)) fit += 16;
    if (family === "educational" && (filled(intake.clinicHours) || filled(intake.uniqueAdvantage))) fit += 16;
    if (family === "authority" && filled(intake.location)) fit += 18;
    if (family === "demo" && filled(intake.location)) fit += 12;
    if (family === "curiosity") fit += 10;
    if (family === "objection" && filled(intake.biggestProblem)) fit += 14;
    if (family === "comparison" && filled(intake.uniqueAdvantage)) fit += 14;
    if (family === "transformation" && filled(intake.mainGoal)) fit += 12;
    if ((family === "proof" || family === "social_proof") && proofAllowed(layers.businessTruth)) fit += 22;
    if ((family === "proof" || family === "social_proof") && !proofAllowed(layers.businessTruth)) fit -= 30;
    if ((family === "market_gap" || family === "discovered") && layers.marketIntel.notes.length) fit += 20;
    if ((family === "market_gap" || family === "discovered") && !layers.marketIntel.notes.length) fit -= 15;
    if (family === "contrarian") fit += 8;
    const hits = used.get(family) || 0;
    if (hits >= 1) fit -= 50;
    if (hits >= 2) fit -= 40;
    return { family, fit };
  }).sort((a, b) => b.fit - a.fit || a.family.localeCompare(b.family));

  return ranked.map((r) => r.family);
}

export function noveltyGate(
  candidate: ScoredCandidate,
  history: CreativeFingerprint[],
): { pass: boolean; status: "original" | "evolved" | "saturated" | "unknown"; reason: string; similarity: number } {
  if (!history.length) {
    return { pass: true, status: "original", reason: "no prior creatives for this business", similarity: 0 };
  }
  const loc = candidate.locales.en;
  let maxSim = 0;
  let familyHits = 0;
  const last = history[0];
  for (const prev of history) {
    if (prev.family === candidate.family) familyHits += 1;
    const sim = jaccard(strategicBlob(loc, candidate.family), `${prev.family} ${prev.angle} ${prev.hook} ${prev.cta} ${prev.visual} ${prev.format}`);
    if (sim > maxSim) maxSim = sim;
    if (fingerprintsSimilar(candidateAsFp(candidate), prev) || textTooSimilar(loc, prev)) {
      return {
        pass: false,
        status: "saturated",
        reason: `strategic collision with prior ${prev.family}`,
        similarity: Math.max(sim, 0.7),
      };
    }
  }
  if (last && last.family === candidate.family) {
    return {
      pass: false,
      status: "saturated",
      reason: "consecutive same-family recycle blocked",
      similarity: 0.9,
    };
  }
  const nov = noveltyAgainst(candidateAsFp(candidate), history);
  if (nov.status === "saturated" || familyHits >= 2) {
    return { pass: false, status: "saturated", reason: "family already saturated in history", similarity: maxSim };
  }
  if (maxSim >= 0.55) {
    return { pass: false, status: "saturated", reason: "high strategic similarity", similarity: maxSim };
  }
  return {
    pass: true,
    status: nov.status,
    reason: nov.status === "evolved" ? "related family but new framing" : "new strategic direction",
    similarity: maxSim,
  };
}

function candidateAsFp(c: ScoredCandidate): CreativeFingerprint {
  const loc = c.locales.en;
  return {
    id: "gate",
    businessId: "x",
    createdAt: "",
    family: c.family,
    ideaId: c.idea?.id,
    angle: loc.angle,
    hook: loc.hook,
    problem: loc.concept,
    promise: loc.why,
    offer: loc.offer || "",
    proof: loc.proof || "",
    trigger: loc.hook,
    framing: c.family,
    cta: loc.cta,
    structure: loc.format,
    visual: loc.visual,
    format: loc.format,
    hash: fingerprintHash([c.family, loc.angle, loc.hook, loc.headline, loc.cta, loc.format]),
  };
}

export interface DiversityPick {
  winner?: ScoredCandidate;
  rejected: StrategyFamily[];
  exhausted: boolean;
  noveltyStatus: "original" | "evolved" | "saturated" | "unknown";
  noveltyReason: string;
}

export function pickDiverseWinner(
  candidates: ScoredCandidate[],
  history: CreativeFingerprint[],
  directions: StrategyFamily[],
): DiversityPick {
  const byFamily = new Map(candidates.map((c) => [c.family, c]));
  const rejected: StrategyFamily[] = [];
  const unused = directions.filter((f) => !history.some((h) => h.family === f));
  const order = [...unused, ...directions.filter((f) => !unused.includes(f))];

  for (const family of order) {
    const c = byFamily.get(family);
    if (!c) continue;
    if (c.scores.factualSafety < 50 || c.scores.evidence <= 0) {
      rejected.push(family);
      continue;
    }
    const gate = noveltyGate(c, history);
    if (!gate.pass) {
      rejected.push(family);
      continue;
    }
    return {
      winner: c,
      rejected,
      exhausted: false,
      noveltyStatus: gate.status,
      noveltyReason: gate.reason,
    };
  }

  // Directions exhausted: do not recycle oldest blindly.
  // Prefer unused framing (format/visual already baked per family). If nothing passes, say so.
  const remaining = candidates
    .filter((c) => c.scores.factualSafety >= 50 && c.scores.evidence > 0)
    .map((c) => ({ c, gate: noveltyGate(c, history) }))
    .sort((a, b) => a.gate.similarity - b.gate.similarity || b.c.scores.total - a.c.scores.total);

  const least = remaining[0];
  if (!least) {
    return {
      winner: undefined,
      rejected,
      exhausted: true,
      noveltyStatus: "unknown",
      noveltyReason: "insufficient distinct directions — need a new audience, offer, proof, or market fact",
    };
  }
  if (!least.gate.pass) {
    return {
      winner: least.c,
      rejected,
      exhausted: true,
      noveltyStatus: "unknown",
      noveltyReason:
        "strategic directions exhausted for this business. Showing the least-similar remaining frame — not a recycle of Day 1. Add a new offer, audience, or proof for true novelty.",
    };
  }
  return {
    winner: least.c,
    rejected,
    exhausted: false,
    noveltyStatus: least.gate.status,
    noveltyReason: least.gate.reason,
  };
}
