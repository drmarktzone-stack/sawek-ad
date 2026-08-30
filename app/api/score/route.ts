import { NextResponse } from "next/server";
import { geminiFailFromEnv, runGeminiScore, type ScoreBody } from "@/lib/engine/gemini-generate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ScoreBody;
    const result = await runGeminiScore(body);
    return NextResponse.json(result, { status: 200 });
  } catch {
    return NextResponse.json(geminiFailFromEnv(), { status: 200 });
  }
}
