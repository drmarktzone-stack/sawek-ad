/**
 * CMO idea engine — distinctive campaign platforms, hooks, narrative arcs,
 * and PLANNING scorecards (1–100). Never performance ROAS / CAC / likes.
 */
import type {
  Intake,
  Locale,
  Tri,
  CmoScoreDimension,
  CmoScoreDimensionId,
  CmoGapMove,
  CmoGapPlan,
  CmoIdea,
  CmoIdeasPack,
} from "../types";

export type {
  CmoScoreDimension,
  CmoScoreDimensionId,
  CmoGapMove,
  CmoGapPlan,
  CmoIdea,
  CmoIdeasPack,
} from "../types";
import { filled } from "../utils";
import { detectVertical, foodFamily, type Vertical } from "../vertical";
import { isNoOffer } from "../no-offer";
import { isFreeService } from "../operating-model";

const L = (he: string, ar: string, en: string): Tri => ({ he, ar, en });

type PlatformSeed = {
  id: string;
  name: Tri;
  hook: Tri;
  arc: Tri;
  platform: Tri;
  why: Tri;
  /** Soft tags used to bias selection from available facts */
  needs?: Array<"offer" | "hours" | "place" | "whatsapp" | "advantage" | "walk_in" | "audience" | "problem">;
};

const SCORE_LABELS: Record<CmoScoreDimensionId, Tri> = {
  message_clarity: L(
    "בהירות מסר (תכנון 1–100)",
    "وضوح الرسالة (تخطيط 1–100)",
    "Message clarity (planning 1–100)",
  ),
  offer_clarity: L(
    "בהירות הצעה (תכנון 1–100)",
    "وضوح العرض (تخطيط 1–100)",
    "Offer clarity (planning 1–100)",
  ),
  proof_gaps: L(
    "פערי הוכחה (תכנון 1–100 — גבוה = פחות פער)",
    "فجوات الإثبات (تخطيط 1–100 — أعلى = فجوة أقل)",
    "Proof gaps (planning 1–100 — higher = fewer gaps)",
  ),
  channel_fit: L(
    "התאמת ערוץ (תכנון 1–100)",
    "ملاءمة القناة (تخطيط 1–100)",
    "Channel fit (planning 1–100)",
  ),
  creative_variety: L(
    "גיוון קריאייטיב (תכנון 1–100)",
    "تنوّع الإبداع (تخطيط 1–100)",
    "Creative variety (planning 1–100)",
  ),
};

const CLINIC_PLATFORMS: PlatformSeed[] = [
  {
    id: "same_day_calm",
    name: L("שקט באותו יום", "هدوء في نفس اليوم", "Same-day calm"),
    hook: L("כשהילד חולה — בלי טלפון אין סופי", "لما الولد مريض — بلا هاتف ما بيخلص", "When the child is sick — endless phone loops"),
    arc: L("בהלה → מידע ברור על סדר הגעה → צעד אחד", "قلق → معلومة واضحة عن الدور → خطوة واحدة", "Alarm → clear walk-in facts → one step"),
    platform: L("פלטפורמת «אין המתנה על הקו»", "منصة «بلا انتظار على الخط»", "Platform: no-hold-on-the-line"),
    why: L("הופכת את סדר ההגעה לסיפור רגוע במקום תור ארוך מדומה", "تحوّل الدور إلى قصة هادئة بدل طابور وهمي", "Turns walk-in order into a calm story — no invented queues"),
    needs: ["walk_in", "place", "hours"],
  },
  {
    id: "parent_radar",
    name: L("רדאר הורים", "رادار الأهل", "Parent radar"),
    hook: L("הורים מחפשים ודאות — לא סלוגן רפואי", "الأهل بدهم يقين — مش شعار طبي", "Parents want certainty — not medical slogans"),
    arc: L("שאלה של הורה → עובדה מהמרפאה → CTA ביקור", "سؤال أهل → حقيقة من العيادة → CTA زيارة", "Parent question → clinic fact → visit CTA"),
    platform: L("פלטפורמת שאלות-הורים (בלי אבחנות)", "منصة أسئلة أهل (بلا تشخيص)", "Parent-questions platform (no diagnoses)"),
    why: L("מדברת בשפת ההורה בלי להמציא דירוגים או הבטחות רפואיות", "بلغة الأهل بلا تقييمات أو وعود طبية", "Speaks parent language without inventing ratings or medical promises"),
    needs: ["audience", "problem", "advantage"],
  },
  {
    id: "hours_as_hero",
    name: L("שעות כגיבור", "الساعات هي البطل", "Hours as hero"),
    hook: L("מתי באמת אפשר להגיע — זו הכותרת", "متى فعلاً فيكن تجوا — هذا العنوان", "When you can actually arrive — that is the headline"),
    arc: L("שעות אמת → מיקום → סדר הגעה", "ساعات حقيقية → موقع → دور الوصول", "Real hours → place → arrival order"),
    platform: L("פלטפורמת לוח-שעות חי", "منصة جدول ساعات حي", "Live hours-board platform"),
    why: L("כשיש שעות בקליטה — הן הופכות לנכס קריאייטיב, לא לפוטר קטן", "لما في ساعات — تصير أصل إبداعي مش تذييل", "When hours exist in intake they become the creative asset, not a footer"),
    needs: ["hours", "place"],
  },
  {
    id: "street_trust",
    name: L("אמון רחוב", "ثقة الشارع", "Street trust"),
    hook: L("שם הרופא + העיר — בלי «הכי טוב בעיר»", "اسم الطبيب + البلدة — بلا «الأفضل في المدينة»", "Doctor name + town — never “best in town”"),
    arc: L("זהות → מקום → ביקור", "هوية → مكان → زيارة", "Identity → place → visit"),
    platform: L("פלטפורמת זהות מקומית כנה", "منصة هوية محلية صادقة", "Honest local-identity platform"),
    why: L("בונה זיהוי מקומי ממה שסופק בלבד — בלי מתחרים בדויים", "بناء تعرّف محلي مما أُعطي فقط", "Builds local recognition from supplied facts only — no invented rivals"),
    needs: ["place", "advantage"],
  },
  {
    id: "wa_triage_soft",
    name: L("וואטסאפ רך", "واتساب لطيف", "Soft WhatsApp lane"),
    hook: L("שאלה אחת בוואטסאפ — לא טופס של 12 שדות", "سؤال واحد واتساب — مش فورم 12 حقل", "One WhatsApp question — not a 12-field form"),
    arc: L("הוק קצר → מספר אמיתי → שאלה אחת", "خطاف قصير → رقم حقيقي → سؤال واحد", "Short hook → real number → one question"),
    platform: L("פלטפורמת מסלול-הודעה", "منصة مسار رسالة", "Message-lane platform"),
    why: L("כשיש מספר — הופכים אותו למסלול ברור בלי להמציא זמני מענה", "لما في رقم — مسار واضح بلا اختراع زمن رد", "When a number exists, make a clear lane — never invent reply-time SLAs"),
    needs: ["whatsapp"],
  },
  {
    id: "empty_chair_film",
    name: L("כיסא ריק", "كرسي فاضي", "Empty chair film"),
    hook: L("לצלם את החדר ריק — לא פנים של ילדים", "صوروا الغرفة فاضية — مش وجوه أطفال", "Film the empty room — never children’s faces"),
    arc: L("פריים חלל → טקסט עובדה → CTA", "فريمة مكان → نص حقيقة → CTA", "Space frame → fact text → CTA"),
    platform: L("פלטפורמת ויז'ואל «מקום שקט»", "منصة بصري «مكان هادئ»", "Quiet-place visual platform"),
    why: L("מגשר על פערי הוכחה בצילום מקום במקום עדויות מזויפות", "يسد فجوة الإثبات بمكان حقيقي بدل شهادات مزيفة", "Closes proof gaps with place photography instead of fake testimonials"),
    needs: ["place"],
  },
  {
    id: "coverage_plain",
    name: L("כיסוי בפרוזה", "تغطية بالنثر", "Coverage in plain prose"),
    hook: L("אם יש עובדת קופה — אומרים אותה בלי למכור אותה כמבצע", "إن وُجدت حقيقة صندوق — تُقال بلا بيعها كعرض", "If an HMO fact exists — state it; never sell it as a promo"),
    arc: L("עובדת כיסוי → מה זה אומר להורה → ביקור", "حقيقة تغطية → ماذا تعني للأهل → زيارة", "Coverage fact → what it means for parents → visit"),
    platform: L("פלטפורמת שקיפות כיסוי", "منصة شفافية التغطية", "Coverage-transparency platform"),
    why: L("מכבדת מודל שירות חינם — בלי ROAS ובלי קופון", "تحترم نموذج خدمة مجانية — بلا ROAS وبلا كوبون", "Respects free-service — no ROAS framing, no coupon"),
    needs: ["advantage"],
  },
  {
    id: "two_lang_equal",
    name: L("שתי שפות שוות", "لغتان متساويتان", "Two equal languages"),
    hook: L("עברית וערבית כשפות ראשונות — לא תרגום משני", "العبرية والعربية أوليتان — مش ترجمة ثانوية", "Hebrew and Arabic as first languages — not afterthought translation"),
    arc: L("אותו מבנה בשתי שפות → אותו CTA אמיתי", "نفس البنية بلغتين → نفس CTA حقيقي", "Same structure in both languages → same real CTA"),
    platform: L("פלטפורמת דו-לשוניות שווה", "منصة ثنائية متساوية", "Equal bilingual platform"),
    why: L("מחברת קהל מקומי בלי להמציא דמוגרפיה", "تربط الجمهور المحلي بلا اختراع ديموغرافيا", "Connects the local audience without inventing demographics"),
    needs: ["audience"],
  },
  {
    id: "morning_rush_map",
    name: L("מפת בוקר", "خريطة صباح", "Morning rush map"),
    hook: L("בוקר חולה — מה עושים ב-3 צעדים", "صباح مرض — شو تعملوا بثلاث خطوات", "Sick morning — three real steps"),
    arc: L("צעד 1 מיקום → 2 שעות → 3 הגעה", "خطوة 1 موقع → 2 ساعات → 3 وصول", "Step 1 place → 2 hours → 3 arrive"),
    platform: L("פלטפורמת מפת-פעולה", "منصة خريطة فعل", "Action-map platform"),
    why: L("הופכת פער מידע לתוכנית ויזואלית בלי מספרים בדויים", "تحوّل فجوة المعلومة لخطة بصرية بلا أرقام مختلقة", "Turns info gaps into a visual plan without invented metrics"),
    needs: ["hours", "place", "walk_in"],
  },
  {
    id: "no_star_theatre",
    name: L("בלי תיאטרון כוכבים", "بلا مسرح نجوم", "No star theatre"),
    hook: L("אין דירוגים בקליטה? אז אין כוכבים בקריאייטיב", "ما في تقييمات؟ إذن بلا نجوم بالإبداع", "No ratings in intake? Then no stars in creative"),
    arc: L("יושרה → עובדה → פעולה", "صدق → حقيقة → فعل", "Integrity → fact → action"),
    platform: L("פלטפורמת אנטי-כוכבים", "منصة ضد النجوم المزيفة", "Anti-fake-stars platform"),
    why: L("מסמנת פערי הוכחה במפורש ובונה אמון במקום לייקים מזויפים", "تُظهر فجوات الإثبات صراحة وتبني ثقة بدل إعجابات مزيفة", "Names proof gaps explicitly and builds trust instead of fake likes"),
    needs: ["problem"],
  },
];

