import type { Intake, Locale, MediaAssetMeta } from "./types";
import type { Vertical } from "./vertical";
import { detectVertical } from "./vertical";
import { stylesForVertical, CLINIC_POSTER_PALETTE } from "./design-styles";
import { uid } from "./utils";

export type StudioStill = {
  id: string;
  name: Record<Locale, string>;
  palette: [string, string, string];
  dataUrl: string;
  scene: string;
};

function svgUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function gid(id: string, part: string): string {
  return `${id.replace(/[^a-z0-9-]/gi, "")}-${part}`;
}

function frame(id: string, bg: string, body: string): string {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1350" width="1080" height="1350">`,
    `<rect width="1080" height="1350" fill="${bg}"/>`,
    body,
    `</svg>`,
  ].join("");
}

/** Sunlit empty waiting room — window, wood floor, chairs. No faces, no plus-icon. */
function waitingSun(id: string, p: [string, string, string]): string {
  const [bg, teal, navy] = p;
  const sun = gid(id, "sun");
  const floor = gid(id, "floor");
  const wall = gid(id, "wall");
  return frame(
    id,
    bg,
    [
      `<defs>`,
      `<linearGradient id="${wall}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${bg}"/><stop offset="1" stop-color="#E8DCC8"/></linearGradient>`,
      `<linearGradient id="${floor}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D9C4A0"/><stop offset="1" stop-color="#B08968"/></linearGradient>`,
      `<radialGradient id="${sun}" cx="78%" cy="28%"><stop offset="0" stop-color="#FFF8E7" stop-opacity="0.95"/><stop offset="1" stop-color="${bg}" stop-opacity="0"/></radialGradient>`,
      `</defs>`,
      `<rect width="1080" height="860" fill="url(#${wall})"/>`,
      `<rect y="860" width="1080" height="490" fill="url(#${floor})"/>`,
      `<rect x="620" y="90" width="380" height="620" rx="18" fill="#FDF6E8"/>`,
      `<rect x="648" y="118" width="324" height="564" rx="8" fill="#F6E7C1" fill-opacity="0.7"/>`,
      `<rect x="800" y="118" width="14" height="564" fill="${bg}" fill-opacity="0.25"/>`,
      `<rect x="648" y="390" width="324" height="12" fill="${bg}" fill-opacity="0.2"/>`,
      `<ellipse cx="820" cy="420" rx="340" ry="420" fill="url(#${sun})"/>`,
      `<rect x="120" y="780" width="210" height="88" rx="22" fill="${navy}" fill-opacity="0.18"/>`,
      `<rect x="360" y="780" width="210" height="88" rx="22" fill="${navy}" fill-opacity="0.16"/>`,
      `<rect x="140" y="748" width="170" height="44" rx="16" fill="${navy}" fill-opacity="0.22"/>`,
      `<rect x="380" y="748" width="170" height="44" rx="16" fill="${navy}" fill-opacity="0.2"/>`,
      `<ellipse cx="160" cy="700" rx="36" ry="90" fill="${teal}" fill-opacity="0.35"/>`,
      `<ellipse cx="128" cy="720" rx="24" ry="70" fill="${teal}" fill-opacity="0.25"/>`,
      `<rect x="148" y="780" width="24" height="40" rx="6" fill="${teal}" fill-opacity="0.4"/>`,
      `<circle cx="200" cy="1080" r="28" fill="${teal}" fill-opacity="0.28"/>`,
      `<circle cx="250" cy="1110" r="18" fill="${navy}" fill-opacity="0.12"/>`,
      `<rect x="180" y="1095" width="90" height="22" rx="8" fill="#C4A574" fill-opacity="0.55"/>`,
    ].join(""),
  );
}

