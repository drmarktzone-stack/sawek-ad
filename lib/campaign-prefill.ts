/**
 * Campaign-critical intake prefill from published site evidence.
 * Does not invent ROAS, prices, or clinic leftovers. Empty stays empty when
 * there is no category/page signal.
 */
import type { IngestFieldId } from "./document-ingest";
import { detectVertical } from "./vertical";
import { resolveOperatingNiche } from "./operating-niche";
import { HOSPITAL_OR_DEPT_RE, extractPostalAddressFromText, cleanLocationValue, isUnknownSentinel } from "./scan-truth/patterns";

type Fields = Partial<Record<IngestFieldId, string>>;

const GROCERY_RE =
  /سوبر\s*ماركت|سوبرماركت|مقاضي|بقالة|מכולת|סופרמרקט|\bgrocery\b|\bsupermarket\b|grocerystore|بيض\s*[،,]\s*حليب/i;

const DEPT_LINE_RE =
  /بيض|حليب|أجبان|مشروبات|شيبس|كعك|بقوليات|مخللات|مكسرات|قهوه|مثلجات|تنظيف|مستلزمات|خبز|بهارات|لحوم/i;

function clip(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return t.slice(0, max).trim();
}

function has(fields: Fields, key: IngestFieldId): boolean {
  return Boolean(String(fields[key] || "").trim());
}

export function isGroceryBusiness(fields: Fields, corpus = ""): boolean {
  const blob = `${fields.businessName || ""} ${fields.category || ""} ${fields.description || ""} ${corpus}`;
  return GROCERY_RE.test(blob);
}

export function isErrorPageTitle(value: string): boolean {
  const v = String(value || "").replace(/\s+/g, " ").trim();
  if (!v) return false;
  return /^(?:404|403|500|503)(?:\s+not\s+found)?$|^not\s+found$|^404\s+not\s+found$|^page\s+not\s+found$|^just\s+a\s+moment|^attention\s+required$|^access\s+denied$|^error$/i.test(
    v,
  );
}

export function isPlaceholderPhone(value: string): boolean {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length < 8) return true;
  if (/^0?1234567890?$/.test(digits)) return true;
  if (/^(\d)\1{7,}$/.test(digits)) return true;
  if (/^0+$/.test(digits)) return true;
  return false;
}

function stripHeadingPrefix(s: string): string {
  return s.replace(/^(?:H[1-6]|title|CTA|slogan)\s*[:：]\s*/i, "").trim();
}

function departmentLines(corpus: string): string[] {
  const out: string[] = [];
  for (const line of String(corpus || "").split(/\n+/)) {
    const s = stripHeadingPrefix(line.replace(/\s+/g, " ").trim());
    if (s.length < 4 || s.length > 80) continue;
    if (!DEPT_LINE_RE.test(s)) continue;
    if (/عرض كل|السلة|المفضلة|الرئيسية|arrow|search/i.test(s)) continue;
    if (!out.includes(s)) out.push(s);
    if (out.length >= 8) break;
  }
  const listed = out.filter((s) => /[،,]/.test(s));
  return listed.length ? listed : out;
}

const DENTAL_RE = /מרפאת שיניים|רופא שיניים|השתלות שיניים|אסתטיקה דנטלית|عيادة أسنان|\bdentist\b|\bdental\b|أسنان/;
const CLINIC_TAGLINE_RE = /המרכז ל[^\n.]{4,80}|المركز(?:\s+ل)?[^\n.]{4,80}/;
const SERVICE_HEADING_RE =
  /שתל|תותב|כתר|אסתטיקה דנטלית|שחזור|השתל|implant|crown|veneer|zirconia|זירקוניה|مزرعة|تاج/;

function serviceHeadings(corpus: string): string[] {
  const out: string[] = [];
  for (const line of String(corpus || "").split(/\n+/)) {
    const s = stripHeadingPrefix(line.replace(/\s+/g, " ").trim());
    if (s.length < 4 || s.length > 80) continue;
    if (!SERVICE_HEADING_RE.test(s)) continue;
    if (/השאירו|התקשרו|whatsapp|לפרטים/i.test(s)) continue;
    if (!out.includes(s)) out.push(s);
    if (out.length >= 6) break;
  }
  return out;
}

function cityFromLocation(location: string): string {
  const loc = String(location || "").trim();
  const comma = loc.match(/,\s*([א-ת\u0600-\u06FFA-Za-z]{3,20})\s*$/);
  return comma?.[1] || "";
}

/**
 * Fill empty wizard-required fields from category + page copy so diagnosis can run.
 * Red required fields stay required — they are prefilled, not skipped.
 */
