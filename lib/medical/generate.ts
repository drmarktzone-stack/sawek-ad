import type { Locale } from "../types";
import { filled } from "../utils";
import { uid } from "../utils";
import { countMarkers, ETHICS, toComplete } from "./markers";
import { specialtyLabel } from "./specialties";
import { defaultTemplateFor } from "./skins";
import type {
  Claim,
  ClinicProfile,
  MedicalCampaign,
  MedicalCopyBlock,
  Treatment,
} from "./types";

function slugify(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `${base || "clinic"}-${uid("lp").slice(0, 6)}`;
}

function field(locale: Locale, value: string, label: Record<Locale, string>): string {
  return filled(value) ? value.trim() : toComplete(locale, label[locale]);
}

function copyFor(
  locale: Locale,
  clinic: ClinicProfile,
  t: Treatment,
): MedicalCopyBlock {
  const spec = specialtyLabel(clinic.specialty, locale);
  const price = field(locale, t.price, {
    he: "מחיר הטיפול",
    ar: "سعر العلاج",
    en: "treatment price",
  });
  const tech = field(locale, t.technology, {
    he: "שם הטכנולוגיה / המכשיר",
    ar: "اسم التقنية / الجهاز",
    en: "technology / device name",
  });
  const rate = field(locale, t.successRate, {
    he: "שיעור הצלחה מתועד (רק אם יש מקור)",
    ar: "نسبة نجاح موثّقة (فقط إن وُجد مصدر)",
    en: "documented success rate (only if sourced)",
  });
  const duration = field(locale, t.duration, {
    he: "משך הביקור",
    ar: "مدة الزيارة",
    en: "visit duration",
  });
  const indication = field(locale, t.indication, {
    he: "ההתוויה שציין הרופא",
    ar: "الاستطباب الذي حدّده الطبيب",
    en: "indication as stated by the doctor",
  });
  const treatName = filled(t.name)
    ? t.name.trim()
    : toComplete(locale, locale === "he" ? "שם הטיפול" : locale === "ar" ? "اسم العلاج" : "treatment name");
  const addr = filled(clinic.address)
    ? `${clinic.address}${clinic.city ? ", " + clinic.city : ""}`
    : toComplete(locale, locale === "he" ? "כתובת המרפאה" : locale === "ar" ? "عنوان العيادة" : "clinic address");
  const wa = filled(clinic.whatsapp)
    ? clinic.whatsapp
    : toComplete(locale, locale === "he" ? "מספר וואטסאפ" : locale === "ar" ? "رقم واتساب" : "WhatsApp number");
  const disc = filled(clinic.disclaimer)
    ? clinic.disclaimer
    : toComplete(
        locale,
        locale === "he" ? "דיסקליימר רפואי של המרפאה" : locale === "ar" ? "إخلاء طبي للعيادة" : "clinic medical disclaimer",
      );

  const he = locale === "he";
  const ar = locale === "ar";

  const landingHeadline = he
    ? `${clinic.name} — ${treatName}`
    : ar
      ? `${clinic.name} — ${treatName}`
      : `${clinic.name} — ${treatName}`;

  const landingSub = he
    ? `${spec}. ${indication}. משך משוער: ${duration}. מחיר: ${price}. אין הבטחת תוצאה שלא נכתבה על ידי הרופא.`
    : ar
      ? `${spec}. ${indication}. المدة: ${duration}. السعر: ${price}. لا وعد بنتيجة لم يكتبها الطبيب.`
      : `${spec}. ${indication}. Typical duration: ${duration}. Price: ${price}. No outcome promise the doctor did not write.`;

  const servicesBlurb = he
    ? `השירות שתואר: ${treatName}. טכנולוגיה: ${tech}. שיעור הצלחה: ${rate}. כל מספר אחר לא יומצא.`
    : ar
      ? `الخدمة الموصوفة: ${treatName}. التقنية: ${tech}. نسبة النجاح: ${rate}. لن تُخترع أرقام أخرى.`
      : `Described service: ${treatName}. Technology: ${tech}. Success rate: ${rate}. No other numbers will be invented.`;

  const faq = [
    {
      q: he ? "כמה זה עולה?" : ar ? "كم السعر؟" : "What does it cost?",
      a: he ? `המחיר בקליטה: ${price}.` : ar ? `السعر في البيانات: ${price}.` : `Price on file: ${price}.`,
    },
    {
      q: he ? "כמה זמן הביקור?" : ar ? "كم تدوم الزيارة؟" : "How long is the visit?",
      a: duration,
    },
    {
      q: he ? "איפה אתם?" : ar ? "أين أنتم؟" : "Where are you?",
      a: addr,
    },
    {
      q: he ? "מה אחוזי ההצלחה?" : ar ? "ما نسبة النجاح؟" : "What is the success rate?",
      a: he
        ? `${rate}. אם אין מקור — הסימון נשאר. לא נכתוב 95%.`
        : ar
          ? `${rate}. إن لم يوجد مصدر يبقى الوسم. لن نكتب 95%.`
          : `${rate}. If there is no source the marker stays. We will not write 95%.`,
    },
  ];

  const socialPosts = [
    {
      platform: "feed",
      body: he
        ? `${clinic.name}\n${treatName}\n${indication}\nמחיר: ${price}\nלתיאום: וואטסאפ ${wa}`
        : ar
          ? `${clinic.name}\n${treatName}\n${indication}\nالسعر: ${price}\nواتساب ${wa}`
          : `${clinic.name}\n${treatName}\n${indication}\nPrice: ${price}\nWhatsApp ${wa}`,
    },
    {
      platform: "story",
      body: he
        ? `${treatName}\nבלי הבטחות שלא נכתבו.\n${clinic.city || addr}`
        : ar
          ? `${treatName}\nبلا وعود غير مكتوبة.\n${clinic.city || addr}`
          : `${treatName}\nNo unwritten promises.\n${clinic.city || addr}`,
    },
  ];

  const whatsappScript = he
    ? `שלום, כאן ${clinic.name}. קיבלנו פנייה לגבי ${treatName}. אפשר לקבוע תור ב־${duration !== toComplete("he", "משך הביקור") ? duration : "השעות שפורסמו"}. מחיר: ${price}. זו הודעת תיאום, לא ייעוץ רפואי.`
    : ar
      ? `مرحبا، هنا ${clinic.name}. وصلنا طلب بخصوص ${treatName}. يمكن حجز موعد. السعر: ${price}. هذه رسالة تنسيق لا استشارة طبية.`
      : `Hi, this is ${clinic.name}. We got an enquiry about ${treatName}. We can book a visit. Price: ${price}. This is scheduling, not medical advice.`;

  const voiceScript = he
    ? `הוק: ${treatName} ב${clinic.name}. גוף: ${indication}. סגירה: וואטסאפ. בלי מוזיקה שמסתירה דיסקליימר. טמפרטורה 0.2 — בלי קישוט קליני.`
    : ar
      ? `خطاف: ${treatName}. جسم: ${indication}. إغلاق: واتساب. حرارة 0.2 — بلا زخرفة سريرية.`
      : `Hook: ${treatName} at ${clinic.name}. Body: ${indication}. Close: WhatsApp. Temperature 0.2 — no clinical decoration.`;

  return {
    locale,
    landingHeadline,
    landingSub,
    servicesBlurb,
    faq,
    socialPosts,
    whatsappScript,
    voiceScript,
    disclaimer: `${disc}\n\n${ETHICS[locale]}`,
  };
}

