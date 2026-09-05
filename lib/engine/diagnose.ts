import type { Diagnosis, DiagnosisHypothesis, Intake, IntakeReport, Locale } from "../types";
import { filled } from "../utils";
import { isNoOffer } from "../no-offer";
import { isFreeService } from "../operating-model";
import { diagnoseFreeCta } from "../vertical";
import { coachIntake, stageToDiagnosisArea } from "./coach";

const L = (he: string, ar: string, en: string): Record<Locale, string> => ({ he, ar, en });

/** Empty-field shame is handled by gap compensation — do not repeat it as a diagnosis wall. */
function isAbsenceCritique(he: string): boolean {
  return /חסר שם|התיאור דל|חסר מיקום|ערוצים לא סומנו|אין תמונה/.test(he);
}

export function diagnose(intake: Intake, report: IntakeReport): Diagnosis {
  const hypotheses: DiagnosisHypothesis[] = [];
  const pastCreativeBlob = (intake.pastCreatives ?? [])
    .map((c) => `${c.headline} ${c.body} ${c.cta}`)
    .join(" ");
  const past = `${intake.pastAds} ${pastCreativeBlob} ${intake.whatFailed} ${intake.pastResults}`.toLowerCase();
  const hasPast = filled(intake.pastAds) || filled(intake.whatFailed) || Boolean((intake.pastCreatives ?? []).length);

  const freeConsult =
    /ייעוץ חינם|استشارة مجان|free consult|free consultation/.test(past) ||
    /ייעוץ חינם|استشارة مجان|free consult/.test(intake.offer.toLowerCase());

  if (freeConsult) {
    hypotheses.push({
      area: "offer",
      confidence: "high",
      finding: L(
        "הצעת «ייעוץ חינם» מושכת סקרנים במקום לקוחות שמוכנים להתחייב.",
        "عرض «استشارة مجانية» يجذب الفضوليين لا الملتزمين.",
        "A “free consult” offer pulls curiosity, not commitment.",
      ),
      evidence: L(
        hasPast
          ? "זה מה שתואר במודעות הקודמות / בתוצאות."
          : "ההצעה הנוכחית כוללת ייעוץ חינם.",
        hasPast ? "هذا ما وُصف في الإعلانات السابقة." : "العرض الحالي يتضمن استشارة مجانية.",
        hasPast ? "This is what the past ads / results described." : "The current offer includes a free consult.",
      ),
      recommendation: L(
        "הסר את החינם כהוק ראשי. דבר על הבעיה והיתרון, עם CTA לתור / שיחה — בלי הבטחת מתנה.",
        "أزل المجاني كخطاف رئيسي. تحدّث عن المشكلة والميزة مع CTA لموعد.",
        "Drop free as the main hook. Speak to the problem and advantage, CTA to a booking — no gift promise.",
      ),
    });
  } else if (isNoOffer(intake.offer)) {
    hypotheses.push({
      area: "offer",
      confidence: hasPast ? "medium" : "low",
      finding: L(
        "אין מבצע — זה תקין. הערך חייב לבוא מהשירות ומהיתרון, לא מהנחה מומצאת.",
        "لا يوجد عرض — وهذا سليم. القيمة يجب أن تأتي من الخدمة والميزة.",
        "No promo — that’s valid. Value must come from the service and the advantage, not a fake discount.",
      ),
      evidence: L(
        "שדה המבצע הוא «אין מבצע» או ריק.",
        "حقل العرض «لا يوجد عرض» أو فارغ.",
        "The offer field is “No offer” or empty.",
      ),
      recommendation: L(
        "אל תמציאו קופון. חזקו את ההוּק סביב הבעיה והיתרון הייחודי.",
        "لا تخترعوا كوبوناً. قوّوا الخطاف حول المشكلة والميزة.",
        "Do not invent a coupon. Strengthen the hook around the problem and unique advantage.",
      ),
    });
  }

  if (filled(intake.biggestProblem) && filled(intake.audience)) {
    hypotheses.push({
      area: "hook",
      confidence: hasPast ? "medium" : "low",
      finding: L(
        "ההוק צריך לפתוח בבעיה של הקהל, לא בשם העסק.",
        "يجب أن يبدأ الخطاف بمشكلة الجمهور لا باسم النشاط.",
        "The hook should open on the audience’s problem, not the business name.",
      ),
      evidence: L(
        `קהל: ${intake.audience}. בעיה: ${intake.biggestProblem}.`,
        `الجمهور: ${intake.audience}. المشكلة: ${intake.biggestProblem}.`,
        `Audience: ${intake.audience}. Problem: ${intake.biggestProblem}.`,
      ),
      recommendation: L(
        "משפט ראשון = כאב ספציפי. שם העסק בשורה השנייה או ב-CTA.",
        "الجملة الأولى = ألم محدد. اسم النشاط في الثانية أو في CTA.",
        "First line = specific pain. Business name on line two or in the CTA.",
      ),
    });
  }

  if (!filled(intake.location) && intake.type !== "app") {
    hypotheses.push({
      area: "targeting",
      confidence: "high",
      finding: L(
        "בלי כתובת — מובילים בזווית מקום כשאלה, לא ברדיוס בדוי.",
        "بلا عنوان — نقود بزاوية مكان كسؤال، مش بنطاق مختلق.",
        "No address — lead with a place-angle question, never a fake radius.",
      ),
      evidence: L("שדה מיקום ריק — לא יומצא רדיוס.", "حقل الموقع فارغ — لن يُخترع نطاق.", "Location field is empty — no radius will be invented."),
      recommendation: L(
        "לצלם חזית/רחוב (בלי פנים) או להוסיף עיר לפני קניית מדיה.",
        "صوّروا الواجهة/الشارع (بلا وجوه) أو أضيفوا بلدة قبل شراء الميديا.",
        "Film facade/street (no faces) or add a town before any media buy.",
      ),
    });
  }

  if (!hasPast) {
    hypotheses.push({
      area: "creative",
      confidence: "low",
      finding: L(
        "אין היסטוריית מודעות — נבנה מכאן עם עובדות שיש, לא עם פסק דין.",
        "لا تاريخ إعلانات — نبني من الحقائق الموجودة، مش حكم.",
        "No ad history — we build from facts you have, not a verdict.",
      ),
      evidence: L("מודעות קודמות לא מולאו — זה תקין לסריקה ראשונה.", "الإعلانات السابقة غير مملوءة — سليم لمسح أول.", "Past ads were not filled in — fine for a first scan."),
      recommendation: L(
        "לצלם מקום/מוצר השבוע; לשמור צילומי המודעות הבאות (טקסט, קהל, הוצאה, תוצאה).",
        "صوّروا مكان/منتج هالأسبوع؛ احفظوا لقطات الإعلانات الجاية.",
        "Photograph place/product this week; keep screenshots of the next ads (copy, audience, spend, result).",
      ),
    });
  } else if (/לא נמדד|not measured|لم يُقس|אין מספר/.test(past)) {
    hypotheses.push({
      area: "funnel",
      confidence: "medium",
      finding: L(
        "המדידה חסרה — בלי ליד מוגדר אי אפשר לדבר על כישלון קריאייטיב מול כישלון מעקב.",
        "القياس ناقص — بلا تعريف للعميل المحتمل لا نفرّق فشل الإبداع عن فشل التتبع.",
        "Measurement is missing — without a defined lead we cannot separate creative failure from tracking failure.",
      ),
      evidence: L(intake.pastResults || intake.whatFailed, intake.pastResults || intake.whatFailed, intake.pastResults || intake.whatFailed),
      recommendation: L(
        "הגדירו המרה אחת (תור / וואטסאפ עם שם) לפני הסקייל.",
        "عرّفوا تحويلاً واحداً (موعد / واتساب باسم) قبل التوسيع.",
        "Define one conversion (booking / WhatsApp with a name) before any scale.",
      ),
    });
  }

  if (isFreeService(intake)) {
    hypotheses.push({
      area: "offer",
      confidence: "high",
      finding: L(
        "מוסד ללא תשלום מהלקוח — הקמפיין הוא חשיפה/הרשמה/ביקור, לא רכישה.",
        "مؤسسة بلا دفع من الزبون — الحملة تعرّض/تسجيل/زيارة، مش شراء.",
        "Institution with no charge to the client — the campaign is exposure/enrollment/visit, not a purchase.",
      ),
      evidence: L("מודל הפעלה: שירות חינם.", "نموذج التشغيل: خدمة مجانية.", "Operating model: free service."),
      recommendation: diagnoseFreeCta(intake),
    });
  }

  const aovRelated = !isFreeService(intake) && report.inconsistencies.some((i) => i.issue.en.includes("CAC"));
  if (aovRelated) {
    hypotheses.push({
      area: "price",
      confidence: "high",
      finding: L(
        "היחידה הכלכלית שבורה: CAC היעד גבוה מהתרומה לביקור/הזמנה.",
        "وحدة الاقتصاد مكسورة: CAC أعلى من المساهمة.",
        "Unit economics are broken: target CAC is above contribution per order.",
      ),
      evidence: report.inconsistencies[0]?.detail ?? L("", "", ""),
      recommendation: L(
        "או מעלים ערך ביקור (חבילה), או מורידים CAC יעד, או לא מריצים מדיה בתקציב הזה.",
        "إمّا رفع قيمة الزيارة أو خفض CAC أو عدم تشغيل الميديا بهذه الميزانية.",
        "Raise visit value (a package), lower target CAC, or do not run media at this budget.",
      ),
    });
  }

  if (filled(intake.audience) && /כולם|everyone|الجميع|all people/.test(intake.audience.toLowerCase())) {
    hypotheses.push({
      area: "audience",
      confidence: "medium",
      finding: L(
        "«כולם» הוא לא קהל. מודעה לכולם נשמעת לאף אחד.",
        "«الجميع» ليس جمهوراً. إعلان للجميع لا يسمعه أحد.",
        "“Everyone” is not an audience. An ad to everyone sounds like an ad to no one.",
      ),
      evidence: L(intake.audience, intake.audience, intake.audience),
      recommendation: L(
        "צמצמו לקבוצה עם בעיה משותפת ומקום משותף.",
        "ضيّقوا إلى مجموعة بمشكلة ومكان مشتركين.",
        "Narrow to a group with a shared problem and a shared place.",
      ),
    });
  }

  const coach = coachIntake(intake);
  for (const c of coach.critiques) {
    // Gap compensation + photo offer already cover empty-field shame. Keep quality critiques only.
    if (isAbsenceCritique(c.finding.he)) continue;
    hypotheses.push({
      area: stageToDiagnosisArea(c.stage),
      confidence: "medium",
      finding: c.finding,
      evidence: c.evidence,
      recommendation: c.why,
    });
  }

  if (hypotheses.length === 0) {
    hypotheses.push({
      area: "funnel",
      confidence: "low",
      finding: L(
        "אין ראיות לכישלון ספציפי — נבנה מהעובדות שיש, עם רשימת צילום במקום ניחוש מדדים.",
        "لا أدلة على فشل محدد — نبني من الحقائق الموجودة، مع قائمة تصوير بدل تخمين مقاييس.",
        "No evidence of a specific failure — we build from facts you have, with a shoot list instead of guessed metrics.",
      ),
      evidence: L("סריקה דקה — זה בסיס עבודה, לא פסק דין.", "مسح رقيق — أساس عمل لا حكم.", "Thin scan — a working base, not a verdict."),
      recommendation: L(
        "אשרו כבסיס עבודה. התחילו בתמונות מקום/מוצר ובמשפט יתרון אחד.",
        "اعتمدوا كأساس عمل. ابدأوا بصور مكان/منتج وجملة ميزة واحدة.",
        "Approve as a working base. Start with place/product photos and one advantage line.",
      ),
    });
  }

  const summary = L(
    "אבחון מבוסס רק על מה שמולא. אין ניחוש של מתחרים או תוצאות. נדרש אישור אנושי לפני הבנייה.",
    "التشخيص مبني فقط على ما مُلئ. لا تخمين لمنافسين أو نتائج. يلزم اعتماد بشري قبل البناء.",
    "Diagnosis uses only what you filled in. No guessed competitors or results. Human approval is required before build.",
  );

  return { summary, hypotheses, approved: false };
}
