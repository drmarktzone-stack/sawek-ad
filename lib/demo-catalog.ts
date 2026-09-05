import type { CampaignPack, Locale } from "./types";

/** Final QA owner: real clinic + Pizza Hut + Aluf Sport. */
export const DEMO_ID = "demo-samer-clinic";
export const DEMO_PIZZA_ID = "demo-pizza-hut";
export const DEMO_ALUF_ID = "demo-aluf-sport";
export const DEMO_OLIVE_ID = DEMO_PIZZA_ID;
export const DEMO_SAND_ID = DEMO_ALUF_ID;

export type DemoPackId = typeof DEMO_ID | typeof DEMO_PIZZA_ID | typeof DEMO_ALUF_ID;
export const PUBLISHED_DEMO_IDS: readonly DemoPackId[] = [DEMO_ID, DEMO_PIZZA_ID, DEMO_ALUF_ID] as const;
export const PUBLISHED_DEMO_ID_SET = new Set<string>(PUBLISHED_DEMO_IDS);
export type DemoKind = "clinic" | "restaurant" | "retail";

export interface DemoCatalogEntry {
  id: DemoPackId;
  kind: DemoKind;
  fictional: false;
  autoFill: boolean;
  slug: string;
  labels: Record<Locale, string>;
  shortLabels: Record<Locale, string>;
  sourceUrl: string;
}

export const DEMO_CATALOG: readonly DemoCatalogEntry[] = [
  {
    id: DEMO_ID, kind: "clinic", fictional: false, autoFill: true, slug: "samer",
    sourceUrl: "https://drsamerped.ai.studio",
    labels: { he: 'הדגמה — מרפאת ילדים ד"ר סאמר אבו מוך', ar: "عرض — عيادة أطفال د. سامر أبو مخ", en: "Demo — Dr. Samer pediatric clinic" },
    shortLabels: { he: "מרפאת ילדים", ar: "عيادة أطفال", en: "Pediatric clinic" },
  },
  {
    id: DEMO_PIZZA_ID, kind: "restaurant", fictional: false, autoFill: false, slug: "pizza",
    sourceUrl: "https://www.pizzahut.co.il/",
    labels: { he: "דוגמה — פיצה האט ישראל", ar: "مثال — بيتزا هت إسرائيل", en: "Example — Pizza Hut Israel" },
    shortLabels: { he: "פיצה האט", ar: "بيتزا هت", en: "Pizza Hut" },
  },
  {
    id: DEMO_ALUF_ID, kind: "retail", fictional: false, autoFill: false, slug: "aluf",
    sourceUrl: "https://www.alufsport.co.il/",
    labels: { he: "דוגמה — אלוף ספורט", ar: "مثال — ألوف سبورت", en: "Example — Aluf Sport" },
    shortLabels: { he: "אלוף ספורט", ar: "ألوف سبورت", en: "Aluf Sport" },
  },
] as const;

export function demoEntry(idOrSlug: string | null | undefined): DemoCatalogEntry | undefined {
  const q = String(idOrSlug ?? "").trim().toLowerCase();
  if (!q) return undefined;
  return DEMO_CATALOG.find((d) =>
    d.id === q || d.slug === q ||
    (["peds","samer-peds","clinic"].includes(q) && d.slug === "samer") ||
    (["pizza-hut","olive","demo-olive-kitchen"].includes(q) && d.slug === "pizza") ||
    (["aluf-sport","sand","demo-sand-boutique"].includes(q) && d.slug === "aluf"),
  );
}
export function isPublishedDemoId(id: string): id is DemoPackId { return PUBLISHED_DEMO_ID_SET.has(id); }
export function catalogIntake(_a: string, _l: Locale = "he"): null { return null; }
export function demoMetaFor(id: DemoPackId): NonNullable<CampaignPack["demoMeta"]> {
  const entry = demoEntry(id)!;
  return {
    sample: true, fictional: false, kind: entry.kind, labels: { ...entry.labels },
    note: entry.autoFill
      ? { he: "הדגמת מרפאה אמיתית — Demo ממלא קמפיין.", ar: "عرض عيادة حقيقية — Demo يعبّئ الحملة.", en: "Real clinic — Demo auto-fills." }
      : { he: "עסק אמיתי — פותח קמפיין מפורסם בלבד.", ar: "نشاط حقيقي — يفتح الحملة المنشورة فقط.", en: "Real business — opens published pack only." },
  };
}
