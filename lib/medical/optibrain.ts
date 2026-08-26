import type { Locale } from "../types";
import { filled, parseNumber } from "../utils";
import { toComplete } from "./markers";
import type { ClinicProfile, MedicalCampaign, OptiInputs, Treatment } from "./types";

export interface OptiCard {
  id: string;
  title: Record<Locale, string>;
  body: Record<Locale, string>;
}

function L(he: string, ar: string, en: string): Record<Locale, string> {
  return { he, ar, en };
}

export function runOptiBrain(
  clinic: ClinicProfile | null,
  campaign: MedicalCampaign | null,
  opti: OptiInputs,
): OptiCard[] {
  const t: Treatment | null = campaign?.treatment ?? null;
  const name = clinic?.name || toComplete("en", "clinic name");
  const cards: OptiCard[] = [];

  cards.push({
    id: "audit",
    title: L("ביקורת שיטות ישנות", "تدقيق الأساليب القديمة", "Old-method audit"),
    body: L(
      filled(opti.oldMethod)
        ? `מה שציינתם כשיטה ישנה: ${opti.oldMethod}. צוואר בקבוק: ${opti.bottleneck || toComplete("he", "צוואר בקבוק")}. לא יומצא «פייסבוק לא עובד».`
        : `לא הוזנה שיטה ישנה. ${toComplete("he", "איך פרסמתם עד היום")}`,
      filled(opti.oldMethod)
        ? `الأسلوب القديم: ${opti.oldMethod}. العنق: ${opti.bottleneck || toComplete("ar", "عنق الزجاجة")}.`
        : toComplete("ar", "كيف كنتم تعلنون"),
      filled(opti.oldMethod)
        ? `Old method as typed: ${opti.oldMethod}. Bottleneck: ${opti.bottleneck || toComplete("en", "bottleneck")}. We will not invent “Facebook doesn’t work”.`
        : toComplete("en", "how you advertised until now"),
    ),
  });

  cards.push({
    id: "buyer",
    title: L("סימולטור קונה", "محاكي المشتري", "Buyer simulator"),
    body: L(
      t
        ? `הורה/מטופל שומע: «${t.name || toComplete("he", "שם טיפול")}». שואל מחיר: ${t.price || toComplete("he", "מחיר")}. בלי פרסונה דמוגרפית שלא הוזנה.`
        : toComplete("he", "טיפול לסימולציה"),
      t
        ? `يسمع: «${t.name || toComplete("ar", "اسم العلاج")}». يسأل السعر: ${t.price || toComplete("ar", "سعر")}.`
        : toComplete("ar", "علاج للمحاكاة"),
      t
        ? `They hear: “${t.name || toComplete("en", "treatment name")}”. They ask price: ${t.price || toComplete("en", "price")}. No invented demographic persona.`
        : toComplete("en", "a treatment to simulate"),
    ),
  });

  cards.push({
    id: "fatigue",
    title: L("עייפות מודעות", "إرهاق الإعلانات", "Ad fatigue"),
    body: L(
      "כלל תכנון: אחרי שבועיים על אותו קריאייטיב בלי פנייה עם שם — מחליפים זווית, לא «מסע ויראלי». אין מד חשיפות חי.",
      "قاعدة تخطيط: بعد أسبوعين على نفس الإبداع بلا طلب باسم — غيّروا الزاوية. لا مقياس وصول حي.",
      "Planning rule: after two weeks on the same creative with no named enquiry — change the angle, not a “viral push”. No live impression meter.",
    ),
  });

  cards.push({
    id: "hijack",
    title: L("מסגרת חטיפת מתחרה (לא פיד חי)", "إطار خطف المنافس (لا بث حي)", "Competitor-hijack framework"),
    body: L(
      filled(opti.competitorName)
        ? `מתחרה שתיעדתם: ${opti.competitorName}. הערה: ${opti.competitorNote || "לא צוינה"}. בלי אירועים שלא ראיתם.`
        : "לא הוזן מתחרה. המסגרת: מה הם מבטיחים שאתם לא יכולים לאשר רפואית? אין הזנת אירוע מתחרה בדוי.",
      filled(opti.competitorName)
        ? `منافس وثّقتموه: ${opti.competitorName}.`
        : "لا منافس. الإطار: ماذا يعدون مما لا يمكنكم اعتماده طبياً؟",
      filled(opti.competitorName)
        ? `Competitor you documented: ${opti.competitorName}. Note: ${opti.competitorNote || "none"}. No events you did not observe.`
        : "No competitor entered. Framework: what do they promise that you cannot medically approve? No fake competitor events.",
    ),
  });

  const price = t ? parseNumber(t.price) : undefined;
  const cost = t ? parseNumber(t.cost) : undefined;
  let offerBody = L(
    `AOV: ${t?.price ? t.price : toComplete("he", "מחיר / AOV")}. עלות: ${t?.cost ? t.cost : toComplete("he", "עלות יחידה")}. FOMO לא יומצא («נשארו 2 תורים»).`,
    `AOV: ${t?.price || toComplete("ar", "سعر")}. التكلفة: ${t?.cost || toComplete("ar", "تكلفة")}.`,
    `AOV: ${t?.price || toComplete("en", "price / AOV")}. Unit cost: ${t?.cost || toComplete("en", "unit cost")}. FOMO will not be invented (“2 slots left”).`,
  );
  if (price != null && cost != null && price > 0) {
    const contrib = price - cost;
    offerBody = L(
      `מתשלום שלכם: מחיר ${price} − עלות ${cost} = תרומה ${contrib} ₪. סיכון שיווקי: אל תבטיחו החזר כספי אם לא כתבתם מדיניות.`,
      `من أرقامكم: سعر ${price} − تكلفة ${cost} = مساهمة ${contrib} ₪.`,
      `From your numbers: price ${price} − cost ${cost} = contribution ${contrib} ₪. Marketing risk: do not promise a refund unless you wrote a policy.`,
    );
  }
  cards.push({
    id: "offer",
    title: L("בונה הצעה", "باني العرض", "Offer builder"),
    body: offerBody,
  });

  cards.push({
    id: "local",
    title: L("הוקי אירוע מקומי", "خطافات حدث محلي", "Local-event trend hooks"),
    body: L(
      filled(opti.localEvent)
        ? `אירוע שסיפקתם: ${opti.localEvent}. לא נוסיף פסטיבל שלא כתבתם.`
        : "אין אירוע מקומי בקליטה. הוקים כלליים בלבד (שנת לימודים רק אם אישרתם).",
      filled(opti.localEvent) ? `الحدث الذي أعطيتموه: ${opti.localEvent}.` : "لا حدث محلي.",
      filled(opti.localEvent)
        ? `Event you supplied: ${opti.localEvent}. No festival will be added that you did not type.`
        : "No local event in intake. Generic hooks only (school year only if you confirmed it).",
    ),
  });

  cards.push({
    id: "visual",
    title: L("פרומפטים ויזואליים", "مطالبات بصرية", "Visual prompts"),
    body: L(
      `${name}: צילום חדר המתנה אמיתי, ילד עם הורה (הסכמה), בלי סטוק של «חיוך מושלם». טמפרטורה 0.2.`,
      `${name}: تصوير غرفة انتظار حقيقية. بلا ستوك «ابتسامة مثالية».`,
      `${name}: real waiting-room photo, parent+child with consent, no “perfect smile” stock. Temperature 0.2.`,
    ),
  });

  cards.push({
    id: "reviews",
    title: L("דלפק ביקורות", "مكتب المراجعات", "Reviews desk"),
    body: L(
      "אין ביקורות בדויות. אם אין הסכמה חתומה — אל תציגו כוכבים. בקשה לביקורת רק אחרי ביקור אמיתי.",
      "لا مراجعات مختلقة. بلا موافقة موقعة لا نجوم.",
      "No fake reviews. Without signed consent, do not show stars. Ask for a review only after a real visit.",
    ),
  });

  const spend = parseNumber(opti.monthlySpend);
  const rev = parseNumber(opti.revenue);
  cards.push({
    id: "roas",
    title: L("ROAS ממספרים שסופקו", "ROAS من أرقام معطاة", "ROAS from supplied numbers"),
    body:
      spend != null && rev != null && spend > 0
        ? L(
            `ROAS עבודה = ${rev} / ${spend} = ${(rev / spend).toFixed(2)}. זה חישוב מהקלטים, לא תחזית.`,
            `ROAS عمل = ${rev} / ${spend} = ${(rev / spend).toFixed(2)}.`,
            `Working ROAS = ${rev} / ${spend} = ${(rev / spend).toFixed(2)}. Arithmetic from your inputs, not a forecast.`,
          )
        : L(
            `חסר הוצאה או הכנסה. הוצאה: ${opti.monthlySpend || toComplete("he", "תקציב חודשי")}. הכנסה: ${opti.revenue || toComplete("he", "הכנסה מיוחסת")}. לא יוצג 4.2x.`,
            `تنقص النفقة أو الإيراد. لن يُعرض 4.2x.`,
            `Spend or revenue missing. Spend: ${opti.monthlySpend || toComplete("en", "monthly budget")}. Revenue: ${opti.revenue || toComplete("en", "attributed revenue")}. No 4.2x will be shown.`,
          ),
  });

  const ns = parseNumber(opti.noShowPercent);
  cards.push({
    id: "noshow",
    title: L("פלייבוק אי-הגעה", "دليل التغيب", "No-show playbook"),
    body: L(
      ns != null
        ? `אי-הגעה שדיווחתם: ${ns}%. תזכורת וואטסאפ 24ש׳ לפני — קישור/תוכנית בלבד, לא שליחה חיה.`
        : `${toComplete("he", "% אי-הגעה")}. בלי המספר לא ננחש 20%.`,
      ns != null ? `التغيب المُبلَّغ: ${ns}%. تذكير واتساب قبل 24 ساعة — خطة لا إرسال حي.` : toComplete("ar", "% التغيب"),
      ns != null
        ? `Reported no-show: ${ns}%. WhatsApp reminder 24h prior — plan/link only, no live send.`
        : `${toComplete("en", "no-show %")}. Without the number we will not guess 20%.`,
    ),
  });

  cards.push({
    id: "compliance",
    title: L("ציות", "امتثال", "Compliance"),
    body: L(
      "איסור: לפני/אחרי בלי הסכמה, הבטחת ריפוי, דירוג מומצא, «אלפי מטופלים». חובה: דיסקליימר + באנר AI + סימוני השלמה.",
      "ممنوع: قبل/بعد بلا موافقة، وعد شفاء، تقييم مختلق. واجب: إخلاء + شريط AI + وسوم الإكمال.",
      "Forbidden: before/after without consent, cure promises, invented ratings, “thousands of patients”. Required: disclaimer + AI banner + TO COMPLETE markers.",
    ),
  });

  cards.push({
    id: "radar",
    title: L("מכ״ם תכנון (לא ריגול חי)", "رادار تخطيط (لا تجسس حي)", "Radar — planning board, not live spying"),
    body: L(
      "לוח: קריאייטיב השבוע / זווית חלופית / תזכורת אי-הגעה / באנר אתיקה. אין סריקת מתחרים חיה ואין פיד חדשות רפואי.",
      "لوحة تخطيط. لا مسح منافسين حي ولا بث أخبار طبية.",
      "Board: this week’s creative / alternate angle / no-show reminder / ethics banner. No live competitor scrape and no medical news feed.",
    ),
  });

  cards.push({
    id: "templates",
    title: L("תבניות נחיתה", "قوالب الهبوط", "Landing templates"),
    body: L(
      "שש תבניות כפלט: אמון קליני, המרה נועזת, עורכי, אסתטיקה יוקרתית, וטרינרי חם, שיניים בהיר. הפלטות הקליניות חיות רק בדף הנחיתה — לא בכל אילן.",
      "ستة قوالب كمخرجات. اللوحات السريرية على صفحة الهبوط فقط لا في إيلان كله.",
      "Six templates as outputs: Clinical Trust, Bold Conversion, Editorial, Luxury Aesthetic, Vet Warm, Dental Bright. Clinical palettes live only on the landing — not across Ilan chrome.",
    ),
  });

  if (campaign) {
    const vs = campaign.copy.map((c) => c.voiceScript).join(" / ");
    cards.push({
      id: "voice",
      title: L("סקריפטים קוליים", "سكربتات صوتية", "Voice scripts"),
      body: L(vs, vs, vs),
    });
  } else {
    cards.push({
      id: "voice",
      title: L("סקריפטים קוליים", "سكربتات صوتية", "Voice scripts"),
      body: L(toComplete("he", "קמפיין רפואי"), toComplete("ar", "حملة طبية"), toComplete("en", "a medical campaign")),
    });
  }

  return cards;
}
