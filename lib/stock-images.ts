import type { Vertical } from "./vertical";
import { detectVertical } from "./vertical";

export type StockSource = "openverse" | "wikimedia" | "vertex";

export type StockImage = {
  id: string;
  thumb: string;
  full: string;
  title: string;
  attribution: string;
  source: StockSource;
  license?: string;
  landingUrl?: string;
  query: string;
};

export type StockSearchInput = {
  q?: string;
  vertical?: string;
  category?: string;
  location?: string;
  limit?: number;
  page?: number;
};

export type StockSearchResult = {
  ok: true;
  images: StockImage[];
  page: number;
  nextPage: number | null;
  queries: string[];
};

const UA = "SAWEK-AD/0.1 (https://github.com/drmarktzone-stack/sawek-ad; CC stock search for local ads)";
const OPENVERSE = "https://api.openverse.org/v1/images/";
const WIKI = "https://commons.wikimedia.org/w/api.php";

const VERTICALS: Vertical[] = ["clinic", "restaurant", "pool", "school", "product", "retail", "generic"];

/** English topic queries per vertical. Used for Openverse + wrapped for Wikimedia. */
const TOPIC_QUERIES: Record<Vertical, string[]> = {
  clinic: [
    "pediatric clinic waiting room",
    "children's doctor office interior",
    "family clinic",
    "stethoscope",
    "warm medical clinic",
    "kids healthcare",
    "no queue clinic",
    "Arabic family health",
    "medical clinic reception",
    "clinic interior",
  ],
  pool: [
    "hydrotherapy pool",
    "indoor therapy pool",
    "rehabilitation swimming pool",
    "warm water hydrotherapy",
    "physical therapy pool interior",
  ],
  retail: [
    "clothing boutique",
    "fashion boutique interior",
    "clothing store display",
    "apparel shop interior",
    "boutique dressing room",
  ],
  restaurant: [
    "grilled food",
    "restaurant grill",
    "grilled chicken restaurant",
    "restaurant interior dining",
    "fresh grilled meat",
  ],
  product: [
    "parent using phone health app",
    "smartphone in hand",
    "mobile health application",
    "parent phone",
    "family using smartphone",
  ],
  school: [
    "school classroom",
    "kindergarten classroom",
    "school building exterior",
    "empty classroom desks",
    "elementary classroom",
  ],
  generic: [
    "small business storefront",
    "local shop interior",
    "service counter",
    "neighborhood shop",
    "store reception",
  ],
};

const WIKI_CATEGORIES: Record<Vertical, string[]> = {
  clinic: ["Waiting rooms", "Clinics", "Stethoscopes", "Pediatrics"],
  pool: ["Hydrotherapy", "Indoor swimming pools", "Physical therapy"],
  retail: ["Clothing shops", "Boutiques"],
  restaurant: ["Grilled food", "Restaurants"],
  product: ["Smartphones", "Mobile phones"],
  school: ["Classrooms", "Kindergartens"],
  generic: ["Shop interiors", "Storefronts"],
};

const TOPIC_NEEDLES: Record<Vertical, RegExp> = {
  clinic:
    /clinic|hospital|pediatric|stethoscope|waiting.?room|waiting area|doctor.?office|medical office|medical|healthcare|physician|nurse|exam(ination)? room|family health|outpatient|urgent care/i,
  pool: /pool|hydrotherap|swim|rehab|therapy water|aquatic/i,
  retail: /boutique|clothing|apparel|fashion|shop|store|retail|dress|garment|mannequin/i,
  restaurant: /grill|food|restaurant|chicken|kebab|shawarma|dining|meal|kitchen|burger|plate/i,
  product: /phone|smartphone|mobile|app|parent|hand|screen|tablet|device/i,
  school: /school|classroom|kindergarten|desk|student|teacher|campus|preschool/i,
  generic: /shop|store|storefront|counter|interior|business|reception|office/i,
};

