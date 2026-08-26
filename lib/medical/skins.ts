import type { LandingTemplateId, Tri } from "./types";

export interface LandingSkin {
  id: LandingTemplateId;
  name: Tri;
  bg: string;
  ink: string;
  muted: string;
  accent: string;
  card: string;
  ctaInk: string;
  hero: string;
  serif?: boolean;
}

export const LANDING_SKINS: LandingSkin[] = [
  {
    id: "clinical-trust",
    name: { he: "אמון קליני", ar: "ثقة سريرية", en: "Clinical Trust" },
    bg: "#f4f1ea",
    ink: "#14352c",
    muted: "#4a635c",
    accent: "#1b5e4a",
    card: "#ffffff",
    ctaInk: "#ffffff",
    hero: "linear-gradient(160deg, #e7efe9, #f4f1ea)",
  },
  {
    id: "bold-conversion",
    name: { he: "המרה נועזת", ar: "تحويل جريء", en: "Bold Conversion" },
    bg: "#0c1220",
    ink: "#f7f3ea",
    muted: "#c4bba8",
    accent: "#ff5a1f",
    card: "#151c2e",
    ctaInk: "#0c1220",
    hero: "linear-gradient(160deg, #1a2438, #0c1220)",
  },
  {
    id: "editorial",
    name: { he: "עורכי", ar: "تحريري", en: "Editorial" },
    bg: "#faf8f4",
    ink: "#161616",
    muted: "#5c5c5c",
    accent: "#161616",
    card: "#ffffff",
    ctaInk: "#faf8f4",
    hero: "linear-gradient(180deg, #fff, #faf8f4)",
    serif: true,
  },
  {
    id: "luxury-aesthetic",
    name: { he: "אסתטיקה יוקרתית", ar: "تجميل فاخر", en: "Luxury Aesthetic" },
    bg: "#1a1614",
    ink: "#f3e6d0",
    muted: "#c4b49a",
    accent: "#c4a574",
    card: "#241f1c",
    ctaInk: "#1a1614",
    hero: "linear-gradient(160deg, #2a2420, #1a1614)",
  },
  {
    id: "vet-warm",
    name: { he: "וטרינרי חם", ar: "بيطرة دافئة", en: "Vet Warm" },
    bg: "#faf3ea",
    ink: "#4a2c1a",
    muted: "#7a5a42",
    accent: "#c45c26",
    card: "#fffaf4",
    ctaInk: "#fffaf4",
    hero: "linear-gradient(160deg, #f3e0cc, #faf3ea)",
  },
  {
    id: "dental-bright",
    name: { he: "שיניים בהיר", ar: "أسنان مشرق", en: "Dental Bright" },
    bg: "#f3fbff",
    ink: "#0b3d4a",
    muted: "#3d6a75",
    accent: "#1aa6b7",
    card: "#ffffff",
    ctaInk: "#ffffff",
    hero: "linear-gradient(160deg, #d9f4f8, #f3fbff)",
  },
];

export function skinOf(id: LandingTemplateId): LandingSkin {
  return LANDING_SKINS.find((s) => s.id === id) ?? LANDING_SKINS[0];
}

export function defaultTemplateFor(specialty: string): LandingTemplateId {
  if (specialty === "vet") return "vet-warm";
  if (specialty === "dental") return "dental-bright";
  if (specialty === "aesthetic") return "luxury-aesthetic";
  return "clinical-trust";
}
