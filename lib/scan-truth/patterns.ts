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
  /enhancing |gateway into|including proposed|streetscape|urban plan|public realm|supporting pedestrians|continuous podium|\bpodium\b|street level|important gateway|proposed (?:street|improvement)/i;

export const POSTAL_ADDRESS_RE =
  /\d+(?:st|nd|rd|th)\s+(?:street|st\.?|avenue|ave\.?)\b|\d+\s+[\w.'-]+\s+(?:street|st\.?|avenue|ave\.?|road|rd\.?|blvd)\b|רחוב\s+\S+|שדרות\s+\S+|מחלף|כביש\s*\d|شارع\s+|الشارع|مجمع|الطابق|קומה/i;

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
  const v = value.replace(/\s+/g, " ").trim();
  if (!v || v.length > 160) return false;
  if (MARKETING_PROSE_LOCATION_RE.test(v)) return false;
  if (POSTAL_ADDRESS_RE.test(v)) return true;
  if (/\d{5}(?:-\d{4})?/.test(v) && v.length <= 140) return true;
  return v.length <= 80 && /\d/.test(v) && /street|st\b|avenue|רחוב|שדרות|מחלף|כביש|شارع/i.test(v);
}

export function isUsableLocationValue(value: string): boolean {
  const v = value.replace(/\s+/g, " ").trim();
  if (!v || v.length < 3) return false;
  if (MARKETING_PROSE_LOCATION_RE.test(v)) return false;
  if (/\b(?:including|proposed|supporting|enhancing|gateway into)\b/i.test(v)) return false;
  if (v.length > 160) return false;
  const longBits = v.split(/[.!?]+/).filter((s) => s.trim().length > 25);
  if (longBits.length >= 2) return false;
  if (looksLikePostalAddress(v)) return true;
  return v.length <= 80;
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
