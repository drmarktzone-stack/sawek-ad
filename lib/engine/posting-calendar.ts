import type { CampaignPack, Locale } from "../types";
import { channelFields } from "../channel-copy";
import { pickIdeas } from "./cmo-ideas";

export type PostingChannel = "facebook" | "instagram" | "tiktok" | "whatsapp" | "landing";

export interface PostingDay {
  day: number;
  channel: PostingChannel;
  formatId: string;
  formatLabel: Record<Locale, string>;
  channelLabel: Record<Locale, string>;
  headline: string;
  body: string;
  cta: string;
  /** CMO idea name for the day (planning — not ROAS) */
  ideaName?: string;
  whyItWins?: string;
  planningScore?: number;
}

const CH: Record<PostingChannel, Record<Locale, string>> = {
  facebook: { he: "פייסבוק", ar: "فيسبوك", en: "Facebook" },
  instagram: { he: "אינסטגרם", ar: "إنستغرام", en: "Instagram" },
  tiktok: { he: "טיקטוק / רילס", ar: "تيك توك / ريلز", en: "TikTok / Reels" },
  whatsapp: { he: "וואטסאפ", ar: "واتساب", en: "WhatsApp" },
  landing: { he: "דף נחיתה", ar: "صفحة هبوط", en: "Landing" },
};

/**
 * 7-day posting plan from the real pack pieces + CMO idea framing.
 * No best-time-to-post science. Day n = channel n. Same facts.
 */
export function buildPostingCalendar(pack: CampaignPack, locale: Locale): PostingDay[] {
  const fields = channelFields(pack, locale);
  const ads = pack.variants.filter((v) => v.locale === locale);
  const pick = (kind: string) => ads.find((v) => v.kind === kind);
  const strong = pick("strong_offer") ?? ads[0];
  const short = pick("very_short") ?? strong;
  const emotion = pick("emotional") ?? strong;
  const edge = pick("unique_advantage") ?? pick("narrative") ?? strong;
  const piece = (v: typeof strong) => ({
    headline: (v?.headline || fields.headline).trim(),
    body: (v?.primaryText || fields.shortBody).trim(),
    cta: (v?.cta || fields.cta).trim(),
  });
  const ideas = pack.cmoIdeas?.selected ?? pickIdeas(pack.intake, locale);
  const ideaAt = (i: number) => ideas[i % Math.max(1, ideas.length)];

  const plan: Array<{
    day: number;
    channel: PostingChannel;
    formatId: string;
    formatLabel: Record<Locale, string>;
    src: ReturnType<typeof piece>;
    ideaIndex: number;
  }> = [
    { day: 1, channel: "facebook", formatId: "feed_191", formatLabel: { he: "פיד 1.91:1", ar: "خلاصة 1.91:1", en: "Feed 1.91:1" }, src: piece(strong), ideaIndex: 0 },
    { day: 2, channel: "instagram", formatId: "ig_1x1", formatLabel: { he: "פוסט 1:1", ar: "منشور 1:1", en: "Post 1:1" }, src: piece(strong), ideaIndex: 0 },
    { day: 3, channel: "instagram", formatId: "ig_4x5", formatLabel: { he: "4:5", ar: "4:5", en: "4:5" }, src: piece(emotion), ideaIndex: 1 },
    { day: 4, channel: "tiktok", formatId: "story_9x16", formatLabel: { he: "9:16", ar: "9:16", en: "9:16" }, src: piece(short), ideaIndex: 1 },
    { day: 5, channel: "whatsapp", formatId: "whatsapp", formatLabel: { he: "הודעה", ar: "رسالة", en: "Message" }, src: { headline: fields.pageName, body: fields.waScript, cta: fields.cta }, ideaIndex: 2 },
    { day: 6, channel: "facebook", formatId: "feed_191", formatLabel: { he: "פיד — זווית יתרון", ar: "خلاصة — زاوية الميزة", en: "Feed — advantage angle" }, src: piece(edge), ideaIndex: 2 },
    { day: 7, channel: "landing", formatId: "landing", formatLabel: { he: "תזכורת לדף", ar: "تذكير بالصفحة", en: "Landing reminder" }, src: { headline: fields.landingTitle, body: fields.shortBody, cta: fields.cta }, ideaIndex: 0 },
  ];
  return plan.map((row) => {
    const idea = ideaAt(row.ideaIndex);
    return {
      day: row.day,
      channel: row.channel,
      formatId: row.formatId,
      formatLabel: row.formatLabel,
      channelLabel: CH[row.channel],
      headline: row.src.headline,
      body: row.src.body,
      cta: row.src.cta,
      ideaName: idea?.name[locale] || idea?.name.he,
      whyItWins: idea?.whyItWins[locale] || idea?.whyItWins.he,
      planningScore: idea?.planningScore,
    };
  });
}
