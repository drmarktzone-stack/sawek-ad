import type { Locale } from "./types";
import { localizeHours } from "./engine/spoken";

const DAY_SPLIT =
  /(?:\s*[·|]\s*|\s*\n\s*|(?=(?:ראשון|שני|שלישי|רביעי|חמישי|שישי|שבת|Sun|Mon|Tue|Wed|Thu|Fri|Sat|الأحد|الإثنين|الاثنين|الثلاثاء|الأربعاء|الخميس|الجمعة|السبت)\b))/u;

const WALK = [
  { re: /לפי סדר הגעה|סדר הגעה/, he: "לפי סדר הגעה", ar: "جت أولاً", en: "walk-in" },
  { re: /בלי תור|ללא תור|בלי לקבוע|بدون مواعيد|بدون طوابير|no appointment|no queue/, he: "בלי תור", ar: "بدون طوابير", en: "no queue" },
];

/** True when copy is a weekly hours dump, not a one-line caption. */
export function isHoursWall(text: string): boolean {
  const s = String(text ?? "").trim();
  if (!s) return false;
  const days = (s.match(/ראשון|שני|שלישי|רביעי|חמישי|שישי|שבת|الأحد|الإثنين|الاثنين|الثلاثاء|الأربعاء|الخميس|الجمعة|السبت/g) || []).length;
  const times = (s.match(/\d{1,2}:\d{2}/g) || []).length;
  return days >= 3 || times >= 4 || s.length > 140 && times >= 2;
}

/** Drop the weekly hours appendix so a caption stays 1–2 lines. */
export function stripHoursWall(text: string): string {
  let s = String(text ?? "").replace(/\s+/g, " ").trim();
  if (!s) return "";
  s = s.replace(/\s*(?:שעות|الدوام|Hours)\s*[:：]\s*.*$/u, "").trim();
  s = s.replace(/\s*[·|]\s*(?:ראשון|שני|الأحد|الإثنين).*$/u, "").trim();
  if (isHoursWall(s)) {
    const cut = s.split(/\s+[·|]\s+/)[0] ?? s;
    s = cut.length <= 90 ? cut : s.slice(0, 80).trim();
  }
  return s.replace(/[·,،\-–—:]+$/u, "").trim();
}

export function clipEvidence(text: string, max = 110): string {
  const s = String(text ?? "").replace(/\s+/g, " ").trim();
  if (!s) return "—";
  if (isHoursWall(s)) return s.slice(0, 48).trim() + "…";
  if (s.length <= max) return s;
  return s.slice(0, max).replace(/\s+\S*$/, "").trim() + "…";
}

/**
 * 2–3 short chips from scanned hours. Never invents a day or time.
 * Walk-in / no-queue phrases from the same string come first.
 */
export function hoursChips(raw: string, locale: Locale, max = 3): string[] {
  const localized = localizeHours(String(raw ?? "").trim(), locale);
  if (!localized) return [];
  const chips: string[] = [];
  const seen = new Set<string>();
  const push = (v: string) => {
    const t = v.replace(/\s+/g, " ").trim();
    if (!t || t.length < 3 || t.length > 56) return;
    const key = t.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    chips.push(t);
  };
  for (const w of WALK) {
    if (w.re.test(localized) || w.re.test(raw)) {
      push(locale === "he" ? w.he : locale === "ar" ? w.ar : w.en);
    }
  }
  const parts = localized
    .split(DAY_SPLIT)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  for (const p of parts) {
    if (chips.length >= max) break;
    if (WALK.some((w) => w.re.test(p) && p.length < 24)) continue;
    push(p.replace(/\s+-\s+/g, "–"));
  }
  return chips.slice(0, max);
}
