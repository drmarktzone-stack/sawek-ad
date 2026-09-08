/**
 * Mandatory scan pipeline. LLM must not jump page → Truth.
 */
import { extractFieldsFromText, type IngestFieldId } from "../document-ingest";

type UrlIngestFields = Partial<Record<IngestFieldId, string>>;
import { businessCorpus, buildBusinessIdentity, classifyUnits, extractContentUnits, rawScanText } from "./page";
import { governFields } from "./govern";
import type { ScanTruthResult } from "./types";

export interface PipelineInput {
  html: string;
  pageUrl: string;
  extraText?: string;
  fallbackName?: string;
  /** Pre-extracted fields (JSON-LD overlays). Governed before Truth. */
  seedFields?: UrlIngestFields;
}

export function runScanTruthPipeline(input: PipelineInput): ScanTruthResult & { fields: UrlIngestFields } {
  const units0 = extractContentUnits(input.html, input.pageUrl, input.extraText);
  const identity = buildBusinessIdentity(units0, input.pageUrl, input.fallbackName || "");
  const units = classifyUnits(units0, identity, input.pageUrl);
  const corpus = businessCorpus(units);
  const raw = rawScanText(units);

  let extracted: UrlIngestFields = {};
  if (corpus.trim()) {
    extracted = extractFieldsFromText(corpus, filenameFromUrl(input.pageUrl));
  }
  const seeded: UrlIngestFields = { ...(input.seedFields || {}), ...extracted };
  // Seed loses to extracted only when seed empty — govern will drop chrome either way.
  for (const k of Object.keys(input.seedFields || {}) as IngestFieldId[]) {
    const s = String(input.seedFields?.[k] || "").trim();
    if (s && !String(extracted[k] || "").trim()) seeded[k] = s;
  }

  const governed = governFields(seeded, units, identity);
  return {
    identity,
    units,
    businessCorpus: corpus,
    rawScanText: raw,
    accepted: governed.accepted,
    rejected: governed.rejected,
    insights: [],
    fields: governed.fields,
  };
}

function filenameFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const last = u.pathname.split("/").filter(Boolean).pop() || "index.html";
    return last.includes(".") ? last : `${last || "homepage"}.html`;
  } catch {
    return "homepage.html";
  }
}

export function extraPageMayFillTruth(url: string): boolean {
  try {
    const path = new URL(url).pathname.toLowerCase();
    if (/\/(blog|news|article|press|stories|reviews?)(\/|$)/.test(path)) return false;
    if (/\/(cart|checkout|account|login|signin)(\/|$)/.test(path)) return false;
    return true;
  } catch {
    return false;
  }
}

/** Extra pages may fill contact/hours only — never offer/audience/problem. */
export const EXTRA_CONTACT_FIELDS: IngestFieldId[] = [
  "phone",
  "whatsapp",
  "location",
  "clinicHours",
  "description",
];
