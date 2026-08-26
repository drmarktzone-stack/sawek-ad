import type { Intake } from "./types";
import { DEFAULT_OFFER_HE } from "./chips";

export const DEMO_ID = "demo-samer-clinic";

export function demoIntake(): Intake {
  return {
    type: "business",
    depth: "quick",
    businessName: "מרפאת ד״ר סאמר אבו מוך",
    category: "מרפאה משפחתית / רפואה ראשונית",
    description:
      "מרפאה משפחתית מקומית שמלווה משפחות לאורך זמן. דגש על הקשבה, זמינות, ושירות בעברית ובערבית בלי תור של חודשים.",
    location: "המשולש / אום אל-פחם והסביבה",
    website: "",
    audience: "משפחות מקומיות שמחפשות רופא קבוע שמדבר בשפה שלהן",
    audienceCustom: true,
    biggestProblem:
      "משפחות דוחות בדיקות כי אין רופא קבוע שסומכים עליו, והפרסום הכללי נשמע כמו עוד מרפאה.",
    problemCustom: true,
    uniqueAdvantage: "שירות אישי דו-לשוני וזמינות גבוהה — לא מוקד, אלא רופא שמכיר את המשפחה",
    advantageCustom: true,
    mainGoal: "לידים לתור ראשון",
    goalCustom: true,
    offer: DEFAULT_OFFER_HE,
    offerCustom: false,
    competitors: [
      {
        id: "demo-comp-kupah",
        name: "מרפאות קופה באזור אום אל-פחם",
        url: "",
        notes: "תורים ארוכים, שירות בעברית בעיקר, פרסום כללי של «רופא משפחה» בלי בידול אישי",
      },
      {
        id: "demo-comp-private",
        name: "רופאים פרטיים במשולש",
        url: "",
        notes: "מחיר גבוה יותר, פחות זמינות בערבית בערב, מודעות «ייעוץ חינם» שמושכות סקרנים",
      },
      {
        id: "demo-comp-urgent",
        name: "מוקדים / רפואה דחופה ברשת",
        url: "",
        notes: "זמינות מיידית אבל בלי רופא קבוע שמכיר את המשפחה",
      },
    ],
    businessModel: "מרפאה פרטית: ביקור פרטי + שילוב עם קופות לפי ביקור. ליד = תור ראשון במרפאה.",
    avgOrderValue: "280",
    marginPercent: "38",
    targetCac: "45",
    monthlyBudget: "3000",
    pastAds:
      "פוסטים ממומנים בפייסבוק עם ניסוח של ייעוץ חינם. הביאו פניות סקרניות בלי כוונה להגיע, ושיחות בלי להשאיר שם אמיתי.",
    pastResults: "הוצאה משוערת 1,200 ₪ בחודש אחד. מעט תורים שנקבעו בפועל. לא נמדד CAC אמיתי.",
    whatFailed: "ההצעה משכה סקרנים במקום משפחות שצריכות רופא קבוע. אין נחיתה ברורה לתור.",
  };
}

export const DEMO_LABEL = {
  he: "הדגמה: מרפאת ד״ר סאמר אבו מוך",
  ar: "عرض تجريبي: عيادة د. سامر أبو موخ",
  en: "Demo: Dr. Samer Abu Mukh Clinic",
} as const;
