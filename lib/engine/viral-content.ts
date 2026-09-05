/**
 * Viral desk engines — niche voice, 7 scripts, remix, trends, carousel, bios,
 * honest pre-publish analysis. Templates always work. No platform analytics.
 */
import type {
  BioPack,
  CarouselPack,
  CarouselSlide,
  Intake,
  Locale,
  RemixResult,
  TrendPack,
  Tri,
  VideoAnalysis,
  ViralScript,
  ViralScriptPack,
  ViralScriptStyle,
  VoiceProfile,
} from "../types";
import { filled } from "../utils";
import { isNoOffer } from "../no-offer";
import { spokenCta } from "./spoken";
import { emptyVoice, voiceFromIntake } from "./voice";

const L = (he: string, ar: string, en: string): Tri => ({ he, ar, en });

export const VIRAL_SCRIPT_STYLES: { id: ViralScriptStyle; name: Tri; hint: Tri }[] = [
  {
    id: "quiet_catalyst",
    name: L("הממריץ השקט", "المحفّز الهادئ", "Quiet catalyst"),
    hint: L("שקט, ודאות, בלי צעקה", "هدوء ويقين بلا صراخ", "Calm certainty — no shout"),
  },
  {
    id: "data",
    name: L("נתון", "رقم / معطى", "Data"),
    hint: L("רק מספר שסופק בקליטה", "رقم فقط إن وُجد في البيانات", "Only a number you typed"),
  },
  {
    id: "trend",
    name: L("טרנד", "ترند", "Trend"),
    hint: L("זווית נושא — לא גרף מדומה", "زاوية موضوع — مش رسم وهمي", "Topic angle — not a fake chart"),
  },
  {
    id: "story",
    name: L("סיפור", "قصة", "Story"),
    hint: L("סצנה קצרה מהעסק", "مشهد قصير من الشغل", "A short scene from the business"),
  },
  {
    id: "contrast",
    name: L("ניגוד", "تباين", "Contrast"),
    hint: L("לפני / אחרי מחשבה — בלי תוצאות בדויות", "قبل / بعد ذهني — بلا نتائج مختلقة", "Mental before/after — no fake results"),
  },
  {
    id: "proof",
    name: L("הוכחה כנה", "إثبات صادق", "Honest proof"),
    hint: L("רק מה שאפשר להגיד", "بس اللي فينا نقوله", "Only what we can actually say"),
  },
  {
    id: "direct",
    name: L("ישיר", "مباشر", "Direct"),
    hint: L("הוק + צעד אחד", "خطاف + خطوة", "Hook + one step"),
  },
];

const FAKE_METRIC =
  /\b(ROAS|CPA|CTR|Hook Rate|Avg Watch|Retention Curve|followers?|likes?)\b|לייקים|עוקבים|إعجابات|متابعين/i;

export function viralTextForbidden(text: string): boolean {
  return FAKE_METRIC.test(text);
}

function clip(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const br = Math.max(cut.lastIndexOf(" "), cut.lastIndexOf("،"), cut.lastIndexOf(","));
  return (br > max * 0.4 ? cut.slice(0, br) : cut).trim();
}

function nameOf(intake: Intake): string {
  return intake.businessName.trim() || "";
}

function placeOf(intake: Intake): string {
  return intake.location.trim() || "";
}

function ideaOf(intake: Intake, idea: string, locale: Locale): string {
  const raw = idea.trim();
  if (raw) return clip(raw, 180);
  const v = voiceFromIntake(intake);
  if (v.coreMessage) return clip(v.coreMessage, 180);
  if (v.niche) return clip(v.niche, 180);
  if (intake.uniqueAdvantage.trim()) return clip(intake.uniqueAdvantage, 180);
  if (locale === "ar") return "فكرة من بيانات النشاط — بلا اختراع";
  if (locale === "he") return "רעיון מנתוני העסק — בלי המצאה";
  return "An idea from the business facts — nothing invented";
}

function ctaOf(intake: Intake, locale: Locale): string {
  return spokenCta(intake, locale);
}

function missingFact(locale: Locale): string {
  if (locale === "ar") return "[يجب الاستكمال]";
  if (locale === "he") return "[יש להשלים]";
  return "[TO COMPLETE]";
}

