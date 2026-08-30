import type { ChipOption } from "./chips";
import { GOAL_CHIPS, OFFER_CHIPS, PROBLEM_CHIPS } from "./chips";
import type { Intake, Locale, OperatingModel } from "./types";
import { detectVertical, isProductLike, unknownProblemLabel } from "./vertical";

export const PAID_ONLY_GOALS = new Set(["sales", "installs", "leads", "bookings"]);

export const FREE_GOAL_CHIPS: ChipOption[] = [
  { id: "exposure", label: { he: "חשיפה", ar: "تعرّض", en: "Exposure" } },
  { id: "enrollment", label: { he: "הרשמה / רישום", ar: "تسجيل", en: "Enrollment / registration" } },
  { id: "awareness", label: { he: "מודעות", ar: "وعي", en: "Awareness" } },
  { id: "walk_in", label: { he: "ביקור / הגעה", ar: "زيارة / جت أولاً", en: "Walk-in / visit" } },
  { id: "custom", custom: true, label: { he: "כתוב בעצמך", ar: "اكتب بنفسك", en: "Write your own" } },
];

export const OPERATING_MODEL_OPTIONS: ChipOption[] = [
  {
    id: "paid",
    label: { he: "בתשלום", ar: "مدفوع", en: "Paid" },
  },
  {
    id: "free_service",
    label: { he: "שירות חינם — חשיפה", ar: "خدمة مجانية — تعرّض", en: "Free service — exposure" },
  },
];

export function isFreeService(
  intake: Pick<Intake, "operatingModel"> | { operatingModel?: OperatingModel } | undefined | null,
): boolean {
  return intake?.operatingModel === "free_service";
}

export function operatingModelOf(intake: Pick<Intake, "operatingModel"> | undefined | null): OperatingModel {
  return intake?.operatingModel === "free_service" ? "free_service" : "paid";
}

export function isClalitCoverageFact(intake: Intake): boolean {
  const blob = `${intake.category} ${intake.description} ${intake.businessName} ${intake.uniqueAdvantage}`;
  return /כללית|كلاليت|clalit/i.test(blob);
}

export function isSchoolLike(intake: Intake): boolean {
  return detectVertical(intake) === "school";
}

export function goalChipsFor(intake: Pick<Intake, "operatingModel">): ChipOption[] {
  if (isFreeService(intake)) return FREE_GOAL_CHIPS;
  return GOAL_CHIPS;
}

export const PRODUCT_PROBLEM_CHIPS: ChipOption[] = [
  {
    id: "unwell_uncertain",
    label: {
      he: "לא בטוחים מה לעשות כשהילד לא בטוב",
      ar: "مش واضح شو تعمل لما الولد مش تمام",
      en: "Not sure what to do when the child is unwell",
    },
  },
  {
    id: "need_trusted_info",
    label: {
      he: "צריכים מידע רפואי אמין",
      ar: "بدهم معلومات طبية موثوقة",
      en: "Need trusted medical information",
    },
  },
];

export function problemChipsFor(intake: Pick<Intake, "operatingModel" | "businessName" | "category" | "description">): ChipOption[] {
  const v = detectVertical(intake);
  if (isProductLike(intake)) {
    const rest = PROBLEM_CHIPS.filter(
      (c) => c.id !== "unknown" && c.id !== "custom" && (c.id !== "price" || !isFreeService(intake)),
    );
    return [
      { id: "unknown", label: unknownProblemLabel(v) },
      ...PRODUCT_PROBLEM_CHIPS,
      ...rest,
      PROBLEM_CHIPS.find((c) => c.id === "custom")!,
    ];
  }
  const base = isFreeService(intake) ? PROBLEM_CHIPS.filter((c) => c.id !== "price") : PROBLEM_CHIPS;
  return base.map((c) => (c.id === "unknown" ? { ...c, label: unknownProblemLabel(v) } : c));
}

export function offerChipsFor(intake: Pick<Intake, "operatingModel">): ChipOption[] {
  if (!isFreeService(intake)) return OFFER_CHIPS;
  return OFFER_CHIPS.filter((c) => c.id === "no_offer");
}

const BUY_GOAL = /מכיר|קנו עכשיו|checkout|purchase|roas|coupon|קופון|خصم|كوبون|شراء|buy now|sales/i;

