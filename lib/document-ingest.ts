import type {
  IngestDocKind,
  IngestTag,
  IngestTargetStage,
  IngestedDocument,
  Intake,
  Locale,
  MediaAssetLabel,
  MediaAssetMeta,
  OperatingModel,
  PastCreative,
} from "./types";
import { IMAGE_MAX_BYTES, ingestFile } from "./media-assets";
import { applyOperatingModel, coerceGoalForFreeService, isFreeService } from "./operating-model";
import { isPediatricDemo } from "./demo";
import { AUDIENCE_CHIPS, ADVANTAGE_CHIPS, GOAL_CHIPS, PROBLEM_CHIPS, type ChipOption } from "./chips";
import { emptyIntake } from "./engine/validate";
import { detectVertical } from "./vertical";
import { uid } from "./utils";

export const DOC_MAX_BYTES = IMAGE_MAX_BYTES;

export type IngestFieldId =
  | "businessName"
  | "location"
  | "whatsapp"
  | "clinicHours"
  | "website"
  | "operatingModel"
  | "kupaFileBy"
  | "kupaMemberFrom"
  | "category"
  | "description"
  | "audience"
  | "biggestProblem"
  | "mainGoal"
  | "uniqueAdvantage"
  | "brandTone"
  | "brandPositioning"
  | "channelNotes"
  | "whatsappTemplates"
  | "landingLines"
  | "offer"
  | "pastHeadline"
  | "pastBody"
  | "pastCta";

export interface IngestReviewRow {
  id: string;
  field: IngestFieldId;
  value: string;
  targetStage: IngestTargetStage;
  include: boolean;
  needsClaimConfirm: boolean;
  claimsAllowed: boolean;
  fromImage: boolean;
  missing: boolean;
}

export interface IngestPrepareResult {
  doc: IngestedDocument;
  rows: IngestReviewRow[];
  extraAssets: MediaAssetMeta[];
  rawText: string;
  imageNeedsTypedText: boolean;
}

const IMAGE_EXT = /\.(jpe?g|png|webp)$/i;
const PDF_EXT = /\.pdf$/i;
const TXT_EXT = /\.txt$/i;
const DOCX_EXT = /\.docx$/i;

const RISKY_CLAIM =
  /VIP|\b100\s*%|הנחה|خصم|\bdiscount\b|קופון|كوبون|\bcoupon\b|ייעוץ חינם|استشارة مجان|free consult|מובטח|مضمون|\bguaranteed\b|קנו עכשיו|اشتروا الآن|buy now|מחיר מיוחד|سعر خاص/i;

export function ingestToComplete(locale: Locale): string {
  if (locale === "he") return "[יש להשלים]";
  if (locale === "ar") return "[يجب الاستكمال]";
  return "[to complete]";
}

export function isRiskyClaim(value: string): boolean {
  return RISKY_CLAIM.test(value);
}

export type DocClassify =
  | { kind: IngestDocKind }
  | { kind: null; reason: "type" | "size" };

export function classifyDocument(file: File): DocClassify {
  if (file.size > DOC_MAX_BYTES) return { kind: null, reason: "size" };
  const name = file.name.toLowerCase();
  const mime = (file.type || "").toLowerCase();
  if (mime === "application/pdf" || PDF_EXT.test(name)) return { kind: "pdf" };
  if (mime === "text/plain" || TXT_EXT.test(name)) return { kind: "txt" };
  if (
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    DOCX_EXT.test(name)
  ) {
    return { kind: "docx" };
  }
  if (mime.startsWith("image/") || IMAGE_EXT.test(name)) {
    if (!/^image\/(jpeg|jpg|png|webp)$/.test(mime) && !IMAGE_EXT.test(name)) {
      return { kind: null, reason: "type" };
    }
    return { kind: "image" };
  }
  return { kind: null, reason: "type" };
}

export function documentSizeError(locale: Locale, reason: "type" | "size"): string {
  if (reason === "size") {
    return locale === "he"
      ? "הקובץ גדול מ-8MB."
      : locale === "ar"
        ? "الملف أكبر من 8MB."
        : "File exceeds 8MB.";
  }
  return locale === "he"
    ? "רק PDF, txt, docx, או jpg / png / webp."
    : locale === "ar"
      ? "بس PDF أو txt أو docx أو jpg / png / webp."
      : "Only PDF, txt, docx, or jpg / png / webp.";
}

export const INGEST_FIELD_META: Record<
  IngestFieldId,
  { stage: IngestTargetStage; label: Record<Locale, string> }
> = {
  businessName: { stage: "wizard_business", label: { he: "שם העסק", ar: "اسم العمل", en: "Business name" } },
  location: { stage: "wizard_business", label: { he: "כתובת / מיקום", ar: "عنوان / موقع", en: "Address / location" } },
  whatsapp: { stage: "wizard_business", label: { he: "טלפון / וואטסאפ", ar: "هاتف / واتساب", en: "Phone / WhatsApp" } },
  clinicHours: { stage: "wizard_business", label: { he: "שעות / אופן הגעה", ar: "ساعات / كيف تجوا", en: "Hours / arrival" } },
  website: { stage: "wizard_business", label: { he: "אתר", ar: "موقع", en: "Website" } },
  operatingModel: { stage: "wizard_business", label: { he: "מודל הפעלה", ar: "نموذج التشغيل", en: "Operating model" } },
  kupaFileBy: { stage: "wizard_details", label: { he: "הגשת מעבר קופה עד", ar: "تقديم نقل الصندوق حتى", en: "Kupa-switch filing deadline" } },
  kupaMemberFrom: { stage: "wizard_details", label: { he: "תחילת חברות בקופה", ar: "بداية العضوية بالصندوق", en: "Kupa membership start" } },
  category: { stage: "wizard_business", label: { he: "תחום", ar: "المجال", en: "Category" } },
  description: { stage: "wizard_business", label: { he: "תיאור / זהות", ar: "وصف / هوية", en: "Description / identity" } },
  audience: { stage: "wizard_details", label: { he: "קהל", ar: "الجمهور", en: "Audience" } },
  biggestProblem: { stage: "wizard_details", label: { he: "בעיה / כאב", ar: "المشكلة", en: "Problem" } },
  mainGoal: { stage: "wizard_details", label: { he: "מטרת קמפיין", ar: "هدف الحملة", en: "Campaign goal" } },
  uniqueAdvantage: { stage: "discovery_strategy", label: { he: "יתרון ייחודי", ar: "الميزة الفريدة", en: "Unique advantage" } },
  brandTone: { stage: "discovery_strategy", label: { he: "טון מותג", ar: "نبرة العلامة", en: "Brand tone" } },
  brandPositioning: { stage: "discovery_strategy", label: { he: "פוזישנינג", ar: "التموضع", en: "Positioning" } },
  channelNotes: { stage: "media_plan", label: { he: "ערוצים (PLAN)", ar: "قنوات (خطة)", en: "Channels (PLAN)" } },
  whatsappTemplates: { stage: "leads", label: { he: "תבנית וואטסאפ", ar: "قالب واتساب", en: "WhatsApp template" } },
  landingLines: { stage: "leads", label: { he: "שורות נחיתה", ar: "سطور الهبوط", en: "Landing lines" } },
  offer: { stage: "wizard_details", label: { he: "מבצע (רק אם כתוב ומאושר)", ar: "عرض (فقط إن كُتب واعتُمد)", en: "Offer (only if written and confirmed)" } },
  pastHeadline: { stage: "creative", label: { he: "כותרת מודעה ישנה", ar: "عنوان إعلان سابق", en: "Past ad headline" } },
  pastBody: { stage: "creative", label: { he: "גוף מודעה ישנה", ar: "نص إعلان سابق", en: "Past ad body" } },
  pastCta: { stage: "creative", label: { he: "CTA ישן", ar: "نداء سابق", en: "Past CTA" } },
};

