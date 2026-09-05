import type {
  CoachCritique,
  CoachReport,
  CoachStage,
  CoachStrategy,
  CoachSuggestion,
  Intake,
  Locale,
} from "../types";
import { filled } from "../utils";
import { isNoOffer } from "../no-offer";
import { isFreeService } from "../operating-model";
import { detectVertical, unknownProblemLabel } from "../vertical";
import { splitChipTokens } from "../chips";
import { factBlob, hasSaleLanguage, L, playbookFor } from "./playbooks";

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function norm(s: string): string {
  return String(s || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function isUnknownProblem(intake: Intake): boolean {
  const raw = String(intake.biggestProblem || "").trim();
  if (!raw) return true;
  const tokens = splitChipTokens(raw);
  if (tokens.length === 1 && tokens[0] === "unknown") return true;
  const labels = Object.values(unknownProblemLabel(detectVertical(intake))).map(norm);
  if (tokens.every((t) => t === "unknown" || labels.includes(norm(t)))) return true;
  return false;
}

export function isClonedAdvantage(intake: Intake): boolean {
  const a = norm(intake.uniqueAdvantage);
  const d = norm(intake.description);
  if (!a || !d) return false;
  if (a === d) return true;
  if (a.length > 24 && d.includes(a)) return true;
  if (d.length > 24 && a.includes(d)) return true;
  return false;
}

export function isWeakAudience(intake: Intake): boolean {
  const a = intake.audience.trim();
  if (!a) return true;
  if (/כולם|everyone|الجميع|all people|^all$|כולם באזור/i.test(a)) return true;
  return false;
}

const INVENTED_MONEY = /₪|\bNIS\b|\$\d|\€\d|\b\d+\s*%/;
export function inventsForbidden(text: string, intake: Intake): boolean {
  const blob = factBlob(intake);
  if (INVENTED_MONEY.test(text)) {
    const matches = text.match(/₪|\$\d|€\d|\b\d+\s*%/g) || [];
    for (const m of matches) {
      if (!blob.includes(m) && !blob.includes(m.replace(/\s/g, ""))) return true;
    }
  }
  if (/\bVIP\b/i.test(text) && !/\bVIP\b/i.test(blob)) return true;
  if (/\bROAS\b/i.test(text) && !/\bROAS\b/i.test(blob)) return true;
  if (/\bCAC\b/i.test(text) && !/\bCAC\b/i.test(blob)) return true;
  return false;
}

function applySafeText(proposed: Record<Locale, string>, intake: Intake, sourceFilled: boolean): boolean {
  if (!sourceFilled) return false;
  const joined = `${proposed.he} ${proposed.ar} ${proposed.en}`;
  if (!proposed.he.trim() && !proposed.ar.trim() && !proposed.en.trim()) return false;
  if (inventsForbidden(joined, intake)) return false;
  if (isNoOffer(intake.offer) || isFreeService(intake)) {
    if (/קופון|كوبون|coupon|קנו עכשיו|اشتروا الآن|buy now/i.test(joined) && !/לא|بلا|no /i.test(joined)) {
      return false;
    }
  }
  return true;
}

function scoreIntake(intake: Intake): number {
  let score = 18;
  if (filled(intake.businessName)) score += 12;
  if (filled(intake.description) && intake.description.trim().length > 40) score += 12;
  else if (filled(intake.description)) score += 6;
  if (filled(intake.location) && intake.type !== "app") score += 8;
  else if (intake.type === "app") score += 4;
  if (filled(intake.audience) && !isWeakAudience(intake)) score += 12;
  else if (filled(intake.audience)) score += 5;
  if (filled(intake.biggestProblem) && !isUnknownProblem(intake)) score += 12;
  else if (filled(intake.biggestProblem)) score += 4;
  if (filled(intake.uniqueAdvantage) && !isClonedAdvantage(intake)) score += 12;
  else if (filled(intake.uniqueAdvantage)) score += 4;
  if (filled(intake.mainGoal)) score += 8;
  if (filled(intake.whatsapp) || filled(intake.website)) score += 6;
  if (filled(intake.offer) && !isNoOffer(intake.offer) && !isFreeService(intake)) score += 4;
  if ((intake.mediaAssets ?? []).length > 0) score += 4;
  return clamp(score);
}

function ev(intake: Intake, field: string, value: string): Record<Locale, string> {
  const shown = value.trim() || "—";
  return L(`ראיה מהקליטה · ${field}: ${shown}`, `دليل من البيانات · ${field}: ${shown}`, `Evidence from intake · ${field}: ${shown}`);
}

export function coachIntake(intake: Intake): CoachReport {
  const vertical = detectVertical(intake);
  const pb = playbookFor(intake);
  const score = scoreIntake(intake);
  const critiques: CoachCritique[] = [];
  const suggestions: CoachSuggestion[] = [];

  const nameEmpty = !filled(intake.businessName);
  const descEmpty = !filled(intake.description);
  const locEmpty = !filled(intake.location) && intake.type !== "app";

  if (nameEmpty || descEmpty || locEmpty) {
    critiques.push({
      stage: "wizard_business",
      finding: L(
        nameEmpty
          ? "בלי שם — המודעה לא תישמע שייכת לעסק. להשלים שם חוקי/מסחרי לפני פרסום."
          : descEmpty
            ? "התיאור דק. הוסיפו משפט אחד על מה העסק עושה בפועל — ההוקים יתחדדו."
            : "בלי אזור — לא נקבע רדיוס. לצלם חזית או להוסיף עיר.",
        nameEmpty
          ? "اسم النشاط ناقص — ما في إعلان يخص حدا."
          : descEmpty
            ? "الوصف ضعيف. بلا شو الشغل، الخطافات بتضل عامة."
            : "الموقع ناقص — استهداف محلي بلا منطقة تخمين.",
        nameEmpty
          ? "Business name is missing — the ad belongs to nobody."
          : descEmpty
            ? "Description is thin. Without what the business does, hooks stay generic."
            : "Location is missing — local targeting without an area is a guess.",
      ),
      why: L(
        "מלאו שם, תיאור קצר ומיקום ממה שפורסם בפועל — בלי סיסמה ריקה.",
        "عبّوا اسم ووصف قصير وموقع مما منشور فعلاً — بلا شعار فاضي.",
        "Fill name, a short description, and location from what is actually published — no empty slogan.",
      ),
      evidence: ev(
        intake,
        nameEmpty ? "businessName" : descEmpty ? "description" : "location",
        nameEmpty ? intake.businessName : descEmpty ? intake.description : intake.location,
      ),
    });
  }

  if (isUnknownProblem(intake) || isWeakAudience(intake) || isClonedAdvantage(intake)) {
    const finding = isUnknownProblem(intake)
      ? L(
          "הבעיה מסומנת כ«לא מכירים» / ריקה — זה חלש. הוק בלי כאב ספציפי נשמע כמו עוד מודעה.",
          "المشكلة «الناس مش عارفين» / فاضية — ضعيف. خطاف بلا ألم محدد بيبين كأي إعلان.",
          "The problem is “unknown” / empty — that’s weak. A hook without a specific pain sounds like every other ad.",
        )
      : isClonedAdvantage(intake)
        ? L(
            "היתרון מועתק מהתיאור. זה לא יתרון — זו חזרה. צריך משפט אחד חד יותר ממה שכבר נכתב.",
            "الميزة منسوخة من الوصف. هاي مش ميزة — تكرار. لازم جملة أحدّ من المكتوب.",
            "The advantage is cloned from the description. That is not an advantage — it is a repeat. Tighten one sentence from what is already written.",
          )
        : L(
            "הקהל חלש או «כולם». מודעה לכולם נשמעת לאף אחד.",
            "الجمهور ضعيف أو «الجميع». إعلان للجميع ما بيسمعه حدا.",
            "The audience is weak or “everyone”. An ad to everyone sounds like an ad to no one.",
          );
    critiques.push({
      stage: "wizard_details",
      finding,
      why: L(
        "חדדו בעיה, קהל ויתרון מתוך התיאור והמיקום שכבר בקליטה — בלי להמציא כאב.",
        "حدّدوا مشكلة وجمهور وميزة من الوصف والموقع الموجودين — بلا اختراع ألم.",
        "Sharpen problem, audience, and advantage from the description and location already in intake — don’t invent a pain.",
      ),
      evidence: ev(
        intake,
        isUnknownProblem(intake) ? "biggestProblem" : isClonedAdvantage(intake) ? "uniqueAdvantage" : "audience",
        isUnknownProblem(intake)
          ? intake.biggestProblem
          : isClonedAdvantage(intake)
            ? intake.uniqueAdvantage
            : intake.audience,
      ),
    });
  }

  if (isNoOffer(intake.offer) || isFreeService(intake)) {
    critiques.push({
      stage: "offer",
      finding: L(
        isFreeService(intake)
          ? "שירות חינם: אין מכירה ואין קופון. הערך = בעיה + יתרון + חשיפה/ביקור."
          : "אין מבצע — זה תקין. אל תמציאו הנחה. הערך מהבעיה והיתרון.",
        isFreeService(intake)
          ? "خدمة مجانية: ما في بيع وما في كوبون. القيمة = مشكلة + ميزة + تعرّض/زيارة."
          : "ما في عرض — سليم. لا تخترعوا خصماً. القيمة من المشكلة والميزة.",
        isFreeService(intake)
          ? "Free service: no sale and no coupon. Value = problem + advantage + exposure/visit."
          : "No offer — that’s valid. Do not invent a discount. Value comes from the problem and the advantage.",
      ),
      why: L(
        "אסטרטגיה: בעיה + יתרון. בלי ₪ שלא פורסם.",
        "الاستراتيجية: مشكلة + ميزة. بلا ₪ غير منشور.",
        "Strategy: problem + advantage. No unpublished ₪.",
      ),
      evidence: ev(intake, "offer", intake.offer || "no_offer"),
    });
  } else if (hasSaleLanguage(intake)) {
    critiques.push({
      stage: "offer",
      finding: L(
        `יש מבצע שסופק («${intake.offer}»). השתמשו בו כמו שהוא — בלי מחיר נוסף.`,
        `في عرض معطى («${intake.offer}»). استعملوه كما هو — بلا سعر إضافي.`,
        `An offer was supplied (“${intake.offer}”). Use it as written — no extra price.`,
      ),
      why: L(
        "באנר מבצע / סטורי רק על מה שפורסם בקליטה.",
        "بانر عرض / ستوري بس على اللي منشور بالكِليطة.",
        "Sale banner / story only on what is published in intake.",
      ),
      evidence: ev(intake, "offer", intake.offer),
    });
  }

  const channelsEmpty = !filled(intake.channelNotes);
  if (channelsEmpty) {
    critiques.push({
      stage: "channels",
      finding: L(
        "ערוצים לא סומנו. מיקס ברירת מחדל: פייסבוק + אינסטגרם + וואטסאפ (אם יש מספר) + דף נחיתה — PLAN.",
        "القنوات مش محددة. المزيج الافتراضي: فيسبوك + إنستغرام + واتساب (إذا في رقم) + صفحة هبوط — خطة.",
        "Channels are unmarked. Default mix: Facebook + Instagram + WhatsApp (if a number exists) + landing — PLAN.",
      ),
      why: pb.channels,
      evidence: ev(intake, "channelNotes", intake.channelNotes),
    });
  }

  const noCreative = !(intake.mediaAssets ?? []).length && !(intake.pastCreatives ?? []).length;
  if (noCreative) {
    critiques.push({
      stage: "creative",
      finding: L(
        "אין תמונה עדיין — נציע גריד חי לפי הנושא, בלי להמציא פנים.",
        "ما في صورة/إعلان سابق. النموذج رح يبقى عينة — بلا اختراع وجوه.",
        "No photo / past ad. The mockup stays a sample — no invented faces.",
      ),
      why: L(
        `זוויות מהבנק: ${pb.angles.map((a) => a.he).join(" · ")}.`,
        `زوايا من البنك: ${pb.angles.map((a) => a.ar).join(" · ")}.`,
        `Bank angles: ${pb.angles.map((a) => a.en).join(" · ")}.`,
      ),
      evidence: ev(intake, "mediaAssets", String((intake.mediaAssets ?? []).length)),
    });
  }

  const hasSource = filled(intake.businessName) || filled(intake.description) || filled(intake.location);

  if (isUnknownProblem(intake) || !filled(intake.biggestProblem)) {
    const proposed = pb.problemProposed;
    suggestions.push({
      field: "biggestProblem",
      current: intake.biggestProblem || "",
      proposed,
      reason: L(
        "הוק על כאב מהתיאור/התחום — לא על שם העסק, ובלי כאב מומצא ממחיר.",
        "خطاف ألم من الوصف/المجال — مش من اسم المحل، وبلا ألم سعر مختلق.",
        "Hook on pain from the description/vertical — not the business name, and no invented price-pain.",
      ),
      applySafe: applySafeText(proposed, intake, hasSource && (filled(intake.description) || filled(intake.businessName))),
    });
  }

  if (isClonedAdvantage(intake) || !filled(intake.uniqueAdvantage)) {
    const proposed = pb.advantageProposed;
    suggestions.push({
      field: "uniqueAdvantage",
      current: intake.uniqueAdvantage || "",
      proposed,
      reason: L(
        "יתרון אחד חד יותר ממה שכבר בקליטה (שם, מקום, תיאור) — בלי דירוג ובלי ₪.",
        "ميزة واحدة أحدّ مما بالكِليطة (اسم، مكان، وصف) — بلا تقييم وبلا ₪.",
        "One tighter advantage from what is already in intake (name, place, description) — no rating and no ₪.",
      ),
      applySafe: applySafeText(proposed, intake, hasSource),
    });
  }

  if (isWeakAudience(intake)) {
    const proposed = pb.audienceProposed;
    suggestions.push({
      field: "audience",
      current: intake.audience || "",
      proposed,
      reason: L(
        "צמצמו לקהל עם מקום ובעיה משותפים — מתוך המיקום והתחום.",
        "ضيّقوا لجمهور بمكان ومشكلة مشتركين — من الموقع والمجال.",
        "Narrow to a group with a shared place and problem — from location and vertical.",
      ),
      applySafe: applySafeText(proposed, intake, filled(intake.location) || filled(intake.businessName)),
    });
  }

  if (channelsEmpty && hasSource) {
    const wa = intake.whatsapp.trim();
    const mix = wa ? "facebook,instagram,whatsapp" : "facebook,instagram";
    const proposed = L(mix, mix, mix);
    suggestions.push({
      field: "channelNotes",
      current: intake.channelNotes || "",
      proposed,
      reason: pb.channels,
      applySafe: true,
    });
  }

  const sale = hasSaleLanguage(intake);
  const free = isFreeService(intake);
  const strategies: CoachStrategy[] = [
    {
      id: "hook-on-pain",
      title: L("הוק על הכאב", "خطاف الألم", "Hook on the pain"),
      body: pb.hookPain,
      plan7: L(
        `שבוע 1: פתיחה בבעיה, לא בשם. ${pb.plan7.he}`,
        `الأسبوع 1: افتتاح بالمشكلة لا بالاسم. ${pb.plan7.ar}`,
        `Week 1: open on the problem, not the name. ${pb.plan7.en}`,
      ),
    },
    {
      id: "proof-advantage",
      title: L("הוכחה / יתרון", "إثبات / ميزة", "Proof / advantage"),
      body: L(
        free
          ? `${pb.proof.he} מודל: חשיפה/ביקור — לא מכירה.`
          : sale
            ? `${pb.proof.he}`
            : `${pb.proof.he} אין קופון מומצא.`,
        free
          ? `${pb.proof.ar} النموذج: تعرّض/زيارة — مش بيع.`
          : sale
            ? `${pb.proof.ar}`
            : `${pb.proof.ar} بلا كوبون مختلق.`,
        free
          ? `${pb.proof.en} Model: exposure/visit — not a sale.`
          : sale
            ? `${pb.proof.en}`
            : `${pb.proof.en} No invented coupon.`,
      ),
      plan7: pb.plan7,
    },
    {
      id: "channel-mix",
      title: L("מיקס ערוצים + 7 ימים", "مزيج قنوات + 7 أيام", "Channel mix + 7 days"),
      body: pb.channels,
      plan7: pb.plan7,
    },
  ];

  const anglesUsed = [
    ...pb.angles,
    L(
      `תחום: ${vertical}. ציון שלמות קליטה: ${score}/100.`,
      `المجال: ${vertical}. درجة اكتمال البيانات: ${score}/100.`,
      `Vertical: ${vertical}. Intake quality score: ${score}/100.`,
    ),
  ];

  return {
    score,
    vertical,
    critiques,
    suggestions,
    strategies,
    anglesUsed,
  };
}

export function stageToDiagnosisArea(stage: CoachStage): "offer" | "hook" | "audience" | "creative" | "targeting" | "funnel" {
  switch (stage) {
    case "offer":
      return "offer";
    case "wizard_details":
      return "hook";
    case "channels":
      return "targeting";
    case "creative":
      return "creative";
    case "wizard_business":
      return "funnel";
    default:
      return "funnel";
  }
}

