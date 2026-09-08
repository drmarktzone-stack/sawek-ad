/**
 * Shared customer-copy quality gate.
 *
 * Strategy / CMO / diagnosis labels stay INTERNAL.
 * Anything shown or saved as an ad, channel post, complete-ad, HSO hook,
 * or social caption must pass this gate.
 *
 * Pipeline: Business Truth → locale/dialect → (internal strategy) → draft
 * → HARD GATE → honest fallback if the draft still leaks.
 */
import type { Intake, Locale } from "./types";
import { isNoOffer } from "./no-offer";
import { ADVANTAGE_CHIPS, AUDIENCE_CHIPS, GOAL_CHIPS, OFFER_CHIPS, PROBLEM_CHIPS, resolveChipLabel } from "./chips";
import { arabicRegisterBleed, effectiveDialect } from "./engine/voice";

export const HE_SCRIPT = /[\u0590-\u05FF]/;
export const AR_SCRIPT = /[\u0600-\u06FF]/;

/** Phrases that are strategist instructions or framework labels — never ads. */
export const COPY_LEAK_PHRASES = [
  "مرآة المشكلة",
  "المشكلة المعطاة",
  "بكلام الزبون",
  "مش إعلان عام",
  "إعلان عام",
  "فقط القنوات",
  "القنوات المعطاة",
  "بلا تيك توك مختلق",
  "تيك توك مختلق",
  "الفنجان كافتتاح",
  "في عرض؟ نقود فيه",
  "صدق بدل كوبون",
  "بلا عرض مختلق",
  "منقود بالساعات",
  "بلا سعر ما انعطى",
  "منقود بحقائق",
  "بلا خصم مختلق",
  "ما منخترع",
  "لن نخترع",
  "ما اختلقنا",
  "بلا كوبون أقساط",
  "عرض أو صدق",
  "عمود حقائق",
  "الفجوة كملخص",
  "المكان كبطل",
  "הבעיה שסופקה",
  "במילים של הלקוח",
  "בלי טיקטוק מדומה",
  "יושרה במקום קופון",
  "רק הערוצים שסופקו",
  "מראת בעיה",
  "הצעה או יושרה",
  "stated problem",
  "in the customer's words",
  "in the customer’s words",
  "no invented tiktok",
  "only channels you named",
  "have an offer? lead with it",
  "integrity over coupons",
  "diagnosis.",
  "cup as open",
  "problem mirror",
  "offer or integrity",
  "fact-first spine",
] as const;

const LEAK_RE: RegExp[] = [
  /diagnosis\.\w+/i,
  /\bUNKNOWN\b/,
  /فقط القنوات.{0,40}تيك توك/,
  /في عرض\؟.{0,40}كوبون/,
  /المرأة المشكلة|مرآة المشكلة/,
  /do not invent/i,
  /don't invent/i,
  /never invent/i,
  /anti-hallucin/i,
  /framework|prompt leak/i,
];

export type CopyFacts = {
  name?: string;
  location?: string;
  phone?: string;
  website?: string;
};

export type GatedAd = {
  headline: string;
  body: string;
  cta: string;
  ok: boolean;
  repaired: boolean;
  hits: string[];
};

export function customerCopyLeakHits(text: string): string[] {
  const src = String(text ?? "");
  if (!src.trim()) return [];
  const hits: string[] = [];
  const lower = src.toLowerCase();
  for (const p of COPY_LEAK_PHRASES) {
    if (p.length >= 3 && (src.includes(p) || lower.includes(p.toLowerCase()))) hits.push(p);
  }
  for (const re of LEAK_RE) {
    if (re.test(src)) hits.push(re.source);
  }
  return [...new Set(hits)];
}

export function customerCopyHasLeak(text: string): boolean {
  return customerCopyLeakHits(text).length > 0;
}

/** Strategy-label line: short internal name, not a marketing sentence. */
export function isStrategyLabelLine(line: string): boolean {
  const s = line.replace(/\s+/g, " ").trim();
  if (!s) return true;
  if (customerCopyHasLeak(s)) return true;
  if (/^diagnosis\./i.test(s)) return true;
  if (/^[a-z][a-z0-9_.]{1,24}$/.test(s)) return true;
  if (s.length <= 28 && /كافتتاح|كبطل|كمنصة|كعنوان|כגיבור|כפתיח|ככתובת|as hero|as open|as brief/i.test(s)) {
    return true;
  }
  return false;
}

export function localeScriptBleed(text: string, locale: Locale): boolean {
  const s = String(text ?? "");
  if (!s.trim()) return false;
  if (locale === "ar") return HE_SCRIPT.test(s);
  if (locale === "he") return AR_SCRIPT.test(s);
  if (locale === "en") {
    const letters = s.replace(/[^\p{L}]/gu, "");
    if (!letters) return false;
    const foreign = (s.match(/[\u0590-\u05FF\u0600-\u06FF]/g) || []).length;
    return foreign >= 8;
  }
  return false;
}