const RESTAURANT_PLATFORMS: PlatformSeed[] = [
  {
    id: "olive_table_ritual",
    name: L("טקס שולחן הזית", "طقس طاولة الزيتون", "Olive table ritual"),
    hook: L("לא «אוכל טעים» — טקס ישיבה בחוץ בשעת שקיעה", "مش «أكل طيب» — طقس جلسة برا وقت الغروب", "Not “tasty food” — an outdoor seating ritual at dusk"),
    arc: L("רעב רגוע → צלחת ביתית → הזמנת שולחן", "جوع هادئ → صحن بيتي → حجز طاولة", "Calm hunger → home plate → book a table"),
    platform: L("פלטפורמת טקס-שולחן", "منصة طقس الطاولة", "Table-ritual platform"),
    why: L("שוברת תבנית «מבצע משלוחים» עם חוויית ישיבה שסופקה בקליטה", "تكسر قالب عروض التوصيل بجلسة خارجية حقيقية من البيانات", "Breaks delivery-deal templates with the outdoor seating fact from intake"),
    needs: ["advantage", "place", "offer"],
  },
  {
    id: "two_cover_tasting",
    name: L("טעימות לשניים", "تذوّق لاثنين", "Two-cover tasting"),
    hook: L("ההצעה היא הסיפור — לא הנחה גנרית", "العرض هو القصة — مش خصم عام", "The offer is the story — not a generic discount"),
    arc: L("זוג מגיע → תפריט טעימות → וואטסאפ הזמנה", "زوج يجي → قائمة تذوّق → واتساب حجز", "Couple arrives → tasting menu → WhatsApp booking"),
    platform: L("פלטפורמת ארוחת-זוג", "منصة عشاء زوجي", "Couple-tasting platform"),
    why: L("כשיש מחיר אמיתי בהצעה — מובילים בו בלי להמציא ROAS", "لما في سعر حقيقي بالعرض — نقوده بلا اختراع ROAS", "When the offer has a real price, lead with it — never invent ROAS"),
    needs: ["offer", "whatsapp"],
  },
  {
    id: "no_queue_mediterranean",
    name: L("ים-תיכון בלי תור", "متوسطي بلا طابور", "Mediterranean, no queue"),
    hook: L("הבעיה שסופקה: תורים ארוכים — הפתרון הוא קצב ביתי", "المشكلة المعطاة: طوابير — الحل إيقاع بيتي", "Stated problem: long waits — solution is home-kitchen pace"),
    arc: L("כאב תור → הבטחת קצב → הזמנה מראש", "ألم الطابور → وعد إيقاع → حجز مسبق", "Queue pain → pace promise → advance book"),
    platform: L("פלטפורמת אנטי-תור", "منصة ضد الطابور", "Anti-queue platform"),
    why: L("משתמשת בבעיה מהקליטה כהוק — בלי לזייף זמני המתנה", "تستخدم المشكلة من البيانات كخطاف — بلا تزوير زمن انتظار", "Uses the intake problem as the hook — never fakes wait times"),
    needs: ["problem", "offer"],
  },
  {
    id: "grill_steam_reel",
    name: L("אדים מעל הגריל", "بخار فوق الغريل", "Steam over the grill"),
    hook: L("לצלם אדים וקרמיקה — לא לקוחות בפנים", "صوروا بخار وصحون — مش زبائن بوجوه", "Film steam and ceramics — not customer faces"),
    arc: L("פריים חום → מנה → CTA הזמנה", "فريمة دفء → طبق → CTA حجز", "Heat frame → dish → book CTA"),
    platform: L("פלטפורמת ריל-מטבח", "منصة ريل مطبخ", "Kitchen-reel platform"),
    why: L("בונה מערכת גרפית של חום/שמן זית בלי תמונות מלאי גנריות של פיצה", "نظام بصري دفء/زيتون بلا صور بيتزا عامة", "Builds a heat/olive-oil graphic system — no generic pizza stock"),
    needs: ["advantage"],
  },
  {
    id: "square_neighbor",
    name: L("שכן הכיכר", "جار الساحة", "Square neighbor"),
    hook: L("מיקום ליד הכיכר = סיפור שכונתי, לא גאופנסינג מדומה", "الموقع جنب الساحة = قصة حي، مش جيوفنس مزيف", "By-the-square location = neighborhood story, not fake geofencing"),
    arc: L("כיכר → דלת → שולחן בחוץ", "ساحة → باب → طاولة برا", "Square → door → outdoor table"),
    platform: L("פלטפורמת שכנות", "منصة جيرة", "Neighborhood platform"),
    why: L("הופכת את הכתובת הבדיונית/האמיתית לזהות מקום חדה", "تحوّل العنوان لهوية مكان حادة", "Turns the address into a sharp place identity"),
    needs: ["place", "audience"],
  },
  {
    id: "hummus_open",
    name: L("פתיחת חומוס", "افتتاح الحمص", "Hummus open"),
    hook: L("סלטי זיתים וחומוס כפתיח ויזואלי — לא כותרת «הכי טעים»", "سلطات زيتون وحمص كافتتاح بصري — بلا «الألذ»", "Olive & hummus salads as visual open — never “tastiest” claims"),
    arc: L("קערה → שיתוף → הזמנה", "وعاء → مشاركة → حجز", "Bowl → share → book"),
    platform: L("פלטפורמת פתיח-קערה", "منصة افتتاح الوعاء", "Bowl-open platform"),
    why: L("נשענת על תיאור המטבח שסופק, לא על תבניות מסעדה גנריות", "ترتكز على وصف المطبخ المعطى لا قوالب مطاعم عامة", "Leans on the stated kitchen description — not generic restaurant templates"),
    needs: ["advantage", "audience"],
  },
  {
    id: "friday_window",
    name: L("חלון שישי", "نافذة الجمعة", "Friday window"),
    hook: L("שעות שישי הקצרות = דחיפות אמיתית בלי «רק היום» מזויף", "ساعات الجمعة القصيرة = إلحاح حقيقي بلا «اليوم فقط» مزيف", "Short Friday hours = real urgency — no fake “today only”"),
    arc: L("שעות ו׳ → הצעה → סגירה", "ساعات الجمعة → عرض → إغلاق", "Fri hours → offer → close"),
    platform: L("פלטפורמת חלון-שעות", "منصة نافذة ساعات", "Hours-window platform"),
    why: L("דחיפות מבוססת שעות אמת מהקליטה", "إلحاح مبني على ساعات حقيقية من البيانات", "Urgency grounded in real intake hours"),
    needs: ["hours", "offer"],
  },
  {
    id: "family_middle_table",
    name: L("שולחן משפחה באמצע", "طاولة عيلة بالنص", "Family middle table"),
    hook: L("קהל משפחות מקומי — בלי להמציא גילאי ילדים", "جمهور عائلات محلي — بلا اختراع أعمار أطفال", "Local families audience — no invented kids’ ages"),
    arc: L("משפחה רעבה → מנות לשיתוף → הזמנה", "عيلة جعانة → أطباق للمشاركة → حجز", "Hungry family → share plates → book"),
    platform: L("פלטפורמת שולחן-אמצע", "منصة طاولة الوسط", "Middle-table platform"),
    why: L("מתאימה לקהל שסופק בלי פרסונות דמוגרפיות בדויות", "تناسب الجمهور المعطى بلا شخصيات ديموغرافية مختلقة", "Fits the stated audience without invented demographic personas"),
    needs: ["audience", "problem"],
  },
  {
    id: "booking_before_plate",
    name: L("הזמנה לפני צלחת", "الحجز قبل الصحن", "Book before the plate"),
    hook: L("CTA = הזמנה מראש — לא «הזמינו עכשיו» ריק", "CTA = حجز مسبق — مش «اطلبوا الآن» فاضي", "CTA = advance booking — not empty “order now”"),
    arc: L("הוק → הצעה → וואטסאפ", "خطاف → عرض → واتساب", "Hook → offer → WhatsApp"),
    platform: L("פלטפורמת הזמנה-ראשונה", "منصة الحجز أولاً", "Book-first platform"),
    why: L("מיישרת את הערוץ עם המטרה שסופקה (וואטסאפ/הזמנה)", "توائم القناة مع الهدف المعطى", "Aligns channel with the stated WhatsApp/booking goal"),
    needs: ["whatsapp", "offer"],
  },
  {
    id: "ceramic_system",
    name: L("מערכת קרמיקה", "نظام صحون", "Ceramic system"),
    hook: L("גרפיקה: קרמיקה חמה + ירוק זית — לא תבנית סוכנות אדומה", "غرافيك: صحون دافئة + أخضر زيتون — مش قالب وكالة أحمر", "Graphics: warm ceramics + olive green — not red-agency templates"),
    arc: L("פלטה צבע → מנה → טקסט עובדה", "لوحة لون → طبق → نص حقيقة", "Color plate → dish → fact text"),
    platform: L("פלטפורמת מערכת-גרפית", "منصة نظام غرافيك", "Graphic-system platform"),
    why: L("מגדירה שפה ויזואלית ייחודית כשיש פער בתמונות", "تحدد لغة بصرية فريدة عند نقص الصور", "Defines a distinctive visual language when photos are thin"),
    needs: ["advantage"],
  },
];

