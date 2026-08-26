import type { Locale, SelfPlan, SelfProfile, StudioPiece } from "./types";
import { uid } from "./utils";
import { isNoOffer } from "./no-offer";

export function generateStudioVariants(
  kind: StudioPiece["kind"],
  idea: string,
  locale: Locale,
): { title: string; body: string }[] {
  const seed = idea.trim() || (locale === "he" ? "רעיון לא מולא" : locale === "ar" ? "الفكرة غير مملوءة" : "Idea not filled");
  if (locale === "he") {
    const map: Record<StudioPiece["kind"], { title: string; body: string }[]> = {
      headline: [
        { title: "ישיר", body: seed },
        { title: "שאלה", body: `${seed}?` },
        { title: "ניגוד", body: `לא עוד רעש. ${seed}.` },
      ],
      post: [
        { title: "בעיה → פתרון", body: `${seed}\n\nבלי הבטחות שאין עליהן נתון.` },
        { title: "קצר לקיר", body: seed.slice(0, 140) },
        { title: "CTA", body: `${seed}\n\nאם זה רלוונטי — כתבו, לא «לייק לפרטים».` },
      ],
      reel: [
        { title: "15s", body: `0–3 שניות: משפט פתיחה מתוך הרעיון.\n3–12: ${seed}\n12–15: CTA אחד.` },
        { title: "בלי טקסט על המסך מוגזם", body: `דיבור ברור. ${seed}` },
        { title: "מה לא", body: "בלי לפני/אחרי מזויף ובלי דירוג 5 כוכבים מומצא." },
      ],
      story: [
        { title: "פריים 1", body: seed },
        { title: "פריים 2", body: "שאלה אחת לצופה. בלי סקר מזויא תוצאות." },
        { title: "פריים 3", body: "קישור/הודעה — רק אם יש לאן לשלוח." },
      ],
      email: [
        { title: "נושא", body: seed.slice(0, 60) },
        { title: "גוף", body: `שלום,\n\n${seed}\n\nאם לא רלוונטי — התעלמו. בלי המצאת מחסור במלאי.` },
        { title: "PS", body: isNoOffer("") ? "אין מבצע בשורת הסיום אלא אם באמת יש." : "" },
      ],
    };
    return map[kind];
  }
  if (locale === "ar") {
    return [
      { title: "مباشر", body: seed },
      { title: "أقصر", body: seed.slice(0, 140) },
      { title: "CTA", body: `${seed}\n\nإذا كان مناسباً — اكتبوا، لا «لايك للتفاصيل».` },
    ];
  }
  return [
    { title: "Direct", body: seed },
    { title: "Shorter", body: seed.slice(0, 140) },
    { title: "CTA", body: `${seed}\n\nIf this is relevant — write back. No “like for details”.` },
  ];
}

export function weekPlan(profile: SelfProfile): SelfPlan {
  const craft = profile.craft || "—";
  const aud = profile.audience || "—";
  const ch = profile.channels || "הערוץ שציינת";
  const offer = isNoOffer(profile.offer)
    ? { he: "בלי מבצע מלאכותי", ar: "بلا عرض مصطنع", en: "no manufactured offer" }
    : { he: profile.offer, ar: profile.offer, en: profile.offer };

  const days = [
    ["ראשון", "الأحد", "Sunday", `פוסט ידע קצר על ${craft} ל${aud}. ${ch}.`],
    ["שני", "الاثنين", "Monday", "תשובה ל-5 פניות אמיתיות / תיעוד מה נשאל. בלי המצאת שאלות."],
    ["שלישי", "الثلاثاء", "Tuesday", `סטורי תהליך עבודה. ${offer.he}.`],
    ["רביעי", "الأربعاء", "Wednesday", "שתיקה מתוכננת או מאחורי הקלעים — לא «יום חובה תוכן» אם אין מה להגיד."],
    ["חמישי", "الخميس", "Thursday", `מודעה אורגנית עם CTA ברור ל${aud}.`],
    ["שישי", "الجمعة", "Friday", "סיכום שבוע: כמה פניות אמיתיות, לא עוקבים."],
    ["שבת", "السبت", "Saturday", "מנוחה או תכנון השבוע הבא. בלי אוטומציה שמפרסמת בלי אישור."],
  ].map(([he, ar, en, taskHe], i) => ({
    day: { he, ar, en },
    task: {
      he: taskHe,
      ar: ["منشور معرفة", "الرد على 5 طلبات حقيقية", "ستوري عملية", "صمت مخطط إن لم يوجد ما يُقال", "منشور عضوي بCTA", "تلخيص الأسبوع بالطلبات لا المتابعين", "راحة أو تخطيط — بلا أتمتة دون موافقة"][i],
      en: [
        `Short knowledge post about ${craft} for ${aud}.`,
        "Reply to 5 real enquiries / log what was asked. Don’t invent questions.",
        `Process story. ${offer.en}.`,
        "Planned silence or behind-the-scenes — not a mandatory content day if there’s nothing to say.",
        `Organic post with a clear CTA for ${aud}.`,
        "Week recap: real enquiries, not follower count.",
        "Rest or plan next week. No automation that posts without approval.",
      ][i],
    },
    done: false,
  }));

  return { id: uid("plan"), createdAt: new Date().toISOString(), days };
}
