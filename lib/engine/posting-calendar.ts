import type { CampaignPack, Locale } from "../types";
import { channelFields } from "../channel-copy";
import { pickIdeas } from "./cmo-ideas";
import { buildCarouselPack, buildViralScripts } from "./viral-content";

export type PostingChannel = "facebook" | "instagram" | "tiktok" | "whatsapp" | "landing";
export type PostingKind = "post" | "script" | "carousel" | "campaign" | "ad";

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
  kind?: PostingKind;
}

const CH: Record<PostingChannel, Record<Locale, string>> = {
  facebook: { he: "פייסבוק", ar: "فيسبوك", en: "Facebook" },
  instagram: { he: "אינסטגרם", ar: "إنستغرام", en: "Instagram" },
  tiktok: { he: "טיקטוק / רילס", ar: "تيك توك / ريلز", en: "TikTok / Reels" },
  whatsapp: { he: "וואטסאפ", ar: "واتساب", en: "WhatsApp" },
  landing: { he: "דף נחיתה", ar: "صفحة هبوط", en: "Landing" },
};

const KIND_LABEL: Record<PostingKind, Record<Locale, string>> = {
  post: { he: "פוסט", ar: "منشور", en: "Post" },
  script: { he: "סקריפט", ar: "سكربت", en: "Script" },
  carousel: { he: "קרוסלה", ar: "كاروسيل", en: "Carousel" },
  campaign: { he: "קמפיין", ar: "حملة", en: "Campaign" },
  ad: { he: "מודעה מתוזמנת", ar: "إعلان مجدول", en: "Scheduled ad" },
};

export function postingKindLabel(kind: PostingKind | undefined, locale: Locale): string {
  return KIND_LABEL[kind ?? "post"][locale];
}

/**
 * Content calendar from real pack pieces + CMO framing.
 * Days 1–7 keep the original channel order. Days 8–30 mix posts / scripts / carousels.
 * No best-time-to-post science. Default length 30.
 */
