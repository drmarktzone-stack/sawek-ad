import { NextResponse } from "next/server";
import { getTmpImage } from "@/lib/social/tmp-media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!id || !/^[0-9a-f]{36}$/.test(id)) {
    return new NextResponse(null, { status: 404 });
  }
  const hit = getTmpImage(id);
  if (!hit) return new NextResponse(null, { status: 404 });
  return new NextResponse(new Uint8Array(hit.bytes), {
    status: 200,
    headers: {
      "Content-Type": hit.mime || "image/jpeg",
      "Cache-Control": "private, max-age=600",
    },
  });
}