const JUNK =
  /logo|meme|clipart|screenshot|qr.?code|barcode|coat of arms|flag of|infographic|flowchart|diagram|wikidata|watermark|clalit|כללית|كلاليت|kupat holim|facebook|instagram|tiktok|whatsapp|mugshot|passport|selfie|samer abu|أبو مخ|אבו מוך|dr\.?\s*samer|engraving|lithograph|etching|woodcut|caricature|cartoon|comic|wellcome|census|banner\.jpg|aiga |file:.*\.svg|icon set|clip art|photomontage|collage meme|before.?after|star rating|roas|₪|%\s*off|photo contest|oil on canvas|painting|wga\d|manzanar|internment|evacuee|smallpox|relocation center|miner.s children|wife of miner|\bNARA\b|abandoned /i;

const HISTORICAL = /\b(17|18|19)\d{2}\b|19th century|18th century|1920s|1930s|blitz|smallpox|engraving/i;
const NAMED_PORTRAIT = /portrait of (dr|prof|mr|ms|mrs)\b|headshot of\b/i;

function asVertical(v: unknown): Vertical | undefined {
  const s = String(v ?? "").trim().toLowerCase();
  return VERTICALS.includes(s as Vertical) ? (s as Vertical) : undefined;
}

function clip(s: string, max: number): string {
  return s.replace(/\s+/g, " ").trim().slice(0, max);
}

/** Drop brand names, people, prices — keep topic words for search only. */
export function sanitizeStockHint(raw: string): string {
  return clip(
    String(raw ?? "")
      .replace(/clalit|כללית|كلاليت|kupat?\s*holim|קופת\s*חולים/gi, " ")
      .replace(/samer|سامر|סאמר|أبو مخ|אבו מוך|abu mokh|abu mukh/gi, " ")
      .replace(/\b(roas|cac|cpa|ctr)\b/gi, " ")
      .replace(/\d+\s*%/g, " ")
      .replace(/[₪$€£]\s*\d[\d,]*/g, " ")
      .replace(/https?:\/\/\S+/gi, " "),
    120,
  );
}

function latinWords(s: string): string {
  return clip(s.replace(/[^\x00-\x7Fa-zA-Z0-9 ]+/g, " "), 80);
}

export function resolveStockVertical(input: StockSearchInput): Vertical {
  const given = asVertical(input.vertical);
  if (given) return given;
  return detectVertical({
    businessName: "",
    category: input.category ?? "",
    description: `${input.q ?? ""} ${input.location ?? ""}`,
  });
}

function categoryBoosts(category: string, vertical: Vertical): string[] {
  const c = `${category}`.toLowerCase();
  const extra: string[] = [];
  if (vertical === "clinic" && /أطفال|ילדים|pedia|pediatric|kids|ילד/.test(c)) {
    extra.push("pediatric clinic waiting room", "children's doctor office interior", "kids healthcare");
  }
  if (/أسنان|שיניים|dent/.test(c)) extra.push("dental clinic interior");
  if (/شاورما|shawarma|שוארמה/.test(c)) extra.push("shawarma grill");
  if (/برغر|burger|המבורגר/.test(c)) extra.push("burger restaurant");
  const latin = latinWords(category);
  if (latin.length >= 4 && !/clalit/i.test(latin)) extra.push(latin);
  return extra;
}

function locationBoosts(location: string, vertical: Vertical): string[] {
  const loc = sanitizeStockHint(location);
  if (!loc) return [];
  if (vertical === "clinic") return ["Mediterranean family clinic interior", "community health clinic"];
  if (vertical === "restaurant") return ["Levant grilled food"];
  if (vertical === "pool") return ["indoor therapy pool"];
  if (vertical === "retail") return ["clothing boutique interior"];
  return [];
}

/** Public: the English queries we send (Openverse) / wrap (Wikimedia). */
export function topicQueriesFor(input: StockSearchInput): string[] {
  const vertical = resolveStockVertical(input);
  const out: string[] = [...TOPIC_QUERIES[vertical]];
  out.push(...categoryBoosts(input.category ?? "", vertical));
  out.push(...locationBoosts(input.location ?? "", vertical));
  const hint = sanitizeStockHint(input.q ?? "");
  const latin = latinWords(hint);
  if (latin.length >= 6) out.push(latin);
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const q of out) {
    const key = q.toLowerCase().trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(q.trim());
  }
  return unique.slice(0, 12);
}

