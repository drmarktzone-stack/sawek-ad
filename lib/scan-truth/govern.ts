/**
 * Evidence validation + field governance.
 * Confidence is not Truth. INFERENCE never enters Business Truth.
 */
import type { IngestFieldId } from "../document-ingest";

type UrlIngestFields = Partial<Record<IngestFieldId, string>>;
import {
  classToRejection,
  isAllowedQualification,
  MERGE_STRENGTH,
  type AllowedQualification,
  type BusinessIdentity,
  type ContentClass,
  type ContentUnit,
  type FactEvidence,
  type FactQualification,
} from "./types";
import {
  COMMERCIAL_CLAIM_RE,
  LABELED_SALE_RE,
  isPediatricBusinessHay,
  SHIPPING_ONLY_RE,
  identityTokens,
  isBareDemographic,
  isEcommerceChromeText,
  isExplicitAudienceStatement,
  isPainStatement,
  isUnknownSentinel,
  isUsableLocationValue,
  tokenOverlap,
} from "./patterns";

const REJECT_CLASSES = new Set<ContentClass>([
  "PAGE_CHROME",
  "NAV_UI",
  "GENERIC",
  "BLOG_EDITORIAL",
  "THIRD_PARTY",
  "COMPETITOR",
  "REVIEWS",
  "GENERATED_DEMO",
]);

function nowIso(): string {
  return new Date().toISOString();
}

function evidence(
  field: IngestFieldId,
  fact: string,
  unit: ContentUnit | undefined,
  qualification: FactQualification,
  sourceUrl: string,
  snippet?: string,
): FactEvidence {
  return {
    field,
    fact,
    sourceUrl,
    sourceType: unit?.sourceType || "visible",
    timestamp: nowIso(),
    confidence: qualification === "VERIFIED_BUSINESS_FACT" ? 0.9 : qualification === "SOURCE_VERIFIED_FACT" ? 0.8 : 0.2,
    snippet: (snippet || unit?.text || fact).slice(0, 240),
    qualification,
    contentClass: unit?.contentClass || "UNKNOWN",
    identityBound: Boolean(unit?.identityBound),
  };
}

function unitsFor(units: ContentUnit[], fact: string): ContentUnit | undefined {
  const n = fact.replace(/\s+/g, " ").trim().toLowerCase();
  if (!n) return undefined;
  return (
    units.find((u) => u.text.toLowerCase().includes(n.slice(0, 80))) ||
    units.find((u) => n.includes(u.text.toLowerCase().slice(0, 40)))
  );
}

function offerBindsToBusiness(text: string, identity: BusinessIdentity): boolean {
  if (!identity.name) return false;
  if (tokenOverlap(text, identity.name) >= 1) return true;
  const toks = identityTokens(identity.name);
  return toks.some((t) => t.length >= 4 && text.toLowerCase().includes(t));
}

function qualifyOffer(text: string, unit: ContentUnit | undefined, identity: BusinessIdentity): FactQualification {
  const v = text.replace(/\s+/g, " ").trim();
  if (!v) return "UNKNOWN";
  if (isEcommerceChromeText(v) || SHIPPING_ONLY_RE.test(v)) return "PAGE_CHROME";
  if (unit && REJECT_CLASSES.has(unit.contentClass) && unit.contentClass !== "GENERIC") {
    return classToRejection(unit.contentClass) || "PAGE_CHROME";
  }
  if (unit && (unit.region === "nav" || unit.sourceType === "nav")) return "NAVIGATION";
  if (unit && (unit.region === "footer" || unit.sourceType === "footer") && !LABELED_SALE_RE.test(v)) {
    return "PAGE_CHROME";
  }
  if (unit && (unit.region === "article" || unit.contentClass === "BLOG_EDITORIAL")) return "EDITORIAL";
  if (unit && unit.contentClass === "THIRD_PARTY") return "THIRD_PARTY";
  if (COMMERCIAL_CLAIM_RE.test(v) && !LABELED_SALE_RE.test(v) && unit?.sourceType !== "jsonld") {
    return "GENERIC_TEXT";
  }
  if (!LABELED_SALE_RE.test(v) && !/1\s*\+\s*1|\d+\s*%/.test(v) && !/חיסול|מבצע|مجاني|חינם|hot\s*sale/i.test(v)) {
    return "UNKNOWN";
  }
  const bound = offerBindsToBusiness(v, identity) || (unit?.sourceType === "jsonld" && unit.identityBound);
  if (!bound && unit?.region === "header" && !LABELED_SALE_RE.test(v)) return "PAGE_CHROME";
  if (unit?.contentClass === "BUSINESS_FACTS" && /(?:100\s*%|مجاني|חינם|מבצע|חיסול|hot\s*sale|1\s*\+\s*1)/i.test(v)) {
    return unit.sourceType === "jsonld" ? "SOURCE_VERIFIED_FACT" : "VERIFIED_BUSINESS_FACT";
  }
  if (!bound && COMMERCIAL_CLAIM_RE.test(v)) {
    if (unit?.region === "main" || unit?.sourceType === "heading" || unit?.sourceType === "og") {
      if (LABELED_SALE_RE.test(v) || /hot\s*sale|מבצע|חיסול/i.test(v)) return "VERIFIED_BUSINESS_FACT";
    }
    return "UNRELATED";
  }
  if (unit?.sourceType === "jsonld" && unit.identityBound) return "SOURCE_VERIFIED_FACT";
  if (bound && (unit?.region === "main" || unit?.sourceType === "heading" || unit?.sourceType === "og" || unit?.region === "header")) {
    return "VERIFIED_BUSINESS_FACT";
  }
  return "UNKNOWN";
}

