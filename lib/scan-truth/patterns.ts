/**
 * Generic (not brand-specific) detectors for chrome, pain, audience, and offers.
 * Product nouns are never listed. Merch/shipping/nav are structural.
 */

/** Login / account / cart / cookie / newsletter chrome. */
export const UI_CHROME_RE =
  /איפוס סיסמה|שחזור סיסמה|התחבר(?:ות)?|\bהרשם\b|הרשמה|skip to|\bcookie\b|forgot password|\blogin\b|\blog[- ]?in\b|\bcart\b|lost.?password|woocommerce-LostPassword|have an account|create (?:an )?account|already have an account|don['’]t have an account|sign[- ]?in|sign[- ]?up|my account|reset password|remember me|newsletter|subscribe(?: to)? (?:our )?newsletter|your bag(?: is empty)?|upgrade your order|empty (?:bag|cart)|minicart/i;

/** Platform shipping / unlock / add-to-cart merch — not a business offer statement. */
export const ECOMMERCE_CHROME_RE =
  /unlock\s+free(?:\s+shipping)?|free\s*shipping|משלוח(?:ים)? חינם|add to (?:cart|bag|basket)|הוספה לסל|shipping (?:banner|promo|policy)|order (?:by|within)|tracks? my order/i;

/** “Add a {anything} for the perfect / to cart” — merch upsell, not pain. */
export const MERCH_UPSELL_RE =
  /add (?:a |an |the |your )?.{0,60}(?:for the perfect|finishing touch|to (?:your )?(?:cart|bag|basket|order)|to checkout)|complete your (?:look|order|purchase)|perfect finishing touch/i;

export const SHIPPING_ONLY_RE = /משלוח(?:ים)? חינם|free shipping|unlock\s+free/i;

export const COMMERCIAL_CLAIM_RE =
  /free shipping|משלוח(?:ים)? חינם|\bsale\b|\bdiscount\b|הנחה|خصم|מבצע|חיסול|guarantee|אחריות|مضمون|coupon|קופון|كوبون|bundle|1\s*\+\s*1|\d+\s*%\s*off|50%\s*off|limited time|flash sale/i;

export const LABELED_SALE_RE = /מבצע|חיסול|הנחה|خصم|تصفية|hot\s*sale|\bpromo(?:tion)?\b|1\s*\+\s*1/;

export const PAIN_SIGNAL_RE =
  /לא בטוחים|מה לעשות|not sure|unwell|מטריד|pain|struggle|problem|בעיה|مشكلة|חום ב|child is unwell|what to do|waiting (?:hours|in line)|עומס תורים|long queues|אין מי|don't know (?:what|who)|worried|דואג|وقفتكم|طوابير|انتظار طويل|ساعات/i;

/** Labeled targeting — not “care for women” / department brochure copy. */
export const EXPLICIT_AUDIENCE_RE =
  /(?:audience|קהל יעד|target audience|الجمهور المستهدف)\s*[:：]|לכל המשפחה|משפחות מקומיות|local families|every parent|7000\s*\+?\s*parents|להורים|\bfor parents\b|קהל.?הורים|לנשים|קהל.?נשים|לגברים|קהל.?גברים|we serve|our (?:patients|customers|clients) are/i;

/** Hospital / health-system / department pages — demographics there are service lines, not business audience. */
export const HOSPITAL_OR_DEPT_RE =
  /\bhospital\b|medical center|health system|בית חולים|مستشفى|ob\s*\/?\s*gyn|obstetrics|gynecology|women'?s health/i;

/**
 * Pediatric *business* (clinic / kids’ product pain), not a hospital that mentions infants.
 */
export function isPediatricBusinessHay(hay: string, identityName = ""): boolean {
  const blob = `${identityName} ${hay}`;
  if (PARENT_ORG_RE.test(blob)) return false;
  if (HOSPITAL_OR_DEPT_RE.test(blob) && !/מרפאת ילדים|عيادة طب الأطفال|רופא ילדים|طبيب أطفال|pediatric (?:clinic|practice|health platform)/i.test(blob)) {
    return false;
  }
  return /מרפאת ילדים|عيادة طب الأطفال|רופא ילדים|طبيب أطفال|pediatric (?:clinic|practice|health platform)|ילד עם|child is unwell|when your child|חום ב[־\-]3/i.test(
    blob,
  );
}

export const INCIDENTAL_DEMOGRAPHIC_RE = /^(?:women|men|parents|נשים|גברים|הורים|أهل)$/i;

export const PARENT_ORG_RE = /parent organization|parent company|חברת אם|founding member|subsidiary of/i;

export const PEDIATRIC_CONTEXT_RE =
  /pediatric|מרפאת ילדים|عيادة طب الأطفال|רופא ילדים|طبيب أطفال|ילד עם|child is unwell|when your child|תינוק|infant|toddler|חום ב[־\-]3/i;

export const MARKETING_PROSE_LOCATION_RE =
  /enhancing |gateway into|including proposed|streetscape|urban plan|public realm|supporting pedestrians|continuous podium|\bpodium\b|street level|important gateway|proposed (?:street|improvement)|השאירו פרטים|או התקשרו|בשירות איכותי|השתלות שיניים ואסתטיקה/i;

/** Field labels that must never remain as the location value (OG/JSON-LD description blobs). */
export const LOCATION_FIELD_LABEL_RE =
  /^(?:תיאור|העסק בקצרה|כתובת|מיקום|وصف|العنوان|الموقع|عنوان|description|about|address|location|title|H[1-6]|CTA|slogan)\s*[:：]\s*/i;

export const POSTAL_ADDRESS_RE =
  /\d+(?:st|nd|rd|th)\s+(?:street|st\.?|avenue|ave\.?)\b|\d+\s+[\w.'-]+\s+(?:street|st\.?|avenue|ave\.?|road|rd\.?|blvd)\b|רחוב\s+\S+|שדרות\s+\S+|מחלף|כביש\s*\d|شارع\s+|الشارع|مجمع|الطابق|קומה/i;

const HE_STREET_RE = /(?:שדרות|רחוב)\s+[א-ת"'״][א-ת"'״\s]{0,40}?\s+\d{1,4}/;
const AR_STREET_RE = /شارع\s+\S+(?:\s+\S+){0,4}(?:\s+\d{1,4})?/;
const EN_STREET_RE =
  /\d{1,5}\s+[\w.'-]+(?:\s+[\w.'-]+)?\s+(?:street|st\.?|avenue|ave\.?|road|rd\.?|blvd|boulevard)\b/i;

/**
 * Cities we may attach when the page already names them.
 * Never includes שדרות (boulevard vs the town) — that would contaminate street lines.
 */
const IL_CITY_ALTS = [
  "חיפה",
  "תל אביב",
  "תל-אביב",
  "ירושלים",
  "נתניה",
  "באר שבע",
  "הרצליה",
  "רמת גן",
  "פתח תקווה",
  "ראשון לציון",
  "אשדוד",
  "אשקלון",
  "נהריה",
  "עכו",
  "טבריה",
  "אילת",
  "כפר סבא",
  "רעננה",
  "חדרה",
  "נצרת",
  "באקה אל-גרביה",
  "באקה אל גרבייה",
  "באקה",
  "حيفا",
  "القدس",
  "تل أبيب",
  "باقة الغربية",
  "باقة",
  "الناصرة",
  "عكا",
  "Haifa",
  "Jerusalem",
  "Tel Aviv",
  "Nazareth",
];

const IL_CITY_FIND_RE = new RegExp(`(?:^|[,،\\s]|ב|في\\s+)(${IL_CITY_ALTS.join("|")})(?:$|[,،\\s.])`);

/** City named on the page (locative / comma / standalone). Never invents. */
export function evidencedCityFromText(text: string): string {
  const hay = String(text || "").replace(/\s+/g, " ").trim();
  if (!hay) return "";
  const m = hay.match(IL_CITY_FIND_RE);
  return m?.[1] || "";
}

/** If a street fragment has no city, append one only when the same page names it. */
export function attachEvidencedCity(street: string, corpus: string): string {
  const s = String(street || "").replace(/\s+/g, " ").trim();
  if (!s) return "";
  if (evidencedCityFromText(s)) return s;
  const city = evidencedCityFromText(corpus);
  if (city && !s.includes(city)) return `${s}, ${city}`;
  return s;
}

function stripLocationFieldLabel(value: string): string {
  return value.replace(/\s+/g, " ").trim().replace(LOCATION_FIELD_LABEL_RE, "").trim();
}

function cityNearStreet(hay: string, street: string): string {
  const around = hay.replace(/\s+/g, " ");
  const idx = around.indexOf(street);
  const window = idx >= 0 ? around.slice(Math.max(0, idx - 48), idx + street.length + 56) : around;
  return evidencedCityFromText(window);
}

function streetMatches(line: string): string[] {
  const found: string[] = [];
  const push = (m: string) => {
    const v = m.replace(/\s+/g, " ").trim();
    if (v && !found.includes(v)) found.push(v);
  };
  for (const m of line.matchAll(new RegExp(HE_STREET_RE.source, "g"))) push(m[0]);
  for (const m of line.matchAll(new RegExp(AR_STREET_RE.source, "g"))) push(m[0]);
  for (const m of line.matchAll(new RegExp(EN_STREET_RE.source, "gi"))) push(m[0]);
  return found;
}

function composeStreetCity(street: string, city: string): string {
  const s = street.replace(/\s+/g, " ").trim();
  const c = city.replace(/\s+/g, " ").trim();
  if (!s) return "";
  if (c && !s.includes(c)) return `${s}, ${c}`;
  return s;
}

function locationHasMarketingPayload(value: string): boolean {
  const v = stripLocationFieldLabel(value);
  if (MARKETING_PROSE_LOCATION_RE.test(v)) return true;
  if (/(?:השאירו|התקשרו|leave details|call (?:us|now)|professional service)/i.test(v)) return true;
  // OG/description blobs: many clauses AND sales copy. Street + building + floor is not marketing.
  if (
    v.split(/[,،]/).length >= 3 &&
    v.length > 70 &&
    /השתלות שיניים|אסתטיקה דנטלית|בשירות איכותי|השאירו פרטים/.test(v)
  ) {
    return true;
  }
  return false;
}

/**
 * Pull a short postal fragment (street + city) out of prose or a labeled description.
 * Returns empty when no street-shaped evidence exists — never invents a city.
 */
export function extractPostalAddressFromText(text: string): string {
  const raw = String(text || "");
  if (!raw.trim()) return "";
  const lines = raw.split(/\r?\n/).map((l) => stripLocationFieldLabel(l.replace(/\s+/g, " ")));
  const hits: string[] = [];
  const push = (s: string) => {
    const v = s.replace(/\s+/g, " ").trim();
    if (!v || v.length < 6 || v.length > 80) return;
    if (locationHasMarketingPayload(v) && v.length > 48) return;
    if (!hits.includes(v)) hits.push(v);
  };
  for (const line of lines) {
    if (!line || line.length < 6) continue;
    if (/אימייל|email|סיסמה|password|podium|street level/i.test(line)) continue;
    if ((HE_STREET_RE.test(line) || AR_STREET_RE.test(line) || EN_STREET_RE.test(line)) && line.length <= 80 && !locationHasMarketingPayload(line)) {
      push(attachEvidencedCity(line, raw));
    }
    for (const street of streetMatches(line)) {
      push(attachEvidencedCity(composeStreetCity(street, cityNearStreet(line, street)), raw));
    }
  }
  hits.sort((a, b) => {
    const score = (s: string) =>
      (looksLikePostalAddress(s) ? 80 : 0) +
      (evidencedCityFromText(s) ? 40 : 0) +
      (/,|،/.test(s) ? 10 : 0) +
      (/\d/.test(s) ? 20 : 0) -
      s.length / 8;
    return score(b) - score(a);
  });
  return attachEvidencedCity(hits[0] || "", raw);
}

/** Strip description labels and marketing sentences; keep only a postal fragment when present. */
export function cleanLocationValue(value: string): string {
  const stripped = stripLocationFieldLabel(value);
  if (!stripped) return "";
  if (looksLikePostalAddress(stripped) && stripped.length <= 180 && !locationHasMarketingPayload(stripped)) {
    return stripped;
  }
  if (isUsableLocationValue(stripped) && stripped.length <= 180) return stripped;
  return extractPostalAddressFromText(stripped) || extractPostalAddressFromText(value);
}

export const EDITORIAL_PATH_RE = /\/(blog|news|article|press|stories|insights?|magazine)(\/|$)/i;
export const REVIEW_PATH_RE = /\/(reviews?|testimonials?)(\/|$)/i;
export const ACCOUNT_PATH_RE = /\/(cart|checkout|account|login|signin|wishlist)(\/|$)/i;

export const WIDGET_HINT_RE =
  /cookie|consent|newsletter|related[-_ ]?products|recommend|upsell|cross[-_ ]?sell|recently viewed|you may also|tracking|chat[-_ ]?widget|reviews?[-_ ]?widget/i;

export const REVIEW_TEXT_RE =
  /customer review|reviews?\s+say|★★|5\s*stars?|testimonial|עדות לקוח|شهادة زبون/i;

export const GENERIC_HYPE_RE = /best results|amazing results|#1 (?:in|rated)|must[- ]try/i;

export const THIRD_PARTY_HOST_RE =
  /google-analytics|googletagmanager|facebook\.net|doubleclick|hotjar|trustpilot|yotpo|okendo|klaviyo|shopifycloud|cdninstagram/i;

export const DEMO_GENERATED_RE =
  /sample\/demo fictional|not a real brand|\[to complete\]|\[יש להשלים\]|generated content|demo snapshot/i;

const STOP_TOKENS = new Set([
  "www",
  "com",
  "org",
  "net",
  "co",
  "il",
  "the",
  "and",
  "for",
  "example",
  "inc",
  "llc",
  "ltd",
  "page",
  "home",
  "index",
]);

export function normalizeToken(s: string): string {
  return s
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9\u0590-\u05ff\u0600-\u06ff]+/g, " ")
    .trim();
}

