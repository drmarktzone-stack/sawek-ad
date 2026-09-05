import type { Intake, Locale, PastCampaignAudit, PastCreative, SiteAuditItem } from "../types";
import { inventsForbidden } from "./coach";
import { emptyIntake } from "./validate";
import { completeGemini } from "./gemini-generate";

const L = (he: string, ar: string, en: string): Record<Locale, string> => ({ he, ar, en });

const COMPLETE = L("[יש להשלים]", "[يجب الاستكمال]", "[to complete]");

function ev(field: string, value: string): Record<Locale, string> {
  const shown = value.trim() || "—";
  return L(`ראיה · ${field}: ${shown}`, `دليل · ${field}: ${shown}`, `Evidence · ${field}: ${shown}`);
}

function item(id: string, kind: "strength" | "weakness", label: Record<Locale, string>, evidence: Record<Locale, string>): SiteAuditItem {
  return { id, kind, label, evidence };
}

export interface PostLike {
  headline?: string;
  body?: string;
  text?: string;
  cta?: string;
}

function postBlob(p: PostLike): string {
  return [p.headline, p.body, p.text, p.cta].filter(Boolean).join("\n").replace(/\s+/g, " ").trim();
}

function allText(posts: PostLike[]): string {
  return posts.map(postBlob).filter(Boolean).join("\n");
}

const CTA_RE =
  /whatsapp|וואטסאפ|واتساب|wa\.me|צור קשר|اتصل|call now|התקשרו|הזמנ|احجز|order now|קנו|اشتري|כתבו לנו|שלחו הודעה|dm us|inbox/i;
const OFFER_RE = /מבצע|הנחה|خصم|1\s*\+\s*1|חינם|مجانا|sale|coupon|קופון/i;
const FOLLOW_RE = /follow us|עקבו אחרינו|تابعونا|like our page|like us|שתפו|share this/i;
const ADDRESS_RE = /רחוב|שדרות|כתובת|באקה|חיפה|תל אביב|ירושלים|شارع|عنوان|street|avenue|מחלף/i;
const HE = /[\u0590-\u05FF]/;
const AR = /[\u0600-\u06FF]/;

const AUDIENCE_HINTS: { id: string; re: RegExp; he: string; ar: string; en: string }[] = [
  { id: "parents", re: /הורים|אמא|אבא|ילדים|תינוק|הילד|parents|moms?|dads?|kids|toddler|أطفال|أهل|أم|أب/i, he: "הורים", ar: "أهالي", en: "parents" },
  { id: "brides", re: /כלה|כלות|חתונה|bridal|bride|wedding|عروس|عرائس|زفاف/i, he: "כלות", ar: "عرائس", en: "brides" },
  { id: "students", re: /סטודנט|students?|طلاب|جامعة/i, he: "סטודנטים", ar: "طلاب", en: "students" },
  { id: "families", re: /משפח|families|عائل/i, he: "משפחות", ar: "عائلات", en: "families" },
  { id: "locals", re: /תושבי|בשכונה|באזור|neighbors|locals|سكان|حيّ/i, he: "תושבים מקומיים", ar: "سكان محليين", en: "local residents" },
];

function joinLocale(parts: { he: string; ar: string; en: string }[]): Record<Locale, string> {
  return L(parts.map((p) => p.he).join(" · "), parts.map((p) => p.ar).join(" · "), parts.map((p) => p.en).join(" · "));
}