function qualifyAudience(
  text: string,
  unit: ContentUnit | undefined,
  pageHay: string,
  identity: BusinessIdentity,
): FactQualification {
  const v = text.replace(/\s+/g, " ").trim();
  if (!v) return "UNKNOWN";
  const pediatric = isPediatricBusinessHay(pageHay, identity.name);
  const ownedParents = pediatric && /^(parents|הורים|أهل)$/i.test(v);
  if (isBareDemographic(v) && !isExplicitAudienceStatement(pageHay) && !ownedParents) {
    return "UNSUPPORTED_INFERENCE";
  }
  const tokens = v.split(/[,/]+/).map((s) => s.trim()).filter(Boolean);
  for (const tok of tokens) {
    if (isBareDemographic(tok)) {
      if ((tok === "parents" || tok === "הורים" || tok === "أهل") && pediatric) continue;
      if (!isExplicitAudienceStatement(pageHay) && !isExplicitAudienceStatement(tok)) {
        return "UNSUPPORTED_INFERENCE";
      }
    }
  }
  if (unit && (unit.contentClass === "BLOG_EDITORIAL" || unit.contentClass === "GENERIC")) return "EDITORIAL";
  if (unit && REJECT_CLASSES.has(unit.contentClass) && unit.contentClass !== "GENERIC") {
    return classToRejection(unit.contentClass) || "UNRELATED";
  }
  if (ownedParents) return "VERIFIED_BUSINESS_FACT";
  if (isExplicitAudienceStatement(pageHay) || isExplicitAudienceStatement(v)) return "VERIFIED_BUSINESS_FACT";
  return "UNKNOWN";
}

function qualifyProblem(text: string, unit: ContentUnit | undefined): FactQualification {
  const v = text.replace(/\s+/g, " ").trim();
  if (!v || isUnknownSentinel(v)) return "UNKNOWN";
  if (isEcommerceChromeText(v)) return "PAGE_CHROME";
  if (unit && REJECT_CLASSES.has(unit.contentClass)) return classToRejection(unit.contentClass) || "PAGE_CHROME";
  if (!isPainStatement(v)) return "UNSUPPORTED_INFERENCE";
  if (unit?.contentClass === "BUSINESS_FACTS" || unit?.sourceType === "og" || unit?.sourceType === "heading") {
    return "VERIFIED_BUSINESS_FACT";
  }
  return "UNKNOWN";
}

function qualifyLocation(text: string, unit: ContentUnit | undefined): FactQualification {
  const v = text.replace(/\s+/g, " ").trim();
  if (!v) return "UNKNOWN";
  if (!isUsableLocationValue(v)) return "GENERIC_TEXT";
  if (unit && unit.contentClass === "THIRD_PARTY") return "THIRD_PARTY";
  if (unit?.sourceType === "jsonld" && unit.identityBound) return "SOURCE_VERIFIED_FACT";
  if (unit?.contentClass === "BUSINESS_FACTS" || unit?.sourceType === "footer") return "VERIFIED_BUSINESS_FACT";
  return "SOURCE_VERIFIED_FACT";
}