export function identityTokens(raw: string): string[] {
  const n = normalizeToken(raw);
  if (!n) return [];
  return n
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !STOP_TOKENS.has(t));
}

export function tokenOverlap(a: string, b: string): number {
  const A = new Set(identityTokens(a));
  const B = identityTokens(b);
  if (!A.size || !B.length) return 0;
  let n = 0;
  for (const t of B) if (A.has(t)) n += 1;
  return n;
}

export function isUiChromeText(value: string): boolean {
  const v = value.replace(/\s+/g, " ").trim();
  if (!v) return true;
  const core = v.replace(/[?؟!.]+$/g, "").trim();
  return UI_CHROME_RE.test(core) || UI_CHROME_RE.test(v);
}

export function isEcommerceChromeText(value: string): boolean {
  const v = value.replace(/\s+/g, " ").trim();
  if (!v) return false;
  return ECOMMERCE_CHROME_RE.test(v) || SHIPPING_ONLY_RE.test(v) || MERCH_UPSELL_RE.test(v);
}

export function isMerchUpsellText(value: string): boolean {
  return MERCH_UPSELL_RE.test(value.replace(/\s+/g, " ").trim());
}

export function isPainStatement(value: string): boolean {
  const v = value.replace(/\s+/g, " ").trim();
  if (!v || v.length < 8) return false;
  if (isUiChromeText(v) || isEcommerceChromeText(v) || isMerchUpsellText(v)) return false;
  if (/^(?:have an account|sign in|add to)/i.test(v)) return false;
  return PAIN_SIGNAL_RE.test(v);
}

