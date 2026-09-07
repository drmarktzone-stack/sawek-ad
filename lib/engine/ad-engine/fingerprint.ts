/**
 * Creative novelty fingerprints — strategic dimensions, not rewording.
 * Deterministic. Stored as GENERATED CREATIVE HISTORY only.
 */
import type { CompleteAdLocale, CreativeFingerprint, StrategyFamily } from "../../types";
import { uid } from "../../utils";
import { businessKey } from "./sources";

function norm(s: string): string {
  return String(s || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function stem(s: string, max = 48): string {
  return norm(s).replace(/[^\w\u0590-\u05ff\u0600-\u06ff ]+/g, "").slice(0, max);
}

export function fingerprintHash(parts: string[]): string {
  const blob = parts.map(stem).join("|");
  let h = 2166136261;
  for (let i = 0; i < blob.length; i++) {
    h ^= blob.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export function buildFingerprint(input: {
  businessName: string;
  family: StrategyFamily;
  ideaId?: string;
  locale: CompleteAdLocale;
  ownerId?: string;
  clientId?: string;
  campaignId?: string;
}): CreativeFingerprint {
  const loc = input.locale;
  const hash = fingerprintHash([
    input.family,
    input.ideaId || "",
    loc.angle,
    loc.hook,
    loc.headline,
    loc.cta,
    loc.format,
    loc.platform,
    loc.visual,
  ]);
  return {
    id: uid("fp"),
    businessId: businessKey(input.businessName),
    ownerId: input.ownerId,
    clientId: input.clientId,
    campaignId: input.campaignId,
    createdAt: new Date().toISOString(),
    family: input.family,
    ideaId: input.ideaId,
    angle: stem(loc.angle, 40),
    hook: stem(loc.hook, 40),
    problem: stem(loc.concept, 40),
    promise: stem(loc.why, 40),
    offer: stem(loc.offer || "", 40),
    proof: stem(loc.proof || "", 40),
    trigger: stem(loc.hook, 32),
    framing: input.family,
    cta: stem(loc.cta, 32),
    structure: stem(loc.format, 24),
    visual: stem(loc.visual, 32),
    format: stem(loc.format, 24),
    hash,
  };
}

export function fingerprintsSimilar(a: CreativeFingerprint, b: CreativeFingerprint): boolean {
  if (a.hash === b.hash) return true;
  if (a.family === b.family && a.ideaId && a.ideaId === b.ideaId) return true;
  let same = 0;
  const keys: Array<keyof CreativeFingerprint> = ["angle", "hook", "cta", "structure", "visual", "framing"];
  for (const k of keys) {
    const av = String(a[k] || "");
    const bv = String(b[k] || "");
    if (av && bv && av === bv) same += 1;
  }
  return same >= 3;
}

export function noveltyAgainst(
  candidate: CreativeFingerprint,
  history: CreativeFingerprint[],
): { status: "original" | "evolved" | "saturated"; matches: number } {
  if (!history.length) return { status: "original", matches: 0 };
  let matches = 0;
  let familyHits = 0;
  for (const prev of history) {
    if (fingerprintsSimilar(candidate, prev)) matches += 1;
    if (prev.family === candidate.family) familyHits += 1;
  }
  if (matches >= 2 || familyHits >= 3) return { status: "saturated", matches };
  if (matches === 1 || familyHits >= 1) return { status: "evolved", matches };
  return { status: "original", matches };
}

export function excludeFromHistory(history: CreativeFingerprint[]): { ids: string[]; families: StrategyFamily[] } {
  const ids = [...new Set(history.map((h) => h.ideaId).filter((x): x is string => Boolean(x)))];
  const familyCount = new Map<StrategyFamily, number>();
  for (const h of history) {
    familyCount.set(h.family, (familyCount.get(h.family) || 0) + 1);
  }
  const families = [...familyCount.entries()].filter(([, n]) => n >= 1).map(([f]) => f);
  return { ids, families };
}
