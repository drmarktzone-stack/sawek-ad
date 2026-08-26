import type { Locale } from "../types";
import { filled, parseNumber } from "../utils";
import { toComplete } from "./markers";
import type { Tri } from "./types";

function L(he: string, ar: string, en: string): Tri {
  return { he, ar, en };
}

export function pick(tri: Tri, locale: Locale): string {
  return tri[locale];
}

function hasAny(text: string, words: string[]): boolean {
  const t = text.toLowerCase();
  return words.some((w) => t.includes(w.toLowerCase()));
}

/* ------------------------------------------------------------------ lists */

export const INDUSTRIES = [
  { id: "clinic", label: L("מרפאה רפואית", "عيادة طبية", "Medical clinic") },
  { id: "dental", label: L("מרפאת שיניים", "عيادة أسنان", "Dental clinic") },
  { id: "vet", label: L("מרפאה וטרינרית", "عيادة بيطرية", "Veterinary clinic") },
  { id: "beauty", label: L("מרכז אסתטיקה", "مركز تجميل", "Aesthetic center") },
  { id: "gym", label: L("מועדון כושר", "نادي رياضي", "Gym") },
  { id: "restaurant", label: L("מסעדה / בית קפה", "مطعم / كافيه", "Restaurant / café") },
  { id: "ecom", label: L("חנות אונליין", "متجر إلكتروني", "E-commerce") },
  { id: "realestate", label: L("נדל״ן", "عقارات", "Real estate") },
  { id: "education", label: L("חינוך וקורסים", "تعليم ودورات", "Education") },
  { id: "services", label: L("שירותים מקומיים", "خدمات محلية", "Local services") },
] as const;

export function industryLabel(id: string, locale: Locale): string {
  return pick(INDUSTRIES.find((i) => i.id === id)?.label ?? L("עסק", "نشاط", "Business"), locale);
}

export const OLD_METHODS = [
  { id: "random_ads", penalty: 16, label: L("מודעות אקראיות בלי בדיקה", "إعلانات عشوائية بدون اختبار", "Random ads with no tests") },
  { id: "no_funnel", penalty: 20, label: L("אין משפך המרה", "لا يوجد قمع تحويل", "No conversion funnel") },
  { id: "discounts", penalty: 14, label: L("הנחות ישירות חוזרות", "خصومات مباشرة متكررة", "Repeated direct discounts") },
  { id: "no_offer", penalty: 18, label: L("אין הצעה ברורה", "لا يوجد عرض واضح", "No clear offer") },
  { id: "no_followup", penalty: 15, label: L("אין מעקב אחרי לידים", "لا متابعة للعملاء المحتملين", "No lead follow-up") },
  { id: "boosting", penalty: 12, label: L("רק כפתור Boost", "الاعتماد على زر Boost فقط", "Boost button only") },
  { id: "no_data", penalty: 13, label: L("אין מדידה / פיקסל", "لا قياس أو بكسل", "No measurement / pixel") },
  { id: "no_content", penalty: 10, label: L("אין תוכן בונה אמון", "لا محتوى يبني ثقة", "No trust-building content") },
] as const;

export const BOTTLENECKS = [
  { id: "no_leads", label: L("אין מספיק פניות", "لا تصل استفسارات كافية", "Not enough enquiries") },
  { id: "low_close", label: L("פניות בלי סגירה", "استفسارات كثيرة وإغلاق ضعيف", "Enquiries, weak close") },
  { id: "high_cpl", label: L("עלות ליד גבוהה", "تكلفة العميل المحتمل مرتفعة", "High cost per lead") },
  { id: "no_repeat", label: L("אין מטופלים חוזרים", "لا يوجد عملاء متكررون", "No repeat patients") },
  { id: "brand", label: L("חולשת אמון דיגיטלי", "ضعف الثقة الرقمية", "Weak digital trust") },
] as const;

const GAP_LIBRARY: Record<string, { title: Tri; body: Tri; source: string }> = {
  random_ads: {
    title: L("מודעה אחת בלי בדיקה = שריפת תקציב", "إعلان بلا اختبار = حرق ميزانية", "One untested ad burns budget"),
    body: L(
      "זווית אחת שנכשלה אינה אומרת שהשוק נכשל. כלל: 3–5 זוויות במקביל.",
      "الزاوية الواحدة الفاشلة لا تعني أن السوق فاشل. القاعدة: 3–5 زوايا بالتوازي.",
      "One failed angle does not mean the market failed. Rule: test 3–5 angles in parallel.",
    ),
    source: "Sabri Suby — Testing Framework",
  },
  no_funnel: {
    title: L("פער משפך: מבקשים מכירה מזר", "فجوة القمع: تطلب البيع من غريب", "Funnel gap: asking a stranger to buy"),
    body: L(
      "נדרש שלב ביניים שתופס שם ומספר ובונה אמון לפני בקשת תור.",
      "يلزم خطوة وسيطة تلتقط الاسم والرقم وتبني الثقة قبل طلب الموعد.",
      "You need a middle step that captures name and phone and builds trust before asking for a booking.",
    ),
    source: "Sarah Refai — Funnel Gap",
  },
  discounts: {
    title: L("הנחה ישירה שוחקת ערך נתפס", "الخصم المباشر يدمّر القيمة المدركة", "Direct discount erodes perceived value"),
    body: L(
      "חלופה: להוסיף ערך (בונוס, מעקב, אחריות כתובה) באותו מחיר — רק אם זה מדיניות אמיתית שלכם.",
      "البديل: زيادة القيمة بنفس السعر — فقط إن كانت سياسة حقيقية لديكم.",
      "Alternative: add value at the same price — only if that is your real policy.",
    ),
    source: "Alex Hormozi — Value Equation",
  },
  no_offer: {
    title: L("הצעה רגילה בשוק צפוף", "عرض عادي في سوق مزدحم", "Ordinary offer in a crowded market"),
    body: L(
      "בלי תוצאה ברורה + זמן + אחריות כתובה (אם יש) + הפחתת מאמץ — מתחרים רק במחיר.",
      "بلا نتيجة واضحة + زمن + ضمان مكتوب (إن وُجد) + تقليل مجهود — تنافسون على السعر فقط.",
      "Without a clear result + time + a written guarantee (if you have one) + lower effort, you compete only on price.",
    ),
    source: "Alex Hormozi — $100M Offers",
  },
  no_followup: {
    title: L("מעקב אפס הורג סגירות", "المتابعة الصفرية تقتل المبيعات", "Zero follow-up kills closes"),
    body: L(
      "רוב ההורים לא מחליטים במגע הראשון. תכננו וואטסאפ ב-5 דק׳ / 24ש׳ / 72ש׳ — תוכנית, לא שליחה חיה.",
      "أغلب الأهل لا يقررون من اللمسة الأولى. خطّطوا واتساب خلال 5 دقائق و24 ساعة و72 ساعة — خطة لا إرسال حي.",
      "Most parents do not decide on first contact. Plan WhatsApp at 5 min / 24h / 72h — a plan, not a live send.",
    ),
    source: "Dafsh Data — Speed to Lead",
  },
  boosting: {
    title: L("Boost אינו אסטרטגיה", "زر Boost ليس استراتيجية", "Boost is not a strategy"),
    body: L(
      "צריך קהל מותאם + דומה + ריטרגט. SAWEK AD לא מפרסם בפייסבוק — זה PLAN בלבד.",
      "يلزم جمهور مخصص + مشابه + إعادة استهداف. SAWEK AD لا ينشر على فيسبوك — خطة فقط.",
      "You need a custom audience + lookalike + retarget. SAWEK AD does not publish to Facebook — PLAN only.",
    ),
    source: "Omar Al-Jandali — Media Buying",
  },
  no_data: {
    title: L("בלי מדידה = החלטות לפי מצב רוח", "بلا قياس = قرارات بالمزاج", "No measurement = mood decisions"),
    body: L(
      "בלי מעקב המרה לא תדעו איזו זווית הביאה פנייה. SAWEK AD לא ממציא CTR.",
      "بلا تتبع تحويل لن تعرفوا أي زاوية جلبت الاستفسار. SAWEK AD لا يخترع CTR.",
      "Without conversion tracking you will not know which angle produced an enquiry. SAWEK AD will not invent CTR.",
    ),
    source: "Dafsh Data — Attribution",
  },
  no_content: {
    title: L("אין סיבה לשוק לשים לב", "لا سبب يجعل السوق يهتم", "No reason for the market to notice"),
    body: L(
      "רעיון אחד שראוי לשיחה עדיף על עשר פוסטים רגילים. בלי המצאת «אלפי מטופלים».",
      "فكرة واحدة تستحق الحديث أفضل من عشر منشورات عادية. بلا اختراع «آلاف المرضى».",
      "One idea worth talking about beats ten ordinary posts. Do not invent “thousands of patients”.",
    ),
    source: "Seth Godin — Purple Cow",
  },
};

