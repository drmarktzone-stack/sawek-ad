import { NextResponse } from "next/server";
import { getImagenImage } from "@/lib/imagen-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Serve a stored Vertex Imagen still. Never invents a placeholder SVG. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const hit = getImagenImage(String(id || "").replace(/[^a-f0-9]/gi, ""));
  if (!hit) {
    return NextResponse.json({ ok: false, reason: "not_found" }, { status: 404 });
  }
  return new NextResponse(new Uint8Array(hit.bytes), {
    status: 200,
    headers: {
      "Content-Type": hit.mime,
      "Cache-Control": "private, max-age=1800",
      "X-Imagen-Model": hit.model || "imagen-3.0-generate-001",
    },
  });
}