export function buildPostingCalendar(pack: CampaignPack, locale: Locale, days = 30): PostingDay[] {
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
  const scripts = pack.viral?.scripts?.locale === locale
    ? pack.viral.scripts
    : buildViralScripts(pack.intake, pack.viral?.idea || "", locale);
  const carousel = pack.viral?.carousel?.locale === locale
    ? pack.viral.carousel
    : buildCarouselPack(pack.intake, pack.viral?.idea || "", locale);

  const week1: Array<{
    day: number;
    channel: PostingChannel;
    formatId: string;
    formatLabel: Record<Locale, string>;
    src: ReturnType<typeof piece>;
    ideaIndex: number;
    kind: PostingKind;
  }> = [
    { day: 1, channel: "facebook", formatId: "feed_191", formatLabel: { he: "פיד 1.91:1", ar: "خلاصة 1.91:1", en: "Feed 1.91:1" }, src: piece(strong), ideaIndex: 0, kind: "post" },
    { day: 2, channel: "instagram", formatId: "ig_1x1", formatLabel: { he: "פוסט 1:1", ar: "منشور 1:1", en: "Post 1:1" }, src: piece(strong), ideaIndex: 0, kind: "post" },
    { day: 3, channel: "instagram", formatId: "ig_4x5", formatLabel: { he: "4:5", ar: "4:5", en: "4:5" }, src: piece(emotion), ideaIndex: 1, kind: "post" },
    { day: 4, channel: "tiktok", formatId: "story_9x16", formatLabel: { he: "9:16", ar: "9:16", en: "9:16" }, src: piece(short), ideaIndex: 1, kind: "script" },
    { day: 5, channel: "whatsapp", formatId: "whatsapp", formatLabel: { he: "הודעה", ar: "رسالة", en: "Message" }, src: { headline: fields.pageName, body: fields.waScript, cta: fields.cta }, ideaIndex: 2, kind: "post" },
    { day: 6, channel: "facebook", formatId: "feed_191", formatLabel: { he: "פיד — זווית יתרון", ar: "خلاصة — زاوية الميزة", en: "Feed — advantage angle" }, src: piece(edge), ideaIndex: 2, kind: "post" },
    { day: 7, channel: "landing", formatId: "landing", formatLabel: { he: "תזכורת לדף", ar: "تذكير بالصفحة", en: "Landing reminder" }, src: { headline: fields.landingTitle, body: fields.shortBody, cta: fields.cta }, ideaIndex: 0, kind: "post" },
  ];

  const rotate: Array<{
    channel: PostingChannel;
    formatId: string;
    formatLabel: Record<Locale, string>;
    kind: PostingKind;
    src: () => ReturnType<typeof piece>;
  }> = [
    { channel: "instagram", formatId: "carousel", formatLabel: { he: "קרוסלה 1:1", ar: "كاروسيل 1:1", en: "Carousel 1:1" }, kind: "carousel", src: () => ({ headline: carousel.slides[0]?.headline || fields.headline, body: carousel.caption, cta: carousel.cta }) },
    { channel: "tiktok", formatId: "script", formatLabel: { he: "סקריפט 15ש", ar: "سكربت 15ث", en: "15s script" }, kind: "script", src: () => {
      const s = scripts.scripts[0];
      return { headline: s?.hook || fields.headline, body: s?.spoken || fields.shortBody, cta: s?.cta || fields.cta };
    } },
    { channel: "facebook", formatId: "feed_191", formatLabel: { he: "פיד", ar: "خلاصة", en: "Feed" }, kind: "post", src: () => piece(strong) },
    { channel: "instagram", formatId: "ig_4x5", formatLabel: { he: "4:5", ar: "4:5", en: "4:5" }, kind: "post", src: () => piece(emotion) },
    { channel: "whatsapp", formatId: "whatsapp", formatLabel: { he: "הודעה", ar: "رسالة", en: "Message" }, kind: "post", src: () => ({ headline: fields.pageName, body: fields.waScript, cta: fields.cta }) },
    { channel: "tiktok", formatId: "script2", formatLabel: { he: "סקריפט — נתון/טרנד", ar: "سكربت — رقم/ترند", en: "Script — data/trend" }, kind: "script", src: () => {
      const s = scripts.scripts[1] ?? scripts.scripts[2] ?? scripts.scripts[0];
      return { headline: s?.hook || fields.headline, body: s?.spoken || fields.shortBody, cta: s?.cta || fields.cta };
    } },
    { channel: "landing", formatId: "landing", formatLabel: { he: "תזכורת לדף", ar: "تذكير بالصفحة", en: "Landing reminder" }, kind: "post", src: () => ({ headline: fields.landingTitle, body: fields.shortBody, cta: fields.cta }) },
    { channel: "instagram", formatId: "carousel2", formatLabel: { he: "קרוסלה — שקפים", ar: "كاروسيل — شرائح", en: "Carousel — slides" }, kind: "carousel", src: () => {
      const slide = carousel.slides[2] ?? carousel.slides[0];
      return { headline: slide?.headline || fields.headline, body: `${slide?.body || ""} ${carousel.cta}`.trim(), cta: carousel.cta };
    } },
    { channel: "facebook", formatId: "campaign", formatLabel: { he: "קמפיין שבועי", ar: "حملة أسبوعية", en: "Weekly campaign" }, kind: "campaign", src: () => piece(edge) },
    { channel: "instagram", formatId: "ad", formatLabel: { he: "מודעה מתוזמנת", ar: "إعلان مجدول", en: "Scheduled ad" }, kind: "ad", src: () => piece(short) },
  ];

  const target = Math.max(7, Math.min(90, days));
  const plan = [...week1];
  for (let d = 8; d <= target; d++) {
    const slot = rotate[(d - 8) % rotate.length]!;
    plan.push({
      day: d,
      channel: slot.channel,
      formatId: slot.formatId,
      formatLabel: slot.formatLabel,
      src: slot.src(),
      ideaIndex: (d - 1) % Math.max(1, ideas.length || 1),
      kind: slot.kind,
    });
  }

  return plan.slice(0, target).map((row) => {
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
      kind: row.kind,
    };
  });
}

export function buildPostingWeek(pack: CampaignPack, locale: Locale): PostingDay[] {
  return buildPostingCalendar(pack, locale, 7);
}
