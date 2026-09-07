/**
 * Internal Creative Diversity — generate many strategy candidates, score, pick one.
 * Deterministic. No extra Vertex calls.
 */
import type {
  CmoIdea,
  CompleteAdLocale,
  CompleteAdScores,
  Intake,
  Locale,
  StrategyFamily,
  Tri,
} from "../../types";
import { isNoOffer } from "../../no-offer";
import { filled } from "../../utils";
import { detectVertical } from "../../vertical";
import { spokenCta } from "../spoken";
import { contradictsVertical } from "../campaign-brief";
import type { SourceLayers } from "./sources";
import { businessTruthBlob } from "./sources";
import { hasInventedCommercialClaim, proofAllowed } from "./facts";
import { noveltyAgainst } from "./fingerprint";
import type { CreativeFingerprint } from "../../types";

export const STRATEGY_FAMILIES: StrategyFamily[] = [
  "problem_led",
  "transformation",
  "proof",
  "educational",
  "authority",
  "objection",
  "comparison",
  "demo",
  "contrarian",
  "emotional",
  "social_proof",
  "curiosity",
  "reframing",
  "market_gap",
  "discovered",
];

const IDEA_FAMILY: Record<string, StrategyFamily> = {
  same_day_calm: "problem_led",
  parent_radar: "educational",
  hours_as_hero: "authority",
  street_trust: "authority",
  wa_triage_soft: "transformation",
  empty_chair_film: "demo",
  coverage_plain: "educational",
  two_lang_equal: "reframing",
  morning_rush_map: "problem_led",
  no_star_theatre: "contrarian",
  olive_table_ritual: "emotional",
  two_cover_tasting: "transformation",
  no_queue_mediterranean: "problem_led",
  grill_steam_reel: "demo",
  square_neighbor: "authority",
  hummus_open: "curiosity",
  friday_window: "curiosity",
  family_middle_table: "emotional",
  booking_before_plate: "objection",
  ceramic_system: "demo",
  quiet_fitting: "emotional",
  spring_soft_open: "curiosity",
  fabric_closeup: "demo",
  palm_street_vitrine: "authority",
  hold_via_wa: "transformation",
  everyday_elegant: "reframing",
  women_circle_soft: "social_proof",
  friday_browse: "curiosity",
  sand_palette: "demo",
  one_rack_story: "emotional",
  water_calm_lane: "problem_led",
  family_hydro_hour: "emotional",
  empty_lane_film: "demo",
  wa_pool_soft: "transformation",
  coverage_water_plain: "educational",
  problem_to_water: "problem_led",
  bilingual_pool: "reframing",
  no_miracle_claim: "contrarian",
  enroll_window: "authority",
  parent_trust_school: "authority",
  campus_place_hero: "authority",
  open_hours_school: "educational",
  empty_hall_film: "demo",
  wa_enroll_soft: "transformation",
  advantage_mechanism_school: "educational",
  bilingual_school: "reframing",
  pain_from_page: "problem_led",
  mechanism_not_slogan: "educational",
  no_price_theatre: "contrarian",
  device_still: "demo",
  site_as_cta: "transformation",
  audience_as_written: "authority",
  gap_as_brief_product: "market_gap",
  no_roas_product: "contrarian",
  cup_and_quiet: "emotional",
  neighbor_stool: "authority",
  hours_as_brew: "authority",
  empty_table_film: "demo",
  wa_table_soft: "transformation",
  no_best_coffee: "contrarian",
  fact_first_spine: "educational",
  gap_as_brief: "market_gap",
  channel_honest: "authority",
  place_gravity: "authority",
  offer_or_integrity: "contrarian",
  problem_mirror: "problem_led",
  advantage_mechanism: "educational",
  hours_pulse: "authority",
};

export function familyForIdeaId(id: string | undefined): StrategyFamily {
  if (id && IDEA_FAMILY[id]) return IDEA_FAMILY[id];
  if (!id) return "problem_led";
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return STRATEGY_FAMILIES[Math.abs(h) % STRATEGY_FAMILIES.length]!;
}