export const STAGE_LABEL: Record<IngestTargetStage, Record<Locale, string>> = {
  wizard_business: { he: "אשף · עסק", ar: "المعالج · النشاط", en: "Wizard · business" },
  wizard_details: { he: "אשף · פרטים", ar: "المعالج · التفاصيل", en: "Wizard · details" },
  discovery_strategy: { he: "דיסקברי + אסטרטגיה", ar: "الاستكشاف + الاستراتيجية", en: "Discovery + strategy" },
  creative: { he: "קריאייטיב (ייחוס עבר)", ar: "الإبداع (مرجع سابق)", en: "Creative (past reference)" },
  media_plan: { he: "מדיה PLAN", ar: "ميديا PLAN", en: "Media PLAN" },
  leads: { he: "לידים / וואטסאפ / נחיתה", ar: "عملاء / واتساب / هبوط", en: "Leads / WhatsApp / landing" },
};

function clip(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return t.slice(0, max).trim();
}

function startsWithLabel(line: string, lab: string): boolean {
  if (!lab || line.length < lab.length) return false;
  if (line.slice(0, lab.length).toLowerCase() !== lab.toLowerCase()) return false;
  const after = line.slice(lab.length);
  return after.length === 0 || /^[\s:：=|–—-]/.test(after);
}

/** Value on a "Label:" / "Label extra key:" line, or "NEXT" if the value is on the following line. */
function valueAfterLabel(line: string, lab: string): string | "NEXT" | "" {
  if (!startsWithLabel(line, lab)) return "";
  const after = line.slice(lab.length);
  let m = after.match(/^\s*[:：=|]\s*(.+)$/);
  if (m?.[1]?.trim()) return m[1].trim();
  m = after.match(/^\s*[-–—]\s+(.+)$/);
  if (m?.[1]?.trim()) return m[1].trim();
  // "שעות לפי מכבי: …" / "واتساب لمواعيد (حسب مكابي): …"
  if (/^\s+/.test(after)) {
    const extra = after.match(/[:：=|]\s*(.+)$/);
    if (extra?.[1]?.trim()) return extra[1].trim();
  }
  if (/^\s*[:：=|]?\s*$/.test(after)) return "NEXT";
  return "";
}

function labeledValue(text: string, labels: string[], max = 280): string {
  const hits = labeledValues(text, labels, max);
  return hits[0] ?? "";
}

function labeledValues(text: string, labels: string[], max = 280): string[] {
  const rows = text.split(/\r?\n/).map((l) => l.trim());
  const out: string[] = [];
  const used = new Set<number>();
  for (let i = 0; i < rows.length; i++) {
    if (used.has(i) || !rows[i]) continue;
    for (const lab of labels) {
      const got = valueAfterLabel(rows[i], lab);
      if (got === "NEXT") {
        const next = rows[i + 1] ?? "";
        if (next && next.length <= max) {
          const v = clip(next, max);
          if (v && !out.includes(v)) out.push(v);
          used.add(i);
          used.add(i + 1);
        }
        break;
      }
      if (got) {
        const v = clip(got, max);
        if (v && !out.includes(v)) out.push(v);
        used.add(i);
        break;
      }
    }
  }
  return out;
}


function firstMatch(text: string, re: RegExp): string {
  const m = text.match(re);
  return m?.[1]?.trim() || m?.[0]?.trim() || "";
}

const PROMO_WORD = /מבצע(?:\s+חדש)?|חיסול|הנחה|خصم|تصفية|كوبون|קופון|\bdiscount\b|\bhot\s*sale\b|\bsale\b|مجانا[ً]?|مجاني/i;
const CATALOG_H1 = /חדשים על המדפים|hot sale|קטלוג|catalog|new in|on the shelves/i;
const JUNK_UI_RE =
  /איפוס סיסמה|שחזור סיסמה|התחבר(?:ות)?|\bהרשם\b|הרשמה|skip to|\bcookie\b|forgot password|\blogin\b|\bcart\b|lost.?password|woocommerce-LostPassword/i;
/** Store search / help chrome — never a pain, advantage, or name. */
const STORE_CHROME_RE =
  /עדיין לא מצאת|לא מצאתם את מה|צריכים עזרה|צריך עזרה|מה תרצו לחפש|חפשו באתר|search for products|need help finding|هل تبحث|لم تجدوا|تحتاجون مساعدة|העגלה שלך ריקה|allow cookies|קבלת עוגיות|פתח תפריט/i;
const SHIPPING_PROMO = /משלוח(?:ים)? חינם|free shipping/i;
/** Advantage phrasing (no queues) — never the problem field. */
const QUEUE_ADVANTAGE =
  /بدون طوابير(?:\s*\/?\s*بدون انتظار)?|بدون طوابير ولا انتظار(?: طويل)?|بدون انتظار|בלי תור|ללא תור|ללא המתנה|no waiting/i;
/** Actual waiting pain on the page — hours in line, crowded public clinics. */
const QUEUE_PAIN =
  /وقفتكم بالساعات[^\n.]{0,90}|طوابير الساعات|انتظار طويل مع (?:طفل|ولد)|العيادات العامة|long queues|עומס תורים|שעות של תור/i;
const INSTAGRAM_BIO_JUNK = /بايو|البيو|تاب[عف]وا الصفحة|خلال دقيقة واحدة|سجلي طفلك الآن مجاناً خلال/i;

const INDIC_DIGITS: Record<string, string> = {
  "٠": "0",
  "١": "1",
  "٢": "2",
  "٣": "3",
  "٤": "4",
  "٥": "5",
  "٦": "6",
  "٧": "7",
  "٨": "8",
  "٩": "9",
  "۰": "0",
  "۱": "1",
  "۲": "2",
  "۳": "3",
  "۴": "4",
  "۵": "5",
  "۶": "6",
  "۷": "7",
  "۸": "8",
  "۹": "9",
};

export function foldIndicDigits(value: string): string {
  return String(value ?? "").replace(/[٠-٩۰-۹]/g, (ch) => INDIC_DIGITS[ch] ?? ch);
}

/** Display-form IL number when digits are on the page (05X-XXXXXXX / 0X-XXXXXXX). */
export function formatIlPhone(raw: string): string {
  const src = foldIndicDigits(String(raw ?? "")).trim();
  if (!src) return "";
  const digits = src.replace(/[^\d]/g, "");
  let local = digits;
  if (local.startsWith("972")) local = `0${local.slice(3)}`;
  if (/^05\d{8}$/.test(local)) return `${local.slice(0, 3)}-${local.slice(3)}`;
  if (/^0(?:50|52|53|54|55|72|73|74|76|77|78)\d{7}$/.test(local)) return `${local.slice(0, 3)}-${local.slice(3)}`;
  if (/^0\d{8}$/.test(local)) return `${local.slice(0, 2)}-${local.slice(2)}`;
  return src.replace(/\s+/g, "-");
}

/** Real IL mobile / landline — drop SKUs, 060 premium, and leftover 9-digit catalogs. */
export function isPlausibleIlBusinessPhone(raw: string): boolean {
  const digits = foldIndicDigits(String(raw ?? "")).replace(/[^\d]/g, "");
  let local = digits;
  if (local.startsWith("972")) local = `0${local.slice(3)}`;
  if (!local.startsWith("0")) return false;
  if (/^0(?:12|13|14|19|60)/.test(local)) return false;
  if (/^05\d{8}$/.test(local)) return true;
  if (/^07[2-8]\d{7}$/.test(local)) return true;
  if (/^0[2-489]\d{7}$/.test(local)) return true;
  return false;
}

/** Login/cart/cookie/search chrome — never a business name, problem, or advantage. */
export function isJunkUiText(value: string): boolean {
  const v = value.replace(/\s+/g, " ").trim();
  if (!v) return true;
  const core = v.replace(/[?؟!.]+$/g, "").trim();
  if (STORE_CHROME_RE.test(core) || STORE_CHROME_RE.test(v)) return true;
  if (core.length <= 48 && JUNK_UI_RE.test(core)) return true;
  if (v.length <= 48 && JUNK_UI_RE.test(v)) return true;
  return false;
}

export function isCatalogHeading(value: string): boolean {
  const v = value.replace(/\s+/g, " ").trim();
  if (!v || v.length > 48) return false;
  return CATALOG_H1.test(v);
}

function cleanPromoLine(line: string): string {
  return line.replace(/^\*+|\*+$/g, "").replace(/^(?:H1|title)\s*[:：]\s*/i, "").trim();
}

