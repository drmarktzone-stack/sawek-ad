import { NextResponse } from "next/server";
import { geminiFailFromEnv, runGeminiGenerate, type GenerateBody } from "@/lib/engine/gemini-generate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Gemini copy: Vertex first (GOOGLE_CLOUD_PROJECT / Cloud Run SA), then GEMINI_API_KEY.
 * Empty bodies (no URL / typed facts) return no_facts — never a clinic campaign.
 * Never logs keys or tokens.
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
