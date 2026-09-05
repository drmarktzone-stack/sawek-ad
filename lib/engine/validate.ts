import type { Intake, IntakeReport, Locale, MissingFlag } from "../types";
import { filled, parseNumber } from "../utils";
import { isNoOffer } from "../no-offer";
import { isFreeService } from "../operating-model";

const L = (he: string, ar: string, en: string): Record<Locale, string> => ({ he, ar, en });

const CHECKS: { field: keyof Intake; weight: number; label: Record<Locale, string>; reason: Record<Locale, string>; impact: Record<Locale, string> }[] = [
  {
    field: "businessName",
    weight: 8,
    label: L("שם העסק", "اسم النشاط", "Business name"),
    reason: L("בלי שם אין מודעה ששייכת למישהו.", "بدون اسم لا يوجد إعلان يخص أحداً.", "Without a name the ad belongs to nobody."),
    impact: L("המודעות יישארו כלליות.", "ستبقى الإعلانات عامة.", "Ads stay generic."),
  },
  {
    field: "description",
    weight: 8,
    label: L("תיאור העסק", "وصف النشاط", "Business description"),
    reason: L("אין במה להיאחז בלי מה העסק עושה.", "لا مرساة بدون ما يفعله النشاط.", "Nothing to hold onto without what the business does."),
    impact: L("הוקים חלשים.", "خطافات ضعيفة.", "Weak hooks."),
  },
  {
    field: "audience",
    weight: 8,
    label: L("קהל", "الجمهور", "Audience"),
    reason: L("בלי קהל אי אפשר לבחור שפה או טירגוט.", "بدون جمهور لا لغة ولا استهداف.", "No audience means no language and no targeting."),
    impact: L("טירגוט יישאר בלופרינט חלקי.", "سيبقى الاستهداف مخططاً ناقصاً.", "Targeting stays a partial blueprint."),
  },
  {
    field: "biggestProblem",
    weight: 7,
    label: L("בעיה", "المشكلة", "Problem"),
    reason: L("PAS ו-AIDA צריכים כאב אמיתי.", "PAS وAIDA يحتاجان ألماً حقيقياً.", "PAS and AIDA need a real pain."),
    impact: L("הגרסה הרגשית תהיה דקה.", "النسخة العاطفية ستكون رقيقة.", "The emotional variant will be thin."),
  },
  {
    field: "uniqueAdvantage",
    weight: 7,
    label: L("יתרון", "الميزة", "Advantage"),
    reason: L("משוואת הורמוזי צריכה סבירות נתפסת.", "معادلة هورموزي تحتاج احتمالاً مدركاً.", "Hormozi’s equation needs perceived likelihood."),
    impact: L("אין סיבה לבחור בכם על פני אחרים.", "لا سبب لاختياركم دون غيركم.", "No reason to pick you over anyone else."),
  },
  {
    field: "mainGoal",
    weight: 6,
    label: L("מטרה", "الهدف", "Goal"),
    reason: L("בלי מטרה אי אפשר לבחור CTA.", "بدون هدف لا يمكن اختيار CTA.", "No goal means no honest CTA."),
    impact: L("הקריאה לפעולה תישאר כללית.", "ستبقى الدعوة عامة.", "The CTA stays generic."),
  },
  {
    field: "location",
    weight: 5,
    label: L("מיקום", "الموقع", "Location"),
    reason: L("עסקים מקומיים בלי אזור = טירגוט עיוור.", "نشاط محلي بلا منطقة = استهداف أعمى.", "Local businesses with no area = blind targeting."),
    impact: L("גוגל/מטא יישארו ברמת מדינה.", "جوجل/ميتا سيبقان على مستوى البلد.", "Google/Meta stay country-level."),
  },
  {
    field: "businessModel",
    weight: 6,
    label: L("מודל עסקי", "نموذج العمل", "Business model"),
    reason: L("בלי לדעת מה נחשב המרה, אי אפשר לתכנן באדג'ט.", "بدون معرفة التحويل لا خطة ميزانية.", "Without the conversion event, budget planning is guesswork."),
    impact: L("סוכן המדיה יסרב לנחש CPA.", "وكيل الميديا سيرفض تخمين CPA.", "The media agent will refuse to guess CPA."),
  },
  {
    field: "monthlyBudget",
    weight: 7,
    label: L("תקציב", "الميزانية", "Budget"),
    reason: L("בלי תקציב אין פיצול ערוצים מספרי.", "بدون ميزانية لا تقسيم قنوات رقمياً.", "No budget means no numeric channel split."),
    impact: L("לא יוצג מד לידים.", "لن يُعرض مقياس عملاء.", "No lead gauge will be shown."),
  },
  {
    field: "targetCac",
    weight: 6,
    label: L("CAC יעד", "CAC مستهدف", "Target CAC"),
    reason: L("בלי CAC אין תרחיש עלות.", "بدون CAC لا سيناريو تكلفة.", "Without CAC there is no cost scenario."),
    impact: L("רק כללי kill/scale, בלי מספרים.", "فقط قواعد قتل/توسيع بلا أرقام.", "Kill/scale rules only, no numbers."),
  },
  {
    field: "avgOrderValue",
    weight: 5,
    label: L("ערך הזמנה", "قيمة الطلب", "Average order value"),
    reason: L("צריך לבדוק אם CAC הגיוני מול מרווח.", "يجب فحص منطقية CAC مقابل الهامش.", "Needed to check whether CAC is sane vs margin."),
    impact: L("אין בדיקת יחידת כלכלה.", "لا فحص لوحدة الاقتصاد.", "No unit-economics check."),
  },
  {
    field: "marginPercent",
    weight: 5,
    label: L("מרווח", "الهامش", "Margin"),
    reason: L("מרווח חסר = אי אפשר לדעת אם הקמפיין מפסיד.", "هامش ناقص = لا نعرف إن كانت الحملة تخسر.", "Missing margin = cannot tell if the campaign loses money."),
    impact: L("אזהרת רווחיות תחסר.", "ستغيب تحذيرة الربحية.", "Profitability warning will be missing."),
  },
  {
    field: "pastAds",
    weight: 6,
    label: L("מודעות קודמות", "إعلانات سابقة", "Past ads"),
    reason: L("בלי היסטוריה האבחון הוא השערה.", "بدون تاريخ التشخيص افتراض.", "Without history the diagnosis is a hypothesis."),
    impact: L("ביטחון האבחון יהיה נמוך.", "ثقة التشخيص ستكون منخفضة.", "Diagnosis confidence will be low."),
  },
];

