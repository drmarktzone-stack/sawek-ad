import { NextResponse } from "next/server";
import { runImagen, type ImagenFacts } from "@/lib/imagen";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Optional Vertex Imagen 3 still. Never logs image bytes or tokens.
 * Always JSON 200: { ok:true, mime, imageBase64 } | { ok:false, reason }.
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
    const result = await runImagen(facts);
    return NextResponse.json(result, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false, reason: "imagen_error" }, { status: 200 });
  }
}
