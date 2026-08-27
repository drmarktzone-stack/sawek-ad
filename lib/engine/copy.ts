import type { AdVariant, Intake, Locale, VariantKind } from "../types";
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
  const out: AdVariant[] = [];
  for (const locale of ["he", "ar", "en"] as Locale[]) {
    for (const kind of KINDS) {
      out.push(buildSpokenVariant(intake, kind, locale));
    }
  }
  return out;
}