const RESCUE: Record<string, { step: Tri; detail: Tri }[]> = {
  no_leads: [
    {
      step: L("הצעת לכידה במקום מכירה", "عرض التقاط بدل عرض بيع", "Capture offer instead of a sale"),
      detail: L("הערכת זמינות / שאלה אחת — רק אם זה באמת מה שאתם נותנים. לא «ייעוץ חינם» כברירת מחדל.", "تقييم توفر / سؤال واحد — فقط إن كنتم تقدمونه فعلاً. لا «استشارة مجانية» افتراضياً.", "Availability check / one question — only if that is what you actually give. No default “free consult”."),
    },
    {
      step: L("3 זוויות במקביל", "3 زوايا متوازية", "3 angles in parallel"),
      detail: L("כאב / תוצאה / התנגדות — תקציב שווה ל-4 ימים אם יש תקציב שהוזן.", "ألم / نتيجة / اعتراض — ميزانية متساوية 4 أيام إن وُجدت ميزانية مُدخلة.", "Pain / result / objection — equal budget for 4 days if a budget was entered."),
    },
    {
      step: L("טירגוט גיאוגרפי צר", "استهداف جغرافي ضيق", "Narrow geo targeting"),
      detail: L("5–10 ק״מ סביב הכתובת שסיפקתם. בלי להמציא ערים.", "5–10 كم حول العنوان الذي أعطيتموه. بلا اختراع مدن.", "5–10 km around the address you supplied. No invented cities."),
    },
  ],
  low_close: [
    {
      step: L("סקריפט מענה ב-5 דקות", "سكربت رد خلال 5 دقائق", "5-minute reply script"),
      detail: L("אישור + שאלת סינון אחת + שני מועדים אמיתיים מיומן העבודה.", "تأكيد + سؤال تأهيل واحد + موعدان حقيقيان من جدولكم.", "Confirm + one qualifying question + two real slots from your hours."),
    },
    {
      step: L("מגן התנגדויות כתוב", "دروع اعتراضات مكتوبة", "Written objection shields"),
      detail: L("שני משפטים למחיר / זמן / אמון — ממילותיכם, לא הבטחות ריפוי.", "جملتان للسعر / الوقت / الثقة — بكلماتكم، بلا وعود شفاء.", "Two lines for price / time / trust — in your words, no cure promises."),
    },
    {
      step: L("אחריות רק אם כתובה", "ضمان فقط إن كان مكتوباً", "Guarantee only if written"),
      detail: L("אם אין מדיניות החזר — אל תבטיחו החזר.", "إن لم توجد سياسة استرجاع — لا تعدوا باسترجاع.", "If you have no refund policy — do not promise a refund."),
    },
  ],
  high_cpl: [
    {
      step: L("כלל כיבוי", "قاعدة إيقاف", "Kill rule"),
      detail: L("עצרו קריאייטיב אחרי 1000 חשיפות בלי פנייה — רק אם מדדתם חשיפות. אחרת סמנו להשלים.", "أوقفوا الإبداع بعد 1000 ظهور بلا استفسار — فقط إن قستم الظهور. وإلا أكملوا الرقم.", "Pause a creative after 1,000 impressions with no enquiry — only if you measured impressions. Else mark TO COMPLETE."),
    },
    {
      step: L("טופס קצר", "نموذج مختصر", "Short form"),
      detail: L("שם + טלפון. כל שדה נוסף מעלה עלות אם זה מה שמדדתם.", "اسم + رقم. كل حقل إضافي يرفع التكلفة إن كان هذا ما قستموه.", "Name + phone. Each extra field raises cost if that is what you measured."),
    },
    {
      step: L("ריטרגט בהוכחה", "إعادة استهداف بإثبات", "Retarget with proof"),
      detail: L("רק המלצות עם הסכמה חתומה. בלי כוכבים בדויים.", "شهادات بموافقة موقعة فقط. بلا نجوم مختلقة.", "Only testimonials with signed consent. No fake stars."),
    },
  ],
  no_repeat: [
    {
      step: L("תוכנית חזרה 30 יום", "برنامج عودة خلال 30 يوماً", "30-day return plan"),
      detail: L("תזכורת מעקב מהיומן שלכם — wa.me תוכנית, לא שליחה חיה.", "تذكير متابعة من جدولكم — خطة wa.me لا إرسال حي.", "Follow-up reminder from your diary — wa.me plan, not a live send."),
    },
    {
      step: L("הפניה רק אם יש מדיניות", "إحالة فقط إن وُجدت سياسة", "Referral only if you have a policy"),
      detail: L("אל תמציאו בונוס כפול. אם אין — סמנו להשלים.", "لا تخترعوا مكافأة مزدوجة. إن لم توجد — أكملوا.", "Do not invent a double bonus. If none — mark TO COMPLETE."),
    },
    {
      step: L("חבילת מעקב", "باقة متابعة", "Follow-up package"),
      detail: L("רק אם זה שירות שאתם באמת מוכרים.", "فقط إن كانت خدمة تبيعونها فعلاً.", "Only if that is a service you actually sell."),
    },
  ],
  brand: [
    {
      step: L("הוכחות אמיתיות", "إثباتات حقيقية", "Real proof"),
      detail: L("לפני/אחרי רק עם הסכמה. בלי סטוק חיוך מושלם.", "قبل/بعد بموافقة فقط. بلا ستوك ابتسامة مثالية.", "Before/after only with consent. No perfect-smile stock."),
    },
    {
      step: L("זהות אחידה", "هوية موحدة", "Unified identity"),
      detail: L("אותו שם, תמונה, כתובת בכל הפלטפורמות + מפות — כפי שסיפקתם.", "نفس الاسم والصورة والعنوان على كل المنصات + الخرائط — كما أعطيتم.", "Same name, photo, address on every platform + maps — as you supplied."),
    },
    {
      step: L("מענה פומבי לביקורות", "رد علني على المراجعات", "Public replies to reviews"),
      detail: L("רק ביקורות קיימות. אין להמציא דירוג.", "المراجعات الموجودة فقط. لا تخترعوا تقييماً.", "Existing reviews only. Do not invent a rating."),
    },
  ],
};

export type AuditResult = {
  score: number | null;
  verdict: Tri;
  gaps: { title: Tri; body: Tri; source: string; severity: Tri }[];
  rescue: { step: Tri; detail: Tri; window: Tri }[];
  growth: { month: Tri; current: number; projected: number }[] | null;
  expectedLeads: number | null;
  note: Tri;
};

export function runAudit(input: { methods: string[]; bottleneck: string; budget: string }): AuditResult {
  const budget = parseNumber(input.budget);
  const windows: Tri[] = [
    L("תוך 24 שעות", "خلال 24 ساعة", "Within 24 hours"),
    L("תוך 72 שעות", "خلال 72 ساعة", "Within 72 hours"),
    L("תוך 7 ימים", "خلال 7 أيام", "Within 7 days"),
  ];
  const rescue = (RESCUE[input.bottleneck] ?? RESCUE.no_leads).map((r, i) => ({
    ...r,
    window: windows[i] ?? windows[2],
  }));
  const gaps = input.methods
    .map((m) => {
      const g = GAP_LIBRARY[m];
      const method = OLD_METHODS.find((x) => x.id === m);
      if (!g || !method) return null;
      const severity =
        method.penalty >= 18
          ? L("קריטי", "قاتل", "Critical")
          : method.penalty >= 14
            ? L("גבוה", "مرتفع", "High")
            : L("בינוני", "متوسط", "Medium");
      return { ...g, severity };
    })
    .filter(Boolean) as AuditResult["gaps"];

  if (!input.methods.length && budget == null) {
    return {
      score: null,
      verdict: L(
        toComplete("he", "שיטות ישנות + תקציב חודשי"),
        toComplete("ar", "أساليب قديمة + ميزانية شهرية"),
        toComplete("en", "old methods + monthly budget"),
      ),
      gaps: [],
      rescue,
      growth: null,
      expectedLeads: null,
      note: L("בלי קלטים אין ציון. לא יוצג 72%.", "بلا مدخلات لا درجة. لن يُعرض 72%.", "No inputs, no score. No 72% will be shown."),
    };
  }

  let score = 92;
  for (const m of input.methods) {
    const found = OLD_METHODS.find((x) => x.id === m);
    if (found) score -= found.penalty;
  }
  if (budget != null && budget < 300) score -= 8;
  score = Math.max(6, Math.min(96, Math.round(score)));

  const verdict =
    score >= 70
      ? L("המבנה סביר — הפער בביצוע.", "التسويق سليم هيكلياً — الفجوة في التنفيذ.", "Structure is sound — the gap is execution.")
      : score >= 45
        ? L("יש בסיס, והחורים שורפים תקציב כל יום.", "لديكم أساس، والثغرات تستهلك الميزانية يومياً.", "You have a base, and the holes spend budget every day.")
        : L("המבנה עובד נגדכם עד שמתקנים אותו.", "البنية تعمل ضدكم حتى تُصلح.", "The structure works against you until it is fixed.");

  let expectedLeads: number | null = null;
  let growth: AuditResult["growth"] = null;
  if (budget != null && budget > 0) {
    const cpl = input.bottleneck === "high_cpl" ? 14 : 9;
    const base = Math.max(4, Math.round((budget / cpl) * (score / 100)));
    const target = Math.round(base * (1 + (100 - score) / 55));
    expectedLeads = target;
    const months: Tri[] = [
      L("חודש 1", "الشهر 1", "Month 1"),
      L("חודש 2", "الشهر 2", "Month 2"),
      L("חודש 3", "الشهر 3", "Month 3"),
      L("חודש 4", "الشهر 4", "Month 4"),
      L("חודש 5", "الشهر 5", "Month 5"),
      L("חודש 6", "الشهر 6", "Month 6"),
    ];
    growth = months.map((month, i) => ({
      month,
      current: Math.round(base * (1 + i * 0.04)),
      projected: Math.round(base + ((target - base) * (i + 1)) / 6 + i * base * 0.12),
    }));
  }

  return {
    score,
    verdict,
    gaps,
    rescue,
    growth,
    expectedLeads,
    note: L(
      "הציון הוא חישוב מקנסות השיטות שסימנתם — לא מד חי. לידים «צפויים» הם תרחיש מתקציב÷CPL×ציון, לא תחזית שוק.",
      "الدرجة حساب من غرامات الأساليب التي علّمتموها — ليست مقياساً حياً. الاستفسارات «المتوقعة» سيناريو من ميزانية÷CPL×درجة، ليست توقّعاً سوقياً.",
      "The score is arithmetic from the method penalties you ticked — not a live meter. “Expected” enquiries are a scenario from budget÷CPL×score, not a market forecast.",
    ),
  };
}