/** Page-owned promo line: keyword + concrete extra that already appears in the text. Never invent %. */
export function extractUnlabeledPromo(text: string): string {
  const lines = text.split(/\r?\n/).map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);
  const shipping: string[] = [];
  const sales: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    let line = cleanPromoLine(lines[i]);
    if (!line || /^H1\s*:/i.test(lines[i])) continue;
    if (/^(?:תיאור|כתובת|טלפון|שעות|וואטסאפ|שם העסק|CTA|description|title)\s*:/i.test(line)) continue;
    if (/דירוג|\brating\b|\bstars?\b|כוכבים/i.test(line) && !/מבצע|הנחה|خصم|משלוח/.test(line)) continue;
    if (SHIPPING_PROMO.test(line)) {
      if (line.length < 4 || line.length > 180) continue;
      if (!shipping.includes(line)) shipping.push(line);
      continue;
    }
    if (!PROMO_WORD.test(line)) continue;
    let stripped = line.replace(PROMO_WORD, "").replace(/[!?.\s\-–—:*#]+/g, "").trim();
    if (!stripped && lines[i + 1] && lines[i + 1].length <= 40) {
      line = cleanPromoLine(`${line} ${lines[i + 1]}`.replace(/\s+/g, " "));
      stripped = line.replace(PROMO_WORD, "").replace(/[!?.\s\-–—:*#]+/g, "").trim();
    }
    if (line.length < 4 || line.length > 240) continue;
    if (!stripped) continue;
    if (INSTAGRAM_BIO_JUNK.test(line) || /\$\{|whatsappDisplay|contentHe:|contentAr:/.test(line)) continue;
    if (/₪|\bNIS\b|\d+[.,]\d{2}/.test(line) && !SHIPPING_PROMO.test(line)) continue;
    const concrete = /[0-9]|1\s*\+\s*1|חינם|חיסול|مجانا|مجاني|تصفية|חדש|₪|%|ש״ח|ש"ח|hot\s*sale|קופון|كوبون|كلاليت|כללית/i.test(line) || stripped.length >= 3;
    if (!concrete) continue;
    if (!sales.includes(line)) sales.push(line);
  }
  sales.sort((a, b) => {
    const score = (s: string) =>
      (/100\s*%/.test(s) ? 40 : 0) + (/كلاليت|כללית|clalit/i.test(s) ? 30 : 0) + (/مجانا|مجاني|חינם/.test(s) ? 10 : 0) - s.length / 100;
    return score(b) - score(a);
  });
  return [...shipping, ...sales].slice(0, 2).join(", ");
}

/** Advantage phrase that is on the page and not a clone of description. */
/** Advantage phrase that is on the page and not a clone of description. */
export function distinctPageAdvantage(hay: string, description: string): string {
  const desc = description.replace(/\s+/g, " ").trim().toLowerCase();
  const patterns = [
    /היעד המוביל[^\n.]{0,80}/g,
    /מותגים עולמיים[^\n.]{0,120}קורת גג אחת/g,
    /מתחת לקורת גג אחת/g,
    /بدون طوابير(?: ولا انتظار(?: طويل)?)?/g,
    /بدون انتظار/g,
    /واتساب مباشر[^\n.]{0,60}/g,
    /تواصل واتساب مع الطبيب/g,
    /וואטסאפ ישיר[^\n.]{0,40}/g,
    /100\s*%[^\n.]{0,70}(?:كلاليت|כללית|clalit)/gi,
    /مجانا[ً]?\s*100\s*%[^\n.]{0,50}/g,
  ];
  const hits: string[] = [];
  for (const re of patterns) {
    for (const m of hay.matchAll(re)) {
      const v = (m[0] || "").replace(/\s+/g, " ").trim();
      if (!v || isJunkUiText(v) || isCatalogHeading(v)) continue;
      if (v.toLowerCase() === desc) continue;
      if (v.length < 6) continue;
      const clipped = v.length > 160 ? v.slice(0, 160).trim() : v;
      if (hits.some((h) => h.includes(clipped) || clipped.includes(h))) continue;
      hits.push(clipped);
      if (hits.length >= 3) break;
    }
    if (hits.length >= 3) break;
  }
  if (hits.length >= 2) return hits.join(" + ");
  if (hits.length === 1) return hits[0];
  return "";
}

function extractLooseHours(text: string): string {
  const TIME = /\d{1,2}\s*[:.]\s*\d{2}/;
  const HEAD = /שעות|ساعات|\bopen(?:ing)?\b|الدوام|קבלה|שירות לקוחות/i;
  const dayHours = text.match(IL_DAYS_HOURS);
  if (dayHours?.[0] && dayHours[0].length <= 80) return clip(dayHours[0].replace(/\s+/g, " ").trim(), 280);
  const structured: string[] = [];
  for (const m of text.matchAll(
    /day\s*:\s*["']([^"']{2,40})["']\s*,\s*morning\s*:\s*["']([^"']{0,80})["']\s*,\s*evening\s*:\s*["']([^"']{0,80})["']/gi,
  )) {
    const row = `${m[1].trim()} ${m[2].trim()}${m[3].trim() ? ` / ${m[3].trim()}` : ""}`.replace(/\s+/g, " ").trim();
    if (TIME.test(row) && !structured.includes(row)) structured.push(row);
  }
  if (structured.length) return clip(structured.join(" · "), 280);

  const lines = text.split(/\r?\n/).map((l) => l.replace(/\s+/g, " ").trim());
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!HEAD.test(line) && !TIME.test(line)) continue;
    if (/^H1\s*:/i.test(line)) continue;
    if (HEAD.test(line) && TIME.test(line) && line.length >= 6 && line.length <= 400) {
      return clip(line.replace(/^(?:H1|שעות|ساعات|hours|الدوام)\s*[:：]\s*/i, ""), 400);
    }
    if (HEAD.test(line)) {
      const collected: string[] = [];
      for (let j = i + 1; j < Math.min(i + 14, lines.length); j++) {
        const L = lines[j];
        if (!L) {
          if (collected.length) break;
          continue;
        }
        if (TIME.test(L) && L.length <= 400) collected.push(L);
        else if (collected.length && !HEAD.test(L) && L.length > 80) break;
      }
      if (collected.length) return clip(collected.join(" · "), 800);
    }
  }
  return "";
}

const IL_CITY =
  /באר שבע|תל אביב|חיפה|ירושלים|פתח תקווה|ראשון לציון|נתניה|אשדוד|חולון|רחובות|כפר סבא|הרצליה|רמת גן|בת ים|אשקלון|עפולה|נצרת|באקה|טירה|טייבה|קלנסווה|רהט|אילת|כפר קאסם|אום אל|باقة|بئر السبع|تل أبيب|حيفا|القدس|الناصرة/;
const ADDRESS_HINT =
  /(?:מחלף|רחוב\s+\S|שדרות\s+\S|כביש\s*\d|חיל\s+\S|קניון\s+\S|الشارع|شارع\s+|مجمع|الطابق|קומה|בצד|بجانب|street|avenue|\bfloor\b)/i;
const IL_DAYS_HOURS =
  /(?:ימים\s+)?[א-ת]['׳]?(?:\s*[-–—ועד]+\s*[א-ת]['׳]?)?\s*(?:בין\s*)?\d{1,2}\s*[:.]\s*\d{2}\s*[-–—]\s*\d{1,2}\s*[:.]\s*\d{2}/;

function extractLooseAddress(text: string): string {
  const lines = text.split(/\r?\n/).map((l) => l.replace(/\s+/g, " ").trim());
  for (const line of lines) {
    if (line.length < 8 || line.length > 280) continue;
    if (/אימייל|email|סיסמה|password|כתובת אימייל|lost.?password/i.test(line)) continue;
    if (/^H1\s*:/i.test(line)) continue;
    if (/[|]/.test(line) && !ADDRESS_HINT.test(line) && !IL_CITY.test(line)) continue;
    if (ADDRESS_HINT.test(line) || (IL_CITY.test(line) && /\d/.test(line))) {
      return clip(line.replace(/^(?:כתובת|מיקום|العنوان|الموقع|عنوان|address|location)\s*[:：]\s*/i, ""), 280);
    }
  }
  return "";
}