function facade(id: string, p: [string, string, string]): string {
  const [bg, teal, navy] = p;
  const sky = gid(id, "sky");
  return frame(
    id,
    bg,
    [
      `<defs><linearGradient id="${sky}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D7E4EA"/><stop offset="1" stop-color="#F6F1E8"/></linearGradient></defs>`,
      `<rect width="1080" height="720" fill="url(#${sky})"/>`,
      `<rect y="720" width="1080" height="630" fill="#C4B49A"/>`,
      `<rect x="180" y="360" width="720" height="520" fill="${bg}"/>`,
      `<rect x="180" y="320" width="720" height="48" fill="#E8DCC8"/>`,
      `<rect x="240" y="420" width="200" height="280" rx="8" fill="#FDF6E8"/>`,
      `<rect x="640" y="420" width="200" height="280" rx="8" fill="#FDF6E8"/>`,
      `<rect x="470" y="540" width="140" height="340" rx="6" fill="${navy}" fill-opacity="0.35"/>`,
      `<circle cx="860" cy="780" r="70" fill="${teal}" fill-opacity="0.45"/>`,
      `<ellipse cx="860" cy="700" rx="18" ry="90" fill="${teal}" fill-opacity="0.55"/>`,
      `<ellipse cx="830" cy="710" rx="22" ry="70" fill="${teal}" fill-opacity="0.4"/>`,
      `<ellipse cx="890" cy="720" rx="20" ry="64" fill="${teal}" fill-opacity="0.35"/>`,
    ].join(""),
  );
}

function courtyard(id: string, p: [string, string, string]): string {
  const [bg, teal, navy] = p;
  return frame(
    id,
    bg,
    [
      `<rect width="1080" height="1350" fill="#E8DCC8"/>`,
      `<rect y="0" width="1080" height="640" fill="#D7E4EA"/>`,
      `<ellipse cx="540" cy="820" rx="420" ry="160" fill="#C4B49A"/>`,
      `<rect x="80" y="480" width="920" height="28" fill="${navy}" fill-opacity="0.12"/>`,
      `<rect x="120" y="508" width="840" height="220" fill="${bg}" fill-opacity="0.9"/>`,
      `<circle cx="260" cy="700" r="120" fill="${teal}" fill-opacity="0.4"/>`,
      `<circle cx="820" cy="680" r="90" fill="${teal}" fill-opacity="0.32"/>`,
      `<rect x="400" y="900" width="280" height="36" rx="8" fill="${navy}" fill-opacity="0.18"/>`,
      `<rect x="420" y="870" width="240" height="28" rx="8" fill="${navy}" fill-opacity="0.22"/>`,
    ].join(""),
  );
}

function reception(id: string, p: [string, string, string]): string {
  const [bg, teal, navy] = p;
  const glow = gid(id, "glow");
  return frame(
    id,
    bg,
    [
      `<defs><radialGradient id="${glow}" cx="70%" cy="40%"><stop offset="0" stop-color="#FBE8B0" stop-opacity="0.85"/><stop offset="1" stop-color="${bg}" stop-opacity="0"/></radialGradient></defs>`,
      `<rect width="1080" height="1350" fill="${bg}"/>`,
      `<ellipse cx="780" cy="420" rx="280" ry="240" fill="url(#${glow})"/>`,
      `<rect x="80" y="720" width="920" height="220" rx="18" fill="#B08968"/>`,
      `<rect x="80" y="700" width="920" height="36" rx="8" fill="#D9C4A0"/>`,
      `<rect x="700" y="560" width="36" height="160" fill="${navy}" fill-opacity="0.25"/>`,
      `<ellipse cx="718" cy="548" rx="48" ry="22" fill="#FBE8B0"/>`,
      `<rect x="160" y="980" width="180" height="70" rx="16" fill="${navy}" fill-opacity="0.16"/>`,
      `<rect x="380" y="980" width="180" height="70" rx="16" fill="${navy}" fill-opacity="0.14"/>`,
      `<rect x="80" y="1160" width="920" height="8" fill="${teal}" fill-opacity="0.35"/>`,
    ].join(""),
  );
}