const L = (he: string, ar: string, en: string): Tri => ({ he, ar, en });

type FamilyCopy = {
  concept: Tri;
  why: Tri;
  angle: Tri;
  hook: Tri;
  headline: Tri;
  body: Tri;
  visual: Tri;
  format: Tri;
  platform: Tri;
};

function factOr(locale: Locale, value: string, fallback: Tri): string {
  if (value.trim()) return value.trim();
  return fallback[locale];
}

export function familyCopy(family: StrategyFamily, intake: Intake, idea?: CmoIdea): FamilyCopy {
  const name = intake.businessName.trim() || "—";
  const place = intake.location.trim();
  const problem = intake.biggestProblem.trim();
  const adv = intake.uniqueAdvantage.trim();
  const audience = intake.audience.trim();
  const hours = intake.clinicHours.trim();
  const offer = isNoOffer(intake.offer) ? "" : intake.offer.trim();
  const ideaHook = idea?.hook;
  const ideaName = idea?.name;
  const ideaWhy = idea?.whyItWins;

  const named = (he: string, ar: string, en: string) => L(he, ar, en);
  const withName = (he: string, ar: string, en: string) => named(`${name} — ${he}`, `${name} — ${ar}`, `${name} — ${en}`);

  switch (family) {
    case "problem_led":
      return {
        concept: named("זווית בעיה", "زاوية مشكلة", "Problem-led"),
        why: ideaWhy || named("מתחילים בכאב שסופק בקליטה — בלי להמציא כאב.", "نبدأ بالألم المعطى — بلا اختراع.", "Start from the stated pain — never invent one."),
        angle: ideaName || named("בעיה → צעד", "مشكلة → خطوة", "Pain → step"),
        hook: ideaHook || named(problem || "יש בעיה שכתבתם — נדבר עליה.", problem || "في مشكلة كتبتوها.", problem || "A problem you wrote — we speak to it."),
        headline: withName(problem || "בלי סיסמה ריקה", problem || "بلا شعار فاضي", problem || "No empty slogan"),
        body: named(
          [problem && `הבעיה: ${problem}`, adv && `מה שיש בפועל: ${adv}`, place && `איפה: ${place}`, "בלי הבטחות שלא נכתבו."].filter(Boolean).join(" "),
          [problem && `المشكلة: ${problem}`, adv && `الواقع: ${adv}`, place && `المكان: ${place}`].filter(Boolean).join(" "),
          [problem && `The problem: ${problem}`, adv && `What exists: ${adv}`, place && `Where: ${place}`, "No unwritten promises."].filter(Boolean).join(" "),
        ),
        visual: named("פריים של המקום / הבעיה הכתובה", "فريمة المكان / المشكلة المكتوبة", "Place frame / written problem"),
        format: named("מודעת פיד", "إعلان فيد", "Feed ad"),
        platform: named("פייסבוק / אינסטגרם", "فيسبوك / إنستغرام", "Facebook / Instagram"),
      };
    case "transformation":
      return {
        concept: named("לפני → אחרי (תהליך)", "قبل → بعد (مسار)", "Transformation"),
        why: ideaWhy || named("מסלול ברור מהמצב הכתוב לצעד אחד אמיתי.", "مسار واضح من الحالة المكتوبة لخطوة حقيقية.", "A clear path from the written state to one real step."),
        angle: ideaName || named("מסלול", "مسار", "Path"),
        hook: ideaHook || named("צעד אחד — לא סיפור קסם.", "خطوة واحدة — مش قصة سحر.", "One step — not a magic story."),
        headline: withName("צעד אחד ברור", "خطوة واحدة واضحة", "One clear step"),
        body: named(
          [audience && `למי: ${audience}`, adv && `איך: ${adv}`, intake.whatsapp && `וואטסאפ ${intake.whatsapp}`].filter(Boolean).join(" "),
          [audience && `لمن: ${audience}`, adv && `كيف: ${adv}`, intake.whatsapp && `واتساب ${intake.whatsapp}`].filter(Boolean).join(" "),
          [audience && `For: ${audience}`, adv && `How: ${adv}`, intake.whatsapp && `WhatsApp ${intake.whatsapp}`].filter(Boolean).join(" "),
        ),
        visual: named("שני פריימים: מצב → צעד", "فريمتان: حالة → خطوة", "Two frames: state → step"),
        format: named("סטורי / רילס קצר", "ستوري / ريلز", "Story / short reel"),
        platform: named("אינסטגרם / וואטסאפ", "إنستغرام / واتساب", "Instagram / WhatsApp"),
      };
    case "proof":
    case "social_proof": {
      const hasProof = proofAllowed({
        layer: "business_truth",
        name,
        category: intake.category,
        description: intake.description,
        location: place,
        website: intake.website,
        whatsapp: intake.whatsapp,
        hours,
        audience,
        problem,
        advantage: adv,
        offer,
        offerIsNone: isNoOffer(intake.offer),
        kupaFileBy: intake.kupaFileBy,
        kupaMemberFrom: intake.kupaMemberFrom,
        brandTone: "",
        brandPositioning: "",
        voiceNiche: "",
        voiceCore: "",
        voicePersonal: "",
        pastResults: intake.pastResults,
        avgOrderValue: "",
        marginPercent: "",
        targetCac: "",
        monthlyBudget: "",
      });
      return {
        concept: named("הוכחה", "إثبات", "Proof"),
        why: named(
          hasProof ? "רק הוכחה שסופקה בקליטה." : "אין הוכחה בקליטה — לא ממציאים עדות.",
          hasProof ? "إثبات فقط مما أُعطي." : "ما في إثبات — لن نخترع شهادة.",
          hasProof ? "Only proof supplied in intake." : "No proof in intake — we will not invent a testimonial.",
        ),
        angle: ideaName || named("עובדת מקום", "حقيقة مكان", "Place fact"),
        hook: ideaHook || named(place ? `${name} ב${place}` : name, place ? `${name} في ${place}` : name, place ? `${name} in ${place}` : name),
        headline: withName(place || "עובדות המקום", place || "حقائق المكان", place || "Place facts"),
        body: named(
          hasProof
            ? [adv, intake.pastResults, place].filter(Boolean).join(" ")
            : `${name}${place ? ` · ${place}` : ""}. בלי דירוגים או עדויות מומצאים.`,
          hasProof ? [adv, intake.pastResults, place].filter(Boolean).join(" ") : `${name}. بلا تقييمات مختلقة.`,
          hasProof ? [adv, intake.pastResults, place].filter(Boolean).join(" ") : `${name}. No invented ratings or testimonials.`,
        ),
        visual: named("שלט / כתובת / שעות", "لافتة / عنوان / ساعات", "Sign / address / hours"),
        format: named("מודעת פיד", "إعلان فيد", "Feed ad"),
        platform: named("פייסבוק", "فيسبوك", "Facebook"),
      };
    }
    case "educational":
      return {
        concept: named("חינוכי", "تعليمي", "Educational"),
        why: ideaWhy || named("מסבירים עובדה אחת מהקליטה.", "نشرح حقيقة واحدة من الإدخال.", "Explain one intake fact."),
        angle: ideaName || named("מה צריך לדעת", "شو لازم تعرفوا", "What to know"),
        hook: ideaHook || named(hours || adv || "עובדה אחת ברורה", hours || adv || "حقيقة واحدة", hours || adv || "One clear fact"),
        headline: withName(hours || adv || "עובדה, לא סיסמה", hours || adv || "حقيقة مش شعار", hours || adv || "A fact, not a slogan"),
        body: named(
          [hours && `שעות: ${hours}`, adv && adv, place && place].filter(Boolean).join(" — ") || name,
          [hours && `الساعات: ${hours}`, adv && adv, place && place].filter(Boolean).join(" — ") || name,
          [hours && `Hours: ${hours}`, adv && adv, place && place].filter(Boolean).join(" — ") || name,
        ),
        visual: named("לוח עובדות", "لوح حقائق", "Fact board"),
        format: named("קרוסלה 3 שקפים", "كاروسيل 3", "3-slide carousel"),
        platform: named("אינסטגרם", "إنستغرام", "Instagram"),
      };
    case "authority":
      return {
        concept: named("סמכות מקומית", "سلطة محلية", "Local authority"),
        why: ideaWhy || named("שם + מקום + מה שסופק. בלי «הכי טוב».", "اسم + مكان + ما أُعطي. بلا «الأفضل».", "Name + place + supplied facts. Never “best in town”."),
        angle: ideaName || named("זהות מקומית", "هوية محلية", "Local identity"),
        hook: ideaHook || named(place ? `${name} · ${place}` : name, place ? `${name} · ${place}` : name, place ? `${name} · ${place}` : name),
        headline: named(place ? `${name} · ${place}` : name, place ? `${name} · ${place}` : name, place ? `${name} · ${place}` : name),
        body: named(
          [adv, hours, intake.whatsapp && `וואטסאפ ${intake.whatsapp}`].filter(Boolean).join(" · ") || name,
          [adv, hours, intake.whatsapp && `واتساب ${intake.whatsapp}`].filter(Boolean).join(" · ") || name,
          [adv, hours, intake.whatsapp && `WhatsApp ${intake.whatsapp}`].filter(Boolean).join(" · ") || name,
        ),
        visual: named("חזית / שם העסק", "واجهة / اسم المحل", "Facade / business name"),
        format: named("מודעת פיד", "إعلان فيد", "Feed ad"),
        platform: named("פייסבוק / גוגל", "فيسبوك / غوغل", "Facebook / Google"),
      };
    case "objection":
      return {
        concept: named("התנגדות", "اعتراض", "Objection"),
        why: named("עונים להתנגדות בלי הנחה מומצאת.", "نرد على الاعتراض بلا خصم مختلق.", "Answer the objection without inventing a discount."),
        angle: named("מה עוצר", "شو بوقف", "What blocks"),
        hook: named("בלי הנחה אוטומטית", "بلا خصم أوتوماتيكي", "No automatic discount"),
        headline: withName("תשובה כנה", "جواب صادق", "An honest answer"),
        body: named(
          [problem && `אם ${problem}`, adv && `— אז ${adv}`, "לא ממציאים מחיר."].filter(Boolean).join(" "),
          [problem && `إذا ${problem}`, adv && `— فـ ${adv}`, "ما منخترع سعر."].filter(Boolean).join(" "),
          [problem && `If ${problem}`, adv && `— then ${adv}`, "No invented price."].filter(Boolean).join(" "),
        ),
        visual: named("טקסט ישיר, רקע נקי", "نص مباشر", "Direct type, clean ground"),
        format: named("מודעה קצרה", "إعلان قصير", "Short ad"),
        platform: named("סטורי", "ستوري", "Stories"),
      };
    case "comparison":
      return {
        concept: named("השוואה מבנית", "مقارنة هيكلية", "Structural comparison"),
        why: named("משווים מבנה — לא ממציאים מתחרה.", "نقارن بنية — بلا اختراع منافس.", "Compare structure — never invent a rival."),
        angle: named("מה שונה אצלכם", "شو المختلف عندكم", "What is different here"),
        hook: named(adv || "ההבדל שכתבתם", adv || "الفرق المكتوب", adv || "The difference you wrote"),
        headline: withName(adv || "הבדל אמיתי", adv || "فرق حقيقي", adv || "A real difference"),
        body: named(
          [adv || "יתרון מהקליטה בלבד.", "בלי שמות מתחרים שלא הזנתם."].join(" "),
          [adv || "ميزة من الإدخال فقط.", "بلا أسماء منافسين ما كتبتوها."].join(" "),
          [adv || "Advantage from intake only.", "No competitor names you did not enter."].join(" "),
        ),
        visual: named("שתי עמודות עובדה / לא", "عمودان حقيقة / لا", "Two columns: fact / not"),
        format: named("קרוסלה", "كاروسيل", "Carousel"),
        platform: named("אינסטגרם", "إنستغرام", "Instagram"),
      };
    case "demo":
      return {
        concept: named("הדגמה / מקום", "عرض / مكان", "Demo / place"),
        why: ideaWhy || named("מראים את המקום — לא פרצופים מומצאים.", "نُظهر المكان — بلا وجوه مختلقة.", "Show the place — no invented faces."),
        angle: ideaName || named("המקום עצמו", "المكان نفسه", "The place itself"),
        hook: ideaHook || named("תצלמו את החלל", "صوّروا المكان", "Film the space"),
        headline: withName(place || "המקום", place || "المكان", place || "The place"),
        body: named(
          [place && `מיקום: ${place}`, hours && `שעות: ${hours}`, "בלי עדויות מזויפות."].filter(Boolean).join(" "),
          [place && `الموقع: ${place}`, hours && `الساعات: ${hours}`].filter(Boolean).join(" "),
          [place && `Location: ${place}`, hours && `Hours: ${hours}`, "No fake testimonials."].filter(Boolean).join(" "),
        ),
        visual: named("חלל ריק / מוצר דומם", "مكان فاضي / منتج ساكن", "Empty room / still product"),
        format: named("רילס 15 שנ׳", "ريلز 15ث", "15s reel"),
        platform: named("רילס / טיקטוק", "ريلز / تيك توك", "Reels / TikTok"),
      };
    case "contrarian":
      return {
        concept: named("נגד הז׳רגון", "ضد الكلام الفارغ", "Contrarian"),
        why: named("מסרים שלא ממציאים ROAS, VIP, או «הכי טוב».", "بلا ROAS وVIP و«الأفضل».", "Copy that refuses ROAS, VIP, or “best”."),
        angle: named("בלי תיאטרון", "بلا مسرح", "No theatre"),
        hook: named("בלי כוכבים מומצאים", "بلا نجوم مختلقة", "No invented stars"),
        headline: withName("רק מה שנכון", "بس اللي صحيح", "Only what is true"),
        body: named(
          `${name}${place ? ` ב${place}` : ""}. מדברים בעובדות שכתבתם — בלי מדדים בדויים.`,
          `${name}. نحكي بالحقائق المكتوبة — بلا أرقام مختلقة.`,
          `${name}${place ? ` in ${place}` : ""}. Written facts only — no fake gauges.`,
        ),
        visual: named("טיפוגרפיה שחורה-צהובה", "طباعة سوداء-صفراء", "Black-yellow type"),
        format: named("מודעת טיפוגרפיה", "إعلان طباعي", "Type-led ad"),
        platform: named("פייסבוק", "فيسبوك", "Facebook"),
      };
    case "emotional":
      return {
        concept: named("רגשי", "عاطفي", "Emotional"),
        why: ideaWhy || named("רגש מהקהל/הבעיה שסופקו — לא מלודרמה רפואית מומצאת.", "عاطفة من الجمهور/المشكلة المعطاة.", "Emotion from the supplied audience/problem — no invented medical drama."),
        angle: ideaName || named("הרגש הכתוב", "العاطفة المكتوبة", "The written feeling"),
        hook: ideaHook || named(problem || audience || name, problem || audience || name, problem || audience || name),
        headline: withName(problem || audience || "בגובה העיניים", problem || audience || "ببساطة", problem || audience || "At eye level"),
        body: named(
          [audience && `ל${audience}`, problem && problem, place && place].filter(Boolean).join(" — ") || name,
          [audience && `لـ ${audience}`, problem && problem, place && place].filter(Boolean).join(" — ") || name,
          [audience && `For ${audience}`, problem && problem, place && place].filter(Boolean).join(" — ") || name,
        ),
        visual: named("אור רך, בלי פנים מזוהות", "ضوء هادئ بلا وجوه", "Soft light, no identifiable faces"),
        format: named("מודעת פיד", "إعلان فيد", "Feed ad"),
        platform: named("אינסטגרם", "إنستغرام", "Instagram"),
      };
    case "curiosity":
      return {
        concept: named("סקרנות", "فضول", "Curiosity"),
        why: named("שאלה שנשענת על עובדה — לא קליקבייט של מחיר.", "سؤال على حقيقة — مش كليكbait سعر.", "A question on a fact — not a price clickbait."),
        angle: named("שאלה", "سؤال", "Question"),
        hook: named(hours ? `מתי אפשר להגיע?` : place ? `איפה ${name}?` : `מי ${name}?`, hours ? `متى فينا نجي؟` : `مين ${name}؟`, hours ? `When can you arrive?` : `Who is ${name}?`),
        headline: named(hours ? `${name} — מתי?` : `${name} — שאלה אחת`, hours ? `${name} — متى؟` : `${name} — سؤال`, hours ? `${name} — when?` : `${name} — one question`),
        body: named(
          [hours && `שעות: ${hours}`, place && `מקום: ${place}`, adv && adv].filter(Boolean).join(" ") || name,
          [hours && `الساعات: ${hours}`, place && `المكان: ${place}`, adv && adv].filter(Boolean).join(" ") || name,
          [hours && `Hours: ${hours}`, place && `Place: ${place}`, adv && adv].filter(Boolean).join(" ") || name,
        ),
        visual: named("שאלה גדולה על הפריים", "سؤال كبير", "Big question on frame"),
        format: named("סטורי", "ستوري", "Story"),
        platform: named("אינסטגרם", "إنستغرام", "Instagram"),
      };
    case "reframing":
      return {
        concept: named("ריפריימינג", "إعادة إطار", "Reframing"),
        why: ideaWhy || named("אותה עובדה, מסגרת חדשה.", "نفس الحقيقة، إطار جديد.", "The same fact, a new frame."),
        angle: ideaName || named("מסגרת חדשה", "إطار جديد", "New frame"),
        hook: ideaHook || named(adv || "לא הסיסמה הרגילה", adv || "مش الشعار العادي", adv || "Not the usual slogan"),
        headline: withName(adv || "מסגרת אחרת", adv || "إطار ثاني", adv || "A different frame"),
        body: named(
          [adv, audience && `ל${audience}`, "בלי טענה חדשה שלא נכתבה."].filter(Boolean).join(" "),
          [adv, audience && `لـ ${audience}`].filter(Boolean).join(" "),
          [adv, audience && `For ${audience}`, "No new unwritten claim."].filter(Boolean).join(" "),
        ),
        visual: named("אותו מקום, זווית אחרת", "نفس المكان، زاوية ثانية", "Same place, other angle"),
        format: named("מודעת פיד", "إعلان فيد", "Feed ad"),
        platform: named("פייסבוק", "فيسبوك", "Facebook"),
      };
    case "market_gap":
    case "discovered":
      return {
        concept: named(family === "market_gap" ? "פער שוק (רק עם ראיה)" : "אסטרטגיה מגולה", family === "market_gap" ? "فجوة سوق (مع دليل)" : "استراتيجية مكتشفة", family === "market_gap" ? "Market gap (evidence only)" : "Discovered strategy"),
        why: named("מידע שוק משפיע על אסטרטגיה בלבד — לא על מחיר/תעודה.", "ذكاء السوق للاستراتيجية فقط.", "Market intel shapes strategy only — never price or credentials."),
        angle: ideaName || named("פער כנה", "فجوة صادقة", "Honest gap"),
        hook: ideaHook || named(adv || problem || name, adv || problem || name, adv || problem || name),
        headline: withName(adv || problem || "מה שחסר אצל אחרים לא יומצא", adv || problem || "الناقص عند غيرنا مش منخترعه", adv || problem || "We will not invent what others lack"),
        body: named(
          [adv, problem, "אם אין מקור — לא ממציאים סטטיסטיקה."].filter(Boolean).join(" "),
          [adv, problem, "إذا ما في مصدر — ما منخترع إحصاء."].filter(Boolean).join(" "),
          [adv, problem, "No source → no invented statistic."].filter(Boolean).join(" "),
        ),
        visual: named("מפה מקומית / עובדה", "خريطة محلية", "Local map / fact"),
        format: named("מודעת פיד", "إعلان فيد", "Feed ad"),
        platform: named("פייסבוק / חיפוש", "فيسبوك / بحث", "Facebook / Search"),
      };
    default:
      return familyCopy("problem_led", intake, idea);
  }
}

