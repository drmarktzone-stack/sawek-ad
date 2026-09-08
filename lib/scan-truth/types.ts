/**
 * Scan → Business Truth isolation.
 * Raw scan layer is never Truth. Only verified, identity-bound business facts enter.
 *
 * Pipeline:
 * RAW PAGE → CONTENT EXTRACTION → CONTENT CLASSIFICATION
 *   → BUSINESS FACT CANDIDATES → EVIDENCE VALIDATION → BUSINESS TRUTH
 */

import type { IngestFieldId } from "../document-ingest";

/** A–J content classes. Only A may feed Truth candidates. */
export type ContentClass =
  | "BUSINESS_FACTS"
  | "PAGE_CHROME"
  | "NAV_UI"
  | "GENERIC"
  | "BLOG_EDITORIAL"
  | "THIRD_PARTY"
  | "COMPETITOR"
  | "REVIEWS"
  | "GENERATED_DEMO"
  | "UNKNOWN";

export type AllowedQualification =
  | "VERIFIED_BUSINESS_FACT"
  | "USER_PROVIDED_FACT"
  | "SOURCE_VERIFIED_FACT"
  | "UNKNOWN";

export type RejectedQualification =
  | "PAGE_CHROME"
  | "GENERIC_TEXT"
  | "EDITORIAL"
  | "THIRD_PARTY"
  | "COMPETITOR"
  | "NAVIGATION"
  | "UI"
  | "UNRELATED"
  | "GENERATED"
  | "UNSUPPORTED_INFERENCE";

export type FactQualification = AllowedQualification | RejectedQualification;

export type SourceType =
  | "jsonld"
  | "og"
  | "meta"
  | "heading"
  | "main"
  | "nav"
  | "header"
  | "footer"
  | "aside"
  | "article"
  | "widget"
  | "iframe"
  | "script"
  | "visible"
  | "labeled";

export type PageRegion =
  | "head"
  | "header"
  | "nav"
  | "main"
  | "article"
  | "aside"
  | "footer"
  | "form"
  | "iframe"
  | "unknown";

export interface ContentUnit {
  id: string;
  text: string;
  region: PageRegion;
  sourceType: SourceType;
  contentClass: ContentClass;
  /** JSON-LD @type or CSS hint used during classification. */
  semanticHint?: string;
  url?: string;
  identityBound: boolean;
}

export interface BusinessIdentity {
  name: string;
  domain: string;
  canonicalUrl: string;
  orgTypes: string[];
  tokens: string[];
  locationHints: string[];
}

export interface FactEvidence {
  field: IngestFieldId;
  fact: string;
  sourceUrl: string;
  sourceType: SourceType;
  timestamp: string;
  confidence: number;
  snippet: string;
  qualification: FactQualification;
  contentClass: ContentClass;
  identityBound: boolean;
}

export const MERGE_STRENGTH: Record<AllowedQualification, number> = {
  USER_PROVIDED_FACT: 100,
  VERIFIED_BUSINESS_FACT: 80,
  SOURCE_VERIFIED_FACT: 70,
  UNKNOWN: 0,
};

export const TRUTH_FIELDS: IngestFieldId[] = [
  "businessName",
  "category",
  "description",
  "location",
  "phone",
  "whatsapp",
  "clinicHours",
  "website",
  "audience",
  "biggestProblem",
  "uniqueAdvantage",
  "offer",
  "brandTone",
  "brandPositioning",
];

export interface ScanTruthResult {
  identity: BusinessIdentity;
  units: ContentUnit[];
  /** Classified business-owned prose only. Safe to extract Truth from. */
  businessCorpus: string;
  /** Full visible scan — not Truth. */
  rawScanText: string;
  accepted: FactEvidence[];
  rejected: FactEvidence[];
  insights: string[];
}

export function isAllowedQualification(q: FactQualification): q is AllowedQualification {
  return (
    q === "VERIFIED_BUSINESS_FACT" ||
    q === "USER_PROVIDED_FACT" ||
    q === "SOURCE_VERIFIED_FACT" ||
    q === "UNKNOWN"
  );
}

export function classToRejection(c: ContentClass): RejectedQualification | null {
  switch (c) {
    case "PAGE_CHROME":
      return "PAGE_CHROME";
    case "NAV_UI":
      return "NAVIGATION";
    case "GENERIC":
      return "GENERIC_TEXT";
    case "BLOG_EDITORIAL":
      return "EDITORIAL";
    case "THIRD_PARTY":
      return "THIRD_PARTY";
    case "COMPETITOR":
      return "COMPETITOR";
    case "REVIEWS":
      return "THIRD_PARTY";
    case "GENERATED_DEMO":
      return "GENERATED";
    case "UNKNOWN":
      return "UNRELATED";
    default:
      return null;
  }
}