/* ------------------------------------------------------------------ simulator */

const PROOF = ["עדות", "המלצה", "לפני", "אחרי", "תוצאה", "تجربة", "شهادة", "قبل", "بعد", "نتيجة", "testimonial", "review", "before", "after", "result", "%"];
const GUARANTEE = ["אחריות", "החזר", "בלי סיכון", "ضمان", "استرجاع", "استرداد", "مجاني", "guarantee", "refund", "risk-free"];
const CTA = ["קבעו", "השאירו", "וואטסאפ", "התקשרו", "احجز", "اطلب", "واتساب", "اتصل", "book", "whatsapp", "call", "schedule"];
const URGENCY = ["היום", "נגמר", "מוגבל", "اليوم", "ينتهي", "محدود", "today", "ends", "limited", "last"];

export type PersonaVerdict = {
  id: string;
  emoji: string;
  name: Tri;
  role: Tri;
  verdict: Tri;
  friction: number;
  objection: Tri;
  fix: Tri;
};

export function simulateBuyers(input: { copy: string; price: string; audience: string }) {
  const t = input.copy;
  const hasPrice = filled(input.price) || /\d/.test(t);
  const hasProof = hasAny(t, PROOF);
  const hasGuarantee = hasAny(t, GUARANTEE);
  const hasCTA = hasAny(t, CTA);
  const hasUrgency = hasAny(t, URGENCY);
  const short = t.trim().length < 220;
  const clamp = (n: number) => Math.max(5, Math.min(97, Math.round(n)));

  const raw: Omit<PersonaVerdict, "verdict">[] = [
    {
      id: "bargain",
      emoji: "🧐",
      name: L("הלקוח החסכן", "الزبون البخيل", "The bargain hunter"),
      role: L("משווה מחיר לערך נתפס", "يقارن السعر بالقيمة المدركة", "Compares price to perceived value"),
      friction: clamp(70 - (hasGuarantee ? 25 : 0) - (hasPrice ? 10 : -10)),
      objection: hasPrice
        ? L("המחיר ברור — מה מצדיק אותו?", "السعر واضح لكن ما الذي يبرره؟", "Price is clear — what justifies it?")
        : L("למה המחיר מוסתר? אני מניח שהוא יקר ויוצא.", "لماذا تخفون السعر؟ أفترض أنه غالٍ وأخرج.", "Why is the price hidden? I assume it is expensive and leave."),
      fix: L("הראו מחיר עם פירוק ערך — רק ממספרים שסיפקתם.", "أظهروا السعر مع تفكيك القيمة — من أرقامكم فقط.", "Show price with a value breakdown — only from numbers you supplied."),
    },
    {
      id: "cynic",
      emoji: "🤨",
      name: L("הספקן", "المتشكك", "The cynic"),
      role: L("מחפש הבטחות מוגזמות וחוסר הוכחה", "يبحث عن وعود مبالغ فيها ونقص إثبات", "Looks for overclaim and missing proof"),
      friction: clamp(85 - (hasProof ? 40 : 0) - (hasGuarantee ? 15 : 0)),
      objection: hasProof
        ? L("יש הוכחה כללית — רוצה מקרה דומה לשלי, עם הסכמה.", "الإثبات عام — أريد حالة تشبه حالتي بموافقة.", "Proof is generic — I want a case like mine, with consent.")
        : L("דיבור שיווקי בלי ראיה. מי ניסה את זה באמת?", "كلام تسويقي بلا دليل. من جرّب هذا فعلاً؟", "Marketing talk with no evidence. Who actually tried this?"),
      fix: L("הוסיפו הוכחה עם תאריך והסכמה — או סמנו להשלים. אל תמציאו אחוזי הצלחה.", "أضيفوا إثباتاً بتاريخ وموافقة — أو أكملوا. لا تخترعوا نسب نجاح.", "Add proof with a date and consent — or mark TO COMPLETE. Do not invent success rates."),
    },
    {
      id: "impulse",
      emoji: "⚡",
      name: L("הממהר", "المستعجل", "The impatient buyer"),
      role: L("מודד בהירות הצעד הבא", "يقيس وضوح الخطوة التالية", "Measures how clear the next step is"),
      friction: clamp((hasCTA ? 25 : 75) + (short ? 0 : 15)),
      objection: hasCTA
        ? L("הצעד ברור, הטקסט ארוך.", "الخطوة واضحة والنص طويل.", "The step is clear; the copy is long.")
        : L("מה לעשות עכשיו? אין CTA אחד.", "ماذا أفعل الآن؟ لا زر إجراء واحد.", "What do I do now? There is not one CTA."),
      fix: L("CTA אחד: פעולה + מקום + זמן אמיתי מיומן.", "دعوة واحدة: فعل + مكان + زمن حقيقي من الجدول.", "One CTA: action + place + a real time from your hours."),
    },
    {
      id: "overthinker",
      emoji: "🔬",
      name: L("המדקדק", "الدقيق", "The overthinker"),
      role: L("מחפש תנאים ומדיניות", "يفتش عن الشروط والسياسة", "Looks for terms and policy"),
      friction: clamp(80 - (hasGuarantee ? 35 : 0) - (hasUrgency ? -5 : 0)),
      objection: hasGuarantee
        ? L("יש אחריות — מה החריגים?", "يوجد ضمان — ما الاستثناءات؟", "There is a guarantee — what are the exceptions?")
        : L("אין מדיניות החזר כתובה. הסיכון עליי.", "لا سياسة استرجاع مكتوبة. المخاطرة عليّ.", "No written refund policy. The risk is on me."),
      fix: L("כתבו תנאים בשני משפטים — או אל תבטיחו.", "اكتبوا الشروط في سطرين — أو لا تعدوا.", "Write terms in two lines — or do not promise."),
    },
  ];

  const personas: PersonaVerdict[] = raw.map((p) => ({
    ...p,
    verdict:
      p.friction <= 35
        ? L("מתקבל", "مقبول", "Accepted")
        : p.friction <= 65
          ? L("מהסס", "متردد", "Hesitant")
          : L("נדחה", "مرفوض", "Rejected"),
  }));

  const resistance = Math.round(personas.reduce((s, p) => s + p.friction, 0) / personas.length);
  const audience = filled(input.audience) ? input.audience.trim() : toComplete("en", "audience");
  const price = input.price.trim();
  const rewrite = L(
    [
      `ל${audience}: קודם התוצאה, אחר כך המילים.`,
      "",
      "מה מקבלים בדיוק:",
      "• התוצאה שציינתם — בלי להמציא אחוז.",
      "• מעקב אחרי הביקור, אם זה מה שאתם נותנים.",
      price ? `• מחיר גלוי: ${price} — בלי עמלות שהומצאו.` : `• ${toComplete("he", "מחיר לפני התחייבות")}`,
      "",
      "למה להאמין:",
      hasProof ? "• הוכחה שכתבתם בטקסט — בדקו הסכמה." : `• ${toComplete("he", "הוכחה עם הסכמה")}`,
      "",
      "הצעד היחיד:",
      "שלחו מילה בוואטסאפ — שני מועדים אמיתיים מיומן העבודה.",
    ].join("\n"),
    [
      `لـ${audience}: النتيجة أولاً.`,
      price ? `• السعر معلن: ${price}` : `• ${toComplete("ar", "سعر قبل الالتزام")}`,
      hasProof ? "• إثبات كتبتموه — راجعوا الموافقة." : `• ${toComplete("ar", "إثبات بموافقة")}`,
      "الخطوة: أرسلوا كلمة على واتساب — موعدان حقيقيان من جدولكم.",
    ].join("\n"),
    [
      `For ${audience}: result first, words second.`,
      price ? `• Price stated: ${price} — no invented fees.` : `• ${toComplete("en", "price before any commitment")}`,
      hasProof ? "• Proof you wrote — check consent." : `• ${toComplete("en", "proof with consent")}`,
      "One step: send a word on WhatsApp — two real slots from your hours.",
    ].join("\n"),
  );

  return { personas, resistance, rewrite };
}

