import type { AdVariant, Intake, Locale, VariantKind } from "../types";
import { canonicalDoctorName } from "../demo";
import { buildSpokenVariant, clipAtWord } from "./spoken";
import { detectVertical, isPediatrics } from "../vertical";
import { isNoOffer } from "../no-offer";
import { OFFER_CHIPS, resolveChipLabel } from "../chips";
import { coachIntake, isUnknownProblem } from "./coach";

const KINDS: VariantKind[] = [
  "strong_offer",
  "very_short",
  "emotional",
  "narrative",
  "direct_sales",
  "unique_advantage",
];

export function generateVariants(intake: Intake): AdVariant[] {
  const clinic = detectVertical(intake) === "clinic";
  const fixed: Intake = clinic
    ? { ...intake, businessName: canonicalDoctorName(intake.businessName) }
    : { ...intake };
  const coach = coachIntake(fixed);
  const out: AdVariant[] = [];
  for (const locale of ["he", "ar", "en"] as Locale[]) {
    for (const kind of KINDS) {
      out.push(overlayCoachHeadline(buildSpokenVariant(fixed, kind, locale), fixed, coach, locale));
    }
  }
  return out;
}

function overlayCoachHeadline(
  variant: AdVariant,
  intake: Intake,
  coach: ReturnType<typeof coachIntake>,
  locale: Locale,
): AdVariant {
  if (isPediatrics(intake)) return variant;
  const safe = coach.suggestions.filter((s) => s.applySafe && s.proposed[locale]?.trim());
  let headline = variant.headline;

  if (variant.kind === "emotional" && isUnknownProblem(intake)) {
    const p = safe.find((s) => s.field === "biggestProblem");
    if (p) headline = clipAtWord(p.proposed[locale], 48);
  } else if (variant.kind === "unique_advantage") {
    const a = safe.find((s) => s.field === "uniqueAdvantage");
    if (a) headline = clipAtWord(a.proposed[locale], 48);
  } else if (variant.kind === "strong_offer" && !isNoOffer(intake.offer)) {
    const offer = resolveChipLabel(intake.offer, OFFER_CHIPS, locale) || intake.offer.trim();
    if (offer && !headline.includes(offer)) {
      const name = intake.businessName.trim();
      headline = clipAtWord(name ? `${name} — ${offer}` : offer, 48);
    }
  }

  if (!headline.trim()) return variant;
  return { ...variant, headline };
}
