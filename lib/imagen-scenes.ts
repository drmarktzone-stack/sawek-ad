import type { Locale } from "./types";
import type { Vertical } from "./vertical";
import { detectVertical } from "./vertical";

/** How many distinct Vertex stills the picker requests per open. */
export const IMAGEN_PICKER_COUNT = 10;

export type ImagenScene = {
  id: string;
  title: string;
  prompt: string;
};

const GUARD =
  "No text, letters, numbers, logos, watermarks, UI, captions, or signage in the image. No identifiable faces, no photoreal doctor or named person, no patients, no procedures, no injections, no body close-ups, no Clalit mark, no invented prices or claims.";

function regionFor(locale: Locale): string {
  if (locale === "he") return "Israel, natural Mediterranean daylight";
  if (locale === "ar") return "Levant, warm daylight, stone and plaster";
  return "clean contemporary setting, natural light";
}

function clinicScenes(region: string): ImagenScene[] {
  const rows: [string, string, string][] = [
    ["waiting-sun", "Sunlit waiting room", `Cinematic still of a sunlit pediatric waiting room empty of people. Cream plaster walls, wood chairs, large window with Mediterranean light shaft, oak floor, a few soft toys on a low shelf. ${region}. ${GUARD}`],
    ["facade", "Clinic facade", `Empty Mediterranean clinic facade, cream plaster and stone, olive tree, terracotta tile accent, quiet street, afternoon sun, no signage. ${region}. ${GUARD}`],
    ["toys-wood", "Wood and toys", `Empty exam-adjacent room: oak floor, wooden blocks, muted fabric toys, cream walls, linen curtain, no people. Warm quiet photography. ${region}. ${GUARD}`],
    ["courtyard", "Olive courtyard", `Quiet olive courtyard beside a small clinic wing, gravel, terracotta, empty bench, dappled shade, no people. ${region}. ${GUARD}`],
    ["reception", "Warm reception", `Warm reception desk of wood and linen, table-lamp glow, empty chairs, cream wall, no faces, no logos, no computer screens with text. ${region}. ${GUARD}`],
    ["wellness", "Wellness light", `Abstract wellness atmosphere: cream and soft teal bokeh, linen texture, sun haze, shallow depth, no objects with logos. ${region}. ${GUARD}`],
    ["corridor", "Sunlit corridor", `Empty clinic corridor, cream plaster, pale stone tiles, a window at the far end flooding warm light, no people. ${region}. ${GUARD}`],
    ["play-nook", "Play nook", `Children's play nook empty of children: low wood shelves, plants, muted rainbow fabric, cream wall, morning light. ${region}. ${GUARD}`],
    ["linen-window", "Linen window", `Linen curtains and morning sun, empty daybed, ceramic bowl, calm clinic atmosphere, no people. ${region}. ${GUARD}`],
    ["entry", "Olive entry", `Clinic entry with potted olive, Mediterranean tile, open door spilling warm interior light, no text on the door. ${region}. ${GUARD}`],
    ["abstract-teal", "Teal glass", `Abstract still: teal glass, cream wall, soft reflection, architectural wellness photography, empty. ${region}. ${GUARD}`],
    ["wood-desk", "Wood desk light", `Close still of a sunlit wood reception surface, ceramic cup, paper folder without writing, cream bokeh background. ${region}. ${GUARD}`],
  ];
  return rows.map(([id, title, prompt]) => ({ id, title, prompt }));
}

function restaurantScenes(region: string): ImagenScene[] {
  const rows: [string, string, string][] = [
    ["plated", "Plated dish", `Cinematic plated food on ceramic, steam, shallow depth, restaurant table, no people, no menus with text. ${region}. ${GUARD}`],
    ["grill", "Grill glow", `Night grill glow, charcoal and ember, empty station, warm light, no faces. ${region}. ${GUARD}`],
    ["table", "Table setting", `Linen table setting, olive oil, bread, terracotta and cream, empty chairs. ${region}. ${GUARD}`],
    ["courtyard-dine", "Courtyard table", `Empty courtyard dining table, olive tree, stone, late sun. ${region}. ${GUARD}`],
    ["spice", "Spice bowls", `Overhead still of spice bowls and herbs on wood, restaurant kitchen mood, no people. ${region}. ${GUARD}`],
    ["ceramic", "Ceramic plates", `Stacked cream ceramic plates, terracotta wall, soft window light. ${region}. ${GUARD}`],
    ["steam", "Steam over grill", `Steam over a glowing grill, dark wood, cinematic, no faces. ${region}. ${GUARD}`],
    ["interior", "Dining interior", `Empty neighborhood restaurant interior, wood tables, warm pendant light, no logos. ${region}. ${GUARD}`],
    ["citrus", "Citrus and oil", `Still life: citrus, olive oil, linen, Mediterranean restaurant mood. ${region}. ${GUARD}`],
    ["ember", "Charcoal ember", `Close charcoal ember and iron grill bars, moody food photography, no text. ${region}. ${GUARD}`],
  ];
  return rows.map(([id, title, prompt]) => ({ id, title, prompt }));
}

