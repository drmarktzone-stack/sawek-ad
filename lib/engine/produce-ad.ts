import type { Intake, Locale, ProducedAd } from "../types";
import { DESIGN_STYLES } from "../design-styles";
import { uid } from "../utils";
import { isNoOffer } from "../no-offer";

export function produceAd(intake: Intake, styleId: string, idea: string, locale: Locale): ProducedAd {
  const style = DESIGN_STYLES.find((s) => s.id === styleId);
  const headline =
    idea.trim() ||
    intake.uniqueAdvantage ||
    intake.businessName ||
    (locale === "he" ? "בלי כותרת מומצאת" : locale === "ar" ? "بلا عنوان مختلق" : "No invented headline");
  const bodyParts = [
    intake.businessName,
    idea.trim(),
    intake.audience ? (locale === "he" ? `ל${intake.audience}` : locale === "ar" ? `لـ ${intake.audience}` : `For ${intake.audience}`) : "",
    isNoOffer(intake.offer) ? "" : intake.offer,
  ].filter(Boolean);

  return {
    id: uid("ad"),
    styleId,
    idea: idea.trim(),
    headline,
    body: bodyParts.join(" · "),
    visualNotes: {
      he: `סגנון «${style?.name.he ?? styleId}»: ${style?.description.he ?? ""}. בלי דירוגים או פנים שאין לכם רשות עליהם.`,
      ar: `أسلوب «${style?.name.ar ?? styleId}»: ${style?.description.ar ?? ""}. بلا تقييمات أو وجوه بلا إذن.`,
      en: `Style “${style?.name.en ?? styleId}”: ${style?.description.en ?? ""}. No ratings or faces you don’t have permission to use.`,
    },
    createdAt: new Date().toISOString(),
  };
}