const RETAIL_PLATFORMS: PlatformSeed[] = [
  {
    id: "quiet_fitting",
    name: L("הלבשה שקטה", "تجربة قياس هادئة", "Quiet fitting"),
    hook: L("בלי קניון עמוס — ייעוץ אישי רגוע", "بلا مول مزدحم — استشارة هادئة", "No crowded mall — calm personal styling"),
    arc: L("רעש קניון → דלת בוטיק → לוק יומיומי", "ضوضاء مول → باب بوتيك → إطلالة يومية", "Mall noise → boutique door → everyday look"),
    platform: L("פלטפורמת אנטי-קניון", "منصة ضد المول", "Anti-mall platform"),
    why: L("משתמשת בבעיה וביתרון שסופקו כציר עלילה אחד", "تستخدم المشكلة والميزة كخط سرد واحد", "Uses stated problem + advantage as one narrative spine"),
    needs: ["problem", "advantage"],
  },
  {
    id: "spring_soft_open",
    name: L("פתיחה רכה לאביב", "افتتاح ربيعي ناعم", "Soft spring opening"),
    hook: L("הנחת פתיחה שסופקה — בלי «VIP 50%» מומצא", "خصم الافتتاح المعطى — بلا VIP 50٪ مختلق", "Stated opening discount — never an invented VIP 50%"),
    arc: L("קולקציית אביב → הנחה אמיתית → שמירת פריט", "مجموعة ربيع → خصم حقيقي → حجز قطعة", "Spring collection → real discount → hold item"),
    platform: L("פלטפורמת פתיחה-רכה", "منصة افتتاح ناعم", "Soft-opening platform"),
    why: L("מובילה במחיר/הנחה רק כשהם בקליטה", "تقود بالسعر/الخصم فقط إن وُجدا بالبيانات", "Leads with price/discount only when present in intake"),
    needs: ["offer", "whatsapp"],
  },
  {
    id: "fabric_closeup",
    name: L("קרוס-אפ בד", "لقطة قماش قريبة", "Fabric close-up"),
    hook: L("לצלם טקסטיל ותנועה — לא דוגמניות בפנים מזוהות", "صوروا قماش وحركة — مش عارضات بوجوه معروفة", "Film textile and motion — never identifiable model faces"),
    arc: L("בד → מגע → CTA שמירה", "قماش → لمس → CTA حجز", "Fabric → touch → hold CTA"),
    platform: L("פלטפורמת מקרו-בד", "منصة ماكرو قماش", "Fabric-macro platform"),
    why: L("סוגרת פערי הוכחה במערכת גרפית של בדים במקום לייקים", "تسد فجوة الإثبات بنظام قماش بدل إعجابات", "Closes proof gaps with a fabric graphic system instead of likes"),
    needs: ["advantage"],
  },
  {
    id: "palm_street_vitrine",
    name: L("חלון רחוב הדקל", "واجهة شارع النخيل", "Palm Street vitrine"),
    hook: L("כתובת העיירה = זהות, לא מודעת «לידכם» ריקה", "عنوان البلدة = هوية، مش إعلان «قربكم» فاضي", "Town address = identity, not empty “near you” ads"),
    arc: L("רחוב → חלון ראווה → כניסה", "شارع → واجهة → دخول", "Street → vitrine → walk-in"),
    platform: L("פלטפורמת חלון-ראווה", "منصة واجهة عرض", "Vitrine platform"),
    why: L("הופכת מיקום בדיוני/אמיתי לסיפור מקום חד", "تحوّل الموقع لقصة مكان حادة", "Turns place into a sharp location story"),
    needs: ["place"],
  },
  {
    id: "hold_via_wa",
    name: L("שמירה בוואטסאפ", "حجز عبر واتساب", "Hold via WhatsApp"),
    hook: L("שמירת פריט בהודעה אחת — בלי עגלת קניות מדומה", "حجز قطعة برسالة — بلا سلة وهمية", "Hold an item in one message — no fake cart"),
    arc: L("פריט → וואטסאפ → איסוף", "قطعة → واتساب → استلام", "Piece → WhatsApp → pick up"),
    platform: L("פלטפורמת שמירה-מספר", "منصة حجز برقم", "Number-hold platform"),
    why: L("מיישרת CTA עם המטרה והמספר שסופקו", "توائم CTA مع الهدف والرقم المعطيين", "Aligns CTA with stated goal and phone"),
    needs: ["whatsapp", "offer"],
  },
  {
    id: "everyday_elegant",
    name: L("אלגנטיות יומיומית", "أناقة يومية", "Everyday elegant"),
    hook: L("לוקים יומיומיים אלגנטיים — לא שבוע אופנה מדומה", "إطلالات يومية أنيقة — مش أسبوع موضة مختلق", "Everyday elegant looks — no invented fashion week"),
    arc: L("בוקר עבודה → בד נוח → ביקור", "صباح شغل → قماش مريح → زيارة", "Work morning → soft fabric → visit"),
    platform: L("פלטפורמת לוק-יום", "منصة إطلالة يوم", "Day-look platform"),
    why: L("נשענת על יתרון הבדים/ייעוץ שסופק", "ترتكز على ميزة الأقمشة/الاستشارة المعطاة", "Leans on the stated fabric/styling advantage"),
    needs: ["advantage", "audience"],
  },
  {
    id: "women_circle_soft",
    name: L("מעגל נשים רך", "دائرة نساء ناعمة", "Soft women’s circle"),
    hook: L("קהל נשים שסופק — בלי להמציא «25–34»", "جمهور نساء معطى — بلا اختراع 25–34", "Stated women’s audience — never invent 25–34"),
    arc: L("צורך נוחות → ייעוץ → שמירה", "حاجة راحة → استشارة → حجز", "Comfort need → styling → hold"),
    platform: L("פלטפורמת קהל-כנה", "منصة جمهور صادق", "Honest-audience platform"),
    why: L("מכבדת את הקליטה בלי דמוגרפיה בדויה", "تحترم البيانات بلا ديموغرافيا مختلقة", "Respects intake without invented demographics"),
    needs: ["audience", "problem"],
  },
  {
    id: "friday_browse",
    name: L("שיטוט שישי", "تجوّل الجمعة", "Friday browse"),
    hook: L("שעות שישי הקצרות = חלון ביקור אמיתי", "ساعات الجمعة القصيرة = نافذة زيارة حقيقية", "Short Friday hours = a real visit window"),
    arc: L("שעות ו׳ → קולקציה → CTA", "ساعات الجمعة → مجموعة → CTA", "Fri hours → collection → CTA"),
    platform: L("פלטפורמת חלון-שישי", "منصة نافذة الجمعة", "Friday-window platform"),
    why: L("דחיפות משעות אמת — לא מספירת מלאי מדומה", "إلحاح من ساعات حقيقية — مش عدّ مخزون مزيف", "Urgency from real hours — not fake stock countdowns"),
    needs: ["hours", "offer"],
  },
  {
    id: "sand_palette",
    name: L("פלטת חול", "لوحة رمل", "Sand palette"),
    hook: L("מערכת צבע: חול, פשתן, נייבי רך — לא ניאון סוכנות", "نظام لون: رمل، كتان، كحلي ناعم — مش نيون وكالة", "Color system: sand, linen, soft navy — not agency neon"),
    arc: L("פלטה → פריט → טקסט", "لوحة → قطعة → نص", "Palette → piece → text"),
    platform: L("פלטפורמת זהות-צבע", "منصة هوية لون", "Color-identity platform"),
    why: L("כשחסרות תמונות — הגרפיקה נושאת את הקמפיין בלי לייקים", "عند نقص الصور — الغرافيك يحمل الحملة بلا إعجابات", "When photos are thin, graphics carry the campaign — no likes"),
    needs: ["advantage"],
  },
  {
    id: "one_rack_story",
    name: L("סיפור מתלה אחד", "قصة سكة واحدة", "One-rack story"),
    hook: L("מתלה אחד מורכב היטב > קטלוג של 40 פריטים מזויפים", "سكة واحدة متقنة > كتالوج 40 قطعة مختلقة", "One well-built rack > a fake 40-SKU catalog"),
    arc: L("מתלה → בחירה → שמירה", "سكة → اختيار → حجز", "Rail → choose → hold"),
    platform: L("פלטפורמת מתלה-גיבור", "منصة السكة البطلة", "Hero-rail platform"),
    why: L("מפצה על פערי מלאי מצולם בפיתוח רעיון, לא במספרים", "تعوّض نقص المخزون المصوّر بتطوير فكرة لا بأرقام", "Compensates missing photographed stock with idea development, not numbers"),
    needs: ["problem", "advantage"],
  },
];