export function buildPastCampaignAuditFromPosts(
  posts: PostLike[],
  ctx: { location?: string; description?: string } = {},
): PastCampaignAudit | undefined {
  const real = posts.map((p) => ({ ...p, text: postBlob(p) })).filter((p) => p.text.length >= 8);
  if (!real.length) return undefined;
  const blob = allText(real);
  const loc = String(ctx.location || "").trim();
  const strengths: SiteAuditItem[] = [];
  const weaknesses: SiteAuditItem[] = [];
  const failedWhere: SiteAuditItem[] = [];

  const hasCta = real.some((p) => CTA_RE.test(p.text));
  const hasOffer = real.some((p) => OFFER_RE.test(p.text));
  const hasAddr = real.some((p) => ADDRESS_RE.test(p.text) || (loc && p.text.includes(loc.split(",")[0].trim())));
  const hasWa = /whatsapp|וואטסאפ|واتساب|wa\.me|0\d[\d\-]{7,}/i.test(blob);
  const genericFollow = real.filter((p) => FOLLOW_RE.test(p.text) && !CTA_RE.test(p.text) && !OFFER_RE.test(p.text));
  const onlyEn = !HE.test(blob) && !AR.test(blob);
  const hasHe = HE.test(blob);
  const hasAr = AR.test(blob);

  if (hasAddr) {
    strengths.push(
      item("past-local", "strength", L("כתובת מקומית בתוך הפוסטים", "عنوان محلي داخل المنشورات", "Local address in the post copy"), ev("posts", loc || blob.slice(0, 80))),
    );
  }
  if (hasWa) {
    strengths.push(
      item("past-wa", "strength", L("יש CTA לוואטסאפ / טלפון בפוסט", "في نداء لواتساب / هاتف بالمنشور", "A WhatsApp / phone CTA appears in a post"), ev("posts", blob.match(/0\d[\d\-]{7,}|whatsapp|וואטסאפ|واتساب/i)?.[0] || "whatsapp")),
    );
  }
  if (hasOffer) {
    const hit = real.find((p) => OFFER_RE.test(p.text));
    strengths.push(
      item("past-offer", "strength", L("יש הצעה ספציפית שכתובה בפוסט", "في عرض محدد مكتوب بالمنشور", "A specific offer is written in a post"), ev("post", (hit?.text || "").slice(0, 120))),
    );
  }
  if (hasHe || hasAr) {
    strengths.push(
      item(
        "past-lang",
        "strength",
        L(
          hasHe && hasAr ? "הפוסטים בעברית וערבית" : hasHe ? "הפוסטים בעברית" : "הפוסטים בערבית",
          hasHe && hasAr ? "المنشورات بالعبرية والعربية" : hasAr ? "المنشورات بالعربية" : "المنشورات بالعبرية",
          hasHe && hasAr ? "Posts in Hebrew and Arabic" : hasHe ? "Posts in Hebrew" : "Posts in Arabic",
        ),
        ev("language", hasHe && hasAr ? "he+ar" : hasHe ? "he" : "ar"),
      ),
    );
  }

  if (genericFollow.length) {
    weaknesses.push(
      item("past-follow", "weakness", L("פוסטים כלליים מסוג «עקבו אחרינו» בלי הצעה", "منشورات عامة «تابعونا» بلا عرض", "Generic “follow us” posts with no offer"), ev("post", genericFollow[0].text.slice(0, 120))),
    );
  }
  if (!hasOffer) {
    weaknesses.push(
      item("past-no-offer", "weakness", L("אין מבצע כתוב בפוסטים — לא נמציא הנחה", "ما في عرض مكتوب بالمنشورات — مش رح نخترع خصم", "No offer written in the posts — we will not invent a discount"), ev("posts", "—")),
    );
  }
  if (!hasAddr && !loc) {
    weaknesses.push(
      item("past-no-loc", "weakness", L("אין מיקום בפוסטים", "ما في موقع بالمنشورات", "No location in the posts"), ev("location", loc || "—")),
    );
  }
  if (onlyEn) {
    weaknesses.push(
      item("past-en-only", "weakness", L("הפוסטים באנגלית בלבד", "المنشورات بالإنجليزي بس", "Posts are English-only"), ev("language", "en")),
    );
  }
  if (!hasCta) {
    weaknesses.push(
      item("past-no-cta", "weakness", L("אין קריאה לפעולה בפוסטים", "ما في نداء بالفعل بالمنشورات", "No call to action in the posts"), ev("cta", "—")),
    );
  }

  const audienceHits = AUDIENCE_HINTS.filter((h) => h.re.test(blob));
  if (!audienceHits.length) {
    weaknesses.push(
      item("past-no-aud", "weakness", L("אין קהל מפורש בטקסט הפוסטים", "ما في جمهور صريح بنص المنشورات", "No explicit audience in the post text"), ev("audience", "—")),
    );
  }

  if (!hasCta) {
    failedWhere.push(
      item("fail-cta", "weakness", L("הפוסטים בלי CTA — נראים כמו סטטוס, לא מודעה", "المنشورات بلا نداء — شكلها ستاتوس مش إعلان", "Posts have no CTA — they read like a status, not an ad"), ev("cta", "—")),
    );
  }
  if (!hasOffer) {
    failedWhere.push(
      item("fail-offer", "weakness", L("אין הצעה בקידומים הישנים", "ما في عرض بالترويجات القديمة", "Old promos have no offer"), ev("offer", "—")),
    );
  }
  const personal = real.filter((p) => /\bI\b|אני |أنا /.test(p.text) && !CTA_RE.test(p.text) && !OFFER_RE.test(p.text));
  if (personal.length) {
    failedWhere.push(
      item("fail-status", "weakness", L("חלק מהפוסטים נשמעים אישיים, לא פרסומת", "جزء من المنشورات شخصي، مش إعلان", "Some posts read personal, not like ads"), ev("post", personal[0].text.slice(0, 120))),
    );
  }
  if (genericFollow.length) {
    failedWhere.push(
      item("fail-follow", "weakness", L("«עקבו אחרינו» בלי סיבה לקנות / ליצור קשר", "«تابعونا» بلا سبب للشراء / التواصل", "“Follow us” with no reason to buy or contact"), ev("post", genericFollow[0].text.slice(0, 120))),
    );
  }

  const inferredAudience = audienceHits.length ? joinLocale(audienceHits) : COMPLETE;
  let recommendedAudience = inferredAudience;
  if (audienceHits.length && loc) {
    recommendedAudience = L(
      `${audienceHits.map((h) => h.he).join(" · ")} · ${loc}`,
      `${audienceHits.map((h) => h.ar).join(" · ")} · ${loc}`,
      `${audienceHits.map((h) => h.en).join(" · ")} · ${loc}`,
    );
  } else if (!audienceHits.length && loc) {
    recommendedAudience = L(`קהל מקומי באזור ${loc}`, `جمهور محلي بمنطقة ${loc}`, `Local audience around ${loc}`);
  }

  return {
    strengths: strengths.slice(0, 8),
    weaknesses: weaknesses.slice(0, 8),
    inferredAudience,
    recommendedAudience,
    failedWhere: failedWhere.slice(0, 6),
    source: "heuristic",
  };
}

