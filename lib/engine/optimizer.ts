import type {
  Intake,
  Locale,
  MediaPlan,
  OptimizerAdvice,
  OptimizerPlaybook,
  OptimizerResultInput,
} from "../types";
import { parseNumber } from "../utils";

const L = (he: string, ar: string, en: string): Record<Locale, string> => ({ he, ar, en });

export function generateOptimizer(intake: Intake, media: MediaPlan): OptimizerPlaybook {
  const cac = parseNumber(intake.targetCac);
  return {
    ifThen: [
      {
        if: L("CTR גבוה אבל אין הודעות / תורים", "CTR مرتفع بلا رسائل / مواعيد", "High CTR but no messages / bookings"),
        then: L("ההוק עובד, ההצעה או הנחיתה נשברים. אל תסקיילו קריאייטיב — תקנו CTA ומסך הבא.", "الخطاف يعمل والعرض أو الصفحة ينكسران. لا توسّعوا الإبداع — أصلحوا CTA.", "The hook works; the offer or landing is broken. Don’t scale the creative — fix the CTA and next screen."),
      },
      {
        if: L("פניות רבות בלי שם אמיתי / סקרנים", "طلبات كثيرة بلا اسم حقيقي / فضوليون", "Many enquiries with no real name / tyre-kickers"),
        then: L("ההצעה רחבה מדי (למשל חינם). החמירו את ה-CTA: תור, לא «לפרטים».", "العرض واسع جداً (مثل مجاني). شدّدوا CTA: موعد لا «للتفاصيل».", "The offer is too wide (e.g. free). Tighten the CTA: a booking, not “learn more”."),
      },
      {
        if: L("CPA מעל 1.8× יעד אחרי 50+ קליקים", "CPA فوق 1.8× الهدف بعد 50+ نقرة", "CPA above 1.8× target after 50+ clicks"),
        then: L(
          cac
            ? `כבו את האדסט. יעד ${cac} ₪, קו אדום ≈ ${Math.round(cac * 1.8)} ₪.`
            : "כבו ושמרו צילום. אין CAC יעד — אל תמציאו קו אדום מספרי.",
          cac
            ? `أوقفوا المجموعة. الهدف ${cac} ₪، الخط الأحمر ≈ ${Math.round(cac * 1.8)} ₪.`
            : "أوقفوا واحفظوا لقطة. لا CAC — لا تخترعوا خطاً أحمر رقمياً.",
          cac
            ? `Kill the ad set. Target ${cac} ₪, red line ≈ ${Math.round(cac * 1.8)} ₪.`
            : "Kill it and keep a screenshot. No target CAC — don’t invent a numeric red line.",
        ),
      },
      {
        if: L("יש 3+ המרות אמיתיות מתחת ליעד", "3+ تحويلات حقيقية تحت الهدف", "3+ real conversions under target"),
        then: L("העלו תקציב ב-20% כל 3 ימים, לא פי 3 ביום אחד.", "ارفعوا الميزانية 20% كل 3 أيام لا ×3 في يوم.", "Raise budget 20% every 3 days, not 3× in one day."),
      },
    ],
    killRules: [
      L("אין המרה מוגדרת → אל תריצו יותר מ-3 ימים «לבדוק».", "لا تحويل معرّف → لا تشغّلوا أكثر من 3 أيام «للتجربة».", "No defined conversion → do not run more than 3 days “to see”."),
      L("קריאייטיב עם הבטחה שלא בקליטה (הנחה, דירוג, «אלפים») → כבו.", "إبداع بوعد ليس في البيانات (خصم، تقييم، «آلاف») → أوقفوا.", "Creative promising something not in intake (discount, rating, “thousands”) → kill."),
    ],
    scaleRules: [
      L("סקייל רק על זווית עם פניות איכות, לא על סרטון ש«הלך ויראלי».", "وسّعوا فقط زاوية بطلبات جودة لا فيديو «انتشر».", "Scale only an angle with quality enquiries, not a video that “went viral”."),
      media.scenarioFromUserNumbers
        ? L("תקרת סקייל חודשית = התקציב שסיפקתם, עד לעדכון ידני.", "سقف التوسيع الشهري = الميزانية التي أعطيتموها.", "Monthly scale cap = the budget you supplied, until you update it.")
        : L("אין תקציב בקליטה — אין סקייל אוטומטי.", "لا ميزانية في البيانات — لا توسيع تلقائي.", "No budget in intake — no automatic scale."),
    ],
  };
}

