import { uid } from "../utils";
import { DEFAULT_HOURS, type ClinicProfile, type OptiInputs, type Treatment } from "./types";
import { generateMedicalCampaign } from "./generate";

export const PEDS_DEMO_ID = "demo-samer-peds";

export function demoPediatricClinic(): ClinicProfile {
  return {
    id: PEDS_DEMO_ID,
    name: "מרפאת ילדים ד״ר סאמר אבו מוך",
    doctorName: "ד״ר סאמר אבו מוך",
    specialty: "peds",
    whatsapp: "972528885800",
    address: "מתחם אל-נור, קומה 1, ליד הכיכר המרכזית",
    city: "באקה אל-גרביה",
    disclaimer:
      "המידע באתר הוא כללי ואינו מחליף ייעוץ, אבחון או טיפול רפואי. במצב חירום פנו לחדר מיון. שעות הקבלה ומחירים שלא הוזנו נשארים [יש להשלים] — SAWEK AD לא ממציא אותם.",
    hours: DEFAULT_HOURS.map((h) => ({ ...h, open: "", close: "", closed: true })),
    slotMinutes: 20,
    operatingModel: "free_service",
  };
}

export function demoPediatricTreatment(): Treatment {
  return {
    id: uid("tx"),
    serviceId: "growth",
    name: "מעקב ילדים שגרתי",
    indication: "ביקורת שגרתית לפי שיקול דעת הרופא בביקור — לא פירוט חיסונים או מחלות שלא הוזנו.",
    duration: "",
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
    monthlySpend: "",
    revenue: "",
    noShowPercent: "",
    oldMethod: "",
    bottleneck: "",
    competitorName: "",
    competitorNote: "",
    localEvent: "",
  };
}

export function buildPediatricDemoCampaign() {
  const clinic = demoPediatricClinic();
  const treatment = demoPediatricTreatment();
  const campaign = generateMedicalCampaign(clinic, treatment, "clinical-trust");
  campaign.id = "demo-samer-peds-campaign";
  campaign.slug = "samer-abu-mokh-peds";
  return { clinic, campaign };
}