/* ------------------------------------------------------------------ fatigue / hijack */

export function computeFatigue(input: { ctr: string; cpcStart: string; cpcNow: string; days: string }) {
  const ctr = parseNumber(input.ctr);
  const cpcStart = parseNumber(input.cpcStart);
  const cpcNow = parseNumber(input.cpcNow);
  const days = parseNumber(input.days);
  if (ctr == null || cpcStart == null || cpcNow == null || days == null) {
    return {
      score: null as number | null,
      state: L(toComplete("he", "CTR + CPC + ימים"), toComplete("ar", "CTR + CPC + أيام"), toComplete("en", "CTR + CPC + days")),
      cpcRise: null as number | null,
    };
  }
  const cpcRise = cpcStart > 0 ? ((cpcNow - cpcStart) / cpcStart) * 100 : 0;
  const ctrPenalty = ctr >= 2 ? 0 : (2 - ctr) * 22;
  const daysPenalty = Math.min(30, Math.max(0, days - 7) * 1.6);
  const score = Math.max(0, Math.min(100, Math.round(ctrPenalty + cpcRise * 0.6 + daysPenalty)));
  const state =
    score < 35 ? L("בטוח", "آمن", "Safe") : score < 65 ? L("אזהרה", "تحذير", "Warning") : L("רוויה קריטית", "تشبع حرج", "Critical saturation");
  return { score, state, cpcRise: Math.round(cpcRise) };
}

export function emergencyCreative(industry: string, score: number | null, locale: Locale) {
  const label = industryLabel(industry, locale);
  return {
    headline: L(
      `עצרו את אותה מודעה — גרסה חדשה ל־${label}`,
      `توقفوا عن الإعلان نفسه — نسخة جديدة لـ${label}`,
      `Stop running the same ad — a new version for ${label}`,
    ),
    angles: [
      {
        name: L("התנגדות ישירה", "الاعتراض المباشر", "Direct objection"),
        hook: L("«ניסינו ולא עזר» — מה עושים אחרת, בלי הבטחת ריפוי.", "«جربنا ولم ينفع» — ماذا نفعل بشكل مختلف، بلا وعد شفاء.", "“We tried and it did not help” — what you do differently, no cure promise."),
        body: L("פרקו את ההתנגדות בשלושה משפטים ואז צעד אחד.", "فكّكوا الاعتراض في ثلاث جمل ثم خطوة واحدة.", "Break the objection in three sentences, then one step."),
      },
      {
        name: L("סיפור מקומי", "قصة محلية", "Local story"),
        hook: L("רק אם יש מקרה עם הסכמה. אחרת סמנו להשלים.", "فقط إن وُجدت حالة بموافقة. وإلا أكملوا.", "Only if you have a consented case. Else mark TO COMPLETE."),
        body: L("לפני / במהלך / אחרי בלי הגזמה.", "قبل / أثناء / بعد بلا مبالغة.", "Before / during / after without exaggeration."),
      },
      {
        name: L("נדירות תפעולית", "ندرة تشغيلية", "Operational scarcity"),
        hook: L("מועדים מוגבלים רק לפי יומן אמיתי — לא «נשארו 2».", "مواعيد محدودة حسب الجدول الحقيقي — لا «بقي 2».", "Limited slots only from a real diary — not “2 left”."),
        body: L("נדירות אמיתית מקיבולת, לא מלאכותית.", "ندرة حقيقية من السعة، لا مصطنعة.", "Real scarcity from capacity, not manufactured."),
      },
    ],
    action:
      score != null && score >= 65
        ? L("עצרו את הקריאייטיב הנוכחי תוך 24ש׳ והריצו 3 זוויות בתקציב שווה ל-4 ימים.", "أوقفوا الإبداع الحالي خلال 24 ساعة وشغّلوا 3 زوايا بميزانية متساوية 4 أيام.", "Pause the current creative within 24h and run 3 angles at equal budget for 4 days.")
        : L("הכינו זוויות עכשיו. אל תחליפו בלי מדדים שהוזנו.", "جهّزوا الزوايا الآن. لا تبدّلوا بلا أرقام مُدخلة.", "Prepare angles now. Do not swap without the metrics you entered."),
  };
}

/** Example signal templates — NOT a live competitor scrape. User must confirm they observed it. */
export const SIGNAL_TEMPLATES = [
  { id: "stock", label: L("ראיתי שהמתחרה ציין חוסר מלאי / תורים", "رأيت أن المنافس ذكر نفاد مخزون / مواعيد", "I saw the competitor mention stock / slot shortage") },
  { id: "price_up", label: L("ראיתי שהמתחרה העלה מחיר (מספר שראיתי)", "رأيت أن المنافس رفع السعر (الرقم الذي رأيته)", "I saw the competitor raise price (the number I saw)") },
  { id: "discount", label: L("ראיתי הנחה אצל המתחרה (אחוז שראיתי)", "رأيت خصماً لدى المنافس (النسبة التي رأيتها)", "I saw a competitor discount (the % I saw)") },
  { id: "slow_reply", label: L("ראיתי תלונות על זמן מענה אצלם", "رأيت شكاوى عن زمن الرد لديهم", "I saw complaints about their reply time") },
  { id: "creative_swap", label: L("ראיתי שהחליפו קריאייטיב אחרי ימים שספרתי", "رأيت أنهم غيّروا الإبداع بعد أيام عددتها", "I saw them swap creative after days I counted") },
  { id: "comments_off", label: L("ראיתי שסגרו תגובות על מודעה", "رأيت أنهم أغلقوا التعليقات على إعلان", "I saw they turned comments off on an ad") },
];

export function hijackFramework(industry: string, signal: string) {
  if (!filled(signal)) {
    return {
      title: L(toComplete("he", "אות שצפיתם"), toComplete("ar", "إشارة شاهدتموها"), toComplete("en", "a signal you observed")),
      signal: "",
      steps: [] as { t: Tri; d: Tri }[],
      ad: L(toComplete("he", "מה ראיתם אצל המתחרה"), toComplete("ar", "ماذا رأيتم لدى المنافس"), toComplete("en", "what you observed at the competitor")),
    };
  }
  return {
    title: L("מסגרת חטיפה — בלי שם המתחרה במודעה", "إطار اقتناص — بلا اسم المنافس في الإعلان", "Hijack framework — no competitor name in the ad"),
    signal,
    steps: [
      {
        t: L("שעה 0–2: המסר הנגדי", "الساعة 0–2: الرسالة المضادة", "Hour 0–2: counter message"),
        d: L("טפלו בפער שציינתם (זמינות / מענה / מחיר גלוי) בלי לנקוב בשמם.", "عالجوا الفجوة التي ذكرتموها (توفّر / رد / سعر معلن) بلا ذكر اسمهم.", "Address the gap you named (availability / reply / stated price) without naming them."),
      },
      {
        t: L("שעה 2–6: טירגוט", "الساعة 2–6: الاستهداف", "Hour 2–6: targeting"),
        d: L("אותו אזור שסיפקתם + מתעניינים בקטגוריה 30 יום. PLAN בלבד.", "نفس المنطقة التي أعطيتموها + المهتمين بالفئة 30 يوماً. خطة فقط.", "The area you supplied + category engagers 30 days. PLAN only."),
      },
      {
        t: L("שעה 6–24: המרה", "الساعة 6–24: التحويل", "Hour 6–24: conversion"),
        d: L("עמוד קצר: הבטחה אחת + הוכחה אחת עם הסכמה + CTA וואטסאפ אחד.", "صفحة قصيرة: وعد واحد + إثبات واحد بموافقة + زر واتساب واحد.", "Short page: one promise + one consented proof + one WhatsApp CTA."),
      },
    ],
    ad: L(
      ["זמינים השבוע — לפי היומן שלכם, לא לפי המצאה.", "", "• מענה בדקות בשעות העבודה שציינתם.", filled(industry) ? `• ${industryLabel(industry, "he")}` : "", "שלחו «פנוי?» בוואטסאפ."].filter(Boolean).join("\n"),
      ["متاحون هذا الأسبوع — حسب جدولكم.", "أرسلوا «متاح؟» على واتساب."].join("\n"),
      ["Available this week — from your diary, not invented.", "Send “available?” on WhatsApp."].join("\n"),
    ),
  };
}