const POOL_PLATFORMS: PlatformSeed[] = [
  {
    id: "warm_water_lane",
    name: L("נתיב מים חמים", "مسار مي دافية", "Warm-water lane"),
    hook: L("מים חמים שצוינו — לא הבטחת ריפוי", "مي دافية مذكورة — بلا وعد شفاء", "Stated warm water — never a cure claim"),
    arc: L("כאב יומיומי → מים → ביקור", "ألم يومي → مي → زيارة", "Daily ache → water → visit"),
    platform: L("פלטפורמת מים-כעובדה", "منصة المي كحقيقة", "Water-as-fact platform"),
    why: L("מדברת על המתקן שסופק, בלי אבחנות או ROAS", "تحكي عن المنشأة المعطاة بلا تشخيص وبلا ROAS", "Talks about the stated facility — no diagnoses, no ROAS"),
    needs: ["advantage", "place"],
  },
  {
    id: "empty_deck_film",
    name: L("סיפון ריק", "سطح فاضي", "Empty deck film"),
    hook: L("לצלם מים ואריחים — לא גופות בטיפול", "صوروا مي وبلاط — مش أجسام بعلاج", "Film water and tiles — never bodies in therapy"),
    arc: L("פריים מים → עובדה → CTA", "فريمة مي → حقيقة → CTA", "Water frame → fact → CTA"),
    platform: L("פלטפורמת ויז'ואל-בריכה", "منصة بصري المسبح", "Pool-visual platform"),
    why: L("סוגרת פערי הוכחה בלי עדויות מזויפות", "تسد فجوة الإثبات بلا شهادات مزيفة", "Closes proof gaps without fake testimonials"),
    needs: ["place"],
  },
  {
    id: "family_slot",
    name: L("חלון משפחה", "نافذة عيلة", "Family slot"),
    hook: L("קהל משפחות שסופק — בלי גילאים בדויים", "جمهور عائلات معطى — بلا أعمار مختلقة", "Stated family audience — no invented ages"),
    arc: L("משפחה → שעות → הגעה", "عيلة → ساعات → وصول", "Family → hours → arrive"),
    platform: L("פלטפורמת חלון-משפחה", "منصة نافذة العيلة", "Family-window platform"),
    why: L("מיישרת קהל עם שעות אמת", "توائم الجمهور مع ساعات حقيقية", "Aligns audience with real hours"),
    needs: ["audience", "hours"],
  },
  {
    id: "hours_steam",
    name: L("אדים לפי שעות", "بخار حسب الساعات", "Steam by the hour"),
    hook: L("שעות הפתיחה הן הקצב — לא «רק היום»", "ساعات الفتح هي الإيقاع — مش «اليوم فقط»", "Opening hours are the rhythm — not “today only”"),
    arc: L("שעות → מים → ביקור", "ساعات → مي → زيارة", "Hours → water → visit"),
    platform: L("פלטפורמת דופק-שעות", "منصة نبض الساعات", "Hours-pulse platform"),
    why: L("דחיפות משעות אמת בלבד", "إلحاح من ساعات حقيقية فقط", "Urgency from real hours only"),
    needs: ["hours"],
  },
  {
    id: "wa_pool_soft",
    name: L("וואטסאפ בריכה", "واتساب المسبح", "Pool WhatsApp"),
    hook: L("שאלה אחת על שעות/הגעה — לא טופס רפואי", "سؤال واحد عن ساعات/وصول — مش فورم طبي", "One question on hours/arrival — not a medical form"),
    arc: L("הוק → מספר → שאלה", "خطاف → رقم → سؤال", "Hook → number → question"),
    platform: L("פלטפורמת מסלול-הודעה", "منصة مسار رسالة", "Message-lane platform"),
    why: L("כשיש מספר — מסלול ברור בלי SLA בדוי", "لما في رقم — مسار واضح بلا SLA مختلق", "When a number exists, a clear lane — no invented SLA"),
    needs: ["whatsapp"],
  },
  {
    id: "stated_care_only",
    name: L("טיפול שצוין בלבד", "علاج مذكور فقط", "Stated care only"),
    hook: L("רק מה שנכתב בקליטה — בלי הבטחה קלינית", "بس المكتوب بالكِليطة — بلا وعد سريري", "Only what intake wrote — no clinical promise"),
    arc: L("עובדה → משמעות → ביקור", "حقيقة → معنى → زيارة", "Fact → meaning → visit"),
    platform: L("פלטפורמת יושרה-טיפולית", "منصة صدق علاجي", "Care-integrity platform"),
    why: L("מונעת המצאת אינדיקציות רפואיות", "تمنع اختراع استطبابات طبية", "Blocks invented medical indications"),
    needs: ["advantage"],
  },
  {
    id: "place_aqua",
    name: L("מקום המים", "مكان المي", "Place of water"),
    hook: L("הכתובת היא הגיבור — לא «הכי טובה בעיר»", "العنوان هو البطل — مش «الأفضل بالمدينة»", "The address is the hero — never “best in town”"),
    arc: L("מקום → מים → ביקור", "مكان → مي → زيارة", "Place → water → visit"),
    platform: L("פלטפורמת מקום-גיבור", "منصة مكان بطل", "Place-hero platform"),
    why: L("זהות מקומית מכתובת אמת", "هوية محلية من عنوان حقيقي", "Local identity from a real address"),
    needs: ["place"],
  },
  {
    id: "no_star_pool",
    name: L("בלי כוכבי ספא", "بلا نجوم سبا", "No spa stars"),
    hook: L("אין דירוגים בקליטה? אין כוכבים בקריאייטיב", "ما في تقييمات؟ بلا نجوم بالإبداع", "No ratings in intake? No stars in creative"),
    arc: L("יושרה → עובדה → פעולה", "صدق → حقيقة → فعل", "Integrity → fact → action"),
    platform: L("פלטפורמת אנטי-כוכבים", "منصة ضد النجوم", "Anti-stars platform"),
    why: L("מסמנת פערי הוכחה במקום לייקים", "تُظهر فجوات الإثبات بدل الإعجابات", "Names proof gaps instead of likes"),
    needs: ["problem"],
  },
];