export function isExplicitAudienceStatement(value: string): boolean {
  const v = value.replace(/\s+/g, " ").trim();
  if (!v) return false;
  if (PARENT_ORG_RE.test(v) && !PEDIATRIC_CONTEXT_RE.test(v)) return false;
  return EXPLICIT_AUDIENCE_RE.test(v);
}

export function isBareDemographic(value: string): boolean {
  return INCIDENTAL_DEMOGRAPHIC_RE.test(value.replace(/\s+/g, " ").trim());
}

export function isUnknownSentinel(value: string): boolean {
  return /^(unknown|לא מכירים|unknown problem|\[יש להשלים\]|\[يجب الاستكمال\]|\[to complete\])$/i.test(
    value.replace(/\s+/g, " ").trim(),
  );
}

export function looksLikePostalAddress(value: string): boolean {
  const v = stripLocationFieldLabel(value);
  if (!v || v.length > 180) return false;
  if (LOCATION_FIELD_LABEL_RE.test(value.replace(/\s+/g, " ").trim())) return false;
  if (locationHasMarketingPayload(v)) return false;
  if (MARKETING_PROSE_LOCATION_RE.test(v)) return false;
  if (POSTAL_ADDRESS_RE.test(v)) return v.length <= 120 || (v.length <= 180 && !locationHasMarketingPayload(v));
  if (/\d{5}(?:-\d{4})?/.test(v) && v.length <= 80) return true;
  return v.length <= 80 && /\d/.test(v) && /street|st\b|avenue|רחוב|שדרות|מחלף|כביש|شارع/i.test(v);
}

