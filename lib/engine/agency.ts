import type {
  AgencyPack,
  CampaignPack,
  FactoryPiece,
  Intake,
  Locale,
  Tri,
} from "../types";
import { isNoOffer } from "../no-offer";
import { filled } from "../utils";
import {
  ADVANTAGE_CHIPS,
  GOAL_CHIPS,
  OFFER_CHIPS,
  audienceChipsFor,
  defaultOfferLabel,
  resolveChipLabel,
} from "../chips";
import { isWalkIn, landingBody, rsaLines, spokenCta, whatsappScript, hoursLine, kupaLine, landingH1 } from "./spoken";
import { canonicalDoctorName } from "../demo";
import { coverageFactLine, isClalitCoverageFact, isFreeService, problemChipsFor } from "../operating-model";
import { bofWalkLine, landingVisualLine, smsWalkLine } from "../vertical";
import { brandNote, paletteForIntake } from "../brand-kit";

const L = (he: string, ar: string, en: string): Tri => ({ he, ar, en });

function n(i: Intake) {
  return canonicalDoctorName(i.businessName.trim()) || "—";
}

export function buildAgency(pack: Pick<CampaignPack, "intake" | "intakeReport" | "diagnosis" | "media" | "optimizer" | "variants">): AgencyPack {
  const i = pack.intake;
  const name = n(i);
  const audChips = audienceChipsFor(i);
  const painChips = problemChipsFor(i);
  const audHe = resolveChipLabel(i.audience, audChips, "he") || "—";
  const audAr = resolveChipLabel(i.audience, audChips, "ar") || "—";
  const audEn = resolveChipLabel(i.audience, audChips, "en") || "—";
  const painHe = resolveChipLabel(i.biggestProblem, painChips, "he") || "—";
  const painAr = resolveChipLabel(i.biggestProblem, painChips, "ar") || "—";
  const painEn = resolveChipLabel(i.biggestProblem, painChips, "en") || "—";
  const advHe = resolveChipLabel(i.uniqueAdvantage, ADVANTAGE_CHIPS, "he") || "—";
  const advAr = resolveChipLabel(i.uniqueAdvantage, ADVANTAGE_CHIPS, "ar") || "—";
  const advEn = resolveChipLabel(i.uniqueAdvantage, ADVANTAGE_CHIPS, "en") || "—";
  const goalHe = resolveChipLabel(i.mainGoal, GOAL_CHIPS, "he") || "—";
  const goalAr = resolveChipLabel(i.mainGoal, GOAL_CHIPS, "ar") || "—";
  const goalEn = resolveChipLabel(i.mainGoal, GOAL_CHIPS, "en") || "—";
  const offerHe = isNoOffer(i.offer) ? defaultOfferLabel("he") : resolveChipLabel(i.offer, OFFER_CHIPS, "he");
  const offerAr = isNoOffer(i.offer) ? defaultOfferLabel("ar") : resolveChipLabel(i.offer, OFFER_CHIPS, "ar");
  const offerEn = isNoOffer(i.offer) ? defaultOfferLabel("en") : resolveChipLabel(i.offer, OFFER_CHIPS, "en");
  const aud = audHe;
  const pain = painHe;
  const adv = advHe;
  const goal = goalHe;
  const loc = i.location || "";
  const noOffer = isNoOffer(i.offer);
  const ctaHe = spokenCta(i, "he");
  const ctaAr = spokenCta(i, "ar");
  const ctaEn = spokenCta(i, "en");

  const unknowns: string[] = [];
  if (!filled(i.location) && i.type !== "app") unknowns.push("location");
  if (!filled(i.monthlyBudget)) unknowns.push("budget");
  if (!filled(i.targetCac)) unknowns.push("cac");
  if (!i.competitors.length) unknowns.push("competitors");

  const personas = [
    {
      name: L("פרסונה א׳ — ליבה", "شخصية أ — النواة", "Persona A — core"),
      jtbd: L(
        `כש${aud} נתקלים ב: ${pain} — הם רוצים ${goal} בלי להרגיש מטופלים כמספר.`,
        `عندما يواجه ${audAr}: ${painAr} — يريدون ${goalAr} دون الشعور برقم.`,
        `When ${audEn} hit: ${painEn} — they want ${goalEn} without feeling like a number.`,
      ),
      given: L(`מתוך הקליטה: ${audHe}. ${loc || "מיקום לא סופק."}`, `من البيانات: ${audAr}. ${loc || "الموقع غير مذكور."}`, `From intake: ${audEn}. ${loc || "Location not given."}`),
      unknown: L(
        unknowns.length ? `חסר: ${unknowns.join(", ")} — לא הומצא.` : "אין דמוגרפיה שהומצאה מעבר לקליטה.",
        unknowns.length ? `ناقص: ${unknowns.join(", ")}.` : "لا ديموغرافيا مختلقة.",
        unknowns.length ? `Missing: ${unknowns.join(", ")} — not invented.` : "No demographics invented beyond intake.",
      ),
    },
    {
      name: L("פרסונה ב׳ — דוחה החלטה", "شخصية ب — يؤجّل", "Persona B — delayer"),
      jtbd: L(
        "רוצה ביטחון לפני תור/רכישה. JTBD: להפחית סיכון, לא «לצרוך תוכן».",
        "يريد أماناً قبل الموعد. JTBD: تقليل الخطر.",
        "Wants safety before booking. JTBD: reduce risk, not “consume content”.",
      ),
      given: L(`בעיה שסופקה: ${painHe}`, `المشكلة المعطاة: ${painAr}`, `Stated problem: ${painEn}`),
      unknown: L("גיל מדויק לא סופק — לא נקבע 25–45 כברירת מחדל.", "العمر الدقيق غير مذكور — لن نفترض 25–45.", "Exact age not given — will not default to 25–45."),
    },
    {
      name: L("פרסונה ג׳ — ממליץ / קובע לאחר", "شخصية ج — يوصي / يحجز لغيره", "Persona C — booker for someone else"),
      jtbd: L(
        `כשמישהו מהמעגל של ${aud} צריך ${goal} — הפרסונה הזו קובעת בשמם.`,
        `عندما يحتاج أحد دائرة ${audAr} إلى ${goalAr} — هذه الشخصية تحجز باسمهم.`,
        `When someone in ${audEn}’s circle needs ${goalEn} — this person books on their behalf.`,
      ),
      given: L(`קהל שסופק: ${audHe}. מטרה: ${goalHe}.`, `الجمهور المعطى: ${audAr}. الهدف: ${goalAr}.`, `Stated audience: ${audEn}. Goal: ${goalEn}.`),
      unknown: L("אין רשימת מפנים בקליטה — לא יומצא «שגריר מותג».", "لا قائمة محيلين — لن يُخترع سفير علامة.", "No referrer list in intake — no invented brand ambassador."),
    },
  ];

  const battlecards = i.competitors.map((c) => ({
    competitorId: c.id,
    name: c.name,
    notes: c.notes,
    strength: L(
      c.notes ? `מה שציינתם עליהם: ${c.notes}` : "לא צוין חוזק — לא נוסיף «מותג חזק» סתם.",
      c.notes ? `ما ذكرتموه: ${c.notes}` : "لم يُذكر قوة — لن نُضف «علامة قوية».",
      c.notes ? `What you noted: ${c.notes}` : "No strength given — will not add “strong brand” for flavor.",
    ),
    weakness: L(
      `מול ${name}: היתרון שלכם שסופק הוא ${adv}. חולשתם לא נמדדה — אין ניחוש.`,
      `مقابل ${name}: ميزتكم المعطاة ${advAr}. ضعفهم غير مقيس.`,
      `Vs ${name}: your stated edge is ${advEn}. Their weakness was not measured — no guess.`,
    ),
    opportunity: L(`קהל ${audHe}${loc ? " ב" + loc : ""} — אם הם לא מכסים את ${advHe}.`, `جمهور ${audAr}${loc ? " في " + loc : ""}.`, `Audience ${audEn}${loc ? " in " + loc : ""} — if they don’t cover ${advEn}.`),
    threat: L("אל תעתיקו מבצע שלהם אם לא תיעדתם אותו.", "لا تنسخوا عرضهم إن لم توثّقوه.", "Don’t copy their offer unless you documented it."),
  }));

  const discovery = {
    producedBy: ["intake", "diagnostic"] as AgencyPack["discovery"]["producedBy"],
    audit: [
      { title: L("מודל", "النموذج", "Model"), body: L(
        isFreeService(i)
          ? (i.businessModel || "שירות חינם — חשיפה בלבד. אין סגירת כסף מהלקוח.")
          : (i.businessModel || "לא סופק — Intake מסרב לנחש איך נסגר כסף."),
        isFreeService(i)
          ? (i.businessModel || "خدمة مجانية — تعرّض فقط. ما في إغلاق فلوس من الزبون.")
          : (i.businessModel || "غير متوفر."),
        isFreeService(i)
          ? (i.businessModel || "Free service — exposure only. No money closes from the client.")
          : (i.businessModel || "Not given — Intake refuses to guess how money closes."),
      ) },
      { title: L("יחידה כלכלית", "وحدة الاقتصاد", "Unit economics"), body: L(
        `AOV ${i.avgOrderValue || "חסר"} · מרווח ${i.marginPercent || "חסר"}% · CAC יעד ${i.targetCac || "חסר"} · תקציב ${i.monthlyBudget || "חסר"}.`,
        `AOV ${i.avgOrderValue || "ناقص"} · هامش ${i.marginPercent || "ناقص"} · CAC ${i.targetCac || "ناقص"} · ميزانية ${i.monthlyBudget || "ناقص"}.`,
        `AOV ${i.avgOrderValue || "missing"} · margin ${i.marginPercent || "missing"}% · target CAC ${i.targetCac || "missing"} · budget ${i.monthlyBudget || "missing"}.`,
      ) },
      { title: L("היסטוריה", "التاريخ", "History"), body: L(i.pastAds || "אין מודעות קודמות בקליטה.", i.pastAds || "لا إعلانات سابقة.", i.pastAds || "No past ads in intake.") },
      { title: L("אבחון", "التشخيص", "Diagnosis"), body: pack.diagnosis.summary },
    ],
    icp: L(
      `ICP = ${aud}${loc ? " · " + loc : ""}. לא «כולם באזור».`,
      `ICP = ${aud}${loc ? " · " + loc : ""}.`,
      `ICP = ${audEn}${loc ? " · " + loc : ""}. Not “everyone nearby”.`,
    ),
    personas,
    battlecards,
    swot: {
      strength: L(`חוזק שסופק: ${advHe}`, `قوة معطاة: ${advAr}`, `Stated strength: ${advEn}`),
      weakness: L(
        i.whatFailed || "חולשה תפעולית לא סופקה — לא נכתוב «אין נוכחות דיגיטלית» סתם.",
        i.whatFailed || "ضعف تشغيلي غير مذكور.",
        i.whatFailed || "Operational weakness not supplied — will not write “no digital presence” for flavor.",
      ),
      opportunity: L(
        `קהל ${aud}${loc ? " ב" + loc : ""}. מטרה: ${goal}.`,
        `جمهور ${audAr}${loc ? " في " + loc : ""}. الهدف: ${goalAr}.`,
        `Audience ${audEn}${loc ? " in " + loc : ""}. Goal: ${goalEn}.`,
      ),
      threat: i.competitors.length
        ? L(
            `מתחרים שתיעדתם: ${i.competitors.map((c) => c.name).join(" · ")}. בלי דירוגים שלא נמדדו.`,
            `منافسون وثّقتموهم: ${i.competitors.map((c) => c.name).join(" · ")}.`,
            `Competitors you documented: ${i.competitors.map((c) => c.name).join(" · ")}. No unmeasured ratings.`,
          )
        : L("איום תחרותי לא תועד. אין SWOT מתחרה בדוי.", "تهديد المنافسة غير موثّق.", "Competitive threat not documented. No fake competitor SWOT."),
    },
    competitorsMissing: i.competitors.length
      ? L(`${i.competitors.length} מתחרים שסיפקתם. לא נוספו שמות נוספים.`, `${i.competitors.length} منافسين أعطيتموهم.`, `${i.competitors.length} competitor(s) you supplied. No extra names added.`)
      : L("לא הוזנו מתחרים. אין SWOT בדוי. הוסיפו מתחרים שראיתם בשלב הסקירה.", "لا منافسين. لا SWOT مختلق. أضيفوا من رأيتموهم في المراجعة.", "No competitors entered. No fake SWOT. Add competitors you observed on the review step."),
  };

  const magnet = noOffer || isFreeService(i)
    ? L(
        isFreeService(i)
          ? "מגנט לחשיפה: דף «איך מגיעים / הרשמה». אין מחיר, אין קופון, אין ייעוץ חינם כמבצע."
          : "מגנט מומלץ ליצירה (לא קיים עדיין): דף הכנה לביקור/שיחה ראשונה. אין ייעוץ חינם ואין הנחה — אין מבצע.",
        isFreeService(i)
          ? "مغناطيس تعرّض: صفحة «كيف تجوا / تسجيل». بلا سعر وبلا كوبون."
          : "مغناطيس مقترح للإنشاء (غير موجود بعد): صفحة تحضير للزيارة. لا استشارة مجانية — لا عرض.",
        isFreeService(i)
          ? "Exposure magnet: a how-to-arrive / registration page. No price, no coupon, no free-consult promo."
          : "Recommended magnet to create (does not exist yet): a first-visit prep sheet. No free consult, no discount — no offer.",
      )
    : L(`מגנט קשור להצעה שסיפקתם: ${offerHe}. לא נרחיב מעבר לזה.`, `المغناطيس مرتبط بعرضكم: ${offerAr}.`, `Magnet tied to the offer you supplied: ${offerEn}. We will not expand it.`);

  const strategy = {
    producedBy: ["strategic"] as AgencyPack["strategy"]["producedBy"],
    positioning: i.brandPositioning?.trim()
      ? L(i.brandPositioning.trim(), i.brandPositioning.trim(), i.brandPositioning.trim())
      : L(
      `${name} ל${aud}: ${adv}. לא «הכי טוב בשוק».`,
      `${name} لـ ${audAr}: ${advAr}.`,
      `${name} for ${audEn}: ${advEn}. Not “best in market”.`,
    ),
    uniqueMechanism: L(
      isFreeService(i) && isClalitCoverageFact(i)
        ? `${coverageFactLine("he")} המנגנון שסופק: ${adv}. בלי למכור את הקופה כמבצע.`
        : `המנגנון הייחודי הוא מה שסופק: ${adv}. בלי פטנט מדומה.`,
      isFreeService(i) && isClalitCoverageFact(i)
        ? `${coverageFactLine("ar")} الآلية المعطاة: ${advAr}. بلا بيع الصندوق كعرض.`
        : `الآلية الفريدة كما أُعطيت: ${advAr}. بلا براءة وهمية.`,
      isFreeService(i) && isClalitCoverageFact(i)
        ? `${coverageFactLine("en")} Stated mechanism: ${adv}. Do not sell the fund as a promo.`
        : `The unique mechanism is what you gave: ${adv}. No fake proprietary method.`,
    ),
    hormozi: L(
      `Dream = ${goalEn}. Likelihood = ${advEn}. Time delay / effort = לא סופקו — לא ננחש.`,
      `الحلم = ${goalAr}. الاحتمال = ${advAr}. الوقت/الجهد غير مذكورين.`,
      `Dream = ${goalEn}. Likelihood = ${advEn}. Time delay / effort not given — will not guess.`,
    ),
    aida: {
      attention: L(painHe, painAr, painEn),
      interest: L(audHe, audAr, audEn),
      desire: L(advHe, advAr, advEn),
      action: L(goalHe, goalAr, goalEn),
    },
    pas: {
      problem: L(painHe, painAr, painEn),
      agitate: L(
        "מה קורה אם ממשיכים לדחות: הבעיה נשארת, והפרסום הכללי נשמע כמו כולם.",
        "إن استمر التأجيل تبقى المشكلة ويبدو الإعلان كالجميع.",
        "If they keep delaying: the problem stays, and generic ads still sound like everyone else.",
      ),
      solution: L(`${name} — ${advHe}`, `${name} — ${advAr}`, `${name} — ${advEn}`),
    },
    hso: {
      hook: L(painHe, painAr, painEn),
      story: L(
        `${name}: ${i.description || "תיאור חסר — לא יומצא סיפור מטופל."}`,
        `${name}: ${i.description || "الوصف ناقص — لن يُختلق قصص مرضى."}`,
        `${name}: ${i.description || "Description missing — no invented patient story."}`,
      ),
      offer: L(noOffer ? "אין מבצע. הסיפור נגמר ב-CTA אמיתי, לא בקופון." : i.offer, noOffer ? "لا عرض. القصة تنتهي بنداء حقيقي." : i.offer, noOffer ? "No offer. The story ends on a real CTA, not a coupon." : i.offer),
    },
    offerStack: {
      leadMagnet: magnet,
      tripwire: noOffer || isFreeService(i)
        ? L("Tripwire: אין. אל תמציאו ₪99 «רק החודש».", "لا tripwire. لا تخترعوا ₪99.", "Tripwire: none. Do not invent a ₪99 “this month only”.")
        : L(`Tripwire רק אם זה חלק מ: ${offerHe}`, `Tripwire فقط إن كان جزءاً من ${offerAr}`, `Tripwire only if it is part of: ${offerEn}`),
      core: L(`הליבה: ${i.category || "השירות שתואר"} — ${i.description || "תיאור חסר"}.`, `النواة: ${i.category || "الخدمة"}.`, `Core: ${i.category || "the service described"} — ${i.description || "description missing"}.`),
      upsell: L("Upsell רק אם סיפקתם חבילה. לא סופק — ריק.", "لا upsell إن لم تُعط حزمة.", "Upsell only if you supplied a package. None given — empty."),
      continuity: L("רצף/מנוי: לא צוין. לא נמציא «תוכנית חודשית».", "استمرار غير مذكور.", "Continuity/membership: not stated. Will not invent a monthly plan."),
    },
    funnel: {
      tof: L(`TOF: הוק על ${painHe}. מטא/טיקטוק לפי תוכנית המדיה. בלי לידים מזויפים.`, `TOF: خطاف على ${painAr}.`, `TOF: hook on ${painEn}. Meta/TikTok per the media plan. No fake leads.`),
      mof: L(`MOF: הוכחה = ${advHe} בלבד. רימרקטינג אחרי אירוע אמיתי.`, `MOF: إثبات = ${advAr} فقط.`, `MOF: proof = ${advEn} only. Remarketing after a real event.`),
      bof: isWalkIn(i)
        ? L(
            bofWalkLine(i, "he", ctaHe),
            bofWalkLine(i, "ar", ctaAr),
            bofWalkLine(i, "en", ctaEn),
          )
        : L(`BOF: CTA ל${goalHe}. וואטסאפ/תור — לא טופס של 12 שדות.`, `BOF: CTA لـ ${goalAr}.`, `BOF: CTA to ${goalEn}. WhatsApp/booking — not a 12-field form.`),
    },
    calendar: Array.from({ length: 13 }, (_, w) => ({
      week: w + 1,
      theme: w < 2
        ? L("למידה — 2–3 קריאייטיבים", "تعلّم — 2–3 إبداعات", "Learn — 2–3 creatives")
        : w < 6
          ? L("זווית אחת מנצחת לפי פניות", "زاوية واحدة وفق الطلبات", "One winning angle by enquiries")
          : w < 10
            ? L("תוכן אורגני + רימרקטינג זהיר", "محتوى عضوي + إعادة استهداف حذرة", "Organic + careful remarketing")
            : L("סיכום מספרים שמדדתם בפועל", "تلخيص أرقام قستمها", "Recap numbers you actually measured"),
      action: L(
        `שבוע ${w + 1}: ${name} · ${goal}. בלי «חודש ויראלי» כתחזית.`,
        `أسبوع ${w + 1}: ${name} · ${goalAr}.`,
        `Week ${w + 1}: ${name} · ${goalEn}. No “viral month” forecast.`,
      ),
    })),
  };

  const hooks = [
    { id: "pain", angle: L("בעיה", "مشكلة", "Problem"), hook: L(landingH1(i, "he"), landingH1(i, "ar"), landingH1(i, "en")) },
    { id: "edge", angle: L("יתרון", "ميزة", "Advantage"), hook: L(advHe, advAr, advEn) },
    { id: "place", angle: L("מקום", "مكان", "Place"), hook: L(loc || "מיקום חסר — לא «לידכם».", loc || "الموقع ناقص.", loc || "Location missing — not “near you”.") },
    { id: "no-fake", angle: L("יושרה", "صدق", "Integrity"), hook: L(noOffer ? "בלי קופון מלאכותי." : i.offer, noOffer ? "بلا كوبون." : i.offer, noOffer ? "No manufactured coupon." : i.offer) },
    { id: "lang", angle: L("שפה", "لغة", "Language"), hook: L("עברית וערבית כשפות שוות.", "العبرية والعربية متساويتان.", "Hebrew and Arabic as equal languages.") },
    { id: "cta", angle: L("CTA", "CTA", "CTA"), hook: L(ctaHe, ctaAr, ctaEn) },
  ];

  const pieces: FactoryPiece[] = [];
  const formats: { format: string; title: (loc: Locale) => string; body: (loc: Locale) => string }[] = [
    { format: "feed", title: (_l) => name, body: (l) => l === "he" ? `${landingH1(i, "he")}\n${ctaHe}` : l === "ar" ? `${landingH1(i, "ar")}\n${ctaAr}` : `${landingH1(i, "en")}\n${ctaEn}` },
    { format: "story", title: (l) => (l === "he" ? "פריים 1" : l === "ar" ? "إطار 1" : "Frame 1"), body: (l) => `${landingH1(i, l)}\n${l === "he" ? ctaHe : l === "ar" ? ctaAr : ctaEn}` },
    { format: "reels", title: (l) => (l === "he" ? "סקריפט 15ש׳" : l === "ar" ? "سكربت 15ث" : "15s script"), body: (l) => l === "he" ? `0–3: ${landingH1(i, "he")}. 3–12: ${hoursLine(i, "he") || loc}. 12–15: ${ctaHe}.` : l === "ar" ? `0–3: ${landingH1(i, "ar")}. 3–12: ${hoursLine(i, "ar") || loc}. 12–15: ${ctaAr}.` : `0–3: ${landingH1(i, "en")}. 3–12: ${hoursLine(i, "en") || loc}. 12–15: ${ctaEn}.` },
    { format: "youtube", title: (l) => (l === "he" ? "YouTube — הוק 8ש׳" : l === "ar" ? "يوتيوب — 8ث" : "YouTube — 8s hook"), body: (l) => `${landingH1(i, l)}\n${l === "he" ? ctaHe : l === "ar" ? ctaAr : ctaEn}` },
    { format: "rsa", title: (_l) => "Google RSA", body: (l) => rsaLines(i, l) },
    { format: "search", title: (l) => (l === "he" ? "מודעת חיפוש" : l === "ar" ? "إعلان بحث" : "Search ad"), body: (_l) => `${name} | ${i.category} | ${loc}`.trim() },
    { format: "landing", title: (l) => (l === "he" ? "דף נחיתה — מבנה" : l === "ar" ? "صفحة هبوط" : "Landing structure"), body: (l) => {
      const base = landingBody(i, l);
      const assets = i.mediaAssets ?? [];
      const vis = landingVisualLine(i, l, assets.map((a) => a.label));
      return `${base}\n${vis}`;
    } },
    { format: "whatsapp", title: (_l) => "WhatsApp", body: (l) => whatsappScript(i, l) },
    { format: "sms", title: (_l) => "SMS", body: (l) => l === "he" ? `${name}: ${isWalkIn(i) ? smsWalkLine(i, "he") : "אפשר לקבוע תור. השבו."}` : l === "ar" ? `${name}: ${isWalkIn(i) ? smsWalkLine(i, "ar") : "احكوا معنا عالواتساب."}` : `${name}: ${isWalkIn(i) ? smsWalkLine(i, "en") : "Reply to book."}` },
    { format: "flyer", title: (l) => (l === "he" ? "פלאייר" : l === "ar" ? "منشور" : "Flyer"), body: (l) => [name, landingH1(i, l), hoursLine(i, l), kupaLine(i, l), l === "he" ? ctaHe : l === "ar" ? ctaAr : ctaEn, noOffer ? (l === "he" ? "אין מבצע על הנייר." : l === "ar" ? "ما في عرض عالورقة." : "No offer on the paper.") : i.offer].filter(Boolean).join("\n") },
  ];
  for (const lang of ["he", "ar", "en"] as Locale[]) {
    for (const f of formats) {
      pieces.push({ format: f.format, locale: lang, title: f.title(lang), body: f.body(lang) });
    }
    for (let e = 1; e <= 5; e++) {
      const bodies: Record<Locale, string> = {
        he: [`1/5 היכרות: ${name} — ${adv}`, `2/5 הבעיה: ${pain}`, `3/5 איך זה עובד בפועל (בלי הבטחות חסרות).`, `4/5 התנגדות: יקר/אין זמן — תשובה בלי הנחה אוטומטית.`, `5/5 CTA: ${ctaHe}`][e - 1],
        ar: [`1/5 تعارف: ${name}`, `2/5 المشكلة: ${painAr}`, `3/5 كيف يعمل.`, `4/5 اعتراض السعر/الوقت.`, `5/5 CTA: ${ctaAr}`][e - 1],
        en: [`1/5 Intro: ${name} — ${advEn}`, `2/5 Problem: ${painEn}`, `3/5 How it actually works (no missing promises).`, `4/5 Objection: expensive/no time — answer without an auto-discount.`, `5/5 CTA: ${ctaEn}`][e - 1],
      };
      pieces.push({ format: `email-${e}`, locale: lang, title: lang === "he" ? `אימייל ${e}` : lang === "ar" ? `بريد ${e}` : `Email ${e}`, body: bodies[lang] });
    }
  }
  for (const v of pack.variants) {
    pieces.push({
      format: `ad-${v.kind}`,
      locale: v.locale,
      title: v.headline,
      body: `${v.primaryText}\nCTA: ${v.cta}`,
    });
  }
  for (const past of i.pastCreatives ?? []) {
    const warnHe = past.confirmedReal
      ? "ייחוס מבנה שאושר כטקסט אמיתי — לא להעתיק כטענה חדשה אם המודל חינם אוסר מבצע."
      : "ייחוס מבנה בלבד. טענות VIP/100%/מחיר לא אושרו — לא להעתיק.";
    const warnAr = past.confirmedReal
      ? "مرجع بنية اعتُمد كنص حقيقي — لا يُنسخ كادّعاء جديد إن كان النموذج يمنع العروض."
      : "مرجع بنية فقط. ادّعاءات VIP/100%/سعر غير مؤكدة — لا تُنسخ.";
    const warnEn = past.confirmedReal
      ? "Structure reference confirmed as real text — do not copy as a new claim if free-service forbids offers."
      : "Structure reference only. Unconfirmed VIP/100%/price claims — do not copy.";
    const body = [past.headline, past.body, past.cta ? `CTA: ${past.cta}` : "", "tag: past_creative"].filter(Boolean).join("\n");
    for (const lang of ["he", "ar", "en"] as Locale[]) {
      pieces.push({
        format: "past_creative",
        locale: lang,
        title: past.headline || past.sourceName,
        body: `${body}\n${lang === "he" ? warnHe : lang === "ar" ? warnAr : warnEn}`,
      });
    }
  }

  const creative = {
    producedBy: ["strategic"] as AgencyPack["creative"]["producedBy"],
    hooks,
    angleMatrix: hooks.slice(0, 4).map((h) => ({
      angle: h.angle,
      proof: L(advHe, advAr, advEn),
      cta: L(ctaHe, ctaAr, ctaEn),
    })),
    pieces,
    brandKit: {
      sawek: { black: "#050505", red: "#ff1a1a", yellow: "#ffe500" },
      clientPrimary: paletteForIntake(i)[1],
      clientSecondary: (i.brandKit?.colors ?? [])[2] || paletteForIntake(i)[2],
      note: L(brandNote(i.brandKit, "he"), brandNote(i.brandKit, "ar"), brandNote(i.brandKit, "en")),
    },
  };

  const mediaExtra = {
    producedBy: ["media"] as AgencyPack["mediaExtra"]["producedBy"],
    frequency: L("תקרת תדירות 2/יום עד שיש אירוע המרה אמיתי. לא ננחש reach.", "سقف تكرار 2/يوم حتى حدث تحويل حقيقي.", "Frequency cap 2/day until a real conversion event exists. Reach will not be guessed."),
    tests: [
      { name: L("A/B הוק", "A/B الخطاف", "A/B hook"), a: L(`הוק בעיה: ${painHe}`, `خطاف المشكلة`, `Problem hook: ${painEn}`), b: L(`הוק יתרון: ${advHe}`, `خطاف الميزة`, `Advantage hook: ${advEn}`), metric: L("פניות אמיתיות עם שם, לא CTR לבד.", "طلبات باسم حقيقي لا CTR فقط.", "Real named enquiries, not CTR alone.") },
      { name: L("A/B CTA", "A/B CTA", "A/B CTA"), a: L(ctaHe, ctaAr, ctaEn), b: L("לפרטים", "للتفاصيل", "Learn more"), metric: L("אם «לפרטים» מביא סקרנים — כבו.", "إذا «للتفاصيل» يجلب فضوليين — أوقفوا.", "If “learn more” brings tyre-kickers — kill it.") },
    ],
    weekly: pack.optimizer.ifThen.map((x) => L(`IF ${x.if.he} THEN ${x.then.he}`, `IF ${x.if.ar} THEN ${x.then.ar}`, `IF ${x.if.en} THEN ${x.then.en}`)),
    planOnly: L("PLAN בלבד. SAWEK AD לא מפרסם למטא/גוגל/טיקטוק/יוטיוב.", "خطة فقط. SAWEK AD لا ينشر على الشبكات.", "PLAN only. SAWEK AD does not publish to Meta/Google/TikTok/YouTube."),
    audiences: L(
      loc
        ? `גיאו: ${loc}. ליבה: ${aud || "לא צוין — לא נרחיב תחומי עניין"}. בלי lookalike לפני 50 המרות.`
        : "גיאו חסר. ליבה לפי הקליטה בלבד. לא קונים מדינה שלמה.",
      loc ? `الجغرافيا: ${loc}. النواة: ${aud || "غير مذكور"}.` : "الجغرافيا ناقصة.",
      loc
        ? `Geo: ${loc}. Core: ${aud || "not specified — will not expand interests"}. No lookalike before 50 conversions.`
        : "Geo missing. Core from intake only. Do not buy a whole country.",
    ),
    keywords: pack.media.split.find((c) => c.channel === "google")?.targeting.keywords ?? [],
    placements: L(
      pack.media.split.map((c) => `${c.channel}: ${c.targeting.placements}`).join(" · "),
      pack.media.split.map((c) => `${c.channel}: ${c.targeting.placements}`).join(" · "),
      pack.media.split.map((c) => `${c.channel}: ${c.targeting.placements}`).join(" · "),
    ),
  };

  const leads = {
    producedBy: ["optimizer", "strategic"] as AgencyPack["leads"]["producedBy"],
    magnet,
    formFields: [
      { field: L("שם מלא", "الاسم الكامل", "Full name"), required: true },
      { field: L("טלפון", "هاتف", "Phone"), required: true },
      { field: L("שפה מועדפת (עב/ער/En)", "اللغة المفضلة", "Preferred language (HE/AR/EN)"), required: true },
      { field: L("סיבת הפנייה — במילים שלהם", "سبب التواصل", "Reason — in their words"), required: false },
    ],
    crm: [
      { stage: L("חדש", "جديد", "New"), meaning: L("הודעה נכנסה. אין ליד בלי שם.", "رسالة واردة. لا عميل بلا اسم.", "Inbound message. No lead without a name.") },
      { stage: L("שיחה", "حديث", "Talk"), meaning: L("נקבע מגע אנושי.", "تواصل بشري.", "Human contact booked.") },
      { stage: L("תור / ביקור", "موعد / زيارة", "Booked / visit"), meaning: L(isWalkIn(i) ? "הגיעו לפי סדר הגעה." : goalHe, isWalkIn(i) ? "إجو حسب الدور." : goalAr, isWalkIn(i) ? "They walked in." : goalEn) },
      { stage: L("לא רלוונטי", "غير مناسب", "Unqualified"), meaning: L("סקרן / אין כוונה. אל תסקיילו את ההצעה שהביאה אותם.", "فضولي. لا توسّعوا العرض الذي جلبهم.", "Curious / no intent. Don’t scale the offer that brought them.") },
    ],
    bookingCta: L(ctaHe, ctaAr, ctaEn),
    promoCodes: noOffer
      ? L("אין קודי מבצע. Intake סירב להמציא קוד הנחה.", "لا أكواد. رفض اختراع رمز خصم.", "No promo codes. Intake refused to invent a discount code.")
      : L(`קוד רק אם הוא חלק מ: ${offerHe}`, `رمز فقط إن كان جزءاً من ${offerAr}`, `A code only if it is part of: ${offerEn}`),
    retargeting: L(
      "רימרקטינג רק אחרי פיקסל/הודעה אמיתית. בלי קהל «דומה» לפני 50 המרות.",
      "إعادة استهداف بعد حدث حقيقي. بلا lookalike قبل 50 تحويلاً.",
      "Retarget only after a real pixel/message event. No lookalike before 50 conversions.",
    ),
    cadence: [
      { day: "0", channel: L("WhatsApp", "واتساب", "WhatsApp"), action: i.whatsappTemplates?.trim()
        ? L(i.whatsappTemplates.trim(), i.whatsappTemplates.trim(), i.whatsappTemplates.trim())
        : L("אישור שקיבלנו פנייה. שאלה אחת.", "تأكيد الاستلام. سؤال واحد.", "Confirm we got the enquiry. One question.") },
      { day: "1", channel: L("SMS", "SMS", "SMS"), action: L("רק אם אין תשובה. בלי מבצע.", "فقط إن لم يردّوا. بلا عرض.", "Only if no reply. No offer.") },
      { day: "3", channel: L("אימייל", "بريد", "Email"), action: L("אימייל 2 מהרצף — הבעיה.", "بريد 2 — المشكلة.", "Email 2 in the sequence — the problem.") },
      { day: "7", channel: L("WhatsApp", "واتساب", "WhatsApp"), action: L("סגירה או סגירת ליד. לא לרדוף שבועיים.", "إغلاق أو إقفال. لا ملاحقة لأسبوعين.", "Close or close-out the lead. Don’t chase for two weeks.") },
    ],
  };

  return { discovery, strategy, creative, mediaExtra, leads };
}

export function ensureAgency(pack: CampaignPack): CampaignPack {
  return { ...pack, agency: pack.agency ?? buildAgency(pack) };
}