const SCHOOL_PLATFORMS: PlatformSeed[] = [
  {
    id: "enrollment_plain",
    name: L("הרשמה בפרוזה", "تسجيل بالنثر", "Enrollment in prose"),
    hook: L("הרשמה כעובדה — לא מבצע שכר לימוד", "التسجيل كحقيقة — مش عرض أقساط", "Enrollment as a fact — not a tuition sale"),
    arc: L("קהילה → הרשמה → צעד אחד", "مجتمع → تسجيل → خطوة", "Community → enroll → one step"),
    platform: L("פלטפורמת הרשמה-כנה", "منصة تسجيل صادقة", "Honest-enrollment platform"),
    why: L("מכבדת מוסד חינם/ציבורי בלי קופון", "تحترم مؤسسة مجانية/عامة بلا كوبون", "Respects a free/public institution — no coupon"),
    needs: ["advantage", "audience"],
  },
  {
    id: "empty_yard",
    name: L("חצר ריקה", "ساحة فاضية", "Empty yard"),
    hook: L("לצלם חצר/כיתה ריקה — לא פני ילדים", "صوروا ساحة/صف فاضي — مش وجوه أطفال", "Film empty yard/classroom — never children’s faces"),
    arc: L("מקום → עובדה → הרשמה", "مكان → حقيقة → تسجيل", "Place → fact → enroll"),
    platform: L("פלטפורמת מקום-שקט", "منصة مكان هادئ", "Quiet-place platform"),
    why: L("הוכחה במקום, לא בעדויות מזויפות", "إثبات بالمكان لا بشهادات مزيفة", "Proof from place, not fake testimonials"),
    needs: ["place"],
  },
  {
    id: "hours_gate",
    name: L("שער השעות", "بوابة الساعات", "Hours gate"),
    hook: L("מתי באמת פתוחים — זו הכותרת", "متى فعلاً مفتوحين — هذا العنوان", "When you are actually open — that is the headline"),
    arc: L("שעות → מקום → הגעה", "ساعات → مكان → وصول", "Hours → place → arrive"),
    platform: L("פלטפורמת לוח-שעות", "منصة جدول ساعات", "Hours-board platform"),
    why: L("שעות אמת כנכס, לא פוטר", "ساعات حقيقية كأصل مش تذييل", "Real hours as the asset, not a footer"),
    needs: ["hours", "place"],
  },
  {
    id: "community_circle",
    name: L("מעגל קהילה", "دائرة مجتمع", "Community circle"),
    hook: L("קהל מקומי שסופק — בלי דמוגרפיה בדויה", "جمهور محلي معطى — بلا ديموغرافيا مختلقة", "Stated local audience — no invented demographics"),
    arc: L("קהילה → יתרון → הרשמה", "مجتمع → ميزة → تسجيل", "Community → advantage → enroll"),
    platform: L("פלטפורמת קהילה-כנה", "منصة مجتمع صادق", "Honest-community platform"),
    why: L("מדברת למי שסופק בלי «הורים 25–34»", "تحكي للمعطى بلا «أهل 25–34»", "Speaks to the stated audience — never “parents 25–34”"),
    needs: ["audience", "problem"],
  },
  {
    id: "wa_enroll",
    name: L("הרשמה בהודעה", "تسجيل برسالة", "Enroll by message"),
    hook: L("שאלה אחת בוואטסאפ — לא טופס 12 שדות", "سؤال واحد واتساب — مش فورم 12 حقل", "One WhatsApp question — not a 12-field form"),
    arc: L("הוק → מספר → הרשמה", "خطاف → رقم → تسجيل", "Hook → number → enroll"),
    platform: L("פלטפורמת מסלול-הרשמה", "منصة مسار تسجيل", "Enrollment-lane platform"),
    why: L("מיישרת CTA עם מספר אמת", "توائم CTA مع رقم حقيقي", "Aligns CTA with a real number"),
    needs: ["whatsapp"],
  },
  {
    id: "no_tuition_theatre",
    name: L("בלי תיאטרון שכר", "بلا مسرح أقساط", "No tuition theatre"),
    hook: L("אין מחיר בקליטה? אין ₪ בקריאייטיב", "ما في سعر بالكِليطة؟ بلا ₪ بالإبداع", "No price in intake? No ₪ in creative"),
    arc: L("יושרה → עובדה → פעולה", "صدق → حقيقة → فعل", "Integrity → fact → action"),
    platform: L("פלטפורמת אנטי-מחיר", "منصة ضد السعر المختلق", "Anti-invented-price platform"),
    why: L("מונעת המצאת הנחות לימודים", "تمنع اختراع خصومات دراسية", "Prevents invented tuition discounts"),
    needs: ["problem"],
  },
  {
    id: "two_lang_school",
    name: L("שתי שפות בבית הספר", "لغتان بالمدرسة", "Two school languages"),
    hook: L("עברית וערבית שוות — לא תרגום משני", "عبري وعربي متساويان — مش ترجمة ثانوية", "Hebrew and Arabic equal — not afterthought translation"),
    arc: L("אותו מבנה → אותו CTA", "نفس البنية → نفس CTA", "Same structure → same CTA"),
    platform: L("פלטפורמת דו-לשוניות", "منصة ثنائية", "Bilingual platform"),
    why: L("מחברת קהל מקומי בלי דמוגרפיה בדויה", "تربط الجمهور المحلي بلا ديموغرافيا مختلقة", "Connects the local audience without invented demographics"),
    needs: ["audience"],
  },
  {
    id: "fact_gate",
    name: L("שער עובדות", "بوابة حقائق", "Fact gate"),
    hook: L("כל פריים = עובדה מהקליטה", "كل فريمة = حقيقة من البيانات", "Every frame = an intake fact"),
    arc: L("עובדה → משמעות → הרשמה", "حقيقة → معنى → تسجيل", "Fact → meaning → enroll"),
    platform: L("פלטפורמת עובדה-ראשונה", "منصة الحقيقة أولاً", "Fact-first platform"),
    why: L("חוסמת ססמאות מוסדיות ריקות", "تمنع شعارات مؤسسية فارغة", "Blocks empty institutional slogans"),
    needs: ["advantage"],
  },
];