function voiceLine(v: VoiceProfile, locale: Locale): string {
  if (v.personalVoice.trim()) return clip(v.personalVoice, 120);
  if (locale === "ar") return "بنفس أسلوبكم المكتوب — بلا شعار سلسلة";
  if (locale === "he") return "בסגנון שכתבתם — בלי סלוגן רשת";
  return "In the voice you wrote — no chain slogan";
}

function dialectNote(v: VoiceProfile, locale: Locale): string {
  if (locale !== "ar") return "";
  if (v.dialect === "ar-gulf") return "سجّلوا بالخليجي إن كان هذا لهجتكم.";
  if (v.dialect === "ar-msa") return "صياغة فصحى واضحة.";
  if (v.dialect === "ar-levant" || v.dialect === "") return "سجّلوا بالشامية إن كان هذا لهجتكم.";
  return "";
}

function hourBit(intake: Intake, locale: Locale): string {
  const h = intake.clinicHours.trim();
  if (!h) return "";
  if (locale === "ar") return `الساعات المعطاة: ${clip(h, 80)}.`;
  if (locale === "he") return `השעות שסופקו: ${clip(h, 80)}.`;
  return `Hours as given: ${clip(h, 80)}.`;
}

function offerBit(intake: Intake, locale: Locale): string {
  if (isNoOffer(intake.offer) || !intake.offer.trim()) {
    if (locale === "ar") return "ما في عرض مختلق.";
    if (locale === "he") return "אין מבצע מומצא.";
    return "No invented offer.";
  }
  return clip(intake.offer, 80);
}

function numberFromIntake(intake: Intake): string {
  const bits = [intake.avgOrderValue, intake.monthlyBudget, intake.targetCac, intake.whatsapp, intake.clinicHours]
    .map((s) => String(s || "").trim())
    .filter(Boolean);
  const withDigit = bits.find((s) => /\d/.test(s));
  return withDigit ? clip(withDigit, 60) : "";
}

