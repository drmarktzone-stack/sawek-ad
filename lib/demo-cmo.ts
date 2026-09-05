import type { Intake, Locale } from "./types";

export type DemoCmoId = "demo-samer-clinic" | "demo-olive-kitchen" | "demo-sand-boutique";

/** Planning-desk fields for the three demos. Numbers are labeled sample inputs — never measured ROAS/likes. */
export type DemoCmoDesk = Pick<
  Intake,
  | "businessModel"
  | "avgOrderValue"
  | "marginPercent"
  | "targetCac"
  | "monthlyBudget"
  | "pastAds"
  | "pastResults"
  | "whatFailed"
  | "brandTone"
  | "brandPositioning"
  | "voice"
>;

const SAMPLE = {
  he: "דוגמת תכנון (לא מדידה)",
  ar: "عيّنة تخطيط (ليست قياساً)",
  en: "Sample planning input (not measured)",
} as const;

function clinicDesk(locale: Locale): DemoCmoDesk {
  if (locale === "ar") {
    return {
      businessModel: `${SAMPLE.ar}. عيادة كلاليت — الزبون لا يدفع في العيادة. التحويل = حضور حسب الدور / تسجيل واتساب لاسم الطفل. ليست عملية بيع. ميزانية تخطيط للعرض ₪1800 (وعي/حضور — ليست CPA).`,
      avgOrderValue: "",
      marginPercent: "",
      targetCac: "",
      monthlyBudget: "1800",
      pastAds:
        "منشورات فيسبوك عضوية: «بدون طوابير» + ساعات العيادة + واتساب 052-8885800. ستوريز لواجهة المجمع فارغة. لم يُشغَّل إعلان مدفوع مقيس.",
      pastResults: `${SAMPLE.ar}. لا ROAS ولا تقييمات نجوم ولا عدد إعجابات — لم تُقس حملة مدفوعة.`,
      whatFailed: "المنشورات وصفت المكان لكن نسيت أن تطلب اسماً في واتساب أو أن تكرر ساعة الوصول التالية.",
      brandTone: "هادئ، أبوي، عربي-عبري محلي. بلا ادّعاء تجميلي وبلا خصم.",
      brandPositioning: "عيادة أطفال حقيقية في باقة — وصول حسب الدور لمؤمني كلاليت، ليس براند شبكة.",
      voice: {
        niche: "عيادة أطفال في باقة — كلاليت، وصول حسب الدور",
        coreMessage: "لما الولد مريض — بتجوا حسب الدور. واتساب باسم الولد. بلا وعود طبية.",
        personalVoice: "هادئ، أبوي، عربي-عبري محلي. بلا ادّعاء تجميلي وبلا خصم.",
        dialect: "ar-levant",
      },
    };
  }
  if (locale === "en") {
    return {
      businessModel: `${SAMPLE.en}. Clalit pediatric clinic — the family does not pay at the desk. Conversion = walk-in by arrival order / WhatsApp with the child’s name. Not a sale. Sample planning budget ₪1800 (awareness/visit — not CPA).`,
      avgOrderValue: "",
      marginPercent: "",
      targetCac: "",
      monthlyBudget: "1800",
      pastAds:
        "Organic Facebook posts: “no queues” + clinic hours + WhatsApp 052-8885800. Stories of the empty medical-complex facade. No measured paid campaign was run.",
      pastResults: `${SAMPLE.en}. No ROAS, star ratings, or like counts — a paid campaign was not measured.`,
      whatFailed: "Posts described the place but forgot to ask for a name on WhatsApp or to repeat the next arrival window.",
      brandTone: "Calm, parental, local Arabic–Hebrew. No cosmetic claim, no discount.",
      brandPositioning: "A real pediatric clinic in Baqa — arrival-order access for Clalit members, not a chain brand.",
      voice: {
        niche: "Pediatric clinic in Baqa — Clalit, arrival-order access",
        coreMessage: "When the child is sick — arrive by order. WhatsApp with the child’s name. No medical promises.",
        personalVoice: "Calm, parental, local Arabic–Hebrew. No cosmetic claim, no discount.",
        dialect: "en",
      },
    };
  }
  return {
    businessModel: `${SAMPLE.he}. מרפאת כללית — המשפחה לא משלמת בדלפק. המרה = הגעה לפי סדר / וואטסאפ עם שם הילד. זו לא מכירה. תקציב תכנון לדוגמה ₪1800 (חשיפה/ביקור — לא CPA).`,
    avgOrderValue: "",
    marginPercent: "",
    targetCac: "",
    monthlyBudget: "1800",
    pastAds:
      "פוסטים אורגניים בפייסבוק: «בלי תורים» + שעות המרפאה + וואטסאפ 052-8885800. סטוריז של חזית המתחם הריקה. לא רץ קמפיין ממומן מדוד.",
    pastResults: `${SAMPLE.he}. אין ROAS, אין דירוג כוכבים ואין לייקים — קמפיין ממומן לא נמדד.`,
    whatFailed: "הפוסטים תיארו את המקום אבל שכחו לבקש שם בוואטסאפ או לחזור על חלון ההגעה הבא.",
    brandTone: "רגוע, הורי, ערבית-עברית מקומית. בלי טענה קוסמטית ובלי הנחה.",
    brandPositioning: "מרפאת ילדים אמיתית בבאקה — קבלה לפי סדר למבוטחי כללית, לא מותג רשת.",
    voice: {
      niche: "מרפאת ילדים בבאקה — כללית, קבלה לפי סדר",
      coreMessage: "כשהילד חולה — מגיעים לפי סדר. וואטסאפ עם שם הילד. בלי הבטחות רפואיות.",
      personalVoice: "רגוע, הורי, ערבית-עברית מקומית. בלי טענה קוסמטית ובלי הנחה.",
      dialect: "he",
    },
  };
}