function wellness(id: string, p: [string, string, string]): string {
  const [bg, teal, navy] = p;
  return frame(
    id,
    bg,
    [
      `<rect width="1080" height="1350" fill="${bg}"/>`,
      `<circle cx="280" cy="360" r="220" fill="${teal}" fill-opacity="0.22"/>`,
      `<circle cx="820" cy="520" r="300" fill="#FFF8E7" fill-opacity="0.7"/>`,
      `<circle cx="640" cy="980" r="260" fill="${navy}" fill-opacity="0.08"/>`,
      `<circle cx="180" cy="1100" r="140" fill="${teal}" fill-opacity="0.18"/>`,
      `<circle cx="960" cy="160" r="90" fill="#FFF8E7" fill-opacity="0.9"/>`,
    ].join(""),
  );
}

function corridor(id: string, p: [string, string, string]): string {
  const [bg, teal, navy] = p;
  return frame(
    id,
    bg,
    [
      `<rect width="1080" height="900" fill="${bg}"/>`,
      `<polygon points="180,900 900,900 640,420 440,420" fill="#E8DCC8"/>`,
      `<polygon points="440,420 640,420 620,90 460,90" fill="#FDF6E8"/>`,
      `<rect x="460" y="90" width="160" height="330" fill="#F6E7C1"/>`,
      `<rect y="900" width="1080" height="450" fill="#C4B49A"/>`,
      `<rect x="0" y="0" width="180" height="900" fill="${navy}" fill-opacity="0.06"/>`,
      `<rect x="900" y="0" width="180" height="900" fill="${teal}" fill-opacity="0.08"/>`,
    ].join(""),
  );
}

function linenWindow(id: string, p: [string, string, string]): string {
  const [bg, teal] = p;
  return frame(
    id,
    bg,
    [
      `<rect width="1080" height="1350" fill="${bg}"/>`,
      `<rect x="200" y="80" width="680" height="820" fill="#FDF6E8"/>`,
      `<rect x="230" y="110" width="280" height="760" fill="#F6E7C1" fill-opacity="0.55"/>`,
      `<rect x="560" y="110" width="280" height="760" fill="#F6E7C1" fill-opacity="0.4"/>`,
      `<rect x="120" y="980" width="840" height="180" rx="24" fill="${teal}" fill-opacity="0.18"/>`,
      `<ellipse cx="540" cy="1040" rx="220" ry="28" fill="#FFF8E7" fill-opacity="0.8"/>`,
    ].join(""),
  );
}

function playNook(id: string, p: [string, string, string]): string {
  const [bg, teal, navy] = p;
  return frame(
    id,
    bg,
    [
      `<rect width="1080" height="1350" fill="${bg}"/>`,
      `<rect y="980" width="1080" height="370" fill="#C4A574"/>`,
      `<rect x="80" y="720" width="920" height="80" rx="12" fill="#B08968"/>`,
      `<rect x="120" y="640" width="120" height="80" rx="16" fill="${teal}" fill-opacity="0.45"/>`,
      `<rect x="270" y="660" width="90" height="60" rx="12" fill="${navy}" fill-opacity="0.2"/>`,
      `<circle cx="430" cy="690" r="36" fill="#C4B49A"/>`,
      `<rect x="500" y="650" width="70" height="70" rx="10" fill="${teal}" fill-opacity="0.3"/>`,
      `<ellipse cx="860" cy="500" rx="40" ry="110" fill="${teal}" fill-opacity="0.4"/>`,
      `<rect x="200" y="200" width="420" height="280" rx="20" fill="#FDF6E8"/>`,
    ].join(""),
  );
}

function woodDesk(id: string, p: [string, string, string]): string {
  const [bg, teal, navy] = p;
  return frame(
    id,
    bg,
    [
      `<rect width="1080" height="1350" fill="${bg}"/>`,
      `<rect y="420" width="1080" height="930" fill="#B08968"/>`,
      `<rect y="400" width="1080" height="40" fill="#D9C4A0"/>`,
      `<ellipse cx="780" cy="280" rx="260" ry="200" fill="#FFF8E7" fill-opacity="0.75"/>`,
      `<rect x="160" y="560" width="280" height="180" rx="12" fill="#E8DCC8"/>`,
      `<circle cx="720" cy="640" r="70" fill="${teal}" fill-opacity="0.25"/>`,
      `<rect x="0" y="1280" width="1080" height="12" fill="${navy}" fill-opacity="0.15"/>`,
    ].join(""),
  );
}

