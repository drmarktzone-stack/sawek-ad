import type { Locale } from "./types";
import { CONTACT_EMAIL } from "./site";

export type LegalBlock = {
  h: Record<Locale, string>;
  p: Record<Locale, string>[];
};

export type LegalDoc = {
  title: Record<Locale, string>;
  lead: Record<Locale, string>;
  updated: Record<Locale, string>;
  sections: LegalBlock[];
};

const UPDATED: Record<Locale, string> = {
  he: "עודכן לאחרונה: 6 בספטמבר 2026",
  ar: "آخر تحديث: 6 أيلول 2026",
  en: "Last updated: 6 September 2026",
};

export const PRIVACY: LegalDoc = {
  title: {
    he: "מדיניות פרטיות",
    ar: "سياسة الخصوصية",
    en: "Privacy policy",
  },
  lead: {
    he: "SAWEK AD הוא כלי SaaS לעסקים מקומיים בישראל. המדיניות הזו מתארת מה באמת נאסף — בלי תו תקן מומצא ובלי הבטחות שלא בדקנו.",
    ar: "SAWEK AD أداة SaaS لمحلات وأعمال محلية في إسرائيل. هالسياسة بتوصف شو بينجمع فعلاً — بلا شهادة مختلقة وبلا وعود ما تفقدناها.",
    en: "SAWEK AD is a SaaS tool for local businesses in Israel. This policy describes what is actually collected — no invented certifications and no promises we have not checked.",
  },
  updated: UPDATED,
  sections: [
    {
      h: { he: "מי מפעיל את השירות", ar: "مين يشغّل الخدمة", en: "Who operates the service" },
      p: [
        {
          he: `המפעיל הוא בעל המוצר SAWEK AD. לפניות פרטיות, מחיקה או שאלות: ${CONTACT_EMAIL}. אין כאן מספר חברה או כתובת משרד שלא פרסמנו.`,
          ar: `المشغّل هو صاحب منتج SAWEK AD. للخصوصية أو الحذف أو الأسئلة: ${CONTACT_EMAIL}. ما في رقم شركة أو عنوان مكتب ما نشرناه.`,
          en: `The operator is the owner of the SAWEK AD product. For privacy, deletion, or questions: ${CONTACT_EMAIL}. We do not list a company number or office address that we have not published.`,
        },
      ],
    },
    {
      h: { he: "איזה מידע נאסף", ar: "أي معلومات بتنجمع", en: "What we collect" },
      p: [
        {
          he: "חשבון (אם נרשמתם): כתובת אימייל, וסיסמה שמעובדת אצל ספק האימות — לא נשמרת אצלנו בטקסט גלוי. עוגיות סשן נשמרות בדפדפן כדי להישאר מחוברים.",
          ar: "الحساب (إذا تسجّلتوا): إيميل، وكلمة سر بتتعالج عند مزوّد التوثيق — مش محفوظة عنا كنص ظاهر. كوكيز الجلسة بتنحفظ بالمتصفح حتى تضلوا داخلين.",
          en: "Account (if you sign up): email address, and a password handled by the auth provider — not stored by us in plain text. Session cookies stay in the browser so you remain signed in.",
        },
        {
          he: "קלט קמפיין: שם העסק, תיאור, מיקום, אתר, וואטסאפ, קהל, בעיה, יתרון, מטרה, מבצע, שעות, מתחרים שכתבתם, וראיון CMO (מודל, תקציב, מרווח, CAC יעד, מודעות קודמות) — רק מה שהזנתם.",
          ar: "مدخلات الحملة: اسم الشغل، وصف، موقع، موقع إلكتروني، واتساب، جمهور، مشكلة، ميزة، هدف، عرض، ساعات، منافسين كتبتوهم، ومقابلة CMO (نموذج، ميزانية، هامش، CAC مستهدف، إعلانات سابقة) — بس اللي عبّيتوه.",
          en: "Campaign inputs: business name, description, location, website, WhatsApp, audience, problem, advantage, goal, offer, hours, competitors you typed, and the CMO interview (model, budget, margin, target CAC, past ads) — only what you entered.",
        },
        {
          he: "קבצים שהעליתם: תמונות, סרטונים ומסמכים לסריקה או למוקאפים. ברירת המחדל היא שמירה במכשיר (localStorage / אחסון מקומי), לא ב-CDN ציבורי.",
          ar: "الملفات اللي رفعتوها: صور وفيديو ومستندات للمسح أو النماذج. الافتراضي حفظ عالجهاز (localStorage / تخزين محلي)، مش على CDN عام.",
          en: "Uploaded assets: photos, videos, and documents for scan or mockups. Default storage is on this device (localStorage / local storage), not a public CDN.",
        },
        {
          he: "סריקת אתר: אם מדביקים קישור, השרת שלנו מביא את הדף הציבורי (שם, אודות, טלפון, שעות, תמונות ופוסטים גלויים) ומציג לאישור. לא נשלפים לייקים, דירוגים או מחירים שלא כתובים בדף.",
          ar: "مسح الموقع: إذا لزّقتوا رابط، السيرفر بجيب الصفحة العامة (اسم، عن، هاتف، ساعات، صور ومنشورات ظاهرة) وبعرضها للتأكيد. ما بينسحب لايكات أو تقييمات أو أسعار مش مكتوبة بالصفحة.",
          en: "Site scan: if you paste a URL, our server fetches the public page (name, about, phone, hours, visible photos and posts) and shows it for your review. We do not pull likes, ratings, or prices that are not on the page.",
        },
        {
          he: "חיבור רשתות (אופציונלי): אם מחברים פייסבוק / אינסטגרם / לינקדאין, נשמרים אסימוני גישה כדי לפרסם לפי בחירתכם. אין כאן אנליטיקס חיה מ-Meta.",
          ar: "ربط الشبكات (اختياري): إذا ربطتوا فيسبوك / إنستغرام / لينكدإن، بتنحفظ توكنات وصول حتى تنشروا باختياركم. ما في تحليلات حيّة من Meta هون.",
          en: "Social connect (optional): if you connect Facebook / Instagram / LinkedIn, access tokens are stored so you can publish when you choose. There is no live Meta analytics here.",
        },
      ],
    },
    {
      h: { he: "למה משתמשים במידע", ar: "ليش منستخدم المعلومات", en: "How we use it" },
      p: [
        {
          he: "כדי לבנות חבילת קמפיין, לשמור טיוטות, לסנכרן חשבון אם חיברתם ענן, להפעיל יצירת טקסט/תמונה/תרגום שביקשתם, ולשייך מנוי Pro אם תשלום מחובר. לא ממציאים ROAS, לייקים או תחזית לידים.",
          ar: "حتى نبني حزمة حملة، نحفظ مسودات، نزامن الحساب إذا ربطتوا سحابة، نشغّل توليد نص/صورة/ترجمة طلبتوها، ونربط اشتراك Pro إذا الدفع موصول. ما منخترع ROAS أو لايكات أو توقع عملاء.",
          en: "To build a campaign pack, save drafts, sync an account if you connected cloud storage, run the text/image/translation you asked for, and attach a Pro plan when payments are connected. We do not invent ROAS, likes, or lead forecasts.",
        },
      ],
    },
    {
      h: { he: "מעבדים חיצוניים", ar: "المعالجون الخارجيون", en: "Processors" },
      p: [
        {
          he: "Google Cloud / Vertex AI (Gemini, Imagen, Cloud Translation): כשמפעילים יצירה, תרגום, ראייה או תמונות — הטקסט או התמונה ששלחתם לעיבוד עוברים ל-Google כדי להחזיר תוצאה. זה לא פרסום לרשת ולא מדד Meta חי.",
          ar: "Google Cloud / Vertex AI (Gemini، Imagen، Cloud Translation): لما تشغّلوا توليد أو ترجمة أو رؤية أو صور — النص أو الصورة اللي بعثتوها للمعالجة بتروح لـGoogle حتى ترجع نتيجة. هاد مش نشر على الشبكة ولا مقياس Meta حيّ.",
          en: "Google Cloud / Vertex AI (Gemini, Imagen, Cloud Translation): when you run generate, translate, vision, or images — the text or image you submitted for processing goes to Google so a result can come back. That is not publishing to an ad network and not a live Meta metric.",
        },
        {
          he: "Supabase: אם הוגדרו מפתחות, משמש לאימות (אימייל) ולסנכרון קמפיינים אופציונלי. בלי מפתחות האפליקציה רצה על localStorage בלבד.",
          ar: "Supabase: إذا المفاتيح مضبوطة، بيستخدم للتوثيق (إيميل) ومزامنة حملات اختيارية. بلا مفاتيح التطبيق بيشتغل على localStorage بس.",
          en: "Supabase: if keys are configured, it is used for auth (email) and optional campaign sync. With no keys the app runs on localStorage only.",
        },
        {
          he: "Stripe / PayPal / העברה בנקאית: רק אם התשלום מחובר. Stripe מקבל אימייל ונתוני תשלום כדי לחייב מנוי Pro. אין חיוב מדומה לפני החיבור.",
          ar: "Stripe / PayPal / حوالة بنكية: فقط إذا الدفع موصول. Stripe بياخد الإيميل وبيانات الدفع حتى يحاسب اشتراك Pro. ما في خصم وهمي قبل الربط.",
          en: "Stripe / PayPal / bank transfer: only if payments are connected. Stripe receives email and payment data to charge a Pro subscription. There is no fake charge before that connection.",
        },
        {
          he: "אנליטיקס או ניטור שגיאות: נטענים רק אם הוגדר מזהה בסביבה (למשל Google Analytics או Plausible, או DSN של Sentry). בלי מזהה — לא נשלח מעקב.",
          ar: "تحليلات أو مراقبة أخطاء: بتنتحميل فقط إذا في معرّف بالبيئة (مثلاً Google Analytics أو Plausible، أو DSN لـ Sentry). بلا معرّف — ما بينبعت تتبّع.",
          en: "Analytics or error monitoring: loaded only if an ID is set in the environment (for example Google Analytics or Plausible, or a Sentry DSN). With no ID, no tracking is sent.",
        },
      ],
    },
    {
      h: { he: "שמירה ושיתוף", ar: "الحفظ والمشاركة", en: "Retention and sharing" },
      p: [
        {
          he: "ברירת המחדל: הטיוטות נשארות בדפדפן שלכם. אפשר למחוק טיוטה, להתנתק, או לפנות אלינו למחיקת חשבון. אין מכירת רשימות תפוצה.",
          ar: "الافتراضي: المسودات بتضل بمتصفحكم. فيكن تمسحوا مسودة، تطلعوا، أو تراسلونا لحذف الحساب. ما في بيع قوائم بريد.",
          en: "Default: drafts stay in your browser. You can delete a draft, sign out, or email us to delete an account. We do not sell mailing lists.",
        },
        {
          he: "לא נשתף מידע אישי למפרסמים חיצוניים לצורך מודעות עליכם. מעבדים מקבלים רק מה שנחוץ להפעלת השירות שביקשתם.",
          ar: "ما منشارك معلومات شخصية لمعلنين خارجيين حتى يعلنوا عليكم. المعالجون بياخدوا بس اللي لازم لتشغيل الخدمة اللي طلبتوها.",
          en: "We do not share personal data with outside advertisers so they can advertise to you. Processors receive only what is needed to run the feature you asked for.",
        },
      ],
    },
    {
      h: { he: "זכויות וחוק ישראלי", ar: "حقوق والقانون الإسرائيلي", en: "Rights and Israeli law" },
      p: [
        {
          he: `השירות מיועד בעיקר לעסקים בישראל. לפי חוק הגנת הפרטיות, התשמ״א-1981, אפשר לבקש עיון, תיקון או מחיקה של מידע אישי ששמרנו בחשבון — באימייל ${CONTACT_EMAIL}. אין כאן טענה שיש לנו מאגר רשום או ממונה הגנת פרטיות ייעודי.`,
          ar: `الخدمة موجّهة أساسًا لأعمال في إسرائيل. حسب قانون حماية الخصوصية، ١٩٨١، فيكن تطلبوا اطلاع أو تصحيح أو حذف لمعلومات شخصية حفظناها بالحساب — على ${CONTACT_EMAIL}. ما منقول إن عنا سجل قواعد بيانات أو مسؤول خصوصية معيّن.`,
          en: `The service is aimed mainly at businesses in Israel. Under the Privacy Protection Law, 5741-1981, you can ask to access, correct, or delete personal data we stored on an account — email ${CONTACT_EMAIL}. We do not claim a registered database or a dedicated privacy officer.`,
        },
        {
          he: "Google Cloud ו-Supabase עשויים לעבד מידע מחוץ לישראל. אם אינכם מסכימים לזה, אל תפעילו יצירת AI ואל תירשמו עם סנכרון ענן.",
          ar: "Google Cloud وSupabase ممكن يعالجوا معلومات برا إسرائيل. إذا مش موافقين، لا تشغّلوا توليد AI ولا تسجّلوا مع مزامنة سحابة.",
          en: "Google Cloud and Supabase may process data outside Israel. If you do not agree, do not run AI generation and do not sign up with cloud sync.",
        },
      ],
    },
    {
      h: { he: "ילדים", ar: "الأطفال", en: "Children" },
      p: [
        {
          he: "השירות מיועד לבעלי עסקים ומשווקים, לא לילדים. אין לנו צורך באיסוף מכוון של מידע ממי שמתחת לגיל 18.",
          ar: "الخدمة لأصحاب شغل ومسوّقين، مش لأطفال. ما عنا حاجة لجمع مقصود لمعلومات من تحت ١٨ سنة.",
          en: "The service is for business owners and marketers, not children. We do not need to collect information from anyone under 18 on purpose.",
        },
      ],
    },
    {
      h: { he: "שינויים", ar: "تغييرات", en: "Changes" },
      p: [
        {
          he: "אם המדיניות תשתנה, נעדכן את התאריך בראש העמוד. שימוש המשך אחרי העדכון פירושו שקראתם את הנוסח החדש.",
          ar: "إذا تغيّرت السياسة، منحدّث التاريخ فوق الصفحة. الاستمرار بعد التحديث يعني إنكم قريتوا النص الجديد.",
          en: "If this policy changes, we will update the date at the top of the page. Continued use after that update means you have read the new text.",
        },
      ],
    },
  ],
};

