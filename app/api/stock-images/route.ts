import { NextResponse } from "next/server";
import {
  curatedFallbackStills,
  searchStockImages,
  vertexStillsForStock,
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

/**
 * Live topic photos (Wikimedia / Openverse / optional Google CSE) are the library.
 * Vertex Imagen is optional extra. Curated graphics only when live photos are empty.
 * source=live | cc | imagen | all.
 */
export async function GET(req: Request) {
  try {
    const source = (read(req, "source") || "live").toLowerCase();
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

    if (source === "cc" || source === "live") {
      const result = await searchStockImages(input);
      if (result.images.length) {
        return NextResponse.json(
          {
            ...result,
            imagen: [],
            imagenRequested: 0,
            imagenGot: 0,
            fallback: "live",
          },
          { status: 200 },
        );
      }
      // Always offer on-topic options after any scan — curated vertical graphics when live is empty.
      const curated = await curatedFallbackStills(input, Math.min(8, Math.max(4, Number(input.limit) || 8)));
      return NextResponse.json(
        {
          ok: true,
          images: curated,
          curated,
          imagen: [],
          page: 1,
          nextPage: null,
          queries: result.queries ?? [],
          imagenRequested: 0,
          imagenGot: 0,
          fallback: curated.length ? "curated" : "empty",
          emptyMessage: curated.length
            ? "אין תמונות חיות רלוונטיות — מציגים כרזות גרפיות לפי התחום."
            : result.emptyMessage ||
              "אין תמונות חיות רלוונטיות לנושא — נסו כרזות גרפיות או תמונה מהאתר.",
        },
        { status: 200 },
      );
    }

    const stillsP = vertexStillsForStock(input, requested).catch(() => []);
    const stills = await Promise.race([
      stillsP,
      new Promise<Awaited<typeof stillsP>>((resolve) => setTimeout(() => resolve([]), 45000)),
    ]);
    const imagen = Array.isArray(stills) ? stills : [];

    if (source === "imagen") {
      if (imagen.length) {
        return NextResponse.json(
          {
            ok: true,
            images: imagen,
            imagen,
            page: 1,
            nextPage: null,
            queries: [],
            imagenRequested: requested,
            imagenGot: imagen.length,
          },
          { status: 200 },
        );
      }
      // Imagen empty: vertical curated graphics — not random CC politics.
      const curated = await curatedFallbackStills(input, Math.min(8, requested));
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
          fallback: curated.length ? "curated" : "empty",
          emptyMessage: curated.length
            ? "Vertex Imagen ריק — מציגים כרזות גרפיות לפי התחום."
            : "אין תמונות AI כרגע — נסו כרזות גרפיות או תמונה מהאתר.",
        },
        { status: 200 },
      );
    }

    // source=all: live topic photos first, then Imagen, then curated graphics.
    const result = await searchStockImages(input);
    const live = result.images;
    const curated = live.length || imagen.length ? [] : await curatedFallbackStills(input, Math.min(8, requested));
    const images = live.length ? [...live, ...imagen] : imagen.length ? imagen : curated;
    return NextResponse.json(
      {
        ...result,
        imagen,
        curated,
        images,
        imagenRequested: requested,
        imagenGot: imagen.length,
        fallback: live.length ? "live" : imagen.length ? "imagen" : curated.length ? "curated" : "empty",
        emptyMessage:
          images.length
            ? live.length
              ? undefined
              : imagen.length
                ? undefined
                : "אין תמונות חיות רלוונטיות — מציגים כרזות גרפיות לפי התחום."
            : result.emptyMessage ||
              "אין תמונות רלוונטיות לנושא — נסו כרזות גרפיות או תמונה מהאתר.",
      },
      { status: 200 },
    );
  } catch {
    // Last resort: curated vertical stills so the picker is never empty junk.
    try {
      const input: StockSearchInput = {
        q: read(req, "q"),
        vertical: read(req, "vertical"),
        category: read(req, "category"),
        location: read(req, "location"),
        description: read(req, "description"),
        offer: read(req, "offer"),
        limit: Number(read(req, "limit") || 48) || 48,
        page: 1,
      };
      const curated = await curatedFallbackStills(input, Math.min(8, IMAGEN_PICKER_COUNT));
      if (curated.length) {
        return NextResponse.json(
          {
            ok: true,
            images: curated,
            imagen: [],
            curated,
            page: 1,
            nextPage: null,
            queries: [],
            imagenRequested: IMAGEN_PICKER_COUNT,
            imagenGot: 0,
            fallback: "curated",
            emptyMessage: "Vertex Imagen ריק — מציגים כרזות גרפיות לפי התחום.",
          },
          { status: 200 },
        );
      }
    } catch {
      /* fall through */
    }
    return NextResponse.json(
      {
        ok: false,
        images: [],
        imagen: [],
        page: 1,
        nextPage: null,
        queries: [],
        imagenRequested: IMAGEN_PICKER_COUNT,
        imagenGot: 0,
        error: "stock_error",
        fallback: "empty",
        emptyMessage: "אין תמונות רלוונטיות לנושא — נסו כרזות גרפיות או תמונה מהאתר.",
      },
      { status: 200 },
    );
  }
}
