import { NextResponse } from "next/server";
import { geminiFailFromEnv, runGeminiScore, type ScoreBody } from "@/lib/engine/gemini-generate";
import { checkAiRateLimit, rateLimitHeaders, userIdFromRequest, vertexRateLimitedBody } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const userId = await userIdFromRequest(req);
    const limit = checkAiRateLimit(req, "vertex", userId);
    if (!limit.allowed) {
      return NextResponse.json(vertexRateLimitedBody(), { status: 200, headers: rateLimitHeaders(limit) });
    }
    const body = (await req.json()) as ScoreBody;
    const result = await runGeminiScore(body);
    return NextResponse.json(result, { status: 200 });
  } catch {
    return NextResponse.json(geminiFailFromEnv(), { status: 200 });
  }
}