export function buildPastCampaignAudit(intake: Intake): PastCampaignAudit | undefined {
  const posts = (intake.pastCreatives ?? []).filter((p) => p.confirmedReal && (p.headline || p.body));
  return buildPastCampaignAuditFromPosts(posts, {
    location: intake.location,
    description: intake.description,
  });
}

function sourceFacts(posts: PostLike[], ctx: { location?: string; description?: string }): string {
  return [ctx.location || "", ctx.description || "", allText(posts)].filter(Boolean).join("\n");
}

function inventedAuditCopy(text: string, source: string): boolean {
  const intake = emptyIntake();
  intake.description = source;
  intake.pastAds = source;
  intake.location = source;
  if (inventsForbidden(text, intake)) return true;
  if (/\bROAS\b|\bCTR\b|\bCPC\b|\bCPM\b|\breach\b|\bimpressions\b/i.test(text) && !/\bROAS\b|\bCTR\b|\bCPC\b|\bCPM\b|\breach\b|\bimpressions\b/i.test(source)) {
    return true;
  }
  if (/\b\d{2}\s*[-–]\s*\d{2}\b/.test(text) && !/\b\d{2}\s*[-–]\s*\d{2}\b/.test(source)) return true;
  if (/\d[\d,.]*\s*(?:followers|likes|עוקבים|إعجاب)/i.test(text) && !/\d[\d,.]*\s*(?:followers|likes|עוקבים|إعجاب)/i.test(source)) {
    return true;
  }
  return false;
}

function asTri(v: unknown, fallback: Record<Locale, string>): Record<Locale, string> {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    const o = v as Record<string, unknown>;
    const he = typeof o.he === "string" ? o.he.trim() : "";
    const ar = typeof o.ar === "string" ? o.ar.trim() : "";
    const en = typeof o.en === "string" ? o.en.trim() : "";
    if (he || ar || en) return L(he || fallback.he, ar || fallback.ar, en || fallback.en);
  }
  if (typeof v === "string" && v.trim()) return L(v.trim(), v.trim(), v.trim());
  return fallback;
}