const PRODUCT_PLATFORMS: PlatformSeed[] = [
  {
    id: "pain_from_page",
    name: L("כאב מהדף", "ألم من الصفحة", "Pain from the page"),
    hook: L("רק הכאב שחולץ מהאתר — לא כאב סוכנות", "بس الألم المستخرج من الموقع — مش ألم وكالة", "Only pain extracted from the site — not agency pain"),
    arc: L("כאב → מנגנון → CTA", "ألم → آلية → CTA", "Pain → mechanism → CTA"),
    platform: L("פלטפורמת כאב-חולץ", "منصة ألم مستخرج", "Extracted-pain platform"),
    why: L("שומרת על חדות בלי תבניות SaaS גנריות", "تحافظ على الحدة بلا قوالب SaaS عامة", "Keeps sharpness without generic SaaS templates"),
    needs: ["problem"],
  },
  {
    id: "mechanism_not_slogan",
    name: L("מנגנון לא סלוגן", "آلية مش شعار", "Mechanism, not slogan"),
    hook: L("היתרון שחולץ הוא המנגנון", "الميزة المستخرجة هي الآلية", "The extracted advantage is the mechanism"),
    arc: L("מנגנון → משמעות → אתר", "آلية → معنى → موقع", "Mechanism → meaning → site"),
    platform: L("פלטפורמת מנגנון", "منصة آلية", "Mechanism platform"),
    why: L("מחדדת בידול ממה שסופק בלבד", "توضّح التميّز مما أُعطي فقط", "Sharpens differentiation from supplied facts only"),
    needs: ["advantage"],
  },
  {
    id: "no_price_theatre",
    name: L("בלי תיאטרון מחיר", "بلا مسرح سعر", "No price theatre"),
    hook: L("אין מחיר באתר? אין ₪ במודעה", "ما في سعر بالموقع؟ بلا ₪ بالإعلان", "No price on the site? No ₪ in the ad"),
    arc: L("יושרה → יתרון → CTA", "صدق → ميزة → CTA", "Integrity → advantage → CTA"),
    platform: L("פלטפורמת הצעה-או-יושרה", "منصة عرض أو صدق", "Offer-or-integrity platform"),
    why: L("מונעת המצאת תמחור", "تمنع اختراع تسعير", "Prevents invented pricing"),
  },
  {
    id: "device_still",
    name: L("פריים מכשיר", "فريمة جهاز", "Device still"),
    hook: L("לצלם מכשיר/שולחן — לא פנים מזוהות", "صوروا جهاز/مكتب — مش وجوه معروفة", "Film a device/desk — never identifiable faces"),
    arc: L("פריים → כאב → CTA", "فريمة → ألم → CTA", "Frame → pain → CTA"),
    platform: L("פלטפורמת ויז'ואל-מוצר", "منصة بصري المنتج", "Product-visual platform"),
    why: L("מגשרת על פערי תמונה בלי לייקים", "تسد فجوة الصورة بلا إعجابات", "Bridges photo gaps without likes"),
    needs: ["advantage"],
  },
  {
    id: "site_as_cta",
    name: L("האתר כ-CTA", "الموقع هو النداء", "Site as CTA"),
    hook: L("הערוץ שסופק הוא האתר — לא טיקטוק מדומה", "القناة المعطاة هي الموقع — مش تيك توك مختلق", "The stated channel is the site — no invented TikTok"),
    arc: L("הוק → יתרון → אתר", "خطاف → ميزة → موقع", "Hook → advantage → site"),
    platform: L("פלטפורמת ערוץ-מוצהר", "منصة قناة مصرّح بها", "Declared-channel platform"),
    why: L("מיישרת מדיה לערוץ שצוין", "توائم الميديا مع القناة المذكورة", "Fits media to the named channel"),
    needs: ["advantage"],
  },
  {
    id: "audience_as_written",
    name: L("קהל כמו שנכתב", "جمهور كما كُتب", "Audience as written"),
    hook: L("בלי «25–34» אם לא נכתב", "بلا «25–34» إن ما انكتب", "No “25–34” unless written"),
    arc: L("קהל → כאב → פעולה", "جمهور → ألم → فعل", "Audience → pain → action"),
    platform: L("פלטפורמת קהל-כנה", "منصة جمهور صادق", "Honest-audience platform"),
    why: L("מכבדת קליטה בלי פרסונות בדויות", "تحترم البيانات بلا شخصيات مختلقة", "Respects intake without invented personas"),
    needs: ["audience", "problem"],
  },
  {
    id: "gap_as_brief_product",
    name: L("הפער כבריף מוצר", "الفجوة كملخص منتج", "Gap as product brief"),
    hook: L("מה שחסר = רשימת צילום, לא ניחוש מדדים", "الناقص = قائمة تصوير، مش تخمين مقاييس", "What’s missing = a shoot list, not metric guessing"),
    arc: L("פער → מה לצלם → זווית", "فجوة → ماذا تصوّروا → زاوية", "Gap → what to film → angle"),
    platform: L("פלטפורמת בריף-פערים", "منصة ملخص الفجوات", "Gap-brief platform"),
    why: L("הופכת חוסרים לפעולות הפקה", "تحوّل النواقص لأفعال إنتاج", "Turns gaps into production moves"),
  },
  {
    id: "no_roas_product",
    name: L("בלי תיאטרון ROAS", "بلا مسرح ROAS", "No ROAS theatre"),
    hook: L("אין תקציב/CAC? אין תחזית", "ما في ميزانية/CAC؟ بلا توقّع", "No budget/CAC? No forecast"),
    arc: L("יושרה → מסר → CTA", "صدق → رسالة → CTA", "Integrity → message → CTA"),
    platform: L("פלטפורמת אנטי-מדדים", "منصة ضد المقاييس المختلقة", "Anti-invented-metrics platform"),
    why: L("כרטיס תכנון במקום ROAS בדוי", "بطاقة تخطيط بدل ROAS مختلق", "A planning card instead of fake ROAS"),
    needs: ["problem"],
  },
];

const GENERIC_PLATFORMS: PlatformSeed[] = [
  {
    id: "fact_first_spine",
    name: L("עמוד שדרה של עובדות", "عمود حقائق", "Fact-first spine"),
    hook: L("כל פריים = עובדה מהקליטה", "كل فريمة = حقيقة من البيانات", "Every frame = an intake fact"),
    arc: L("עובדה → משמעות → CTA", "حقيقة → معنى → CTA", "Fact → meaning → CTA"),
    platform: L("פלטפורמת עובדה-ראשונה", "منصة الحقيقة أولاً", "Fact-first platform"),
    why: L("מונעת תבניות סוכנות כשחסרים מספרים", "تمنع قوالب الوكالات عند نقص الأرقام", "Blocks agency templates when numbers are missing"),
  },
  {
    id: "gap_as_brief",
    name: L("הפער כבריף", "الفجوة كملخص عمل", "Gap as brief"),
    hook: L("מה שחסר = רשימת צילום, לא ניחוש מדדים", "الناقص = قائمة تصوير، مش تخمين مقاييس", "What’s missing = a shoot list, not metric guessing"),
    arc: L("פער → מה לצלם → זווית", "فجوة → ماذا تصوّروا → زاوية", "Gap → what to film → angle"),
    platform: L("פלטפורמת בריף-פערים", "منصة ملخص الفجوات", "Gap-brief platform"),
    why: L("הופכת חוסרים לפעולות הפקה", "تحوّل النواقص لأفعال إنتاج", "Turns gaps into production moves"),
  },
  {
    id: "channel_honest",
    name: L("ערוץ כנה", "قناة صادقة", "Honest channel"),
    hook: L("רק הערוצים שסופקו — בלי טיקטוק מדומה", "فقط القنوات المعطاة — بلا تيك توك مختلق", "Only channels you named — no invented TikTok"),
    arc: L("ערוץ → פורמט → CTA", "قناة → فورمات → CTA", "Channel → format → CTA"),
    platform: L("פלטפורמת ערוץ-מוצהר", "منصة قناة مصرّح بها", "Declared-channel platform"),
    why: L("מתאימה מדיה לערוצים שצוינו בקליטה", "توائم الميديا مع القنوات المذكورة", "Fits media to channels named in intake"),
    needs: ["whatsapp"],
  },
  {
    id: "place_gravity",
    name: L("כוח מקום", "جاذبية المكان", "Place gravity"),
    hook: L("המיקום הוא הגיבור כשיש כתובת", "الموقع هو البطل إن وُجد عنوان", "Place is the hero when an address exists"),
    arc: L("מקום → יתרון → ביקור", "مكان → ميزة → زيارة", "Place → edge → visit"),
    platform: L("פלטפורמת מקום-גיבור", "منصة مكان بطل", "Place-hero platform"),
    why: L("בונה זהות מקומית מכתובת אמת", "تبني هوية محلية من عنوان حقيقي", "Builds local identity from a real address"),
    needs: ["place"],
  },
  {
    id: "offer_or_integrity",
    name: L("הצעה או יושרה", "عرض أو صدق", "Offer or integrity"),
    hook: L("יש הצעה? מובילים בה. אין? יושרה במקום קופון", "في عرض؟ نقود فيه. ما في؟ صدق بدل كوبون", "Have an offer? Lead with it. None? Integrity over coupons"),
    arc: L("הצעה/אין → מסר → CTA", "عرض/لا → رسالة → CTA", "Offer/none → message → CTA"),
    platform: L("פלטפורמת הצעה-או-יושרה", "منصة عرض أو صدق", "Offer-or-integrity platform"),
    why: L("מונעת המצאת מחירים כשאין מבצע", "تمنع اختراع أسعار عند غياب عرض", "Prevents inventing prices when there is no offer"),
  },
  {
    id: "problem_mirror",
    name: L("מראת בעיה", "مرآة المشكلة", "Problem mirror"),
    hook: L("הבעיה שסופקה — במילים של הלקוח", "المشكلة المعطاة — بكلام الزبون", "The stated problem — in the customer’s words"),
    arc: L("בעיה → יתרון → פעולה", "مشكلة → ميزة → فعل", "Problem → advantage → action"),
    platform: L("פלטפורמת מראה", "منصة مرآة", "Mirror platform"),
    why: L("שומרת על חדות בלי תבניות כאב גנריות", "تحافظ على الحدة بلا قوالب ألم عامة", "Keeps sharpness without generic pain templates"),
    needs: ["problem"],
  },
  {
    id: "advantage_mechanism",
    name: L("מנגנון יתרון", "آلية الميزة", "Advantage mechanism"),
    hook: L("היתרון הוא המנגנון — לא סלוגן", "الميزة هي الآلية — مش شعار", "Advantage is the mechanism — not a slogan"),
    arc: L("יתרון → הוכחה אפשרית → CTA", "ميزة → إثبات ممكن → CTA", "Advantage → possible proof → CTA"),
    platform: L("פלטפורמת מנגנון", "منصة آلية", "Mechanism platform"),
    why: L("מחדדת בידול ממה שסופק בלבד", "توضّح التميّز مما أُعطي فقط", "Sharpens differentiation from supplied facts only"),
    needs: ["advantage"],
  },
  {
    id: "hours_pulse",
    name: L("דופק שעות", "نبض الساعات", "Hours pulse"),
    hook: L("שעות פתיחה כקצב קמפיין", "ساعات العمل كإيقاع حملة", "Opening hours as campaign rhythm"),
    arc: L("שעות → דחיפות אמת → ביקור", "ساعات → إلحاح حقيقي → زيارة", "Hours → real urgency → visit"),
    platform: L("פלטפורמת דופק-שעות", "منصة نبض الساعات", "Hours-pulse platform"),
    why: L("יוצרת קצב בלי «מבצע ל-24 שעות» מזויף", "إيقاع بلا عرض 24 ساعة مزيف", "Creates rhythm without fake 24-hour flash sales"),
    needs: ["hours"],
  },
];

