import { NextResponse } from "next/server";
import { searchStockImages, vertexStillsForStock, type StockSearchInput } from "@/lib/stock-images";
import { IMAGEN_PICKER_COUNT } from "@/lib/imagen-scenes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function read(req: Request, key: string): string {
  const url = new URL(req.url);
  return String(url.searchParams.get(key) ?? "").trim();
}

/**
 * Vertex Imagen stills are the library. Wikimedia/Openverse are optional CC only
 * (never the default wall). source=imagen | cc | all.
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
        { ...result, imagen: [], imagenRequested: 0, imagenGot: 0 },
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

    const result = await searchStockImages(input);
    return NextResponse.json(
      {
        ...result,
        imagen,
        images: result.images,
        imagenRequested: requested,
        imagenGot: imagen.length,
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
      },
      { status: 200 },
    );
  }
}