function scriptFor(
  style: ViralScriptStyle,
  intake: Intake,
  idea: string,
  locale: Locale,
  v: VoiceProfile,
): ViralScript {
  const name = nameOf(intake) || missingFact(locale);
  const place = placeOf(intake);
  const cta = ctaOf(intake, locale);
  const voice = voiceLine(v, locale);
  const hours = hourBit(intake, locale);
  const offer = offerBit(intake, locale);
  const num = numberFromIntake(intake);
  const niche = v.niche || intake.category || name;
  const core = v.coreMessage || idea;
  const meta = VIRAL_SCRIPT_STYLES.find((s) => s.id === style)!;
  const dNote = dialectNote(v, locale);

  if (locale === "he") {
    const hooks: Record<ViralScriptStyle, string> = {
      quiet_catalyst: place ? `${place} — בלי רעש מיותר.` : `${name} — בלי רעש מיותר.`,
      data: num ? `נתון שסופק: ${num}` : `אין מספר בקליטה — לא נמציא אחוז.`,
      trend: `זווית השבוע ל«${clip(niche, 40)}» — לא גרף טרנדים חי.`,
      story: `סצנה אחת מ${name}.`,
      contrast: `לא עוד פוסט כללי. ${clip(core, 48)}`,
      proof: `מה כן אפשר להגיד על ${name} — בלי דירוגים.`,
      direct: clip(core, 52) || `${name} — צעד אחד.`,
    };
    const spoken: Record<ViralScriptStyle, string> = {
      quiet_catalyst: `${hooks.quiet_catalyst} ${clip(core, 90)}. ${voice} ${hours} ${offer}`.trim(),
      data: num
        ? `${hooks.data}. זה קלט שלכם — לא מדד פלטפורמה. ${clip(core, 70)}.`
        : `${hooks.data} ${clip(core, 80)}.`,
      trend: `${hooks.trend} רעיון: ${clip(idea, 80)}. בלי «הכי ויראלי עכשיו».`,
      story: `${name}${place ? ` ב${place}` : ""}. ${clip(core, 90)}. ${hours}`.trim(),
      contrast: `רוב הפוסטים מתארים. כאן המסר: ${clip(core, 80)}. ${voice}`,
      proof: `${name}: ${clip(intake.uniqueAdvantage || core, 90)}. בלי דירוגים ובלי מדדי רשת.`,
      direct: `${hooks.direct} ${cta}.`,
    };
    return {
      id: style,
      style: meta.name,
      hook: clip(hooks[style], 72),
      spoken: clip(spoken[style], 280),
      onScreen: clip(hooks[style], 48),
      cta,
      beats: [`0–2ש: ${clip(hooks[style], 40)}`, `2–10ש: ${clip(core, 50)}`, `10–15ש: ${cta}`],
    };
  }

  if (locale === "ar") {
    const hooks: Record<ViralScriptStyle, string> = {
      quiet_catalyst: place ? `${place} — بلا ضجيج زيادة.` : `${name} — بلا ضجيج زيادة.`,
      data: num ? `معطى موجود: ${num}` : `ما في رقم بالبيانات — مش حنختراع نسبة.`,
      trend: `زاوية هالأسبوع ل«${clip(niche, 40)}» — مش رسم ترندات حي.`,
      story: `مشهد واحد من ${name}.`,
      contrast: `مش منشور عام كمان. ${clip(core, 48)}`,
      proof: `شو فينا نقول عن ${name} — بلا تقييمات.`,
      direct: clip(core, 52) || `${name} — خطوة واحدة.`,
    };
    const spoken: Record<ViralScriptStyle, string> = {
      quiet_catalyst: `${hooks.quiet_catalyst} ${clip(core, 90)}. ${voice} ${hours} ${offer} ${dNote}`.trim(),
      data: num
        ? `${hooks.data}. هاد مدخل منكم — مش مقياس منصّة. ${clip(core, 70)}.`
        : `${hooks.data} ${clip(core, 80)}.`,
      trend: `${hooks.trend} الفكرة: ${clip(idea, 80)}. بلا «الأكثر انتشاراً الآن».`,
      story: `${name}${place ? ` في ${place}` : ""}. ${clip(core, 90)}. ${hours}`.trim(),
      contrast: `أغلب المنشورات توصف. هون الرسالة: ${clip(core, 80)}. ${voice}`,
      proof: `${name}: ${clip(intake.uniqueAdvantage || core, 90)}. بلا تقييمات وبلا مقاييس شبكة.`,
      direct: `${hooks.direct} ${cta}.`,
    };
    return {
      id: style,
      style: meta.name,
      hook: clip(hooks[style], 72),
      spoken: clip(spoken[style], 280),
      onScreen: clip(hooks[style], 48),
      cta,
      beats: [`0–2ث: ${clip(hooks[style], 40)}`, `2–10ث: ${clip(core, 50)}`, `10–15ث: ${cta}`],
    };
  }

  const hooks: Record<ViralScriptStyle, string> = {
    quiet_catalyst: place ? `${place} — no extra noise.` : `${name} — no extra noise.`,
    data: num ? `A number you supplied: ${num}` : `No number in intake — we will not invent a percent.`,
    trend: `This week’s angle for “${clip(niche, 40)}” — not a live trend chart.`,
    story: `One scene from ${name}.`,
    contrast: `Not another generic post. ${clip(core, 48)}`,
    proof: `What we can say about ${name} — no ratings.`,
    direct: clip(core, 52) || `${name} — one step.`,
  };
  const spoken: Record<ViralScriptStyle, string> = {
    quiet_catalyst: `${hooks.quiet_catalyst} ${clip(core, 90)}. ${voice} ${hours} ${offer}`.trim(),
    data: num
      ? `${hooks.data}. That is your input — not a platform metric. ${clip(core, 70)}.`
      : `${hooks.data} ${clip(core, 80)}.`,
    trend: `${hooks.trend} Idea: ${clip(idea, 80)}. No “most viral right now”.`,
    story: `${name}${place ? ` in ${place}` : ""}. ${clip(core, 90)}. ${hours}`.trim(),
    contrast: `Most posts describe. The message here: ${clip(core, 80)}. ${voice}`,
    proof: `${name}: ${clip(intake.uniqueAdvantage || core, 90)}. No star ratings, no vanity counts.`,
    direct: `${hooks.direct} ${cta}.`,
  };
  return {
    id: style,
    style: meta.name,
    hook: clip(hooks[style], 72),
    spoken: clip(spoken[style], 280),
    onScreen: clip(hooks[style], 48),
    cta,
    beats: [`0–2s: ${clip(hooks[style], 40)}`, `2–10s: ${clip(core, 50)}`, `10–15s: ${cta}`],
  };
}

export function buildViralScripts(intake: Intake, idea: string, locale: Locale, source: "template" | "gemini" = "template"): ViralScriptPack {
  const v = voiceFromIntake(intake);
  const resolved = ideaOf(intake, idea, locale);
  return {
    idea: resolved,
    locale,
    voice: v.niche || v.coreMessage || v.personalVoice ? v : { ...emptyVoice(), niche: intake.category || "" },
    scripts: VIRAL_SCRIPT_STYLES.map((s) => scriptFor(s.id, intake, resolved, locale, v)),
    source,
  };
}