function platformsFor(v: Vertical): PlatformSeed[] {
  if (v === "clinic") return CLINIC_PLATFORMS;
  if (v === "restaurant") return RESTAURANT_PLATFORMS;
  if (v === "retail") return RETAIL_PLATFORMS;
  if (v === "pool") return POOL_PLATFORMS;
  if (v === "school") return SCHOOL_PLATFORMS;
  if (v === "product") return PRODUCT_PLATFORMS;
  return GENERIC_PLATFORMS;
}

function cuisineBias(seed: PlatformSeed, intake: Intake): number {
  if (detectVertical(intake) !== "restaurant") return 0;
  const fam = foodFamily(intake);
  const olive = /olive|hummus|ceramic|table_ritual|mediterranean|square_neighbor|two_cover|tasting/.test(seed.id);
  const grill = /grill|steam|queue/.test(seed.id);
  if (fam === "mediterranean" && olive) return 28;
  if (fam === "mediterranean" && grill) return -8;
  if (fam === "grill" && grill) return 22;
  if (fam === "grill" && olive) return -12;
  if (fam === "pizza" && olive) return -30;
  if (fam === "pizza" && /grill|booking|steam/.test(seed.id)) return 18;
  return 0;
}

function hasOffer(intake: Intake): boolean {
  return filled(intake.offer) && !isNoOffer(intake.offer);
}

function factFlags(intake: Intake) {
  return {
    offer: hasOffer(intake),
    hours: filled(intake.clinicHours),
    place: filled(intake.location),
    whatsapp: filled(intake.whatsapp),
    advantage: filled(intake.uniqueAdvantage),
    walk_in: /walk_in|סדר הגעה|جت أولاً|arrival/i.test(intake.mainGoal) || intake.mainGoal === "walk_in",
    audience: filled(intake.audience),
    problem: filled(intake.biggestProblem),
  } as const;
}

function clampScore(n: number): number {
  return Math.max(1, Math.min(100, Math.round(n)));
}

function scoreDimensions(intake: Intake, seed: PlatformSeed): CmoScoreDimension[] {
  const f = factFlags(intake);
  const assets = (intake.mediaAssets ?? []).filter((a) => a.kind === "image").length;
  const channels = (intake.channelNotes || "").toLowerCase();

  const message = clampScore(
    42 +
      (f.problem ? 18 : 0) +
      (f.advantage ? 16 : 0) +
      (filled(intake.businessName) ? 10 : 0) +
      (filled(intake.description) ? 8 : 0),
  );
  const offer = clampScore(
    isFreeService(intake) && !f.offer
      ? 72 // integrity path — clarity of “no offer”
      : f.offer
        ? 88
        : 28,
  );
  const proof = clampScore(
    35 +
      (f.advantage ? 15 : 0) +
      (f.place ? 12 : 0) +
      (f.hours ? 10 : 0) +
      Math.min(20, assets * 5) -
      (seed.id.includes("star") || seed.id.includes("theatre") ? 0 : 0),
  );
  let channel = 40;
  if (f.whatsapp) channel += 20;
  if (/facebook|instagram|meta/.test(channels)) channel += 15;
  if (/tiktok/.test(channels)) channel += 8;
  if (f.place) channel += 10;
  channel = clampScore(channel);
  const creative = clampScore(
    38 +
      (f.advantage ? 12 : 0) +
      (f.problem ? 10 : 0) +
      Math.min(25, assets * 6) +
      (seed.needs?.includes("advantage") && f.advantage ? 8 : 0),
  );

  const dims: CmoScoreDimension[] = [
    {
      id: "message_clarity",
      label: SCORE_LABELS.message_clarity,
      score: message,
      note: L(
        f.problem && f.advantage ? "מסר נשען על בעיה+יתרון שסופקו." : "חסר בעיה או יתרון — לחדד בניסוח, לא במספרים.",
        f.problem && f.advantage ? "الرسالة تعتمد على مشكلة+ميزة معطاتين." : "نقص مشكلة أو ميزة — توضّح بالصياغة لا بالأرقام.",
        f.problem && f.advantage ? "Message rests on stated problem+advantage." : "Missing problem or advantage — sharpen wording, not numbers.",
      ),
    },
    {
      id: "offer_clarity",
      label: SCORE_LABELS.offer_clarity,
      score: offer,
      note: L(
        f.offer ? "הצעה מהקליטה — לא הומצאה." : isFreeService(intake) ? "שירות חינם / אין מבצע — בהירות יושרה גבוהה." : "אין הצעה — לא יומצא מחיר.",
        f.offer ? "عرض من البيانات — غير مختلق." : isFreeService(intake) ? "خدمة مجانية / بلا عرض — وضوح صدق عالٍ." : "لا عرض — لن يُخترع سعر.",
        f.offer ? "Offer from intake — not invented." : isFreeService(intake) ? "Free service / no offer — high integrity clarity." : "No offer — will not invent a price.",
      ),
    },
    {
      id: "proof_gaps",
      label: SCORE_LABELS.proof_gaps,
      score: proof,
      note: L(
        assets ? `יש ${assets} נכסי תמונה — עדיין בלי דירוגים מומצאים.` : "אין תמונות — לפצות בצילום מקום/מערכת גרפית, לא בלייקים.",
        assets ? `هناك ${assets} أصول صورة — بلا تقييمات مختلقة.` : "لا صور — عوّضوا بتصوير مكان/نظام غرافيك لا بإعجابات.",
        assets ? `${assets} image assets — still no invented ratings.` : "No photos — compensate with place film/graphic system, not likes.",
      ),
    },
    {
      id: "channel_fit",
      label: SCORE_LABELS.channel_fit,
      score: channel,
      note: L(
        f.whatsapp ? "וואטסאפ מסופק — מתאים ל-CTA מסר." : "וואטסאפ חסר — להוביל בביקור/אתר אם קיימים.",
        f.whatsapp ? "واتساب موجود — مناسب لـ CTA رسالة." : "واتساب ناقص — قودوا بزيارة/موقع إن وُجدا.",
        f.whatsapp ? "WhatsApp present — fits message CTA." : "WhatsApp missing — lead with visit/site if present.",
      ),
    },
    {
      id: "creative_variety",
      label: SCORE_LABELS.creative_variety,
      score: creative,
      note: L(
        "גיוון מתוכנן לפי זוויות הרעיון — לא לפי ROAS מדומה.",
        "تنوّع مخطّط حسب زوايا الفكرة — لا حسب ROAS مختلق.",
        "Variety planned from idea angles — not from fake ROAS.",
      ),
    },
  ];
  return dims;
}

function meanScore(dims: CmoScoreDimension[]): number {
  if (!dims.length) return 1;
  return clampScore(dims.reduce((s, d) => s + d.score, 0) / dims.length);
}

function seedFit(seed: PlatformSeed, flags: ReturnType<typeof factFlags>): number {
  if (!seed.needs?.length) return 50;
  let hit = 0;
  for (const n of seed.needs) if (flags[n]) hit += 1;
  return Math.round((hit / seed.needs.length) * 100);
}

