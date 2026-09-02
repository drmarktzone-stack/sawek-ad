import type { Locale } from "./types";

export type ResizeFormatId = "feed_191" | "ig_1x1" | "ig_4x5" | "story_9x16";

export interface ResizeFormat {
  id: ResizeFormatId;
  ratio: string;
  css: string;
  width: number;
  height: number;
  channel: "facebook" | "instagram" | "tiktok" | "whatsapp";
  label: Record<Locale, string>;
}

/** Same copy + photo, four placements. No invented sizes beyond these industry frames. */
export const RESIZE_FORMATS: ResizeFormat[] = [
  {
    id: "feed_191",
    ratio: "1.91:1",
    css: "1.91 / 1",
    width: 1200,
    height: 628,
    channel: "facebook",
    label: { he: "פיד 1.91:1", ar: "الخلاصة 1.91:1", en: "Feed 1.91:1" },
  },
  {
    id: "ig_1x1",
    ratio: "1:1",
    css: "1 / 1",
    width: 1080,
    height: 1080,
    channel: "instagram",
    label: { he: "אינסטגרם 1:1", ar: "إنستغرام 1:1", en: "Instagram 1:1" },
  },
  {
    id: "ig_4x5",
    ratio: "4:5",
    css: "4 / 5",
    width: 1080,
    height: 1350,
    channel: "instagram",
    label: { he: "אינסטגרם 4:5", ar: "إنستغرام 4:5", en: "Instagram 4:5" },
  },
  {
    id: "story_9x16",
    ratio: "9:16",
    css: "9 / 16",
    width: 1080,
    height: 1920,
    channel: "tiktok",
    label: { he: "סטורי / טיקטוק 9:16", ar: "ستوري / تيك توك 9:16", en: "Story / TikTok 9:16" },
  },
];