/* ------------------------------------------------------------------ offers */

export function buildOffers(i: { product: string; cost: string; price: string; benefit: string; hmo: boolean }) {
  const p = filled(i.product) ? i.product.trim() : null;
  const b = filled(i.benefit) ? i.benefit.trim() : null;
  const cost = parseNumber(i.cost);
  const price = parseNumber(i.price);
  if (i.hmo) {
    return {
      blocked: true as const,
      note: L(
        "מצב קופת חולים: אסור מחיר והנחה במודעה. התמקדו בזמינות, ניסיון, קרבה, מכשור ומעקב.",
        "وضع صندوق المرضى: ممنوع السعر والخصم في الإعلان. ركّزوا على التوفّر والخبرة والقرب والأجهزة والمتابعة.",
        "HMO mode: no price or discount in ads. Focus on availability, experience, proximity, equipment, and follow-up.",
      ),
      offers: [],
      chart: [],
      margin: null as number | null,
      script: L(toComplete("he", "הצעה שאינה מחיר"), toComplete("ar", "عرض غير سعري"), toComplete("en", "a non-price offer")),
    };
  }
  if (!p || cost == null || price == null) {
    return {
      blocked: false as const,
      note: L(
        `${p ? p : toComplete("he", "שם שירות")} · ${cost == null ? toComplete("he", "עלות יחידה") : cost} · ${price == null ? toComplete("he", "מחיר") : price}`,
        `${p ? p : toComplete("ar", "اسم الخدمة")} · ${cost == null ? toComplete("ar", "تكلفة") : cost} · ${price == null ? toComplete("ar", "سعر") : price}`,
        `${p ? p : toComplete("en", "service name")} · ${cost == null ? toComplete("en", "unit cost") : cost} · ${price == null ? toComplete("en", "price") : price}`,
      ),
      offers: [],
      chart: [],
      margin: null as number | null,
      script: L(toComplete("he", "מוצר + עלות + מחיר"), toComplete("ar", "منتج + تكلفة + سعر"), toComplete("en", "product + cost + price")),
    };
  }
  const product = p;
  const benefit = b ?? toComplete("en", "the result the patient wants");
  const margin = price - cost;
  const offers = [
    {
      key: "risk",
      title: L("שבירת סיכון", "كسر المخاطرة", "Risk reversal"),
      color: "yellow" as const,
      priceMult: 1,
      convMult: 1.35,
      bullets: [
        L(`${product} — אחריות כתובה רק אם יש מדיניות: אם לא מגיעים ל־${benefit} לפי מה שכתבתם.`, `${product} — ضمان مكتوب فقط إن وُجدت سياسة.`, `${product} — written guarantee only if you have a policy: if ${benefit} is not reached as you wrote.`),
        L("תשלום אחרי ביקור ראשון — רק אם זה באמת הנוהל.", "الدفع بعد الجلسة الأولى — فقط إن كان هذا إجراءكم.", "Pay after the first visit — only if that is actually your process."),
        L("תנאי מלאים בעמוד. בלי אותיות קטנות מומצאות.", "شروط كاملة على الصفحة. بلا بنود صغيرة مختلقة.", "Full terms on the page. No invented small print."),
      ],
    },
    {
      key: "aov",
      title: L("העלאת ערך סל", "رفع قيمة السلة", "Raise basket value"),
      color: "red" as const,
      priceMult: 1.45,
      convMult: 1.1,
      bullets: [
        L(`${product} + תוספות דיגיטליות בלי עלות תפעול (מדריך מעקב) — רק אם אתם נותנים.`, `${product} + إضافات رقمية بلا تكلفة تشغيل — إن كنتم تقدّمونها.`, `${product} + digital extras with no operating cost (follow-up guide) — only if you provide them.`),
        L("חבילה משולשת זולה משלוש בודדות — אם זו מדיניות תמחור אמיתית.", "باقة ثلاثية أرخص من ثلاث مفردات — إن كانت سياسة تسعير حقيقية.", "A triple pack cheaper than three singles — if that is a real pricing policy."),
      ],
    },
    {
      key: "fomo",
      title: L("FOMO תפעולי", "فومو تشغيلي", "Operational FOMO"),
      color: "yellow" as const,
      priceMult: 1.15,
      convMult: 1.5,
      bullets: [
        L("מספר תורים מוגבל לפי קיבולת השבוע ביומן — לא «נשארו 2».", "عدد المواعيد محدود بسعة الأسبوع في الجدول — لا «بقي 2».", "Slot count limited by this week’s diary capacity — not “2 left”."),
        L("בונוס עם תאריך סיום שאתם קובעים בכתב.", "بونص بتاريخ انتهاء تكتبونه.", "A bonus with an end date you put in writing."),
      ],
    },
  ].map((o) => {
    const newPrice = Math.round(price * o.priceMult);
    return { ...o, newPrice, newMargin: newPrice - cost, uplift: Math.round((o.convMult - 1) * 100) };
  });
  const chart = [
    { name: L("רווח נוכחי", "الربح الحالي", "Current profit"), value: Math.max(0, margin) },
    ...offers.map((o) => ({ name: o.title, value: Math.max(0, Math.round(o.newMargin * o.convMult)) })),
  ];
  const script = L(
    [`סקריפט מכירה — ${product}`, `1) פתיחה: המטרה ${benefit}.`, `2) מחיר: ${price} ₪ — ממה שסיפקתם.`, "3) אחריות רק אם כתובה.", "4) סגירה: שני מועדים אמיתיים."].join("\n"),
    [`سكربت بيع — ${product}`, `السعر: ${price} ₪ من أرقامكم.`, "موعدان حقيقيان."].join("\n"),
    [`Sales script — ${product}`, `1) Open: the goal is ${benefit}.`, `2) Price: ${price} ₪ — from your numbers.`, "3) Guarantee only if written.", "4) Close: two real slots."].join("\n"),
  );
  return {
    blocked: false as const,
    note: L(
      "מכפילי המרה (+35% / +10% / +50%) הם מכפילי תכנון, לא מדידה. אל תציגו אותם כ-ROAS בפועל.",
      "مضاعفات التحويل تخطيط وليست قياساً. لا تعرضوها كـ ROAS فعلي.",
      "Conversion multipliers (+35% / +10% / +50%) are planning multipliers, not measured. Do not present them as live ROAS.",
    ),
    offers,
    chart,
    margin,
    script,
  };
}

/* ------------------------------------------------------------------ trends */

export const EVENTS = [
  { id: "heat", label: L("גל חום", "موجة حر", "Heat wave") },
  { id: "school", label: L("חזרה לבית הספר", "العودة للمدارس", "Back to school") },
  { id: "match", label: L("משחק גדול", "مباراة حاسمة", "Big match") },
  { id: "endmonth", label: L("סוף החודש", "نهاية الشهر", "End of month") },
  { id: "ramadan", label: L("רמדאן", "رمضان", "Ramadan") },
  { id: "winter", label: L("גל קור ראשון", "أول موجة برد", "First cold snap") },
] as const;

const EVENT_HOOKS: Record<string, Tri[]> = {
  heat: [
    L("בגל החום: תורים אחה״צ ממוזגים — אם אלה השעות שלכם.", "في موجة الحر: مواعيد مسائية مكيّفة — إن كانت هذه ساعاتكم.", "In this heat: air-conditioned afternoon slots — if those are your hours."),
    L("החום דוחה החלטות. צעד אחד בוואטסאפ.", "الحر يؤجّل القرار. خطوة واحدة على واتساب.", "Heat delays decisions. One WhatsApp step."),
  ],
  school: [
    L("לפני תחילת הלימודים: קבעו עכשיו — אם אישרתם שזה רלוונטי.", "قبل الدوام: احجزوا الآن — إن أكّدتم أنه مناسب.", "Before term starts: book now — if you confirmed this is relevant."),
    L("עומס שבוע ראשון — תור ערב מהיומן.", "ازدحام الأسبوع الأول — موعد مسائي من الجدول.", "First-week rush — an evening slot from the diary."),
  ],
  match: [
    L("לפני השריקה: תור קצר וחוזרים למשחק — אם יש משבצת.", "قبل الصافرة: موعد قصير ثم المباراة — إن وُجدت فترة.", "Before kickoff: a short slot, then the match — if a slot exists."),
    L("אחרי המשחק: שעות מאוחרות רק אם אתם באמת פתוחים.", "بعد المباراة: ساعات متأخرة فقط إن كنتم مفتوحين فعلاً.", "After the match: late hours only if you are actually open."),
  ],
  endmonth: [
    L("סוף חודש: תשלום גמיש רק אם זו מדיניות כתובה.", "نهاية الشهر: دفع مرن فقط إن كانت سياسة مكتوبة.", "Month-end: flexible pay only if that is a written policy."),
    L("אל תמציאו «מחיר נעול». כתבו מה שנכון.", "لا تخترعوا «سعراً مثبتاً». اكتبوا ما هو صحيح.", "Do not invent a “locked price”. Write what is true."),
  ],
  ramadan: [
    L("תורים אחרי איפטאר — אם אתם באמת עובדים אז.", "مواعيد بعد الإفطار — إن كنتم تعملون فعلاً حينها.", "Slots after iftar — if you actually work then."),
    L("לוח רמדאן: ערב + וואטסאפ.", "جدول رمضاني: مساء + واتساب.", "Ramadan timetable: evening + WhatsApp."),
  ],
  winter: [
    L("גל קור ראשון: אל תחכו שהעומס יעלה — אם המרפאה מאשרת.", "أول موجة برد: لا تنتظروا ازدحام الجدول — إن أكّدت العيادة.", "First cold snap: do not wait for the diary to fill — if the clinic confirms."),
    L("תורים נוחים, מענה בדקות בשעות העבודה.", "مواعيد مريحة، رد خلال دقائق في ساعات العمل.", "Comfortable slots, replies in minutes during hours."),
  ],
};

