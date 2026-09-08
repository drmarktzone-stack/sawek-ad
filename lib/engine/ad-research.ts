/**
 * Free public ad-intelligence desk.
 * Official APIs when a token exists; otherwise public library URLs + Search Grounding.
 * Never invent spend, ROAS, CPM, views, or likes.
 */
import type {
  GroundedNote,
  Intake,
  Locale,
  MarketResearch,
  PublicAdExample,
  ResearchSourceCard,
  ResearchSourceId,
  ResearchSourceStatus,
  Tri,
} from "../types";
import { runtimeEnv } from "../runtime-env";
import { completeGemini } from "./gemini-generate";
import { inventsForbidden } from "./coach";
import {
  RESEARCH_DISCLAIMER,
  RESEARCH_SOURCE_LABEL,
  buildResearchSkeleton,
  publicResearchUrls,
  researchGeo,
  researchQuery,
  tiktokCreativeCenterUrls,
} from "./research-public";
import {
  buildSearchQueries,
  examplesFromSuggestions,
  parseSuggestPayload,
  suggestEmptyCard,
  suggestEndpoints,
  suggestExploreUrl,
} from "./search-suggest";

export {
  buildResearchSkeleton,
  publicResearchUrls,
  researchGeo,
  researchQuery,
  tiktokCreativeCenterUrls,
} from "./research-public";

export type MarketResearchControls = {
  lookbackDays?: number;
  language?: string;
  objective?: string;
  competitorCategory?: string;
  query?: string;
  geo?: string;
  /** Skip in-memory cache (Retry from the desk). */
  bypassCache?: boolean;
};

const L = (he: string, ar: string, en: string): Tri => ({ he, ar, en });

const FAKE_METRIC =
  /\b(ROAS|CPM|CPA|CTR)\s*[:=]\s*\d|\bspend\s*[:=]\s*\d|מיליון צפיות|million views|\d+\s*million\s+(views|likes)|\blikes?\s*[:=]\s*\d|לייקים\s*\d/i;

const RATE_MS = 8_000;
const CACHE_MS = 10 * 60_000;
const lastCall = new Map<string, number>();
const cache = new Map<string, { at: number; data: MarketResearch }>();

function allowCall(key: string, minMs = RATE_MS): boolean {
  const now = Date.now();
  const prev = lastCall.get(key) ?? 0;
  if (now - prev < minMs) return false;
  lastCall.set(key, now);
  return true;
}

function looksFake(text: string): boolean {
  return FAKE_METRIC.test(text);
}

function asTri(v: unknown): Tri | undefined {
  if (!v || typeof v !== "object" || Array.isArray(v)) return undefined;
  const o = v as Record<string, unknown>;
  const he = typeof o.he === "string" ? o.he.trim() : "";
  const ar = typeof o.ar === "string" ? o.ar.trim() : "";
  const en = typeof o.en === "string" ? o.en.trim() : "";
  if (!he && !ar && !en) return undefined;
  if (looksFake(`${he} ${ar} ${en}`)) return undefined;
  return { he, ar, en };
}

function httpUrl(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const u = v.trim();
  return /^https?:\/\//i.test(u) ? u : undefined;
}

