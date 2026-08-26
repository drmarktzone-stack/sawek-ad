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

const L = (he: string, ar: string, en: string): Tri => ({ he, ar, en });

function n(i: Intake) {
  return i.businessName.trim() || "—";
}

export function buildAgency(pack: Pick<CampaignPack, "intake" | "intakeReport" | "diagnosis" | "media" | "optimizer" | "variants">): AgencyPack {
  const i = pack.intake;
  const name = n(i);
  const aud = i.audience || "—";
  const pain = i.biggestProblem || "—";
  const adv = i.uniqueAdvantage || "—";
  const goal = i.mainGoal || "—";
  const loc = i.location || "";
  const wa = i.whatsapp?.trim() || "";
  const noOffer = isNoOffer(i.offer);

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
        `عندما يواجه ${aud}: ${pain} — يريدون ${goal} دون الشعور برقم.`,
        `When ${aud} hit: ${pain} — they want ${goal} without feeling like a number.`,
      ),
      given: L(`מתוך הקליטה: ${aud}. ${loc || "מיקום לא סופק."}`, `من البيانات: ${aud}. ${loc || "الموقع غير مذكور."}`, `From intake: ${aud}. ${loc || "Location not given."}`),
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
      given: L(`בעיה שסופקה: ${pain}`, `المشكلة المعطاة: ${pain}`, `Stated problem: ${pain}`),
      unknown: L("גיל מדויק לא סופק — לא נקבע 25–45 כברירת מחדל.", "العمر الدقيق غير مذكور — لن نفترض 25–45.", "Exact age not given — will not default to 25–45."),
    },
    {
      name: L("פרסונה ג׳ — ממליץ / קובע לאחר", "شخصية ج — يوصي / يحجز لغيره", "Persona C — booker for someone else"),
      jtbd: L(
        `כשמישהו מהמעגל של ${aud} צריך ${goal} — הפרסונה הזו קובעת בשמם.`,
        `عندما يحتاج أحد دائرة ${aud} إلى ${goal} — هذه الشخصية تحجز باسمهم.`,
        `When someone in ${aud}’s circle needs ${goal} — this person books on their behalf.`,
      ),
      given: L(`קהל שסופק: ${aud}. מטרה: ${goal}.`, `الجمهور المعطى: ${aud}. الهدف: ${goal}.`, `Stated audience: ${aud}. Goal: ${goal}.`),
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
      `مقابل ${name}: ميزتكم المعطاة ${adv}. ضعفهم غير مقيس.`,
      `Vs ${name}: your stated edge is ${adv}. Their weakness was not measured — no guess.`,
    ),
    opportunity: L(`קהל ${aud}${loc ? " ב" + loc : ""} — אם הם לא מכסים את ${adv}.`, `جمهور ${aud}${loc ? " في " + loc : ""}.`, `Audience ${aud}${loc ? " in " + loc : ""} — if they don’t cover ${adv}.`),
    threat: L("אל תעתיקו מבצע שלהם אם לא תיעדתם אותו.", "لا تنسخوا عرضهم إن لم توثّقوه.", "Don’t copy their offer unless you documented it."),
  }));

  const discovery = {
    producedBy: ["intake", "diagnostic"] as AgencyPack["discovery"]["producedBy"],
    audit: [
      { title: L("מודל", "النموذج", "Model"), body: L(i.businessModel || "לא סופק — Intake מסרב לנחש איך נסגר כסף.", i.businessModel || "غير متوفر.", i.businessModel || "Not given — Intake refuses to guess how money closes.") },
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
      `ICP = ${aud}${loc ? " · " + loc : ""}. Not “everyone nearby”.`,
    ),
    personas,
    battlecards,
    swot: {
      strength: L(`חוזק שסופק: ${adv}`, `قوة معطاة: ${adv}`, `Stated strength: ${adv}`),
      weakness: L(
        i.whatFailed || "חולשה תפעולית לא סופקה — לא נכתוב «אין נוכחות דיגיטלית» סתם.",
        i.whatFailed || "ضعف تشغيلي غير مذكور.",
        i.whatFailed || "Operational weakness not supplied — will not write “no digital presence” for flavor.",
      ),
      opportunity: L(
        `קהל ${aud}${loc ? " ב" + loc : ""}. מטרה: ${goal}.`,
        `جمهور ${aud}${loc ? " في " + loc : ""}. الهدف: ${goal}.`,
        `Audience ${aud}${loc ? " in " + loc : ""}. Goal: ${goal}.`,
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

  const magnet = noOffer
    ? L(
        "מגנט מומלץ ליצירה (לא קיים עדיין): דף הכנה לביקור/שיחה ראשונה. אין ייעוץ חינם ואין הנחה — אין מבצע.",
        "مغناطيس مقترح للإنشاء (غير موجود بعد): صفحة تحضير للزيارة. لا استشارة مجانية — لا عرض.",
        "Recommended magnet to create (does not exist yet): a first-visit prep sheet. No free consult, no discount — no offer.",
      )
    : L(`מגנט קשור להצעה שסיפקתם: ${i.offer}. לא נרחיב מעבר לזה.`, `المغناطيس مرتبط بعرضكم: ${i.offer}.`, `Magnet tied to the offer you supplied: ${i.offer}. We will not expand it.`);

  const strategy = {
    producedBy: ["strategic"] as AgencyPack["strategy"]["producedBy"],
    positioning: L(
      `${name} ל${aud}: ${adv}. לא «הכי טוב בשוק».`,
      `${name} لـ ${aud}: ${adv}.`,
      `${name} for ${aud}: ${adv}. Not “best in market”.`,
    ),
    uniqueMechanism: L(
      `המנגנון הייחודי הוא מה שסופק: ${adv}. בלי פטנט מדומה.`,
      `الآلية الفريدة كما أُعطيت: ${adv}. بلا براءة وهمية.`,
      `The unique mechanism is what you gave: ${adv}. No fake proprietary method.`,
    ),
    hormozi: L(
      `Dream = ${goal}. Likelihood = ${adv}. Time delay / effort = לא סופקו — לא ננחש.`,
      `الحلم = ${goal}. الاحتمال = ${adv}. الوقت/الجهد غير مذكورين.`,
      `Dream = ${goal}. Likelihood = ${adv}. Time delay / effort not given — will not guess.`,
    ),
    aida: {
      attention: L(pain, pain, pain),
      interest: L(aud, aud, aud),
      desire: L(adv, adv, adv),
      action: L(goal, goal, goal),
    },
    pas: {
      problem: L(pain, pain, pain),
      agitate: L(
        "מה קורה אם ממשיכים לדחות: הבעיה נשארת, והפרסום הכללי נשמע כמו כולם.",
        "إن استمر التأجيل تبقى المشكلة ويبدو الإعلان كالجميع.",
        "If they keep delaying: the problem stays, and generic ads still sound like everyone else.",
      ),
      solution: L(`${name} — ${adv}`, `${name} — ${adv}`, `${name} — ${adv}`),
    },
    hso: {
      hook: L(pain, pain, pain),
      story: L(
        `${name}: ${i.description || "תיאור חסר — לא יומצא סיפור מטופל."}`,
        `${name}: ${i.description || "الوصف ناقص — لن يُختلق قصص مرضى."}`,
        `${name}: ${i.description || "Description missing — no invented patient story."}`,
      ),
      offer: L(noOffer ? "אין מבצע. הסיפור נגמר ב-CTA אמיתי, לא בקופון." : i.offer, noOffer ? "لا عرض. القصة تنتهي بنداء حقيقي." : i.offer, noOffer ? "No offer. The story ends on a real CTA, not a coupon." : i.offer),
    },
    offerStack: {
      leadMagnet: magnet,
      tripwire: noOffer
        ? L("Tripwire: אין. אל תמציאו ₪99 «רק החודש».", "لا tripwire. لا تخترعوا ₪99.", "Tripwire: none. Do not invent a ₪99 “this month only”.")
        : L(`Tripwire רק אם זה חלק מ: ${i.offer}`, `Tripwire فقط إن كان جزءاً من ${i.offer}`, `Tripwire only if it is part of: ${i.offer}`),
      core: L(`הליבה: ${i.category || "השירות שתואר"} — ${i.description || "תיאור חסר"}.`, `النواة: ${i.category || "الخدمة"}.`, `Core: ${i.category || "the service described"} — ${i.description || "description missing"}.`),
      upsell: L("Upsell רק אם סיפקתם חבילה. לא סופק — ריק.", "لا upsell إن لم تُعط حزمة.", "Upsell only if you supplied a package. None given — empty."),
      continuity: L("רצף/מנוי: לא צוין. לא נמציא «תוכנית חודשית».", "استمرار غير مذكور.", "Continuity/membership: not stated. Will not invent a monthly plan."),
    },
    funnel: {
      tof: L(`TOF: הוק על ${pain}. מטא/טיקטוק לפי תוכנית המדיה. בלי לידים מזויפים.`, `TOF: خطاف على ${pain}.`, `TOF: hook on ${pain}. Meta/TikTok per the media plan. No fake leads.`),
      mof: L(`MOF: הוכחה = ${adv} בלבד. רימרקטינג אחרי אירוע אמיתי.`, `MOF: إثبات = ${adv} فقط.`, `MOF: proof = ${adv} only. Remarketing after a real event.`),
      bof: L(`BOF: CTA ל${goal}. וואטסאפ/תור — לא טופס של 12 שדות.`, `BOF: CTA لـ ${goal}.`, `BOF: CTA to ${goal}. WhatsApp/booking — not a 12-field form.`),
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
        `أسبوع ${w + 1}: ${name} · ${goal}.`,
        `Week ${w + 1}: ${name} · ${goal}. No “viral month” forecast.`,
      ),
    })),
  };

  const ctaHe = /תור|מועד/.test(goal) ? "קבעו תור" : "דברו איתנו";
  const ctaAr = /موعد|تور/.test(goal) ? "احجزوا موعداً" : "تواصلوا معنا";
  const ctaEn = /book|appointment|תור/.test(goal.toLowerCase()) ? "Book an appointment" : "Talk to us";

  const hooks = [
    { id: "pain", angle: L("בעיה", "مشكلة", "Problem"), hook: L(pain, pain, pain) },
    { id: "edge", angle: L("יתרון", "ميزة", "Advantage"), hook: L(adv, adv, adv) },
    { id: "place", angle: L("מקום", "مكان", "Place"), hook: L(loc || "מיקום חסר — לא «לידכם».", loc || "الموقع ناقص.", loc || "Location missing — not “near you”.") },
    { id: "no-fake", angle: L("יושרה", "صدق", "Integrity"), hook: L(noOffer ? "בלי קופון מלאכותי." : i.offer, noOffer ? "بلا كوبون." : i.offer, noOffer ? "No manufactured coupon." : i.offer) },
    { id: "lang", angle: L("שפה", "لغة", "Language"), hook: L("עברית וערבית כשפות שוות.", "العبرية والعربية متساويتان.", "Hebrew and Arabic as equal languages.") },
    { id: "cta", angle: L("CTA", "CTA", "CTA"), hook: L(ctaHe, ctaAr, ctaEn) },
  ];

  const pieces: FactoryPiece[] = [];
  const formats: { format: string; title: (loc: Locale) => string; body: (loc: Locale) => string }[] = [
    { format: "feed", title: (_l) => name, body: (l) => l === "he" ? `${pain}\n${adv}\n${ctaHe}` : l === "ar" ? `${pain}\n${adv}\n${ctaAr}` : `${pain}\n${adv}\n${ctaEn}` },
    { format: "story", title: (l) => (l === "he" ? "פריים 1" : l === "ar" ? "إطار 1" : "Frame 1"), body: (l) => l === "he" ? `${pain}\nהבא: ${ctaHe}` : l === "ar" ? `${pain}\nالتالي: ${ctaAr}` : `${pain}\nNext: ${ctaEn}` },
    { format: "reels", title: (l) => (l === "he" ? "סקריפט 15ש׳" : l === "ar" ? "سكربت 15ث" : "15s script"), body: (l) => l === "he" ? `0–3: ${pain}. 3–12: ${adv}. 12–15: ${ctaHe}.` : l === "ar" ? `0–3: ${pain}. 3–12: ${adv}. 12–15: ${ctaAr}.` : `0–3: ${pain}. 3–12: ${adv}. 12–15: ${ctaEn}.` },
    { format: "youtube", title: (l) => (l === "he" ? "YouTube — הוק 8ש׳" : l === "ar" ? "يوتيوب — 8ث" : "YouTube — 8s hook"), body: (l) => l === "he" ? `הוק: ${pain}. גוף: ${adv}. קצה: ${ctaHe}. בלי Intro של 20 שניות.` : l === "ar" ? `خطاف: ${pain}.` : `Hook: ${pain}. Body: ${adv}. End: ${ctaEn}. No 20s intro.` },
    { format: "rsa", title: (_l) => "Google RSA", body: (l) => l === "he" ? `H1: ${name}\nH2: ${adv.slice(0, 30)}\nH3: ${loc || "מיקום חסר"}\nD1: ${pain}\nD2: ${ctaHe}` : l === "ar" ? `H1: ${name}\nH2: ${adv.slice(0, 30)}\nD1: ${pain}` : `H1: ${name}\nH2: ${adv.slice(0, 30)}\nH3: ${loc || "location missing"}\nD1: ${pain}\nD2: ${ctaEn}` },
    { format: "search", title: (l) => (l === "he" ? "מודעת חיפוש" : l === "ar" ? "إعلان بحث" : "Search ad"), body: (_l) => `${name} | ${i.category} | ${loc}`.trim() },
    { format: "landing", title: (l) => (l === "he" ? "דף נחיתה — מבנה" : l === "ar" ? "صفحة هبوط" : "Landing structure"), body: (l) => l === "he" ? `H1: ${pain}\nפסקה: ${adv}\n${loc}\n${i.website || ""}\nוואטסאפ: ${wa || "[יש להשלים]"}\nטופס: שם + טלפון + שפה.\nבלי המלצות בדויות.` : l === "ar" ? `H1: ${pain}\n${adv}\nواتساب: ${wa || "[יש להשלים]"}` : `H1: ${pain}\nParagraph: ${adv}\n${loc}\n${i.website || ""}\nWhatsApp: ${wa || "[TO COMPLETE]"}\nForm: name + phone + language.\nNo fake testimonials.` },
    { format: "whatsapp", title: (_l) => "WhatsApp", body: (l) => l === "he" ? `שלום, כאן ${name}. וואטסאפ ${wa || "[יש להשלים]"}. קיבלנו פנייה לגבי ${goal}. מתי נוח לתור?` : l === "ar" ? `مرحبا، هنا ${name}. واتساب ${wa || "[יש להשלים]"}. متى يناسب الموعد؟` : `Hi, this is ${name}. WhatsApp ${wa || "[TO COMPLETE]"}. We got an enquiry about ${goal}. When works for a booking?` },
    { format: "sms", title: (_l) => "SMS", body: (l) => l === "he" ? `${name}: אפשר לקבוע תור. השבו להודעה. לא מבצע.` : l === "ar" ? `${name}: يمكن حجز موعد. ردّوا.` : `${name}: we can book you in. Reply to this. No promo.` },
    { format: "flyer", title: (l) => (l === "he" ? "פלאייר" : l === "ar" ? "منشور" : "Flyer"), body: (l) => l === "he" ? `${name}\n${adv}\n${loc}\n${ctaHe}\n${noOffer ? "אין מבצע על הנייר." : i.offer}` : l === "ar" ? `${name}\n${adv}\n${ctaAr}` : `${name}\n${adv}\n${loc}\n${ctaEn}\n${noOffer ? "No offer on the paper." : i.offer}` },
  ];
  for (const lang of ["he", "ar", "en"] as Locale[]) {
    for (const f of formats) {
      pieces.push({ format: f.format, locale: lang, title: f.title(lang), body: f.body(lang) });
    }
    for (let e = 1; e <= 5; e++) {
      const bodies: Record<Locale, string> = {
        he: [`1/5 היכרות: ${name} — ${adv}`, `2/5 הבעיה: ${pain}`, `3/5 איך זה עובד בפועל (בלי הבטחות חסרות).`, `4/5 התנגדות: יקר/אין זמן — תשובה בלי הנחה אוטומטית.`, `5/5 CTA: ${ctaHe}`][e - 1],
        ar: [`1/5 تعارف: ${name}`, `2/5 المشكلة: ${pain}`, `3/5 كيف يعمل.`, `4/5 اعتراض السعر/الوقت.`, `5/5 CTA: ${ctaAr}`][e - 1],
        en: [`1/5 Intro: ${name} — ${adv}`, `2/5 Problem: ${pain}`, `3/5 How it actually works (no missing promises).`, `4/5 Objection: expensive/no time — answer without an auto-discount.`, `5/5 CTA: ${ctaEn}`][e - 1],
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

  const creative = {
    producedBy: ["strategic"] as AgencyPack["creative"]["producedBy"],
    hooks,
    angleMatrix: hooks.slice(0, 4).map((h) => ({
      angle: h.angle,
      proof: L(adv, adv, adv),
      cta: L(ctaHe, ctaAr, ctaEn),
    })),
    pieces,
    brandKit: {
      sawek: { black: "#050505", red: "#ff1a1a", yellow: "#ffe500" },
      clientPrimary: "",
      clientSecondary: "",
      note: L("ערכת SAWEK AD (שחור/אדום/צהוב). צבעי לקוח לא סופקו — לא יומצא טורקיז.", "طقم SAWEK AD. ألوان العميل غير معطاة.", "SAWEK AD kit (black/red/yellow). Client colors not supplied — no invented teal."),
    },
  };

  const mediaExtra = {
    producedBy: ["media"] as AgencyPack["mediaExtra"]["producedBy"],
    frequency: L("תקרת תדירות 2/יום עד שיש אירוע המרה אמיתי. לא ננחש reach.", "سقف تكرار 2/يوم حتى حدث تحويل حقيقي.", "Frequency cap 2/day until a real conversion event exists. Reach will not be guessed."),
    tests: [
      { name: L("A/B הוק", "A/B الخطاف", "A/B hook"), a: L(`הוק בעיה: ${pain}`, `خطاف المشكلة`, `Problem hook: ${pain}`), b: L(`הוק יתרון: ${adv}`, `خطاف الميزة`, `Advantage hook: ${adv}`), metric: L("פניות אמיתיות עם שם, לא CTR לבד.", "طلبات باسم حقيقي لا CTR فقط.", "Real named enquiries, not CTR alone.") },
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
      { stage: L("תור", "موعد", "Booked"), meaning: L(goal, goal, goal) },
      { stage: L("לא רלוונטי", "غير مناسب", "Unqualified"), meaning: L("סקרן / אין כוונה. אל תסקיילו את ההצעה שהביאה אותם.", "فضولي. لا توسّعوا العرض الذي جلبهم.", "Curious / no intent. Don’t scale the offer that brought them.") },
    ],
    bookingCta: L(ctaHe, ctaAr, ctaEn),
    promoCodes: noOffer
      ? L("אין קודי מבצע. Intake סירב להמציא ILAN10.", "لا أكواد. رفض اختراع ILAN10.", "No promo codes. Intake refused to invent ILAN10.")
      : L(`קוד רק אם הוא חלק מ: ${i.offer}`, `رمز فقط إن كان جزءاً من ${i.offer}`, `A code only if it is part of: ${i.offer}`),
    retargeting: L(
      "רימרקטינג רק אחרי פיקסל/הודעה אמיתית. בלי קהל «דומה» לפני 50 המרות.",
      "إعادة استهداف بعد حدث حقيقي. بلا lookalike قبل 50 تحويلاً.",
      "Retarget only after a real pixel/message event. No lookalike before 50 conversions.",
    ),
    cadence: [
      { day: "0", channel: L("WhatsApp", "واتساب", "WhatsApp"), action: L("אישור שקיבלנו פנייה. שאלה אחת.", "تأكيد الاستلام. سؤال واحد.", "Confirm we got the enquiry. One question.") },
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
