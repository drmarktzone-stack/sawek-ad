/** Clinic demo identity. Used to keep New Campaign from restoring Dr. Samer. */
const CLINIC_NAME_RE =
  /052-?8885800|drsamerped|אבו מוך|أبو مخ|أبو موخ|Abu Mokh|סאמר|سامر|Samer Abu|Al-Nour|مجمع النور|אל-נור/i;

export function isBlockedEmptySessionName(name: string): boolean {
  const n = String(name ?? "").trim();
  if (!n) return true;
  return CLINIC_NAME_RE.test(n);
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

export function draftLeaksClinic(value: unknown): boolean {
  try {
    const blob = typeof value === "string" ? value : JSON.stringify(value ?? "");
    return /052-?8885800|drsamerped|אבו מוך/.test(blob);
  } catch {
    return false;
  }
}
