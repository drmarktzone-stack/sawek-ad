/**
 * Deterministic fact governance.
 * Status: VERIFIED / USER-PROVIDED / SOURCE-VERIFIED / INFERENCE / UNSUPPORTED / UNKNOWN
 * Reject invented price / discount / guarantee / stat / testimonial / cert /
 * location / feature / performance / scarcity / deadline.
 */
import type { FactStatus, Intake } from "../../types";
import { isNoOffer } from "../../no-offer";
import { inventsForbidden } from "../coach";
import { businessTruthBlob, type BusinessTruth, type SourceLayers } from "./sources";

export interface ClaimHit {
  kind:
    | "price"
    | "discount"
    | "guarantee"
    | "stat"
    | "testimonial"
    | "cert"
    | "location"
    | "feature"
    | "performance"
    | "scarcity"
    | "deadline";
  text: string;
  status: FactStatus;
}

const PRICE_RE = /₪\s*[\d,.]+|\$\s*[\d,.]+|€\s*[\d,.]+|\b\d{1,5}\s*(?:ש["״]?ח|NIS|USD)\b/gi;
const PERCENT_RE = /\b\d{1,3}\s*%/g;
const DISCOUNT_RE = /הנחה(?:\s+של)?|\bخصم\b|\bdiscount\b|\b\d+\s*%\s*off\b|1\s*\+\s*1|קופון|كوبون|coupon/gi;
const GUARANTEE_RE = /אחריות(?:\s+מלאה)?|ضمان|guarantee|money[-\s]?back|החזר כספי/gi;
const STAT_RE =
  /\b\d{2,}\s*(?:לידים|לקוחות|customers?|clients?|reviews?|ביקורות|عملاء|زبائن|leads?)\b/gi;
const TESTIMONIAL_RE =
  /עדות|המלצ(?:ה|ות)|testimonial|reviews?\s+say|אמר(?:ו|ה)\s+(?:לקוח|לקוחה)|قالوا|شهادة زبون|5\s*כוכב|5\s*stars?|★★★★★/gi;
const CERT_RE = /מוסמך|הסמכה|\bISO\b|\bcertified\b|معتمد رسميا/gi;
const SCARCITY_RE = /רק היום|היום האחרון|limited time|last chance|آخر يوم|only \d+\s+left|נשארו \d+/gi;
const DEADLINE_RE = /עד ה[-–]?\d|ends?\s+(tonight|friday|sunday)|closes?\s+\d|נגמר ב/gi;
const PERFORMANCE_RE = /\bROAS\b|\bCAC\b|\bCPA\b|win probability|predicted leads|32[–-]68/gi;

const NO_OFFER_OK = /אין מבצע|بدون عرض|no offer|אין הנחה/i;

function includesNormalized(blob: string, snippet: string): boolean {
  const a = blob.replace(/\s+/g, " ").trim().toLowerCase();
  const b = snippet.replace(/\s+/g, " ").trim().toLowerCase();
  if (!b) return false;
  if (a.includes(b)) return true;
  const compactA = a.replace(/[\s,.\-–—]/g, "");
  const compactB = b.replace(/[\s,.\-–—]/g, "");
  return compactB.length >= 2 && compactA.includes(compactB);
}

function statusFor(snippet: string, truth: string, inferred = false): FactStatus {
  if (!snippet.trim()) return "UNKNOWN";
  if (includesNormalized(truth, snippet)) return "USER-PROVIDED";
  if (inferred) return "INFERENCE";
  return "UNSUPPORTED";
}

function collect(re: RegExp, text: string): string[] {
  const out: string[] = [];
  const copy = new RegExp(re.source, re.flags.includes("g") ? re.flags : `${re.flags}g`);
  let m: RegExpExecArray | null;
  while ((m = copy.exec(text))) {
    if (m[0]) out.push(m[0]);
  }
  return out;
}

export function extractClaims(text: string, truth: BusinessTruth): ClaimHit[] {
  const blob = businessTruthBlob(truth);
  const hits: ClaimHit[] = [];
  const push = (kind: ClaimHit["kind"], raw: string) => {
    const t = raw.trim();
    if (!t) return;
    if (kind === "discount" && NO_OFFER_OK.test(t) && truth.offerIsNone) return;
    hits.push({ kind, text: t, status: statusFor(t, blob) });
  };
  for (const t of collect(PRICE_RE, text)) push("price", t);
  for (const t of collect(PERCENT_RE, text)) push("stat", t);
  for (const t of collect(DISCOUNT_RE, text)) push("discount", t);
  for (const t of collect(GUARANTEE_RE, text)) push("guarantee", t);
  for (const t of collect(STAT_RE, text)) push("stat", t);
  for (const t of collect(TESTIMONIAL_RE, text)) push("testimonial", t);
  for (const t of collect(CERT_RE, text)) push("cert", t);
  for (const t of collect(SCARCITY_RE, text)) push("scarcity", t);
  for (const t of collect(DEADLINE_RE, text)) push("deadline", t);
  for (const t of collect(PERFORMANCE_RE, text)) push("performance", t);
  return hits;
}

export function unsupportedClaims(text: string, truth: BusinessTruth): ClaimHit[] {
  return extractClaims(text, truth).filter((c) => c.status === "UNSUPPORTED");
}

export function hasInventedCommercialClaim(text: string, truth: BusinessTruth, intake?: Intake): boolean {
  if (unsupportedClaims(text, truth).length) return true;
  if (intake && inventsForbidden(text, intake)) return true;
  if (truth.offerIsNone && /הנחה|خصم|discount|קופון|كوبون/i.test(text) && !NO_OFFER_OK.test(text)) {
    if (!includesNormalized(businessTruthBlob(truth), text.match(/הנחה|خصم|discount|קופון|كوبون/i)?.[0] || "___never___")) {
      return true;
    }
  }
  return false;
}

/** Strip unsupported commercial sentences. Does not guess a replacement fact. */
export function stripUnsupportedClaims(text: string, truth: BusinessTruth, intake?: Intake): string {
  const hits = unsupportedClaims(text, truth);
  let next = text;
  for (const hit of hits) {
    next = next.split(hit.text).join("").replace(/\s{2,}/g, " ");
  }
  if (intake && inventsForbidden(next, intake)) {
    next = next
      .split(/[.!?。\n]/)
      .filter((s) => !inventsForbidden(s, intake))
      .join(". ")
      .replace(/\s{2,}/g, " ")
      .trim();
  }
  return next.replace(/\s{2,}/g, " ").replace(/\s+([,.,])/g, "$1").trim();
}

export function classifyOffer(truth: BusinessTruth): FactStatus {
  if (!truth.offer.trim()) return "UNKNOWN";
  if (truth.offerIsNone) return "USER-PROVIDED";
  return "USER-PROVIDED";
}

export function classifyProof(truth: BusinessTruth): FactStatus {
  const blob = `${truth.advantage} ${truth.description} ${truth.pastResults}`;
  if (/דירוג|ביקורות|עדות|review|rating|testimonial|تقييم|شهادة/i.test(blob)) return "USER-PROVIDED";
  return "UNKNOWN";
}

export function proofAllowed(truth: BusinessTruth): boolean {
  return classifyProof(truth) === "USER-PROVIDED";
}

export function offerLineForLocale(truth: BusinessTruth, locale: "he" | "ar" | "en"): string | undefined {
  if (truth.offerIsNone || !truth.offer.trim()) return undefined;
  return truth.offer.trim();
}

export function factStatusForAd(text: string, truth: BusinessTruth, intake?: Intake): FactStatus {
  if (hasInventedCommercialClaim(text, truth, intake)) return "UNSUPPORTED";
  const blob = businessTruthBlob(truth);
  if (!blob.trim()) return "UNKNOWN";
  if (truth.name && text.includes(truth.name)) return "USER-PROVIDED";
  return "USER-PROVIDED";
}

/** Tokens that appear in history/market but NOT in Business Truth — contamination markers. */
export function foreignFactTokens(layers: SourceLayers): string[] {
  const truth = businessTruthBlob(layers.businessTruth).toLowerCase();
  const foreign: string[] = [];
  const scan = (blob: string) => {
    for (const hit of [
      ...collect(PRICE_RE, blob),
      ...collect(PERCENT_RE, blob),
      ...collect(DISCOUNT_RE, blob),
      ...collect(TESTIMONIAL_RE, blob),
      ...collect(STAT_RE, blob),
    ]) {
      if (!includesNormalized(truth, hit)) foreign.push(hit.trim());
    }
  };
  scan(layers.creativeHistory.pastAdText);
  for (const t of layers.creativeHistory.pastCreativeTexts) scan(t);
  for (const n of layers.marketIntel.notes) scan(`${n.title} ${n.note}`);
  for (const c of layers.marketIntel.competitorObservations) scan(`${c.name} ${c.notes}`);
  return [...new Set(foreign.filter((s) => s.length >= 2))];
}

export function containsForeignFacts(text: string, layers: SourceLayers): string[] {
  const hits: string[] = [];
  for (const tok of foreignFactTokens(layers)) {
    if (tok.length < 3) continue;
    if (includesNormalized(text, tok)) hits.push(tok);
  }
  return hits;
}

export function containsNamedCompetitorOffer(text: string, layers: SourceLayers): boolean {
  const lower = text.toLowerCase();
  for (const c of layers.marketIntel.competitorObservations) {
    if (!c.name || !c.notes) continue;
    const offerish = /הנחה|خصم|discount|₪|%|מבצע/.test(c.notes);
    if (offerish && includesNormalized(text, c.notes) && !includesNormalized(businessTruthBlob(layers.businessTruth), c.notes)) {
      return true;
    }
    if (offerish && lower.includes(c.name.toLowerCase()) && /הנחה|خصم|discount|₪/.test(text)) {
      if (!includesNormalized(businessTruthBlob(layers.businessTruth), c.notes)) return true;
    }
  }
  return false;
}

export function isNoOfferIntake(intake: Intake): boolean {
  return isNoOffer(intake.offer);
}