export function trendHooks(eventId: string, city: string, industry: string, confirmed: boolean) {
  if (!confirmed || !eventId) {
    return {
      hooks: [] as Tri[],
      note: L(
        "אין הוקים עד שתאשרו אירוע מקומי. לא נוסיף פסטיבל שלא כתבתם.",
        "لا خطافات حتى تؤكّدوا حدثاً محلياً. لن نضيف مهرجاناً لم تكتبوه.",
        "No hooks until you confirm a local event. No festival will be added that you did not type.",
      ),
    };
  }
  const loc = filled(city) ? ` (${city})` : "";
  const hooks = (EVENT_HOOKS[eventId] ?? EVENT_HOOKS.heat).map((h) =>
    L(h.he + loc, h.ar + loc, h.en + loc),
  );
  return {
    hooks,
    note: L(`אירוע שאושר. תחום: ${industryLabel(industry, "he")}.`, `حدث مؤكَّد. المجال: ${industryLabel(industry, "ar")}.`, `Confirmed event. Category: ${industryLabel(industry, "en")}.`),
  };
}

/* ------------------------------------------------------------------ clinic / acquisition */

export const CLINIC_TYPES = [
  { id: "private", label: L("מרפאה פרטית עצמאית", "عيادة خاصة مستقلة", "Independent private clinic") },
  { id: "hmo", label: L("מרפאה עצמאית של קופת חולים", "عيادة مستقلة تابعة لصندوق مرضى", "Independent HMO clinic") },
] as const;

export const HMOS = [
  { id: "clalit", label: L("כללית", "كلاليت", "Clalit"), color: "#0ea5e9" },
  { id: "maccabi", label: L("מכבי", "مكابي", "Maccabi"), color: "#8b5cf6" },
  { id: "meuhedet", label: L("מאוחדת", "مئوحيديت", "Meuhedet"), color: "#10b981" },
  { id: "leumit", label: L("לאומית", "لئوميت", "Leumit"), color: "#f59e0b" },
] as const;

export const ENGINE_SPECIALTIES = [
  { id: "family", label: L("רפואת משפחה", "طب عائلة", "Family medicine") },
  { id: "pediatrics", label: L("ילדים", "طب أطفال", "Pediatrics") },
  { id: "peds_family", label: L("ילדים ומשפחה", "أطفال وعائلة", "Peds + family") },
  { id: "dental", label: L("שיניים", "طب أسنان", "Dental") },
  { id: "derm", label: L("עור ואסתטיקה", "جلدية وتجميل", "Derm + aesthetic") },
  { id: "ortho", label: L("אורתופדיה", "عظام", "Ortho") },
  { id: "aesthetics", label: L("אסתטיקה", "تجميل", "Aesthetics") },
  { id: "physio", label: L("פיזיותרפיה", "علاج طبيعي", "Physio") },
  { id: "urgent", label: L("דחוף / עזרה ראשונה", "طوارئ / عيادة عاجلة", "Urgent care") },
  { id: "other", label: L("אחר", "تخصص آخر", "Other") },
] as const;

export const SECTORS = [
  { id: "medical", label: L("רפואה וטיפול", "طب ورعاية", "Healthcare") },
  { id: "ecom", label: L("מסחר דיגיטלי", "تجارة إلكترونية", "E-commerce") },
  { id: "services", label: L("שירותים מקומיים", "خدمات محلية", "Local services") },
] as const;

export function labelOf<T extends { id: string; label: Tri }>(list: readonly T[], id: string, locale: Locale) {
  return pick(list.find((x) => x.id === id)?.label ?? L(id, id, id), locale);
}

export function acquisitionPlan(p: {
  currentPatients: string;
  targetMonth1: string;
  targetMonth2: string;
  budget: string;
  closeRate: string;
  cpl: string;
}) {
  const current = parseNumber(p.currentPatients);
  const t1 = parseNumber(p.targetMonth1);
  const t2 = parseNumber(p.targetMonth2);
  const budget = parseNumber(p.budget);
  const closeRate = parseNumber(p.closeRate);
  const cpl = parseNumber(p.cpl);
  if (current == null || t1 == null || closeRate == null || cpl == null) {
    return null;
  }
  const gap1 = Math.max(0, t1 - current);
  const gap2 = t2 != null ? Math.max(0, t2 - t1) : 0;
  const leads1 = closeRate > 0 ? Math.ceil(gap1 / (closeRate / 100)) : 0;
  const leads2 = closeRate > 0 ? Math.ceil(gap2 / (closeRate / 100)) : 0;
  const spend1 = leads1 * cpl;
  const spend2 = leads2 * cpl;
  const aggressiveness =
    budget == null
      ? L(toComplete("he", "תקציב חודשי"), toComplete("ar", "ميزانية شهرية"), toComplete("en", "monthly budget"))
      : spend1 <= budget
        ? L("מאוזן", "متوازن", "Balanced")
        : spend1 <= budget * 1.5
          ? L("התקפי", "هجومي", "Aggressive")
          : L("התקפי מאוד — התקציב קטן מהיעד", "هجومي جداً — الميزانية أقل من الهدف", "Very aggressive — budget below the target");
  return {
    gap1,
    gap2,
    leads1,
    leads2,
    spend1,
    spend2,
    dailySpend1: Math.round((spend1 / 30) * 10) / 10,
    aggressiveness,
    budgetGap: budget == null ? null : Math.max(0, Math.round(spend1 - budget)),
    weeklyAds: Math.max(3, Math.ceil(leads1 / 25)),
  };
}

export function buildImagePrompt(kind: string, opts: { specialty: string; city: string; subject: string }) {
  const spec = labelOf(ENGINE_SPECIALTIES, opts.specialty, "en");
  const subject = filled(opts.subject) ? opts.subject : spec;
  const city = filled(opts.city) ? opts.city : toComplete("en", "city");
  const base =
    "photorealistic, 8k, natural warm lighting, shallow depth of field, Middle Eastern / Arab and Jewish Israeli subjects, culturally respectful, modest clothing, clean medical environment, no text, no logos, no watermark, no invented device brands";
  if (kind === "pain") {
    return `Editorial photo of a worried parent holding a child late at night at home, dim warm lamp light, emotional but hopeful, ${subject} context, ${base} --ar 4:5 --style raw`;
  }
  if (kind === "transformation") {
    return `Split-scene photo: left, tired worried family in a dim room; right, the same family relaxed in a bright modern ${subject} clinic in ${city}, consistent subjects and wardrobe, consented look (not a fake before/after medical claim), ${base} --ar 1:1 --style raw`;
  }
  return `Studio hero portrait of a confident doctor in a modern ${subject} clinic, soft key light with amber rim light, deep dark background, premium medical brand look, ${base} --ar 3:2 --style raw`;
}

/* ------------------------------------------------------------------ compliance */