export function prefillCampaignFields(fields: Fields, corpus = ""): Fields {
  const out: Fields = { ...fields };
  const name = String(out.businessName || "").trim();
  if (!name || isErrorPageTitle(name)) return out;

  if (out.location) {
    const cleaned = cleanLocationValue(out.location) || extractPostalAddressFromText(`${out.location}\n${corpus}`);
    if (cleaned) out.location = cleaned;
  }
  if (!has(out, "location")) {
    const fromCorpus = extractPostalAddressFromText(corpus);
    if (fromCorpus) out.location = fromCorpus;
  }

  const hay = `${name} ${out.category || ""} ${out.description || ""} ${corpus}`;
  const hospitalSystem = HOSPITAL_OR_DEPT_RE.test(hay) && !DENTAL_RE.test(hay) && !GROCERY_RE.test(hay);
  if (hospitalSystem) return out;

  const vertical = detectVertical({
    businessName: name,
    category: out.category || "",
    description: out.description || "",
  });
  const niche = resolveOperatingNiche({
    businessName: name,
    category: out.category || "",
    description: out.description || "",
  });
  const grocery = isGroceryBusiness(out, corpus) || vertical === "retail";
  const depts = departmentLines(corpus);
  const services = serviceHeadings(corpus);
  const clinic = niche === "medical_clinic" || vertical === "clinic" || DENTAL_RE.test(hay);

  if (grocery && !has(out, "category")) {
    out.category = /GroceryStore/i.test(hay) ? "GroceryStore" : "سوبر ماركت";
  }
  if (clinic && DENTAL_RE.test(hay) && (!has(out, "category") || /MedicalClinic|Physician|LocalBusiness/i.test(String(out.category || "")))) {
    out.category = "מרפאת שיניים";
  } else if (clinic && !has(out, "category")) {
    out.category = "MedicalClinic";
  }

  if (!has(out, "description")) {
    if (depts.length) out.description = clip(depts.slice(0, 4).join(" · "), 220);
    else if (services.length) out.description = clip(services.slice(0, 4).join(" · "), 220);
    else if (grocery) out.description = clip(`${name} — سوبر ماركت محلي`, 160);
  }

  if (!has(out, "audience")) {
    if (niche === "home_trades") out.audience = "homeowners";
    else if (niche === "fitness_studio") out.audience = "young";
    else if (niche === "education") out.audience = "parents";
    else if (clinic) {
      const city = cityFromLocation(out.location || "");
      const he = /[\u0590-\u05FF]/.test(hay);
      const ar = /[\u0600-\u06FF]/.test(hay);
      if (city && he && ar) out.audience = `מטופלים ב${city} · עברית וערבית`;
      else if (city) out.audience = `מטופלים ב${city}`;
      else if (he && ar) out.audience = "hebrew,arabic";
    } else if (grocery || vertical === "generic" || vertical === "restaurant" || niche === "restaurant") {
      out.audience = "local_families";
    }
  }

  if (isUnknownSentinel(String(out.biggestProblem || "")) || /^(unknown|unknown problem)$/i.test(String(out.biggestProblem || ""))) {
    out.biggestProblem = "unknown";
  } else if (!has(out, "biggestProblem") && (clinic || grocery)) {
    // Awareness chip — catalog id, not invented prose. Empty pain stays unknown.
    out.biggestProblem = "unknown";
  }

  if (!has(out, "landingLines") && services.length) {
    out.landingLines = clip(services.slice(0, 5).join(" · "), 400);
  }

  if (!has(out, "uniqueAdvantage") || out.uniqueAdvantage === out.description) {
    const tagline = hay.match(CLINIC_TAGLINE_RE)?.[0]?.replace(/\s+/g, " ").trim() || "";
    const adv =
      (tagline && tagline !== out.description ? tagline : "") ||
      (services.length ? services.slice(0, 3).join(" · ") : "") ||
      depts.find((d) => /بيض|حليب|أجبان|خبز|فريش/i.test(d)) ||
      depts[0] ||
      (grocery ? "تموين البيت من قسم واحد: طازج، جاف، ومستلزمات" : "");
    if (adv && adv !== out.description) out.uniqueAdvantage = clip(adv, 160);
  }

  if (!has(out, "brandPositioning") && clinic) {
    const tagline = hay.match(CLINIC_TAGLINE_RE)?.[0]?.replace(/\s+/g, " ").trim() || "";
    if (tagline && tagline !== name) out.brandPositioning = clip(tagline, 160);
  }

  if (!has(out, "mainGoal")) {
    if (clinic) out.mainGoal = "leads";
    else out.mainGoal = grocery || vertical === "restaurant" ? "sales" : "leads";
  }

  if (!has(out, "brandTone")) {
    const ar = /[\u0600-\u06FF]/.test(hay);
    if (ar) {
      out.brandTone = "لهجة فلسطينية بيتيّة، دافية، بلا فصحى ثقيلة وبلا إنجليزي";
    }
  }

  if (grocery && !has(out, "brandPositioning") && name) {
    out.brandPositioning = clip(`${name} — تموين البيت للمنطقة`, 160);
  }

  return out;
}