function oliveDesk(locale: Locale): DemoCmoDesk {
  if (locale === "ar") {
    return {
      businessModel: `${SAMPLE.ar}. مطعم متوسطي عائلي — الربح من المائدة لا من التوصيل السريع. التحويل = حجز طاولة واتساب / حضور. مدخلات تخطيط: ₪180 · 38% · CAC ₪45 · ميزانية ₪2800.`,
      avgOrderValue: "180",
      marginPercent: "38",
      targetCac: "45",
      monthlyBudget: "2800",
      pastAds:
        "ستوريز لحمّص وزيت زيتون وطاولة خارجية فارغة عند الغروب. كابشن عن نوڤيه شاקד. بلا كتالوج 40 طبقاً مختلقاً. وصف إبداعي سابق — ليست نتائج مدفوعة.",
      pastResults: `${SAMPLE.ar}. لا ROAS ولا نجوم ولا إعجابات مقيسة. الأرقام أعلاه مدخلات تخطيط للعرض فقط.`,
      whatFailed: "الصور كانت شهية لكن بلا CTA حجز وبلا ساعة المطبخ التالية — الناس شاهدوا ولم يكتبوا.",
      brandTone: "دافئ، بيتي، متوسطي — بلا شعارات سلسلة. زيت زيتون، سيراميك، جلسة خارج.",
      brandPositioning: "مطعم حيّ في نوڤيه شاקד الخيالية — طقس مائدة هادئ، ليس توصيلاً سريعاً.",
      voice: {
        niche: "مطعم متوسطي عائلي في نوڤيه شاكد الخيالية",
        coreMessage: "طاولة هادئة — زيت زيتون وحمّص — احجزوا واتساب. مش توصيل سريع.",
        personalVoice: "دافئ، بيتي، متوسطي — بلا شعارات سلسلة.",
        dialect: "ar-levant",
      },
    };
  }
  if (locale === "en") {
    return {
      businessModel: `${SAMPLE.en}. Family Mediterranean restaurant — money from the table, not fast delivery. Conversion = WhatsApp table hold / walk-in. Planning inputs: ₪180 · 38% · CAC ₪45 · budget ₪2800.`,
      avgOrderValue: "180",
      marginPercent: "38",
      targetCac: "45",
      monthlyBudget: "2800",
      pastAds:
        "Stories of hummus, olive oil, and an empty dusk terrace. Caption about Neve Shaked. No 40-dish invented catalog. Past creative description only — not paid results.",
      pastResults: `${SAMPLE.en}. No ROAS, stars, or measured likes. The numbers above are demo planning inputs only.`,
      whatFailed: "The food looked warm but there was no booking CTA and no next kitchen hour — people watched and did not write.",
      brandTone: "Warm, homey, Mediterranean — no chain slogans. Olive oil, ceramic, outdoor seating.",
      brandPositioning: "A neighborhood table in fictional Neve Shaked — a calm table ritual, not fast delivery.",
      voice: {
        niche: "Family Mediterranean restaurant in fictional Neve Shaked",
        coreMessage: "A calm table — olive oil and hummus — book on WhatsApp. Not fast delivery.",
        personalVoice: "Warm, homey, Mediterranean — no chain slogans.",
        dialect: "en",
      },
    };
  }
  return {
    businessModel: `${SAMPLE.he}. מסעדה ים-תיכונית משפחתית — הכסף מהשולחן, לא ממשלוח מהיר. המרה = שמירת שולחן בוואטסאפ / הגעה. קלט תכנון: ₪180 · 38% · CAC ₪45 · תקציב ₪2800.`,
    avgOrderValue: "180",
    marginPercent: "38",
    targetCac: "45",
    monthlyBudget: "2800",
    pastAds:
      "סטוריז של חומוס, שמן זית ושולחן חוץ ריק בשקיעה. כיתוב על נווה שקד. בלי קטלוג 40 מנות מומצא. תיאור קריאייטיב קודם בלבד — לא תוצאות ממומנות.",
    pastResults: `${SAMPLE.he}. אין ROAS, אין כוכבים ואין לייקים מדודים. המספרים למעלה הם קלט תכנון לדוגמה בלבד.`,
    whatFailed: "האוכל נראה חם אבל לא היה CTA להזמנה ולא שעת מטבח הבאה — ראו ולא כתבו.",
    brandTone: "חם, ביתי, ים-תיכוני — בלי סלוגני רשת. שמן זית, קרמיקה, ישיבה בחוץ.",
    brandPositioning: "שולחן שכונתי בנווה שקד הבדיונית — טקס שולחן רגוע, לא משלוחים מהירים.",
    voice: {
      niche: "מסעדה ים-תיכונית משפחתית בנווה שקד הבדיונית",
      coreMessage: "שולחן רגוע — שמן זית וחומוס — הזמנה בוואטסאפ. לא משלוח מהיר.",
      personalVoice: "חם, ביתי, ים-תיכוני — בלי סלוגני רשת.",
      dialect: "he",
    },
  };
}