/** Missing fields + concrete development moves — never invent numbers. */
export function gapCompensation(intake: Intake): CmoGapPlan {
  const missing: string[] = [];
  const moves: CmoGapMove[] = [];
  const v = detectVertical(intake);

  const push = (field: string, move: Tri) => {
    missing.push(field);
    moves.push({ missingField: field, move });
  };

  if (!filled(intake.businessName)) {
    push(
      "businessName",
      L("להשלים שם חוקי/מסחרי לפני פרסום.", "أكملوا الاسم القانوني/التجاري قبل النشر.", "Complete legal/trade name before publishing."),
    );
  }
  if (!filled(intake.location)) {
    push(
      "location",
      L(
        "לצלם חזית/רחוב (בלי פנים) ולהוביל בזווית מקום; גרפיקה: מפת רחוב סכמטית.",
        "صوّروا الواجهة/الشارع (بلا وجوه) وقودوا بزاوية مكان؛ غرافيك: خريطة شارع مبسّطة.",
        "Film facade/street (no faces) and lead with place angle; graphic: schematic street map.",
      ),
    );
  }
  if (!filled(intake.clinicHours)) {
    push(
      "clinicHours",
      L(
        "לבקש שעות אמת; בינתיים לפתוח בזווית «מתי להגיע» כשאלה, לא כלוח בדוי.",
        "اطلبوا ساعات حقيقية؛ مؤقتاً افتتحوا بزاوية «متى نجي» كسؤال لا كجدول مختلق.",
        "Ask for real hours; meanwhile open on “when to arrive” as a question — never a fake timetable.",
      ),
    );
  }
  if (!filled(intake.whatsapp) && !filled(intake.website)) {
    push(
      "whatsapp|website",
      L(
        "CTA ביקור פיזי / «כתבו לנו» כללי רק אם אין ערוץ; עדיף להשלים מספר.",
        "CTA زيارة فعلية / «راسلونا» عام فقط بلا قناة؛ الأفضل رقم.",
        "Physical-visit CTA / generic “write us” only if no channel; prefer adding a number.",
      ),
    );
  }
  if (!hasOffer(intake) && !isFreeService(intake)) {
    push(
      "offer",
      L(
        "אין הצעה — להוביל ביתרון/בעיה; לצלם מוצר/מקום; לא להמציא ₪ או %.",
        "لا عرض — قودوا بالميزة/المشكلة؛ صوّروا منتج/مكان؛ لا تخترعوا ₪ أو %.",
        "No offer — lead with advantage/problem; film product/place; invent no ₪ or %.",
      ),
    );
  }
  if (!filled(intake.uniqueAdvantage)) {
    push(
      "uniqueAdvantage",
      L(
        "לפתח זווית ממקום+שעות+תהליך אמיתי; גרפיקה: אייקון תהליך 3 שלבים בלי מדדים.",
        "طوّروا زاوية من مكان+ساعات+مسار حقيقي؛ غرافيك: أيقونة مسار 3 خطوات بلا مقاييس.",
        "Develop angle from place+hours+real process; graphic: 3-step process icon, no metrics.",
      ),
    );
  }
  if (!filled(intake.biggestProblem)) {
    push(
      "biggestProblem",
      L(
        "לראיין לקוח אחד למשפט כאב אמיתי; בינתיים הוק על «מה מחפשים לפני בחירה».",
        "حاوروا زبوناً واحداً لجملة ألم حقيقية؛ مؤقتاً خطاف «ماذا يبحثون قبل الاختيار».",
        "Interview one customer for a real pain line; meantime hook on “what people seek before choosing”.",
      ),
    );
  }
  if (!filled(intake.audience)) {
    push(
      "audience",
      L(
        "לא להמציא גיל/מגדר; לצלם שימוש/מקום ולהשאיר קהל כ«מקומיים».",
        "لا تخترعوا عمراً/جنساً؛ صوّروا استخداماً/مكاناً واتركوا الجمهور «محليين».",
        "Do not invent age/gender; film usage/place and keep audience as “locals”.",
      ),
    );
  }
  if (!(intake.mediaAssets ?? []).some((a) => a.kind === "image")) {
    push(
      "mediaAssets",
      L(
        v === "restaurant"
          ? "לצלם: אדים/קרמיקה/שולחן בחוץ ריק; מערכת גרפית זית-חול."
          : v === "retail"
            ? "לצלם: מתלה/בד/חלון ראווה ריק; פלטת חול-פשתן."
            : v === "clinic"
              ? "לצלם: חדר המתנה ריק/חזית/שעות על הדלת — בלי פני ילדים."
              : "לצלם מקום ריק + מערכת גרפית אנטי-גנרית לפי הקטגוריה.",
        v === "restaurant"
          ? "صوّروا: بخار/صحون/طاولة برا فاضية؛ نظام زيتون-رمل."
          : v === "retail"
            ? "صوّروا: سكة/قماش/واجهة فاضية؛ لوحة رمل-كتان."
            : v === "clinic"
              ? "صوّروا: غرفة انتظار فاضية/واجهة/ساعات على الباب — بلا وجوه أطفال."
              : "صوّروا مكاناً فارغاً + نظام غرافيك غير عام حسب الفئة.",
        v === "restaurant"
          ? "Film: steam/ceramics/empty outdoor table; olive-sand graphic system."
          : v === "retail"
            ? "Film: rail/fabric/empty vitrine; sand-linen palette."
            : v === "clinic"
              ? "Film: empty waiting room/facade/hours on the door — no children’s faces."
              : "Film empty place + anti-generic graphic system for the category.",
      ),
    );
  }
  if (!filled(intake.monthlyBudget)) {
    push(
      "monthlyBudget",
      L(
        "תקציב חסר — לתכנן 2–3 קריאייטיבים לומדים, בלי לחזות ROAS.",
        "الميزانية ناقصة — خطّطوا 2–3 إبداعات تعلّم بلا توقّع ROAS.",
        "Budget missing — plan 2–3 learning creatives; never forecast ROAS.",
      ),
    );
  }
  if (!filled(intake.targetCac)) {
    push(
      "targetCac",
      L(
        "CAC יעד חסר — לא יומצא; מדדי תכנון = בהירות מסר/הצעה בלבד.",
        "CAC المستهدف ناقص — لن يُخترع؛ مقاييس التخطيط = وضوح الرسالة/العرض فقط.",
        "Target CAC missing — will not invent; planning metrics = message/offer clarity only.",
      ),
    );
  }
  if (!intake.competitors?.length) {
    push(
      "competitors",
      L(
        "בלי שמות מתחרים — לא יומצאו; להתמקד ביתרון שלכם.",
        "بلا أسماء منافسين — لن تُخترع؛ ركّزوا على ميزتكم.",
        "No competitor names — will not invent any; focus on your advantage.",
      ),
    );
  }

  return { missing, moves };
}

function toIdea(intake: Intake, seed: PlatformSeed): CmoIdea {
  const scorecard = scoreDimensions(intake, seed);
  return {
    id: seed.id,
    name: seed.name,
    whyItWins: seed.why,
    hook: seed.hook,
    narrativeArc: seed.arc,
    platform: seed.platform,
    scorecard,
    planningScore: meanScore(scorecard),
  };
}

/**
 * Pick 3–5 distinctive ideas from vertical platforms using ONLY available facts
 * + structural creativity (no invented metrics).
 */
export function pickIdeas(intake: Intake, _locale: Locale = "he"): CmoIdea[] {
  const v = detectVertical(intake);
  const seeds = platformsFor(v);
  const flags = factFlags(intake);
  const ranked = [...seeds]
    .map((s) => ({
      s,
      fit: seedFit(s, flags) + cuisineBias(s, intake),
      salt: hashSalt(s.id + (intake.businessName || "")),
    }))
    .sort((a, b) => b.fit - a.fit || a.salt - b.salt);

  const picked: PlatformSeed[] = [];
  for (const row of ranked) {
    if (picked.length >= 5) break;
    // Prefer high fit, but always keep at least 3 even if facts are thin
    if (row.fit >= 40 || picked.length < 3) picked.push(row.s);
  }
  while (picked.length < 3 && ranked[picked.length]) {
    picked.push(ranked[picked.length]!.s);
  }
  return picked.slice(0, 5).map((s) => toIdea(intake, s));
}

function hashSalt(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function buildCmoIdeasPack(intake: Intake, locale: Locale = "he"): CmoIdeasPack {
  return {
    selected: pickIdeas(intake, locale),
    gapPlan: gapCompensation(intake),
    planningDisclaimer: L(
      "כרטיס תכנון CMO (1–100) — לא מדד ביצועים, לא ROAS, לא CAC, לא לייקים.",
      "بطاقة تخطيط CMO (1–100) — ليست أداءً، وليست ROAS ولا CAC ولا إعجابات.",
      "CMO planning scorecard (1–100) — not performance, not ROAS, not CAC, not likes.",
    ),
  };
}

/** One-line idea framing for spoken / calendar (locale string). */
export function ideaFramingLine(intake: Intake, locale: Locale, index = 0): string {
  const ideas = pickIdeas(intake, locale);
  const idea = ideas[index] ?? ideas[0];
  if (!idea) return "";
  const name = idea.name[locale] || idea.name.he;
  const why = idea.whyItWins[locale] || idea.whyItWins.he;
  return `${name} — ${why}`;
}

export function ideaNamesForLocale(intake: Intake, locale: Locale): string[] {
  return pickIdeas(intake, locale).map((i) => i.name[locale] || i.name.he);
}

/** Vertical platform catalog size helper (for QA). */
export function platformCount(vertical: Vertical): number {
  return platformsFor(vertical).length;
}