function grillGlow(id: string, p: [string, string, string]): string {
  const [bg, accent] = p;
  const g = gid(id, "g");
  return frame(
    id,
    "#1A1210",
    [
      `<defs><radialGradient id="${g}" cx="50%" cy="60%"><stop offset="0" stop-color="${accent}" stop-opacity="0.9"/><stop offset="1" stop-color="#1A1210" stop-opacity="0"/></radialGradient></defs>`,
      `<ellipse cx="540" cy="820" rx="380" ry="220" fill="url(#${g})"/>`,
      `<rect x="220" y="760" width="640" height="28" rx="6" fill="#2A1C18"/>`,
      `<rect x="240" y="720" width="600" height="16" fill="#3A281E"/>`,
      `<rect x="240" y="700" width="600" height="16" fill="#3A281E"/>`,
      `<circle cx="400" cy="860" r="18" fill="${accent}" fill-opacity="0.8"/>`,
      `<circle cx="620" cy="880" r="12" fill="#F4A261"/>`,
      `<rect width="1080" height="1350" fill="${bg}" fill-opacity="0.08"/>`,
    ].join(""),
  );
}

function plated(id: string, p: [string, string, string]): string {
  const [bg, accent] = p;
  return frame(
    id,
    bg,
    [
      `<rect width="1080" height="1350" fill="${bg}"/>`,
      `<ellipse cx="540" cy="760" rx="340" ry="220" fill="#E8DCC8"/>`,
      `<ellipse cx="540" cy="740" rx="260" ry="160" fill="#FDF6E8"/>`,
      `<ellipse cx="540" cy="730" rx="160" ry="90" fill="${accent}" fill-opacity="0.55"/>`,
      `<rect x="200" y="200" width="680" height="24" rx="8" fill="${accent}" fill-opacity="0.2"/>`,
    ].join(""),
  );
}

function aquaTiles(id: string, p: [string, string, string]): string {
  const [bg, teal] = p;
  const bits: string[] = [`<rect width="1080" height="1350" fill="${bg}"/>`];
  for (let y = 0; y < 1350; y += 90) {
    for (let x = 0; x < 1080; x += 90) {
      bits.push(`<rect x="${x + 4}" y="${y + 4}" width="82" height="82" rx="8" fill="${teal}" fill-opacity="${0.18 + ((x + y) % 180) / 600}"/>`);
    }
  }
  bits.push(`<ellipse cx="540" cy="700" rx="400" ry="180" fill="#7EBDC2" fill-opacity="0.45"/>`);
  return frame(id, bg, bits.join(""));
}

function boutiqueRail(id: string, p: [string, string, string]): string {
  const [bg, ivory, gold] = p;
  return frame(
    id,
    bg,
    [
      `<rect width="1080" height="1350" fill="${bg}"/>`,
      `<rect x="120" y="180" width="840" height="18" rx="8" fill="${gold}" fill-opacity="0.7"/>`,
      `<rect x="180" y="198" width="70" height="520" fill="${ivory}" fill-opacity="0.85"/>`,
      `<rect x="280" y="198" width="90" height="560" fill="#E8DCC8"/>`,
      `<rect x="400" y="198" width="60" height="500" fill="${ivory}" fill-opacity="0.7"/>`,
      `<rect x="490" y="198" width="110" height="580" fill="#D4C4A8"/>`,
      `<rect x="640" y="198" width="80" height="540" fill="${ivory}"/>`,
      `<rect x="760" y="198" width="100" height="500" fill="#C4B49A"/>`,
      `<rect y="1100" width="1080" height="250" fill="#1C1917"/>`,
    ].join(""),
  );
}

