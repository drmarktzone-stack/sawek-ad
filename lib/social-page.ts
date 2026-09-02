import { formatIlPhone, isJunkUiText } from "./document-ingest";

export type SocialKind = "facebook" | "instagram";

export interface SocialPost {
  text: string;
  image?: string;
}

export interface SocialPageParse {
  kind: SocialKind;
  loginWall: boolean;
  name: string;
  description: string;
  phone: string;
  address: string;
  hours: string;
  whatsapp: string;
  ogImage?: string;
  coverImage?: string;
  posts: SocialPost[];
  title: string;
}

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

export const SOCIAL_BROWSER_UA = BROWSER_UA;

const LOGIN_TITLE =
  /^(facebook|instagram|שגיאה|خطأ|error|log in(?:to)? facebook|log into facebook|log in to instagram)$/i;

const LOGIN_SIGNAL =
  /log in to facebook|log into facebook|you must log in before|you must log in to continue|create new account|create new facebook account|log in to instagram|sign up for instagram/i;

const LOGIN_CHROME =
  /^(log in|log into facebook|log in to facebook|create (?:new )?account|create new facebook account|sign up|forgot (?:account|password)|allow (?:all )?cookies|not now|see more|see translation|like|comment|share|translate|photo|videos?|about|home|menu|search facebook|messenger|notifications?|friends|groups|marketplace|reels|stories|more|timeline|photos|likes|followers|following|posts|אהבתי|תגובה|שיתוף|התחבר|הרשמה|עוד|תרגום|تسجيل الدخول|إنشاء حساب|أعجبني|تعليق|مشاركة|المزيد)$/i;

const POST_CAP = 12;

function clip(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return t.slice(0, max).trim();
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => {
      const n = parseInt(h, 16);
      return Number.isFinite(n) ? String.fromCodePoint(n) : "";
    })
    .replace(/&#(\d+);/g, (_, d) => {
      const n = Number(d);
      return Number.isFinite(n) ? String.fromCodePoint(n) : "";
    });
}

function stripTags(html: string): string {
  return decodeEntities(html.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " "))
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function metaContent(html: string, key: string): string {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(
    `<meta\\b[^>]*(?:property|name)\\s*=\\s*["']${escaped}["'][^>]*content\\s*=\\s*["']([^"']*)["'][^>]*>|<meta\\b[^>]*content\\s*=\\s*["']([^"']*)["'][^>]*(?:property|name)\\s*=\\s*["']${escaped}["'][^>]*>`,
    "i",
  );
  const m = html.match(re);
  return decodeEntities((m?.[1] || m?.[2] || "").trim());
}

function tagText(html: string, tag: string): string {
  const m = html.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return clip(stripTags(m?.[1] || ""), 300);
}

function apexHost(host: string): string {
  return host.toLowerCase().replace(/\.$/, "").replace(/^www\./, "");
}

function socialApex(host: string): string {
  const h = apexHost(host);
  if (
    h === "m.facebook.com" ||
    h === "mbasic.facebook.com" ||
    h === "web.facebook.com" ||
    h === "l.facebook.com" ||
    h === "lm.facebook.com"
  ) {
    return "facebook.com";
  }
  if (h === "m.instagram.com") return "instagram.com";
  return h;
}

export function detectSocialKind(url: URL): SocialKind | null {
  const h = socialApex(url.hostname);
  if (h === "facebook.com" || h === "fb.com") return "facebook";
  if (h === "instagram.com") return "instagram";
  return null;
}

export function detectSocialKindFromRaw(raw: string): SocialKind | null {
  try {
    return detectSocialKind(new URL(String(raw || "").trim()));
  } catch {
    return null;
  }
}

export function facebookMbasicUrl(input: URL): URL {
  const next = new URL(input.href);
  next.protocol = "https:";
  next.hostname = "mbasic.facebook.com";
  next.port = "";
  const keep = new Set(["id", "v", "story_fbid", "fbid"]);
  const params = new URLSearchParams();
  for (const [k, val] of next.searchParams) {
    if (keep.has(k.toLowerCase())) params.set(k, val);
  }
  next.search = params.toString() ? `?${params.toString()}` : "";
  next.hash = "";
  return next;
}