export function wikiSearchQuery(topic: string): string {
  return `filemime:image/jpeg filew:>700 ${topic} -engraving -wellcome -logo -meme -svg -painting -contest -smallpox`;
}

function isHttps(url: string): boolean {
  return /^https:\/\//i.test(url);
}

function toHttps(url: string): string {
  if (!url) return "";
  if (url.startsWith("//")) return `https:${url}`;
  if (url.startsWith("http://")) return `https://${url.slice(7)}`;
  return url;
}

function normUrl(url: string): string {
  try {
    const u = new URL(toHttps(url));
    u.search = "";
    u.hash = "";
    return u.toString();
  } catch {
    return toHttps(url).split("?")[0] ?? "";
  }
}

function stripHtml(s: string): string {
  return clip(
    s
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;|&apos;/gi, "'")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">"),
    180,
  );
}

export function isJunkStockTitle(title: string, extra = ""): boolean {
  const blob = `${title} ${extra}`;
  if (JUNK.test(blob)) return true;
  if (NAMED_PORTRAIT.test(blob)) return true;
  if (HISTORICAL.test(blob) && /wellcome|engraving|lithograph|census|blitz/.test(blob.toLowerCase())) return true;
  if (/\.svg($|\s)|\.pdf($|\s)|\.djvu/i.test(title)) return true;
  return false;
}

const OFF_TOPIC: Record<Vertical, RegExp | null> = {
  clinic: /train station|bus station|ferry|airport|railway|metro station|swimsuit|bikini|nude|immigration|behörde/i,
  pool: /hotel luxury|bikini|swimsuit fashion|beach party/i,
  retail: /weapon|ammo|pharmacy/i,
  restaurant: /pet food|dog food/i,
  product: /landline|rotary phone|payphone/i,
  school: /prison|military academy/i,
  generic: null,
};

export function stockRelevance(vertical: Vertical, title: string, extra = ""): number {
  const blob = `${title} ${extra}`;
  if (isJunkStockTitle(title, extra)) return -1;
  if (OFF_TOPIC[vertical]?.test(blob)) return -1;
  if (!TOPIC_NEEDLES[vertical].test(blob)) return 0;
  let score = 1;
  if (/waiting.?room|clinic interior|doctor.?office|stethoscope|boutique interior|hydrotherapy|grilled|classroom/i.test(blob)) score += 4;
  if (/pediatric|family clinic|family health|medical clinic|kids health/i.test(blob)) score += 2;
  if (/naval|military|vaccination|historical|black and white/i.test(blob)) score -= 2;
  return score;
}

export function isOnTopicStock(vertical: Vertical, title: string, extra = ""): boolean {
  return stockRelevance(vertical, title, extra) > 0;
}

async function fetchJson(url: string, timeoutMs: number): Promise<unknown | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { "User-Agent": UA, Accept: "application/json" },
      signal: ctrl.signal,
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as unknown;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function mapPool<T, R>(items: T[], concurrency: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]!);
    }
  }
  const n = Math.max(1, Math.min(concurrency, items.length));
  await Promise.all(Array.from({ length: n }, () => worker()));
  return out;
}

type WikiPage = {
  pageid?: number;
  title?: string;
  imageinfo?: Array<{
    url?: string;
    thumburl?: string;
    mime?: string;
    width?: number;
    height?: number;
    descriptionurl?: string;
    extmetadata?: Record<string, { value?: string } | undefined>;
  }>;
};

function wikiAttribution(info: NonNullable<WikiPage["imageinfo"]>[0]): { attribution: string; license?: string } {
  const meta = info.extmetadata ?? {};
  const artist = stripHtml(String(meta.Artist?.value ?? meta.Credit?.value ?? ""));
  const license = stripHtml(String(meta.LicenseShortName?.value ?? meta.UsageTerms?.value ?? "CC"));
  const who = artist || "Wikimedia Commons";
  return { attribution: clip(`${who} · ${license}`, 160), license };
}