export function emptyIntake(): Intake {
  return {
    type: "business",
    depth: "quick",
    operatingModel: "paid",
    businessName: "",
    category: "",
    description: "",
    location: "",
    website: "",
    whatsapp: "",
    clinicHours: "",
    kupaFileBy: "",
    kupaMemberFrom: "",
    audience: "",
    audienceCustom: false,
    biggestProblem: "",
    problemCustom: false,
    uniqueAdvantage: "",
    advantageCustom: false,
    mainGoal: "",
    goalCustom: false,
    offer: "no_offer",
    offerCustom: false,
    competitors: [],
    businessModel: "",
    avgOrderValue: "",
    marginPercent: "",
    targetCac: "",
    monthlyBudget: "",
    pastAds: "",
    pastResults: "",
    whatFailed: "",
    mediaAssets: [],
    ingestedDocs: [],
    pastCreatives: [],
    brandTone: "",
    brandPositioning: "",
    channelNotes: "",
    whatsappTemplates: "",
    landingLines: "",
    brandKit: { colors: [], source: "none" },
    voice: { niche: "", coreMessage: "", personalVoice: "", dialect: "" },
  };
}

export function cmoFieldsMissing(intake: Intake): boolean {
  if (isFreeService(intake)) {
    return !filled(intake.businessModel) || !filled(intake.pastAds);
  }
  return !filled(intake.businessModel) || !filled(intake.monthlyBudget) || !filled(intake.targetCac) || !filled(intake.pastAds);
}

const WIZARD_REQUIRED: { field: keyof Intake; label: Record<Locale, string> }[] = [
  { field: "businessName", label: L("שם העסק", "اسم العمل", "Business name") },
  { field: "description", label: L("תיאור העסק", "وصف النشاط", "Description") },
  { field: "audience", label: L("קהל", "الجمهور", "Audience") },
  { field: "biggestProblem", label: L("בעיה / כאב", "المشكلة", "Problem") },
  { field: "uniqueAdvantage", label: L("יתרון", "الميزة", "Advantage") },
  { field: "mainGoal", label: L("מטרה", "الهدف", "Goal") },
];

export function wizardMissingFields(intake: Intake): { field: keyof Intake; label: Record<Locale, string> }[] {
  return WIZARD_REQUIRED.filter((c) => !filled(String(intake[c.field] ?? "")));
}

export function wizardReady(intake: Intake): boolean {
  return wizardMissingFields(intake).length === 0;
}

