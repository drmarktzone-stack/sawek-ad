import type { Intake, Locale, MediaAssetMeta } from "./types";
import { uid } from "./utils";
import { detectVertical, isPediatrics } from "./vertical";
import { stylesForVertical } from "./design-styles";
import { isWalkIn } from "./engine/spoken";

export type GraphicPoster = {
  id: string;
  name: Record<Locale, string>;
  palette: [string, string, string];
  dataUrl: string;
};

function svgUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function plusIcon(cx: number, cy: number, color: string, r = 70): string {
  const w = Math.round(r * 0.28);
  const arm = Math.round(r * 0.55);
  return [
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" fill-opacity="0.18"/>`,
    `<rect x="${cx - w}" y="${cy - arm}" width="${w * 2}" height="${arm * 2}" rx="${w}" fill="${color}"/>`,
    `<rect x="${cx - arm}" y="${cy - w}" width="${arm * 2}" height="${w * 2}" rx="${w}" fill="${color}"/>`,
  ].join("");
}

function plant(x: number, y: number, color: string): string {
  return [
    `<ellipse cx="${x}" cy="${y}" rx="28" ry="70" fill="${color}" fill-opacity="0.55"/>`,
    `<ellipse cx="${x - 32}" cy="${y + 8}" rx="22" ry="52" fill="${color}" fill-opacity="0.4"/>`,
    `<ellipse cx="${x + 30}" cy="${y + 12}" rx="20" ry="48" fill="${color}" fill-opacity="0.35"/>`,
    `<rect x="${x - 10}" y="${y + 60}" width="20" height="36" rx="8" fill="${color}" fill-opacity="0.7"/>`,
  ].join("");
}

function windowLight(x: number, y: number, w: number, h: number, glow: string): string {
  return [
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="28" fill="${glow}" fill-opacity="0.22"/>`,
    `<rect x="${x + 18}" y="${y + 18}" width="${w - 36}" height="${h - 36}" rx="18" fill="${glow}" fill-opacity="0.45"/>`,
    `<rect x="${x + w / 2 - 6}" y="${y + 18}" width="12" height="${h - 36}" fill="${glow}" fill-opacity="0.25"/>`,
  ].join("");
}

function chairs(y: number, color: string): string {
  const bits: string[] = [];
  for (const x of [140, 340, 540]) {
    bits.push(`<rect x="${x}" y="${y}" width="160" height="90" rx="28" fill="${color}" fill-opacity="0.35"/>`);
    bits.push(`<rect x="${x + 16}" y="${y - 38}" width="128" height="48" rx="20" fill="${color}" fill-opacity="0.5"/>`);
  }
  return bits.join("");
}

function blocks(color: string): string {
  return [
    `<rect x="120" y="980" width="140" height="140" rx="28" fill="${color}" fill-opacity="0.55"/>`,
    `<rect x="280" y="1040" width="110" height="110" rx="24" fill="${color}" fill-opacity="0.4"/>`,
    `<circle cx="500" cy="1100" r="70" fill="${color}" fill-opacity="0.35"/>`,
    `<rect x="600" y="1000" width="90" height="180" rx="20" fill="${color}" fill-opacity="0.3"/>`,
  ].join("");
}

function sun(cx: number, cy: number, color: string): string {
  return `<circle cx="${cx}" cy="${cy}" r="90" fill="${color}" fill-opacity="0.55"/>`;
}

function arch(color: string): string {
  return [
    `<path d="M240 1350 V720 A300 300 0 0 1 840 720 V1350" fill="${color}" fill-opacity="0.16"/>`,
    `<path d="M320 1350 V760 A220 220 0 0 1 760 760 V1350" fill="${color}" fill-opacity="0.12"/>`,
  ].join("");
}

function frame(bg: string, accent: string, secondary: string, body: string): string {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1350" width="1080" height="1350">`,
    `<rect width="1080" height="1350" fill="${bg}"/>`,
    `<rect x="0" y="0" width="1080" height="36" fill="${accent}"/>`,
    `<rect x="0" y="1314" width="1080" height="36" fill="${accent}"/>`,
    `<circle cx="980" cy="80" r="220" fill="${accent}" fill-opacity="0.16"/>`,
    `<circle cx="80" cy="1220" r="260" fill="${secondary}" fill-opacity="0.18"/>`,
    body,
    `</svg>`,
  ].join("");
}

function waitingRoom(p: [string, string, string]): string {
  const [bg, accent, secondary] = p;
  return frame(
    bg,
    accent,
    secondary,
    [
      windowLight(520, 160, 420, 520, accent),
      plant(180, 760, secondary),
      chairs(860, secondary),
      plusIcon(200, 240, accent, 64),
    ].join(""),
  );
}

