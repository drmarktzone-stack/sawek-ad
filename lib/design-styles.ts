import type { Locale } from "./types";

export interface DesignStyle {
  id: string;
  name: Record<Locale, string>;
  description: Record<Locale, string>;
  palette: [string, string, string];
  mood: string;
}

export const DESIGN_STYLES: DesignStyle[] = [
  {
    id: "lifestyle",
    name: { he: "לייפסטייל", ar: "لايف ستايل", en: "Lifestyle" },
    description: {
      he: "תמונת חיים אמיתית, אור יום, אנשים בסביבה טבעית.",
      ar: "حياة حقيقية، ضوء نهار، ناس في مكان طبيعي.",
      en: "Lived-in daylight scenes with real people in context.",
    },
    palette: ["#050505", "#ffe500", "#ff1a1a"],
    mood: "warm photo",
  },
  {
    id: "soft-organic",
    name: { he: "אורגני רך", ar: "عضوي ناعم", en: "Soft organic" },
    description: {
      he: "צורות רכות, ירקות עמומים, תחושת טיפול.",
      ar: "أشكال ناعمة وألوان ترابية وشعور علاجي.",
      en: "Soft shapes, muted greens, a care-taking feel.",
    },
    palette: ["#1a0a0a", "#ffe500", "#7a1010"],
    mood: "calm organic",
  },
  {
    id: "social-proof",
    name: { he: "הוכחה חברתית", ar: "إثبات اجتماعي", en: "Social proof" },
    description: {
      he: "מסגרת לציטוט לקוח אמיתי בלבד — בלי דירוגים מומצאים.",
      ar: "إطار لاقتباس عميل حقيقي فقط — بلا تقييمات مختلقة.",
      en: "Frame for a real customer quote only — never invented ratings.",
    },
    palette: ["#050505", "#ff1a1a", "#ffe500"],
    mood: "quote card",
  },
  {
    id: "pastel",
    name: { he: "פסטל", ar: "باستيل", en: "Pastel" },
    description: {
      he: "רקע בהיר-רך, טיפוגרפיה עדינה, מתאים למשפחות.",
      ar: "خلفية فاتحة ناعمة وخط هادئ يناسب العائلات.",
      en: "Soft light ground and gentle type — family-friendly.",
    },
    palette: ["#1a1208", "#ffe500", "#ff1a1a"],
    mood: "pastel family",
  },
  {
    id: "sketch",
    name: { he: "סקיצה", ar: "رسم تخطيطي", en: "Sketch" },
    description: {
      he: "קו ידני, שחור-צהוב, תחושת סטודיו.",
      ar: "خط يدوي وأسود-أصفر وإحساس ستوديو.",
      en: "Hand-drawn line, black and yellow, studio energy.",
    },
    palette: ["#000000", "#ffe500", "#ffffff"],
    mood: "ink sketch",
  },
  {
    id: "modern-flat",
    name: { he: "שטוח מודרני", ar: "مسطح حديث", en: "Modern flat" },
    description: {
      he: "בלוקים גאומטריים, ניגודיות חזקה, מסר אחד.",
      ar: "كتل هندسية وتباين قوي ورسالة واحدة.",
      en: "Geometric blocks, hard contrast, one message.",
    },
    palette: ["#111111", "#ffe500", "#ff1a1a"],
    mood: "flat geometric",
  },
  {
    id: "editorial-dark",
    name: { he: "עורכות כהה", ar: "تحرير داكن", en: "Editorial dark" },
    description: {
      he: "מגזין לילי, כותרת גדולה, מעט טקסט.",
      ar: "مجلة ليلية وعنوان كبير ونص قليل.",
      en: "Night-magazine headline, little body copy.",
    },
    palette: ["#0b0b0b", "#ffe500", "#ff1a1a"],
    mood: "editorial",
  },
  {
    id: "bold-type",
    name: { he: "טיפוגרפיה נועזת", ar: "طباعة جريئة", en: "Bold type" },
    description: {
      he: "המילים הן העיצוב. צהוב על שחור.",
      ar: "الكلمات هي التصميم. أصفر على أسود.",
      en: "The words are the design. Yellow on black.",
    },
    palette: ["#000000", "#ffe500", "#ff1a1a"],
    mood: "type poster",
  },
  {
    id: "cinematic",
    name: { he: "קולנועי", ar: "سينمائي", en: "Cinematic" },
    description: {
      he: "רחבה אופקית, גרדיאנט כהה, כותרת תחתונה.",
      ar: "عرض سينمائي وتدرّج داكن وعنوان سفلي.",
      en: "Widescreen gradient, lower-third headline.",
    },
    palette: ["#1a0505", "#ffe500", "#8a1010"],
    mood: "cinematic still",
  },
  {
    id: "minimal-light",
    name: { he: "מינימל בהיר", ar: "بسيط فاتح", en: "Minimal light" },
    description: {
      he: "לבן שבור, שורה אחת, הרבה אוויר.",
      ar: "أبيض مكسور وسطر واحد وكثير من الفراغ.",
      en: "Off-white, one line, lots of air.",
    },
    palette: ["#141414", "#ffe500", "#ff1a1a"],
    mood: "minimal",
  },
  {
    id: "street",
    name: { he: "רחוב / אורבני", ar: "شارع / حضري", en: "Street / urban" },
    description: {
      he: "גרפיטי רגוע, מסגרת אדומה, אנרגיה מקומית.",
      ar: "غرافيتي هادئ وإطار أحمر وطاقة محلية.",
      en: "Quiet graffiti energy, red frame, local pulse.",
    },
    palette: ["#0a0a0a", "#ff1a1a", "#ffe500"],
    mood: "urban",
  },
  {
    id: "warm-doc",
    name: { he: "דוקו חם", ar: "وثائقي دافئ", en: "Warm documentary" },
    description: {
      he: "צבעי סרט ישן, דיוקן, אמינות.",
      ar: "ألوان فيلم قديم وبورتريه ومصداقية.",
      en: "Aged-film tones, portrait, credibility.",
    },
    palette: ["#140c08", "#ffe500", "#c41212"],
    mood: "docu portrait",
  },
];