function extractMenuOrServices(text: string): string {
  const labels: string[] = [];
  const re = /(?:^|\n)\s*(גברים|נשים|ילדים|תינוקות|הנעלה|אקססוריז|ביגוד|נשים\/נוער)(?=\s|$)/g;
  for (const m of text.matchAll(re)) {
    const v = (m[1] || "").trim();
    if (v && !labels.includes(v)) labels.push(v);
    if (labels.length >= 8) break;
  }
  return labels.join(" · ");
}

export function extractPhone(text: string): string {
  const t = foldIndicDigits(text);
  const waMe =
    t.match(/wa\.me\/(\+?\d{8,15})/i) || t.match(/whatsapp\.com\/send\?[^\s"'<>]*phone=(\+?\d{8,15})/i);
  if (waMe?.[1]) return formatIlPhone(waMe[1]);
  const mobile = t.match(/(?:\+972[\s-]?)?0?(?:50|52|53|54|55)[\s-]?\d{3}[\s-]?\d{4}\b/) ||
    t.match(/(?:\+972[\s-]?)?0?5\d[\s-]?\d{3}[\s-]?\d{4}\b/);
  if (mobile) return formatIlPhone(mobile[0]);
  const land = t.match(/\b0\d{1,2}[\s-]?\d{3}[\s-]?\d{4}\b/);
  return land ? formatIlPhone(land[0]) : "";
}

export function extractWebsite(text: string): string {
  const m = text.match(/https?:\/\/[^\s<>"']+/i) || text.match(/\bwww\.[^\s<>"']+/i);
  if (!m) return "";
  return m[0].replace(/[),.;]+$/, "");
}

function extractOperatingModel(text: string): OperatingModel | "" {
  const clalit = /כללית|كلاليت|clalit/i.test(text);
  const school = /בית ספר|مدرسة|\bschool\b|עירייה|بلدية|municipality/i.test(text);
  const memberFree = /100\s*%|مجانا[ً]?|مجاني|חינם ל(?:מבוטח|תלמיד)|free (?:for members|coverage)|بدون دفع/i.test(text);
  if (clalit && memberFree) return "free_service";
  if (school && /שירות חינם|خدمة مجانية|חינם לתלמיד|مجاني(?:ה)? ל(?:תלמיד|طلاب)/i.test(text)) return "free_service";
  const free = /שירות חינם|خدمة مجانية|free[_\s-]?service|חשיפה בלבד|بدون دفع|no charge to the client|קופה עצמאית חינם/i.test(
    text,
  );
  const paid = /בתשלום|\bمدفوع\b|\bpaid\b|מוכר מוצר|بيع مقابل/i.test(text);
  if (free && !paid) return "free_service";
  if (paid && !free) return "paid";
  return "";
}

export function extractChannels(text: string): string {
  const found: string[] = [];
  const meta = /\bmeta\b/i.test(text);
  if (meta || /פייסבוק|فيسبوك|\bfacebook\b/i.test(text)) found.push("facebook");
  if (meta || /אינסטגרם|انستغرام|إنستغرام|\binstagram\b/i.test(text)) found.push("instagram");
  if (/\bgoogle\b|גוגל|غوغل/i.test(text)) found.push("Google");
  if (/tiktok|טיקטוק|تيك توك/i.test(text)) found.push("TikTok");
  if (/youtube|יוטיוב|يوتيوب/i.test(text)) found.push("YouTube");
  if (/whatsapp|וואטסאפ|واتساب/i.test(text)) found.push("whatsapp");
  return found.join(", ");
}

function looksLikeAd(text: string, filename: string): boolean {
  const n = filename.toLowerCase();
  if (/ad\b|מודעה|اعلان|إعلان|creative|flyer|פלאייר|منشور إعلان/.test(n)) return true;
  const hasHead = /headline|כותרת|عنوان/.test(text);
  const hasCta = /\bcta\b|קריאה לפעולה|دعوة/.test(text);
  return hasHead && hasCta;
}

function guessLogoLabel(filename: string): MediaAssetLabel {
  if (/logo|לוגו|شعار/.test(filename.toLowerCase())) return "logo";
  return "other";
}

function matchChip(value: string, chips: ChipOption[]): { id: string; custom: boolean } {
  const v = value.trim();
  if (!v) return { id: "", custom: false };
  const parts = v.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length > 1) {
    const ids: string[] = [];
    let custom = false;
    for (const p of parts) {
      const m = matchChip(p, chips);
      if (!m.id) continue;
      if (!ids.includes(m.id)) ids.push(m.id);
      if (m.custom) custom = true;
    }
    return { id: ids.join(","), custom };
  }
  const hit = chips.find(
    (c) => c.id === v || Object.values(c.label).some((lab) => lab.toLowerCase() === v.toLowerCase()),
  );
  if (hit && !hit.custom) return { id: hit.id, custom: false };
  return { id: v, custom: true };
}

const UNCERTAINTY_RE = /לא בטוחים|מה לעשות|not sure|3 בלילה|(?<![א-ת])חום(?![א-ת])/i;

function stripProseLead(v: string): string {
  return clip(v.replace(/^(?:H1|תיאור|description|title)\s*[:：]\s*/i, ""), 400);
}

function normHeading(v: string): string {
  return v.replace(/[?؟.]+$/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}

/** H1 that is just the brand name is not a pain statement. */
function isBrandHeading(value: string, businessName: string, h1: string): boolean {
  const v = normHeading(value);
  if (!v) return true;
  const brand = normHeading(businessName);
  const heading = normHeading(h1);
  if (brand && v === brand) return true;
  if (heading && brand && heading === brand && (v === heading || value.trim().toLowerCase() === h1.trim().toLowerCase())) {
    return true;
  }
  return false;
}

function remainderAfterQuestion(source: string, question: string): string {
  const q = question.trim();
  if (!q || !source) return "";
  const i = source.indexOf(q);
  if (i < 0) return "";
  const samePara = source.slice(i + q.length).split(/\r?\n/)[0] || "";
  const rest = clip(samePara.replace(/^[\s.,;:·•*|/–—־-]+/u, ""), 400);
  if (!rest || rest === q) return "";
  return rest;
}

function firstQuestionSentence(text: string): string {
  const re = /[^?؟\n]{8,280}[?؟]/g;
  for (const m of text.matchAll(re)) {
    const q = stripProseLead(m[0] || "");
    if (q.length >= 8 && !isJunkUiText(q) && !isCatalogHeading(q)) return q;
  }
  return "";
}

function firstUncertaintySnippet(text: string): string {
  const m = text.match(/([^\n]{0,140}(?:לא בטוחים|מה לעשות|not sure|3 בלילה|(?<![א-ת])חום(?![א-ת]))[^\n]{0,100})/i);
  return m ? stripProseLead(m[1] || m[0] || "") : "";
}

function h1FromBlob(blob: string): string {
  const m = blob.match(/(?:^|\n)H1:\s*(.+)/);
  return (m?.[1] || "").trim();
}

/** If uniqueAdvantage is the full og/description and a question was split off, keep the remainder. */
export function advantageAfterQuestionSplit(
  uniqueAdvantage: string | undefined,
  source: string,
  problem: string,
): string {
  const adv = String(uniqueAdvantage || "").trim();
  const src = String(source || "").trim();
  const q = String(problem || "").trim();
  if (!src || !q) return adv;
  const sameAsSource = !adv || adv === src || adv === clip(src, 400) || adv === clip(src, 500);
  if (!sameAsSource) return adv;
  if (!src.includes(q)) return adv;
  return remainderAfterQuestion(src, q) || adv;
}

/** Map leftover empty intake fields from REAL page/document prose. Never invent prices, ratings, VIP, or HMO members. */
export function fillEmptyFromPageProse(
  fields: Partial<Record<IngestFieldId, string>>,
  text: string,
  extraProse = "",
): Partial<Record<IngestFieldId, string>> {
  const out: Partial<Record<IngestFieldId, string>> = { ...fields };
  const blob = text || "";
  const extra = (extraProse || "").trim();
  const hay = [extra, blob].filter(Boolean).join("\n");
  const brand = String(out.businessName || "").trim();
  const h1 = h1FromBlob(blob);
  let splitRemainder = "";

  const acceptProblem = (raw: string, sourceForRemainder: string): boolean => {
    const v = stripProseLead(raw);
    if (!v || isBrandHeading(v, brand, h1)) return false;
    if (isJunkUiText(v) || isCatalogHeading(v)) return false;
    if (/^(?:תחום|קטגוריה|שם העסק|טלפון|כתובת|שעות|תיאור|CTA)\s*:/i.test(v)) return false;
    if (/^(?:Physician|MedicalClinic|Store|Restaurant|LocalBusiness)$/i.test(v)) return false;
    out.biggestProblem = v;
    const rest = remainderAfterQuestion(sourceForRemainder, v);
    if (rest && !isBrandHeading(rest, brand, h1) && !isJunkUiText(rest) && !isCatalogHeading(rest)) {
      splitRemainder = rest;
    }
    return true;
  };

  if (out.businessName && (isJunkUiText(out.businessName) || isCatalogHeading(out.businessName))) {
    delete out.businessName;
  }
  if (out.biggestProblem && (isJunkUiText(out.biggestProblem) || isCatalogHeading(out.biggestProblem))) {
    delete out.biggestProblem;
  }
  if (out.biggestProblem && /^(?:תחום|קטגוריה)\s*:/i.test(out.biggestProblem)) {
    delete out.biggestProblem;
  }
  if (out.biggestProblem && QUEUE_ADVANTAGE.test(out.biggestProblem) && !QUEUE_PAIN.test(out.biggestProblem)) {
    delete out.biggestProblem;
  }
  if (out.uniqueAdvantage && (isJunkUiText(out.uniqueAdvantage) || isCatalogHeading(out.uniqueAdvantage))) {
    delete out.uniqueAdvantage;
  }

  const menu = extractMenuOrServices(hay);
  const extraLead = extra
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)[0] || "";
  if (extraLead.length > 20 && (!out.description || (menu && out.description.trim() === menu))) {
    out.description = clip(extraLead, 500);
  }

  if (!String(out.audience || "").trim()) {
    const ids: string[] = [];
    if (/לכל המשפחה|משפחות מקומיות|local families/i.test(hay)) ids.push("local_families");
    const he = hay.match(/להורים|\bהורים\b/)?.[0];
    if (/every parent|7000\s*\+?\s*parents|\bparents?\b/i.test(hay) || he) ids.push("parents");
    if (/ילדים|תינוקות|أطفال|أهل/.test(hay) && !ids.includes("parents")) ids.push("parents");
    if (/נשים/.test(hay) || /\bwomen\b/i.test(hay)) ids.push("women");
    if (/גברים/.test(hay) || /\bmen\b/i.test(hay)) ids.push("men");
    if (ids.length) out.audience = ids.join(",");
    else if (he && !/\bparents?\b/i.test(hay)) out.audience = "הורים";
  }

  if (!String(out.category || "").trim()) {
    if (/אופנה/.test(hay)) out.category = "אופנה";
    else if (/fashion retail/i.test(hay)) out.category = "fashion retail";
    else {
      const catHit =
        hay.match(/عيادة طب الأطفال(?: والعائلة)?/) ||
        hay.match(/מרפאת ילדים/) ||
        hay.match(/רופא ילדים/) ||
        hay.match(/طبيب أطفال/) ||
        hay.match(/\bpediatrics?\b/i) ||
        hay.match(/\bMedicalClinic\b/i) ||
        hay.match(/\bPhysician\b/i) ||
        hay.match(/\bRestaurant\b/i) ||
        hay.match(/\bStore\b/);
      if (catHit) out.category = catHit[0];
    }
  }

  if (!String(out.biggestProblem || "").trim()) {
    const painRe =
      /(?:when your child is unwell|child is unwell|not sure what to do about your child|משהו מטריד בילד|מה הצעד הראשון)/i;
    if (h1 && painRe.test(h1) && !CATALOG_H1.test(h1) && !isJunkUiText(h1)) acceptProblem(h1, h1);
    if (!String(out.biggestProblem || "").trim()) {
      for (const src of [blob, extra].filter(Boolean)) {
        const legacy = src.match(/([^\n]{0,140}(?:when your child is unwell|child is unwell|not sure what to do about your child|משהו מטריד בילד|מה הצעד הראשון)[^\n]{0,100})/i);
        if (legacy && acceptProblem(legacy[1] || legacy[0], src)) break;
      }
    }
    if (!String(out.biggestProblem || "").trim()) {
      const queue = hay.match(QUEUE_PAIN);
      if (queue && !QUEUE_ADVANTAGE.test(queue[0])) acceptProblem(queue[0], hay);
    }
    if (!String(out.biggestProblem || "").trim()) {
      for (const src of [extra, blob].filter(Boolean)) {
        const q = firstQuestionSentence(src);
        if (q && acceptProblem(q, src)) break;
      }
    }
    if (!String(out.biggestProblem || "").trim()) {
      for (const src of [extra, blob].filter(Boolean)) {
        const snip = firstUncertaintySnippet(src);
        if (snip && UNCERTAINTY_RE.test(snip) && acceptProblem(snip, src)) break;
      }
    }
  }
  if (!String(out.biggestProblem || "").trim() && hay.length > 40) {
    out.biggestProblem = "unknown";
  }

  if (out.uniqueAdvantage && out.description && out.uniqueAdvantage.trim() === out.description.trim()) {
    delete out.uniqueAdvantage;
  }

  if (!String(out.uniqueAdvantage || "").trim()) {
    const distinct = distinctPageAdvantage(hay, out.description || "");
    if (distinct) out.uniqueAdvantage = distinct;
    else if (
      splitRemainder &&
      splitRemainder !== String(out.description || "").trim() &&
      !/^[\s,،;:·]+/.test(splitRemainder)
    ) {
      out.uniqueAdvantage = splitRemainder;
    } else {
      const m =
        hay.match(/An AI doctor[^\n]{0,220}/i) ||
        hay.match(/([^\n]{0,80}(?:AI doctor|21 smart tools|verified medical information|21 כלים)[^\n]{0,180})/i);
      if (m) out.uniqueAdvantage = stripProseLead(m[1] || m[0]);
    }
  } else if (extra) {
    out.uniqueAdvantage = advantageAfterQuestionSplit(out.uniqueAdvantage, extra, out.biggestProblem || "");
  }

  if (out.uniqueAdvantage && out.description && out.uniqueAdvantage.trim() === out.description.trim()) {
    const distinct = distinctPageAdvantage(hay, out.description);
    if (distinct) out.uniqueAdvantage = distinct;
    else delete out.uniqueAdvantage;
  }

  if (!String(out.description || "").trim()) {
    if (menu) out.description = menu;
  } else if (!String(out.uniqueAdvantage || "").trim()) {
    const distinct = distinctPageAdvantage(hay, out.description || "");
    if (distinct) out.uniqueAdvantage = distinct;
    else if (menu && menu !== String(out.description || "").trim()) out.uniqueAdvantage = menu;
  }

  if (!String(out.mainGoal || "").trim()) {
    if (/install|download|הורד|تنزيل|app installs/i.test(hay)) out.mainGoal = "installs";
    else if (/consultation|ייעוץ|start with the ai doctor/i.test(hay)) out.mainGoal = "leads";
    else if (/\bjoin\b|browse (all )?tools|הצטרפ|join free/i.test(hay)) out.mainGoal = "awareness";
  }
  if (!String(out.mainGoal || "").trim()) {
    const ctaBlob = hay
      .split(/\r?\n/)
      .filter((l) => /^CTA\s*:/i.test(l))
      .join(" ");
    if (ctaBlob) {
      if (/install|download|הורד|تنزيل/i.test(ctaBlob)) out.mainGoal = "installs";
      else if (/book|קבע תור|احجز|reservation|הזמנ/i.test(ctaBlob)) out.mainGoal = "bookings";
      else if (/\bbuy\b|קנו|اشتري|order now|shop|הוספה לסל|לסל|add to cart/i.test(ctaBlob)) out.mainGoal = "sales";
      else if (/whatsapp|וואטסאפ|واتساب|contact|צור קשר|اتصل|consult|ייעוץ/i.test(ctaBlob)) out.mainGoal = "leads";
      else if (/\bjoin\b|הצטרפ|انضم|browse/i.test(ctaBlob)) out.mainGoal = "awareness";
      else if (/walk-?in|סדר הגעה|جت أولاً/i.test(ctaBlob)) out.mainGoal = "walk_in";
    }
  }
  if (out.operatingModel === "free_service") {
    const g = String(out.mainGoal || "").trim();
    if (!g || g === "sales" || g === "installs" || g === "leads" || g === "bookings") {
      out.mainGoal = /walk-?in|جت أولاً|סדר הגעה|بدون مواعيد|بدون طوابير|بدون انتظار/i.test(hay)
        ? "walk_in"
        : "exposure";
    }
  }

  if (!String(out.channelNotes || "").trim()) {
    const found = extractChannels(hay);
    if (found) out.channelNotes = found;
    else if (out.operatingModel !== "free_service") out.channelNotes = "facebook, instagram";
  }

  if (!String(out.landingLines || "").trim()) {
    const heads: string[] = [];
    if (h1 && !isJunkUiText(h1)) heads.push(h1);
    for (const m of blob.matchAll(/(?:^|\n)H2:\s*(.+)/g)) {
      const t = (m[1] || "").replace(/\s+/g, " ").trim();
      if (t && !isJunkUiText(t) && !heads.includes(t)) heads.push(t);
    }
    if (!heads.length) {
      for (const m of blob.matchAll(/(?:^|\n)CTA:\s*(.+)/g)) {
        const t = (m[1] || "").replace(/\s+/g, " ").trim();
        if (t && !isJunkUiText(t) && !INSTAGRAM_BIO_JUNK.test(t) && !heads.includes(t)) heads.push(t);
      }
    }
    if (heads.length) out.landingLines = clip(heads.slice(0, 3).join(" · "), 400);
  }

  if (!String(out.whatsappTemplates || "").trim()) {
    const ctaWa = hay
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => /^CTA\s*:/i.test(l) && /whatsapp|וואטסאפ|واتساب/i.test(l));
    const rawTpl = ctaWa[0] ? ctaWa[0].replace(/^CTA\s*:\s*/i, "").trim() : "";
    const loose =
      rawTpl ||
      (hay.match(/(?:תקשרו|שלחו|כתבו|تواصل|أرسل|message)[^\n]{0,50}(?:whatsapp|וואטסאפ|واتساب)[^\n]{0,60}/i) ||
        [])[0] ||
      "";
    const tpl = clip(loose, 280);
    const core = tpl.replace(/^CTA\s*:\s*/i, "").trim();
    if (
      tpl &&
      !isJunkUiText(tpl) &&
      !(extractPhone(tpl) && tpl.length < 36) &&
      core.length >= 12 &&
      !/^(?:whatsapp|וואטסאפ|واتساب)$/i.test(core)
    ) {
      out.whatsappTemplates = tpl;
    }
  }

  return out;
}

function phoneDigitKey(raw: string): string {
  let d = foldIndicDigits(raw).replace(/[^\d]/g, "");
  if (d.startsWith("972")) d = `0${d.slice(3)}`;
  return d;
}

/** Unique on-page phones (tel + WhatsApp), extract-only. Cap 2. */
function collectPhones(text: string): string {
  const hits: string[] = [];
  const push = (raw: string) => {
    const f = formatIlPhone(raw) || String(raw || "").replace(/\s+/g, " ").trim();
    if (!f) return;
    const key = phoneDigitKey(f);
    if (key.length < 8) return;
    if (!isPlausibleIlBusinessPhone(f)) return;
    if (hits.some((h) => phoneDigitKey(h) === key)) return;
    hits.push(f);
  };
  for (const v of labeledValues(text, ["טלפון", "هاتف", "phone", "נייד", "موبايل", "mobile"])) push(v);
  for (const v of labeledValues(text, ["וואטסאפ", "واتساب", "whatsapp", "whats app"])) push(v);
  const extracted = extractPhone(text);
  if (extracted) push(extracted);
  return hits.slice(0, 2).join(" · ");
}

/** Full page promo sentence, including the keyword (חיסול / מבצע / خصم). */
function labeledPromoSentences(text: string): string[] {
  const labels = ["מבצע חדש", "מבצע", "חיסול", "הנחה", "عرض", "تصفية", "خصم", "hot sale", "offer", "promo", "promotion"];
  const rows = text.split(/\r?\n/).map((l) => l.replace(/\s+/g, " ").trim());
  const out: string[] = [];
  for (const row of rows) {
    const line = cleanPromoLine(row).replace(/^(?:H2)\s*[:：]\s*/i, "").trim();
    if (!line || line.length < 4 || line.length > 180) continue;
    for (const lab of labels) {
      if (!startsWithLabel(line, lab)) continue;
      if (!out.includes(line)) out.push(clip(line, 180));
      break;
    }
  }
  return out.slice(0, 2);
}

export function extractFieldsFromText(text: string, filename: string): Partial<Record<IngestFieldId, string>> {
  const out: Partial<Record<IngestFieldId, string>> = {};
  const name = labeledValue(text, [
    "שם העסק",
    "שם המרפאה",
    "שם העסק/המותג",
    "اسم المنشأة",
    "اسم العمل",
    "اسم النشاط",
    "اسم العيادة",
    "اسم الطبيب",
    "اسم المركز",
    "الاسم",
    "business name",
    "clinic name",
    "brand name",
  ]);
  if (name) out.businessName = name;

  const locHits = labeledValues(text, ["כתובת", "מיקום", "العنوان", "عنوان", "الموقع", "address", "location"]);
  const locStrong = locHits.filter((h) => ADDRESS_HINT.test(h)).sort((a, b) => b.length - a.length);
  const loc = locStrong[0] || locHits[0] || "";
  if (loc) out.location = loc;
  else {
    const looseA = extractLooseAddress(text);
    if (looseA) out.location = looseA;
  }

  const wa = collectPhones(text);
  if (wa) out.whatsapp = wa;

  const hoursHits = labeledValues(text, [
    "שעות קבלה",
    "שעות פעילות",
    "שעות עבודה",
    "שעות",
    "ساعات العمل",
    "ساعات الدوام",
    "ساعات مكابي",
    "ساعات",
    "الدوام",
    "hours",
    "opening hours",
    "clinic hours",
  ], 800);
  if (hoursHits.length) out.clinicHours = hoursHits.join(" · ");
  else {
    const looseH = extractLooseHours(text);
    if (looseH) out.clinicHours = looseH;
  }
  if (!out.clinicHours && /קבלה לפי סדר הגעה|جت أولاً|walk-?in|בלי לקבוע תור|بدون مواعيد/i.test(text)) {
    const hit = firstMatch(
      text,
      /([^\n]{0,80}(?:קבלה לפי סדר הגעה|جت أولاً|walk-?in|בלי לקבוע תור|بدون مواعيد)[^\n]{0,80})/i,
    );
    if (hit) out.clinicHours = clip(hit, 180);
  }

  const site =
    labeledValue(text, ["אתר אינטרנט", "אתר", "קישור לאתר", "موقع إلكتروني", "رابط الموقع", "website", "url"]) ||
    extractWebsite(text);
  if (site) out.website = site;

  const modelLabeled = labeledValue(text, [
    "מודל הפעלה",
    "מודל תפעול",
    "אופן הפעלה",
    "نموذج التشغيل",
    "نموذج العمل",
    "operating model",
  ]);
  const model = extractOperatingModel(modelLabeled) || extractOperatingModel(text);
  if (model) out.operatingModel = model;
  else if (modelLabeled) out.operatingModel = modelLabeled;


  const kupaFile = labeledValue(text, [
    "הגשת מעבר קופה עד",
    "תאריך הגשה",
    "تقديم نقل الصندوق",
    "kupa-switch filing",
    "filing deadline",
  ]);
  if (kupaFile) out.kupaFileBy = kupaFile;
  const kupaMember = labeledValue(text, [
    "תחילת חברות",
    "תחילת חברות בקופה",
    "بداية العضوية",
    "kupa membership start",
    "membership start",
  ]);
  if (kupaMember) out.kupaMemberFrom = kupaMember;

  const cat = labeledValue(text, ["תחום", "קטגוריה", "المجال", "category"]);
  if (cat) out.category = cat;

  const desc = labeledValue(text, ["תיאור", "העסק בקצרה", "وصف", "description", "about"], 500);
  if (desc) out.description = desc;

  const aud = labeledValue(text, [
    "קהל יעד",
    "קהל היעד",
    "קהל",
    "الجمهور المستهدف",
    "الجمهور",
    "جمهور",
    "audience",
    "target audience",
  ]);
  if (aud) out.audience = aud;

  const problem = labeledValue(text, [
    "הבעיה הכי גדולה",
    "בעיה / כאב",
    "בעיה",
    "הכאב",
    "المشكلة الأكبر",
    "المشكلة",
    "biggest problem",
    "pain point",
  ]);
  if (problem) out.biggestProblem = problem;

  const goal = labeledValue(text, [
    "מטרת קמפיין",
    "מטרת הקמפיין",
    "מטרה עיקרית",
    "מטרת",
    "מטרה",
    "هدف الحملة",
    "هدف الحمله",
    "هدف",
    "campaign goal",
    "goal",
  ]);
  if (goal) out.mainGoal = goal;

  const adv = labeledValue(text, [
    "יתרון ייחודי",
    "יתרון תחרותי",
    "יתרון",
    "الميزة الفريدة",
    "الميزة التنافسية",
    "الميزة",
    "unique advantage",
    "advantage",
    "usp",
  ]);
  if (adv) out.uniqueAdvantage = adv;


  const tone = labeledValue(text, ["טון", "טון דיבור", "نبرة", "tone", "tone of voice"]);
  if (tone) out.brandTone = tone;

  const pos = labeledValue(text, ["פוזישנינג", "מיצוב", "التموضع", "positioning"]);
  if (pos) out.brandPositioning = pos;
  if (!out.brandPositioning) {
    const slogan = labeledValue(text, ["slogan", "tagline", "מוטו", "شعار", "tag line"]);
    if (slogan) out.brandPositioning = slogan;
  }

  const ch =
    labeledValue(text, ["ערוצים", "ערוצי מדיה", "قنوات", "channels"]) || extractChannels(text);
  if (ch) out.channelNotes = ch;

  const waTpl = labeledValue(text, ["תבנית וואטסאפ", "قالب واتساب", "whatsapp template", "whatsapp script"], 600);
  if (waTpl) out.whatsappTemplates = waTpl;

  const land = labeledValue(
    text,
    ["דף נחיתה", "שורות נחיתה", "עמוד נחיתה", "صفحة الهبوط", "صفحة هبوط", "landing page", "landing lines", "landing"],
    600,
  );
  if (land) out.landingLines = land;


  const offerHits = labeledPromoSentences(text).filter((h) => !/^(חדש|new|!+)$/i.test(h.trim()));
  if (offerHits.length) out.offer = offerHits.join(", ");
  if (!String(out.offer || "").trim()) {
    const promo = extractUnlabeledPromo(text);
    if (promo) out.offer = promo;
  }

  if (looksLikeAd(text, filename)) {
    const h = labeledValue(text, ["כותרת", "headline", "عنوان الإعلان", "ad headline"]);
    const b = labeledValue(text, ["גוף", "body", "primary text", "نص الإعلان", "ad body"], 600);
    const c = labeledValue(text, ["cta", "קריאה לפעולה", "دعوة", "call to action"]);
    if (h) out.pastHeadline = h;
    if (b) out.pastBody = b;
    if (c) out.pastCta = c;
  }

  return fillEmptyFromPageProse(out, text);
}

function rowFor(
  field: IngestFieldId,
  value: string,
  opts: { fromImage?: boolean; forceInclude?: boolean },
): IngestReviewRow {
  const missing = !value.trim();
  const needs = !missing && (field === "offer" || isRiskyClaim(value));
  return {
    id: uid("row"),
    field,
    value,
    targetStage: INGEST_FIELD_META[field].stage,
    include: opts.forceInclude ?? !missing,
    needsClaimConfirm: needs,
    claimsAllowed: false,
    fromImage: Boolean(opts.fromImage),
    missing,
  };
}

const ALWAYS_SHOW: IngestFieldId[] = [
  "businessName",
  "location",
  "whatsapp",
  "clinicHours",
  "website",
  "operatingModel",
  "audience",
  "biggestProblem",
  "mainGoal",
  "uniqueAdvantage",
  "brandTone",
  "brandPositioning",
  "channelNotes",
  "whatsappTemplates",
  "landingLines",
];

export function rowsFromExtracted(
  extracted: Partial<Record<IngestFieldId, string>>,
  fromImage: boolean,
): IngestReviewRow[] {
  const fields = new Set<IngestFieldId>([...ALWAYS_SHOW, ...(Object.keys(extracted) as IngestFieldId[])]);
  const order = Object.keys(INGEST_FIELD_META) as IngestFieldId[];
  return order
    .filter((f) => fields.has(f))
    .map((f) => rowFor(f, extracted[f] ?? "", { fromImage }));
}

async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const data = new Uint8Array(await file.arrayBuffer());
  const loading = pdfjs.getDocument({ data, isEvalSupported: false, useSystemFonts: true });
  const doc = await loading.promise;
  const parts: string[] = [];
  const max = Math.min(doc.numPages, 24);
  for (let i = 1; i <= max; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const line = content.items
      .map((item) => ("str" in item ? String((item as { str: string }).str) : ""))
      .filter(Boolean)
      .join(" ");
    if (line.trim()) parts.push(line.trim());
  }
  doc.destroy();
  return parts.join("\n");
}

