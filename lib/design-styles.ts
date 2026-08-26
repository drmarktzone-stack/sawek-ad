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
    palette: ["#1b1b1b", "#f5c518", "#d9cbb8"],
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
    palette: ["#1e2a24", "#c5d5c0", "#f4efe6"],
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
    palette: ["#141414", "#ff2a2a", "#f5c518"],
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
    palette: ["#f7e8ee", "#7a4e63", "#f5c518"],
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
    palette: ["#0a0a0a", "#f5c518", "#ffffff"],
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
    palette: ["#111111", "#f5c518", "#ff2a2a"],
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
    palette: ["#0b0b0f", "#f2f2f2", "#ff2a2a"],
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
    palette: ["#000000", "#f5c518", "#ff2a2a"],
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
    palette: ["#1a1010", "#f5c518", "#6b1c1c"],
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
    palette: ["#f4f1ea", "#111111", "#ff2a2a"],
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
    palette: ["#1c1c1c", "#ff2a2a", "#f5c518"],
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
    palette: ["#2a2018", "#e8d3b0", "#c4492a"],
    mood: "docu portrait",
  },
];