export const RISK_TERMS: { term: string; locale: Locale }[] = [
  { term: "ריפוי", locale: "he" },
  { term: "מובטח", locale: "he" },
  { term: "100%", locale: "he" },
  { term: "בלי כאב לגמרי", locale: "he" },
  { term: "הרופא הטוב ביותר", locale: "he" },
  { term: "הראשון ב", locale: "he" },
  { term: "להיפטר מהמחלה", locale: "he" },
  { term: "האם אתם סובלים", locale: "he" },
  { term: "אלפי מטופלים", locale: "he" },
  { term: "شفاء", locale: "ar" },
  { term: "علاج نهائي", locale: "ar" },
  { term: "مضمون", locale: "ar" },
  { term: "100%", locale: "ar" },
  { term: "بدون ألم نهائياً", locale: "ar" },
  { term: "أفضل طبيب", locale: "ar" },
  { term: "الأول في", locale: "ar" },
  { term: "تخلص من مرضك", locale: "ar" },
  { term: "هل تعاني من", locale: "ar" },
  { term: "آلاف المرضى", locale: "ar" },
  { term: "cure", locale: "en" },
  { term: "guaranteed", locale: "en" },
  { term: "100%", locale: "en" },
  { term: "pain-free forever", locale: "en" },
  { term: "best doctor", locale: "en" },
  { term: "#1 in", locale: "en" },
  { term: "eliminate your disease", locale: "en" },
  { term: "are you suffering", locale: "en" },
  { term: "thousands of patients", locale: "en" },
];

export function scanCompliance(copy: string) {
  if (!filled(copy)) {
    return { flags: [] as string[], score: null as number | null };
  }
  const flags = [...new Set(RISK_TERMS.filter((t) => copy.toLowerCase().includes(t.term.toLowerCase())).map((t) => t.term))];
  const score = Math.max(0, 100 - flags.length * 18);
  return { flags, score };
}

/* ------------------------------------------------------------------ noshow / reviews / roas */

export function noShowRate(bookings: string, noShows: string) {
  const b = parseNumber(bookings);
  const n = parseNumber(noShows);
  if (b == null || n == null || b <= 0) return null;
  return Math.round((n / b) * 100);
}

export function reviewTarget(count: string, monthly: string) {
  const c = parseNumber(count);
  const m = parseNumber(monthly);
  if (c == null || m == null) return null;
  return { target: Math.max(0, Math.ceil(c * 0.3)), monthly: m, count: c };
}

export function roasScenarios(i: {
  budget: string;
  cpm: string;
  ctr: string;
  lpRate: string;
  closeRate: string;
  value: string;
}) {
  const budget = parseNumber(i.budget);
  const cpm = parseNumber(i.cpm);
  const ctr = parseNumber(i.ctr);
  const lpRate = parseNumber(i.lpRate);
  const closeRate = parseNumber(i.closeRate);
  const value = parseNumber(i.value);
  if (budget == null || cpm == null || ctr == null || lpRate == null || closeRate == null || value == null) {
    return null;
  }
  const calc = (f: number) => {
    const impressions = cpm > 0 ? (budget / cpm) * 1000 : 0;
    const clicks = impressions * ((ctr * f) / 100);
    const leads = clicks * ((lpRate * f) / 100);
    const customers = leads * ((closeRate * f) / 100);
    const revenue = customers * value;
    return {
      impressions: Math.round(impressions),
      clicks: Math.round(clicks),
      leads: Math.round(leads),
      customers: Math.round(customers),
      cpl: leads > 0 ? Math.round((budget / leads) * 10) / 10 : 0,
      revenue: Math.round(revenue),
      roas: budget > 0 ? Math.round((revenue / budget) * 100) / 100 : 0,
    };
  };
  return {
    conservative: calc(0.7),
    realistic: calc(1),
    optimistic: calc(1.3),
    note: L(
      "תרחישים מ־CPM/CTR/המרה/סגירה/ערך שסיפקתם. לא תחזית שוק ולא 4.2x ברירת מחדל.",
      "سيناريوهات من CPM/CTR/التحويل/الإغلاق/القيمة التي أعطيتموها. ليست توقّعاً سوقياً ولا 4.2x افتراضياً.",
      "Scenarios from the CPM/CTR/conversion/close/value you typed. Not a market forecast and not a default 4.2x.",
    ),
  };
}

/* ------------------------------------------------------------------ dual / voice / templates */

export const MIXES = [
  { id: "ar_major", label: L("רוב ערבי", "أغلبية عربية", "Arab majority") },
  { id: "balanced", label: L("קהל מעורב מאוזן", "جمهور مختلط متوازن", "Balanced mixed audience") },
  { id: "he_major", label: L("רוב עברי", "أغلبية عبرية", "Hebrew majority") },
];

export const PLATFORMS = [
  { id: "meta", label: L("Meta (פייסבוק/אינסטגרם)", "Meta (فيسبوك/إنستغرام)", "Meta (Facebook/Instagram)") },
  { id: "google", label: L("Google חיפוש", "بحث Google", "Google Search") },
  { id: "tiktok", label: L("TikTok", "TikTok", "TikTok") },
];

export function dualAds(core: string, mix: string, platform: string, region: string) {
  if (!filled(core)) {
    return {
      he: toComplete("he", "מסר ליבה"),
      ar: toComplete("ar", "الرسالة الأساسية"),
      en: toComplete("en", "core message"),
    };
  }
  const place = filled(region) ? region.trim() : toComplete("en", "area");
  const plat = PLATFORMS.find((p) => p.id === platform);
  return {
    he: [
      mix === "he_major" ? "קצר ולעניין — זמן ונוחות." : "משפחה, זמינות, בלי הבטחת ריפוי.",
      core.trim(),
      `${place}${plat ? ` · ${plat.label.he}` : ""}`,
      "קבעו תור בוואטסאפ — שני מועדים אמיתיים מיומן.",
    ].join("\n"),
    ar: [
      mix === "ar_major" ? "لهجة محكية، نداء عائلي، جمل قصيرة." : "وضوح عملي بلا وعد شفاء.",
      core.trim(),
      `${place}${plat ? ` · ${plat.label.ar}` : ""}`,
      "احجزوا على واتساب — موعدان حقيقيان من الجدول.",
    ].join("\n"),
    en: [
      "Clear, no cure claim, one next step.",
      core.trim(),
      `${place}${plat ? ` · ${plat.label.en}` : ""}`,
      "Book on WhatsApp — two real slots from the diary.",
    ].join("\n"),
  };
}

export function voiceCampaign(transcript: string, channel: string) {
  if (!filled(transcript)) {
    return L(toComplete("he", "רעיון קולי או טקסט"), toComplete("ar", "فكرة صوتية أو نص"), toComplete("en", "a voice note or typed idea"));
  }
  const ch =
    channel === "google"
      ? L("גוגל + שיחות", "Google + مكالمات", "Google + calls")
      : channel === "meta"
        ? L("Meta + וואטסאפ", "Meta + واتساب", "Meta + WhatsApp")
        : L("כל הערוצים (תוכנית)", "كل القنوات (خطة)", "All channels (plan)");
  return L(
    [`רעיון שסופק:`, transcript.trim(), "", `ערוץ: ${ch.he}`, "זוויות: כאב / זמינות / אמון — בלי מספרים שלא הוזנו.", "CTA: וואטסאפ. מדיה PLAN בלבד."].join("\n"),
    [`الفكرة المعطاة:`, transcript.trim(), "", `القناة: ${ch.ar}`, "CTA: واتساب. الميديا خطة فقط."].join("\n"),
    [`Idea as typed:`, transcript.trim(), "", `Channel: ${ch.en}`, "Angles: pain / availability / trust — no numbers you did not type.", "CTA: WhatsApp. Media PLAN only."].join("\n"),
  );
}

export type AdTemplate = {
  id: string;
  name: Tri;
  sector: string;
  objective: string;
  ratio: string;
  layout: Tri;
  headline: Tri;
  body: Tri;
  cta: Tri;
  visual: Tri;
};