function sandDesk(locale: Locale): DemoCmoDesk {
  if (locale === "ar") {
    return {
      businessModel: `${SAMPLE.ar}. بوتيك أزياء نسائية — الربح من قطعة مجرّبة في المحل لا من كتالوج متضخّم. التحويل = واتساب لحجز قطعة / زيارة لتجربة. مدخلات تخطيط: ₪340 · 48% · CAC ₪75 · ميزانية ₪2200.`,
      avgOrderValue: "340",
      marginPercent: "48",
      targetCac: "75",
      monthlyBudget: "2200",
      pastAds:
        "ستوريز لسكة قماش كتان وعلّاقة واحدة مرتّبة — ليس كتالوج 40 صنفاً مختلقاً. ضوء نافذة، بلا وجوه. وصف إبداعي سابق فقط.",
      pastResults: `${SAMPLE.ar}. لا ROAS ولا نجوم ولا إعجابات. الأرقام أعلاه عيّنة تخطيط للعرض — ليست أداءً مدفوعاً.`,
      whatFailed: "الصور كانت هادئة لكن بلا «تعالَين جرّبن» وبلا ساعة الدكان — أعجبت ولم تُحجز قطعة.",
      brandTone: "هادئ، كتان، رمل — استشارة شخصية بلا ضجيج مول. أناقة يومية.",
      brandPositioning: "بوتيك نسائي هادئ في عين براك الخيالية — علّاقة واحدة دقيقة أفضل من كتالوج منفوخ.",
      voice: {
        niche: "بوتيك أزياء نسائية هادئ في عين براك الخيالية",
        coreMessage: "علّاقة واحدة دقيقة + تجربة هادئة. تعالَين جرّبن — واتساب لحجز قطعة.",
        personalVoice: "هادئ، كتان، رمل — استشارة شخصية بلا ضجيج مول.",
        dialect: "ar-levant",
      },
    };
  }
  if (locale === "en") {
    return {
      businessModel: `${SAMPLE.en}. Women’s fashion boutique — money from a tried-on piece in the shop, not a bloated catalog. Conversion = WhatsApp item hold / fitting visit. Planning inputs: ₪340 · 48% · CAC ₪75 · budget ₪2200.`,
      avgOrderValue: "340",
      marginPercent: "48",
      targetCac: "75",
      monthlyBudget: "2200",
      pastAds:
        "Stories of a linen rail and one composed rack — not a catalog of 40 invented SKUs. Window light, no faces. Past creative description only.",
      pastResults: `${SAMPLE.en}. No ROAS, stars, or likes. The numbers above are demo planning samples — not paid performance.`,
      whatFailed: "The stills were calm but there was no “come try it on” and no next shop hour — people liked the mood and did not hold a piece.",
      brandTone: "Calm, linen, sand — personal styling without mall noise. Everyday elegance.",
      brandPositioning: "A quiet women’s boutique in fictional Ein Barak — one precise rack beats a padded catalog.",
      voice: {
        niche: "Quiet women’s fashion boutique in fictional Ein Barak",
        coreMessage: "One precise rack + a calm fitting. Come try it on — WhatsApp to hold a piece.",
        personalVoice: "Calm, linen, sand — personal styling without mall noise.",
        dialect: "en",
      },
    };
  }
  return {
    businessModel: `${SAMPLE.he}. בוטיק אופנה נשית — הכסף מפריט שנוסה בחנות, לא מקטלוג מנופח. המרה = שמירת פריט בוואטסאפ / ביקור למדידה. קלט תכנון: ₪340 · 48% · CAC ₪75 · תקציב ₪2200.`,
    avgOrderValue: "340",
    marginPercent: "48",
    targetCac: "75",
    monthlyBudget: "2200",
    pastAds:
      "סטוריז של מתלה פשתן אחד מורכב — לא קטלוג של 40 פריטים מומצאים. אור חלון, בלי פנים. תיאור קריאייטיב קודם בלבד.",
    pastResults: `${SAMPLE.he}. אין ROAS, אין כוכבים ואין לייקים. המספרים למעלה הם דוגמת תכנון — לא ביצוע ממומן.`,
    whatFailed: "התמונות היו רגועות אבל לא היה «בואו למדידה» ולא שעת החנות הבאה — אהבו את האווירה ולא שמרו פריט.",
    brandTone: "רגוע, פשתן, חול — ייעוץ אישי בלי רעש קניון. אלגנטיות יומיומית.",
    brandPositioning: "בוטיק נשי שקט בעין ברק הבדיונית — מתלה אחד מדויק עדיף על קטלוג מנופח.",
    voice: {
      niche: "בוטיק אופנה נשית שקט בעין ברק הבדיונית",
      coreMessage: "מתלה אחד מדויק + מדידה רגועה. בואו למדידה — וואטסאפ לשמירת פריט.",
      personalVoice: "רגוע, פשתן, חול — ייעוץ אישי בלי רעש קניון.",
      dialect: "he",
    },
  };
}

export function demoCmoDesk(id: DemoCmoId, locale: Locale = "he"): DemoCmoDesk {
  if (id === "demo-olive-kitchen") return oliveDesk(locale);
  if (id === "demo-sand-boutique") return sandDesk(locale);
  return clinicDesk(locale);
}

export function applyDemoCmoDesk(intake: Intake, id: DemoCmoId, locale: Locale = "he"): Intake {
  return { ...intake, ...demoCmoDesk(id, locale) };
}

export function isDemoCmoComplete(intake: Intake): boolean {
  const model = String(intake.businessModel || "").trim();
  const past = String(intake.pastAds || "").trim();
  const budget = String(intake.monthlyBudget || "").trim();
  if (!model || !past || !budget) return false;
  if (intake.operatingModel === "free_service") return true;
  return Boolean(
    String(intake.avgOrderValue || "").trim() &&
      String(intake.marginPercent || "").trim() &&
      String(intake.targetCac || "").trim(),
  );
}