export function coerceGoalForFreeService(goal: string, preferWalkIn: boolean): string {
  const fallback = preferWalkIn ? "walk_in" : "exposure";
  const parts = goal.split(",").map((s) => s.trim()).filter(Boolean);
  if (!parts.length) return fallback;
  const mapped = parts.map((g) => {
    if (g === "walk_in" || g === "awareness" || g === "exposure" || g === "enrollment") return g;
    if (PAID_ONLY_GOALS.has(g) || BUY_GOAL.test(g)) return fallback;
    return g;
  });
  return [...new Set(mapped)].join(",");
}

export function applyOperatingModel(intake: Intake, model: OperatingModel): Intake {
  const next: Intake = { ...intake, operatingModel: model };
  if (model !== "free_service") return next;
  next.offer = "no_offer";
  next.offerCustom = false;
  const preferWalkIn =
    intake.mainGoal.split(",").map((s) => s.trim()).includes("walk_in") ||
    /walk-?in|جت أولاً|סדר הגעה|בלי תור|بدون مواعيد/i.test(
      `${intake.clinicHours} ${intake.mainGoal} ${intake.description}`,
    );
  next.mainGoal = coerceGoalForFreeService(intake.mainGoal, preferWalkIn);
  const goalParts = intake.mainGoal.split(",").map((s) => s.trim()).filter(Boolean);
  if (goalParts.some((g) => PAID_ONLY_GOALS.has(g) || BUY_GOAL.test(g))) {
    next.goalCustom = false;
  }
  return next;
}

export function coverageFactLine(locale: Locale): string {
  if (locale === "he") return "כיסוי כללית הוא עובדה למבוטחים — לא מבצע ולא קופון.";
  if (locale === "ar") return "تغطية كلاليت واقعة للأعضاء — مش عرض ومش كوبون.";
  return "Clalit coverage is a fact for members — not a promo and not a coupon.";
}

export function sampleLabel(locale: Locale): string {
  if (locale === "he") return "דוגמה";
  if (locale === "ar") return "عينة";
  return "sample";
}

export type PlanChannelId = "facebook" | "instagram" | "tiktok" | "youtube" | "whatsapp";

export function parsePlanChannels(notes: string): PlanChannelId[] {
  const s = (notes ?? "").toLowerCase();
  const out: PlanChannelId[] = [];
  if (/facebook|פייסבוק|فيسبوك|\bmeta\b/.test(s)) out.push("facebook");
  if (/instagram|אינסטגרם|انستغرام|إنستغرام/.test(s)) out.push("instagram");
  if (/tiktok|טיקטוק|تيك توك/.test(s)) out.push("tiktok");
  if (/youtube|יוטיוב|يوتيوب/.test(s)) out.push("youtube");
  if (/whatsapp|וואטסאפ|واتساب/.test(s)) out.push("whatsapp");
  return out;
}

export function formatPlanChannels(ids: PlanChannelId[]): string {
  return ids.join(", ");
}

/** Paid PLAN defaults to Facebook + Instagram when empty. WhatsApp only if a number exists. */
export function visiblePlanChannels(
  intake: Pick<Intake, "channelNotes" | "operatingModel" | "whatsapp">,
): PlanChannelId[] {
  const parsed = parsePlanChannels(intake.channelNotes ?? "");
  const allowWa = Boolean((intake.whatsapp ?? "").trim());
  if (parsed.length) return parsed.filter((id) => id !== "whatsapp" || allowWa);
  if (isFreeService(intake)) return [];
  return ["facebook", "instagram"];
}

export function setPlanChannel(
  intake: Pick<Intake, "channelNotes" | "operatingModel" | "whatsapp">,
  id: PlanChannelId,
  on: boolean,
): string {
  const allowWa = Boolean((intake.whatsapp ?? "").trim());
  if (id === "whatsapp" && !allowWa) {
    return formatPlanChannels(visiblePlanChannels(intake).filter((x) => x !== "whatsapp"));
  }
  const cur = new Set(visiblePlanChannels(intake));
  if (on) cur.add(id);
  else cur.delete(id);
  if (!allowWa) cur.delete("whatsapp");
  const order: PlanChannelId[] = ["facebook", "instagram", "tiktok", "youtube", "whatsapp"];
  return formatPlanChannels(order.filter((x) => cur.has(x)));
}
