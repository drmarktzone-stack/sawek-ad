import type { ChannelBlueprint, Intake, Locale, MediaPlan } from "../types";
import { parseNumber } from "../utils";

const L = (he: string, ar: string, en: string): Record<Locale, string> => ({ he, ar, en });

function shares(intake: Intake): { meta: number; google: number; tiktok: number } {
  if (intake.type === "app") return { meta: 40, google: 20, tiktok: 40 };
  const young = /18–34|18-34|צעיר|شباب|young/.test(intake.audience);
  if (young) return { meta: 35, google: 25, tiktok: 40 };
  if (intake.type === "personal") return { meta: 55, google: 20, tiktok: 25 };
  return { meta: 50, google: 40, tiktok: 10 };
}

export function generateMedia(intake: Intake): MediaPlan {
  const budget = parseNumber(intake.monthlyBudget);
  const cac = parseNumber(intake.targetCac);
  const s = shares(intake);
  const loc = intake.location.trim();
  const aud = intake.audience.trim();

  const worstCpa = cac != null ? Math.round(cac * 1.8) : undefined;
  const realisticCpa = cac ?? undefined;

  function channel(
    channel: ChannelBlueprint["channel"],
    pct: number,
    role: Record<Locale, string>,
    notes: Record<Locale, string>,
    extra: Partial<ChannelBlueprint["targeting"]>,
  ): ChannelBlueprint {
    const monthly = budget != null ? Math.round((budget * pct) / 100) : undefined;
    const daily = monthly != null ? Math.round((monthly / 30) * 10) / 10 : undefined;
    return {
      channel,
      role,
      budgetSharePercent: pct,
      monthlyBudget: monthly,
      dailyBudget: daily,
      targeting: {
        geos: loc ? [loc] : [],
        age: extra.age ?? "",
        interests: extra.interests ?? [],
        exclusions: extra.exclusions ?? ["existing customers — if you have a list; otherwise leave empty, do not guess"],
        placements: extra.placements ?? "",
        keywords: extra.keywords ?? [],
      },
      notes,
      worstCaseCpa: worstCpa,
      realisticCpa,
    };
  }

  const split: ChannelBlueprint[] = [
    channel(
      "meta",
      s.meta,
      L("מודעות המרה / הודעות — תודעה + פנייה", "إعلانات تحويل / رسائل", "Conversion / messages — awareness + enquiry"),
      L(
        loc
          ? `גיאו: ${loc}. קהל ליבה: ${aud || "לא צוין — לא נרחיב תחומי עניין"}. בלי Lookalike לפני 50 המרות.`
          : "גיאו חסר — לא נקבע רדיוס. אל תקנו מדינה שלמה «בנתיים».",
        loc
          ? `الجغرافيا: ${loc}. النواة: ${aud || "غير مذكور"}. بلا lookalike قبل 50 تحويلاً.`
          : "الجغرافيا ناقصة — لن يُحدد نطاق. لا تشتروا بلداً كاملاً «مؤقتاً».",
        loc
          ? `Geo: ${loc}. Core: ${aud || "not specified — will not expand interests"}. No lookalike before 50 conversions.`
          : "Geo missing — no radius will be set. Do not buy a whole country “for now”.",
      ),
      {
        age: "only if the audience implies it; otherwise leave Advantage+ off and do not default 18–65",
        interests: aud ? [aud] : [],
        placements: "Feed + Stories. Skip Audience Network until you have clean conversion data.",
      },
    ),
    channel(
      "google",
      s.google,
      L("חיפוש כוונה — מי כבר מחפש", "بحث النية — من يبحث أصلاً", "Intent search — people already looking"),
      L(
        "רק מילות כוונה מהקליטה. לא נרחיב למילות מתחרים שלא הוזנו.",
        "كلمات نية من البيانات فقط. لن نوسّع إلى كلمات منافسين غير مُدخلة.",
        "Intent keywords from intake only. We will not expand into competitor terms that were not entered.",
      ),
      {
        keywords: [
          intake.category,
          loc ? `${intake.category} ${loc}` : "",
          intake.mainGoal,
        ].filter(Boolean),
        placements: "Search only in week 1. Display later, and only with brand exclusions.",
      },
    ),
    channel(
      "tiktok",
      s.tiktok,
      L("וידאו גולמי — רק אם יש חומר אמיתי", "فيديو خام — فقط إن وُجد مواد حقيقية", "Raw video — only if real footage exists"),
      L(
        s.tiktok <= 10
          ? "חלק קטן. אל תצרו טיקטוק מבוים אם אין נוכחות. אפשר 0% אם אין וידאו."
          : "יש הצדקה לקהל צעיר/אפליקציה. עדיין: בלי אפקטים שמסתירים את המסר.",
        s.tiktok <= 10
          ? "حصة صغيرة. لا تصنعوا تيك توك ممثلاً إن لم توجد مادة."
          : "مبرر لجمهور شاب/تطبيق. مع ذلك بلا مؤثرات تخفي الرسالة.",
        s.tiktok <= 10
          ? "Small share. Don’t fabricate TikToks if you have no presence. 0% is allowed if there is no video."
          : "Justified for a young/app audience. Still: no effects that hide the message.",
      ),
      { placements: "In-feed only. Spark Ads only if you have real organic posts — do not fake them." },
    ),
  ];

  const assumptions = [
    L("אין APIs חיים למטא/גוגל/טיקטוק — זה בלופרינט לקנייה ידנית.", "لا واجهات حية — هذا مخطط للشراء اليدوي.", "No live Meta/Google/TikTok APIs — this is a blueprint for a manual buy."),
    L("תרחישי לידים מופיעים רק אם סיפקתם תקציב ו-CAC.", "سيناريوهات العملاء تظهر فقط إذا أعطيتم ميزانية وCAC.", "Lead scenarios appear only if you supplied budget and CAC."),
  ];

  const missingForLiveBuy = [];
  if (!loc && intake.type !== "app") {
    missingForLiveBuy.push(L("מיקום לטירגוט", "موقع للاستهداف", "Location for targeting"));
  }
  if (budget == null) missingForLiveBuy.push(L("תקציב חודשי", "ميزانية شهرية", "Monthly budget"));
  if (!intake.website) missingForLiveBuy.push(L("כתובת אתר / דף נחיתה (אופציונלי אבל חסר)", "عنوان موقع / صفحة (اختياري لكن ناقص)", "Website / landing URL (optional but missing)"));

  let scenarioLeadsWorst: number | undefined;
  let scenarioLeadsRealistic: number | undefined;
  let scenarioFromUserNumbers = false;
  let worstCase = L(
    "אין תרחיש מספרי — חסר תקציב או CAC. לא יוצג מד 32–68 לידים.",
    "لا سيناريو رقمي — تنقص الميزانية أو CAC. لن يُعرض مقياس 32–68.",
    "No numeric scenario — budget or CAC missing. No 32–68 leads gauge will be shown.",
  );
  let realistic = worstCase;

  if (budget != null && cac != null && cac > 0) {
    scenarioFromUserNumbers = true;
    scenarioLeadsWorst = Math.floor(budget / (cac * 1.8));
    scenarioLeadsRealistic = Math.floor(budget / cac);
    worstCase = L(
      `תרחיש גרוע (מהמספרים שלך, לא תחזית): CPA ≈ ${worstCpa} ₪ → עד ${scenarioLeadsWorst} המרות/חודש מתוך ${budget} ₪. אם הפניות גרועות, המספר האמיתי יהיה נמוך יותר.`,
      `سيناريو سيئ (من أرقامك لا توقّع): CPA ≈ ${worstCpa} ₪ → حتى ${scenarioLeadsWorst} تحويلاً/شهر من ${budget} ₪.`,
      `Worst case (from your numbers, not a forecast): CPA ≈ ${worstCpa} ₪ → up to ${scenarioLeadsWorst} conversions/month from ${budget} ₪. If enquiry quality is poor, actual will be lower.`,
    );
    realistic = L(
      `תרחיש ריאלי (CAC היעד שסיפקת): ≈ ${scenarioLeadsRealistic} המרות/חודש ב-${cac} ₪. זה יעד עבודה, לא הבטחה.`,
      `سيناريو واقعي (CAC الذي أعطيته): ≈ ${scenarioLeadsRealistic} تحويلاً/شهر عند ${cac} ₪. هدف عمل لا وعد.`,
      `Realistic scenario (your target CAC): ≈ ${scenarioLeadsRealistic} conversions/month at ${cac} ₪. A working target, not a promise.`,
    );
  }

  return {
    monthlyBudget: budget,
    split,
    assumptions,
    missingForLiveBuy,
    worstCase,
    realistic,
    scenarioLeadsWorst,
    scenarioLeadsRealistic,
    scenarioFromUserNumbers,
  };
}
