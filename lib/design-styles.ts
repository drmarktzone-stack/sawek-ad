import type { Locale } from "./types";
import type { Vertical } from "./vertical";

export interface DesignStyle {
  id: string;
  name: Record<Locale, string>;
  description: Record<Locale, string>;
  palette: [string, string, string];
  mood: string;
  verticals: Vertical[];
}

function L(he: string, ar: string, en: string): Record<Locale, string> {
  return { he, ar, en };
}

const G: Vertical[] = ["generic"];
const RETAIL: Vertical[] = ["retail"];
const FOOD: Vertical[] = ["restaurant"];
const POOL: Vertical[] = ["pool"];
const CLINIC: Vertical[] = ["clinic"];
const PRODUCT: Vertical[] = ["product"];
const SCHOOL: Vertical[] = ["school"];

export const DESIGN_STYLES: DesignStyle[] = [
  {
    id: "lifestyle",
    name: L("לייפסטייל", "لايف ستايل", "Lifestyle"),
    description: L("תמונת חיים אמיתית, אור יום, אנשים בסביבה טבעית.", "حياة حقيقية، ضوء نهار، ناس في مكان طبيعي.", "Lived-in daylight scenes with real people in context."),
    palette: ["#050505", "#ffe500", "#ff1a1a"],
    mood: "warm photo",
    verticals: G,
  },
  {
    id: "soft-organic",
    name: L("אורגני רך", "عضوي ناعم", "Soft organic"),
    description: L("צורות רכות, ירקות עמומים, תחושת טיפול.", "أشكال ناعمة وألوان ترابية وشعور علاجي.", "Soft shapes, muted greens, a care-taking feel."),
    palette: ["#1a0a0a", "#ffe500", "#7a1010"],
    mood: "calm organic",
    verticals: G,
  },
  {
    id: "social-proof",
    name: L("הוכחה חברתית", "إثبات اجتماعي", "Social proof"),
    description: L("מסגרת לציטוט לקוח אמיתי בלבד — בלי דירוגים מומצאים.", "إطار لاقتباس عميل حقيقي فقط — بلا تقييمات مختلقة.", "Frame for a real customer quote only — never invented ratings."),
    palette: ["#050505", "#ff1a1a", "#ffe500"],
    mood: "quote card",
    verticals: G,
  },
  {
    id: "pastel",
    name: L("פסטל", "باستيل", "Pastel"),
    description: L("רקע בהיר-רך, טיפוגרפיה עדינה, מתאים למשפחות.", "خلفية فاتحة ناعمة وخط هادئ يناسب العائلات.", "Soft light ground and gentle type — family-friendly."),
    palette: ["#1a1208", "#ffe500", "#ff1a1a"],
    mood: "pastel family",
    verticals: G,
  },
  {
    id: "sketch",
    name: L("סקיצה", "رسم تخطيطي", "Sketch"),
    description: L("קו ידני, שחור-צהוב, תחושת סטודיו.", "خط يدوي وأسود-أصفر وإحساس ستوديو.", "Hand-drawn line, black and yellow, studio energy."),
    palette: ["#000000", "#ffe500", "#ffffff"],
    mood: "ink sketch",
    verticals: G,
  },
  {
    id: "modern-flat",
    name: L("שטוח מודרני", "مسطح حديث", "Modern flat"),
    description: L("בלוקים גאומטריים, ניגודיות חזקה, מסר אחד.", "كتل هندسية وتباين قوي ورسالة واحدة.", "Geometric blocks, hard contrast, one message."),
    palette: ["#111111", "#ffe500", "#ff1a1a"],
    mood: "flat geometric",
    verticals: G,
  },
  {
    id: "editorial-dark",
    name: L("עורכות כהה", "تحرير داكن", "Editorial dark"),
    description: L("מגזין לילי, כותרת גדולה, מעט טקסט.", "مجلة ليلية وعنوان كبير ونص قليل.", "Night-magazine headline, little body copy."),
    palette: ["#0b0b0b", "#ffe500", "#ff1a1a"],
    mood: "editorial",
    verticals: G,
  },
  {
    id: "bold-type",
    name: L("טיפוגרפיה נועזת", "طباعة جريئة", "Bold type"),
    description: L("המילים הן העיצוב. צהוב על שחור.", "الكلمات هي التصميم. أصفر على أسود.", "The words are the design. Yellow on black."),
    palette: ["#000000", "#ffe500", "#ff1a1a"],
    mood: "type poster",
    verticals: G,
  },
  {
    id: "cinematic",
    name: L("קולנועי", "سينمائي", "Cinematic"),
    description: L("רחבה אופקית, גרדיאנט כהה, כותרת תחתונה.", "عرض سينمائي وتدرّج داكن وعنوان سفلي.", "Widescreen gradient, lower-third headline."),
    palette: ["#1a0505", "#ffe500", "#8a1010"],
    mood: "cinematic still",
    verticals: G,
  },
  {
    id: "minimal-light",
    name: L("מינימל בהיר", "بسيط فاتح", "Minimal light"),
    description: L("לבן שבור, שורה אחת, הרבה אוויר.", "أبيض مكسور وسطر واحد وكثير من الفراغ.", "Off-white, one line, lots of air."),
    palette: ["#141414", "#ffe500", "#ff1a1a"],
    mood: "minimal",
    verticals: G,
  },
  {
    id: "street",
    name: L("רחוב / אורבני", "شارع / حضري", "Street / urban"),
    description: L("גרפיטי רגוע, מסגרת אדומה, אנרגיה מקומית.", "غرافيتي هادئ وإطار أحمر وطاقة محلية.", "Quiet graffiti energy, red frame, local pulse."),
    palette: ["#0a0a0a", "#ff1a1a", "#ffe500"],
    mood: "urban",
    verticals: G,
  },
  {
    id: "warm-doc",
    name: L("דוקו חם", "وثائقي دافئ", "Warm documentary"),
    description: L("צבעי סרט ישן, דיוקן, אמינות.", "ألوان فيلم قديم وبورتريه ومصداقية.", "Aged-film tones, portrait, credibility."),
    palette: ["#140c08", "#ffe500", "#c41212"],
    mood: "docu portrait",
    verticals: G,
  },
  {
    id: "luxe-black-gold",
    name: L("לוקס שחור-זהב", "فخامة أسود-ذهب", "Luxe black-gold"),
    description: L("חלון ראווה לילי, זהב עמום, מותג אופנה.", "واجهة ليلية وذهب خافت وماركة أزياء.", "Night vitrine, muted gold, fashion brand."),
    palette: ["#0c0a07", "#c6a15b", "#f4e6c3"],
    mood: "luxe retail",
    verticals: RETAIL,
  },
  {
    id: "clean-white-navy",
    name: L("לבן-נייבי נקי", "أبيض-كحلي نظيف", "Clean white-navy"),
    description: L("קטלוג בהיר, נייבי, מדפים מסודרים.", "كتالوج فاتح وكحلي ورفوف مرتبة.", "Bright catalog, navy type, tidy shelves."),
    palette: ["#f6f7fb", "#1b2a4a", "#c9a227"],
    mood: "catalog clean",
    verticals: RETAIL,
  },
  {
    id: "sale-red-white",
    name: L("סייל אדום-לבן", "تخفيض أحمر-أبيض", "Sale red-white"),
    description: L("כרזת מבצע אמיתית בלבד — בלי מחיר מומצא.", "يافطة عرض حقيقية فقط — بلا سعر مختلق.", "Real promo poster only — never an invented price."),
    palette: ["#ffffff", "#d0122d", "#111111"],
    mood: "sale poster",
    verticals: RETAIL,
  },
  {
    id: "catalog-grid",
    name: L("גריד קטלוג", "شبكة كتالوج", "Catalog grid"),
    description: L("רשת מוצרים, הרבה אוויר, טייטל קטן.", "شبكة منتجات وكثير فراغ وعنوان صغير.", "Product grid, lots of air, small title."),
    palette: ["#ece8e1", "#2c2c2c", "#8c4a2f"],
    mood: "lookbook grid",
    verticals: RETAIL,
  },
  {
    id: "charcoal-ember",
    name: L("פחם-גחלת", "فحم-جمر", "Charcoal ember"),
    description: L("גריל לילי, פחם וגחלים, תפריט קצר.", "مشواة ليلية وفحم وجمر وقائمة قصيرة.", "Night grill, charcoal and ember, short menu."),
    palette: ["#1a1210", "#e85d04", "#f4a261"],
    mood: "grill night",
    verticals: FOOD,
  },
  {
    id: "cream-spice",
    name: L("קרם-תבלין", "كريمة-بهار", "Cream spice"),
    description: L("שולחן חם, כמון וחרדל, מסעדת שכונה.", "طاولة دافئة وكمون وخردل ومطعم حي.", "Warm table, cumin and mustard, neighborhood restaurant."),
    palette: ["#f6ecd9", "#7a3e12", "#c45c26"],
    mood: "spice table",
    verticals: FOOD,
  },
  {
    id: "night-menu",
    name: L("תפריט לילה", "قائمة ليل", "Night menu"),
    description: L("לוח שחור, כתב גיר, מנה אחת.", "لوح أسود وخط طبشور ووجبة واحدة.", "Chalkboard, one dish, night service."),
    palette: ["#141414", "#f1faee", "#e9c46a"],
    mood: "chalkboard",
    verticals: FOOD,
  },
  {
    id: "street-food-neon",
    name: L("סטריט-פוד ניאון", "أكل شارع نيون", "Street-food neon"),
    description: L("דוכן זוהר, מגנטה על שחור, מהיר.", "كشك نيون وماجنتا على أسود وسريع.", "Neon stall, magenta on black, fast."),
    palette: ["#0b0214", "#ff2bd6", "#2ee9ff"],
    mood: "neon stall",
    verticals: FOOD,
  },
  {
    id: "aqua-sand",
    name: L("אקווה-חול", "أكوا-رمل", "Aqua sand"),
    description: L("מים בהירים, חול, משפחות בבריכה.", "ماء فاتح ورمل وعائلات بالمسبح.", "Bright water, sand, families at the pool."),
    palette: ["#e7f6f8", "#2a9d8f", "#e9c46a"],
    mood: "pool day",
    verticals: POOL,
  },
  {
    id: "deep-teal",
    name: L("טיל עמוק", "تيل عميق", "Deep teal"),
    description: L("בריכה שקטה, טיל כהה, טיפול.", "مسبح هادئ وتيل غامق وعلاج.", "Quiet pool, dark teal, therapy."),
    palette: ["#042f2e", "#14b8a6", "#ccfbf1"],
    mood: "therapy water",
    verticals: POOL,
  },
  {
    id: "family-bright",
    name: L("משפחתי בהיר", "عائلي فاتح", "Family bright"),
    description: L("צהריים, תכלת וקורל, ילדים במים.", "ظهر سماوي ومرجاني وأولاد بالمي.", "Noon, sky-blue and coral, kids in water."),
    palette: ["#e0f2fe", "#0284c7", "#fb7185"],
    mood: "family splash",
    verticals: POOL,
  },
  {
    id: "calm-teal-cream",
    name: L("טיל-קרם רגוע", "تيل-كريمة هادئ", "Calm teal-cream"),
    description: L("מרפאה שקטה, קרם וטיל, אמון בלי דרמה.", "عيادة هادئة وكريمة وتيل وثقة بلا دراما.", "Quiet clinic, cream and teal, trust without drama."),
    palette: ["#f4efe6", "#0f766e", "#134e4a"],
    mood: "clinic calm",
    verticals: CLINIC,
  },
  {
    id: "trust-navy-white",
    name: L("נייבי-לבן אמון", "كحلي-أبيض ثقة", "Trust navy-white"),
    description: L("כותרת רפואית נקייה, נייבי על לבן.", "عنوان طبي نظيف وكحلي على أبيض.", "Clean medical headline, navy on white."),
    palette: ["#f8fafc", "#1e3a5f", "#94a3b8"],
    mood: "clinic trust",
    verticals: CLINIC,
  },
  {
    id: "dark-violet-tech",
    name: L("סגול-טק כהה", "بنفسجي تقني داكن", "Dark-violet tech"),
    description: L("מוצר דיגיטלי, אינדיגו, מסך לילי.", "منتج رقمي وإنديجو وشاشة ليل.", "Digital product, indigo, night screen."),
    palette: ["#0f0720", "#7c3aed", "#22d3ee"],
    mood: "tech product",
    verticals: PRODUCT,
  },
  {
    id: "mint-on-ink",
    name: L("מינט על דיו", "نعناع على حبر", "Mint on ink"),
    description: L("כלים חכמים, מנטה על שחור, CTA אחד.", "أدوات ذكية ونعناع على أسود ونداء واحد.", "Smart tools, mint on ink, one CTA."),
    palette: ["#0b1220", "#34d399", "#e2e8f0"],
    mood: "tool mint",
    verticals: PRODUCT,
  },
  {
    id: "civic-blue-white",
    name: L("כחול-לבן ציבורי", "أزرق-أبيض مدني", "Civic blue-white"),
    description: L("מוסד, כחול ציבורי, הרשמה בלי מבצע.", "مؤسسة وأزرق مدني وتسجيل بلا عرض.", "Institution, civic blue, enrollment not a sale."),
    palette: ["#f1f5f9", "#1d4ed8", "#0f172a"],
    mood: "civic school",
    verticals: SCHOOL,
  },
  {
    id: "editorial-cream",
    name: L("מגזין קרם", "مجلة كريمة", "Editorial cream"),
    description: L("סריף, נייר קרם, כותרת אחת גדולה.", "سيريف وورق كريم وعنوان واحد كبير.", "Serif, cream paper, one large headline."),
    palette: ["#f3ead8", "#1c1917", "#9a3412"],
    mood: "editorial serif",
    verticals: G,
  },
  {
    id: "bold-type-coral",
    name: L("טייפ אלמוג", "طباعة مرجان", "Bold type coral"),
    description: L("מילים ענק, אלמוג על נייבי, בלי קישוט.", "كلمات ضخمة ومرجان على كحلي بلا زينة.", "Giant words, coral on navy, no ornament."),
    palette: ["#0b1f3a", "#fb7185", "#fff7ed"],
    mood: "type coral",
    verticals: G,
  },
  {
    id: "pastel-lilac",
    name: L("פסטל לילך", "باستيل ليلكي", "Pastel lilac"),
    description: L("משפחה רכה, לילך ומנטה אמיתיים — לא צהוב מותג.", "عائلة ناعمة وليلكي ونعناع حقيقي — مش أصفر الماركة.", "Soft family, real lilac and mint — not brand yellow."),
    palette: ["#f5f0ff", "#c4b5fd", "#6ee7b7"],
    mood: "pastel family",
    verticals: G,
  },
  {
    id: "quote-linen",
    name: L("ציטוט פשתן", "اقتباس كتان", "Quote linen"),
    description: L("כרטיס ציטוט על פשתן. בלי כוכבים מומצאים.", "بطاقة اقتباس على كتان. بلا نجوم مختلقة.", "Quote card on linen. No invented stars."),
    palette: ["#efe6d8", "#44403c", "#57534e"],
    mood: "social-proof quote",
    verticals: G,
  },
];

function clinicOnly(s: DesignStyle): boolean {
  return s.verticals.length === 1 && s.verticals[0] === "clinic";
}

/** Styles tagged for this vertical, plus generic. Clinic-only never leaks to retail/food/etc. */
export function stylesForVertical(v: Vertical): DesignStyle[] {
  return DESIGN_STYLES.filter((s) => {
    if (s.verticals.includes(v)) return true;
    if (clinicOnly(s)) return false;
    return s.verticals.includes("generic");
  });
}

export function styleById(id: string): DesignStyle | undefined {
  return DESIGN_STYLES.find((s) => s.id === id);
}