function claimsFor(clinic: ClinicProfile, t: Treatment): Claim[] {
  const claims: Claim[] = [
    {
      id: uid("cl"),
      text: {
        he: `שם המרפאה: ${clinic.name}`,
        ar: `اسم العيادة: ${clinic.name}`,
        en: `Clinic name: ${clinic.name}`,
      },
      kind: "doctor-fact",
      source: "clinic profile",
    },
    {
      id: uid("cl"),
      text: {
        he: `התמחות: ${specialtyLabel(clinic.specialty, "he")}`,
        ar: `التخصص: ${specialtyLabel(clinic.specialty, "ar")}`,
        en: `Specialty: ${specialtyLabel(clinic.specialty, "en")}`,
      },
      kind: "doctor-fact",
      source: "clinic profile",
    },
  ];
  if (filled(t.indication)) {
    claims.push({
      id: uid("cl"),
      text: { he: t.indication, ar: t.indication, en: t.indication },
      kind: "doctor-fact",
      source: "treatment.indication",
    });
  }
  if (filled(t.price)) {
    claims.push({
      id: uid("cl"),
      text: {
        he: `מחיר שסופק: ${t.price}`,
        ar: `سعر مُعطى: ${t.price}`,
        en: `Price as supplied: ${t.price}`,
      },
      kind: "doctor-fact",
      source: "treatment.price",
    });
  }
  if (filled(t.successRate) && filled(t.sourceUrl)) {
    claims.push({
      id: uid("cl"),
      text: {
        he: `שיעור מתועד: ${t.successRate}`,
        ar: `نسبة موثّقة: ${t.successRate}`,
        en: `Documented rate: ${t.successRate}`,
      },
      kind: "cited-source",
      source: t.sourceUrl,
    });
  } else if (filled(t.successRate) && !filled(t.sourceUrl)) {
    claims.push({
      id: uid("cl"),
      text: {
        he: `שיעור הצלחה הוזן בלי מקור — נשאר כעובדת רופא לא מצוטטת, לא כמדע.`,
        ar: `نسبة نجاح بلا مصدر — تبقى واقعة طبيب غير مقتبسة.`,
        en: `Success rate entered without a source — stays an unsourced doctor fact, not science.`,
      },
      kind: "doctor-fact",
      source: "treatment.successRate (no URL)",
    });
  }
  claims.push({
    id: uid("cl"),
    text: {
      he: "קריאה לפעולה לקביעת תור — ניסוח שיווקי, לא אבחנה.",
      ar: "نداء لحجز موعد — صياغة تسويقية لا تشخيص.",
      en: "Call to book an appointment — marketing copy, not a diagnosis.",
    },
    kind: "marketing-copy",
    source: "cta",
  });
  return claims;
}

