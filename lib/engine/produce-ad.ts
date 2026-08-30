import type { Intake, Locale, ProducedAd } from "../types";
import { DESIGN_STYLES, stylesForVertical, styleById } from "../design-styles";
import { uid } from "../utils";
import { isNoOffer } from "../no-offer";
import { OFFER_CHIPS, resolveChipLabel } from "../chips";
import { hoursLine, kupaLine, landingH1, spokenAdvantage, spokenCta, isWalkIn } from "./spoken";
import { canonicalDoctorName } from "../demo";
import { isFreeService } from "../operating-model";
import { detectVertical, visualNoPhotoNote } from "../vertical";

function pastRefNote(intake: Intake, locale: Locale): string {
  const n = (intake.pastCreatives ?? []).length;
  if (!n) return "";
  if (locale === "he") return ` ${n} מודעות ישנות מתויגות past_creative — ייחוס מבנה בלבד, בלי להעתיק VIP/100%/מחיר שלא אושר.`;
  if (locale === "ar") return ` ${n} إعلانات سابقة موسومة past_creative — مرجع بنية فقط، بلا نسخ VIP/100%/سعر غير مؤكد.`;
  return ` ${n} past ads tagged past_creative — structure reference only; do not copy unconfirmed VIP/100%/prices.`;
}

function noOfferNote(locale: Locale): string {
  if (locale === "he") return "אין מבצע ואין קופון.";
  if (locale === "ar") return "ما في عرض وما في كوبون.";
  return "No offer and no coupon.";
}

export function produceAd(intake: Intake, styleId: string, idea: string, locale: Locale): ProducedAd {
  const vertical = detectVertical(intake);
  const clinic = vertical === "clinic";
  const style = styleById(styleId) || stylesForVertical(vertical)[0] || DESIGN_STYLES[0];
  const headline = idea.trim() || landingH1(intake, locale);
  const adv = spokenAdvantage(intake, locale);
  const site = intake.website?.trim() ?? "";
  const offerBit =
    isFreeService(intake) || isNoOffer(intake.offer)
      ? clinic
        ? ""
        : noOfferNote(locale)
      : resolveChipLabel(intake.offer, OFFER_CHIPS, locale) || intake.offer;

  const bodyParts = clinic
    ? [
        canonicalDoctorName(intake.businessName),
        idea.trim(),
        isWalkIn(intake)
          ? locale === "he"
            ? "לפי סדר הגעה"
            : locale === "ar"
              ? "جت أولاً"
              : "walk-in"
          : "",
        hoursLine(intake, locale),
        kupaLine(intake, locale),
        offerBit,
        spokenCta(intake, locale),
      ].filter(Boolean)
    : [
        adv,
        idea.trim() && idea.trim() !== headline ? idea.trim() : "",
        site,
        offerBit,
        spokenCta(intake, locale),
      ].filter(Boolean);

  return {
    id: uid("ad"),
    styleId: style.id,
    idea: idea.trim(),
    headline,
    body: bodyParts.join(" · "),
    visualNotes: {
      he: `סגנון «${style.name.he}»: ${style.description.he}. ${visualNoPhotoNote(intake, "he", (intake.mediaAssets ?? []).length > 0)} בלי דירוגים או פנים שאין לכם רשות עליהם.` + pastRefNote(intake, "he"),
      ar: `أسلوب «${style.name.ar}»: ${style.description.ar}. ${visualNoPhotoNote(intake, "ar", (intake.mediaAssets ?? []).length > 0)} بلا تقييمات أو وجوه بلا إذن.` + pastRefNote(intake, "ar"),
      en: `Style “${style.name.en}”: ${style.description.en}. ${visualNoPhotoNote(intake, "en", (intake.mediaAssets ?? []).length > 0)} No ratings or faces you don’t have permission to use.` + pastRefNote(intake, "en"),
    },
    createdAt: new Date().toISOString(),
    assetId: (intake.mediaAssets ?? []).find((a) => a.kind === "image")?.id,
  };
}

export function defaultStyleIdsFor(intake: Intake): string[] {
  return stylesForVertical(detectVertical(intake)).map((s) => s.id);
}