export function qualifyField(
  field: IngestFieldId,
  value: string,
  units: ContentUnit[],
  identity: BusinessIdentity,
  pageHay: string,
): FactEvidence {
  const unit = unitsFor(units, value);
  let q: FactQualification = "UNKNOWN";
  if (field === "offer") q = qualifyOffer(value, unit, identity);
  else if (field === "audience") q = qualifyAudience(value, unit, pageHay, identity);
  else if (field === "biggestProblem") q = qualifyProblem(value, unit);
  else if (field === "location") q = qualifyLocation(value, unit);
  else if (field === "uniqueAdvantage" || field === "brandTone" || field === "brandPositioning") {
    if (isEcommerceChromeText(value)) q = "PAGE_CHROME";
    else if (
      unit &&
      REJECT_CLASSES.has(unit.contentClass) &&
      unit.sourceType !== "og" &&
      unit.sourceType !== "heading" &&
      unit.sourceType !== "meta"
    ) {
      q = classToRejection(unit.contentClass) || "UNRELATED";
    } else if (
      unit?.contentClass === "BUSINESS_FACTS" ||
      unit?.sourceType === "og" ||
      unit?.sourceType === "heading" ||
      unit?.sourceType === "jsonld" ||
      unit?.sourceType === "meta" ||
      !unit
    ) {
      q = unit?.sourceType === "jsonld" ? "SOURCE_VERIFIED_FACT" : "VERIFIED_BUSINESS_FACT";
    } else q = "UNKNOWN";
  } else if (field === "businessName" || field === "category" || field === "description") {
    const identityHit =
      (identity.name && tokenOverlap(value, identity.name) >= 1) ||
      unit?.sourceType === "jsonld" ||
      unit?.sourceType === "og" ||
      unit?.sourceType === "meta" ||
      unit?.sourceType === "heading" ||
      !unit;
    if (unit && unit.contentClass === "THIRD_PARTY" && !identityHit) {
      q = "UNRELATED";
    } else if (identityHit || unit?.contentClass === "BUSINESS_FACTS") {
      q = unit?.sourceType === "jsonld" ? "SOURCE_VERIFIED_FACT" : "VERIFIED_BUSINESS_FACT";
    } else if (unit && REJECT_CLASSES.has(unit.contentClass)) {
      q = classToRejection(unit.contentClass) || "UNRELATED";
    } else {
      q = "VERIFIED_BUSINESS_FACT";
    }
  } else {
    if (unit?.contentClass === "BUSINESS_FACTS" || !unit) {
      q = unit?.sourceType === "jsonld" ? "SOURCE_VERIFIED_FACT" : "VERIFIED_BUSINESS_FACT";
    } else if (unit && REJECT_CLASSES.has(unit.contentClass)) {
      q = classToRejection(unit.contentClass) || "UNRELATED";
    }
  }
  return evidence(field, value, unit, q, identity.canonicalUrl);
}

export function governFields(
  fields: UrlIngestFields,
  units: ContentUnit[],
  identity: BusinessIdentity,
): { fields: UrlIngestFields; accepted: FactEvidence[]; rejected: FactEvidence[] } {
  const out: UrlIngestFields = { ...fields };
  const accepted: FactEvidence[] = [];
  const rejected: FactEvidence[] = [];
  const pageHay = units
    .filter((u) => u.contentClass === "BUSINESS_FACTS")
    .map((u) => u.text)
    .join("\n");

  const check = (field: IngestFieldId) => {
    const raw = String(out[field] || "").trim();
    if (!raw) return;
    const ev = qualifyField(field, raw, units, identity, pageHay);
    if (!isAllowedQualification(ev.qualification) || ev.qualification === "UNKNOWN") {
      if (field === "biggestProblem" && isUnknownSentinel(raw)) {
        out[field] = "unknown";
        accepted.push({ ...ev, fact: "unknown", qualification: "UNKNOWN" });
        return;
      }
      rejected.push(ev);
      delete out[field];
      return;
    }
    if (MERGE_STRENGTH[ev.qualification as AllowedQualification] <= 0) {
      rejected.push(ev);
      delete out[field];
      return;
    }
    accepted.push(ev);
  };

  check("offer");
  check("audience");
  check("biggestProblem");
  check("location");
  check("uniqueAdvantage");
  check("brandTone");
  check("brandPositioning");
  check("businessName");
  check("category");
  check("description");

  if (out.biggestProblem && !isPainStatement(out.biggestProblem) && !isUnknownSentinel(out.biggestProblem)) {
    rejected.push(qualifyField("biggestProblem", out.biggestProblem, units, identity, pageHay));
    delete out.biggestProblem;
  }
  if (!String(out.biggestProblem || "").trim() && pageHay.length > 40) {
    out.biggestProblem = "unknown";
    accepted.push(
      evidence("biggestProblem", "unknown", undefined, "UNKNOWN", identity.canonicalUrl, "no verified pain"),
    );
  }

  return { fields: out, accepted, rejected };
}

/** Weak never overwrites strong. Missing stays UNKNOWN — no fallback to prior Truth. */
export function mergeByStrength(
  primary: UrlIngestFields,
  incoming: UrlIngestFields,
  primaryQ: Partial<Record<IngestFieldId, AllowedQualification>>,
  incomingQ: Partial<Record<IngestFieldId, AllowedQualification>>,
): UrlIngestFields {
  const out: UrlIngestFields = { ...primary };
  for (const key of Object.keys(incoming) as IngestFieldId[]) {
    const add = String(incoming[key] || "").trim();
    if (!add) continue;
    const have = String(out[key] || "").trim();
    if (!have) {
      out[key] = incoming[key];
      continue;
    }
    const ps = MERGE_STRENGTH[primaryQ[key] || "UNKNOWN"];
    const is_ = MERGE_STRENGTH[incomingQ[key] || "UNKNOWN"];
    if (is_ > ps) out[key] = incoming[key];
  }
  return out;
}
