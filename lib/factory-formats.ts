import type { Locale } from "./types";

export const FACTORY_FORMATS: { id: string; label: Record<Locale, string> }[] = [
  { id: "feed", label: { he: "פיד", ar: "الخلاصة", en: "Feed" } },
  { id: "story", label: { he: "סטורי", ar: "ستوري", en: "Story" } },
  { id: "reels", label: { he: "רילס / טיקטוק", ar: "ريلز / تيك توك", en: "Reels / TikTok" } },
  { id: "youtube", label: { he: "יוטיוב", ar: "يوتيوب", en: "YouTube" } },
  { id: "rsa", label: { he: "Google RSA", ar: "Google RSA", en: "Google RSA" } },
  { id: "search", label: { he: "מודעת חיפוש", ar: "إعلان بحث", en: "Search ad" } },
  { id: "landing", label: { he: "דף נחיתה", ar: "صفحة هبوط", en: "Landing page" } },
  { id: "email-1", label: { he: "אימייל 1", ar: "بريد 1", en: "Email 1" } },
  { id: "email-2", label: { he: "אימייל 2", ar: "بريد 2", en: "Email 2" } },
  { id: "email-3", label: { he: "אימייל 3", ar: "بريد 3", en: "Email 3" } },
  { id: "email-4", label: { he: "אימייל 4", ar: "بريد 4", en: "Email 4" } },
  { id: "email-5", label: { he: "אימייל 5", ar: "بريد 5", en: "Email 5" } },
  { id: "whatsapp", label: { he: "וואטסאפ", ar: "واتساب", en: "WhatsApp" } },
  { id: "sms", label: { he: "SMS", ar: "SMS", en: "SMS" } },
  { id: "flyer", label: { he: "פלאייר", ar: "منشور مطبوع", en: "Flyer" } },
];

export const MAX_COMPETITORS = 8;