function asItems(v: unknown, kind: "strength" | "weakness", fallback: SiteAuditItem[]): SiteAuditItem[] {
  if (!Array.isArray(v) || !v.length) return fallback;
  const out: SiteAuditItem[] = [];
  for (let i = 0; i < v.length && out.length < 8; i++) {
    const row = v[i];
    if (typeof row === "string" && row.trim()) {
      out.push(item(`g-${kind}-${i}`, kind, L(row.trim(), row.trim(), row.trim()), ev("gemini", row.trim().slice(0, 160))));
      continue;
    }
    if (row && typeof row === "object") {
      const o = row as Record<string, unknown>;
      const label = asTri(o.label ?? o, L("", "", ""));
      if (!label.he && !label.ar && !label.en) continue;
      const evidence = asTri(o.evidence, ev("posts", String(o.evidence || "").slice(0, 160)));
      out.push(item(typeof o.id === "string" ? o.id : `g-${kind}-${i}`, kind, label, evidence));
    }
  }
  return out.length ? out : fallback;
}

function parseLooseJson(text: string): Record<string, unknown> | null {
  const stripped = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try {
    const parsed: unknown = JSON.parse(stripped);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
  } catch {
    /* fall through */
  }
  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      const parsed: unknown = JSON.parse(match[0]);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  return null;
}

const AUDIT_SHAPE = `{
  "strengths":[{"he":"","ar":"","en":""}],
  "weaknesses":[{"he":"","ar":"","en":""}],
  "inferredAudience":{"he":"","ar":"","en":""},
  "recommendedAudience":{"he":"","ar":"","en":""},
  "failedWhere":[{"he":"","ar":"","en":""}]
}`;

export async function overlayPastCampaignAudit(
  heuristic: PastCampaignAudit,
  posts: PostLike[],
  ctx: { location?: string; description?: string } = {},
): Promise<PastCampaignAudit> {
  const source = sourceFacts(posts, ctx);
  if (!source.trim()) return heuristic;
  try {
    const prompt = `Post texts (evidence only):\n${source.slice(0, 3500)}\n\nLocation if extracted: ${ctx.location || "(none)"}\n\nAudit like an agency: what was strong, what failed, who the posts actually speak to, who the NEXT campaign must target — argued from these posts only.\nReply JSON:\n${AUDIT_SHAPE}`;
    const completed = await completeGemini({
      parts: [{ text: prompt }],
      temperature: 0.2,
      timeoutMs: 12_000,
      tier: "pro",
      systemInstruction:
        "You are a senior performance-marketing auditor. Use ONLY the provided post texts. Never invent prices, likes, reach, ROAS, follower counts, reviews, or age/gender demographics (no 'women 25-34') unless those exact words appear in the posts. Missing audience → [יש להשלים] / [يجب الاستكمال] / [to complete]. Reply JSON only.",
    });
    if (!completed.ok) return heuristic;
    const text = completed.text;
    const obj = parseLooseJson(text);
    if (!obj) return heuristic;
    const joined = JSON.stringify(obj);
    if (inventedAuditCopy(joined, source)) return heuristic;
    return {
      strengths: asItems(obj.strengths, "strength", heuristic.strengths),
      weaknesses: asItems(obj.weaknesses, "weakness", heuristic.weaknesses),
      inferredAudience: asTri(obj.inferredAudience, heuristic.inferredAudience),
      recommendedAudience: asTri(obj.recommendedAudience, heuristic.recommendedAudience),
      failedWhere: asItems(obj.failedWhere, "weakness", heuristic.failedWhere),
      source: "gemini",
    };
  } catch {
    return heuristic;
  }
}

export function creativesToPosts(list: PastCreative[] | undefined): PostLike[] {
  return (list ?? []).map((p) => ({ headline: p.headline, body: p.body, cta: p.cta, text: [p.headline, p.body, p.cta].filter(Boolean).join("\n") }));
}
