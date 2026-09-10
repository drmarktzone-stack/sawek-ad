import type { AdVariant, Intake, Locale, VariantKind } from "../types";
import { canonicalDoctorName } from "../demo";
import { buildSpokenVariant, clipAtWord } from "./spoken";
import { detectVertical, isBakery, isPediatrics, restaurantHungerLine, unknownProblemLabel } from "../vertical";
import { isNoOffer } from "../no-offer";
import { OFFER_CHIPS, resolveChipLabel } from "../chips";
import { coachIntake, isUnknownProblem } from "./coach";
import { applyVoiceLockToText, voiceFromIntake, voiceIsLocked } from "./voice";
import { offerLineForCopy } from "./offer-builder";
import { customerCopyHasLeak, gateCustomerAd, isCannedClinicSlogan, localeScriptBleed, templateLoopHits } from "../copy-purity";

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
  const voice = voiceFromIntake(fixed);
  const out: AdVariant[] = [];
  for (const locale of ["he", "ar", "en"] as Locale[]) {
    for (const kind of KINDS) {
      let variant = overlayCoachHeadline(buildSpokenVariant(fixed, kind, locale), fixed, coach, locale);
      if (voiceIsLocked(voice)) {
        const offer = offerLineForCopy(fixed, locale);
        const core = voice.coreMessage.trim();
        if (kind === "strong_offer" && (offer || core)) {
          variant = { ...variant, headline: clipAtWord(applyVoiceLockToText(offer || core, fixed), 48) };
        }
        variant = {
          ...variant,
          headline: applyVoiceLockToText(variant.headline, fixed),
          primaryText: applyVoiceLockToText(variant.primaryText, fixed),
          cta: applyVoiceLockToText(variant.cta, fixed),
        };
      }
      const gated = gateCustomerAd(
        { headline: variant.headline, body: variant.primaryText, cta: variant.cta },
        fixed,
        locale,
      );
      variant = { ...variant, headline: gated.headline, primaryText: gated.body, cta: gated.cta };
      out.push(variant);
    }
  }
  return diversifyVariantHeadlines(out, fixed);
}

function factHeadlineForKind(intake: Intake, locale: Locale, kind: VariantKind, used: string[]): string {
  const name = intake.businessName.trim();
  const adv = intake.uniqueAdvantage.trim();
  const loc = intake.location.trim();
  const cat = intake.category.trim();
  const candidates: string[] = [];
  if (kind === "unique_advantage" && adv) candidates.push(clipAtWord(adv, 48));
  if (kind === "very_short" && name) candidates.push(name);
  if (kind === "narrative" && name && loc) {
    candidates.push(clipAtWord(locale === "ar" ? `${name} — ${loc}` : `${name} · ${loc}`, 48));
  }
  if (kind === "direct_sales" && intake.whatsapp.trim()) {
    const wa = intake.whatsapp.trim().split(/\s*[·|,;]\s*/)[0];
    candidates.push(clipAtWord(locale === "ar" ? `واتساب ${wa}` : locale === "he" ? `וואטסאפ ${wa}` : `WhatsApp ${wa}`, 48));
  }
  if (name && cat) candidates.push(clipAtWord(`${name} — ${cat}`, 48));
  if (name) candidates.push(name);
  if (adv) candidates.push(clipAtWord(adv, 48));
  return candidates.find((h) => h && !used.includes(h) && !isCannedClinicSlogan(h, intake)) || name || candidates[0] || "";
}

function diversifyVariantHeadlines(variants: AdVariant[], intake: Intake): AdVariant[] {
  const locales: Locale[] = ["he", "ar", "en"];
  const out = [...variants];
  for (const locale of locales) {
    const idxs = out.map((v, i) => (v.locale === locale ? i : -1)).filter((i) => i >= 0);
    const used: string[] = [];
    for (const i of idxs) {
      let h = out[i].headline;
      const loop = templateLoopHits([...used, h]);
      if (!h.trim() || isCannedClinicSlogan(h, intake) || loop.includes(h) || localeScriptBleed(h, locale)) {
        h = factHeadlineForKind(intake, locale, out[i].kind, used);
        const gated = gateCustomerAd({ headline: h, body: out[i].primaryText, cta: out[i].cta }, intake, locale);
        out[i] = { ...out[i], headline: gated.headline, primaryText: gated.body, cta: gated.cta };
        h = out[i].headline;
      }
      used.push(h);
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
    const name = intake.businessName.trim();
    const unknownBits = Object.values(unknownProblemLabel(detectVertical(intake)));
    const p = safe.find((s) => s.field === "biggestProblem");
    const proposed = p?.proposed[locale]?.trim() || "";
    const looksUnknown = !proposed || unknownBits.some((u) => proposed.startsWith(u) || proposed === u);
    if (name && (looksUnknown || detectVertical(intake) === "restaurant")) {
      const offer = !isNoOffer(intake.offer)
        ? (resolveChipLabel(intake.offer, OFFER_CHIPS, locale) || intake.offer.trim())
        : "";
      if (detectVertical(intake) === "restaurant") {
        headline = clipAtWord(offer ? `${name} — ${offer}` : restaurantHungerLine(intake, locale), 48);
      } else {
        headline = clipAtWord(offer ? `${name} — ${offer}` : name, 48);
      }
    } else if (p && proposed) {
      headline = clipAtWord(proposed, 48);
    }
  } else if (variant.kind === "unique_advantage" && !isBakery(intake)) {
    const a = safe.find((s) => s.field === "uniqueAdvantage");
    if (a) headline = clipAtWord(a.proposed[locale], 48);
  } else if (variant.kind === "strong_offer" && !isNoOffer(intake.offer)) {
    const offer = resolveChipLabel(intake.offer, OFFER_CHIPS, locale) || intake.offer.trim();
    if (offer && !headline.includes(offer)) {
      const name = intake.businessName.trim();
      headline = clipAtWord(name ? `${name} — ${offer}` : offer, 48);
    }
  }

  if (!headline.trim() || customerCopyHasLeak(headline)) return variant;
  return { ...variant, headline };
}
