import { NextResponse } from "next/server";
import { runImagen, runImagenMany, type ImagenFacts } from "@/lib/imagen";
import { IMAGEN_PICKER_COUNT } from "@/lib/imagen-scenes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Optional Vertex Imagen 3 still(s). Never logs image bytes or tokens.
 * Always JSON 200: { ok:true, mime, imageBase64, images } | { ok:false, reason, images }.
 * Accepts sampleCount or prompts[] for 8–12 parallel stills.
 */
export async function POST(req: Request) {
  try {
    let facts: ImagenFacts = {};
    try {
      const body = (await req.json()) as ImagenFacts;
      if (body && typeof body === "object") facts = body;
    } catch {
      facts = {};
    }
    const count = Math.floor(Number(facts.sampleCount) || 0);
    const manyPrompts = Array.isArray(facts.prompts) && facts.prompts.length > 1;
    if (count > 1 || manyPrompts) {
      const batch = await runImagenMany({
        ...facts,
        sampleCount: count > 1 ? Math.min(12, Math.max(8, count)) : IMAGEN_PICKER_COUNT,
      });
      const first = batch.images[0];
      if (first) {
        return NextResponse.json(
          {
            ok: true,
            mime: first.mime,
            imageBase64: first.imageBase64,
            publicUrl: first.publicUrl,
            model: first.model,
            images: batch.images,
          },
          { status: 200 },
        );
      }
      return NextResponse.json(
        { ok: false, reason: batch.reason ?? "imagen_error", images: [] },
        { status: 200 },
      );
    }
    const result = await runImagen(facts);
    if (result.ok) {
      return NextResponse.json({ ...result, images: [result] }, { status: 200 });
    }
    return NextResponse.json({ ...result, images: [] }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false, reason: "imagen_error", images: [] }, { status: 200 });
  }
}