export function isUsableLocationValue(value: string): boolean {
  const raw = value.replace(/\s+/g, " ").trim();
  if (!raw || raw.length < 3) return false;
  if (LOCATION_FIELD_LABEL_RE.test(raw)) return false;
  const v = stripLocationFieldLabel(raw);
  if (MARKETING_PROSE_LOCATION_RE.test(v) || locationHasMarketingPayload(v)) return false;
  if (/\b(?:including|proposed|supporting|enhancing|gateway into)\b/i.test(v)) return false;
  if (v.length > 180) return false;
  const longBits = v.split(/[.!?]+/).filter((s) => s.trim().length > 25);
  if (longBits.length >= 2 && locationHasMarketingPayload(v)) return false;
  if (looksLikePostalAddress(v)) return true;
  return v.length <= 80 && !locationHasMarketingPayload(v);
}

export function isContactFact(value: string): boolean {
  const v = value.replace(/\s+/g, " ").trim();
  if (/tel:|wa\.me|whatsapp|\b0\d[\d\s-]{7,}/i.test(v)) return true;
  if (looksLikePostalAddress(v)) return true;
  if (/שעות|ساعات|opening hours|\d{1,2}\s*[:.]\s*\d{2}/i.test(v) && v.length <= 400) return true;
  return false;
}

export function splitSentences(text: string): string[] {
  return String(text || "")
    .split(/(?<=[.!?؟])\s+|\n+/)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.length >= 3);
}
