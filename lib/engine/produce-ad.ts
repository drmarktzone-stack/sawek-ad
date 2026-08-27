import type { Intake, Locale, ProducedAd } from "../types";
import { DESIGN_STYLES } from "../design-styles";
import { uid } from "../utils";
import { isNoOffer } from "../no-offer";
import { hoursLine, kupaLine, landingH1, spokenCta, isWalkIn } from "./spoken";

export function produceAd(intake: Intake, styleId: string, idea: string, locale: Locale): ProducedAd {
  const style = DESIGN_STYLES.find((s) => s.id === styleId);
  const headline = idea.trim() || landingH1(intake, locale);
  const bodyParts = [
    intake.businessName,
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
    isNoOffer(intake.offer) ? "" : intake.offer,
    spokenCta(intake, locale),
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