export function buildCarouselPack(intake: Intake, idea: string, locale: Locale, source: "template" | "gemini" = "template"): CarouselPack {
  const v = voiceFromIntake(intake);
  const name = nameOf(intake) || missingFact(locale);
  const core = ideaOf(intake, idea, locale);
  const cta = ctaOf(intake, locale);
  const place = placeOf(intake);
  const hours = intake.clinicHours.trim();
  const adv = intake.uniqueAdvantage.trim() || v.coreMessage || core;
  const problem = intake.biggestProblem.trim();

  const slidesHe: CarouselSlide[] = [
    { index: 1, headline: clip(core, 42), body: clip(v.niche || intake.category || name, 90), visual: "כותרת גדולה + שם העסק. בלי מדדים." },
    { index: 2, headline: "למי זה", body: clip(intake.audience || problem || "הקהל שסופק בקליטה — בלי דמוגרפיה מומצאת.", 120), visual: "טקסט קצר. בלי פרצופים מומצאים." },
    { index: 3, headline: "המסר", body: clip(v.coreMessage || adv, 120), visual: "משפט אחד. סגנון הקול ששמרתם." },
    { index: 4, headline: "מה כן אפשר להגיד", body: clip(adv, 120), visual: "עובדה מהקליטה בלבד." },
    { index: 5, headline: hours ? "מתי" : place ? "איפה" : "הצעד", body: clip(hours || place || cta, 120), visual: hours || place ? "שעות / מקום שסופקו" : "CTA אמיתי" },
    { index: 6, headline: "הצעד הבא", body: cta, visual: "מספר / קישור שסופק — לא המצאה." },
  ];
  const slidesAr: CarouselSlide[] = [
    { index: 1, headline: clip(core, 42), body: clip(v.niche || intake.category || name, 90), visual: "عنوان كبير + اسم الشغل. بلا مقاييس." },
    { index: 2, headline: "لمين", body: clip(intake.audience || problem || "الجمهور المذكور بالبيانات — بلا ديموغرافيا مختلقة.", 120), visual: "نص قصير. بلا وجوه مختلقة." },
    { index: 3, headline: "الرسالة", body: clip(v.coreMessage || adv, 120), visual: "جملة واحدة. صوتكم المحفوظ." },
    { index: 4, headline: "شو فينا نقول", body: clip(adv, 120), visual: "حقيقة من البيانات فقط." },
    { index: 5, headline: hours ? "إيمتى" : place ? "وين" : "الخطوة", body: clip(hours || place || cta, 120), visual: hours || place ? "ساعات / مكان معطى" : "نداء حقيقي" },
    { index: 6, headline: "الخطوة الجاية", body: cta, visual: "رقم / رابط معطى — بلا اختراع." },
  ];
  const slidesEn: CarouselSlide[] = [
    { index: 1, headline: clip(core, 42), body: clip(v.niche || intake.category || name, 90), visual: "Big title + business name. No metrics." },
    { index: 2, headline: "For whom", body: clip(intake.audience || problem || "The audience in intake — no invented demographics.", 120), visual: "Short text. No invented faces." },
    { index: 3, headline: "The message", body: clip(v.coreMessage || adv, 120), visual: "One sentence. The saved voice." },
    { index: 4, headline: "What we can say", body: clip(adv, 120), visual: "Intake fact only." },
    { index: 5, headline: hours ? "When" : place ? "Where" : "The step", body: clip(hours || place || cta, 120), visual: hours || place ? "Hours / place as given" : "A real CTA" },
    { index: 6, headline: "Next step", body: cta, visual: "A number / link you supplied — nothing invented." },
  ];
  const slides = locale === "ar" ? slidesAr : locale === "he" ? slidesHe : slidesEn;
  const caption =
    locale === "ar"
      ? `${name}${place ? ` · ${place}` : ""}. ${clip(core, 100)} ${cta}`
      : locale === "he"
        ? `${name}${place ? ` · ${place}` : ""}. ${clip(core, 100)} ${cta}`
        : `${name}${place ? ` · ${place}` : ""}. ${clip(core, 100)} ${cta}`;
  return { locale, caption: clip(caption, 220), cta, slides, source };
}