function fromWikiPage(page: WikiPage, query: string, vertical: Vertical): StockImage | null {
  const info = page.imageinfo?.[0];
  if (!info) return null;
  const mime = String(info.mime ?? "");
  if (!/^image\/(jpeg|jpg|png|webp)$/i.test(mime)) return null;
  const full = toHttps(info.url ?? "");
  const thumb = toHttps(info.thumburl || info.url || "");
  if (!isHttps(full) || !isHttps(thumb)) return null;
  if ((info.width ?? 0) > 0 && (info.width ?? 0) < 600) return null;
  const title = String(page.title ?? "").replace(/^File:/i, "");
  const desc = stripHtml(String(info.extmetadata?.ImageDescription?.value ?? ""));
  if (stockRelevance(vertical, title, desc) <= 0) return null;
  const { attribution, license } = wikiAttribution(info);
  const id = `wiki-${page.pageid || normUrl(full).slice(-24)}`;
  return {
    id,
    thumb,
    full,
    title: clip(title, 140),
    attribution,
    source: "wikimedia",
    license,
    landingUrl: toHttps(info.descriptionurl ?? "") || undefined,
    query,
  };
}

async function wikiSearch(topic: string, limit: number, offset: number, vertical: Vertical): Promise<StockImage[]> {
  const params = new URLSearchParams({
    action: "query",
    generator: "search",
    gsrsearch: wikiSearchQuery(topic),
    gsrnamespace: "6",
    gsrlimit: String(Math.min(20, Math.max(8, limit))),
    prop: "imageinfo",
    iiprop: "url|extmetadata|mime|size",
    iiurlwidth: "480",
    format: "json",
    origin: "*",
  });
  if (offset > 0) params.set("gsroffset", String(offset));
  const json = await fetchJson(`${WIKI}?${params.toString()}`, 9000);
  if (!json || typeof json !== "object") return [];
  const pages = (json as { query?: { pages?: Record<string, WikiPage> } }).query?.pages ?? {};
  const out: StockImage[] = [];
  for (const page of Object.values(pages)) {
    const hit = fromWikiPage(page, topic, vertical);
    if (hit) out.push(hit);
  }
  return out;
}

async function wikiCategory(cat: string, limit: number, vertical: Vertical): Promise<StockImage[]> {
  const params = new URLSearchParams({
    action: "query",
    generator: "categorymembers",
    gcmtitle: `Category:${cat}`,
    gcmtype: "file",
    gcmlimit: String(Math.min(16, Math.max(6, limit))),
    prop: "imageinfo",
    iiprop: "url|extmetadata|mime|size",
    iiurlwidth: "480",
    format: "json",
    origin: "*",
  });
  const json = await fetchJson(`${WIKI}?${params.toString()}`, 9000);
  if (!json || typeof json !== "object") return [];
  const pages = (json as { query?: { pages?: Record<string, WikiPage> } }).query?.pages ?? {};
  const out: StockImage[] = [];
  for (const page of Object.values(pages)) {
    const hit = fromWikiPage(page, `category:${cat}`, vertical);
    if (hit) out.push(hit);
  }
  return out;
}

type OvHit = {
  id?: string;
  title?: string;
  url?: string;
  thumbnail?: string;
  foreign_landing_url?: string;
  creator?: string;
  license?: string;
  license_url?: string;
  attribution?: string;
  category?: string;
  tags?: Array<{ name?: string } | string>;
};

