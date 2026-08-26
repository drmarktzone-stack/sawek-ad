import type { CampaignPack, Intake, Locale } from "../types";
import { isNoOffer } from "../no-offer";

const L = (he: string, ar: string, en: string): Record<Locale, string> => ({ he, ar, en });

export function missionOf(intake: Intake): Record<Locale, string> {
  const n = intake.businessName || "—";
  const aud = intake.audience || "—";
  const goal = intake.mainGoal || "—";
  return L(
    `המשימה: להביא ${goal} מתוך ${aud} אל ${n} — בלי להמציא מבצע או הוכחות.`,
    `المهمة: جلب ${goal} من ${aud} إلى ${n} — بلا اختراع عرض أو إثبات.`,
    `Mission: bring ${goal} from ${aud} to ${n} — without inventing an offer or proof.`,
  );
}

export function highlightsOf(pack: CampaignPack): Record<Locale, string>[] {
  const i = pack.intake;
  const items: Record<Locale, string>[] = [
    L(
      `יתרון שעליו נבנה: ${i.uniqueAdvantage || "לא סופק"}`,
      `الميزة التي نبني عليها: ${i.uniqueAdvantage || "غير متوفر"}`,
      `Advantage we build on: ${i.uniqueAdvantage || "not provided"}`,
    ),
    L(
      `בעיה שפותחים בה: ${i.biggestProblem || "לא סופקה"}`,
      `المشكلة التي نفتح بها: ${i.biggestProblem || "غير متوفرة"}`,
      `Problem we open on: ${i.biggestProblem || "not provided"}`,
    ),
    isNoOffer(i.offer)
      ? L("מבצע: אין מבצע — לא הודבקה הנחה.", "العرض: لا يوجد — لم يُلصق خصم.", "Offer: none — no discount was pasted on.")
      : L(`מבצע שסופק: ${i.offer}`, `عرض مُعطى: ${i.offer}`, `Offer as given: ${i.offer}`),
  ];
  if (pack.diagnosis.hypotheses[0]) {
    items.push(pack.diagnosis.hypotheses[0].finding);
  }
  return items;
}

export function pillarsOf(intake: Intake): { name: string; body: Record<Locale, string> }[] {
  return [
    {
      name: "AIDA",
      body: L(
        `קשב: ${intake.biggestProblem || "—"}. עניין: ${intake.audience || "—"}. רצון: ${intake.uniqueAdvantage || "—"}. פעולה: ${intake.mainGoal || "—"}.`,
        `انتباه: ${intake.biggestProblem || "—"}. اهتمام: ${intake.audience || "—"}. رغبة: ${intake.uniqueAdvantage || "—"}. فعل: ${intake.mainGoal || "—"}.`,
        `Attention: ${intake.biggestProblem || "—"}. Interest: ${intake.audience || "—"}. Desire: ${intake.uniqueAdvantage || "—"}. Action: ${intake.mainGoal || "—"}.`,
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
        `הוק = הבעיה. סיפור = איך ${intake.businessName || "—"} עובד. הצעה = ${isNoOffer(intake.offer) ? "השירות עצמו" : intake.offer}.`,
        `الخطاف = المشكلة. القصة = كيف يعمل ${intake.businessName || "—"}. العرض = ${isNoOffer(intake.offer) ? "الخدمة نفسها" : intake.offer}.`,
        `Hook = the problem. Story = how ${intake.businessName || "—"} works. Offer = ${isNoOffer(intake.offer) ? "the service itself" : intake.offer}.`,
      ),
    },
    {
      name: "Hormozi",
      body: L(
        `תוצאה: ${intake.mainGoal || "—"}. סבירות: ${intake.uniqueAdvantage || "—"}. זמן/מאמץ: לא סופקו — לא ננחש.`,
        `النتيجة: ${intake.mainGoal || "—"}. الاحتمال: ${intake.uniqueAdvantage || "—"}. الوقت/الجهد: غير مذكورين — لن نخمن.`,
        `Outcome: ${intake.mainGoal || "—"}. Likelihood: ${intake.uniqueAdvantage || "—"}. Time/effort: not given — will not guess.`,
      ),
    },
    {
      name: "ICP",
      body: L(
        `קהל: ${intake.audience || "[יש להשלים: קהל]"}. מיקום: ${intake.location || "[יש להשלים: מיקום]"}.`,
        `الجمهور: ${intake.audience || "[يجب الاستكمال: جمهور]"}. الموقع: ${intake.location || "[يجب الاستكمال: موقع]"}.`,
        `Audience: ${intake.audience || "[TO COMPLETE: audience]"}. Place: ${intake.location || "[TO COMPLETE: location]"}.`,
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