export function buildBioPack(intake: Intake, locale: Locale, source: "template" | "gemini" = "template"): BioPack {
  const v = voiceFromIntake(intake);
  const name = nameOf(intake) || missingFact(locale);
  const place = placeOf(intake);
  const core = v.coreMessage || intake.uniqueAdvantage.trim() || v.niche || intake.category;
  const cta = ctaOf(intake, locale);
  const hours = intake.clinicHours.trim();
  const line = [name, place, clip(core, 70), hours ? clip(hours, 50) : "", cta].filter(Boolean).join(" · ");
  const ig = clip(line, 150);
  const tt = clip([name, clip(core, 40), cta].filter(Boolean).join(" · "), 80);
  const fb = clip(line, 100);
  const li = clip(
    locale === "ar"
      ? `${name}${place ? ` — ${place}` : ""}. ${clip(core, 90)}. ${cta}`
      : locale === "he"
        ? `${name}${place ? ` — ${place}` : ""}. ${clip(core, 90)}. ${cta}`
        : `${name}${place ? ` — ${place}` : ""}. ${clip(core, 90)}. ${cta}`,
    200,
  );
  const wa = clip([name, cta].filter(Boolean).join(" · "), 80);
  return { locale, instagram: ig, tiktok: tt, facebook: fb, linkedin: li, whatsapp: wa, source };
}

export function trendDisclaimer(locale: Locale, asOf: string): string {
  const day = asOf.slice(0, 10);
  if (locale === "ar") {
    return `اقتراحات زوايا كما في ${day} — مش رسم ترندات حي ولا ترتيب منصّات. من تخصّصكم + جيميني إن وُجد. بلا مشاهدات مختلقة.`;
  }
  if (locale === "he") {
    return `הצעות זווית נכון ל-${day} — לא גרף טרנדים חי ולא דירוג פלטפורמות. מהנישה שלכם + Gemini אם זמין. בלי צפיות בדויות.`;
  }
  return `Topic-angle suggestions as of ${day} — not a live trending chart and not a platform ranking. From your niche + Gemini if available. No invented view counts.`;
}

