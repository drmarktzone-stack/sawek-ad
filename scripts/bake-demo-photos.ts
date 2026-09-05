/**
 * Bake durable JPEG stills for the three demo packs.
 * Prefers already-generated files, then Wikimedia/Openverse on-topic stock.
 */
import { createWriteStream, existsSync, mkdirSync, statSync, copyFileSync } from "fs";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
import { join } from "path";
import { DEMO_PHOTO_IDS, demoPhotoManifest, type DemoAssetId } from "../lib/demo-assets";
import { searchStockImages, type StockImage } from "../lib/stock-images";

const UA = "SAWEK-AD/0.1 (demo photo bake; https://github.com/drmarktzone-stack/sawek-ad)";

const QUERIES: Record<DemoAssetId, { vertical: string; category: string; q: string; description: string }> = {
  "demo-samer-clinic": {
    vertical: "clinic",
    category: "pediatric clinic",
    q: "empty pediatric waiting room Mediterranean clinic facade",
    description: "sunlit empty clinic waiting room olive courtyard",
  },
  "demo-olive-kitchen": {
    vertical: "restaurant",
    category: "Mediterranean restaurant",
    q: "hummus mezze olive oil terrace",
    description: "Mediterranean mezze olive oil empty terrace",
  },
  "demo-sand-boutique": {
    vertical: "retail",
    category: "fashion boutique",
    q: "clothing boutique linen rail window display",
    description: "quiet boutique one clothing rack linen",
  },
};

const WIKI_TITLES: Record<DemoAssetId, string[]> = {
  "demo-samer-clinic": [
    "Empty hospital corridor",
    "Clinic waiting room",
    "Mediterranean courtyard",
    "Olive tree courtyard",
    "Medical clinic exterior",
    "Sunlit empty room interior",
  ],
  "demo-olive-kitchen": [
    "Hummus",
    "Meze",
    "Olive oil",
    "Mediterranean cuisine",
    "Restaurant terrace",
    "Levantine food",
  ],
  "demo-sand-boutique": [
    "Clothing boutique",
    "Fashion boutique interior",
    "Clothes hanger",
    "Linen fabric",
    "Boutique window",
    "Clothing rack",
  ],
};

async function download(url: string, dest: string): Promise<boolean> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow" });
    if (!res.ok || !res.body) return false;
    const type = res.headers.get("content-type") || "";
    if (!/image\/(jpeg|jpg|png|webp)/i.test(type) && !/\.(jpe?g|png|webp)(\?|$)/i.test(url)) return false;
    mkdirSync(join(dest, ".."), { recursive: true });
    const file = createWriteStream(dest);
    await pipeline(Readable.fromWeb(res.body as never), file);
    return existsSync(dest) && statSync(dest).size > 8000;
  } catch {
    return false;
  }
}

async function wikiFile(title: string): Promise<string | null> {
  const q = title.startsWith("File:") ? title : `File:${title}`;
  const params = new URLSearchParams({
    action: "query",
    titles: q,
    prop: "imageinfo",
    iiprop: "url|mime|size",
    format: "json",
    origin: "*",
  });
  try {
    const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
      headers: { "User-Agent": UA },
    });
    const json = (await res.json()) as { query?: { pages?: Record<string, { imageinfo?: Array<{ url?: string; mime?: string }> }> } };
    const page = Object.values(json.query?.pages ?? {})[0];
    const info = page?.imageinfo?.[0];
    if (!info?.url || !/image\/(jpeg|jpg|png|webp)/i.test(String(info.mime))) return null;
    return info.url;
  } catch {
    return null;
  }
}

function seedDirs(): string[] {
  return [
    join(process.cwd(), "tmp/demo-photos"),
    "/tmp/cursor/generate-images",
    "/opt/cursor/artifacts",
  ];
}

function findSeed(id: DemoAssetId, file: string): string | null {
  const stems = [file, file.replace(".jpg", ""), `${id}-${file}`, `${id}-${file.replace(".jpg", "")}`];
  for (const dir of seedDirs()) {
    if (!existsSync(dir)) continue;
    for (const stem of stems) {
      for (const ext of [".jpg", ".jpeg", ".png", ".webp"]) {
        const p = join(dir, `${stem}${ext.startsWith(".") && stem.endsWith(ext) ? "" : ext}`.replace(/\.jpg(\.jpg)$/, ".jpg"));
        if (existsSync(p) && statSync(p).size > 8000) return p;
      }
    }
  }
  return null;
}

async function bakeOne(id: DemoAssetId): Promise<void> {
  const outDir = join(process.cwd(), "public/packs/assets", id);
  mkdirSync(outDir, { recursive: true });
  const manifest = demoPhotoManifest(id);
  const q = QUERIES[id];
  let stock: StockImage[] = [];
  try {
    const hit = await searchStockImages({
      vertical: q.vertical,
      category: q.category,
      q: q.q,
      description: q.description,
      limit: 36,
    });
    stock = hit.images ?? [];
  } catch {
    stock = [];
  }
  let stockIdx = 0;
  for (const row of manifest) {
    const dest = join(outDir, row.file);
    if (existsSync(dest) && statSync(dest).size > 8000) {
      console.log("keep", dest);
      continue;
    }
    const seed = findSeed(id, row.file);
    if (seed) {
      copyFileSync(seed, dest);
      console.log("seed", dest, "from", seed);
      continue;
    }
    let ok = false;
    while (stockIdx < stock.length && !ok) {
      const img = stock[stockIdx++]!;
      ok = await download(img.full, dest);
      if (ok) console.log("stock", dest, img.title);
    }
    if (ok) continue;
    for (const title of WIKI_TITLES[id]) {
      const url = await wikiFile(title);
      if (!url) continue;
      if (await download(url, dest)) {
        console.log("wiki", dest, title);
        ok = true;
        break;
      }
    }
    if (!ok) console.error("MISSING", dest);
  }
}

async function main() {
  for (const id of DEMO_PHOTO_IDS) {
    await bakeOne(id);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