type Builder = (id: string, p: [string, string, string]) => string;

const CLINIC_BUILDERS: { key: string; name: Record<Locale, string>; build: Builder }[] = [
  { key: "waiting-sun", name: { he: "חדר המתנה מואר", ar: "غرفة انتظار مشمسة", en: "Sunlit waiting room" }, build: waitingSun },
  { key: "facade", name: { he: "חזית ים-תיכונית", ar: "واجهة متوسطية", en: "Mediterranean facade" }, build: facade },
  { key: "courtyard", name: { he: "חצר זיתים", ar: "فناء زيتون", en: "Olive courtyard" }, build: courtyard },
  { key: "reception", name: { he: "קבלה חמה", ar: "استقبال دافئ", en: "Warm reception" }, build: reception },
  { key: "wellness", name: { he: "אור רגוע", ar: "ضوء عافية", en: "Wellness light" }, build: wellness },
  { key: "corridor", name: { he: "מסדרון שמש", ar: "ممر مشمس", en: "Sunlit corridor" }, build: corridor },
  { key: "linen-window", name: { he: "חלון פשתן", ar: "شباك كتان", en: "Linen window" }, build: linenWindow },
  { key: "play-nook", name: { he: "פינת משחק", ar: "ركن لعب", en: "Play nook" }, build: playNook },
  { key: "wood-desk", name: { he: "שולחן עץ", ar: "طاولة خشب", en: "Wood desk" }, build: woodDesk },
  { key: "entry-olive", name: { he: "כניסה עם זית", ar: "مدخل بزيتونة", en: "Olive entry" }, build: facade },
];

const FOOD_BUILDERS: { key: string; name: Record<Locale, string>; build: Builder }[] = [
  { key: "plated", name: { he: "מנה על צלחת", ar: "طبق مقدّم", en: "Plated dish" }, build: plated },
  { key: "grill", name: { he: "גחלים", ar: "جمر", en: "Grill glow" }, build: grillGlow },
  { key: "table", name: { he: "שולחן ערוך", ar: "سفرة", en: "Table setting" }, build: linenWindow },
  { key: "courtyard", name: { he: "חצר אוכל", ar: "فناء أكل", en: "Courtyard table" }, build: courtyard },
  { key: "spice", name: { he: "קערות תבלין", ar: "صحون بهار", en: "Spice bowls" }, build: woodDesk },
  { key: "ceramic", name: { he: "קרמיקה", ar: "صحون", en: "Ceramic" }, build: plated },
  { key: "interior", name: { he: "פנים המסעדה", ar: "داخل المطعم", en: "Dining interior" }, build: reception },
  { key: "steam", name: { he: "אדים מעל הגריל", ar: "بخار الغريل", en: "Steam" }, build: grillGlow },
];

const POOL_BUILDERS: { key: string; name: Record<Locale, string>; build: Builder }[] = [
  { key: "tiles", name: { he: "אריחי מים", ar: "بلاط ماء", en: "Aqua tiles" }, build: aquaTiles },
  { key: "wellness", name: { he: "אדים", ar: "بخار", en: "Steam light" }, build: wellness },
  { key: "linen", name: { he: "פשתן ומים", ar: "كتان وماء", en: "Linen and water" }, build: linenWindow },
  { key: "corridor", name: { he: "מעבר לבריכה", ar: "ممر المسبح", en: "Pool corridor" }, build: corridor },
  { key: "desk", name: { he: "סיפון אבן", ar: "حجر", en: "Stone deck" }, build: woodDesk },
  { key: "court", name: { he: "חצר רטובה", ar: "فناء", en: "Wet courtyard" }, build: courtyard },
  { key: "facade", name: { he: "חזית בריכה", ar: "واجهة", en: "Pool facade" }, build: facade },
  { key: "wait", name: { he: "אולם המתנה", ar: "انتظار", en: "Lobby" }, build: waitingSun },
];