export const TERMS: LegalDoc = {
  title: {
    he: "תנאי שימוש",
    ar: "شروط الاستخدام",
    en: "Terms of use",
  },
  lead: {
    he: "תנאים לשימוש ב-SAWEK AD ככלי עבודה — לא כהבטחת מכירות, ויראליות או ROAS.",
    ar: "شروط استخدام SAWEK AD كأداة شغل — مش كضمان مبيعات أو انتشار أو ROAS.",
    en: "Terms for using SAWEK AD as a work tool — not as a promise of sales, virality, or ROAS.",
  },
  updated: UPDATED,
  sections: [
    {
      h: { he: "ההסכם", ar: "الاتفاق", en: "The agreement" },
      p: [
        {
          he: `השימוש באתר ובאפליקציית הווב מהווה הסכמה לתנאים האלה. שאלות: ${CONTACT_EMAIL}.`,
          ar: `استخدام الموقع وتطبيق الويب يعني الموافقة على هالشروط. أسئلة: ${CONTACT_EMAIL}.`,
          en: `Using the site and the web app means you agree to these terms. Questions: ${CONTACT_EMAIL}.`,
        },
      ],
    },
    {
      h: { he: "מה השירות", ar: "شو الخدمة", en: "What the service is" },
      p: [
        {
          he: "SAWEK AD בונה חבילת קמפיין (קופי, רעיונות CMO, מוקאפים, תוכנית מדיה) מעובדות שפרסמתם או שהזנתם. מדיה היא PLAN בלבד — האפליקציה לא קונה מודעות ב-Meta / Google / TikTok בשמכם.",
          ar: "SAWEK AD بيبني حزمة حملة (نص، أفكار CMO، نماذج، خطة ميديا) من وقائع نشرتوها أو عبّيتوها. الميديا PLAN بس — التطبيق ما بيشتري إعلانات على Meta / Google / TikTok باسمكم.",
          en: "SAWEK AD builds a campaign pack (copy, CMO ideas, mockups, a media plan) from facts you published or typed. Media is PLAN only — the app does not buy ads on Meta / Google / TikTok for you.",
        },
        {
          he: "פלט AI עלול לטעות. אתם אחראים לבדוק טענות, מחירים, שעות וכללים לרפואה/פרסום לפני פרסום.",
          ar: "مخرجات AI ممكن تغلط. أنتم مسؤولين تتفقدوا الادعاءات والأسعار والساعات وقواعد الطب/الإعلان قبل النشر.",
          en: "AI output can be wrong. You are responsible for checking claims, prices, hours, and medical/ad-policy rules before you publish.",
        },
      ],
    },
    {
      h: { he: "מחירים — חינם ו-Pro", ar: "الأسعار — مجاني وPro", en: "Pricing — Free and Pro" },
      p: [
        {
          he: "חינם: ₪0 לתמיד — עסק אחד, קמפיין שמור אחד, סריקת אתר, מודעות עברית/ערבית, והורדת PNG לכל כרטיס.",
          ar: "مجاني: ₪0 للأبد — شغلة وحدة، حملة محفوظة وحدة، مسح موقع، إعلانات عبرية/عربية، وتحميل PNG لكل بطاقة.",
          en: "Free: ₪0 forever — one business, one saved campaign, site scan, Hebrew/Arabic ads, and a PNG download per card.",
        },
        {
          he: "Pro: ₪99 לחודש או ₪990 לשנה, כשהתשלום מחובר (Stripe, ואם הוגדר — PayPal.me / העברה / ביט). בלי חיבור Stripe אין חיוב בכרטיס ואין מסך «התשלום הצליח» מזויף.",
          ar: "Pro: ₪99 بالشهر أو ₪990 بالسنة، لما الدفع يتوصل (Stripe، وإذا مضبوط — PayPal.me / حوالة / بيت). بلا ربط Stripe ما في خصم عالبطاقة ولا شاشة «الدفع نجح» مزيفة.",
          en: "Pro: ₪99 / month or ₪990 / year, once payments are connected (Stripe, and if configured — PayPal.me / bank / Bit). Without Stripe there is no card charge and no fake “payment succeeded” screen.",
        },
      ],
    },
    {
      h: { he: "החזרים", ar: "الاسترجاع", en: "Refunds" },
      p: [
        {
          he: `כל עוד Pro לא שולם — אין מה להחזיר. אחרי שחיבור תשלום פעיל וחויבתם על Pro, פנו ל-${CONTACT_EMAIL}. נחזיר חיוב ראשון שלא נוצל (בלי שימוש ממשי בחבילות תמונת Vertex). חישוב כבר בוצע ב-Vertex לא יוחזר ככסף.`,
          ar: `طالما Pro ما اندفع — ما في شي نرجّعه. بعد ما الدفع يشتغل وتنخصم Pro، راسلوا ${CONTACT_EMAIL}. منرجّع أول خصم ما انستخدم (بلا استخدام فعلي لحزم صور Vertex). حساب صار على Vertex ما بيرجع كفلوس.`,
          en: `While Pro has not been paid, there is nothing to refund. After payments are connected and you are charged for Pro, email ${CONTACT_EMAIL}. We will refund an unused first charge (no real use of Vertex image packs). Vertex compute already used is not refunded as cash.`,
        },
      ],
    },
    {
      h: { he: "התוכן שלכם", ar: "محتواكم", en: "Your content" },
      p: [
        {
          he: "אתם נשארים בעלי הקלט שלכם (טקסט, לוגואים, תמונות). אתם נותנים לנו רישיון מוגבל לעבד אותו כדי להפעיל את השירות. אל תעלו חומר בלי הרשאה.",
          ar: "بتضلوا أصحاب مدخلاتكم (نص، شعارات، صور). بتعطونا ترخيص محدود نعالجه حتى نشغّل الخدمة. لا ترفعوا مادة بلا إذن.",
          en: "You keep ownership of your inputs (text, logos, photos). You give us a limited license to process them to run the service. Do not upload material you do not have rights to.",
        },
      ],
    },
    {
      h: { he: "שימוש מותר", ar: "استخدام مسموح", en: "Acceptable use" },
      p: [
        {
          he: "אין להשתמש בשירות להונאה, ספאם, הסתה, או טענות רפואיות אסורות. אין לנסות לפרוץ, לסרוק רשתות פנימיות, או להעמיס על המערכת.",
          ar: "ممنوع استخدام الخدمة للاحتيال أو السبام أو التحريض أو ادعاءات طبية ممنوعة. ممنوع تحاولوا تخترقوا أو تمسحوا شبكات داخلية أو تحمّلوا النظام زيادة.",
          en: "Do not use the service for fraud, spam, incitement, or banned medical claims. Do not try to break in, scan internal networks, or overload the system.",
        },
      ],
    },
    {
      h: { he: "הדגמות", ar: "العروض التجريبية", en: "Demos" },
      p: [
        {
          he: "יש שלוש הדגמות בלבד: מרפאת ילדים (עסק אמיתי באישור הבעלים), «מטבח הזית» ו«בוטיק חול» (בדיוניים). אין הדגמות של מותגים אמיתיים בלי אישור, ואין מדדי ביצוע בדויים.",
          ar: "في ثلاث تجارب بس: عيادة أطفال (شغل حقيقي بإذن المالك)، «مطبخ الزيتون» و«بوتيك الرمل» (خياليان). ما في عروض لعلامات حقيقية بلا إذن، وما في مقاييس أداء مختلقة.",
          en: "There are exactly three demos: a pediatric clinic (a real business, owner-approved), “Olive Kitchen”, and “Sand Boutique” (fictional). No unauthorized real-brand demos, and no fake performance metrics.",
        },
      ],
    },
    {
      h: { he: "אחריות", ar: "المسؤولية", en: "Liability" },
      p: [
        {
          he: "השירות ניתן «כפי שהוא». אין אחריות לתוצאות פרסום, לידים או הכנסות. עד כמה שהחוק מאפשר, האחריות מוגבלת לסכום ששילמתם לנו ב-90 הימים שלפני התביעה — או אפס אם לא שילמתם.",
          ar: "الخدمة «كما هي». ما في ضمان لنتائج إعلان أو عملاء أو دخل. بقدر ما يسمح القانون، المسؤولية محدودة بالمبلغ اللي دفعتوه لنا بـ٩٠ يوم قبل المطالبة — أو صفر إذا ما دفعتوا.",
          en: "The service is provided “as is”. There is no warranty for ad results, leads, or revenue. To the extent the law allows, liability is limited to what you paid us in the 90 days before a claim — or zero if you paid nothing.",
        },
      ],
    },
    {
      h: { he: "דין", ar: "القانون", en: "Governing law" },
      p: [
        {
          he: "התנאים לפי דיני מדינת ישראל. סמכות שיפוט — בתי משפט בישראל, אלא אם חוק צרכנות מחייב אחרת.",
          ar: "الشروط حسب قوانين دولة إسرائيل. الاختصاص لمحاكم إسرائيل، إلا إذا قانون حماية المستهلك فرض غير هيك.",
          en: "These terms follow the laws of the State of Israel. Courts in Israel have jurisdiction, unless a consumer-protection rule requires otherwise.",
        },
      ],
    },
  ],
};
