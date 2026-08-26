import { uid } from "../utils";
import { DEFAULT_HOURS, type ClinicProfile, type OptiInputs, type Treatment } from "./types";
import { generateMedicalCampaign } from "./generate";

export const PEDS_DEMO_ID = "demo-peds-khalil";

export function demoPediatricClinic(): ClinicProfile {
  return {
    id: PEDS_DEMO_ID,
    name: "מרפאת ילדים ד״ר לין ח׳ליל",
    doctorName: "ד״ר לין ח׳ליל",
    specialty: "peds",
    whatsapp: "972500000000",
    address: "רחוב הגליל 12",
    city: "נצרת",
    disclaimer:
      "המידע באתר הוא כללי ואינו מחליף ייעוץ, אבחון או טיפול רפואי. במצב חירום פנו לחדר מיון. החיסונים ניתנים לפי הנחיות משרד הבריאות שתאושרנה בביקור — לא מפורטות כאן רשימות חיסון שלא הוזנו.",
    hours: DEFAULT_HOURS.map((h) => ({ ...h })),
    slotMinutes: 20,
  };
}

export function demoPediatricTreatment(): Treatment {
  return {
    id: uid("tx"),
    serviceId: "growth",
    name: "מעקב גדילה והתפתחות",
    indication: "ביקורת שגרתית לילדים במעקב המרפאה — לא טיפול במחלה חדה אלא אם הרופאה תחליט בביקור.",
    duration: "20 דקות",
    price: "",
    cost: "",
    technology: "",
    successRate: "",
    sourceUrl: "",
    consentBeforeAfter: false,
    beforeCaption: "",
    afterCaption: "",
  };
}

export function demoPediatricOpti(): OptiInputs {
  return {
    monthlySpend: "2500",
    revenue: "",
    noShowPercent: "18",
    oldMethod: "פוסטים בפייסבוק עם «ייעוץ חינם לילדים» שמשכו סקרנים בלי תור.",
    bottleneck: "הורים שואלים בוואטסאפ בלי להשאיר שם הילד / גיל.",
    competitorName: "",
    competitorNote: "",
    localEvent: "פתיחת שנת לימודים — רק אם המרפאה מאשרת שזה רלוונטי אצלה, לא אירוע מדומה.",
  };
}

export function buildPediatricDemoCampaign() {
  const clinic = demoPediatricClinic();
  const treatment = demoPediatricTreatment();
  const campaign = generateMedicalCampaign(clinic, treatment, "clinical-trust");
  campaign.id = "demo-peds-campaign";
  campaign.slug = "lin-khalil-peds";
  return { clinic, campaign };
}
