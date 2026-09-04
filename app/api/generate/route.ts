import { NextResponse } from "next/server";
import { geminiFailFromEnv, runGeminiGenerate, type GenerateBody } from "@/lib/engine/gemini-generate";
import { bodyHasFacts, templateFillFromFacts } from "@/lib/engine/fact-copy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Gemini copy: Vertex first (GOOGLE_CLOUD_PROJECT / Cloud Run SA), then GEMINI_API_KEY.
 * Empty bodies (no URL / typed facts) return no_facts — never a clinic campaign.
 * If Gemini fails and facts exist, return fact-aware local fill (ok:true).
 * Never logs keys or tokens.
 */
export async function POST(req: Request) {
  let body: GenerateBody = {};
  try {
    body = (await req.json()) as GenerateBody;
  } catch {
    return NextResponse.json(geminiFailFromEnv(), { status: 200 });
  }
  try {
    const result = await runGeminiGenerate(body);
    return NextResponse.json(result, { status: 200 });
  } catch {
    if (bodyHasFacts(body)) {
      return NextResponse.json(templateFillFromFacts(body), { status: 200 });
    }
    return NextResponse.json(geminiFailFromEnv(), { status: 200 });
  }
}