export function generateMedicalCampaign(
  clinic: ClinicProfile,
  treatment: Treatment,
  template = defaultTemplateFor(clinic.specialty),
): MedicalCampaign {
  const locales: Locale[] = ["he", "ar", "en"];
  const copy = locales.map((l) => copyFor(l, clinic, treatment));
  const claims = claimsFor(clinic, treatment);
  const blobs = copy.flatMap((c) => [
    c.landingHeadline,
    c.landingSub,
    c.servicesBlurb,
    c.whatsappScript,
    c.voiceScript,
    c.disclaimer,
    ...c.faq.map((f) => f.q + f.a),
    ...c.socialPosts.map((p) => p.body),
  ]);
  return {
    id: uid("med"),
    slug: slugify(clinic.name),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    clinic,
    treatment: { ...treatment, id: treatment.id || uid("tx") },
    template,
    copy,
    claims,
    approved: false,
    markerCount: countMarkers(...blobs),
  };
}

export function blockFor(campaign: MedicalCampaign, locale: Locale): MedicalCopyBlock {
  return campaign.copy.find((c) => c.locale === locale) ?? campaign.copy[0];
}

export function exportMedicalPack(campaign: MedicalCampaign, locale: Locale): string {
  const c = blockFor(campaign, locale);
  return [
    `Ilan medical pack — ${campaign.clinic.name}`,
    `slug: ${campaign.slug}`,
    `markers: ${campaign.markerCount}`,
    "",
    c.landingHeadline,
    c.landingSub,
    c.servicesBlurb,
    "",
    "WhatsApp:",
    c.whatsappScript,
    "",
    "Voice:",
    c.voiceScript,
    "",
    ...c.socialPosts.map((p) => `${p.platform}:\n${p.body}`),
    "",
    c.disclaimer,
  ].join("\n");
}

export function waLink(phone: string, text: string): string {
  const digits = phone.replace(/[^\d]/g, "");
  if (!digits) return "";
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
