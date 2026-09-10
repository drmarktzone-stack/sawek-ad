/**
 * Campaign-critical intake prefill from published site evidence.
 * Does not invent ROAS, prices, or clinic leftovers. Empty stays empty when
 * there is no category/page signal.
 */
import type { IngestFieldId } from "./document-ingest";
import { detectVertical, isPlasticAestheticClinic, PLASTIC_AESTHETIC_RE } from "./vertical";
import { resolveOperatingNiche } from "./operating-niche";
import { HOSPITAL_OR_DEPT_RE, extractPostalAddressFromText, cleanLocationValue, isUnknownSentinel, attachEvidencedCity, evidencedCityFromText } from "./scan-truth/patterns";

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
  /שתל|תותב|כתר|אסתטיקה דנטלית|שחזור|השתל|implant|crown|veneer|zirconia|זירקוניה|مزرعة|تاج|تجميل الأنف|rhinoplast|تكبير الثدي|تشكيل الجسم|تجميل الوجه|ניתוח אף|הגדלת חזה/;

/** Published plastic / aesthetic phrases — only kept when the page actually contains them. */
const PUBLISHED_PLASTIC_SERVICES = [
  "جراحة تجميل الأنف",
  "عملية تجميل الأنف",
  "عمليات تجميل الوجه",
  "عمليات تشكيل الجسم",
  "تكبير الثدي",
  "شد الثدي",
  "تصغير الثدي",
  "زرعات خفيفة الوزن",
  "B-Lite",
  "B-LITE",
  "ניתוח אף",
  "הגדלת חזה",
  "הקטנת חזה",
  "מתיחת פנים",
];

/** Published Halloun / dental phrases — only kept when the page actually contains them. */
const PUBLISHED_DENTAL_SERVICES = [
  "השתלות שיניים ביום אחד",
  "השתלות שיניים ממוחשבות",
  "השתלת שיניים למחוסרי עצם",
  "השתלות עצם",
  "הרמת סינוס",
  "שתלים מזרקוניה",
  "תותבות על גבי שתלים",
  "כתרים על גבי שתלים",
  "כתרים מזרקוניה",
  "ציפוי חרסינה",
  "שחזורים אסתטיים",
  "אסתטיקה דנטלית",
  "טיפולי שיניים בהרדמה כללית",
];

function serviceHeadings(corpus: string): string[] {
  const text = String(corpus || "");
  const out: string[] = [];
  const flat = text.replace(/\s+/g, " ");
  for (const phrase of [...PUBLISHED_PLASTIC_SERVICES, ...PUBLISHED_DENTAL_SERVICES]) {
    if (flat.includes(phrase) && !out.includes(phrase)) out.push(phrase);
  }
  const chunks = text.split(/\n+|<br\s*\/?>|·|\u00b7/i);
  for (const line of chunks) {
    const s = stripHeadingPrefix(line.replace(/\s+/g, " ").trim());
    if (s.length < 4 || s.length > 80) continue;
    if (!SERVICE_HEADING_RE.test(s)) continue;
    if (/השאירו|התקשרו|whatsapp|לפרטים/i.test(s)) continue;
    if (!out.includes(s)) out.push(s);
    if (out.length >= 8) break;
  }
  return out.slice(0, 8);
}

function cityFromLocation(location: string, corpus = ""): string {
  const loc = String(location || "").trim();
  const fromLoc = evidencedCityFromText(loc);
  if (fromLoc) return fromLoc;
  const comma = loc.match(/[,،]\s*([א-ת\u0600-\u06FFA-Za-z][א-ת\u0600-\u06FFA-Za-z\s-]{1,24})\s*$/);
  if (comma?.[1] && evidencedCityFromText(comma[1])) return comma[1].trim();
  return evidencedCityFromText(corpus);
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
    if (cleaned) out.location = attachEvidencedCity(cleaned, `${out.location}\n${corpus}`);
  }
  if (!has(out, "location")) {
    const fromCorpus = extractPostalAddressFromText(corpus);
    if (fromCorpus) out.location = attachEvidencedCity(fromCorpus, corpus);
  } else if (has(out, "location")) {
    out.location = attachEvidencedCity(String(out.location), `${out.location}\n${corpus}`);
  }

  const hay = `${name} ${out.category || ""} ${out.description || ""} ${corpus}`;
  const namedHospital = HOSPITAL_OR_DEPT_RE.test(`${name} ${out.category || ""}`);
  const plastic = PLASTIC_AESTHETIC_RE.test(hay) || isPlasticAestheticClinic({
    businessName: name,
    category: out.category || "",
    description: out.description || "",
  });
  const hospitalSystem = namedHospital && !DENTAL_RE.test(hay) && !plastic && !GROCERY_RE.test(hay);
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
  const clinic = niche === "medical_clinic" || vertical === "clinic" || DENTAL_RE.test(hay) || plastic;

  if (grocery && !has(out, "category")) {
    out.category = /GroceryStore/i.test(hay) ? "GroceryStore" : "سوبر ماركت";
  }
  if (clinic && DENTAL_RE.test(hay) && (!has(out, "category") || /MedicalClinic|Physician|LocalBusiness/i.test(String(out.category || "")))) {
    out.category = "מרפאת שיניים";
  } else if (clinic && plastic && (!has(out, "category") || /MedicalClinic|Physician|LocalBusiness/i.test(String(out.category || "")))) {
    out.category = /[\u0600-\u06FF]/.test(hay) ? "جراح تجميل" : /[\u0590-\u05FF]/.test(hay) ? "כירורגיה פלסטית" : "Plastic surgery";
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
      const city = cityFromLocation(out.location || "", hay);
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

  if (services.length) {
    const existing = String(out.landingLines || "");
    const extra = services.filter((s) => !existing.includes(s));
    if (!has(out, "landingLines")) out.landingLines = clip(services.slice(0, 5).join(" · "), 400);
    else if (extra.length) out.landingLines = clip([existing, ...extra.slice(0, 4)].join(" · "), 400);
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
