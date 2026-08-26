import type { Locale } from "../types";

const PREFIX: Record<Locale, string> = {
  he: "יש להשלים",
  ar: "يجب إكمال",
  en: "TO COMPLETE",
};

export function toComplete(locale: Locale, field: string): string {
  return `[${PREFIX[locale]}: ${field}]`;
}

const RE = /\[(?:יש להשלים|يجب إكمال|TO COMPLETE):[^\]]*\]/g;

export function countMarkers(...chunks: string[]): number {
  let n = 0;
  for (const c of chunks) {
    const m = c.match(RE);
    if (m) n += m.length;
  }
  return n;
}

export function collectMarkers(text: string): string[] {
  return text.match(RE) ?? [];
}

export const ETHICS: Record<Locale, string> = {
  he: "תוכן זה נוצר באמצעות בינה מלאכותית. מחובת המרפאה לבדוק ולאשר את נכונות המידע והאתיקה הרפואית לפני הפרסום. אילן לא ממציא מחירים, שיעורי הצלחה, שמות טכנולוגיה או עובדות רפואיות.",
  ar: "أُنشئ هذا المحتوى بالذكاء الاصطناعي. على العيادة التحقق واعتماد دقة المعلومات والأخلاقيات الطبية قبل النشر. إيلان لا يخترع أسعاراً أو نسب نجاح أو أسماء تقنيات أو حقائق طبية.",
  en: "This content was created with AI. The clinic must check and approve accuracy and medical ethics before publishing. Ilan does not invent prices, success rates, technology names, or medical facts.",
};

export const MEDICAL_TEMPERATURE = 0.2;
