import type { Vertical } from "./vertical";
import { detectVertical, foodFamily, type FoodFamily } from "./vertical";
import { runtimeEnv } from "./runtime-env";

export type StockSource = "openverse" | "wikimedia" | "google" | "vertex" | "curated";

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
  description?: string;
  offer?: string;
  limit?: number;
  page?: number;
};

export type StockSearchResult = {
  ok: true;
  images: StockImage[];
  page: number;
  nextPage: number | null;
  queries: string[];
  /** Hebrew-first note when CC/Imagen yield nothing on-topic. */
  emptyMessage?: string;
};

const UA = "SAWEK-AD/0.1 (https://github.com/drmarktzone-stack/sawek-ad; CC stock search for local ads)";
const OPENVERSE = "https://api.openverse.org/v1/images/";
const WIKI = "https://commons.wikimedia.org/w/api.php";

const VERTICALS: Vertical[] = ["clinic", "restaurant", "pool", "school", "product", "retail", "generic"];

/**
 * Short photographic queries first — long cinematic phrases return 0 from
 * Openverse / Wikimedia Commons (verified). Keep longer phrases as secondary.
 */
const SHORT_QUERIES: Record<Vertical, string[]> = {
  clinic: ["waiting room", "clinic interior", "medical clinic", "doctor office", "clinic reception"],
  pool: ["hydrotherapy pool", "indoor pool", "therapy pool", "swimming pool interior"],
  retail: ["clothing boutique", "fashion boutique", "boutique interior", "clothing store"],
  restaurant: ["restaurant interior", "restaurant table", "plated food", "dining table"],
  product: ["smartphone in hand", "mobile phone", "person using phone"],
  school: ["classroom", "kindergarten classroom", "school building"],
  generic: ["storefront", "shop interior", "service counter"],
};