async function extractDocxText(file: File): Promise<string> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const xml = await zip.file("word/document.xml")?.async("string");
  if (!xml) return "";
  return xml
    .replace(/<w:tab[^/]*\/>/g, "\t")
    .replace(/<w:br[^/]*\/>/g, "\n")
    .replace(/<w:p[ >]/g, "\n<p ")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function extractFileText(file: File, kind: IngestDocKind): Promise<string> {
  if (kind === "image") return "";
  if (kind === "txt") return (await file.text()).slice(0, 80_000);
  if (kind === "pdf") return (await extractPdfText(file)).slice(0, 80_000);
  if (kind === "docx") return (await extractDocxText(file)).slice(0, 80_000);
  return "";
}

function tagsFor(kind: IngestDocKind, filename: string, extracted: Partial<Record<IngestFieldId, string>>): IngestTag[] {
  const tags: IngestTag[] = [];
  if (looksLikeAd(`${extracted.pastHeadline ?? ""} ${extracted.pastBody ?? ""}`, filename) || extracted.pastHeadline) {
    tags.push("past_creative");
  }
  if (extracted.businessName || extracted.whatsapp || extracted.location) tags.push("identity");
  if (extracted.brandTone || extracted.brandPositioning || extracted.uniqueAdvantage) tags.push("branding");
  if (extracted.channelNotes) tags.push("media_plan");
  if (extracted.whatsappTemplates || extracted.landingLines) tags.push("leads");
  if (!tags.length) tags.push("other");
  return tags;
}