function navyTrust(p: [string, string, string]): string {
  const [bg, accent, secondary] = p;
  return frame(
    bg,
    accent,
    secondary,
    [
      `<rect x="80" y="160" width="420" height="720" rx="40" fill="${accent}" fill-opacity="0.12"/>`,
      `<rect x="560" y="280" width="440" height="480" rx="40" fill="${secondary}" fill-opacity="0.22"/>`,
      plusIcon(540, 640, accent, 90),
      `<rect x="120" y="980" width="840" height="18" rx="9" fill="${accent}" fill-opacity="0.5"/>`,
    ].join(""),
  );
}

function familyPlay(p: [string, string, string]): string {
  const [bg, accent, secondary] = p;
  return frame(
    bg,
    accent,
    secondary,
    [
      sun(860, 220, accent),
      blocks(secondary),
      `<path d="M540 430 C540 360 480 320 430 360 C380 320 320 370 340 430 C360 500 540 620 540 620 C540 620 720 500 740 430 C760 370 700 320 650 360 C600 320 540 360 540 430 Z" fill="${accent}" fill-opacity="0.35"/>`,
      plant(160, 720, secondary),
    ].join(""),
  );
}

function walkInArch(p: [string, string, string]): string {
  const [bg, accent, secondary] = p;
  return frame(
    bg,
    accent,
    secondary,
    [
      arch(accent),
      `<polygon points="540,640 620,720 560,720 560,860 520,860 520,720 460,720" fill="${accent}" fill-opacity="0.85"/>`,
      plusIcon(200, 220, secondary, 56),
      `<rect x="200" y="1080" width="680" height="24" rx="12" fill="${accent}" fill-opacity="0.45"/>`,
    ].join(""),
  );
}

const NAMES: Record<string, Record<Locale, string>> = {
  waiting: { he: "חדר המתנה חם", ar: "غرفة انتظار دافية", en: "Warm waiting room" },
  trust: { he: "אמון נקי", ar: "ثقة نظيفة", en: "Clean trust" },
  family: { he: "בריאות ילדים", ar: "صحة أطفال", en: "Kids health" },
  walkin: { he: "כניסה לפי הגעה", ar: "دخول حسب الوصول", en: "Walk-in entry" },
};

const BUILDERS = [waitingRoom, navyTrust, familyPlay, walkInArch] as const;
const KEYS = ["waiting", "trust", "family", "walkin"] as const;

/** Finished in-app graphic posters. No faces, no Clalit mark, no invented numbers. */
export function graphicPostersForIntake(intake: Intake): GraphicPoster[] {
  const vertical = detectVertical(intake);
  const styles = stylesForVertical(vertical);
  const clinic = vertical === "clinic";
  const peds = isPediatrics(intake);
  const walk = isWalkIn(intake);
  const palettes: [string, string, string][] = [];
  const preferred = clinic
    ? ["calm-teal-cream", "trust-navy-white", "pastel-lilac", "family-bright"]
    : styles.slice(0, 8).map((s) => s.id);
  for (const id of preferred) {
    const st = styles.find((s) => s.id === id) ?? styles[palettes.length];
    if (!st) continue;
    palettes.push(st.palette);
    if (palettes.length >= 4) break;
  }
  while (palettes.length < 4) {
    palettes.push(styles[palettes.length % Math.max(styles.length, 1)]?.palette ?? ["#111111", "#ffe500", "#0f766e"]);
  }
  if (peds) {
    palettes[2] = ["#fef3e2", "#fb7185", "#0f766e"];
    palettes[0] = ["#f4efe6", "#0f766e", "#c2410c"];
  }
  if (walk) {
    palettes[3] = palettes[3] ?? ["#042f2e", "#14b8a6", "#ccfbf1"];
  }
  return KEYS.map((key, i) => {
    const palette = palettes[i] ?? palettes[0]!;
    const svg = BUILDERS[i](palette);
    return {
      id: `poster-${key}`,
      name: NAMES[key]!,
      palette,
      dataUrl: svgUrl(svg),
    };
  });
}

export function posterToAsset(poster: GraphicPoster, name?: string): MediaAssetMeta {
  return {
    id: uid("asset"),
    kind: "image",
    mime: "image/svg+xml",
    name: name || poster.name.en,
    size: poster.dataUrl.length,
    label: "interior",
    note: `graphic-poster:${poster.id}`,
    createdAt: new Date().toISOString(),
    publicSrc: poster.dataUrl,
  };
}

export function imagenToAsset(dataUrl: string, mime: string): MediaAssetMeta {
  return {
    id: uid("asset"),
    kind: "image",
    mime: mime.startsWith("image/") ? mime : "image/png",
    name: "AI still",
    size: dataUrl.length,
    label: "other",
    note: "imagen",
    createdAt: new Date().toISOString(),
    publicSrc: dataUrl,
  };
}
