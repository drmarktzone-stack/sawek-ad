import type { Intake, Locale } from "../types";
import type { Vertical } from "../vertical";
import { crowdFallback, detectVertical, placeNoun, unknownProblemLabel } from "../vertical";
import { isNoOffer } from "../no-offer";
import { isFreeService, problemChipsFor } from "../operating-model";
import { ADVANTAGE_CHIPS, OFFER_CHIPS, audienceChipsFor, resolveChipLabel } from "../chips";
import { anglesFor, ctasFor, hooksFor } from "../creative-bank";
import { filled } from "../utils";

export type Tri = Record<Locale, string>;

export function L(he: string, ar: string, en: string): Tri {
  return { he, ar, en };
}

function clip(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return t.slice(0, max).trim();
}

export function factBlob(intake: Intake): string {
  return [
    intake.businessName,
    intake.category,
    intake.description,
    intake.location,
    intake.audience,
    intake.biggestProblem,
    intake.uniqueAdvantage,
    intake.mainGoal,
    intake.offer,
    intake.clinicHours,
    intake.whatsapp,
    intake.website,
    intake.channelNotes,
    intake.pastAds,
    intake.pastResults,
  ]
    .filter(Boolean)
    .join(" ");
}

export function hasSaleLanguage(intake: Intake): boolean {
  if (isNoOffer(intake.offer) || isFreeService(intake)) return false;
  return /חיסול|clearance|sale|מבצע|הנחה|خصم|تنزيلات|تخفيض/i.test(
    `${intake.offer} ${intake.description} ${intake.uniqueAdvantage}`,
  );
}

export interface VerticalPlaybook {
  vertical: Vertical;
  hookPain: Tri;
  proof: Tri;
  channels: Tri;
  plan7: Tri;
  audienceProposed: Tri;
  problemProposed: Tri;
  advantageProposed: Tri;
  angles: Tri[];
}

function nameOf(intake: Intake, locale: Locale): string {
  return intake.businessName.trim() || placeNoun(intake, locale);
}

function locOf(intake: Intake, locale: Locale): string {
  if (intake.location.trim()) return intake.location.trim();
  return locale === "he" ? "האזור" : locale === "ar" ? "المنطقة" : "the area";
}

function offerBit(intake: Intake, locale: Locale): string {
  if (isNoOffer(intake.offer) || isFreeService(intake)) return "";
  return resolveChipLabel(intake.offer, OFFER_CHIPS, locale) || intake.offer.trim();
}

function advBit(intake: Intake, locale: Locale): string {
  return resolveChipLabel(intake.uniqueAdvantage, ADVANTAGE_CHIPS, locale) || intake.uniqueAdvantage.trim();
}