async function fetchJson(url: string, timeoutMs: number, headers?: Record<string, string>): Promise<{ status: number; json: unknown }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json,text/javascript,text/plain,*/*",
        "User-Agent": "Mozilla/5.0 (compatible; SAWEK-AD-research/1.0)",
        ...(headers ?? {}),
      },
      signal: ctrl.signal,
      cache: "no-store",
    });
    let json: unknown = null;
    try {
      const text = await res.text();
      try {
        json = JSON.parse(text);
      } catch {
        const wrapped = text.match(/^[^(]*\(([\s\S]*)\)\s*$/);
        json = wrapped?.[1] ? JSON.parse(wrapped[1]) : null;
      }
    } catch {
      json = null;
    }
    return { status: res.status, json };
  } finally {
    clearTimeout(timer);
  }
}

function metaToken(): string {
  return runtimeEnv("META_ADS_LIBRARY_TOKEN");
}

async function fetchMetaAdLibrary(query: string, geo: string, asOf: string): Promise<Partial<ResearchSourceCard>> {
  const token = metaToken();
  const explore = publicResearchUrls(query, geo).meta_ad_library;
  if (!token) {
    return {
      status: "no_token",
      emptyReason: L(
        "אין אסימון Graph — פתחו את ספריית המודעות הציבורית. לא נמציא הוצאות.",
        "ما في توكن Graph — افتحوا مكتبة الإعلانات العامة. مش حنختلق صرف.",
        "No Graph token — open the public Ad Library. We will not invent spend.",
      ),
    };
  }
  if (!allowCall("meta_ad_library")) {
    return {
      status: "rate_limited",
      emptyReason: L("הגבלת קצב לספריית Meta — נסו שוב בעוד רגע.", "حدّ معدل لمكتبة Meta — جرّبوا بعد لحظة.", "Meta Library rate limit — try again shortly."),
    };
  }
  const fields = "id,page_name,ad_creative_bodies,ad_creative_link_titles,ad_snapshot_url,publisher_platforms";
  const url =
    `https://graph.facebook.com/v21.0/ads_archive?access_token=${encodeURIComponent(token)}` +
    `&search_terms=${encodeURIComponent(query)}` +
    `&ad_reached_countries=${encodeURIComponent(JSON.stringify([geo]))}` +
    `&ad_active_status=ACTIVE&ad_type=ALL&fields=${encodeURIComponent(fields)}&limit=6`;
  try {
    const { status, json } = await fetchJson(url, 10_000);
    if (status === 429) {
      return {
        status: "rate_limited",
        emptyReason: L("Meta החזירה 429.", "Meta رجّعت 429.", "Meta returned 429."),
      };
    }
    if (status === 401 || status === 403) {
      return {
        status: "blocked",
        emptyReason: L(
          "האסימון נדחה או חסר ads_archive — פתחו את הדף הציבורי.",
          "التوكن مرفوض أو ناقص ads_archive — افتحوا الصفحة العامة.",
          "Token rejected or missing ads_archive — open the public page.",
        ),
      };
    }
    const data = json && typeof json === "object" ? (json as { data?: unknown; error?: unknown }).data : null;
    const rows = Array.isArray(data) ? data : [];
    const examples: PublicAdExample[] = [];
    for (const row of rows) {
      if (!row || typeof row !== "object") continue;
      const o = row as Record<string, unknown>;
      const advertiser = typeof o.page_name === "string" ? o.page_name.trim() : "";
      const bodies = Array.isArray(o.ad_creative_bodies) ? o.ad_creative_bodies : [];
      const titles = Array.isArray(o.ad_creative_link_titles) ? o.ad_creative_link_titles : [];
      const snippetRaw = typeof bodies[0] === "string" ? bodies[0].trim() : "";
      const titleRaw = typeof titles[0] === "string" ? titles[0].trim() : advertiser || "Public ad";
      const snap = httpUrl(o.ad_snapshot_url) || explore;
      const blob = `${advertiser} ${titleRaw} ${snippetRaw}`;
      if (looksFake(blob)) continue;
      examples.push({
        id: typeof o.id === "string" ? o.id : `meta-${examples.length + 1}`,
        source: "meta_ad_library",
        advertiser: advertiser || undefined,
        page: advertiser || undefined,
        title: L(titleRaw, titleRaw, titleRaw),
        snippet: L(snippetRaw.slice(0, 220), snippetRaw.slice(0, 220), snippetRaw.slice(0, 220)),
        url: snap,
        asOf,
      });
    }
    if (!examples.length) {
      return {
        status: "empty",
        emptyReason: L(
          "ה-API לא החזיר מודעות פעילות למונח הזה.",
          "الـ API ما رجّع إعلانات نشطة لهاالمصطلح.",
          "The API returned no active ads for this term.",
        ),
      };
    }
    return { status: "ok", examples: examples.slice(0, 6) };
  } catch {
    return {
      status: "blocked",
      emptyReason: L("קריאת ספריית Meta נכשלה.", "نداء مكتبة Meta فشل.", "Meta Library request failed."),
    };
  }
}

async function fetchSuggestJson(url: string): Promise<{ status: number; json: unknown }> {
  return fetchJson(url, 6000);
}

async function collectSuggestions(kind: "google" | "youtube", queries: string[]): Promise<{
  suggestions: string[];
  queryUsed: string;
  status: ResearchSourceStatus;
  reason: Tri;
}> {
  const key = kind === "youtube" ? "youtube_suggest" : "google_suggest";
  if (!allowCall(key, 4000)) {
    return {
      suggestions: [],
      queryUsed: queries[0] || "",
      status: "rate_limited",
      reason: L(
        kind === "youtube" ? "הגבלת קצב להצעות יוטיוב." : "הגבלת קצב להצעות Google.",
        kind === "youtube" ? "حدّ معدل لاقتراحات يوتيوب." : "حدّ معدل لاقتراحات Google.",
        kind === "youtube" ? "YouTube suggest rate limit." : "Google suggest rate limit.",
      ),
    };
  }
  let lastStatus: ResearchSourceStatus = "empty";
  let lastReason = L("אין הצעות חיפוש למונח.", "ما في اقتراحات بحث للمصطلح.", "No search suggestions for this term.");
  const found: string[] = [];
  let queryUsed = queries[0] || "";
  for (const q of queries.slice(0, 6)) {
    if (!q.trim()) continue;
    queryUsed = q;
    for (const url of suggestEndpoints(kind, q)) {
      try {
        const { status, json } = await fetchSuggestJson(url);
        if (status === 429) {
          lastStatus = "rate_limited";
          lastReason = L("429 מהמקור.", "429 من المصدر.", "Source returned 429.");
          continue;
        }
        if (status < 200 || status >= 300 || !Array.isArray(json)) {
          lastStatus = "blocked";
          lastReason = L(
            "הצעות החיפוש חסומות מהשרת — UNKNOWN, לא המצאה.",
            "اقتراحات البحث محجوبة من السيرفر — UNKNOWN، مش اختراع.",
            "Search suggest is blocked from this host — UNKNOWN, not invented.",
          );
          continue;
        }
        const parsed = parseSuggestPayload(json);
        for (const s of parsed) {
          if (!found.includes(s)) found.push(s);
        }
        if (found.length) {
          return { suggestions: found, queryUsed: q, status: "ok", reason: L("", "", "") };
        }
        lastStatus = "empty";
        lastReason = L("אין הצעות חיפוש למונח.", "ما في اقتراحات بحث للمصطلح.", "No search suggestions for this term.");
      } catch {
        lastStatus = "blocked";
        lastReason = L("הצעות החיפוש לא זמינות.", "اقتراحات البحث غير متاحة.", "Search suggest is unavailable.");
      }
    }
  }
  return { suggestions: found, queryUsed, status: lastStatus, reason: lastReason };
}

async function fetchYouTubeSuggest(query: string, asOf: string, queries: string[]): Promise<Partial<ResearchSourceCard>> {
  const all = queries.length ? queries : [query];
  const live = await collectSuggestions("youtube", all);
  if (live.suggestions.length) {
    return {
      status: "ok",
      examples: examplesFromSuggestions({
        source: "youtube_suggest",
        suggestions: live.suggestions,
        asOf,
        queryUsed: live.queryUsed,
        kind: "youtube",
      }),
        retryable: true,
        queryUsed: live.queryUsed,
        alternateSources: [
          { label: L("חיפוש YouTube", "بحث YouTube", "YouTube Search"), url: suggestExploreUrl("youtube", live.queryUsed) },
          { label: L("חיפוש Google", "بحث Google", "Google Search"), url: suggestExploreUrl("google", live.queryUsed) },
        ],
      };
    }
  return suggestEmptyCard({
    id: "youtube_suggest",
    label: RESEARCH_SOURCE_LABEL.youtube_suggest,
    exploreUrl: suggestExploreUrl("youtube", live.queryUsed || query),
    status: live.status,
    reason: live.reason,
    query: live.queryUsed || query,
  });
}

async function fetchGoogleSuggest(query: string, asOf: string, queries: string[]): Promise<Partial<ResearchSourceCard>> {
  const all = queries.length ? queries : [query];
  const live = await collectSuggestions("google", all);
  if (live.suggestions.length) {
    return {
      status: "ok",
      examples: examplesFromSuggestions({
        source: "google_suggest",
        suggestions: live.suggestions,
        asOf,
        queryUsed: live.queryUsed,
        kind: "google",
      }),
        retryable: true,
        queryUsed: live.queryUsed,
        alternateSources: [
          { label: L("חיפוש Google", "بحث Google", "Google Search"), url: suggestExploreUrl("google", live.queryUsed) },
          { label: L("Google Trends", "Google Trends", "Google Trends"), url: `https://trends.google.com/trends/explore?q=${encodeURIComponent(live.queryUsed)}` },
        ],
      };
    }
  return suggestEmptyCard({
    id: "google_suggest",
    label: RESEARCH_SOURCE_LABEL.google_suggest,
    exploreUrl: suggestExploreUrl("google", live.queryUsed || query),
    status: live.status,
    reason: live.reason,
    query: live.queryUsed || query,
  });
}

async function fetchTikTokCreativeCenter(query: string, geo: string): Promise<Partial<ResearchSourceCard>> {
  if (!allowCall("tiktok_creative_center")) {
    return {
      status: "rate_limited",
      emptyReason: L("הגבלת קצב לטיקטוק CC.", "حدّ معدل لتيك توك CC.", "TikTok CC rate limit."),
    };
  }
  const url =
    `https://ads.tiktok.com/creative_radar_api/v1/popular_trend/hashtag/list?period=7&page=1&limit=8` +
    `&country_code=${encodeURIComponent(geo)}&q=${encodeURIComponent(query)}`;
  try {
    const { status, json } = await fetchJson(url, 7000, {
      "User-Agent": "SAWEK-AD-research/1.0",
    });
    if (status === 429) {
      return {
        status: "rate_limited",
        emptyReason: L("טיקטוק CC החזירה 429.", "تيك توك CC رجّعت 429.", "TikTok CC returned 429."),
      };
    }
    if (status < 200 || status >= 300) {
      return {
        status: "blocked",
        emptyReason: L(
          "אין API רשמי חופשי — פתחו את Creative Center. לא נמציא צפיות.",
          "ما في API رسمي مجاني — افتحوا Creative Center. مش حنختلق مشاهدات.",
          "No official free API — open Creative Center. We will not invent views.",
        ),
      };
    }
    const root = json && typeof json === "object" ? (json as Record<string, unknown>) : {};
    if (root.code === 40101 || /no permission/i.test(String(root.msg ?? ""))) {
      return {
        status: "blocked",
        emptyReason: L(
          "Creative Center דחה את הקריאה (אין הרשאה). נשאר קישור העמוד הרשמי — לא נמציא צפיות.",
          "Creative Center رفض النداء (ما في صلاحية). بقي رابط الصفحة الرسمية — مش حنختلق مشاهدات.",
          "Creative Center rejected the call (no permission). Official page link remains — we will not invent views.",
        ),
      };
    }
    const data = root.data && typeof root.data === "object" ? (root.data as Record<string, unknown>) : root;
    const list = Array.isArray(data.list) ? data.list : Array.isArray(data.hashtags) ? data.hashtags : [];
    if (!list.length) {
      return {
        status: "empty",
        emptyReason: L(
          "Creative Center לא החזיר האשטגים — נשארו קישורי העמוד הרשמי.",
          "Creative Center ما رجّع هاشتاغات — بقيت روابط الصفحة الرسمية.",
          "Creative Center returned no hashtags — official page links remain.",
        ),
      };
    }
    return {
      status: "blocked",
      emptyReason: L(
        "אין API רשמי חופשי לדוגמאות מודעות — פתחו את Creative Center. לא נמציא צפיות.",
        "ما في API رسمي مجاني لأمثلة الإعلانات — افتحوا Creative Center. مش حنختلق مشاهدات.",
        "No official free ads API — open Creative Center. We will not invent views.",
      ),
    };
  } catch {
    return {
      status: "blocked",
      emptyReason: L(
        "Creative Center לא זמין בלי התחברות. פתחו את העמוד הרשמי.",
        "Creative Center غير متاح بلا تسجيل. افتحوا الصفحة الرسمية.",
        "Creative Center is unavailable without a login. Open the official page.",
      ),
    };
  }
}

function parseLooseJson(text: string): Record<string, unknown> | null {
  const stripped = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  try {
    const v: unknown = JSON.parse(stripped);
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch {
    const m = stripped.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try {
      const v: unknown = JSON.parse(m[0]);
      return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }
}

async function groundedMarketNotes(
  intake: Intake,
  query: string,
  geo: string,
  urls: Record<ResearchSourceId, string>,
  asOf: string,
  controls?: MarketResearchControls,
): Promise<{ notes: GroundedNote[]; examples: PublicAdExample[]; sources: { url: string; title?: string }[]; grounded: boolean }> {
  const cc = tiktokCreativeCenterUrls(geo, controls?.lookbackDays);
  const prompt = [
    `Business facts: name=${intake.businessName}; category=${intake.category}; niche=${intake.voice?.niche || ""}; location=${intake.location}; offer=${intake.offer}; geo=${geo}`,
    `Scan controls: language=${controls?.language || ""}; objective=${controls?.objective || ""}; lookbackDays=${controls?.lookbackDays ?? 7}; competitorCategory=${controls?.competitorCategory || ""}`,
    `Today: ${asOf.slice(0, 10)}`,
    "Using Google Search grounding, summarize CURRENT public ad/creative patterns for this niche.",
    "Preferred public pages (cite the URL when used):",
    `- Meta Ad Library: ${urls.meta_ad_library}`,
    `- TikTok Creative Center top ads: ${cc.ads}`,
    `- TikTok keywords: ${cc.keywords}`,
    `- TikTok hashtags: ${cc.hashtags}`,
    `- Google Ads Transparency: ${urls.google_ads_transparency}`,
    `- Pinterest Trends: ${urls.pinterest_trends}`,
    `- YouTube: ${urls.youtube_suggest}`,
    `- Google Search: ${urls.google_suggest}`,
    `- LinkedIn Ad Library: ${urls.linkedin_ad_library}`,
    "Each example: advertiser/page ONLY if the public page shows it, one-line pattern, source URL, asOf today's date.",
    "Do NOT invent view counts, spend, ROAS, likes, CPM, or rankings.",
    "If a source is login-walled or empty, say so — do not invent ads.",
    `JSON: {"notes":[{"title":{"he":"","ar":"","en":""},"note":{"he":"","ar":"","en":""},"sourceUrl":"","asOf":"${asOf.slice(0, 10)}"}],"examples":[{"source":"meta_ad_library","advertiser":"","title":{"he":"","ar":"","en":""},"snippet":{"he":"","ar":"","en":""},"url":"","asOf":"${asOf.slice(0, 10)}"}]}`,
  ].join("\n");
  try {
    const completed = await completeGemini({
      parts: [{ text: prompt }],
      temperature: 0.35,
      timeoutMs: 32_000,
      tier: "pro",
      grounding: true,
      systemInstruction:
        "You are SAWEK AD research desk. Use Google Search grounding on public marketing pages only. Cite URLs. Label today's date. Never invent ROAS, CPM, spend, views, or likes. Reply JSON only.",
    });
    if (!completed.ok) return { notes: [], examples: [], sources: [], grounded: false };
    const obj = parseLooseJson(completed.text);
    if (!obj) {
      return {
        notes: [],
        examples: [],
        sources: completed.groundingSources ?? [],
        grounded: completed.grounded === true,
      };
    }
    const blob = JSON.stringify(obj);
    if (inventsForbidden(blob, intake) || looksFake(blob)) {
      return { notes: [], examples: [], sources: completed.groundingSources ?? [], grounded: completed.grounded === true };
    }
    const notes: GroundedNote[] = [];
    for (const row of Array.isArray(obj.notes) ? obj.notes : []) {
      if (!row || typeof row !== "object") continue;
      const o = row as Record<string, unknown>;
      const title = asTri(o.title);
      const note = asTri(o.note);
      if (!title || !note) continue;
      notes.push({
        title,
        note,
        asOf: typeof o.asOf === "string" && o.asOf.trim() ? o.asOf.trim() : asOf,
        ...(httpUrl(o.sourceUrl) ? { sourceUrl: httpUrl(o.sourceUrl) } : {}),
      });
    }
    const allowed = new Set<ResearchSourceId>([
      "meta_ad_library",
      "tiktok_creative_center",
      "google_ads_transparency",
      "pinterest_trends",
      "youtube_suggest",
      "google_suggest",
      "linkedin_ad_library",
    ]);
    const examples: PublicAdExample[] = [];
    for (const row of Array.isArray(obj.examples) ? obj.examples : []) {
      if (!row || typeof row !== "object") continue;
      const o = row as Record<string, unknown>;
      const source = typeof o.source === "string" && allowed.has(o.source as ResearchSourceId) ? (o.source as ResearchSourceId) : undefined;
      const title = asTri(o.title);
      const snippet = asTri(o.snippet);
      const url = httpUrl(o.url);
      if (!source || !title || !snippet || !url) continue;
      if (looksFake(`${o.advertiser ?? ""} ${JSON.stringify(title)} ${JSON.stringify(snippet)}`)) continue;
      examples.push({
        id: `gnd-${examples.length + 1}`,
        source,
        advertiser: typeof o.advertiser === "string" ? o.advertiser.trim() || undefined : undefined,
        page: typeof o.page === "string" ? o.page.trim() || undefined : undefined,
        title,
        snippet,
        url,
        asOf: typeof o.asOf === "string" && o.asOf.trim() ? o.asOf.trim() : asOf,
      });
    }
    return {
      notes: notes.slice(0, 8),
      examples: examples.slice(0, 10),
      sources: completed.groundingSources ?? [],
      grounded: completed.grounded === true || notes.length > 0,
    };
  } catch {
    return { notes: [], examples: [], sources: [], grounded: false };
  }
}

function mergeCard(
  id: ResearchSourceId,
  exploreUrl: string,
  live: Partial<ResearchSourceCard>,
  groundedExamples: PublicAdExample[],
  groundedNotes: GroundedNote[],
): ResearchSourceCard {
  const examples = [...(live.examples ?? []), ...groundedExamples.filter((e) => e.source === id)].slice(0, 8);
  const notes = [...(live.notes ?? []), ...groundedNotes.filter((n) => n.sourceUrl && n.sourceUrl.includes(hostHint(id)))].slice(0, 4);
  let status: ResearchSourceStatus = live.status ?? "empty";
  if (examples.length && (status === "empty" || status === "no_token" || status === "pending" || status === "blocked")) {
    status = live.status === "ok" ? "ok" : "grounded";
  }
  if (!examples.length && !notes.length && !live.emptyReason) {
    status = live.status ?? "empty";
  }
  return {
    id,
    status,
    label: RESEARCH_SOURCE_LABEL[id],
    exploreUrl,
    examples,
    notes,
    ...(live.emptyReason && !examples.length ? { emptyReason: live.emptyReason } : {}),
    ...(live.alternateSources?.length ? { alternateSources: live.alternateSources } : {}),
    ...(live.retryable ? { retryable: true } : {}),
    ...(live.queryUsed ? { queryUsed: live.queryUsed } : {}),
  };
}

function hostHint(id: ResearchSourceId): string {
  if (id === "meta_ad_library") return "facebook.com/ads/library";
  if (id === "tiktok_creative_center") return "tiktok.com";
  if (id === "google_ads_transparency") return "adstransparency.google.com";
  if (id === "pinterest_trends") return "pinterest.com";
  if (id === "youtube_suggest") return "youtube.com";
  if (id === "google_suggest") return "google.com";
  return "linkedin.com/ad-library";
}

export async function runMarketResearch(intake: Intake, controls?: MarketResearchControls): Promise<MarketResearch> {
  const query = (controls?.query || researchQuery(intake)).trim();
  const geo = (controls?.geo || researchGeo(intake)).trim() || "IL";
  const lookback = controls?.lookbackDays;
  const queries = buildSearchQueries(intake, {
    objective: controls?.objective,
    market: controls?.competitorCategory || intake.location,
  });
  if (query && !queries.includes(query)) queries.unshift(query);
  const cacheKey = `${query}::${queries.join("|")}::${geo}::${lookback ?? 7}::${controls?.language ?? ""}::${controls?.objective ?? ""}::${controls?.competitorCategory ?? ""}`;
  if (!controls?.bypassCache) {
    const hit = cache.get(cacheKey);
    if (hit && Date.now() - hit.at < CACHE_MS) return hit.data;
  }
  if (!intake.businessName.trim() && !intake.description.trim() && !intake.category.trim() && !intake.voice?.niche) {
    const empty = buildResearchSkeleton(intake);
    return { ...empty, fetched: true, sources: empty.sources.map((s) => ({ ...s, status: "empty" as const })) };
  }
  const asOf = new Date().toISOString();
  const urls = publicResearchUrls(query, geo, lookback);
  const [meta, youtube, googleSuggest, tiktok, grounded] = await Promise.all([
    fetchMetaAdLibrary(query, geo, asOf),
    fetchYouTubeSuggest(query, asOf, queries),
    fetchGoogleSuggest(query, asOf, queries),
    fetchTikTokCreativeCenter(query, geo),
    groundedMarketNotes(intake, query, geo, urls, asOf, controls),
  ]);
  const extraNotes = grounded.notes;
  const sources: ResearchSourceCard[] = [
    mergeCard("meta_ad_library", urls.meta_ad_library, meta, grounded.examples, extraNotes),
    mergeCard("tiktok_creative_center", urls.tiktok_creative_center, tiktok, grounded.examples, extraNotes),
    mergeCard(
      "google_ads_transparency",
      urls.google_ads_transparency,
      {
        status: "grounded",
        emptyReason: L(
          "אין API רשמי חופשי — קישור למרכז השקיפות + הערות מבוססות חיפוש.",
          "ما في API رسمي مجاني — رابط مركز الشفافية + ملاحظات بحث.",
          "No official free API — Transparency Center link + grounded notes.",
        ),
      },
      grounded.examples,
      extraNotes,
    ),
    mergeCard(
      "pinterest_trends",
      urls.pinterest_trends,
      {
        status: "grounded",
        emptyReason: L(
          "טרנדים בפינטרסט הם עמוד ציבורי — בלי מושב בתשלום.",
          "ترندات بنترست صفحة عامة — بلا مقعد مدفوع.",
          "Pinterest Trends is a public page — no paid seat.",
        ),
      },
      grounded.examples,
      extraNotes,
    ),
    mergeCard("google_suggest", urls.google_suggest, googleSuggest, [], []),
    mergeCard("youtube_suggest", urls.youtube_suggest, youtube, [], []),
    mergeCard(
      "linkedin_ad_library",
      urls.linkedin_ad_library,
      {
        status: "blocked",
        emptyReason: L(
          "ספריית LinkedIn לרוב דורשת התחברות. לא נמציא מודעות.",
          "مكتبة LinkedIn غالباً بدها تسجيل. مش حنختلق إعلانات.",
          "LinkedIn Ad Library usually needs a login. We will not invent ads.",
        ),
      },
      grounded.examples,
      extraNotes,
    ),
  ];
  const research: MarketResearch = {
    asOf,
    query,
    queries,
    geo,
    sources,
    notes: extraNotes,
    grounded: grounded.grounded,
    fetched: true,
    disclaimer: RESEARCH_DISCLAIMER,
  };
  const suggestFilled = research.sources.some(
    (s) => (s.id === "google_suggest" || s.id === "youtube_suggest") && s.examples.length > 0,
  );
  // Empty suggest is often a too-specific query or a transient block — do not freeze UNKNOWN for 10 minutes.
  if (suggestFilled || research.notes.length) cache.set(cacheKey, { at: Date.now(), data: research });
  return research;
}

export function researchLooksHonest(research: MarketResearch): boolean {
  const blob = JSON.stringify(research);
  return !looksFake(blob);
}

export function sourceStatusLabel(status: ResearchSourceStatus, locale: Locale): string {
  const map: Record<ResearchSourceStatus, Tri> = {
    ok: L("נמצאו דוגמאות ציבוריות", "لقينا أمثلة عامة", "Public examples found"),
    grounded: L("הערות מבוססות חיפוש", "ملاحظات مبنية على بحث", "Search-grounded notes"),
    empty: L("אין תוצאות כרגע", "ما في نتائج هلق", "No results right now"),
    blocked: L("המקור חסום", "المصدر محجوب", "Source blocked"),
    rate_limited: L("הגבלת קצב", "حدّ معدل", "Rate limited"),
    no_token: L("בלי אסימון — דף ציבורי", "بلا توكن — صفحة عامة", "No token — public page"),
    pending: L("ממתין למחקר", "بانتظار البحث", "Waiting for research"),
  };
  return map[status][locale];
}