/** English topic queries per vertical. Used for Openverse + wrapped for Wikimedia. */
const TOPIC_QUERIES: Record<Vertical, string[]> = {
  clinic: [
    "pediatric clinic waiting room",
    "children's doctor office interior",
    "family clinic",
    "warm medical clinic",
    "kids healthcare waiting room",
    "Mediterranean clinic facade",
    "clinic reception desk",
    "empty clinic corridor",
    "olive courtyard clinic",
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
    "Mediterranean mezze platter",
    "hummus olive oil bowl",
    "outdoor restaurant terrace dusk",
    "olive oil bread restaurant table",
    "ceramic plates Mediterranean food",
    "restaurant interior dining",
    "Levantine table setting",
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
  clinic: ["Waiting rooms", "Clinics", "Pediatrics"],
  pool: ["Hydrotherapy", "Indoor swimming pools", "Physical therapy"],
  retail: ["Clothing shops", "Boutiques"],
  // "Meze" is the French commune on Commons — do not use it.
  restaurant: ["Hummus", "Olive oil", "Arab cuisine"],
  product: ["Smartphones", "Mobile phones"],
  school: ["Classrooms", "Kindergartens"],
  generic: ["Shop interiors", "Storefronts"],
};

const TOPIC_NEEDLES: Record<Vertical, RegExp> = {
  clinic:
    /clinic|hospital|pediatric|waiting.?room|waiting area|doctor.?office|medical office|exam(ination)? room|family health|outpatient|reception desk|clinic interior|medical clinic/i,
  pool: /pool|hydrotherap|swim|rehab|therapy water|aquatic/i,
  retail: /boutique|clothing|apparel|fashion|shop|store|retail|dress|garment|mannequin/i,
  restaurant:
    /grill|food|restaurant|chicken|kebab|shawarma|dining|meal|kitchen|burger|plate|hummus|mezz?e|olive|mediterranean|levant|terrace|ceramic|table|pita|falafel|mezze/i,
  product: /phone|smartphone|mobile|app|parent|hand|screen|tablet|device/i,
  school: /school|classroom|kindergarten|desk|student|teacher|campus|preschool/i,
  generic: /shop|store|storefront|counter|interior|business|reception|office/i,
};

const JUNK =
  /logo|meme|clipart|screenshot|qr.?code|barcode|coat of arms|flag of|infographic|flowchart|diagram|wikidata|watermark|clalit|כללית|كلاليت|kupat holim|facebook|instagram|tiktok|whatsapp|mugshot|passport|selfie|samer abu|أبو مخ|אבו מוך|dr\.?\s*samer|engraving|lithograph|etching|woodcut|caricature|cartoon|comic|wellcome|census|banner\.jpg|aiga |file:.*\.svg|icon set|clip art|photomontage|collage meme|before.?after|star rating|roas|₪|%\s*off|photo contest|oil on canvas|painting|wga\d|manzanar|internment|evacuee|smallpox|relocation center|miner.s children|wife of miner|\bNARA\b|abandoned |\brally\b|rallies|protest|demonstration|city council|town council|\bcouncil\b|politic|election|campaign rally|legislative|city hall hearing|nyc council|new york city council|board of supervisors|picket|march against|activis|soap factory|mezzanine|stadium|menu board|price list|pdf scan|floor plan|minusma|unicef|who clinic|field hospital/i;

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

const RESTAURANT_SHORT: Record<FoodFamily, string[]> = {
  mediterranean: ["hummus", "mezze platter", "olive oil", "mediterranean food", "restaurant terrace"],
  grill: ["grilled food", "shawarma", "restaurant grill", "kebab plate"],
  pizza: ["neapolitan pizza", "pizza oven", "wood fired pizza"],
  cafe: ["cafe interior", "coffee shop", "pastry counter"],
  generic: ["restaurant interior", "plated food", "dining table"],
};

const RESTAURANT_QUERIES: Record<FoodFamily, string[]> = {
  mediterranean: [
    "Mediterranean mezze platter",
    "hummus olive oil bowl",
    "outdoor restaurant terrace dusk",
    "olive oil bread restaurant table",
    "ceramic plates Mediterranean food",
    "Levantine table setting",
    "empty outdoor dining table olive tree",
  ],
  grill: [
    "grilled food",
    "restaurant grill",
    "grilled chicken restaurant",
    "fresh grilled meat",
    "charcoal grill restaurant",
    "shawarma grill",
  ],
  pizza: [
    "wood fired pizza restaurant",
    "pizza oven restaurant interior",
    "neapolitan pizza on ceramic",
  ],
  cafe: [
    "cafe interior table",
    "coffee shop pastry counter",
    "empty cafe terrace",
  ],
  generic: [
    "restaurant interior dining",
    "plated food ceramic restaurant",
    "neighborhood restaurant table",
    "grilled food",
  ],
};

/** HE / AR / EN campaign facts → short English photo queries. */
const HINT_LEXICON: Array<{ re: RegExp; add: string[] }> = [
  { re: /חומוס|حمص|hummus/i, add: ["hummus", "mezze platter"] },
  { re: /זית|olive|زيتون|שמן זית|زيت زيتون/i, add: ["olive oil", "mediterranean food"] },
  { re: /מזה|mezze|meze|مزة|مقبلات/i, add: ["mezze platter", "levantine food"] },
  { re: /ים-?תיכון|mediterranean|levant|متوسط/i, add: ["mediterranean food", "restaurant terrace"] },
  { re: /ישיבה בחוץ|outdoor seating|terrace|تراس|شرفة|שקיעה|dusk/i, add: ["restaurant terrace", "outdoor dining"] },
  { re: /ילדים|أطفال|pedia|pediatric|kids|ילד/i, add: ["pediatric clinic", "waiting room"] },
  { re: /מרפאה|عيادة|clinic|רופא|طبيب/i, add: ["clinic interior", "waiting room"] },
  { re: /שיניים|أسنان|dent/i, add: ["dental clinic"] },
  { re: /המתנה|انتظار|waiting/i, add: ["waiting room"] },
  { re: /בוטיק|boutique|אופנה|fashion|أزياء/i, add: ["fashion boutique", "clothing boutique"] },
  { re: /הידרותרפ|hydrotherap|علاج مائي|בריכה/i, add: ["hydrotherapy pool", "indoor pool"] },
  { re: /shawarma|شاورما|שוארמה/i, add: ["shawarma", "grilled food"] },
  { re: /פיצה|pizza|بيتزا/i, add: ["neapolitan pizza", "pizza oven"] },
];

export function lexiconQueriesFrom(blob: string): string[] {
  const out: string[] = [];
  const text = String(blob ?? "");
  for (const row of HINT_LEXICON) {
    if (row.re.test(text)) out.push(...row.add);
  }
  return out;
}

function resolveFoodFamily(input: StockSearchInput): FoodFamily {
  return foodFamily({
    businessName: "",
    category: input.category ?? "",
    description: `${input.q ?? ""} ${input.description ?? ""} ${input.offer ?? ""}`,
    uniqueAdvantage: input.description ?? "",
    offer: input.offer ?? "",
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
  if (/hummus|חומוס|حمص|olive|זית|زيتون/.test(c)) extra.push("hummus olive oil bowl", "Mediterranean mezze platter");
  const latin = latinWords(category);
  if (latin.length >= 4 && !/clalit/i.test(latin)) extra.push(latin);
  return extra;
}

function locationBoosts(location: string, vertical: Vertical): string[] {
  const loc = sanitizeStockHint(location);
  if (!loc) return [];
  if (vertical === "clinic") return ["Mediterranean family clinic interior", "community health clinic"];
  if (vertical === "restaurant") {
    const fam = resolveFoodFamily({ category: location, q: location, description: location });
    if (fam === "mediterranean") return ["Levantine outdoor dining", "Mediterranean restaurant terrace"];
    return ["Levant grilled food"];
  }
  if (vertical === "pool") return ["indoor therapy pool"];
  if (vertical === "retail") return ["clothing boutique interior"];
  return [];
}

function uniqueQueries(items: string[], max = 16): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const q of items) {
    const key = q.toLowerCase().trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(q.trim());
  }
  return unique.slice(0, max);
}

/** Public: the English queries we send (Openverse / Wikimedia / Google). Short first. */
export function topicQueriesFor(input: StockSearchInput): string[] {
  const vertical = resolveStockVertical(input);
  const fam = vertical === "restaurant" ? resolveFoodFamily(input) : "generic";
  const short = vertical === "restaurant" ? RESTAURANT_SHORT[fam] : SHORT_QUERIES[vertical];
  const long = vertical === "restaurant" ? RESTAURANT_QUERIES[fam] : TOPIC_QUERIES[vertical];
  const facts = `${input.q ?? ""} ${input.category ?? ""} ${input.description ?? ""} ${input.offer ?? ""}`;
  const out: string[] = [
    ...short,
    ...lexiconQueriesFrom(facts),
    ...long,
    ...categoryBoosts(input.category ?? "", vertical),
    ...locationBoosts(input.location ?? "", vertical),
  ];
  const hint = sanitizeStockHint(input.q ?? "");
  const latin = latinWords(hint);
  if (latin.length >= 6 && latin.split(" ").length <= 6) out.push(latin);
  if (vertical === "restaurant" && fam === "mediterranean") {
    return uniqueQueries(out.filter((q) => !/pizza|pepperoni|\bhut\b/i.test(q)), 16);
  }
  return uniqueQueries(out, 16);
}

/** Prefer JPEG photos; keep the query short so Commons Cirrus actually hits. */
export function wikiSearchQuery(topic: string): string {
  return `filemime:image/jpeg ${clip(topic, 80)} -svg -logo -engraving -painting`;
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
  if (/church|cathedral|priest|altar|mosque|synagogue|military|camouflage|soldier|parking lot|car park|stethoscope|microscope|vintage medical|antique medical|black and white|monochrome|respirator|ventilator|sanatorium|polio/i.test(blob)) return true;
  return false;
}

const OFF_TOPIC: Record<Vertical, RegExp | null> = {
  clinic:
    /train station|bus station|ferry|airport|railway|metro station|\bamtrak\b|geograph\.org|swimsuit|bikini|nude|immigration|behörde|church|cathedral|priest|military|soldier|parking|microscope|rally|rallies|protest|demonstration|city council|town council|\bcouncil\b|politic|election|city hall|legislative|activis|picket|union march|news conference|press conference|capitol|parliament/i,
  pool: /hotel luxury|bikini|swimsuit fashion|beach party|rally|protest|council|politic/i,
  retail: /weapon|ammo|pharmacy|rally|protest|council|politic/i,
  restaurant: /pet food|dog food|rally|protest|council|politic|pizza hut|pepperoni factory|soap factory|mezze maniche|étang|etang de thau|\bmèze\b/i,
  product: /landline|rotary phone|payphone|rally|protest|council|politic/i,
  school: /prison|military academy|rally|protest|council|politic/i,
  generic: /rally|rallies|protest|demonstration|city council|politic|election campaign/i,
};

export function stockRelevance(
  vertical: Vertical,
  title: string,
  extra = "",
  cuisine?: FoodFamily,
  query = "",
): number {
  const blob = `${title} ${extra}`;
  if (isJunkStockTitle(title, extra)) return -1;
  if (OFF_TOPIC[vertical]?.test(blob)) return -1;
  if (
    vertical === "clinic" &&
    /\b(station|amtrak|railway|metro|airport|platform|terminus)\b/i.test(blob) &&
    !/clinic|doctor|medical|hospital|pediatric|urgent care|waiting room at a medical/i.test(blob)
  ) {
    return -1;
  }
  if (vertical === "restaurant" && cuisine === "mediterranean" && /pizza|pepperoni|\bhut\b/i.test(blob)) return -1;
  let score = 0;
  if (TOPIC_NEEDLES[vertical].test(blob)) score = 1;
  // Trust a short on-topic search: Commons/Openverse titles are often IMG_ / DSC_.
  if (!score && query && TOPIC_NEEDLES[vertical].test(query) && !isJunkStockTitle(query)) score = 1;
  if (!score) return 0;
  if (/waiting.?room|clinic interior|doctor.?office|boutique interior|hydrotherapy|grilled|classroom|hummus|mezz?e|olive oil/i.test(blob)) {
    score += 4;
  }
  if (/pediatric|family clinic|family health|medical clinic|kids health|mediterranean|levantine/i.test(blob)) score += 2;
  if (/naval|military|vaccination|historical|black and white/i.test(blob)) score -= 2;
  return score;
}

export function isOnTopicStock(
  vertical: Vertical,
  title: string,
  extra = "",
  cuisine?: FoodFamily,
  query = "",
): boolean {
  return stockRelevance(vertical, title, extra, cuisine, query) > 0;
}

export function googleCseConfigured(): boolean {
  const cx = runtimeEnv("GOOGLE_CSE_ID") || runtimeEnv("GOOGLE_CSE_CX");
  const key = runtimeEnv("GOOGLE_CSE_API_KEY") || runtimeEnv("GOOGLE_API_KEY");
  return Boolean(cx && key);
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

function fromWikiPage(page: WikiPage, query: string, vertical: Vertical, cuisine?: FoodFamily): StockImage | null {
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
  if (stockRelevance(vertical, title, desc, cuisine, query) <= 0) return null;
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

async function wikiSearch(topic: string, limit: number, offset: number, vertical: Vertical, cuisine?: FoodFamily): Promise<StockImage[]> {
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
    const hit = fromWikiPage(page, topic, vertical, cuisine);
    if (hit) out.push(hit);
  }
  return out;
}

async function wikiCategory(cat: string, limit: number, vertical: Vertical, cuisine?: FoodFamily): Promise<StockImage[]> {
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
    const hit = fromWikiPage(page, `category:${cat}`, vertical, cuisine);
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

function parseOpenverseHits(results: OvHit[], topic: string, vertical: Vertical, cuisine?: FoodFamily): StockImage[] {
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
    if (!isOnTopicStock(vertical, title, extra, cuisine, topic)) continue;
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

async function openverseSearch(topic: string, page: number, vertical: Vertical, cuisine?: FoodFamily): Promise<StockImage[]> {
  const base = {
    q: clip(topic, 80),
    page: String(Math.max(1, page)),
    page_size: "20",
    mature: "false",
    extension: "jpg,png",
  };
  const photoParams = new URLSearchParams({ ...base, category: "photograph" });
  let json = await fetchJson(`${OPENVERSE}?${photoParams.toString()}`, 7000);
  let results = Array.isArray((json as { results?: unknown } | null)?.results)
    ? ((json as { results: OvHit[] }).results)
    : [];
  let out = parseOpenverseHits(results, topic, vertical, cuisine);
  if (out.length) return out;
  // Photograph category is often empty for short food/clinic queries — retry uncategorized.
  const loose = new URLSearchParams(base);
  json = await fetchJson(`${OPENVERSE}?${loose.toString()}`, 7000);
  results = Array.isArray((json as { results?: unknown } | null)?.results)
    ? ((json as { results: OvHit[] }).results)
    : [];
  return parseOpenverseHits(results, topic, vertical, cuisine);
}

type GCseItem = {
  title?: string;
  link?: string;
  displayLink?: string;
  image?: { thumbnailLink?: string; contextLink?: string; width?: number; height?: number };
  snippet?: string;
};

async function googleCseSearch(topic: string, vertical: Vertical, cuisine?: FoodFamily): Promise<StockImage[]> {
  const cx = runtimeEnv("GOOGLE_CSE_ID") || runtimeEnv("GOOGLE_CSE_CX");
  const key = runtimeEnv("GOOGLE_CSE_API_KEY") || runtimeEnv("GOOGLE_API_KEY");
  if (!cx || !key) return [];
  const params = new URLSearchParams({
    key,
    cx,
    q: clip(topic, 80),
    searchType: "image",
    num: "10",
    safe: "active",
    imgType: "photo",
    fileType: "jpg",
  });
  const json = await fetchJson(`https://www.googleapis.com/customsearch/v1?${params.toString()}`, 8000);
  if (!json || typeof json !== "object") return [];
  const items = Array.isArray((json as { items?: unknown }).items)
    ? ((json as { items: GCseItem[] }).items)
    : [];
  const out: StockImage[] = [];
  for (const row of items) {
    const full = toHttps(String(row.link ?? ""));
    const thumb = toHttps(String(row.image?.thumbnailLink || row.link || ""));
    if (!isHttps(full) || !isHttps(thumb)) continue;
    if (/\.svg(\?|$)/i.test(full)) continue;
    const title = String(row.title ?? "");
    const extra = `${row.snippet ?? ""} ${row.displayLink ?? ""}`;
    if (!isOnTopicStock(vertical, title, extra, cuisine, topic)) continue;
    const host = clip(String(row.displayLink ?? "Google"), 60);
    out.push({
      id: `gcs-${normUrl(full).slice(-28)}`,
      thumb,
      full,
      title: clip(title || topic, 140),
      attribution: clip(`Google · ${host}`, 160),
      source: "google",
      license: "source-link",
      landingUrl: toHttps(String(row.image?.contextLink ?? "")) || full,
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

/** Interleave by search query so the grid is hummus + terrace + mezze, not 24 hummus. */
function diversifyByQuery(images: StockImage[], limit: number): StockImage[] {
  const buckets = new Map<string, StockImage[]>();
  for (const img of images) {
    const key = (img.query || img.source || "_").toLowerCase();
    const arr = buckets.get(key) ?? [];
    arr.push(img);
    buckets.set(key, arr);
  }
  const queues = [...buckets.values()];
  const out: StockImage[] = [];
  const seen = new Set<string>();
  let progressed = true;
  while (out.length < limit && progressed) {
    progressed = false;
    for (const q of queues) {
      while (q.length) {
        const img = q.shift()!;
        const key = normUrl(img.full) || img.id;
        if (!key || seen.has(key) || seen.has(img.id)) continue;
        seen.add(key);
        seen.add(img.id);
        out.push(img);
        progressed = true;
        break;
      }
      if (out.length >= limit) break;
    }
  }
  return out;
}

export async function vertexStillsForStock(input: StockSearchInput, max = 10): Promise<StockImage[]> {
  const topic = sanitizeStockHint(input.q || input.category || "");
  try {
    const { runImagenMany, imagenScenesFor, IMAGEN_PICKER_COUNT } = await import("./imagen");
    const n = Math.max(8, Math.min(12, max || IMAGEN_PICKER_COUNT));
    const scenes = imagenScenesFor({
      vertical: input.vertical,
      category: input.category,
      location: input.location,
      q: input.q,
      description: input.description || input.q,
      offer: input.offer,
      locale: "en",
    }).slice(0, n);
    const prompts = scenes.map((s) => s.prompt);
    const batch = await Promise.race([
      runImagenMany(
        {
          businessName: topic || "a local business",
          category: sanitizeStockHint(input.category || input.vertical || "local service"),
          vertical: input.vertical,
          location: input.location,
          locale: "en",
          sampleCount: n,
          prompts,
        },
        prompts,
      ),
      new Promise<{ images: [] }>((resolve) => setTimeout(() => resolve({ images: [] }), 45000)),
    ]);
    const images = Array.isArray(batch?.images) ? batch.images : [];
    return images.map((hit, i) => {
      const mime = hit.mime && hit.mime.startsWith("image/") ? hit.mime : "image/png";
      const dataUrl = `data:${mime};base64,${hit.imageBase64}`;
      const scene = scenes[i];
      return {
        id: `vertex-still-${scene?.id || i + 1}`,
        thumb: dataUrl,
        full: dataUrl,
        title: scene?.title || "Vertex Imagen still",
        attribution: "Vertex Imagen",
        source: "vertex" as const,
        license: "generated",
        query: scene?.id || topic || "vertex",
      };
    });
  } catch {
    return [];
  }
}

/** Vertical-matched graphic stills when Imagen returns 0 — never dump junk CC. */
export async function curatedFallbackStills(input: StockSearchInput, max = 8): Promise<StockImage[]> {
  try {
    const { graphicPostersForIntake } = await import("./graphic-posters");
    const { emptyIntake } = await import("./engine/validate");
    const intake = emptyIntake();
    intake.businessName = sanitizeStockHint(input.q || "") || "local";
    intake.category = input.category || input.vertical || "";
    intake.description = input.description || input.q || "";
    intake.location = input.location || "";
    intake.offer = input.offer || "";
    const posters = graphicPostersForIntake(intake);
    const vertical = resolveStockVertical(input);
    return posters.slice(0, Math.max(4, Math.min(12, max))).map((p, i) => ({
      id: `curated-${p.id || i + 1}`,
      thumb: p.dataUrl,
      full: p.dataUrl,
      title: p.name.he || p.name.en || "Graphic still",
      attribution: "SAWEK graphic",
      source: "curated" as const,
      license: "curated",
      query: vertical,
    }));
  } catch {
    return [];
  }
}

export async function searchStockImages(input: StockSearchInput): Promise<StockSearchResult> {
  const vertical = resolveStockVertical(input);
  const cuisine = vertical === "restaurant" ? resolveFoodFamily(input) : undefined;
  const queries = topicQueriesFor(input);
  const page = Math.max(1, Math.min(8, Math.floor(Number(input.page) || 1)));
  const limit = Math.max(24, Math.min(60, Math.floor(Number(input.limit) || 48)));
  const offset = (page - 1) * 10;

  const searchSlice = page === 1 ? queries.slice(0, 10) : queries.slice(0, 6);
  const catSlice = page === 1 ? (WIKI_CATEGORIES[vertical] ?? []).slice(0, 3) : [];
  const ovSlice = queries.slice(0, page === 1 ? 8 : 4);
  const gcsSlice = googleCseConfigured() ? queries.slice(0, page === 1 ? 5 : 2) : [];

  const [wikiHits, catHits, ovHits, gcsHits] = await Promise.all([
    mapPool(searchSlice, 5, (q) => wikiSearch(q, 16, offset, vertical, cuisine)),
    mapPool(catSlice, 3, (c) => wikiCategory(c, 12, vertical, cuisine)),
    mapPool(ovSlice, 3, (q) => openverseSearch(q, page, vertical, cuisine)),
    mapPool(gcsSlice, 2, (q) => googleCseSearch(q, vertical, cuisine)),
  ]);

  const merged = dedupe([...gcsHits.flat(), ...wikiHits.flat(), ...ovHits.flat(), ...catHits.flat()])
    .filter((img) => isOnTopicStock(vertical, img.title, img.attribution, cuisine, img.query))
    .sort((a, b) => {
      const sb = stockRelevance(vertical, b.title, b.attribution, cuisine, b.query);
      const sa = stockRelevance(vertical, a.title, a.attribution, cuisine, a.query);
      if (sb !== sa) return sb - sa;
      const srcRank = (s: StockSource) => (s === "google" ? 3 : s === "wikimedia" ? 2 : s === "openverse" ? 1 : 0);
      return srcRank(b.source) - srcRank(a.source);
    });
  const images = diversifyByQuery(merged, limit);
  const nextPage = images.length >= 12 && page < 8 ? page + 1 : null;
  const emptyMessage =
    images.length === 0
      ? "אין תמונות חיות רלוונטיות לנושא כרגע — נסו כרזות גרפיות או תמונה מהאתר."
      : undefined;
  return { ok: true, images, page, nextPage, queries, ...(emptyMessage ? { emptyMessage } : {}) };
}
