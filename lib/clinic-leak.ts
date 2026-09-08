import { detectVertical } from "./vertical";

/** Demo identity markers. Used to keep New Campaign from restoring any sample demo. */
const CLINIC_NAME_RE =
  /052-?8885800|drsamerped|אבו מוך|أبو مخ|أبو موخ|Abu Mokh|סאמר|سامر|Samer Abu|Al-Nour|مجمع النور|אל-נור/i;

const PUBLISHED_DEMO_RE =
  /1-?700-?50-?60-?70|pizzahut\.co\.il|פיצה האט|بيتزا هت|Pizza Hut|08-?9336658|alufsport\.co\.il|אלוף ספורט|ألوف|Aluf Sport|מטבח הזית|مطبخ الزيتون|Olive Kitchen|נווה שקד|בוטיק חול|بوتيك الرمل|Sand Boutique|עין ברק|demo-olive-kitchen|demo-sand-boutique/i;

export function isBlockedEmptySessionName(name: string): boolean {
  const n = String(name ?? "").trim();
  if (!n) return true;
  return CLINIC_NAME_RE.test(n) || PUBLISHED_DEMO_RE.test(n);
}

export function intakeIsClinicDemo(intake: {
  businessName?: string;
  website?: string;
  whatsapp?: string;
  description?: string;
  location?: string;
}): boolean {
  const blob = [
    intake.businessName,
    intake.website,
    intake.whatsapp,
    intake.description,
    intake.location,
  ]
    .map((s) => String(s ?? ""))
    .join("\n");
  return CLINIC_NAME_RE.test(blob) || /drsamerped\.ai\.studio/i.test(blob);
}

/** Any product demo pack identity (clinic or published demo packs). */
export function intakeIsDemoBusiness(intake: {
  businessName?: string;
  website?: string;
  whatsapp?: string;
  description?: string;
  location?: string;
}): boolean {
  const blob = [
    intake.businessName,
    intake.website,
    intake.whatsapp,
    intake.description,
    intake.location,
  ]
    .map((s) => String(s ?? ""))
    .join("\n");
  return intakeIsClinicDemo(intake) || PUBLISHED_DEMO_RE.test(blob);
}

/** Pediatric / clinic demo copy that must never seed a different business. */
export const PEDIATRIC_CLINIC_COPY_RE =
  /فحص شامل لكل طفل|واعطاءه الوقت الكافي|واعطائه الوقت الكافي|الوقت الكافي لكل|لكل طفل|طبيب أطفال|عيادة أطفال|عيادة طب الأطفال|رعاية طبية|الولد مريض|جيبوه عالعيادة|بدون طوابير|بدون انتظار|كلاليت|מרפאת ילדים|רופא ילדים|הילד חולה|סדר הגעה|לפי סדר הגעה|drsamerped|أبو مخ|אבו מוך|052-?8885800|סאמר|سامر أبو مخ/i;

export function draftLeaksClinic(value: unknown): boolean {
  try {
    const blob = typeof value === "string" ? value : JSON.stringify(value ?? "");
    return /052-?8885800|drsamerped|אבו מוך/.test(blob) || PEDIATRIC_CLINIC_COPY_RE.test(blob);
  } catch {
    return false;
  }
}

export function copyLeaksClinic(text: string): boolean {
  const blob = String(text ?? "");
  if (!blob.trim()) return false;
  return PEDIATRIC_CLINIC_COPY_RE.test(blob);
}

/** Drop pediatric/clinic leftover sentences when the current business is not a clinic. */
export function scrubClinicCopy(
  text: string,
  intake: {
    businessName?: string;
    category?: string;
    description?: string;
    website?: string;
    location?: string;
  },
): string {
  const raw = String(text ?? "");
  if (!raw.trim()) return "";
  if (
    detectVertical({
      businessName: intake.businessName ?? "",
      category: intake.category ?? "",
      description: intake.description ?? "",
    }) === "clinic"
  )
    return raw;
  if (!copyLeaksClinic(raw)) return raw;
  return "";
}