export function adviseFromResults(
  intake: Intake,
  media: MediaPlan,
  input: OptimizerResultInput,
): OptimizerAdvice {
  const spend = parseNumber(input.spend);
  const leads = parseNumber(input.leads);
  const purchases = parseNumber(input.purchases);
  const ctr = parseNumber(input.ctr);
  const cacTarget = parseNumber(intake.targetCac);
  const advice: Record<Locale, string>[] = [];

  if (spend == null || (leads == null && purchases == null)) {
    advice.push(
      L(
        "חסר הוצאה או תוצאה. בלי זה הסוכן מסרב להמליץ על סקייל.",
        "تنقص النفقة أو النتيجة. بدونها يرفض الوكيل التوصية بتوسيع.",
        "Spend or outcome is missing. Without it the agent refuses to recommend scale.",
      ),
    );
  } else {
    const conversions = purchases ?? leads ?? 0;
    const cpa = conversions > 0 ? spend / conversions : undefined;
    if (conversions === 0) {
      advice.push(
        L(
          `הוצאתם ${spend} ₪ בלי המרה. זה לא «עוד יומיים». עצרו, בדקו אירוע המרה ו-CTA, ואז רענן קריאייטיב מהיתרון: ${intake.uniqueAdvantage || "—"}.`,
          `أنفقتم ${spend} ₪ بلا تحويل. هذا ليس «يومين إضافيين». أوقفوا.`,
          `You spent ${spend} ₪ with zero conversions. This is not “two more days”. Stop, check the conversion event and CTA, then refresh creative from the advantage: ${intake.uniqueAdvantage || "—"}.`,
        ),
      );
    } else if (cpa != null && cacTarget != null && cpa > cacTarget * 1.8) {
      advice.push(
        L(
          `CPA בפועל ≈ ${Math.round(cpa)} ₪ מול יעד ${cacTarget} ₪ (קו אדום ${Math.round(cacTarget * 1.8)}). כבו את המפסידים. אל תכפילו תקציב.`,
          `CPA الفعلي ≈ ${Math.round(cpa)} ₪ مقابل هدف ${cacTarget}. أوقفوا الخاسرين.`,
          `Actual CPA ≈ ${Math.round(cpa)} ₪ vs target ${cacTarget} ₪ (red line ${Math.round(cacTarget * 1.8)}). Kill losers. Do not double budget.`,
        ),
      );
    } else if (cpa != null && cacTarget != null && cpa <= cacTarget) {
      advice.push(
        L(
          `CPA ≈ ${Math.round(cpa)} ₪ תחת היעד. העלאה של 20% בלבד, אותה זווית.`,
          `CPA ≈ ${Math.round(cpa)} ₪ تحت الهدف. زيادة 20% فقط.`,
          `CPA ≈ ${Math.round(cpa)} ₪ under target. Raise 20% only, same angle.`,
        ),
      );
    } else if (cpa != null) {
      advice.push(
        L(
          `CPA ≈ ${Math.round(cpa)} ₪. אין CAC יעד בקליטה — לא נסמן «טוב» או «רע» במספר בדוי.`,
          `CPA ≈ ${Math.round(cpa)} ₪. لا CAC في البيانات — لن نضع «جيد/سيئ» برقم مختلق.`,
          `CPA ≈ ${Math.round(cpa)} ₪. No target CAC in intake — we will not stamp good/bad with a made-up number.`,
        ),
      );
    }

    if (ctr != null && ctr >= 3 && conversions === 0) {
      advice.push(
        L("CTR גבוה בלי המרות: אל תחליפו קהל קודם. תקנו את מסך הנחיתה / וואטסאפ.", "CTR مرتفع بلا تحويلات: لا تبدّلوا الجمهور أولاً. أصلحوا الصفحة.", "High CTR with no conversions: don’t swap audience first. Fix the landing / WhatsApp screen."),
      );
    }
  }

  if (input.notes.trim()) {
    advice.push(
      L(`הערה שלך נלקחה בחשבון כפי שנכתבה: ${input.notes}`, ` ملاحظتك كما كتبت: ${input.notes}`, `Your note was taken as written: ${input.notes}`),
    );
  }

  if (!media.scenarioFromUserNumbers) {
    advice.push(
      L("אין תרחיש לידים שמור — ההמלצה איכותית בלבד.", "لا سيناريو عملاء محفوظ — التوصية نوعية فقط.", "No stored lead scenario — advice is qualitative only."),
    );
  }

  return { createdAt: new Date().toISOString(), input, advice };
}
