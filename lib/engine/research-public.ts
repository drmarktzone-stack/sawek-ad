/**
 * Client-safe public research helpers (no Vertex / fetch / tokens).
 * Used by the Research desk UI and by the server engine.
 */
import type { Intake, MarketResearch, ResearchSourceCard, ResearchSourceId, ResearchSourceStatus, Tri } from "../types";
import { isNoOffer } from "../no-offer";

const L = (he: string, ar: string, en: string): Tri => ({ he, ar, en });

export const RESEARCH_SOURCE_LABEL: Record<ResearchSourceId, Tri> = {
  meta_ad_library: L("ספריית המודעות של Meta", "مكتبة إعلانات Meta", "Meta Ad Library"),
  tiktok_creative_center: L("מרכז הקריאייטיב של טיקטוק", "مركز إبداع تيك توك", "TikTok Creative Center"),
  google_ads_transparency: L("מרכז השקיפות של Google Ads", "مركز شفافية إعلانات Google", "Google Ads Transparency"),
  pinterest_trends: L("טרנדים בפינטרסט", "ترندات بنترست", "Pinterest Trends"),
  youtube_suggest: L("הצעות חיפוש יוטיוב", "اقتراحات بحث يوتيوب", "YouTube search suggest"),
  linkedin_ad_library: L("ספריית המודעות של LinkedIn", "مكتبة إعلانات LinkedIn", "LinkedIn Ad Library"),
};

export const RESEARCH_DISCLAIMER = L(
  "דוגמאות מודעות ציבוריות + הערות מבוססות חיפוש. בלי ROAS / CPM / צפיות / לייקים בדויים. אם מקור חסום — נגיד זאת.",
  "أمثلة إعلانات عامة + ملاحظات مبنية على بحث. بلا ROAS / CPM / مشاهدات / إعجابات مختلقة. إذا المصدر محجوب — منقول.",
  "Public ad examples + search-grounded notes. No invented ROAS / CPM / views / likes. Blocked sources are labeled honestly.",
);

export function researchGeo(intake: Intake): string {
  const loc = `${intake.location} ${intake.description} ${intake.voice?.niche ?? ""}`;
  if (/united states|\busa\b|\bu\.s\.|new york|los angeles|chicago/i.test(loc)) return "US";
  if (/uae|دبي|أبوظبي|الامارات|الإمارات/i.test(loc)) return "AE";
  if (/saudi|السعودية|رياض/i.test(loc)) return "SA";
  if (/egypt|مصر|قاهرة|القاهرة/i.test(loc)) return "EG";
  if (/uk\b|united kingdom|london|britain/i.test(loc)) return "GB";
  if (/israel|ישראל|اسرائيل|إسرائيل|تل أبيب|תל אביב|חיפה|ירושלים|القدس|באקה|باقة|נהריה|بئر السبع|بقة/i.test(loc)) {
    return "IL";
  }
  if (/[\u0590-\u05FF]/.test(loc)) return "IL";
  if (/[\u0600-\u06FF]/.test(loc)) return "IL";
  return "IL";
}

export function researchQuery(intake: Intake): string {
  const offer = isNoOffer(intake.offer) ? "" : intake.offer.trim();
  const bits = [intake.voice?.niche, intake.category, offer, intake.businessName]
    .map((s) => (s || "").trim())
    .filter(Boolean);
  return (bits.join(" ") || "local business advertising").replace(/\s+/g, " ").trim().slice(0, 80);
}

export function publicResearchUrls(query: string, geo: string): Record<ResearchSourceId, string> {
  const q = encodeURIComponent(query);
  const g = encodeURIComponent(geo);
  return {
    meta_ad_library: `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=${g}&q=${q}&search_type=keyword_unordered&media_type=all`,
    tiktok_creative_center: `https://ads.tiktok.com/business/creativecenter/inspiration/popular/ads/pc/en?period=7&region=${g}`,
    google_ads_transparency: `https://adstransparency.google.com/?region=${g}&preset-id=ft&q=${q}`,
    pinterest_trends: `https://trends.pinterest.com/explore?country=${g}&period=30&terms=${q}`,
    youtube_suggest: `https://www.youtube.com/results?search_query=${q}`,
    linkedin_ad_library: `https://www.linkedin.com/ad-library/search?accountOwner=&countries=${g}&keyword=${q}`,
  };
}

export function tiktokCreativeCenterUrls(geo: string): { ads: string; keywords: string; hashtags: string } {
  const g = encodeURIComponent(geo);
  return {
    ads: `https://ads.tiktok.com/business/creativecenter/inspiration/popular/ads/pc/en?period=7&region=${g}`,
    keywords: `https://ads.tiktok.com/business/creativecenter/keyword/pc/en?period=7&region=${g}`,
    hashtags: `https://ads.tiktok.com/business/creativecenter/hashtag/pc/en?period=7&region=${g}`,
  };
}

function pendingReason(): Tri {
  return L(
    "טרם נשלפה ספרייה חיה — פתחו את הדף הציבורי או הריצו מחקר.",
    "المكتبة الحيّة بعد ما انسحبت — افتحوا الصفحة العامة أو شغّلوا البحث.",
    "Live library not fetched yet — open the public page or run research.",
  );
}

export function emptyResearchCard(
  id: ResearchSourceId,
  exploreUrl: string,
  status: ResearchSourceStatus,
  reason?: Tri,
): ResearchSourceCard {
  return {
    id,
    status,
    label: RESEARCH_SOURCE_LABEL[id],
    exploreUrl,
    examples: [],
    notes: [],
    ...(reason ? { emptyReason: reason } : { emptyReason: pendingReason() }),
  };
}

export function buildResearchSkeleton(intake: Intake): MarketResearch {
  const query = researchQuery(intake);
  const geo = researchGeo(intake);
  const urls = publicResearchUrls(query, geo);
  const asOf = new Date().toISOString();
  const ids = Object.keys(RESEARCH_SOURCE_LABEL) as ResearchSourceId[];
  return {
    asOf,
    query,
    geo,
    sources: ids.map((id) => emptyResearchCard(id, urls[id], "pending")),
    notes: [],
    grounded: false,
    fetched: false,
    disclaimer: RESEARCH_DISCLAIMER,
  };
}
