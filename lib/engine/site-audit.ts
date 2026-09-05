import type { Intake, Locale, SiteAudit, SiteAuditItem } from "../types";
import { filled } from "../utils";
import { isNoOffer } from "../no-offer";
import { isFreeService } from "../operating-model";
import { isClonedAdvantage, isUnknownProblem, isWeakAudience } from "./coach";
import { waMeDigits } from "../channel-copy";
import { isJunkUiText } from "../document-ingest";

const L = (he: string, ar: string, en: string): Record<Locale, string> => ({ he, ar, en });

function ev(field: string, value: string): Record<Locale, string> {
  const shown = value.trim() || "—";
  return L(`ראיה · ${field}: ${shown}`, `دليل · ${field}: ${shown}`, `Evidence · ${field}: ${shown}`);
}

const HE = /[\u0590-\u05FF]/;
const AR = /[\u0600-\u06FF]/;
const JUNK_LEFTOVER = /איפוס סיסמה|password-reset|forgot password|cookie policy|woocommerce|כל הזכויות שמורות\s*$/i;

export function buildSiteAudit(intake: Intake): SiteAudit {
  const strengths: SiteAuditItem[] = [];
  const weaknesses: SiteAuditItem[] = [];
  const photos = (intake.mediaAssets ?? []).filter((m) => m.kind === "image");
  const heroPhotos = photos.filter((m) => m.label !== "logo");
  const phone = intake.whatsapp.trim();
  const hasWa = Boolean(waMeDigits(phone));
  const loc = intake.location.trim();
  const hours = intake.clinicHours.trim();
  const desc = intake.description.trim();
  const offer = intake.offer.trim();
  const ctaBits = `${intake.landingLines} ${intake.whatsappTemplates} ${intake.mainGoal}`;
  const hasCta = Boolean(hasWa || /whatsapp|וואטסאפ|واتساب|צור קשר|contact|call|התקשרו|הזמנ/i.test(ctaBits));
  const blob = `${intake.businessName} ${desc} ${intake.brandPositioning} ${intake.uniqueAdvantage}`;
  const hasHe = HE.test(blob);
  const hasAr = AR.test(blob);
  const name = intake.businessName.trim();

  if (hasWa) {
    strengths.push({
      id: "phone",
      kind: "strength",
      label: L("יש טלפון / וואטסאפ שאפשר לפתוח", "في هاتف / واتساب ممكن ينفتح", "Phone / WhatsApp that can actually open"),
      evidence: ev("whatsapp", phone),
    });
  }
  if (hours) {
    strengths.push({
      id: "hours",
      kind: "strength",
      label: L("שעות / אופן הגעה כתובים באתר", "ساعات / طريقة الوصول مكتوبة بالموقع", "Hours / how-to-arrive are on the site"),
      evidence: L("ראיה · שעות קבלה מהאתר — פירוט בכרטיסים", "دليل · ساعات الدوام من الموقع — التفصيل بالبطاقات", "Evidence · clinic hours from the site — details as chips"),
    });
  }
  if (heroPhotos.length) {
    strengths.push({
      id: "photos",
      kind: "strength",
      label: L(`יש ${heroPhotos.length} תמונות מהאתר — אפשר לשים במודעה ובנחיתה`, `في ${heroPhotos.length} صور من الموقع — منستعملها بالإعلان والهبوط`, `${heroPhotos.length} photos from the site — usable in ads and the landing`),
      evidence: ev("mediaAssets", String(heroPhotos.length)),
    });
  }
  if (!isNoOffer(offer) && !isFreeService(intake)) {
    strengths.push({
      id: "offer",
      kind: "strength",
      label: L("יש מבצע שפורסם באתר — נשתמש בו כמו שהוא", "في عرض منشور بالموقع — منستعمله كما هو", "An on-site offer is published — use it as written"),
      evidence: ev("offer", offer),
    });
  }
  if (loc) {
    strengths.push({
      id: "address",
      kind: "strength",
      label: L("כתובת מקומית ברורה", "عنوان محلي واضح", "Clear local address"),
      evidence: ev("location", loc),
    });
  }
  if (hasHe || hasAr) {
    strengths.push({
      id: "lang",
      kind: "strength",
      label: L(
        hasHe && hasAr ? "האתר מדבר עברית וערבית — שתי השפות שוות בקמפיין" : hasHe ? "יש עברית באתר" : "יש ערבית באתר",
        hasHe && hasAr ? "الموقع بالعبرية والعربية — اللغتان متساويتان بالحملة" : hasAr ? "في عربي بالموقع" : "في عبرية بالموقع",
        hasHe && hasAr ? "The site speaks Hebrew and Arabic — both languages are first-class" : hasHe ? "Hebrew is on the site" : "Arabic is on the site",
      ),
      evidence: ev("language", hasHe && hasAr ? "he+ar" : hasHe ? "he" : "ar"),
    });
  }
  if (filled(intake.uniqueAdvantage) && !isClonedAdvantage(intake)) {
    strengths.push({
      id: "advantage",
      kind: "strength",
      label: L("יתרון אחד חד יותר מהתיאור", "ميزة واحدة أحدّ من الوصف", "One advantage tighter than the description"),
      evidence: ev("uniqueAdvantage", intake.uniqueAdvantage),
    });
  }
  if (hasCta && hasWa) {
    strengths.push({
      id: "cta",
      kind: "strength",
      label: L("יש CTA אמיתי לוואטסאפ / טלפון", "في نداء حقيقي لواتساب / هاتف", "A real CTA to WhatsApp / phone"),
      evidence: ev("cta", phone),
    });
  }

  if (!hasWa) {
    weaknesses.push({
      id: "no-wa",
      kind: "weakness",
      label: L("אין וואטסאפ / טלפון על האתר — wa.me לא ייפתח", "ما في واتساب / هاتف عالموقع — wa.me ما بينفتح", "No WhatsApp / phone on the site — wa.me will not open"),
      evidence: ev("whatsapp", phone),
    });
  }
  if (!hasCta) {
    weaknesses.push({
      id: "no-cta",
      kind: "weakness",
      label: L("אין קריאה לפעולה ברורה", "ما في نداء واضح", "No clear call to action"),
      evidence: ev("landingLines", intake.landingLines || "—"),
    });
  }
  if (!name || name.length < 3 || /^home|ראשי|الرئيسية$/i.test(name)) {
    weaknesses.push({
      id: "generic-h1",
      kind: "weakness",
      label: L("שם / H1 כללי — המודעה לא תישמע שייכת לעסק", "اسم / H1 عام — الإعلان ما بيبين يخص الشغل", "Generic name / H1 — the ad will not sound like it belongs to this business"),
      evidence: ev("businessName", name),
    });
  }
  if (isNoOffer(offer) && !isFreeService(intake)) {
    weaknesses.push({
      id: "no-offer",
      kind: "weakness",
      label: L("אין מבצע באתר — לא נמציא הנחה", "ما في عرض بالموقع — مش رح نخترع خصم", "No offer on the site — we will not invent a discount"),
      evidence: ev("offer", offer || "no_offer"),
    });
  }
  if (!heroPhotos.length) {
    weaknesses.push({
      id: "no-photos",
      kind: "weakness",
      label: L(
        photos.length
          ? "יש לוגו בלבד — חסרה תמונת מקום/מוצר לנושא. מציעים כרזות או תמונת AI לפי התחום."
          : "אין תמונות מהאתר — אפשר להציע כרזות גרפיות או תמונת AI",
        photos.length
          ? "في شعار بس — ناقصة صورة مكان/منتج للموضوع. منقترح ملصقات أو صورة ذكاء حسب المجال."
          : "ما في صور من الموقع — فينا نقترح ملصقات غرافيك أو صورة ذكاء اصطناعي",
        photos.length
          ? "Logo only — missing an on-topic place/product photo. Offering graphics or an AI still for the vertical."
          : "No photos from the site — offer graphic posters or an AI still",
      ),
      evidence: ev("mediaAssets", String(heroPhotos.length)),
    });
  }
  if (!desc || desc.length < 40) {
    weaknesses.push({
      id: "weak-about",
      kind: "weakness",
      label: L("אודות דל — חסר משפט שמסביר מה העסק עושה", "عن ضعيف — ناقصة جملة بتشرح شو الشغل", "Thin about — missing a sentence that says what the business does"),
      evidence: ev("description", desc),
    });
  }
  if (!loc && intake.type !== "app") {
    weaknesses.push({
      id: "buried-contact",
      kind: "weakness",
      label: L("כתובת לא נמצאה — מגע מקומי קבור או חסר", "العنوان ما انوجد — تواصل محلي مدفون أو ناقص", "Address not found — local contact is buried or missing"),
      evidence: ev("location", loc),
    });
  }
  if (isUnknownProblem(intake)) {
    weaknesses.push({
      id: "unknown-problem",
      kind: "weakness",
      label: L("הבעיה ריקה / «לא מכירים» — הוק בלי כאב ספציפי", "المشكلة فاضية / «مش عارفين» — خطاف بلا ألم محدد", "Problem empty / “unknown” — a hook without a specific pain"),
      evidence: ev("biggestProblem", intake.biggestProblem),
    });
  }
  if (isClonedAdvantage(intake)) {
    weaknesses.push({
      id: "cloned-advantage",
      kind: "weakness",
      label: L("היתרון מועתק מהתיאור — זו חזרה, לא יתרון", "الميزة منسوخة من الوصف — تكرار مش ميزة", "Advantage cloned from the description — a repeat, not an edge"),
      evidence: ev("uniqueAdvantage", intake.uniqueAdvantage),
    });
  }
  if (isWeakAudience(intake)) {
    weaknesses.push({
      id: "weak-audience",
      kind: "weakness",
      label: L("קהל חלש או «כולם»", "جمهور ضعيف أو «الجميع»", "Audience is weak or “everyone”"),
      evidence: ev("audience", intake.audience),
    });
  }
  const leftoverHay = `${desc} ${intake.biggestProblem} ${intake.uniqueAdvantage}`;
  if (JUNK_LEFTOVER.test(leftoverHay) || isJunkUiText(intake.biggestProblem)) {
    weaknesses.push({
      id: "junk-leftover",
      kind: "weakness",
      label: L("נשארה ג׳אנק (כניסה / קוקי / שאריות) — לנקות לפני פרסום", "بقي جنك (دخول / كوكي / بقايا) — تنظيف قبل النشر", "Junk leftover (login / cookie / residue) — clean before publish"),
      evidence: ev("leftover", leftoverHay.slice(0, 160)),
    });
  }

  return {
    strengths: strengths.slice(0, 8),
    weaknesses: weaknesses.slice(0, 8),
  };
}
