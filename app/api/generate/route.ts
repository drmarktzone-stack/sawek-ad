import { NextResponse } from "next/server";
import { geminiFailFromEnv, runGeminiGenerate, type GenerateBody } from "@/lib/engine/gemini-generate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Optional Gemini enrichment. The client never depends on this.
 * Without GEMINI_API_KEY the app uses intake-driven templates.
 * With a key, Gemini errors do not fall back to templates.
 * Never logs the API key.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as GenerateBody;
    const result = await runGeminiGenerate(body);
    return NextResponse.json(result, { status: 200 });
  } catch {
    return NextResponse.json(geminiFailFromEnv(), { status: 200 });
  }
}