export function validateIntake(intake: Intake): IntakeReport {
  const missing: MissingFlag[] = [];
  let earned = 0;
  let total = 0;
  const skipPaidUnit = isFreeService(intake)
    ? new Set(["avgOrderValue", "marginPercent", "targetCac"])
    : new Set<string>();
  for (const c of CHECKS) {
    if (skipPaidUnit.has(c.field)) continue;
    total += c.weight;
    if (filled(String(intake[c.field] ?? ""))) earned += c.weight;
    else {
      missing.push({
        field: c.field,
        label: c.label,
        reason: c.reason,
        impact: c.impact,
      });
    }
  }

  if (!filled(intake.offer) || isNoOffer(intake.offer)) {
    // not missing — explicit no-offer is valid
  }
  if (filled(intake.clinicHours)) earned += 4;
  if (filled(intake.kupaFileBy)) earned += 3;
  if (filled(intake.kupaMemberFrom)) earned += 3;

  const inconsistencies: IntakeReport["inconsistencies"] = [];
  const aov = parseNumber(intake.avgOrderValue);
  const margin = parseNumber(intake.marginPercent);
  const cac = parseNumber(intake.targetCac);
  const budget = parseNumber(intake.monthlyBudget);

  if (!isFreeService(intake) && aov != null && margin != null && cac != null) {
    const contribution = aov * (margin / 100);
    if (contribution > 0 && cac > contribution) {
      inconsistencies.push({
        issue: L(
          "CAC היעד גבוה ממרווח התרומה",
          "CAC المستهدف أعلى من هامش المساهمة",
          "Target CAC exceeds contribution margin",
        ),
        detail: L(
          `ערך ממוצע ${aov} ₪ × מרווח ${margin}% = ${Math.round(contribution)} ₪ תרומה. CAC ${cac} ₪ אוכל את כל הרווח (ואולי מעבר).`,
          `متوسط ${aov} ₪ × هامش ${margin}% = ${Math.round(contribution)} ₪ مساهمة. CAC ${cac} ₪ يبتلع الربح.`,
          `AOV ${aov} ₪ × margin ${margin}% = ${Math.round(contribution)} ₪ contribution. CAC ${cac} ₪ eats all profit (or more).`,
        ),
      });
    }
  }

  if (!isFreeService(intake) && budget != null && cac != null && budget < cac) {
    inconsistencies.push({
      issue: L("תקציב חודשי נמוך מ-CAC יחיד", "الميزانية الشهرية أقل من CAC واحد", "Monthly budget is below a single CAC"),
      detail: L(
        `ב-${budget} ₪ לחודש ו-CAC ${cac} ₪ לא סוגרים אפילו המרה אחת בתרחיש היעד.`,
        `بـ ${budget} ₪ شهرياً وCAC ${cac} ₪ لن تُغلق حتى عملية واحدة.`,
        `At ${budget} ₪/month and CAC ${cac} ₪ you cannot close even one conversion at target.`,
      ),
    });
  }

  if (intake.type === "app" && intake.mainGoal && !/הורד|install|تنزي/i.test(intake.mainGoal) && intake.depth === "quick") {
    // not an error — just a note via missing if website empty for app
  }

  const refusedGuesses = [
    L(
      "לא הומצאו מתחרים, דירוגים, או המלצות לקוחות.",
      "لم تُخترع منافسون أو تقييمات أو توصيات عملاء.",
      "No competitors, ratings, or testimonials were invented.",
    ),
    L(
      "לא הומצא טווח לידים חודשי בלי תקציב ו-CAC שסיפקת.",
      "لم يُخترع نطاق عملاء شهري بدون ميزانية وCAC منك.",
      "No monthly lead range was invented without budget and CAC you supplied.",
    ),
  ];

  if (isNoOffer(intake.offer)) {
    refusedGuesses.push(
      L(
        "אין מבצע — לא הוספנו הנחה או ייעוץ חינם כברירת מחדל.",
        "لا يوجد عرض — لم نُضف خصماً أو استشارة مجانية افتراضياً.",
        "No offer — we did not add a discount or free consult by default.",
      ),
    );
  }
  if (isFreeService(intake)) {
    refusedGuesses.push(
      L(
        "מודל שירות חינם — אין קנו עכשיו, אין מחיר, אין קופון, ואין ROAS כמכירה.",
        "نموذج خدمة مجانية — بلا اشتروا الآن وبلا سعر وبلا كوبون وبلا ROAS كمبيعات.",
        "Free-service model — no buy-now, no price, no coupon, and no ROAS-as-sales.",
      ),
    );
  }

  const completeness = total === 0 ? 0 : Math.min(100, Math.round((earned / total) * 100));

  return { completeness, missing, inconsistencies, refusedGuesses };
}