const RETAIL_BUILDERS: { key: string; name: Record<Locale, string>; build: Builder }[] = [
  { key: "rail", name: { he: "מתלה בוטיק", ar: "سكة بوتيك", en: "Boutique rail" }, build: boutiqueRail },
  { key: "alcove", name: { he: "נישת הלבשה", ar: " alcove", en: "Dressing alcove" }, build: linenWindow },
  { key: "counter", name: { he: "דלפק", ar: "كاونتر", en: "Shop counter" }, build: reception },
  { key: "wellness", name: { he: "אור רך", ar: "ضوء ناعم", en: "Soft light" }, build: wellness },
  { key: "desk", name: { he: "שולחן בד", ar: "طاولة قماش", en: "Fabric table" }, build: woodDesk },
  { key: "facade", name: { he: "חלון ראווה", ar: "واجهة", en: "Vitrine" }, build: facade },
  { key: "court", name: { he: "חצר החנות", ar: "فناء", en: "Shop court" }, build: courtyard },
  { key: "wait", name: { he: "פנים שקט", ar: "داخل هادئ", en: "Quiet interior" }, build: waitingSun },
];

const GENERIC_BUILDERS: { key: string; name: Record<Locale, string>; build: Builder }[] = [
  { key: "rail", name: { he: "מתלה בוטיק", ar: "سكة بوتيك", en: "Boutique rail" }, build: boutiqueRail },
  { key: "facade", name: { he: "חזית רחוב", ar: "واجهة شارع", en: "Street facade" }, build: facade },
  { key: "desk", name: { he: "שולחן סטודיו", ar: "طاولة ستوديو", en: "Studio desk" }, build: woodDesk },
  { key: "table", name: { he: "שולחן ערוך", ar: "سفرة", en: "Table setting" }, build: linenWindow },
  { key: "plated", name: { he: "מנה", ar: "طبق", en: "Plated dish" }, build: plated },
  { key: "court", name: { he: "חצר", ar: "فناء", en: "Courtyard" }, build: courtyard },
  { key: "counter", name: { he: "דלפק", ar: "كاونتر", en: "Counter" }, build: reception },
  { key: "alcove", name: { he: "נישה", ar: "كوة", en: "Alcove" }, build: wellness },
];

function palettesFor(vertical: Vertical): [string, string, string][] {
  const styles = stylesForVertical(vertical);
  const out: [string, string, string][] = styles.slice(0, 8).map((s) => s.palette);
  while (out.length < 8) out.push(CLINIC_POSTER_PALETTE);
  return out;
}

function buildersFor(vertical: Vertical) {
  if (vertical === "clinic") return CLINIC_BUILDERS;
  if (vertical === "restaurant") return FOOD_BUILDERS;
  if (vertical === "pool") return POOL_BUILDERS;
  if (vertical === "retail") return RETAIL_BUILDERS;
  if (vertical === "school" || vertical === "product" || vertical === "generic") return GENERIC_BUILDERS;
  return GENERIC_BUILDERS;
}

/** In-app photography-like stills. Empty places, no faces, no Clalit, no plus-icon posters. */
export function studioStillsForIntake(intake: Pick<Intake, "businessName" | "category" | "description">): StudioStill[] {
  const vertical = detectVertical(intake);
  const pals = palettesFor(vertical);
  const builders = buildersFor(vertical);
  return builders.map((b, i) => {
    const palette = pals[i % pals.length] ?? CLINIC_POSTER_PALETTE;
    const id = `studio-${vertical}-${b.key}`;
    return {
      id,
      name: b.name,
      palette,
      dataUrl: svgUrl(b.build(id, palette)),
      scene: b.key,
    };
  });
}

export function studioStillToAsset(still: StudioStill, name?: string): MediaAssetMeta {
  return {
    id: uid("asset"),
    kind: "image",
    mime: "image/svg+xml",
    name: name || still.name.en,
    size: still.dataUrl.length,
    label: "interior",
    note: `offer:studio:${still.id}`,
    createdAt: new Date().toISOString(),
    publicSrc: still.dataUrl,
  };
}
