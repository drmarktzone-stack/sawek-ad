import { NextResponse } from "next/server";
import { searchStockImages, type StockSearchInput } from "@/lib/stock-images";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function read(req: Request, key: string): string {
  const url = new URL(req.url);
  return String(url.searchParams.get(key) ?? "").trim();
}

/**
 * CC stock photos from Openverse and/or Wikimedia Commons. No paid key.
 * Maps vertical + category + location into English topic queries.
 */
export async function GET(req: Request) {
  try {
    const input: StockSearchInput = {
      q: read(req, "q"),
      vertical: read(req, "vertical"),
      category: read(req, "category"),
      location: read(req, "location"),
      limit: Number(read(req, "limit") || 48) || 48,
      page: Number(read(req, "page") || 1) || 1,
    };
    const result = await searchStockImages(input);
    return NextResponse.json(result, { status: 200 });
  } catch {
    return NextResponse.json(
      { ok: false, images: [], page: 1, nextPage: null, queries: [], error: "stock_error" },
      { status: 200 },
    );
  }
}