export function facebookAboutUrl(page: URL): string {
  const u = facebookMbasicUrl(page);
  const path = u.pathname.replace(/\/+$/, "") || "/";
  if (/\/about$/i.test(path)) return u.href;
  if (/profile\.php$/i.test(path)) {
    u.searchParams.set("v", "info");
    return u.href;
  }
  u.pathname = `${path}/about`;
  return u.href;
}

function distinctiveTitle(title: string, ogTitle: string): string {
  const og = clip(ogTitle, 160);
  const t = clip(title, 160);
  if (og && !LOGIN_TITLE.test(og) && !isJunkUiText(og)) return og;
  if (t && !LOGIN_TITLE.test(t) && !isJunkUiText(t)) return t;
  return "";
}

export function isSocialLoginWall(html: string, finalUrl = ""): boolean {
  if (/\/login\.php\b|\/accounts\/login\b|\/login\/\?/i.test(finalUrl)) return true;
  const ogTitle = metaContent(html, "og:title");
  const title = tagText(html, "title");
  const name = distinctiveTitle(title, ogTitle);
  if (name) return false;
  const genericDesc = /see posts, photos and more on facebook|ראה\/ראי פוסטים|انظر المنشورات/i.test(html);
  return LOGIN_SIGNAL.test(html) || LOGIN_TITLE.test(title) || LOGIN_TITLE.test(ogTitle) || genericDesc;
}

function isLoginChrome(text: string): boolean {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return true;
  if (t.length < 4) return true;
  if (LOGIN_CHROME.test(t)) return true;
  if (isJunkUiText(t)) return true;
  if (/^(log in|create account|sign up)(\s|$)/i.test(t) && t.length < 40) return true;
  return false;
}

function isPostWorthy(text: string): boolean {
  const t = clip(text, 800);
  if (t.length < 12) return false;
  if (isLoginChrome(t)) return false;
  if (/cookie|privacy policy|terms of service|forgot password/i.test(t) && t.length < 80) return false;
  return true;
}

function absHttpUrl(maybe: string, base: string): string {
  if (!maybe) return "";
  try {
    const u = new URL(maybe, base);
    if (u.protocol !== "http:" && u.protocol !== "https:") return "";
    return u.href;
  } catch {
    return "";
  }
}

function firstImg(html: string, base: string): string | undefined {
  for (const m of html.matchAll(/<img\b[^>]*src\s*=\s*["']([^"']+)["'][^>]*>/gi)) {
    const u = absHttpUrl(decodeEntities(m[1] || ""), base);
    if (!u) continue;
    if (/emoji|sprite|static\.xx\.fbcdn.*rsrc|s150x150|favicon|pixel|1x1/i.test(u)) continue;
    return u;
  }
  return undefined;
}

function labeledNear(text: string, labels: RegExp, max = 180): string {
  const m = text.match(labels);
  if (!m) return "";
  const after = (m[1] || "").replace(/\s+/g, " ").trim();
  if (after.length >= 4 && after.length <= max && !isLoginChrome(after)) return clip(after, max);
  return "";
}

function extractContact(blob: string): { phone: string; address: string; hours: string; whatsapp: string } {
  const labeledPhone = labeledNear(blob, /(?:phone|טלפון|هاتف|mobile|נייד)\s*[:：]\s*([+\d][\d\s\-()]{6,22})/i);
  const loose = blob.match(/(?:\+972|0(?:5\d|4\d|2\d|3\d|7\d|8\d|9\d))[\d\s\-]{7,10}/)?.[0] ?? "";
  const phone = labeledPhone || loose;
  const address = labeledNear(
    blob,
    /(?:address|כתובת|عنوان|located in)\s*[:：]\s*([^\n]{8,160})/i,
  );
  const hours = labeledNear(
    blob,
    /(?:hours|opening hours|שעות|ساعات|open)\s*[:：]\s*([^\n]{4,160})/i,
  );
  const waHit = blob.match(/wa\.me\/(\+?\d{8,15})/i)?.[1] || "";
  const formatted = phone ? formatIlPhone(phone) || phone : "";
  return {
    phone: formatted,
    address: address && /(?:מחלף|רחוב|שדרות|street|avenue|באקה|حي|شارع|קומה)/i.test(address) ? address : address,
    hours,
    whatsapp: waHit ? formatIlPhone(waHit) || waHit : formatted,
  };
}

