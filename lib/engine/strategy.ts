import type { Diagnosis, Intake, Locale, StrategyBlock, StrategyItem } from "../types";
import { filled } from "../utils";
import { isNoOffer } from "../no-offer";
import { canonicalDoctorName } from "../demo";
import { coverageFactLine, isClalitCoverageFact, isFreeService, problemChipsFor } from "../operating-model";
import { detectVertical, showsKupaFields } from "../vertical";
import { coachIntake } from "./coach";
import {
  ADVANTAGE_CHIPS,
  GOAL_CHIPS,
  OFFER_CHIPS,
  audienceChipsFor,
  resolveChipLabel,
} from "../chips";

const L = (he: string, ar: string, en: string): Record<Locale, string> => ({ he, ar, en });
const item = (title: Record<Locale, string>, body: Record<Locale, string>): StrategyItem => ({ title, body });

export function generateStrategy(intake: Intake, diagnosis: Diagnosis): StrategyBlock[] {
  const clinic = detectVertical(intake) === "clinic";
  const n = (clinic ? canonicalDoctorName(intake.businessName) : intake.businessName) || "—";
  const coach = coachIntake(intake);
  const aud = resolveChipLabel(intake.audience, audienceChipsFor(intake), "he") || "—";
  const pain = resolveChipLabel(intake.biggestProblem, problemChipsFor(intake), "he") || "—";
  const adv = resolveChipLabel(intake.uniqueAdvantage, ADVANTAGE_CHIPS, "he") || "—";
  const goal = resolveChipLabel(intake.mainGoal, GOAL_CHIPS, "he") || "—";
  const loc = intake.location || "";
  const offer = isNoOffer(intake.offer)
    ? L("אין מבצע — לא ממציאים הנחה", "لا يوجد عرض — لا نخترع خصماً", "No offer — we will not invent a discount")
    : L(
        resolveChipLabel(intake.offer, OFFER_CHIPS, "he"),
        resolveChipLabel(intake.offer, OFFER_CHIPS, "ar"),
        resolveChipLabel(intake.offer, OFFER_CHIPS, "en"),
      );

  const missingQs: StrategyItem[] = [];
  if (!filled(intake.location) && intake.type !== "app") {
    missingQs.push(item(
      L("איפה בדיוק?", "أين بالضبط؟", "Where exactly?"),
      L("בלי עיר/אשכול אי אפשר לבנות רדיוס מטא או מילות מפתח מקומיות.", "بدون مدينة لا نصف قطر ميتا ولا كلمات محلية.", "Without a city/cluster we cannot set a Meta radius or local keywords."),
    ));
  }
  if (!filled(intake.monthlyBudget) || !filled(intake.targetCac)) {
    missingQs.push(item(
      L("תקציב ו-CAC", "الميزانية وCAC", "Budget and CAC"),
      L("חסרים מספרים — תרחיש העלות לא יוצג כתחזית.", "أرقام ناقصة — لن يُعرض سيناريو التكلفة كتوقع.", "Numbers missing — the cost scenario will not be shown as a forecast."),
    ));
  }
  if (!filled(intake.pastAds)) {
    missingQs.push(item(
      L("מה רץ בעבר?", "ماذا اشتغل سابقاً؟", "What ran before?"),
      L("בלי צילום מודעה קודמת האבחון נשאר ברמת ביטחון נמוכה.", "بدون لقطة إعلان سابق يبقى التشخيص منخفض الثقة.", "Without a past-ad snapshot diagnosis stays low-confidence."),
    ));
  }
  if (intake.competitors.length === 0) {
    missingQs.push(item(
      L("מתחרים", "المنافسون", "Competitors"),
      L("לא הוזנו. לא יומצאו שמות או מחירי מתחרים.", "لم تُدخل. لن تُخترع أسماء أو أسعار منافسين.", "None given. Competitor names or prices will not be invented."),
    ));
  }
  if (missingQs.length === 0) {
    missingQs.push(item(
      L("אין שאלות קריטיות פתוחות", "لا أسئلة حرجة مفتوحة", "No critical open questions"),
      L("הקליטה מלאה יחסית. עדיין: מדדו המרה אחת בלבד בשבועיים הראשונים.", "الاستقبال مكتمل نسبياً. مع ذلك: قيسوا تحويلاً واحداً في الأسبوعين الأولين.", "Intake is relatively complete. Still: measure one conversion only in the first two weeks."),
    ));
  }

  const appItems: StrategyItem[] =
    intake.type === "app"
      ? [
          item(
            L("חנות + קריטריון התקנה", "المتجر + حدث التثبيت", "Store + install event"),
            L("גוגל UAC / מטא אפליקציות רק אחרי ש־SDK שולח התקנה. בלי זה אין אופטימיזציה.", "UAC/ميتا تطبيقات فقط بعد أن يرسل SDK تثبيتاً.", "Google UAC / Meta app ads only after the SDK fires an install. Without it there is no optimization."),
          ),
          item(
            L("מסר ההתקנה", "رسالة التثبيت", "Install message"),
            L(`יתרון: ${adv}. בעיה: ${pain}. בלי הבטחת «#1» אם אין הוכחה.`, `الميزة: ${adv}. المشكلة: ${pain}. بلا وعد «#1» دون دليل.`, `Advantage: ${adv}. Problem: ${pain}. No “#1” claim without proof.`),
          ),
        ]
      : [
          item(
            L("אין אפליקציה בקליטה", "لا تطبيق في البيانات", "No app in the intake"),
            L("העסק לא סומן כאפליקציה. לא ממציאים אפליקציה. תחליף: וואטסאפ / תור / דף נחיתה כ«התקנה».", "النشاط ليس تطبيقاً. لن نخترع تطبيقاً. البديل: واتساب / موعد / صفحة كـ«تثبيت».", "The business was not marked as an app. We will not invent one. Substitute: WhatsApp / booking / landing page as the “install”."),
          ),
        ];

  return [
    {
      id: "coach_playbook",
      items: coach.strategies.map((st) =>
        item(st.title, L(
          `${st.body.he}\n${st.plan7.he}`,
          `${st.body.ar}\n${st.plan7.ar}`,
          `${st.body.en}\n${st.plan7.en}`,
        )),
      ),
    },
    {
      id: "selling_angles",
      items: [
        item(L("AIDA", "AIDA", "AIDA"), L(
          `Attention: ${pain}. Interest: ${aud}. Desire: ${adv}. Action: ${goal}.`,
          `انتباه: ${pain}. اهتمام: ${aud}. رغبة: ${adv}. فعل: ${goal}.`,
          `Attention: ${pain}. Interest: ${aud}. Desire: ${adv}. Action: ${goal}.`,
        )),
        item(L("PAS", "PAS", "PAS"), L(
          `Problem: ${pain}. Agitate: מה קורה אם ממשיכים לדחות. Solution: ${n} — ${adv}.`,
          `مشكلة: ${pain}. تحريض: ماذا يحدث إذا استمر التأجيل. حل: ${n} — ${adv}.`,
          `Problem: ${pain}. Agitate: what happens if they keep delaying. Solution: ${n} — ${adv}.`,
        )),
        item(L("Hook–Story–Offer", "Hook–Story–Offer", "Hook–Story–Offer"), L(
          `Hook = הבעיה. Story = איך ${n} עובד בפועל. Offer = ${offer.he}.`,
          `الخطاف = المشكلة. القصة = كيف يعمل ${n}. العرض = ${offer.ar}.`,
          `Hook = the problem. Story = how ${n} actually works. Offer = ${offer.en}.`,
        )),
        item(L("משוואת הורמוזי", "معادلة هورموزي", "Hormozi value equation"), L(
          `תוצאה חלומית: ${goal}. סבירות נתפסת: ${adv}. עיכוב זמן: לא סופק לוח זמנים — לא ננחש. מאמץ: לא סופק — לא ננחש.`,
          `النتيجة الحلم: ${goal}. الاحتمال المدرك: ${adv}. تأخير الوقت: غير مذكور — لن نخمن. الجهد: غير مذكور — لن نخمن.`,
          `Dream outcome: ${goal}. Perceived likelihood: ${adv}. Time delay: no timeline given — will not guess. Effort: not given — will not guess.`,
        )),
      ],
    },
    {
      id: "video_scripts",
      items: [
        item(L("15 שניות — בעיה", "15 ثانية — مشكلة", "15s — problem"), L(
          `0–3: ${pain}. 3–10: ${adv}. 10–15: CTA ל${goal}. בלי מוזיקה שמסתירה דיבור.`,
          `0–3: ${pain}. 3–10: ${adv}. 10–15: CTA لـ ${goal}.`,
          `0–3: ${pain}. 3–10: ${adv}. 10–15: CTA to ${goal}. Don’t bury speech under music.`,
        )),
        item(L("30 שניות — סיפור", "30 ثانية — قصة", "30s — story"), L(
          `פתיחה במקום${loc ? " (" + loc + ")" : ""}. מישהו מ${aud} מתאר את הבעיה. חיתוך ל${n}. סגירה עם ${offer.he}.`,
          `افتتاح في المكان${loc ? " (" + loc + ")" : ""}. شخص من ${aud} يصف المشكلة. قطع إلى ${n}. إغلاق بـ ${offer.ar}.`,
          `Open in-place${loc ? " (" + loc + ")" : ""}. Someone from ${aud} names the problem. Cut to ${n}. Close on ${offer.en}.`,
        )),
        item(L("מה לא לצלם", "ما لا يُصوَّر", "What not to film"), L(
          "לא לביים לקוחות מרוצים אם אין אנשים אמיתיים שנתנו רשות. בלי כוכבי דירוג מומצאים.",
          "لا تمثيل لعملاء راضين دون أناس حقيقيين أعطوا إذناً. بلا نجوم تقييم مختلقة.",
          "Do not stage happy customers unless real people consented. No invented star ratings.",
        )),
      ],
    },
    {
      id: "campaign_sequence",
      items: [
        item(L("שבוע 1 — למידה", "الأسبوع 1 — تعلّم", "Week 1 — learn"), L(
          "2–3 קריאייטיבים (חזק / קצר / יתרון). תקציב קטן. המרה אחת. בלי סקייל.",
          "2–3 إبداعات (قوي / قصير / ميزة). ميزانية صغيرة. تحويل واحد. بلا توسيع.",
          "2–3 creatives (strong / short / advantage). Small budget. One conversion. No scale.",
        )),
        item(L("שבוע 2 — חיתוך", "الأسبوع 2 — قص", "Week 2 — cut"), L(
          "כבו מודעות בלי הודעות אמיתיות. השאירו זווית אחת מנצחת לפי הודעות, לא לפי CTR בלבד.",
          "أوقفوا إعلانات بلا رسائل حقيقية. أبقوا زاوية واحدة وفق الرسائل لا CTR فقط.",
          "Kill ads with no real messages. Keep one winning angle by messages, not CTR alone.",
        )),
        item(L("שבוע 3–4 — הרחבה זהירה", "الأسبوع 3–4 — توسيع حذر", "Weeks 3–4 — careful expansion"), L(
          intake.depth === "deep"
            ? "הוסיפו קהל lookalike רק אחרי 50 המרות אמיתיות. אם אין — הישארו בקהל הליבה."
            : "קמפיין מהיר: הישארו בקהל הליבה. אל תפתחו 8 אדסטים.",
          intake.depth === "deep"
            ? "أضيفوا lookalike فقط بعد 50 تحويلاً حقيقياً."
            : "حملة سريعة: ابقوا على الجمهور الأساسي.",
          intake.depth === "deep"
            ? "Add lookalikes only after 50 real conversions. If not — stay on the core audience."
            : "Quick campaign: stay on the core audience. Don’t open 8 ad sets.",
        )),
      ],
    },
    { id: "app_marketing", items: appItems },
    {
      id: "marketing_diagnosis",
      items: diagnosis.hypotheses.map((h) =>
        item(
          L(h.area, h.area, h.area),
          L(`${h.finding.he}\n${h.recommendation.he}`, `${h.finding.ar}\n${h.recommendation.ar}`, `${h.finding.en}\n${h.recommendation.en}`),
        ),
      ),
    },
    {
      id: "business_audience",
      items: [
        item(L("העסק", "النشاط", "The business"), L(
          `${n}. ${intake.category || "תחום לא צוין"}. ${intake.description || "תיאור חסר."}`,
          `${n}. ${intake.category || "المجال غير مذكور"}. ${intake.description || "الوصف ناقص."}`,
          `${n}. ${intake.category || "category not given"}. ${intake.description || "Description missing."}`,
        )),
        item(L("הקהל", "الجمهور", "The audience"), L(aud, aud, aud)),
        item(
          clinic
            ? L("שעות קבלה", "ساعات الدوام", "Clinic hours")
            : L("שעות פתיחה", "ساعات الدوام", "Opening hours"),
          L(
            intake.clinicHours || "לא סופק — לא ננחש שעון.",
            intake.clinicHours || "مش مكتوب — مش منخترع ساعة.",
            intake.clinicHours || "Not provided — clock hours will not be guessed.",
          ),
        ),
        ...(showsKupaFields(intake)
          ? [item(L("מעבר קופה", "نقل الصندوق", "Kupa switch"), L(
              [intake.kupaFileBy && `הגשה עד ${intake.kupaFileBy}`, intake.kupaMemberFrom && `חברות מ-${intake.kupaMemberFrom}`].filter(Boolean).join(" · ") || "לא סופקו תאריכי מעבר.",
              [intake.kupaFileBy && `تقديم حتى ${intake.kupaFileBy}`, intake.kupaMemberFrom && `عضوية من ${intake.kupaMemberFrom}`].filter(Boolean).join(" · ") || "ما في تواريخ نقل.",
              [intake.kupaFileBy && `File by ${intake.kupaFileBy}`, intake.kupaMemberFrom && `Membership from ${intake.kupaMemberFrom}`].filter(Boolean).join(" · ") || "No switch dates supplied.",
            ))]
          : []),
        item(L("מודל", "النموذج", "Model"), L(
          isFreeService(intake)
            ? (intake.businessModel || "שירות חינם — חשיפה/הרשמה/ביקור בלבד. לא ננחש מחיר.")
            : (intake.businessModel || "לא סופק — לא ננחש איך נסגר הכסף."),
          isFreeService(intake)
            ? (intake.businessModel || "خدمة مجانية — تعرّض/تسجيل/زيارة فقط. مش منخمن سعر.")
            : (intake.businessModel || "غير متوفر — لن نخمن كيف يُغلق المال."),
          isFreeService(intake)
            ? (intake.businessModel || "Free service — exposure/enrollment/visit only. Price will not be guessed.")
            : (intake.businessModel || "Not provided — we will not guess how money is made."),
        )),
        ...(isFreeService(intake) && isClalitCoverageFact(intake)
          ? [item(L("כיסוי קופה", "تغطية الصندوق", "Fund coverage"), L(coverageFactLine("he"), coverageFactLine("ar"), coverageFactLine("en")))]
          : []),
      ],
    },
    {
      id: "buying_psychology",
      items: [
        item(L("פחד מדחייה / בזבוז", "خوف من الرفض / الهدر", "Fear of rejection / waste"), L(
          `הקהל (${aud}) דוחה כי: ${pain}. המודעה צריכה להוריד סיכון, לא להגדיל הבטחה.`,
          `الجمهور (${aud}) يؤجّل لأن: ${pain}. الإعلان يجب أن يقلل الخطر لا أن يضخّم الوعد.`,
          `The audience (${aud}) delays because: ${pain}. The ad should lower risk, not inflate the promise.`,
        )),
        item(L("אמון מקומי", "ثقة محلية", "Local trust"), L(
          loc
            ? `מיקום ידוע (${loc}) — השתמשו בו. אל תחליפו ב«פריסה ארצית» אם אין.`
            : "מיקום חסר — אל תכתבו «לידכם» כאילו יודעים.",
          loc ? `الموقع معروف (${loc}) — استخدموه.` : "الموقع ناقص — لا تكتبوا «بالقرب منكم» وكأنكم تعرفون.",
          loc ? `Location is known (${loc}) — use it. Don’t swap in “nationwide” if that isn’t true.` : "Location missing — don’t write “near you” as if you knew.",
        )),
      ],
    },
    {
      id: "objections",
      items: [
        item(
          isFreeService(intake) ? L("«זה עולה?»", "«في سعر؟»", "“Does it cost?”") : L("«יקר»", "«غالي»", "“It’s expensive”"),
          isFreeService(intake)
            ? L(coverageFactLine("he") + " בלי קופון ובלי «קנו עכשיו».", coverageFactLine("ar") + " بلا كوبون وبلا «اشتروا الآن».", coverageFactLine("en") + " No coupon and no “buy now”.")
            : L(
                "אל תענו בהנחה אוטומטית. ענו בפירוק: מה כלול, מה קורה בלי טיפול/שירות, ומה היתרון.",
                "لا تجيبوا بخصم تلقائي. فكّكوا: ما المشمول وماذا يحدث بدون الخدمة.",
                "Don’t auto-answer with a discount. Unpack what’s included, what happens without the service, and the advantage.",
              ),
        ),
        item(L("«אין לי זמן»", "«لا وقت لدي»", "“I don’t have time”"), L(
          "CTA אחד ברור. אל תבקשו למלא טופס של 12 שדות אם המטרה תור.",
          "CTA واحد واضح. لا تطلبوا نموذجاً من 12 حقلاً إذا الهدف موعد.",
          "One clear CTA. Don’t ask for a 12-field form if the goal is a booking.",
        )),
        item(L("«לא מכיר אתכם»", "«لا أعرفكم»", "“I don’t know you”"), L(
          `יתרון אמיתי בלבד: ${adv}. בלי המלצות מומצאות.`,
          `ميزة حقيقية فقط: ${adv}. بلا توصيات مختلقة.`,
          `Only a real advantage: ${adv}. No invented testimonials.`,
        )),
      ],
    },
    {
      id: "targeting",
      items: [
        item(L("ליבה", "النواة", "Core"), L(
          `${aud}${loc ? " · " + loc : " · מיקום חסר — לא נקבע רדיוס"}.`,
          `${aud}${loc ? " · " + loc : " · الموقع ناقص — لن يُحدد نطاق"}.`,
          `${aud}${loc ? " · " + loc : " · location missing — no radius will be set"}.`,
        )),
        item(L("שפות", "اللغات", "Languages"), L(
          "עברית + ערבית + אנגלית כשפות שוות. אל תריצו רק ערבית אם הקהל דו-לשוני.",
          "العبرية والعربية والإنجليزية لغات متساوية. لا تشغّلوا العربية وحدها إذا كان الجمهور ثنائي اللغة.",
          "Hebrew, Arabic, and English are equal. Don’t run Arabic-only if the audience is bilingual.",
        )),
        item(L("מה לא לטרגט", "ما لا يُستهدف", "What not to target"), L(
          "לא «כולם בני 18–65». לא תחומי עניין שלא הוזכרו בקליטה.",
          "ليس «الجميع 18–65». ليست اهتمامات لم تُذكر في البيانات.",
          "Not “everyone 18–65”. No interests that were not mentioned in intake.",
        )),
      ],
    },
    {
      id: "creative_ideas",
      items: [
        item(L("סטיל חיים", "حياة يومية", "Lived still"), L(
          `סביבה אמיתית${loc ? " ב" + loc : ""}. טקסט על גבי: ${pain}.`,
          `بيئة حقيقية${loc ? " في " + loc : ""}. نص فوق: ${pain}.`,
          `A real environment${loc ? " in " + loc : ""}. On-image text: ${pain}.`,
        )),
        item(L("טיפוגרפיה בלבד", "طباعة فقط", "Type only"), L(
          `צהוב על שחור. משפט אחד: ${adv}.`,
          `أصفر على أسود. جملة واحدة: ${adv}.`,
          `Yellow on black. One sentence: ${adv}.`,
        )),
        item(L("איסור", "ممنوع", "Forbidden"), L(
          "אין כוכבי 5, אין «אלפי לקוחות מרוצים», אין לפני/אחרי רפואי מזויף.",
          "لا نجوم 5، لا «آلاف العملاء الراضين»، لا قبل/بعد طبي مزيف.",
          "No 5-stars, no “thousands of happy clients”, no fake clinical before/after.",
        )),
      ],
    },
    {
      id: "campaign_structure",
      items: [
        item(L("קמפיין אחד, שלוש מודעות", "حملة واحدة، ثلاثة إعلانات", "One campaign, three ads"), L(
          intake.depth === "quick"
            ? "קמפיין מהיר: קמפיין המרות אחד. 3 מודעות (חזקה / קצרה / יתרון). קהל אחד."
            : "קמפיין מעמיק: קמפיין לימוד + קמפיין רימרקטינג רק אחרי פיקסל עם אירועים אמיתיים.",
          intake.depth === "quick"
            ? "حملة سريعة: حملة تحويلات واحدة و3 إعلانات وجمهور واحد."
            : "حملة معمّقة: تعلّم + إعادة استهداف فقط بعد بكسل بأحداث حقيقية.",
          intake.depth === "quick"
            ? "Quick: one conversions campaign. 3 ads (strong / short / advantage). One audience."
            : "Deep: a learning campaign + remarketing only after the pixel has real events.",
        )),
        item(L("ערוצים", "القنوات", "Channels"), L(
          "מטא לצפייה והודעה. גוגל לחיפוש כוונה. טיקטוק רק אם הקהל צעיר או שיש וידאו אמיתי.",
          "ميتا للمشاهدة والرسالة. جوجل لبحث النية. تيك توك فقط إذا كان الجمهور شاباً أو يوجد فيديو حقيقي.",
          "Meta for view-and-message. Google for intent search. TikTok only if the audience is young or you have real video.",
        )),
      ],
    },
    {
      id: "keywords",
      items: [
        item(L("מילות כוונה", "كلمات النية", "Intent keywords"), L(
          [intake.category, intake.location, intake.mainGoal].filter(Boolean).join(" · ") || "לא סופקו מילים — לא נרחיב ממתחרים שלא הוזנו.",
          [intake.category, intake.location, intake.mainGoal].filter(Boolean).join(" · ") || "لا كلمات — لن نوسّع من منافسين غير مُدخلين.",
          [intake.category, intake.location, intake.mainGoal].filter(Boolean).join(" · ") || "None given — will not expand from competitors you did not enter.",
        )),
      ],
    },
    {
      id: "platforms",
      items: [
        item(L("מטא / גוגל / טיקטוק", "ميتا / جوجل / تيك توك", "Meta / Google / TikTok"), L(
          "תוכנית בלבד. אין פרסום חי לרשת. הפעלה = PLAN.",
          "خطة فقط. لا نشر حي. التفعيل = PLAN.",
          "Plan only. No live network publish. Activate = PLAN.",
        )),
      ],
    },
    {
      id: "budget",
      items: [
        item(L("תקציב", "الميزانية", "Budget"), L(
          intake.monthlyBudget
            ? `תקציב שסיפקת: ${intake.monthlyBudget} ₪ לחודש. פיצול בכרטיס המדיה.`
            : "תקציב לא סופק — אין פיצול מספרי ולא מד לידים.",
          intake.monthlyBudget
            ? `الميزانية التي أعطيتها: ${intake.monthlyBudget} ₪ شهرياً.`
            : "الميزانية غير معطاة — لا تقسيم رقمي.",
          intake.monthlyBudget
            ? `Budget you supplied: ${intake.monthlyBudget} ₪ / month. Split is on the media card.`
            : "Budget not supplied — no numeric split and no lead gauge.",
        )),
      ],
    },
    { id: "missing_questions", items: missingQs },
  ];
}
