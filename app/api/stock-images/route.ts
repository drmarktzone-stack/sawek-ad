import { NextResponse } from "next/server";
import {
  curatedFallbackStills,
  searchStockImages,
  vertexStillsForStock,
  type StockImage,
  type StockSearchInput,
} from "@/lib/stock-images";
import { IMAGEN_PICKER_COUNT } from "@/lib/imagen-scenes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function read(req: Request, key: string): string {
  const url = new URL(req.url);
  return String(url.searchParams.get(key) ?? "").trim();
}

function neverEmpty(input: StockSearchInput, extra: StockImage[] = []): StockImage[] {
  if (extra.length >= 6) return extra;
  const curated = curatedFallbackStills(input, Math.max(8, 6 - extra.length));
  const seen = new Set(extra.map((i) => i.id));
  const merged = [...extra];
  for (const img of curated) {
    if (seen.has(img.id)) continue;
    seen.add(img.id);
    merged.push(img);
    if (merged.length >= 6) break;
  }
  return merged.length >= 6 ? merged : [...merged, ...curated].slice(0, Math.max(6, curated.length));
}

/**
 * Vertex Imagen stills are the library. When Imagen returns 0, serve vertical
 * curated graphic stills — never junk Openverse politics, never an empty wall.
 * source=imagen | cc | all.
 */
export async function GET(req: Request) {
  const input: StockSearchInput = {
    q: read(req, "q"),
    vertical: read(req, "vertical"),
    category: read(req, "category"),
    location: read(req, "location"),
    description: read(req, "description"),
    offer: read(req, "offer"),
    limit: Number(read(req, "limit") || 48) || 48,
    page: Number(read(req, "page") || 1) || 1,
  };
  const requested = IMAGEN_PICKER_COUNT;
  const source = (read(req, "source") || "imagen").toLowerCase();

  try {
    if (source === "cc") {
      const result = await searchStockImages(input);
      const images = result.images.length >= 6 ? result.images : neverEmpty(input, result.images);
      return NextResponse.json(
        {
          ...result,
          images,
          imagen: [],
          curated: images.filter((i) => i.source === "curated"),
          imagenRequested: 0,
          imagenGot: 0,
          emptyMessage:
            result.images.length
              ? undefined
              : "Vertex Imagen ריק — מציגים כרזות גרפיות לפי התחום.",
        },
        { status: 200 },
      );
    }

    const stillsP = vertexStillsForStock(input, requested).catch(() => [] as StockImage[]);
    const stills = await Promise.race([
      stillsP,
      new Promise<StockImage[]>((resolve) => setTimeout(() => resolve([]), 45000)),
    ]);
    const imagen = Array.isArray(stills) ? stills : [];

    if (source === "imagen") {
      const images = neverEmpty(input, imagen);
      return NextResponse.json(
        {
          ok: true,
          images,
          imagen,
          curated: images.filter((i) => i.source === "curated"),
          page: 1,
          nextPage: null,
          queries: [],
          imagenRequested: requested,
          imagenGot: imagen.length,
          fallback: imagen.length >= 6 ? "imagen" : "curated",
          emptyMessage:
            imagen.length >= 6 ? undefined : "Vertex Imagen ריק — מציגים כרזות גרפיות לפי התחום.",
        },
        { status: 200 },
      );
    }

    const curated = imagen.length >= 6 ? [] : curatedFallbackStills(input, Math.min(8, requested));
    const primary = neverEmpty(input, imagen.length ? imagen : curated);
    return NextResponse.json(
      {
        ok: true,
        images: primary,
        imagen,
        curated,
        page: 1,
        nextPage: null,
        queries: [],
        imagenRequested: requested,
        imagenGot: imagen.length,
        fallback: imagen.length >= 6 ? "imagen" : "curated",
        emptyMessage:
          imagen.length >= 6 ? undefined : "Vertex Imagen ריק — מציגים כרזות גרפיות לפי התחום.",
      },
      { status: 200 },
    );
  } catch {
    const curated = neverEmpty(input, []);
    return NextResponse.json(
      {
        ok: true,
        images: curated,
        imagen: [],
        curated,
        page: 1,
        nextPage: null,
        queries: [],
        imagenRequested: requested,
        imagenGot: 0,
        fallback: "curated",
        emptyMessage: "Vertex Imagen ריק — מציגים כרזות גרפיות לפי התחום.",
      },
      { status: 200 },
    );
  }
}
