import { NextResponse } from "next/server";
import { runGeminiGenerate, type GenerateBody } from "@/lib/engine/gemini-generate";

const TEMPLATES = { ok: false, useTemplates: true } as const;

/**
 * Optional Gemini enrichment. The client never depends on this.
 * Without GEMINI_API_KEY the app uses intake-driven templates.
 * Never logs the API key.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as GenerateBody;
    const result = await runGeminiGenerate(body);
    return NextResponse.json(result, { status: 200 });
  } catch {
    return NextResponse.json(TEMPLATES, { status: 200 });
  }
}
