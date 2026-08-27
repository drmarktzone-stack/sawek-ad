import type { AdVariant, Intake, Locale, VariantKind } from "../types";
import { correctAbuMokhSpelling } from "../demo";
import { buildSpokenVariant } from "./spoken";

const KINDS: VariantKind[] = [
  "strong_offer",
  "very_short",
  "emotional",
  "narrative",
  "direct_sales",
  "unique_advantage",
];

export function generateVariants(intake: Intake): AdVariant[] {
  const fixed: Intake = { ...intake, businessName: correctAbuMokhSpelling(intake.businessName) };
  const out: AdVariant[] = [];
  for (const locale of ["he", "ar", "en"] as Locale[]) {
    for (const kind of KINDS) {
      out.push(buildSpokenVariant(fixed, kind, locale));
    }
  }
  return out;
}