export function buildTrendPack(intake: Intake, locale: Locale, asOf = new Date().toISOString(), source: "template" | "gemini" = "template"): TrendPack {
  const v = voiceFromIntake(intake);
  const name = nameOf(intake) || missingFact(locale);
  const niche = v.niche || intake.category || name;
  const core = v.coreMessage || intake.uniqueAdvantage || niche;
  const place = placeOf(intake);
  const hours = intake.clinicHours.trim();

  const rowsHe = [
    { id: "hours", title: hours ? "שעות כגיבור" : "מתי בכלל אפשר", angle: hours || "חסרות שעות בקליטה — לא ננחש «השעה הכי טובה».", hook: hours ? `מתי באמת: ${clip(hours, 40)}` : "שאלו את עצמכם מתי אפשר להגיע — ואז כתבו את זה.", why: "זווית תפעולית מהעובדות, לא טרנד מדומה." },
    { id: "place", title: place ? "מקום ככותרת" : "מקום חסר", angle: place || "מיקום לא סופק.", hook: place ? `${place} — בלי «הכי טוב בעיר».` : "אל תמציאו שכונה.", why: "זהות מקומית רק אם נכתבה." },
    { id: "voice", title: "קול אישי", angle: v.personalVoice || "טון לא נשמר עדיין.", hook: clip(core, 48), why: "כל העתקה צריכה את הקול ששמרתם." },
    { id: "problem", title: "הכאב שסופק", angle: intake.biggestProblem || "בעיה לא סופקה.", hook: clip(intake.biggestProblem || core, 48), why: "PAS רק על כאב שכתבתם." },
    { id: "proof-gap", title: "פער הוכחה", angle: "אין דירוגים בקליטה — אל תמציאו.", hook: `מה כן: ${clip(core, 40)}`, why: "זווית כנה במקום כוכבים." },
    { id: "cta", title: "צעד אחד", angle: spokenCta(intake, "he"), hook: spokenCta(intake, "he"), why: "טרנד בלי CTA אמיתי הוא רעש." },
    { id: "niche", title: `נישה: ${clip(niche, 28)}`, angle: clip(core, 90), hook: clip(niche, 48), why: "כל זווית נשענת על הנישה ששמרתם." },
  ];
  const rowsAr = [
    { id: "hours", title: hours ? "الساعات هي البطل" : "إيمتى أصلاً", angle: hours || "الساعات ناقصة — مش حنخمّن «أفضل وقت».", hook: hours ? `إيمتى فعلاً: ${clip(hours, 40)}` : "اسألوا إيمتى فيكن تجوا — بعدين اكتبوا.", why: "زاوية تشغيل من الوقائع، مش ترند مختلق." },
    { id: "place", title: place ? "المكان عنوان" : "المكان ناقص", angle: place || "الموقع غير مذكور.", hook: place ? `${place} — بلا «الأفضل بالمدينة».` : "لا تخترعوا حي.", why: "هوية محلية فقط إن كُتبت." },
    { id: "voice", title: "صوت شخصي", angle: v.personalVoice || "النبرة بعد ما انحفظت.", hook: clip(core, 48), why: "كل نسخ لازم يتبع الصوت المحفوظ." },
    { id: "problem", title: "الألم المذكور", angle: intake.biggestProblem || "المشكلة غير مذكورة.", hook: clip(intake.biggestProblem || core, 48), why: "PAS على ألم كتبتموه فقط." },
    { id: "proof-gap", title: "فجوة إثبات", angle: "ما في تقييمات — لا تخترعوا.", hook: `شو في: ${clip(core, 40)}`, why: "زاوية صادقة بدل نجوم." },
    { id: "cta", title: "خطوة واحدة", angle: spokenCta(intake, "ar"), hook: spokenCta(intake, "ar"), why: "ترند بلا نداء حقيقي ضجيج." },
    { id: "niche", title: `التخصّص: ${clip(niche, 28)}`, angle: clip(core, 90), hook: clip(niche, 48), why: "كل زاوية تستند لتخصّصكم." },
  ];
  const rowsEn = [
    { id: "hours", title: hours ? "Hours as the hero" : "When can people actually come", angle: hours || "Hours missing — we will not guess a “best time to post”.", hook: hours ? `When, for real: ${clip(hours, 40)}` : "Ask when arrival is possible — then write that.", why: "An operations angle from facts, not a fake trend." },
    { id: "place", title: place ? "Place as headline" : "Place missing", angle: place || "Location not given.", hook: place ? `${place} — never “best in town”.` : "Do not invent a neighbourhood.", why: "Local identity only if you wrote it." },
    { id: "voice", title: "Personal voice", angle: v.personalVoice || "Tone not saved yet.", hook: clip(core, 48), why: "Every line should follow the saved voice." },
    { id: "problem", title: "The stated pain", angle: intake.biggestProblem || "Problem not given.", hook: clip(intake.biggestProblem || core, 48), why: "PAS only on a pain you typed." },
    { id: "proof-gap", title: "Proof gap", angle: "No ratings in intake — do not invent them.", hook: `What we can say: ${clip(core, 40)}`, why: "An honest angle instead of stars." },
    { id: "cta", title: "One step", angle: spokenCta(intake, "en"), hook: spokenCta(intake, "en"), why: "A trend with no real CTA is noise." },
    { id: "niche", title: `Niche: ${clip(niche, 28)}`, angle: clip(core, 90), hook: clip(niche, 48), why: "Every angle rests on the niche you saved." },
  ];
  const rows = locale === "ar" ? rowsAr : locale === "he" ? rowsHe : rowsEn;
  return {
    locale,
    asOf,
    disclaimer: trendDisclaimer(locale, asOf),
    angles: rows,
    source,
  };
}

export function remixNeedTranscript(locale: Locale, sourceUrl?: string): RemixResult {
  const note =
    locale === "ar"
      ? "ما فينا نشوف فيديو خاص أو محمي بتسجيل دخول. لزّقوا الكابشن / التفريغ أو رابطاً عاماً فيه نص ظاهر. مش حنقول إنّنا شاهدنا الفيديو."
      : locale === "he"
        ? "אי אפשר לראות סרטון פרטי או מאחורי התחברות. הדביקו כיתוב / תמלול, או קישור ציבורי עם טקסט גלוי. לא נטען שצפינו בסרטון."
        : "We cannot watch a private or login-walled video. Paste the caption / transcript, or a public URL with visible text. We will not claim we watched the video.";
  return { status: "need_transcript", locale, sourceUrl, note, source: "public_text" };
}