export interface ScoredCandidate {
  family: StrategyFamily;
  idea?: CmoIdea;
  locales: Record<Locale, CompleteAdLocale>;
  scores: CompleteAdScores;
}

function localePack(family: StrategyFamily, intake: Intake, idea: CmoIdea | undefined, locale: Locale, copy: FamilyCopy): CompleteAdLocale {
  const offer = isNoOffer(intake.offer) || !intake.offer.trim() ? undefined : intake.offer.trim();
  const proof = proofAllowed({
    layer: "business_truth",
    name: intake.businessName,
    category: intake.category,
    description: intake.description,
    location: intake.location,
    website: intake.website,
    whatsapp: intake.whatsapp,
    hours: intake.clinicHours,
    audience: intake.audience,
    problem: intake.biggestProblem,
    advantage: intake.uniqueAdvantage,
    offer: intake.offer,
    offerIsNone: isNoOffer(intake.offer),
    kupaFileBy: intake.kupaFileBy,
    kupaMemberFrom: intake.kupaMemberFrom,
    brandTone: "",
    brandPositioning: "",
    voiceNiche: "",
    voiceCore: "",
    voicePersonal: "",
    pastResults: intake.pastResults,
    avgOrderValue: "",
    marginPercent: "",
    targetCac: "",
    monthlyBudget: "",
  })
    ? (intake.pastResults.trim() || intake.uniqueAdvantage.trim() || undefined)
    : undefined;
  return {
    concept: copy.concept[locale],
    why: copy.why[locale],
    audience: intake.audience.trim() || factOr(locale, "", L("קהל לא צוין", "الجمهور غير مذكور", "Audience not specified")),
    angle: copy.angle[locale],
    hook: copy.hook[locale],
    headline: copy.headline[locale],
    copy: copy.body[locale],
    ...(offer ? { offer } : {}),
    ...(proof ? { proof } : {}),
    cta: spokenCta(intake, locale),
    visual: copy.visual[locale],
    format: copy.format[locale],
    platform: copy.platform[locale],
    imagePrompt: `${intake.businessName} ${copy.visual.en}`.trim(),
  };
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function scoreCandidate(
  family: StrategyFamily,
  intake: Intake,
  locales: Record<Locale, CompleteAdLocale>,
  layers: SourceLayers,
  history: CreativeFingerprint[],
  idea?: CmoIdea,
): CompleteAdScores {
  const vertical = detectVertical(intake);
  const blob = `${locales.he.headline} ${locales.he.copy} ${locales.en.headline} ${locales.en.copy}`;
  const truth = businessTruthBlob(layers.businessTruth);
  let relevance = 40;
  if (intake.businessName && blob.includes(intake.businessName.trim())) relevance += 25;
  if (intake.location && blob.includes(intake.location.trim())) relevance += 15;
  if (!contradictsVertical(blob, vertical)) relevance += 15;
  else relevance -= 40;

  let objective = 40;
  if (filled(intake.mainGoal)) objective += 25;
  if (family === "problem_led" && filled(intake.biggestProblem)) objective += 20;
  if (family === "authority" && filled(intake.location)) objective += 15;

  let audience = filled(intake.audience) ? 70 : 35;
  if (intake.audience && blob.toLowerCase().includes(intake.audience.trim().toLowerCase())) audience = 90;

  let evidence = 50;
  if (hasInventedCommercialClaim(blob, layers.businessTruth, intake)) evidence = 0;
  else if (truth && intake.businessName) evidence = 80;
  if (family === "proof" || family === "social_proof") {
    evidence = proofAllowed(layers.businessTruth) ? 85 : 20;
  }

  const fakeFp: CreativeFingerprint = {
    id: "score",
    businessId: "x",
    createdAt: "",
    family,
    ideaId: idea?.id,
    angle: locales.en.angle,
    hook: locales.en.hook,
    problem: "",
    promise: "",
    offer: locales.en.offer || "",
    proof: locales.en.proof || "",
    trigger: "",
    framing: family,
    cta: locales.en.cta,
    structure: locales.en.format,
    visual: locales.en.visual,
    format: locales.en.format,
    hash: `${family}:${idea?.id || ""}`,
  };
  const nov = noveltyAgainst(fakeFp, history);
  const novelty = nov.status === "original" ? 95 : nov.status === "evolved" ? 62 : 20;
  const familyHits = history.filter((h) => h.family === family).length;
  const saturation = clamp(100 - familyHits * 28);

  const headline = locales.he.headline || locales.en.headline;
  let clarity = headline.length > 8 && headline.length < 70 ? 80 : 50;
  if (/\[יש להשלים\]|\[TO COMPLETE\]|\[يجب الاستكمال\]/.test(headline) && filled(intake.businessName)) clarity -= 25;

  let persuasion = 45;
  if (filled(intake.biggestProblem) || filled(intake.uniqueAdvantage)) persuasion += 20;
  if (locales.he.cta.trim()) persuasion += 15;

  const platform = 70;
  const factualSafety = evidence === 0 ? 0 : 90;
  let marketOpportunity = 50;
  if (family === "market_gap" || family === "discovered") {
    marketOpportunity = layers.marketIntel.notes.length ? 75 : 25;
  }

  const parts = {
    relevance: clamp(relevance),
    objective: clamp(objective),
    audience: clamp(audience),
    evidence: clamp(evidence),
    novelty: clamp(novelty),
    clarity: clamp(clarity),
    persuasion: clamp(persuasion),
    platform: clamp(platform),
    factualSafety: clamp(factualSafety),
    saturation: clamp(saturation),
    marketOpportunity: clamp(marketOpportunity),
  };
  const total = clamp(
    parts.relevance * 0.12 +
      parts.objective * 0.08 +
      parts.audience * 0.08 +
      parts.evidence * 0.12 +
      parts.novelty * 0.12 +
      parts.clarity * 0.08 +
      parts.persuasion * 0.08 +
      parts.platform * 0.05 +
      parts.factualSafety * 0.15 +
      parts.saturation * 0.07 +
      parts.marketOpportunity * 0.05,
  );
  return { ...parts, total };
}

export function buildCandidates(
  intake: Intake,
  layers: SourceLayers,
  ideas: CmoIdea[],
  history: CreativeFingerprint[],
): ScoredCandidate[] {
  const ideaByFamily = new Map<StrategyFamily, CmoIdea>();
  for (const idea of ideas) {
    const fam = familyForIdeaId(idea.id);
    if (!ideaByFamily.has(fam)) ideaByFamily.set(fam, idea);
  }
  const out: ScoredCandidate[] = [];
  for (const family of STRATEGY_FAMILIES) {
    if ((family === "proof" || family === "social_proof") && !proofAllowed(layers.businessTruth)) {
      // still generate — copy stays honest / no invented testimonial
    }
    if ((family === "market_gap" || family === "discovered") && !layers.marketIntel.notes.length) {
      // generate with explicit no-invention body
    }
    const idea = ideaByFamily.get(family) ?? ideas[0];
    const copy = familyCopy(family, intake, idea);
    const locales: Record<Locale, CompleteAdLocale> = {
      he: localePack(family, intake, idea, "he", copy),
      ar: localePack(family, intake, idea, "ar", copy),
      en: localePack(family, intake, idea, "en", copy),
    };
    const scores = scoreCandidate(family, intake, locales, layers, history, idea);
    out.push({ family, idea, locales, scores });
  }
  return out.sort((a, b) => b.scores.total - a.scores.total || a.family.localeCompare(b.family));
}

export function pickWinner(
  candidates: ScoredCandidate[],
  minSafety = 50,
): ScoredCandidate | undefined {
  return candidates.find((c) => c.scores.factualSafety >= minSafety && c.scores.evidence > 0) ?? candidates[0];
}