export const AD_TEMPLATES: AdTemplate[] = [
  {
    id: "med-avail-01",
    name: L("תור היום — בלי המתנה מדומה", "موعد اليوم — بلا انتظار مختلق", "Today’s slot — no fake wait"),
    sector: "medical",
    objective: "patients",
    ratio: "4:5",
    layout: L("רופא + פס תחתון + תג קופה", "طبيب + شريط سفلي + شارة الصندوق", "Doctor + lower bar + HMO badge"),
    headline: L("תור לילד היום — אם יש משבצת ביומן", "موعد لطفلك اليوم — إن وُجدت فترة في الجدول", "A slot for your child today — if the diary has one"),
    body: L("מרפאת ילדים ומשפחה. שעות רק מהפרופיל שמילאתם.", "عيادة أطفال وعائلة. الساعات من الملف الذي ملأتموه فقط.", "Peds + family clinic. Hours only from the profile you filled."),
    cta: L("קבעו תור", "احجزوا موعداً", "Book a slot"),
    visual: L("רופא במרפאה מודרנית, תאורה חמה, בלי מכשיר ממותג שלא הוזן", "طبيب في عيادة حديثة بلا جهاز ماركة غير مُدخل", "Doctor in a modern clinic, no branded device you did not name"),
  },
  {
    id: "med-trust-02",
    name: L("אמון הורים — ציטוט אמיתי", "ثقة الأهل — اقتباس حقيقي", "Parent trust — real quote"),
    sector: "medical",
    objective: "patients",
    ratio: "1:1",
    layout: L("ציטוט גדול + תמונה עגולה + כוכבים רק ממדידה", "اقتباس كبير + صورة دائرية + نجوم من القياس فقط", "Large quote + round photo + stars only from a measured rating"),
    headline: L("«בפעם הראשונה הרגשנו ששומעים אותנו» — רק עם הסכמה", "«أول مرة حسّينا إنه في طبيب بسمعنا» — بموافقة فقط", "“First time we felt heard” — only with consent"),
    body: L("ביקורת אמיתית. בלי המצאת 5 כוכבים.", "مراجعة حقيقية. بلا اختراع 5 نجوم.", "A real review. Do not invent 5 stars."),
    cta: L("קראו ביקורות קיימות", "اقرأوا المراجعات الموجودة", "Read existing reviews"),
    visual: L("רקע כהה עם זוהר צהוב", "خلفية داكنة بتوهج أصفر", "Dark background with yellow glow"),
  },
  {
    id: "med-prox-03",
    name: L("קרוב אליכם — מפה", "قريب منكم — خريطة", "Near you — map"),
    sector: "medical",
    objective: "patients",
    ratio: "9:16",
    layout: L("מפה + סיכה + שעות", "خريطة + دبوس + ساعات", "Map + pin + hours"),
    headline: L("דקות מהבית — כתובת שסיפקתם", "دقائق عن البيت — العنوان الذي أعطيتموه", "Minutes from home — the address you supplied"),
    body: L("בלי להמציא חניה אם לא כתבתם.", "بلا اختراع موقف إن لم تكتبوه.", "Do not invent parking if you did not write it."),
    cta: L("נווטו למרפאה", "خذوني للعيادة", "Navigate to the clinic"),
    visual: L("מפה לילית עם סיכה צהובה", "خريطة ليلية بدبوس أصفر", "Night map with a yellow pin"),
  },
  {
    id: "med-equip-04",
    name: L("מכשור — רק אם הוזן", "أجهزة — فقط إن أُدخلت", "Equipment — only if entered"),
    sector: "medical",
    objective: "patients",
    ratio: "4:5",
    layout: L("תמונת מכשיר + 3 נקודות", "صورة جهاز + 3 نقاط", "Device photo + 3 points"),
    headline: L("בדיקה מדויקת יותר — אם יש מכשיר שציינתם", "فحص أدق — إن وُجد جهاز ذكرتموه", "A more precise exam — if you named a device"),
    body: L("אל תמציאו שם דגם.", "لا تخترعوا اسم طراز.", "Do not invent a model name."),
    cta: L("קבעו בדיקה", "احجزوا فحصاً", "Book an exam"),
    visual: L("מכשיר בסטודיו בלי לוגו מותג שלא אושר", "جهاز استوديو بلا شعار ماركة غير معتمد", "Studio device, no unapproved brand logo"),
  },
  {
    id: "med-recall-05",
    name: L("תזכורת מעקב", "تذكير متابعة", "Follow-up reminder"),
    sector: "medical",
    objective: "retention",
    ratio: "1:1",
    layout: L("כרטיס וואטסאפ מוגדל", "بطاقة واتساب مكبّرة", "Enlarged WhatsApp card"),
    headline: L("עבר חודש מהביקור האחרון — אם זה נכון ביומן", "مرّ شهر على آخر زيارة — إن كان هذا صحيحاً في الجدول", "A month since the last visit — if that is true in the diary"),
    body: L("תזכורת עדינה. wa.me תוכנית, לא שליחה חיה.", "تذكير لطيف. خطة wa.me لا إرسال حي.", "A gentle reminder. wa.me plan, not a live send."),
    cta: L("קבעו מעקב", "ثبّتوا المتابعة", "Book a follow-up"),
    visual: L("ממשק שיחה כהה", "واجهة محادثة داكنة", "Dark chat UI"),
  },
  {
    id: "ecom-flash-01",
    name: L("פלאש 48ש׳ — רק אם אמת", "فلاش 48 ساعة — فقط إن صدق", "48h flash — only if true"),
    sector: "ecom",
    objective: "flash",
    ratio: "1:1",
    layout: L("מוצר + טיימר + מחיר", "منتج + عدّاد + سعر", "Product + timer + price"),
    headline: L("48 שעות — אם זה באמת נגמר אז", "٤٨ ساعة — إن كان ينتهي فعلاً حينها", "48 hours — if it actually ends then"),
    body: L("מלאי אמיתי. בלי שעון מזויף.", "مخزون حقيقي. بلا عدّاد مزيف.", "Real stock. No fake countdown."),
    cta: L("הזמינו לפני שנגמר", "اطلبوا قبل ما يخلص", "Order before it is gone"),
    visual: L("מוצר על רקע כהה", "منتج على خلفية داكنة", "Product on a dark ground"),
  },
  {
    id: "svc-lead-01",
    name: L("שיחת היכרות", "مكالمة تعارف", "Intro call"),
    sector: "services",
    objective: "leads",
    ratio: "4:5",
    layout: L("פורטרט + 3 תוצאות", "بورتريه + 3 نتائج", "Portrait + 3 outcomes"),
    headline: L("לפני שחותמים — דברו איתנו", "قبل ما توقّعوا — احكوا معنا", "Before you sign — talk to us"),
    body: L("שיחה ראשונה בלי התחייבות — אם זה מה שאתם נותנים. לא ייעוץ חינם כברירת מחדל רפואית.", "مكالمة أولى بلا التزام — إن كنتم تقدّمونها. ليست استشارة مجانية افتراضية طبية.", "A first call with no commitment — if that is what you give. Not a default medical free consult."),
    cta: L("קבעו שיחה", "احجزوا مكالمة", "Book a call"),
    visual: L("פורטרט מקצועי כהה", "بورتريه مهني داكن", "Dark professional portrait"),
  },
];

export const TEMPLATE_OBJECTIVES = [
  { id: "patients", label: L("גידול מטופלים", "نمو المرضى", "Patient growth") },
  { id: "flash", label: L("מבצע קצר (מסחר)", "تخفيضات (تجارة)", "Short sale (commerce)") },
  { id: "leads", label: L("לידים יקרי ערך", "عملاء عاليو القيمة", "High-value leads") },
  { id: "retention", label: L("שימור", "ولاء واسترجاع", "Retention") },
];

export function socialProofCaption(review: string, author: string, stars: number) {
  if (!filled(review)) {
    return L(toComplete("he", "ציטוט ביקורת עם הסכמה"), toComplete("ar", "اقتباس مراجعة بموافقة"), toComplete("en", "a consented review quote"));
  }
  const s = "★".repeat(Math.max(1, Math.min(5, Math.round(stars || 0))));
  const who = filled(author) ? author : toComplete("en", "reviewer name");
  return L(`${s}\n«${review.trim()}»\n— ${who}`, `${s}\n«${review.trim()}»\n— ${who}`, `${s}\n“${review.trim()}”\n— ${who}`);
}

export const OPTI_MODULES = [
  { id: "audit", label: L("אבחון 360°", "التشخيص 360°", "360° audit") },
  { id: "clinic", label: L("פרופיל מרפאה ויעדים", "ملف العيادة والأهداف", "Clinic file & targets") },
  { id: "simulator", label: L("סימולטור קונה", "محاكي المشتري", "Buyer simulator") },
  { id: "hijacker", label: L("חטיפת פער מתחרה", "اقتناص فجوة المنافس", "Competitor-gap hijack") },
  { id: "radar", label: L("מכ״ם רוויה", "رادار التشبع", "Saturation radar") },
  { id: "offers", label: L("מעבדת הצעות", "مختبر العروض", "Offer lab") },
  { id: "trends", label: L("טרנדים מקומיים", "ترندات محلية", "Local trends") },
  { id: "noshow", label: L("אי-הגעה", "التغيب", "No-shows") },
  { id: "compliance", label: L("מגן מדיניות", "درع السياسات", "Policy shield") },
  { id: "reviews", label: L("הנדסת ביקורות", "هندسة المراجعات", "Review engine") },
  { id: "roas", label: L("תרחיש תשואה", "سيناريو العائد", "Return scenario") },
  { id: "voice", label: L("קול לקמפיין", "الصوت إلى حملة", "Voice to campaign") },
  { id: "dual", label: L("עברית / ערבית / אנגלית", "عبري / عربي / إنجليزي", "HE / AR / EN ads") },
  { id: "studio", label: L("סטודיו ויזואלי", "استوديو بصري", "Visual studio") },
  { id: "templates", label: L("מחסן תבניות", "مستودع القوالب", "Template warehouse") },
  { id: "iceberg", label: L("קרחון ביקוש", "جبل الجليد", "Demand iceberg") },
  { id: "vector", label: L("וקטור מסר", "متجه الرسالة", "Message vector") },
  { id: "recovery", label: L("השבת לידים", "استرداد العملاء", "Lead recovery") },
] as const;

export type OptiModuleId = (typeof OPTI_MODULES)[number]["id"];