export async function prepareDocument(file: File): Promise<IngestPrepareResult> {
  const classified = classifyDocument(file);
  if (classified.kind === null) {
    const err = new Error(classified.reason);
    err.name = classified.reason === "size" ? "DocSizeError" : "DocTypeError";
    throw err;
  }
  const kind = classified.kind;
  const extraAssets: MediaAssetMeta[] = [];
  let assetId: string | undefined;
  if (kind === "image") {
    const meta = await ingestFile(file);
    meta.label = guessLogoLabel(file.name);
    extraAssets.push(meta);
    assetId = meta.id;
  }
  const rawText = await extractFileText(file, kind);
  const extracted = rawText ? extractFieldsFromText(rawText, file.name) : {};
  const imageNeedsTypedText = kind === "image" && !rawText.trim();
  const rows = rowsFromExtracted(extracted, kind === "image");
  const doc: IngestedDocument = {
    id: uid("doc"),
    name: file.name,
    mime: file.type || "",
    size: file.size,
    kind,
    tags: tagsFor(kind, file.name, extracted),
    excerpt: clip(rawText, 800),
    createdAt: new Date().toISOString(),
    assetId,
  };
  if (doc.tags.includes("past_creative") === false && looksLikeAd(rawText, file.name)) {
    doc.tags = [...doc.tags.filter((t) => t !== "other"), "past_creative"];
  }
  return { doc, rows, extraAssets, rawText, imageNeedsTypedText };
}