function poolScenes(region: string): ImagenScene[] {
  const rows: [string, string, string][] = [
    ["hydro", "Hydrotherapy water", `Indoor hydrotherapy pool, still turquoise water, empty, steam, stone edge. ${region}. ${GUARD}`],
    ["tiles", "Aqua tiles", `Close aqua and stone tiles, wet sheen, therapy-pool architecture, no people. ${region}. ${GUARD}`],
    ["steam", "Steam room light", `Soft steam over warm water, skylight, empty therapy pool. ${region}. ${GUARD}`],
    ["deck", "Stone deck", `Stone pool deck, folded linen, empty lounger, morning light. ${region}. ${GUARD}`],
    ["under", "Underwater light", `Underwater light shafts in a calm indoor pool, no swimmers. ${region}. ${GUARD}`],
    ["edge", "Pool edge", `Quiet pool edge, aqua water meeting stone, empty. ${region}. ${GUARD}`],
    ["window-water", "Water and window", `Indoor pool beside a large window, Mediterranean light, empty. ${region}. ${GUARD}`],
    ["linen-water", "Linen and water", `White linen and turquoise water, abstract wellness, no faces. ${region}. ${GUARD}`],
    ["steps", "Submerged steps", `Submerged stone steps into a therapy pool, empty, clear water. ${region}. ${GUARD}`],
    ["calm", "Calm aqua", `Wide calm aqua surface, indoor, architectural, no people. ${region}. ${GUARD}`],
  ];
  return rows.map(([id, title, prompt]) => ({ id, title, prompt }));
}

function retailScenes(region: string): ImagenScene[] {
  const rows: [string, string, string][] = [
    ["rail", "Boutique rail", `Clothing boutique rail, fabric in charcoal and ivory, empty shop, muted gold hardware, no logos on garments. ${region}. ${GUARD}`],
    ["fabric", "Fabric texture", `Close fabric texture, linen and wool, boutique light, no labels. ${region}. ${GUARD}`],
    ["alcove", "Dressing alcove", `Empty dressing alcove, ivory curtain, charcoal wall, soft spotlight. ${region}. ${GUARD}`],
    ["folded", "Folded knits", `Folded knits on a wood table, boutique interior, no people. ${region}. ${GUARD}`],
    ["window", "Window display", `Boutique window display of fabric and form, no readable logos, evening street bokeh. ${region}. ${GUARD}`],
    ["hanger", "Ivory hangers", `Ivory hangers on a black rail, editorial fashion still, empty. ${region}. ${GUARD}`],
    ["counter", "Shop counter", `Charcoal boutique counter, ivory marble, muted gold lamp, no faces. ${region}. ${GUARD}`],
    ["lookbook", "Lookbook table", `Lookbook table with fabric swatches, natural light, no text. ${region}. ${GUARD}`],
    ["fitting", "Fitting light", `Soft fitting-room light on a linen curtain, empty. ${region}. ${GUARD}`],
    ["rack", "Side rack", `Side rack of coats in a quiet boutique, editorial, no logos. ${region}. ${GUARD}`],
  ];
  return rows.map(([id, title, prompt]) => ({ id, title, prompt }));
}

function productScenes(region: string): ImagenScene[] {
  const rows: [string, string, string][] = [
    ["phone-desk", "Phone on desk", `A smartphone on a wood desk, blurred home interior, no readable UI, no faces. ${region}. ${GUARD}`],
    ["hands-off", "Device still", `A modern phone on linen, morning light, no on-screen text. ${region}. ${GUARD}`],
    ["desk", "Work desk", `Clean desk, notebook without writing, device, plant, no people. ${region}. ${GUARD}`],
    ["window-desk", "Window desk", `Desk beside a window, device face-down, cream wall. ${region}. ${GUARD}`],
    ["abstract-ui", "Soft glow", `Abstract device glow on a table, bokeh, no UI text. ${region}. ${GUARD}`],
    ["sofa", "Home still", `Living-room side table, device, ceramic cup, no people. ${region}. ${GUARD}`],
    ["bag", "Bag and phone", `Tote bag and phone on a bench, outdoor light, no logos. ${region}. ${GUARD}`],
    ["night-desk", "Night desk", `Night desk lamp and a dark phone, quiet product mood. ${region}. ${GUARD}`],
    ["linen-device", "Linen device", `Device on linen, editorial product still. ${region}. ${GUARD}`],
    ["plant-desk", "Plant and desk", `Desk plant, wood, muted device, no faces. ${region}. ${GUARD}`],
  ];
  return rows.map(([id, title, prompt]) => ({ id, title, prompt }));
}

