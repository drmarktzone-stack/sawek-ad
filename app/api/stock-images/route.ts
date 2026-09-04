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
 * Vertex Imagen stills are the library. When Imagen returns 0, serve vertical
 * curated graphic stills (or empty + Hebrew message) — never junk Openverse politics.
 * source=imagen | cc | all.
 */
export async function GET(req: Request) {
  try {
    const source = (read(req, "source") || "imagen").toLowerCase();
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

    if (source === "cc") {
      const result = await searchStockImages(input);
      return NextResponse.json(
        {
          ...result,
          imagen: [],
          imagenRequested: 0,
          imagenGot: 0,
          emptyMessage:
            result.emptyMessage ||
            (result.images.length
              ? undefined
              : "אין תמונות חופשיות רלוונטיות לנושא — נסו כרזות גרפיות או תמונה מהאתר."),
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

    // source=all: Imagen first; if empty, curated — CC only if still empty and filtered hard.
    const curated = imagen.length ? [] : await curatedFallbackStills(input, Math.min(8, requested));
    const primary = imagen.length ? imagen : curated;
    const result = primary.length
      ? { ok: true as const, images: [] as Awaited<ReturnType<typeof searchStockImages>>["images"], page: 1, nextPage: null as number | null, queries: [] as string[] }
      : await searchStockImages(input);
    return NextResponse.json(
      {
        ...result,
        imagen,
        curated,
        images: primary.length ? primary : result.images,
        imagenRequested: requested,
        imagenGot: imagen.length,
        fallback: imagen.length ? "imagen" : curated.length ? "curated" : result.images.length ? "cc" : "empty",
        emptyMessage:
          primary.length || result.images.length
            ? imagen.length
              ? undefined
              : curated.length
                ? "Vertex Imagen ריק — מציגים כרזות גרפיות לפי התחום."
                : undefined
            : result.emptyMessage ||
              "אין תמונות רלוונטיות לנושא — נסו כרזות גרפיות או תמונה מהאתר.",
      },
      { status: 200 },
    );
  } catch {
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
        emptyMessage: "אין תמונות רלוונטיות לנושא — נסו כרזות גרפיות או תמונה מהאתר.",
      },
      { status: 200 },
    );
  }
}
