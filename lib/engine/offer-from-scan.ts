/**
 * Build a Hormozi-style offer from evidenced scan facts only.
 * Never invent prices, discounts, or medical timelines.
 * If price is unpublished, package-frame the named services and CTA WhatsApp / call.
 */
import type { Intake, Locale } from "../types";
import { isNoOffer } from "../no-offer";
import { generateOfferBlueprint, type OfferBuilderInput } from "./offer-builder";

export const DENTAL_FACT_RE =
  /מרפאת שיניים|רופא שיניים|השתלות|אסתטיקה דנטל|שתל|זירקוניה|عيادة أسنان|طبيب أسنان|أسنان|تجميل الأسنان|زراعة|zirconia|\bimplant|\bdental\b|\bdentist\b/i;

function clip(s: string, n: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= n) return t;
  return `${t.slice(0, n - 1).trim()}…`;
}

function hay(intake: Intake): string {
  return [
    intake.businessName,
    intake.category,
    intake.description,
    intake.uniqueAdvantage,
    intake.landingLines,
    intake.brandPositioning,
  ]
    .filter(Boolean)
    .join(" ");
}

export function isDentalScan(intake: Intake): boolean {
  return DENTAL_FACT_RE.test(hay(intake));
}

function servicesLine(intake: Intake): string {
  const parts = [intake.landingLines, intake.uniqueAdvantage, intake.brandPositioning, intake.description]
    .map((s) => String(s || "").replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const uniq: string[] = [];
  for (const p of parts) {
    if (!uniq.some((u) => u === p || u.includes(p) || p.includes(u))) uniq.push(p);
  }
  return clip(uniq.slice(0, 3).join(" · "), 180);
}

function sameDayEvidenced(text: string): boolean {
  return /ביום אחד|في يوم واحد|same[-\s]?day/i.test(text);
}

/** Package framing from named services. Price stays empty when unpublished. */
export function offerInputFromScan(intake: Intake, locale: Locale): OfferBuilderInput | null {
  const name = intake.businessName.trim();
  if (!name) return null;
  const services = servicesLine(intake);
  const category = intake.category.trim();
  if (!services && !category) return null;

  const wa = (intake.whatsapp || intake.phone || "").trim();
  const place = intake.location.trim();
  const text = hay(intake);
  const day = sameDayEvidenced(text);
  const dental = isDentalScan(intake);
  const dream = services || category;
  const proof = [intake.brandPositioning || intake.uniqueAdvantage || category, place].filter(Boolean).join(" · ");

  if (locale === "ar") {
    return {
      dreamOutcome: clip(dental ? `${dream} — باقة العيادة كما انكتبت بالموقع` : dream, 120),
      proof: clip(proof || category, 140),
      timeToResult: day
        ? "زراعة في يوم واحد — مثل ما مكتوب بالموقع، مش مدة نتيجة مختلقة"
        : wa
          ? "موعد من واتساب — بلا مدة نتيجة مختلقة"
          : "بعد الاتفاق على الموعد — بلا مدة مختلقة",
      customerEffort: wa ? `واتساب ${wa}` : "اتصال / واتساب مثل ما مكتوب بالموقع",
      price: "",
      objections: "السعر مش مكتوب بالموقع — منسأل على واتساب. بلا خصم مختلق.",
      guaranteeReal: false,
    };
  }

  if (locale === "en") {
    return {
      dreamOutcome: clip(dental ? `${dream} — clinic package as published` : dream, 120),
      proof: clip(proof || category, 140),
      timeToResult: day
        ? "Same-day implants — as written on the site, not an invented result window"
        : wa
          ? "Book on WhatsApp — no invented result timeline"
          : "After an agreed visit — no invented timeline",
      customerEffort: wa ? `WhatsApp ${wa}` : "Call / WhatsApp as published",
      price: "",
      objections: "Price is not on the site — ask on WhatsApp. No invented discount.",
      guaranteeReal: false,
    };
  }

  return {
    dreamOutcome: clip(dental ? `${dream} — חבילת המרפאה כפי שפורסמה` : dream, 120),
    proof: clip(proof || category, 140),
    timeToResult: day
      ? "השתלות ביום אחד — כפי שכתוב באתר, לא חלון תוצאה מומצא"
      : wa
        ? "תיאום בוואטסאפ — בלי משך תוצאה מומצא"
        : "אחרי תיאום ביקור — בלי משך מומצא",
    customerEffort: wa ? `וואטסאפ ${wa}` : "שיחה / וואטסאפ כפי שפורסם",
    price: "",
    objections: "המחיר לא כתוב באתר — נברר בוואטסאפ. בלי הנחה מומצאת.",
    guaranteeReal: false,
  };
}

/** Attach a saved offer blueprint from scan facts. Keeps promo chip as no_offer when unpublished. */
export function attachScanOffer(intake: Intake, locale: Locale = "he"): Intake {
  if (intake.offerSkipConfirmed && intake.offerBlueprint?.skipped) return intake;
  const input = offerInputFromScan(intake, locale);
  if (!input) return intake;
  const offer = generateOfferBlueprint(input, { intake, locale });
  return {
    ...intake,
    offerBlueprint: offer,
    offerSkipConfirmed: false,
    offer: isNoOffer(intake.offer) || !String(intake.offer || "").trim() ? "no_offer" : intake.offer,
    offerCustom: isNoOffer(intake.offer) || !String(intake.offer || "").trim() ? false : intake.offerCustom,
  };
}