export function remixFromSource(
  intake: Intake,
  locale: Locale,
  opts: { sourceText: string; sourceUrl?: string; idea?: string; source?: RemixResult["source"] },
): RemixResult {
  const text = clip(opts.sourceText.replace(/\s+/g, " "), 400);
  if (!text || text.length < 12) return remixNeedTranscript(locale, opts.sourceUrl);
  const v = voiceFromIntake(intake);
  const idea = ideaOf(intake, opts.idea || v.coreMessage || text.slice(0, 80), locale);
  const pack = buildViralScripts(intake, idea, locale);
  const base = pack.scripts.find((s) => s.id === "quiet_catalyst") ?? pack.scripts[0];
  const hook =
    locale === "ar"
      ? `بنفس أسلوبكم — مش نسخ حرفي: ${clip(text, 40)}`
      : locale === "he"
        ? `בסגנון שלכם — לא העתקה מילולית: ${clip(text, 40)}`
        : `In your voice — not a verbatim copy: ${clip(text, 40)}`;
  const spoken =
    locale === "ar"
      ? `مصدر علني (نص ظاهر، مش مشاهدة ملف خاص): ${clip(text, 90)}. الرسالة: ${clip(idea, 70)}. ${spokenCta(intake, "ar")}`
      : locale === "he"
        ? `מקור גלוי (טקסט שפורסם, לא צפייה בקובץ פרטי): ${clip(text, 90)}. המסר: ${clip(idea, 70)}. ${spokenCta(intake, "he")}`
        : `Public source (visible text, not a private file watch): ${clip(text, 90)}. Message: ${clip(idea, 70)}. ${spokenCta(intake, "en")}`;
  const note =
    locale === "ar"
      ? "أُعيدت الصياغة من نص ظاهر / تفريغ لصقتموه. ما ادعينا مشاهدة فيديو خاص."
      : locale === "he"
        ? "הניסוח מחדש מטקסט גלוי / תמלול שהדבקתם. לא טענו שצפינו בסרטון פרטי."
        : "Rewritten from visible text / a transcript you pasted. We did not claim to watch a private video.";
  return {
    status: "ok",
    locale,
    publicText: text,
    sourceUrl: opts.sourceUrl,
    note,
    script: {
      ...base,
      hook: clip(hook, 72),
      spoken: clip(spoken, 280),
      onScreen: clip(hook, 48),
    },
    source: opts.source ?? "public_text",
  };
}

function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.min(100, Math.round(n)));
}

export function analysisDisclaimer(locale: Locale): string {
  if (locale === "ar") {
    return "تقدير تخطيط / هيوريستي (1–100) — مش Hook Rate ولا Avg Watch ولا Retention Curve من تيك توك/إنستغرام. بلا إعجابات وبلا ROAS.";
  }
  if (locale === "he") {
    return "הערכת תכנון / היוריסטית (1–100) — לא Hook Rate, לא Avg Watch ולא Retention Curve מטיקטוק/אינסטגרם. בלי לייקים ובלי ROAS.";
  }
  return "Planning / heuristic estimate (1–100) — not live TikTok/IG Hook Rate, Avg Watch %, or Retention Curve. No likes. No ROAS.";
}

