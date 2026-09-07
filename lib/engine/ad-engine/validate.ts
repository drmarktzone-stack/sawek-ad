/**
 * Final validation gate — deterministic.
 * Fail → regenerate / repair internally. Never show a failed package.
 */
import type { CompleteAdLocale, CompleteAdPackage, Intake, Locale } from "../../types";
import { contradictsVertical } from "../campaign-brief";
import { detectVertical } from "../../vertical";
import {
  containsForeignFacts,
  containsNamedCompetitorOffer,
  hasInventedCommercialClaim,
  stripUnsupportedClaims,
} from "./facts";
import { businessTruthBlob, type SourceLayers } from "./sources";

const HE = /[\u0590-\u05FF]/;
const AR = /[\u0600-\u06FF]/;

export interface GateResult {
  ok: boolean;
  repaired: boolean;
  failures: string[];
  locales: Record<Locale, CompleteAdLocale>;
}

function localeComplete(loc: CompleteAdLocale): string[] {
  const missing: string[] = [];
  if (!loc.headline.trim()) missing.push("headline");
  if (!loc.copy.trim()) missing.push("copy");
  if (!loc.cta.trim()) missing.push("cta");
  if (!loc.concept.trim()) missing.push("concept");
  if (!loc.hook.trim()) missing.push("hook");
  return missing;
}

function rtlOk(loc: CompleteAdLocale, locale: Locale): boolean {
  const blob = `${loc.headline} ${loc.copy} ${loc.cta}`;
  if (locale === "he") return HE.test(blob) || !/[A-Za-z]{12,}/.test(blob) || HE.test(loc.headline);
  if (locale === "ar") return AR.test(blob) || AR.test(loc.headline);
  return true;
}

function repairLocale(loc: CompleteAdLocale, intake: Intake, layers: SourceLayers): CompleteAdLocale {
  const next = { ...loc };
  next.headline = stripUnsupportedClaims(next.headline, layers.businessTruth, intake);
  next.copy = stripUnsupportedClaims(next.copy, layers.businessTruth, intake);
  next.hook = stripUnsupportedClaims(next.hook, layers.businessTruth, intake);
  next.cta = stripUnsupportedClaims(next.cta, layers.businessTruth, intake);
  if (next.offer && hasInventedCommercialClaim(next.offer, layers.businessTruth, intake)) {
    delete next.offer;
  }
  if (next.proof && hasInventedCommercialClaim(next.proof, layers.businessTruth, intake)) {
    delete next.proof;
  }
  const foreign = containsForeignFacts(`${next.headline}\n${next.copy}`, layers);
  for (const tok of foreign) {
    next.headline = next.headline.split(tok).join("").replace(/\s{2,}/g, " ").trim();
    next.copy = next.copy.split(tok).join("").replace(/\s{2,}/g, " ").trim();
  }
  if (!next.headline.trim()) next.headline = intake.businessName.trim() || next.concept;
  if (!next.copy.trim()) {
    const truth = businessTruthBlob(layers.businessTruth);
    next.copy = [intake.businessName, intake.location, intake.uniqueAdvantage].filter(Boolean).join(" · ") || truth.slice(0, 180);
  }
  if (!next.cta.trim()) next.cta = intake.whatsapp ? (loc.cta || "WhatsApp") : next.cta;
  return next;
}

export function runValidationGate(input: {
  intake: Intake;
  locales: Record<Locale, CompleteAdLocale>;
  layers: SourceLayers;
  marketUsed: boolean;
  marketEvidence?: string;
}): GateResult {
  const failures: string[] = [];
  let locales = {
    he: { ...input.locales.he },
    ar: { ...input.locales.ar },
    en: { ...input.locales.en },
  };
  let repaired = false;
  const vertical = detectVertical(input.intake);

  for (const locale of ["he", "ar", "en"] as Locale[]) {
    const loc = locales[locale];
    const blob = `${loc.headline}\n${loc.copy}\n${loc.cta}\n${loc.offer || ""}\n${loc.proof || ""}`;
    if (hasInventedCommercialClaim(blob, input.layers.businessTruth, input.intake)) {
      failures.push(`${locale}: invented commercial claim`);
      locales[locale] = repairLocale(loc, input.intake, input.layers);
      repaired = true;
    }
    const foreign = containsForeignFacts(blob, input.layers);
    if (foreign.length) {
      failures.push(`${locale}: previous/market fact leaked (${foreign.slice(0, 3).join(", ")})`);
      locales[locale] = repairLocale(locales[locale], input.intake, input.layers);
      repaired = true;
    }
    if (containsNamedCompetitorOffer(blob, input.layers)) {
      failures.push(`${locale}: competitor offer inherited`);
      locales[locale] = repairLocale(locales[locale], input.intake, input.layers);
      repaired = true;
    }
    if (contradictsVertical(blob, vertical)) {
      failures.push(`${locale}: vertical contamination`);
    }
    if (!rtlOk(locales[locale], locale)) {
      failures.push(`${locale}: language/RTL mismatch`);
    }
    const missing = localeComplete(locales[locale]);
    if (missing.length) failures.push(`${locale}: incomplete ${missing.join(",")}`);
  }

  if (input.marketUsed && !input.marketEvidence?.trim() && !input.layers.marketIntel.notes.length) {
    failures.push("market used without evidence");
  }

  const stillBad = ["he", "ar", "en"].some((locale) => {
    const loc = locales[locale as Locale];
    const blob = `${loc.headline}\n${loc.copy}`;
    return (
      hasInventedCommercialClaim(blob, input.layers.businessTruth, input.intake) ||
      containsForeignFacts(blob, input.layers).length > 0 ||
      containsNamedCompetitorOffer(blob, input.layers) ||
      localeComplete(loc).length > 0
    );
  });

  return {
    ok: !stillBad && !failures.some((f) => f.includes("vertical contamination") || f.includes("language/RTL") || f.includes("market used")),
    repaired,
    failures,
    locales,
  };
}

export function packagePassesGate(pack: CompleteAdPackage): boolean {
  return pack.validation.passed && pack.compliance.ok;
}