export function reextractFromTypedText(
  typed: string,
  filename: string,
  existing: IngestReviewRow[],
): IngestReviewRow[] {
  const extracted = extractFieldsFromText(typed, filename);
  const next = rowsFromExtracted(extracted, true);
  const byField = new Map(existing.map((r) => [r.field, r]));
  return next.map((r) => {
    const prev = byField.get(r.field);
    if (!prev) return r;
    if (prev.value.trim() && !r.value.trim()) return prev;
    return { ...r, id: prev.id };
  });
}

function appendUnique(base: string, add: string): string {
  const a = add.trim();
  if (!a) return base;
  if (!base.trim()) return a;
  if (base.includes(a)) return base;
  return `${base.trim()}\n${a}`;
}

export function applyIngestReview(
  intake: Intake,
  rows: IngestReviewRow[],
  doc: IngestedDocument,
  extraAssets: MediaAssetMeta[],
  extraPastPosts: { text: string; image?: string }[] = [],
): Intake {
  // URL ingest replaces the previous business. Empty HITL rows must not keep clinic demo leftovers.
  const base = doc.kind === "url" ? emptyIntake() : intake;
  let next: Intake = {
    ...base,
    mediaAssets: [...(base.mediaAssets ?? [])],
    ingestedDocs: [...(base.ingestedDocs ?? [])],
    pastCreatives: [...(base.pastCreatives ?? [])],
  };

  const take = (field: IngestFieldId): IngestReviewRow | undefined =>
    rows.find((r) => r.field === field && r.include && r.value.trim() && !r.missing);

  const allowed = (row: IngestReviewRow): boolean => {
    if (!row.needsClaimConfirm) return true;
    // URL HITL confirm-as-is: included page rows stay (checkbox still shown).
    if (doc.kind === "url") return true;
    return row.claimsAllowed;
  };

  const name = take("businessName");
  if (name && allowed(name)) next.businessName = name.value.trim();
  const loc = take("location");
  if (loc && allowed(loc)) next.location = loc.value.trim();
  const wa = take("whatsapp");
  if (wa && allowed(wa)) next.whatsapp = wa.value.trim();
  const hours = take("clinicHours");
  if (hours && allowed(hours)) next.clinicHours = hours.value.trim();
  const site = take("website");
  if (site && allowed(site)) next.website = site.value.trim();
  const cat = take("category");
  if (cat && allowed(cat)) next.category = cat.value.trim();
  const desc = take("description");
  if (desc && allowed(desc)) next.description = desc.value.trim();

  const modelRow = take("operatingModel");
  if (modelRow && allowed(modelRow) && !isPediatricDemo(next)) {
    const v = modelRow.value.trim();
    if (v === "free_service" || /שירות חינם|خدمة مجانية|free[_\s-]?service/i.test(v)) {
      next = applyOperatingModel(next, "free_service");
    } else if (v === "paid" || /בתשלום|مدفوع|^paid$/i.test(v)) {
      next = applyOperatingModel(next, "paid");
    }
  }
  if (isPediatricDemo(next)) next = applyOperatingModel(next, "free_service");

  const kupaF = take("kupaFileBy");
  if (kupaF && allowed(kupaF)) next.kupaFileBy = kupaF.value.trim();
  const kupaM = take("kupaMemberFrom");
  if (kupaM && allowed(kupaM)) next.kupaMemberFrom = kupaM.value.trim();

  const aud = take("audience");
  if (aud && allowed(aud)) {
    const m = matchChip(aud.value, AUDIENCE_CHIPS);
    next.audience = m.id;
    next.audienceCustom = m.custom;
  }
  const prob = take("biggestProblem");
  if (prob && allowed(prob)) {
    const m = matchChip(prob.value, PROBLEM_CHIPS);
    next.biggestProblem = m.id;
    next.problemCustom = m.custom;
  }
  const goal = take("mainGoal");
  if (goal && allowed(goal)) {
    const m = matchChip(goal.value, GOAL_CHIPS);
    next.mainGoal = m.id;
    next.goalCustom = m.custom;
    if (isFreeService(next)) {
      next.mainGoal = coerceGoalForFreeService(next.mainGoal, /walk-?in|جت أولاً|סדר הגעה/.test(next.clinicHours));
      if (next.mainGoal === "walk_in" || next.mainGoal === "exposure" || next.mainGoal === "awareness" || next.mainGoal === "enrollment") {
        next.goalCustom = false;
      }
    }
  }
  const adv = take("uniqueAdvantage");
  if (adv && allowed(adv)) {
    const m = matchChip(adv.value, ADVANTAGE_CHIPS);
    next.uniqueAdvantage = m.id;
    next.advantageCustom = m.custom;
  }

  const tone = take("brandTone");
  if (tone && allowed(tone)) next.brandTone = tone.value.trim();
  const pos = take("brandPositioning");
  if (pos && allowed(pos)) next.brandPositioning = pos.value.trim();
  const ch = take("channelNotes");
  if (ch && allowed(ch)) next.channelNotes = appendUnique(next.channelNotes, ch.value);
  const waTpl = take("whatsappTemplates");
  if (waTpl && allowed(waTpl)) next.whatsappTemplates = appendUnique(next.whatsappTemplates, waTpl.value);
  const land = take("landingLines");
  if (land && allowed(land)) next.landingLines = appendUnique(next.landingLines, land.value);

  const offer = take("offer");
  if (offer && allowed(offer) && !isFreeService(next)) {
    next.offer = offer.value.trim();
    next.offerCustom = true;
  }

  const h = take("pastHeadline");
  const b = take("pastBody");
  const c = take("pastCta");
  if (h || b || c) {
    const confirmed = [h, b, c].some((r) => r && r.needsClaimConfirm && r.claimsAllowed);
    const risky = [h, b, c].some((r) => r && r.needsClaimConfirm);
    next.pastCreatives = [
      {
        id: uid("past"),
        sourceDocId: doc.id,
        sourceName: doc.name,
        headline: h?.value.trim() ?? "",
        body: b?.value.trim() ?? "",
        cta: c?.value.trim() ?? "",
        tag: "past_creative",
        confirmedReal: Boolean(confirmed || !risky),
      },
      ...next.pastCreatives,
    ];
    const blob = [h?.value, b?.value, c?.value].filter(Boolean).join("\n");
    next.pastAds = appendUnique(next.pastAds, `past_creative · ${doc.name}\n${blob}`);
    if (!doc.tags.includes("past_creative")) doc.tags = [...doc.tags, "past_creative"];
  }

  const extra = extraPastPosts.filter((p) => String(p.text || "").trim()).slice(0, 12);
  if (extra.length) {
    const added: PastCreative[] = extra.map((p, i) => {
      const raw = p.text.replace(/\s+/g, " ").trim();
      const sentence = raw.split(/(?<=[.!?。؟!])\s+/)[0] || raw;
      const headline = sentence.slice(0, 80).trim();
      return {
        id: uid(`past${i}`),
        sourceDocId: doc.id,
        sourceName: doc.name,
        headline,
        body: raw,
        cta: "",
        tag: "past_creative" as const,
        confirmedReal: true,
      };
    });
    next.pastCreatives = [...added, ...next.pastCreatives].slice(0, 12);
    next.pastAds = appendUnique(next.pastAds, extra.map((p) => p.text.trim()).join("\n"));
    if (!doc.tags.includes("past_creative")) doc.tags = [...doc.tags, "past_creative"];
  }

  if (extraAssets.length) {
    next.mediaAssets = [...next.mediaAssets, ...extraAssets];
  }
  next.ingestedDocs = [doc, ...next.ingestedDocs.filter((d) => d.id !== doc.id)];
  if (doc.kind === "url") {
    const v = detectVertical(next);
    if (v === "product") next.type = "product";
    else next.type = "business";
  }
  return next;
}

export function pastCreativesOf(intake: Intake | undefined | null): PastCreative[] {
  return Array.isArray(intake?.pastCreatives) ? intake!.pastCreatives : [];
}