function problemBit(intake: Intake, locale: Locale): string {
  const tokens = (intake.biggestProblem || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (tokens.length === 1 && tokens[0] === "unknown") return "";
  return resolveChipLabel(intake.biggestProblem, problemChipsFor(intake), locale) || intake.biggestProblem.trim();
}

export function playbookFor(intake: Intake): VerticalPlaybook {
  const v = detectVertical(intake);
  const nHe = nameOf(intake, "he");
  const nAr = nameOf(intake, "ar");
  const nEn = nameOf(intake, "en");
  const locHe = locOf(intake, "he");
  const locAr = locOf(intake, "ar");
  const locEn = locOf(intake, "en");
  const placeHe = placeNoun(intake, "he");
  const placeAr = placeNoun(intake, "ar");
  const placeEn = placeNoun(intake, "en");
  const crowdHe = crowdFallback(intake, "he");
  const crowdAr = crowdFallback(intake, "ar");
  const crowdEn = crowdFallback(intake, "en");
  const desc = clip(intake.description, 110);
  const advHe = advBit(intake, "he");
  const advAr = advBit(intake, "ar");
  const advEn = advBit(intake, "en");
  const painHe = problemBit(intake, "he");
  const painAr = problemBit(intake, "ar");
  const painEn = problemBit(intake, "en");
  const offerHe = offerBit(intake, "he");
  const offerAr = offerBit(intake, "ar");
  const offerEn = offerBit(intake, "en");
  const sale = hasSaleLanguage(intake);
  const free = isFreeService(intake);
  const wa = intake.whatsapp.trim();
  const unknown = unknownProblemLabel(v);

  const audienceProposed = L(
    filled(intake.location)
      ? `${crowdHe} ב${locHe}`
      : crowdHe,
    filled(intake.location) ? `${crowdAr} في ${locAr}` : crowdAr,
    filled(intake.location) ? `${crowdEn} in ${locEn}` : crowdEn,
  );

  const problemFromDesc = desc
    ? L(
        clip(painHe || `${unknown.he} — ${desc}`, 120),
        clip(painAr || `${unknown.ar} — ${desc}`, 120),
        clip(painEn || `${unknown.en} — ${desc}`, 120),
      )
    : unknown;

  const advantageFromFacts = L(
    clip(
      advHe && advHe !== desc
        ? advHe
        : [nHe, locHe !== "האזור" ? locHe : "", desc].filter(Boolean).join(" · ") || nHe,
      120,
    ),
    clip(
      advAr && advAr !== desc
        ? advAr
        : [nAr, locAr !== "المنطقة" ? locAr : "", desc].filter(Boolean).join(" · ") || nAr,
      120,
    ),
    clip(
      advEn && advEn !== desc
        ? advEn
        : [nEn, locEn !== "the area" ? locEn : "", desc].filter(Boolean).join(" · ") || nEn,
      120,
    ),
  );

  const bankAngles = (locale: Locale) => anglesFor(v, locale);
  const bankCtas = (locale: Locale) => ctasFor(v, locale);
  const bankHooks = (locale: Locale) => hooksFor(v, locale, intake);

  const channelCore = L(
    [
      "פייסבוק + אינסטגרם לפיד וסטורי.",
      wa ? `וואטסאפ ${wa} להודעות — PLAN בלבד.` : "וואטסאפ רק אם יש מספר בקליטה.",
      "דף נחיתה עם אותה זווית. בלי פרסום חי לרשת.",
    ].join(" "),
    [
      "فيسبوك + إنستغرام للفيد والستوري.",
      wa ? `واتساب ${wa} للرسائل — خطة فقط.` : "واتساب فقط إذا في رقم بالكِليطة.",
      "صفحة هبوط بنفس الزاوية. بلا نشر حي.",
    ].join(" "),
    [
      "Facebook + Instagram for feed and stories.",
      wa ? `WhatsApp ${wa} for messages — PLAN only.` : "WhatsApp only if a number is on file.",
      "Landing page with the same angle. No live network publish.",
    ].join(" "),
  );

  if (v === "retail") {
    const saleLineHe = sale && offerHe ? `המבצע שסופק: ${offerHe}.` : "אין מבצע מומצא — מדברים על המדף והמותגים.";
    const saleLineAr = sale && offerAr ? `العرض المعطى: ${offerAr}.` : "ما في عرض مختلق — نحكي عن الرف والماركات.";
    const saleLineEn = sale && offerEn ? `Offer as given: ${offerEn}.` : "No invented promo — talk about the rack and the brands.";
    return {
      vertical: v,
      hookPain: L(
        painHe || `${unknown.he} ${nHe} ב${locHe}.`,
        painAr || `${unknown.ar} ${nAr} في ${locAr}.`,
        painEn || `${unknown.en} ${nEn} in ${locEn}.`,
      ),
      proof: L(
        [advHe || `${nHe} — מותגים על המדף`, saleLineHe].filter(Boolean).join(" "),
        [advAr || `${nAr} — ماركات عالرف`, saleLineAr].filter(Boolean).join(" "),
        [advEn || `${nEn} — brands on the rack`, saleLineEn].filter(Boolean).join(" "),
      ),
      channels: channelCore,
      plan7: L(
        `ימים 1–2: 3 קריאייטיבים (כאב / מדף / ${sale && offerHe ? offerHe : "יתרון"}). פייסבוק+אינסטגרם. ימים 3–4: זווית מנצחת לפי הודעות. ימים 5–7: סטורי + דף נחיתה + וואטסאפ. PLAN בלבד, בלי סקייל.`,
        `يوم 1–2: 3 إبداعات (ألم / رف / ${sale && offerAr ? offerAr : "ميزة"}). فيسبوك+إنستغرام. يوم 3–4: زاوية رابحة حسب الرسائل. يوم 5–7: ستوري + هبوط + واتساب. خطة فقط.`,
        `Days 1–2: 3 creatives (pain / rack / ${sale && offerEn ? offerEn : "advantage"}). Facebook+Instagram. Days 3–4: winning angle by messages. Days 5–7: story + landing + WhatsApp. PLAN only, no scale.`,
      ),
      audienceProposed,
      problemProposed: problemFromDesc,
      advantageProposed: advantageFromFacts,
      angles: [
        L(bankAngles("he")[0] || "מותגים על המדף", bankAngles("ar")[0] || "ماركات عالرف", bankAngles("en")[0] || "brands on the rack"),
        L(bankHooks("he")[0] || nHe, bankHooks("ar")[0] || nAr, bankHooks("en")[0] || nEn),
        L(bankCtas("he")[0] || "בואו לחנות", bankCtas("ar")[0] || "تعوا ع المحل", bankCtas("en")[0] || "Come to the store"),
      ],
    };
  }

  if (v === "restaurant") {
    const hungerHe = painHe || (offerHe ? `${nHe} — רעבים? ${offerHe}` : `${nHe} — רעב, תפריט ומשלוח.`);
    const hungerAr = painAr || (offerAr ? `${nAr} — جوعانين؟ ${offerAr}` : `${nAr} — جوع، قائمة وتوصيل.`);
    const hungerEn = painEn || (offerEn ? `${nEn} — hungry? ${offerEn}` : `${nEn} — hunger, menu, delivery.`);
    const saleOnceHe = sale && offerHe ? `המבצע שסופק: ${offerHe}.` : "אין הנחה באתר — מדברים על התפריט והמשלוח פעם אחת, בלי ספאם.";
    const saleOnceAr = sale && offerAr ? `العرض المعطى: ${offerAr}.` : "ما في خصم بالموقع — نحكي عن القائمة والتوصيل مرة واحدة، بلا سبام.";
    const saleOnceEn = sale && offerEn ? `Offer as given: ${offerEn}.` : "No site discount — talk menu and delivery once, no spam.";
    return {
      vertical: v,
      hookPain: L(hungerHe, hungerAr, hungerEn),
      proof: L(
        [advHe || `${nHe} — טעם, תפריט ומשלוח.`, saleOnceHe].filter(Boolean).join(" "),
        [advAr || `${nAr} — طعم وقائمة وتوصيل.`, saleOnceAr].filter(Boolean).join(" "),
        [advEn || `${nEn} — taste, menu, delivery.`, saleOnceEn].filter(Boolean).join(" "),
      ),
      channels: channelCore,
      plan7: L(
        "ימים 1–2: תמונת אוכל אמיתית + הוק רעב/משלוח/תפריט מהעובדות. ימים 3–4: סטורי «הזמינו היום». ימים 5–7: טלפון/וואטסאפ + דף נחיתה. PLAN. מטבח, לא מוסד רפואי. בלי «לא מכירים» כשיש שם.",
        "يوم 1–2: صورة أكل حقيقية + خطاف جوع/توصيل/قائمة من الحقائق. يوم 3–4: ستوري «اطلبوا اليوم». يوم 5–7: هاتف/واتساب + هبوط. خطة. مطبخ، مش مؤسسة طبية. بلا «مش عارفين» إذا في اسم.",
        "Days 1–2: a real food photo + hunger/delivery/menu hook from facts. Days 3–4: story “order today”. Days 5–7: phone/WhatsApp + landing. PLAN. A kitchen, not a medical institution. Never “don’t know us” when a name exists.",
      ),
      audienceProposed,
      problemProposed: L(
        clip(hungerHe, 120),
        clip(hungerAr, 120),
        clip(hungerEn, 120),
      ),
      advantageProposed: advantageFromFacts,
      angles: [
        L("רעב ומשלוח", "جوع وتوصيل", "hunger & delivery"),
        L("תפריט היום", "قائمة اليوم", "today's menu"),
        L(bankCtas("he")[0] || "הזמינו עכשיו", bankCtas("ar")[0] || "اطلبوا الآن", bankCtas("en")[0] || "Order now"),
      ],
    };
  }

  if (v === "clinic") {
    const ctaHe = free ? "חשיפה / ביקור לפי סדר הגעה — לא מכירה ולא קופון." : "תור או ביקור. בלי קופון מומצא.";
    const ctaAr = free ? "تعرّض / زيارة جت أولاً — مش بيع ومش كوبون." : "موعد أو زيارة. بلا كوبون مختلق.";
    const ctaEn = free ? "Exposure / walk-in visit — not a sale and not a coupon." : "Booking or visit. No invented coupon.";
    return {
      vertical: v,
      hookPain: L(
        painHe || unknown.he,
        painAr || unknown.ar,
        painEn || unknown.en,
      ),
      proof: L(
        advHe || `${nHe} ב${locHe}.`,
        advAr || `${nAr} في ${locAr}.`,
        advEn || `${nEn} in ${locEn}.`,
      ),
      channels: channelCore,
      plan7: L(
        `ימים 1–2: הוק על הבעיה, לא על שם המרפאה. ימים 3–4: יתרון שסופק. ימים 5–7: ${ctaHe} פייסבוק+אינסטגרם+וואטסאפ+נחיתה. PLAN.`,
        `يوم 1–2: خطاف المشكلة لا اسم العيادة. يوم 3–4: الميزة المعطاة. يوم 5–7: ${ctaAr} فيسبوك+إنستغرام+واتساب+هبوط. خطة.`,
        `Days 1–2: hook on the problem, not the clinic name. Days 3–4: stated advantage. Days 5–7: ${ctaEn} Facebook+Instagram+WhatsApp+landing. PLAN.`,
      ),
      audienceProposed,
      problemProposed: problemFromDesc,
      advantageProposed: advantageFromFacts,
      angles: [
        L(bankAngles("he")[0] || "אמון", bankAngles("ar")[0] || "ثقة", bankAngles("en")[0] || "trust"),
        L(bankCtas("he")[0] || "הגיעו למרפאה", bankCtas("ar")[0] || "تعوا عالعيادة", bankCtas("en")[0] || "Come to the clinic"),
        L(bankHooks("he")[0] || nHe, bankHooks("ar")[0] || nAr, bankHooks("en")[0] || nEn),
      ],
    };
  }

  if (v === "pool") {
    return {
      vertical: v,
      hookPain: L(painHe || unknown.he, painAr || unknown.ar, painEn || unknown.en),
      proof: L(
        advHe || `${nHe} — מים וטיפול שצוין, בלי הבטחה רפואית שלא נאמרה.`,
        advAr || `${nAr} — مي وعلاج مذكور، بلا وعد طبي ما انقال.`,
        advEn || `${nEn} — water and stated care, no unstated medical promise.`,
      ),
      channels: channelCore,
      plan7: L(
        "ימים 1–2: מים + משפחה. ימים 3–4: יתרון שסופק. ימים 5–7: בואו לבריכה / וואטסאפ. PLAN.",
        "يوم 1–2: مي + عائلة. يوم 3–4: الميزة المعطاة. يوم 5–7: تعوا ع المسبح / واتساب. خطة.",
        "Days 1–2: water + family. Days 3–4: stated advantage. Days 5–7: visit the pool / WhatsApp. PLAN.",
      ),
      audienceProposed,
      problemProposed: problemFromDesc,
      advantageProposed: advantageFromFacts,
      angles: [
        L("מים", "مي", "water"),
        L("משפחה", "عائلة", "family"),
        L(bankCtas("he")[0] || "בואו לבריכה", bankCtas("ar")[0] || "تعوا ع المسبح", bankCtas("en")[0] || "Visit the pool"),
      ],
    };
  }

  if (v === "product") {
    return {
      vertical: v,
      hookPain: L(painHe || unknown.he, painAr || unknown.ar, painEn || unknown.en),
      proof: L(
        advHe || `${nHe} — יתרון שחולץ מהדף, בלי ROAS.`,
        advAr || `${nAr} — ميزة مستخرجة من الصفحة، بلا ROAS.`,
        advEn || `${nEn} — advantage extracted from the page, no ROAS.`,
      ),
      channels: channelCore,
      plan7: L(
        "ימים 1–2: הוק על הכאב שחולץ. ימים 3–4: יתרון שחולץ + אתר. ימים 5–7: הצטרפו / לאתר. PLAN. בלי מחיר שלא פורסם.",
        "يوم 1–2: خطاف الألم المستخرج. يوم 3–4: الميزة + الموقع. يوم 5–7: انضموا / للموقع. خطة. بلا سعر غير منشور.",
        "Days 1–2: hook on extracted pain. Days 3–4: extracted advantage + site. Days 5–7: join / visit the site. PLAN. No unpublished price.",
      ),
      audienceProposed,
      problemProposed: problemFromDesc,
      advantageProposed: advantageFromFacts,
      angles: [
        L("כאב שחולץ", "ألم مستخرج", "extracted pain"),
        L("יתרון שחולץ", "ميزة مستخرجة", "extracted advantage"),
        L(bankCtas("he")[0] || "הצטרפו", bankCtas("ar")[0] || "انضموا", bankCtas("en")[0] || "Join"),
      ],
    };
  }

  if (v === "school") {
    return {
      vertical: v,
      hookPain: L(painHe || unknown.he, painAr || unknown.ar, painEn || unknown.en),
      proof: L(
        advHe || `${nHe} — קהילה והרשמה, לא מבצע לימודים מומצא.`,
        advAr || `${nAr} — مجتمع وتسجيل، بلا عرض دراسي مختلق.`,
        advEn || `${nEn} — community and enrollment, no invented tuition offer.`,
      ),
      channels: channelCore,
      plan7: L(
        "ימים 1–2: חשיפה לקהילה. ימים 3–4: יתרון שסופק. ימים 5–7: הרשמה / צרו קשר. PLAN. בלי קופון שכר לימוד.",
        "يوم 1–2: تعرّض للمجتمع. يوم 3–4: الميزة المعطاة. يوم 5–7: تسجيل / تواصلوا. خطة. بلا كوبون أقساط.",
        "Days 1–2: community exposure. Days 3–4: stated advantage. Days 5–7: enroll / get in touch. PLAN. No tuition coupon.",
      ),
      audienceProposed,
      problemProposed: problemFromDesc,
      advantageProposed: advantageFromFacts,
      angles: [
        L("הרשמה", "تسجيل", "enrollment"),
        L("קהילה", "مجتمع", "community"),
        L("חשיפה", "تعرّض", "exposure"),
      ],
    };
  }

  return {
    vertical: v,
    hookPain: L(painHe || unknown.he, painAr || unknown.ar, painEn || unknown.en),
    proof: L(
      advHe || `${nHe} — יתרון שסופק.`,
      advAr || `${nAr} — ميزة معطاة.`,
      advEn || `${nEn} — stated advantage.`,
    ),
    channels: channelCore,
    plan7: L(
      `ימים 1–2: הוק על בעיה. ימים 3–4: יתרון. ימים 5–7: ${placeHe} / וואטסאפ / נחיתה. PLAN.`,
      `يوم 1–2: خطاف المشكلة. يوم 3–4: الميزة. يوم 5–7: ${placeAr} / واتساب / هبوط. خطة.`,
      `Days 1–2: problem hook. Days 3–4: advantage. Days 5–7: ${placeEn} / WhatsApp / landing. PLAN.`,
    ),
    audienceProposed,
    problemProposed: problemFromDesc,
    advantageProposed: advantageFromFacts,
    angles: [
      L("היכרות", "تعارف", "awareness"),
      L("יתרון שסופק", "ميزة معطاة", "stated advantage"),
      L(bankCtas("he")[0] || "צרו קשר", bankCtas("ar")[0] || "تواصلوا", bankCtas("en")[0] || "Contact us"),
    ],
  };
}

export function resolveAudienceLabel(intake: Intake, locale: Locale): string {
  return resolveChipLabel(intake.audience, audienceChipsFor(intake), locale) || intake.audience.trim();
}