function normFact(s: string): string {
  return s.replace(/\s+/g, " ").trim().toLowerCase();
}

export function factSpamHits(text: string, facts: CopyFacts): string[] {
  const src = String(text ?? "");
  const hits: string[] = [];
  const check = (raw: string | undefined, label: string) => {
    const f = (raw ?? "").trim();
    if (f.length < 6) return;
    const n = normFact(f);
    let count = 0;
    const hay = normFact(src);
    let from = 0;
    while (n && hay.indexOf(n, from) !== -1) {
      count += 1;
      from = hay.indexOf(n, from) + n.length;
    }
    if (count > 1) hits.push(label);
  };
  check(facts.location, "location");
  check(facts.phone, "phone");
  check(facts.website, "website");
  return hits;
}

export function dedupeCustomerFacts(text: string, facts: CopyFacts): string {
  const lines = String(text ?? "")
    .split(/\n+/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const seenFact = new Set<string>();
  const out: string[] = [];
  const tokens = [facts.location, facts.phone, facts.website]
    .map((x) => (x ?? "").trim())
    .filter((x) => x.length >= 6);

  for (const line of lines) {
    if (isStrategyLabelLine(line)) continue;
    let next = line;
    let skip = false;
    for (const tok of tokens) {
      const key = normFact(tok);
      if (!key || !normFact(next).includes(key)) continue;
      if (seenFact.has(key)) {
        next = next.split(tok).join(" ").replace(/\s+/g, " ").replace(/[—–·,،|]+\s*$/u, "").trim();
        next = next.replace(/^(واتساب|وואטסאפ|whatsapp)\s*[.:]?\s*$/i, "").trim();
        if (!next || next.length < 4) skip = true;
      } else {
        seenFact.add(key);
      }
    }
    if (!skip && next) out.push(next);
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function stripCustomerLeaks(text: string): string {
  let s = String(text ?? "");
  for (const p of COPY_LEAK_PHRASES) {
    if (!p) continue;
    s = s.split(p).join(" ");
  }
  s = s.replace(/diagnosis\.\w+/gi, " ");
  s = s.replace(/\bUNKNOWN\b/g, " ");
  return s.replace(/\s{2,}/g, " ").replace(/[—–·,،|]+\s*$/u, "").trim();
}

export function stripForeignScript(text: string, locale: Locale): string {
  let s = String(text ?? "");
  if (locale === "ar") s = s.replace(/[\u0590-\u05FF]+/g, " ");
  else if (locale === "he") s = s.replace(/[\u0600-\u06FF]+/g, " ");
  else if (locale === "en") {
    s = s.replace(/[\u0590-\u05FF]+/g, " ").replace(/[\u0600-\u06FF]+/g, " ");
  }
  return s.replace(/\s{2,}/g, " ").trim();
}

export function purifyCustomerText(text: string, locale: Locale, facts: CopyFacts = {}): string {
  const dropped = String(text ?? "")
    .split(/\n+/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l && !isStrategyLabelLine(l))
    .join("\n");
  const stripped = stripForeignScript(stripCustomerLeaks(dropped), locale);
  return dedupeCustomerFacts(stripped, facts);
}

export function copyFactsFromIntake(intake: Intake): CopyFacts {
  const phone = String(intake.whatsapp ?? "")
    .split(/\s*[·|,;]\s*/)
    .map((s) => s.trim())
    .find((s) => /\d{7,}/.test(s));
  return {
    name: intake.businessName.trim(),
    location: intake.location.trim(),
    phone: phone || intake.whatsapp.trim(),
    website: intake.website.trim(),
  };
}

const BAKERY_RE = /bakery|מאפיי|מאפה|مخبز|معجنات|לחם|خبز|bread/i;

export function intakeLooksBakery(intake: Pick<Intake, "businessName" | "category" | "description">): boolean {
  return BAKERY_RE.test(`${intake.businessName} ${intake.category} ${intake.description}`);
}

function fallbackHeadline(intake: Intake, locale: Locale): string {
  const name = intake.businessName.trim();
  const bakery = intakeLooksBakery(intake);
  if (locale === "ar") {
    if (bakery) return name ? `${name} — خبز طازج هاليوم` : "خبز طازج هاليوم";
    return name || "المحل قريب منكم";
  }
  if (locale === "he") {
    if (bakery) return name ? `${name} — לחם חם מהתנור` : "לחם חם מהתנור";
    return name || "העסק לידכם";
  }
  if (bakery) return name ? `${name} — fresh bread today` : "Fresh bread today";
  return name || "Visit us";
}

function fallbackBenefit(intake: Intake, locale: Locale): string {
  const adv = (intake.uniqueAdvantage || "").trim();
  if (adv && !/^(unknown|custom|no_offer)$/i.test(adv) && !customerCopyHasLeak(adv)) {
    return adv.length > 80 ? `${adv.slice(0, 78).trim()}…` : adv;
  }
  const bakery = intakeLooksBakery(intake);
  if (locale === "ar") {
    return bakery ? "خبز طازج من الفرن — تعوا خدوا هاليوم." : "خدمة واضحة من المحل — تعوا أو احكوا معنا.";
  }
  if (locale === "he") {
    return bakery ? "לחם חם מהתנור — בואו לקחת היום." : "שירות ברור מהעסק — בואו או כתבו.";
  }
  return bakery ? "Fresh bread from the oven — come take some today." : "Clear service from the shop — visit or write.";
}

function fallbackCta(intake: Intake, locale: Locale): string {
  if (intake.website.trim()) {
    return locale === "ar" ? "للموقع" : locale === "he" ? "לאתר" : "Visit the site";
  }
  if (intake.whatsapp.trim()) {
    return locale === "ar" ? "واتساب" : locale === "he" ? "וואטסאפ" : "WhatsApp";
  }
  return locale === "ar" ? "تعوا زورونا" : locale === "he" ? "בואו לבקר" : "Visit us";
}

/** Honest short factual ad — name + one benefit + facts once + CTA. Never invents an offer. */
export function honestFallbackAd(intake: Intake, locale: Locale): { headline: string; body: string; cta: string } {
  const facts = copyFactsFromIntake(intake);
  const headline = fallbackHeadline(intake, locale);
  const benefit = fallbackBenefit(intake, locale);
  const place = facts.location || "";
  const phone = facts.phone ? (locale === "ar" ? `واتساب ${facts.phone}` : locale === "he" ? `וואטסאפ ${facts.phone}` : `WhatsApp ${facts.phone}`) : "";
  const site = facts.website || "";
  const offer =
    !isNoOffer(intake.offer) && intake.offer.trim()
      ? resolveChipLabel(intake.offer, OFFER_CHIPS, locale) || intake.offer.trim()
      : "";
  const body = [benefit, place, phone, site, offer].filter(Boolean).join("\n");
  return { headline, body, cta: fallbackCta(intake, locale) };
}

function stripMatchingCta(body: string, cta: string): string {
  const c = cta.trim();
  if (!c || c.length < 2) return body;
  const lines = body.split("\n").map((l) => l.trim());
  const filtered = lines.filter((l) => l && l !== c && l !== `CTA: ${c}`);
  let joined = filtered.join("\n").trim();
  if (joined.endsWith(c)) joined = joined.slice(0, -c.length).trim();
  return joined;
}

/**
 * HARD OUTPUT GATE. Failed drafts are replaced with an honest factual ad.
 * Never returns leaked meta text.
 */
export function gateCustomerAd(
  ad: { headline?: string; body?: string; cta?: string },
  intake: Intake,
  locale: Locale,
): GatedAd {
  const facts = copyFactsFromIntake(intake);
  const fallback = honestFallbackAd(intake, locale);
  let headline = purifyCustomerText(ad.headline ?? "", locale, facts);
  let body = purifyCustomerText(ad.body ?? "", locale, facts);
  let cta = purifyCustomerText(ad.cta ?? "", locale, facts);
  body = stripMatchingCta(body, cta);

  const blob = `${headline}\n${body}\n${cta}`;
  const hits = customerCopyLeakHits(blob);
  const bleed = localeScriptBleed(blob, locale);
  const dialect = effectiveDialect(intake, locale);
  const register = locale === "ar" && arabicRegisterBleed(blob, dialect, locale);
  const spam = factSpamHits(body, facts);
  const empty = !headline.trim() || headline.length < 3;

  if (hits.length || bleed || register || empty || customerCopyHasLeak(headline) || customerCopyHasLeak(cta)) {
    return {
      headline: fallback.headline,
      body: fallback.body,
      cta: cta && !customerCopyHasLeak(cta) && !localeScriptBleed(cta, locale) ? cta : fallback.cta,
      ok: false,
      repaired: true,
      hits: [...hits, ...(bleed ? ["locale-bleed"] : []), ...(register ? ["arabic-register"] : []), ...(empty ? ["empty-headline"] : [])],
    };
  }

  if (spam.length) {
    body = dedupeCustomerFacts(body, facts);
  }
  if (!body.trim()) body = fallback.body;
  if (!cta.trim()) cta = fallback.cta;

  return { headline, body, cta, ok: hits.length === 0 && !bleed, repaired: Boolean(spam.length), hits: spam };
}

export function isCustomerCopyPublishable(text: string, locale: Locale, intake?: Intake): boolean {
  if (!String(text ?? "").trim()) return false;
  if (customerCopyHasLeak(text)) return false;
  if (localeScriptBleed(text, locale)) return false;
  if (locale === "ar" && arabicRegisterBleed(text, effectiveDialect(intake, locale), locale)) return false;
  return true;
}

const TOPIC_LABEL: Record<string, Record<Locale, string>> = {
  identity: { he: "זהות", ar: "الهوية", en: "Identity" },
  location: { he: "מיקום", ar: "الموقع", en: "Location" },
  offer: { he: "הצעה", ar: "العرض", en: "Offer" },
  problem: { he: "בעיה", ar: "المشكلة", en: "Problem" },
  pain: { he: "כאב", ar: "الألم", en: "Pain" },
  advantage: { he: "יתרון", ar: "الميزة", en: "Advantage" },
  audience: { he: "קהל", ar: "الجمهور", en: "Audience" },
  category: { he: "קטגוריה", ar: "التصنيف", en: "Category" },
  voice: { he: "קול", ar: "الصوت", en: "Voice" },
  aov: { he: "ערך הזמנה", ar: "قيمة الطلب", en: "Order value" },
  target_cac: { he: "CAC יעד", ar: "CAC المستهدف", en: "Target CAC" },
  budget: { he: "תקציב", ar: "الميزانية", en: "Budget" },
  experiment: { he: "ניסוי", ar: "تجربة", en: "Experiment" },
  segment: { he: "קהל", ar: "الجمهور", en: "Audience" },
  desire: { he: "מטרה", ar: "الهدف", en: "Goal" },
};

const AREA_LABEL: Record<string, Record<Locale, string>> = {
  offer: { he: "הצעה", ar: "العرض", en: "Offer" },
  creative: { he: "קריאייטיב", ar: "الإبداع", en: "Creative" },
  hook: { he: "הוק", ar: "الخطاف", en: "Hook" },
  targeting: { he: "טירגוט", ar: "الاستهداف", en: "Targeting" },
  funnel: { he: "משפך", ar: "القمع", en: "Funnel" },
  price: { he: "מחיר", ar: "السعر", en: "Price" },
  audience: { he: "קהל", ar: "الجمهور", en: "Audience" },
};

export function localizeTopicKey(topic: string, locale: Locale): string {
  const raw = String(topic ?? "").trim();
  if (!raw) return raw;
  if (TOPIC_LABEL[raw]) return TOPIC_LABEL[raw][locale];
  if (raw.startsWith("diagnosis.")) {
    const area = raw.slice("diagnosis.".length);
    const areaL = AREA_LABEL[area]?.[locale] || area;
    const head = locale === "ar" ? "تشخيص" : locale === "he" ? "אבחון" : "Diagnosis";
    return `${head} · ${areaL}`;
  }
  return raw;
}

const VALUE_MAP: Array<{ re: RegExp; he: string; ar: string; en: string }> = [
  { re: /^(no_offer|אין מבצע|لا يوجد عرض|ما في عرض|no offer)$/i, he: "אין מבצע", ar: "ما في عرض", en: "No offer" },
  { re: /^(unknown|לא ידוע|غير معروف)$/i, he: "לא ידוע", ar: "مش معروف", en: "Unknown" },
  { re: /^(custom)$/i, he: "מותאם", ar: "مخصّص", en: "Custom" },
];

export function localizeIntakeValue(value: string, locale: Locale): string {
  const v = String(value ?? "").trim();
  if (!v) return "";
  for (const row of VALUE_MAP) {
    if (row.re.test(v)) return locale === "he" ? row.he : locale === "ar" ? row.ar : row.en;
  }
  if (v === "unknown" || v.startsWith("unknown,")) {
    return resolveChipLabel(v, PROBLEM_CHIPS, locale) || (locale === "ar" ? "مش معروف" : locale === "he" ? "לא ידוע" : "Unknown");
  }
  if (v === "no_offer" || v.includes("no_offer")) {
    return resolveChipLabel(v, OFFER_CHIPS, locale) || (locale === "ar" ? "ما في عرض" : locale === "he" ? "אין מבצע" : "No offer");
  }
  for (const chips of [GOAL_CHIPS, AUDIENCE_CHIPS, ADVANTAGE_CHIPS, PROBLEM_CHIPS, OFFER_CHIPS]) {
    const label = resolveChipLabel(v, chips, locale);
    if (label && label !== v) return label;
  }
  return v;
}

export function preferredTri(tri: Record<Locale, string> | undefined, locale: Locale): string {
  if (!tri) return "";
  const hit = String(tri[locale] || "").trim();
  if (hit) return hit;
  return "";
}