function unescapeJsonString(s: string): string {
  try {
    return JSON.parse(`"${s}"`);
  } catch {
    return s.replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  }
}

function pushPost(posts: SocialPost[], seen: Set<string>, text: string, image?: string) {
  const t = clip(text, 800);
  if (!isPostWorthy(t)) return;
  const key = t.slice(0, 160).toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  const item: SocialPost = { text: t };
  if (image) item.image = image;
  posts.push(item);
}

function extractStoryChunks(html: string): string[] {
  const chunks: string[] = [];
  for (const m of html.matchAll(/<div\b[^>]*class=["'][^"']*story_body_container[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi)) {
    if (m[1]) chunks.push(m[1]);
  }
  for (const m of html.matchAll(/<article\b[^>]*>([\s\S]*?)<\/article>/gi)) {
    if (m[1]) chunks.push(m[1]);
  }
  for (const m of html.matchAll(/<(?:div|section)\b[^>]*(?:data-ft=|role=["']article["'])[^>]*>([\s\S]*?)<\/(?:div|section)>/gi)) {
    if (m[1]) chunks.push(m[1]);
  }
  return chunks;
}

function extractFacebookPosts(html: string, base: string): SocialPost[] {
  const cleaned = html
    .replace(/<form\b[^>]*>[\s\S]*?<\/form>/gi, " ")
    .replace(/<header\b[^>]*>[\s\S]*?<\/header>/gi, " ")
    .replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/gi, " ");
  const posts: SocialPost[] = [];
  const seen = new Set<string>();
  const chunks = extractStoryChunks(cleaned);
  for (const chunk of chunks) {
    const ps: string[] = [];
    for (const m of chunk.matchAll(/<(?:p|span)\b[^>]*>([\s\S]*?)<\/(?:p|span)>/gi)) {
      const t = clip(stripTags(m[1] || ""), 800);
      if (isPostWorthy(t)) ps.push(t);
    }
    const fallback = clip(stripTags(chunk), 800);
    const text = ps[0] || (isPostWorthy(fallback) ? fallback : "");
    if (!text) continue;
    pushPost(posts, seen, text, firstImg(chunk, base));
    if (posts.length >= POST_CAP) return posts;
  }
  if (posts.length < 2) {
    for (const m of cleaned.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)) {
      const t = clip(stripTags(m[1] || ""), 800);
      pushPost(posts, seen, t);
      if (posts.length >= POST_CAP) break;
    }
  }
  return posts.slice(0, POST_CAP);
}

function instagramName(ogTitle: string, title: string): string {
  const raw = ogTitle || title;
  const cleaned = raw
    .replace(/\s*[•·|].*instagram.*$/i, "")
    .replace(/\s*\(@[^)]+\)\s*$/i, "")
    .trim();
  if (cleaned && !LOGIN_TITLE.test(cleaned) && !isJunkUiText(cleaned)) return clip(cleaned, 120);
  return "";
}

function instagramBio(ogDescription: string): string {
  const src = String(ogDescription || "").trim();
  if (!src) return "";
  const afterPosts = src.match(
    /(?:Posts|Post|פוסטים|منشورات)\s*[-–—]\s*([\s\S]+)/i,
  );
  let bio = (afterPosts?.[1] || src).trim();
  bio = bio.replace(
    /^(?:[\d.,‏]+[KkMm]?\s*(?:Followers|Follower|Following|Posts|עוקבים|עוקב|נעקבים|متابع(?:ون)?|متابعة|منشورات)\s*,?\s*)+/i,
    "",
  );
  bio = bio.replace(/^[-–—\s]+/, "").trim();
  if (/^\d[\d.,]*\s*(?:Followers|עוקבים|متابع)/i.test(bio) && bio.length < 80) return "";
  return clip(bio, 500);
}

function extractInstagramJsonPosts(html: string): SocialPost[] {
  const posts: SocialPost[] = [];
  const seen = new Set<string>();
  for (const m of html.matchAll(
    /"edge_media_to_caption"\s*:\s*\{\s*"edges"\s*:\s*\[\s*\{\s*"node"\s*:\s*\{\s*"text"\s*:\s*"((?:\\.|[^"\\])*)"/g,
  )) {
    const text = unescapeJsonString(m[1] || "");
    pushPost(posts, seen, text);
    if (posts.length >= POST_CAP) break;
  }
  if (posts.length) return posts;
  for (const m of html.matchAll(/"caption"\s*:\s*"((?:\\.|[^"\\]){12,800})"/g)) {
    const text = unescapeJsonString(m[1] || "");
    if (/Followers|Following/i.test(text) && text.length < 80) continue;
    pushPost(posts, seen, text);
    if (posts.length >= POST_CAP) break;
  }
  return posts;
}

function emptyParse(kind: SocialKind): SocialPageParse {
  return {
    kind,
    loginWall: true,
    name: "",
    description: "",
    phone: "",
    address: "",
    hours: "",
    whatsapp: "",
    posts: [],
    title: "",
  };
}

export function parseSocialPage(html: string, finalUrl: string, kind: SocialKind): SocialPageParse {
  const raw = String(html ?? "");
  if (!raw.trim()) return emptyParse(kind);
  const title = tagText(raw, "title");
  const ogTitle = metaContent(raw, "og:title");
  const ogDescription =
    metaContent(raw, "og:description") || metaContent(raw, "twitter:description") || metaContent(raw, "description");
  const ogImageRaw = metaContent(raw, "og:image") || metaContent(raw, "twitter:image");
  const ogImage = absHttpUrl(ogImageRaw, finalUrl) || undefined;
  const loginWall = isSocialLoginWall(raw, finalUrl);
  if (loginWall && !distinctiveTitle(title, ogTitle) && !(kind === "instagram" && instagramName(ogTitle, title))) {
    return { ...emptyParse(kind), title, loginWall: true };
  }
  const contact = extractContact(raw);

  if (kind === "instagram") {
    const name = instagramName(ogTitle, title);
    const description = instagramBio(ogDescription);
    const posts = extractInstagramJsonPosts(raw);
    return {
      kind,
      loginWall: loginWall && !name,
      name,
      description,
      phone: contact.phone,
      address: contact.address,
      hours: contact.hours,
      whatsapp: contact.whatsapp,
      ogImage,
      posts,
      title: name || title,
    };
  }

  const name = distinctiveTitle(title, ogTitle).replace(/\s*[|–—-]\s*facebook.*$/i, "").trim();
  const aboutish = ogDescription && !isLoginChrome(ogDescription) ? clip(ogDescription, 500) : "";
  const posts = extractFacebookPosts(raw, finalUrl);
  const cover = firstImg(raw, finalUrl);
  return {
    kind,
    loginWall: loginWall && !name,
    name,
    description: aboutish,
    phone: contact.phone,
    address: contact.address,
    hours: contact.hours,
    whatsapp: contact.whatsapp,
    ogImage,
    coverImage: cover && cover !== ogImage ? cover : undefined,
    posts,
    title: name || title,
  };
}

export function mergeSocialParses(primary: SocialPageParse, extra?: SocialPageParse): SocialPageParse {
  if (!extra) return primary;
  const posts = [...primary.posts];
  const seen = new Set(posts.map((p) => p.text.slice(0, 160).toLowerCase()));
  for (const p of extra.posts) {
    const key = p.text.slice(0, 160).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    posts.push(p);
    if (posts.length >= POST_CAP) break;
  }
  return {
    kind: primary.kind,
    loginWall: primary.loginWall && extra.loginWall,
    name: primary.name || extra.name,
    description: primary.description || extra.description,
    phone: primary.phone || extra.phone,
    address: primary.address || extra.address,
    hours: primary.hours || extra.hours,
    whatsapp: primary.whatsapp || extra.whatsapp,
    ogImage: primary.ogImage || extra.ogImage,
    coverImage: primary.coverImage || extra.coverImage,
    posts: posts.slice(0, POST_CAP),
    title: primary.title || extra.title,
  };
}

export function splitPostText(text: string): { headline: string; body: string } {
  const t = clip(text, 800);
  const sentence = t.split(/(?<=[.!?。؟!])\s+/)[0] || t;
  const headline = clip(sentence, 80);
  const body = t.length > headline.length + 8 ? t : t;
  return { headline, body };
}