async function openverseSearch(topic: string, page: number, vertical: Vertical): Promise<StockImage[]> {
  const params = new URLSearchParams({
    q: clip(topic, 180),
    page: String(Math.max(1, page)),
    page_size: "20",
    category: "photograph",
    mature: "false",
    extension: "jpg,png",
  });
  const json = await fetchJson(`${OPENVERSE}?${params.toString()}`, 7000);
  if (!json || typeof json !== "object") return [];
  const results = Array.isArray((json as { results?: unknown }).results)
    ? ((json as { results: OvHit[] }).results)
    : [];
  const out: StockImage[] = [];
  for (const row of results) {
    const full = toHttps(String(row.url ?? ""));
    const thumb = toHttps(String(row.thumbnail || row.url || ""));
    if (!isHttps(full) || !isHttps(thumb)) continue;
    const title = String(row.title ?? "");
    const tags = (row.tags ?? [])
      .map((t) => (typeof t === "string" ? t : String(t?.name ?? "")))
      .join(" ");
    const extra = `${row.category ?? ""} ${tags} ${row.creator ?? ""}`;
    if (!isOnTopicStock(vertical, title, extra)) continue;
    const license = clip(String(row.license ?? "CC"), 40);
    const creator = clip(String(row.creator ?? "Openverse"), 80);
    out.push({
      id: `ov-${String(row.id ?? normUrl(full).slice(-20))}`,
      thumb,
      full,
      title: clip(title || topic, 140),
      attribution: clip(row.attribution ? stripHtml(String(row.attribution)) : `${creator} · ${license}`, 160),
      source: "openverse",
      license,
      landingUrl: toHttps(String(row.foreign_landing_url ?? "")) || undefined,
      query: topic,
    });
  }
  return out;
}

function dedupe(images: StockImage[]): StockImage[] {
  const seen = new Set<string>();
  const out: StockImage[] = [];
  for (const img of images) {
    const key = normUrl(img.full) || img.id;
    if (!key || seen.has(key) || seen.has(img.id)) continue;
    seen.add(key);
    seen.add(img.id);
    out.push(img);
  }
  return out;
}

export async function vertexStillsForStock(input: StockSearchInput, max = 2): Promise<StockImage[]> {
  const topic = sanitizeStockHint(input.q || input.category || "");
  if (!topic && !input.vertical && !input.category) return [];
  try {
    const { runImagen } = await import("./imagen");
    const n = Math.max(1, Math.min(2, max));
    const out: StockImage[] = [];
    for (let i = 0; i < n; i++) {
      const hit = await Promise.race([
        runImagen({
          businessName: topic || "a local business",
          category: sanitizeStockHint(input.category || input.vertical || "local service"),
          headline: topic,
          locale: "en",
        }),
        new Promise<{ ok: false }>((resolve) => setTimeout(() => resolve({ ok: false }), 12000)),
      ]);
      if (!hit || !("ok" in hit) || !hit.ok) break;
      const mime = hit.mime && hit.mime.startsWith("image/") ? hit.mime : "image/png";
      const dataUrl = `data:${mime};base64,${hit.imageBase64}`;
      out.push({
        id: `vertex-still-${i + 1}`,
        thumb: dataUrl,
        full: dataUrl,
        title: "Vertex Imagen still",
        attribution: "Vertex Imagen",
        source: "vertex",
        license: "generated",
        query: topic || "vertex",
      });
    }
    return out;
  } catch {
    return [];
  }
}

export async function searchStockImages(input: StockSearchInput): Promise<StockSearchResult> {
  const vertical = resolveStockVertical(input);
  const queries = topicQueriesFor(input);
  const page = Math.max(1, Math.min(8, Math.floor(Number(input.page) || 1)));
  const limit = Math.max(24, Math.min(60, Math.floor(Number(input.limit) || 48)));
  const offset = (page - 1) * 12;

  const searchSlice = page === 1 ? queries.slice(0, 8) : queries.slice(0, 6);
  const catSlice = page === 1 ? (WIKI_CATEGORIES[vertical] ?? []).slice(0, 3) : [];
  const ovSlice = queries.slice(0, page === 1 ? 4 : 2);

  const [wikiHits, catHits, ovHits] = await Promise.all([
    mapPool(searchSlice, 4, (q) => wikiSearch(q, 16, offset, vertical)),
    mapPool(catSlice, 3, (c) => wikiCategory(c, 12, vertical)),
    mapPool(ovSlice, 2, (q) => openverseSearch(q, page, vertical)),
  ]);

  const merged = dedupe([...wikiHits.flat(), ...catHits.flat(), ...ovHits.flat()]).sort((a, b) => {
    const sb = stockRelevance(vertical, b.title, b.query);
    const sa = stockRelevance(vertical, a.title, a.query);
    return sb - sa;
  });
  const images = merged.slice(0, limit);
  const nextPage = images.length >= 12 && page < 8 ? page + 1 : null;
  return { ok: true, images, page, nextPage, queries };
}