function schoolScenes(region: string): ImagenScene[] {
  const rows: [string, string, string][] = [
    ["classroom", "Empty classroom", `Empty elementary classroom, wood desks, daylight, no children, no writing on the board. ${region}. ${GUARD}`],
    ["corridor", "School corridor", `Empty school corridor, cream walls, tiled floor, window light. ${region}. ${GUARD}`],
    ["yard", "Quiet yard", `Empty school yard, trees, morning light, no people. ${region}. ${GUARD}`],
    ["library", "Reading nook", `Empty reading nook, books with spines turned away, warm light. ${region}. ${GUARD}`],
    ["entrance", "School entrance", `School entrance canopy, empty steps, no signage text. ${region}. ${GUARD}`],
    ["desk", "Single desk", `A single wood school desk in sun, empty classroom bokeh. ${region}. ${GUARD}`],
    ["art", "Art table", `Art table with paper and crayons, empty, no drawings of people. ${region}. ${GUARD}`],
    ["garden", "School garden", `Small school garden, olive and herbs, empty bench. ${region}. ${GUARD}`],
    ["window", "Classroom window", `Classroom window, plants on the sill, empty desks. ${region}. ${GUARD}`],
    ["hall", "Quiet hall", `Civic-blue quiet hall, empty chairs, daylight. ${region}. ${GUARD}`],
  ];
  return rows.map(([id, title, prompt]) => ({ id, title, prompt }));
}

function genericScenes(region: string): ImagenScene[] {
  const rows: [string, string, string][] = [
    ["storefront", "Storefront", `Small local storefront, empty sidewalk, Mediterranean light, no readable signs. ${region}. ${GUARD}`],
    ["counter", "Service counter", `Warm service counter, wood, empty, lamp glow. ${region}. ${GUARD}`],
    ["interior", "Shop interior", `Neighborhood shop interior, tidy, empty of people, no logos. ${region}. ${GUARD}`],
    ["reception", "Reception", `Small-business reception, cream and navy, empty chairs. ${region}. ${GUARD}`],
    ["window", "Window light", `Interior window light on a wood counter, abstract. ${region}. ${GUARD}`],
    ["street", "Quiet street", `Quiet local street, plaster facades, no people, no shop-name text. ${region}. ${GUARD}`],
    ["table", "Meeting table", `Empty meeting table, ceramic cups, daylight. ${region}. ${GUARD}`],
    ["door", "Open door", `Open door spilling warm interior light onto stone. ${region}. ${GUARD}`],
    ["shelf", "Shelf still", `Wood shelf, ceramics, no branded packaging text. ${region}. ${GUARD}`],
    ["plant", "Entry plant", `Entry plant and cream wall, local business atmosphere. ${region}. ${GUARD}`],
  ];
  return rows.map(([id, title, prompt]) => ({ id, title, prompt }));
}

function clipTopic(raw: unknown, max = 140): string {
  return String(raw ?? "")
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/\d+\s*%/g, " ")
    .replace(/[₪$€£]\s*\d[\d,]*/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

/** 8–12 on-topic cinematic prompts for THIS ad's vertical + category + description. */
export function imagenScenesFor(input: {
  vertical?: unknown;
  category?: unknown;
  location?: unknown;
  locale?: unknown;
  q?: unknown;
  description?: unknown;
  offer?: unknown;
}): ImagenScene[] {
  const locale: Locale = input.locale === "he" || input.locale === "ar" || input.locale === "en" ? input.locale : "en";
  const region = regionFor(locale);
  const category = clipTopic(input.category, 80);
  const description = clipTopic(input.description ?? input.q, 140);
  const offer = clipTopic(input.offer, 80);
  const vertical: Vertical = detectVertical({
    businessName: "",
    category: category || String(input.category ?? ""),
    description: `${input.vertical ?? ""} ${description} ${input.location ?? ""}`,
  });
  const forced = String(input.vertical ?? "").toLowerCase();
  const v: Vertical =
    forced === "clinic" || forced === "restaurant" || forced === "pool" || forced === "retail" || forced === "product" || forced === "school" || forced === "generic"
      ? (forced as Vertical)
      : vertical;
  const all =
    v === "clinic" ? clinicScenes(region)
    : v === "restaurant" ? restaurantScenes(region)
    : v === "pool" ? poolScenes(region)
    : v === "retail" ? retailScenes(region)
    : v === "product" ? productScenes(region)
    : v === "school" ? schoolScenes(region)
    : genericScenes(region);
  const hint = [
    category ? `This advertisement is for this field only: ${category}.` : `Vertical: ${v}.`,
    description ? `On-topic details (do not typeset): ${description}.` : "",
    offer ? `Campaign mood only, never paint numbers: ${offer}.` : "",
  ].filter(Boolean).join(" ");
  return all.slice(0, IMAGEN_PICKER_COUNT).map((s) => ({
    ...s,
    prompt: `${s.prompt} ${hint}`,
  }));
}

export function verticalNoun(vertical: Vertical, locale: Locale): string {
  const map: Record<Vertical, Record<Locale, string>> = {
    clinic: { he: "מרפאה", ar: "عيادة", en: "clinic" },
    restaurant: { he: "מסעדה", ar: "مطعم", en: "restaurant" },
    pool: { he: "בריכה", ar: "مسبح", en: "pool" },
    retail: { he: "חנות", ar: "محل", en: "store" },
    product: { he: "מוצר", ar: "منتج", en: "product" },
    school: { he: "בית ספר", ar: "مدرسة", en: "school" },
    generic: { he: "עסק", ar: "شغل", en: "business" },
  };
  return map[vertical][locale];
}
