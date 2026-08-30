import type { CampaignPack, Intake, Locale } from "../types";
import { isNoOffer } from "../no-offer";
import { isFreeService } from "../operating-model";
import {
  ADVANTAGE_CHIPS,
  GOAL_CHIPS,
  OFFER_CHIPS,
  audienceChipsFor,
  resolveChipLabel,
} from "../chips";
import { problemChipsFor } from "../operating-model";

function text(intake: Intake, locale: Locale) {
  return {
    name: intake.businessName || "—",
    audience: resolveChipLabel(intake.audience, audienceChipsFor(intake), locale) || "—",
    problem: resolveChipLabel(intake.biggestProblem, problemChipsFor(intake), locale) || "—",
    advantage: resolveChipLabel(intake.uniqueAdvantage, ADVANTAGE_CHIPS, locale) || "—",
    goal: resolveChipLabel(intake.mainGoal, GOAL_CHIPS, locale) || "—",
    offer: isNoOffer(intake.offer)
      ? OFFER_CHIPS.find((o) => o.id === "no_offer")!.label[locale]
      : resolveChipLabel(intake.offer, OFFER_CHIPS, locale),
    location: intake.location || "",
  };
}

const L = (he: string, ar: string, en: string): Record<Locale, string> => ({ he, ar, en });

export function missionOf(intake: Intake): Record<Locale, string> {
  const he = text(intake, "he");
  const ar = text(intake, "ar");
  const en = text(intake, "en");
  return L(
    isFreeService(intake)
      ? `המשימה: חשיפה / הרשמה / ביקור של ${he.audience} אצל ${he.name} — בלי מכירה ובלי מבצע בדוי.`
      : `המשימה: להביא ${he.goal} מתוך ${he.audience} אל ${he.name} — בלי להמציא מבצע או הוכחות.`,
    isFreeService(intake)
      ? `المهمة: تعرّض / تسجيل / زيارة ${ar.audience} عند ${ar.name} — بلا بيع وبلا عرض مختلق.`
      : `المهمة: جلب ${ar.goal} من ${ar.audience} إلى ${ar.name} — بلا اختراع عرض أو إثبات.`,
    isFreeService(intake)
      ? `Mission: exposure / enrollment / visit of ${en.audience} at ${en.name} — no sale and no invented promo.`
      : `Mission: bring ${en.goal} from ${en.audience} to ${en.name} — without inventing an offer or proof.`,
  );
}

export function highlightsOf(pack: CampaignPack): Record<Locale, string>[] {
  const he = text(pack.intake, "he");
  const ar = text(pack.intake, "ar");
  const en = text(pack.intake, "en");
  const items: Record<Locale, string>[] = [
    L(
      `יתרון שעליו נבנה: ${he.advantage === "—" ? "לא סופק" : he.advantage}`,
      `الميزة التي نبني عليها: ${ar.advantage === "—" ? "غير متوفر" : ar.advantage}`,
      `Advantage we build on: ${en.advantage === "—" ? "not provided" : en.advantage}`,
    ),
    L(
      `בעיה שפותחים בה: ${he.problem === "—" ? "לא סופקה" : he.problem}`,
      `المشكلة التي نفتح بها: ${ar.problem === "—" ? "غير متوفرة" : ar.problem}`,
      `Problem we open on: ${en.problem === "—" ? "not provided" : en.problem}`,
    ),
    isNoOffer(pack.intake.offer)
      ? L("מבצע: אין מבצע — לא הודבקה הנחה.", "العرض: لا يوجد — لم يُلصق خصم.", "Offer: none — no discount was pasted on.")
      : L(`מבצע שסופק: ${he.offer}`, `عرض مُعطى: ${ar.offer}`, `Offer as given: ${en.offer}`),
  ];
  if (pack.diagnosis.hypotheses[0]) {
    items.push(pack.diagnosis.hypotheses[0].finding);
  }
  return items;
}

export function pillarsOf(intake: Intake): { name: string; body: Record<Locale, string> }[] {
  const he = text(intake, "he");
  const ar = text(intake, "ar");
  const en = text(intake, "en");
  return [
    {
      name: "AIDA",
      body: L(
        `קשב: ${he.problem}. עניין: ${he.audience}. רצון: ${he.advantage}. פעולה: ${he.goal}.`,
        `انتباه: ${ar.problem}. اهتمام: ${ar.audience}. رغبة: ${ar.advantage}. فعل: ${ar.goal}.`,
        `Attention: ${en.problem}. Interest: ${en.audience}. Desire: ${en.advantage}. Action: ${en.goal}.`,
      ),
    },
    {
      name: "PAS",
      body: L(
        `Problem → Agitate → Solution דרך ${intake.businessName || "העסק"}.`,
        `مشكلة → تحريض → حل عبر ${intake.businessName || "النشاط"}.`,
        `Problem → Agitate → Solution through ${intake.businessName || "the business"}.`,
      ),
    },
    {
      name: "Hook–Story–Offer",
      body: L(
        `הוק = הבעיה. סיפור = איך ${he.name} עובד. הצעה = ${isNoOffer(intake.offer) ? "השירות עצמו" : he.offer}.`,
        `الخطاف = المشكلة. القصة = كيف يعمل ${ar.name}. العرض = ${isNoOffer(intake.offer) ? "الخدمة نفسها" : ar.offer}.`,
        `Hook = the problem. Story = how ${en.name} works. Offer = ${isNoOffer(intake.offer) ? "the service itself" : en.offer}.`,
      ),
    },
    {
      name: "Hormozi",
      body: L(
        `תוצאה: ${he.goal}. סבירות: ${he.advantage}. זמן/מאמץ: לא סופקו — לא ננחש.`,
        `النتيجة: ${ar.goal}. الاحتمال: ${ar.advantage}. الوقت/الجهد: غير مذكورين — لن نخمن.`,
        `Outcome: ${en.goal}. Likelihood: ${en.advantage}. Time/effort: not given — will not guess.`,
      ),
    },
    {
      name: "ICP",
      body: L(
        `קהל: ${he.audience === "—" ? "[יש להשלים: קהל]" : he.audience}. מיקום: ${he.location || "[יש להשלים: מיקום]"}.`,
        `الجمهور: ${ar.audience === "—" ? "[يجب الاستكمال: جمهور]" : ar.audience}. الموقع: ${ar.location || "[يجب الاستكمال: موقع]"}.`,
        `Audience: ${en.audience === "—" ? "[TO COMPLETE: audience]" : en.audience}. Place: ${en.location || "[TO COMPLETE: location]"}.`,
      ),
    },
    {
      name: "Proof",
      body: L(
        `הוכחה רק ממה שסופק. בלי המלצות או דירוגים מומצאים.`,
        `الإثبات فقط مما أُعطي. بلا شهادات أو تقييمات مخترعة.`,
        `Proof only from what was supplied. No invented testimonials or ratings.`,
      ),
    },
  ];
}