export function buildVideoAnalysis(
  intake: Intake,
  locale: Locale,
  opts: {
    caption?: string;
    durationSec?: number;
    hasFrame?: boolean;
    fileName?: string;
    source?: "template" | "gemini";
  },
): VideoAnalysis {
  const v = voiceFromIntake(intake);
  const caption = String(opts.caption || "").trim();
  const hasCaption = caption.length >= 8;
  const duration = typeof opts.durationSec === "number" && opts.durationSec > 0 ? opts.durationSec : 0;
  const hasFrame = Boolean(opts.hasFrame);

  let hook = 42;
  let clarity = 40;
  let cta = 38;
  const notes: string[] = [];

  if (hasCaption) {
    hook += caption.length < 80 ? 18 : 8;
    if (/[?؟]|מה |شو |why |how /i.test(caption.slice(0, 60))) hook += 8;
    clarity += filled(v.coreMessage) && caption.includes(v.coreMessage.slice(0, 12)) ? 16 : 10;
    if (/(וואטסאפ|واتساب|whatsapp|התקש|כתבו|احجز|book)/i.test(caption)) cta += 16;
  } else {
    notes.push(
      locale === "ar"
        ? "ما في كابشن/تفريغ — التقدير أضعف. لزّقوا النص إن وُجد."
        : locale === "he"
          ? "אין כיתוב/תמלול — ההערכה חלשה יותר. הדביקו טקסט אם יש."
          : "No caption/transcript — the estimate is weaker. Paste text if you have it.",
    );
  }

  if (duration > 0 && duration <= 20) hook += 6;
  if (duration > 45) {
    hook -= 4;
    notes.push(
      locale === "ar"
        ? `المدّة ${Math.round(duration)} ث — أطول من سكربت قصير نموذجي. تقدير لا سرعة المنصّة.`
        : locale === "he"
          ? `משך ${Math.round(duration)} שנ׳ — ארוך מסקריפט קצר טיפוסי. זו לא מהירות פלטפורמה.`
          : `Duration ${Math.round(duration)}s — longer than a typical short script. Not a platform speed score.`,
    );
  }
  if (hasFrame) {
    clarity += 8;
    notes.push(
      locale === "ar"
        ? "اتحلّل إطار أول (صورة) — مش تشغيل التحليلات الحيّة."
        : locale === "he"
          ? "נותח פריים ראשון (תמונה) — לא אנליטיקס חי."
          : "A first frame (image) was reviewed — not live analytics.",
    );
  } else {
    notes.push(
      locale === "ar"
        ? "ما اتحلّل ملف الفيديو كفيديو خاص. الإطار اختياري."
        : locale === "he"
          ? "קובץ הווידאו לא «נצפה» כסרטון פרטי. פריים ראשון אופציונלי."
          : "The video file was not “watched” as a private film. A first frame is optional.",
    );
  }
  if (voiceIsHint(v)) {
    clarity += 8;
    notes.push(
      locale === "ar"
        ? `الصوت المحفوظ: ${clip(v.personalVoice || v.niche, 60)}`
        : locale === "he"
          ? `הקול שנשמר: ${clip(v.personalVoice || v.niche, 60)}`
          : `Saved voice: ${clip(v.personalVoice || v.niche, 60)}`,
    );
  }
  if (!spokenCta(intake, locale) || /TO COMPLETE|יש להשלים|يجب الاستكمال/.test(spokenCta(intake, locale))) {
    cta -= 6;
    notes.push(
      locale === "ar" ? "النداء ناقص في البيانات." : locale === "he" ? "חסר CTA בקליטה." : "CTA is missing in intake.",
    );
  } else {
    cta += 10;
  }

  notes.push(
    locale === "ar"
      ? " Hook potential / Clarity / CTA — تخطيط 1–100. مش Hook Rate ولا Avg Watch."
      : locale === "he"
        ? "Hook potential / Clarity / CTA — תכנון 1–100. לא Hook Rate ולא Avg Watch."
        : "Hook potential / Clarity / CTA — planning 1–100. Not Hook Rate. Not Avg Watch.",
  );

  return {
    kind: "planning_heuristic",
    locale,
    disclaimer: analysisDisclaimer(locale),
    hookPotential: clampScore(hook),
    clarity: clampScore(clarity),
    ctaClarity: clampScore(cta),
    notes,
    source: opts.source ?? "template",
    usedFrame: hasFrame,
    usedCaption: hasCaption,
  };
}

function voiceIsHint(v: VoiceProfile): boolean {
  return filled(v.personalVoice) || filled(v.niche);
}

export function packViralBlob(pack: {
  scripts?: ViralScriptPack;
  carousel?: CarouselPack;
  bios?: BioPack;
  trends?: TrendPack;
  remix?: RemixResult;
  analysis?: VideoAnalysis;
}): string {
  const parts: string[] = [];
  if (pack.scripts) {
    parts.push(pack.scripts.scripts.map((s) => `${s.hook}\n${s.spoken}\n${s.cta}`).join("\n"));
  }
  if (pack.carousel) {
    parts.push(pack.carousel.caption, pack.carousel.slides.map((s) => `${s.headline} ${s.body}`).join("\n"));
  }
  if (pack.bios) {
    parts.push(Object.values(pack.bios).filter((x) => typeof x === "string").join("\n"));
  }
  if (pack.trends) {
    parts.push(pack.trends.disclaimer, pack.trends.angles.map((a) => `${a.title} ${a.hook} ${a.why}`).join("\n"));
  }
  if (pack.remix) parts.push(pack.remix.note, pack.remix.script?.spoken ?? "");
  if (pack.analysis) parts.push(pack.analysis.disclaimer, pack.analysis.notes.join("\n"));
  return parts.join("\n");
}
