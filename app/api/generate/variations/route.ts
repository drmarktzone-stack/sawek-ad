import { NextResponse } from "next/server";
import { runFlashVariations } from "@/lib/engine/gemini-variations";
import { geminiFailFromEnv, type GenerateBody } from "@/lib/engine/gemini-generate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Dedicated Vertex Gemini Flash path — dozens of short Meta / WhatsApp / Google Ads texts.
 * Locales filled by Cloud Translation when a language is missing.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as GenerateBody;
    const result = await runFlashVariations(body);
    return NextResponse.json(result, { status: 200 });
  } catch {
    return NextResponse.json(geminiFailFromEnv(), { status: 200 });
  }
}
