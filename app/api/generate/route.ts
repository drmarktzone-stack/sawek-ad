import { NextResponse } from "next/server";
import { geminiFailFromEnv, runGeminiGenerate, type GenerateBody } from "@/lib/engine/gemini-generate";
import { checkAiRateLimit, rateLimitHeaders, userIdFromRequest, vertexRateLimitedBody } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Gemini copy: Vertex first (GOOGLE_CLOUD_PROJECT / Cloud Run SA), then GEMINI_API_KEY.
 * Empty bodies (no URL / typed facts) return no_facts — never a clinic campaign.
 * Rate-limited callers still get useTemplates:true so anonymous overlays keep working.
 * Never logs keys or tokens.
 */
export async function POST(req: Request) {
  try {
    const userId = await userIdFromRequest(req);
    const limit = checkAiRateLimit(req, "vertex", userId);
    if (!limit.allowed) {
      return NextResponse.json(vertexRateLimitedBody(), { status: 200, headers: rateLimitHeaders(limit) });
    }
    const body = (await req.json()) as GenerateBody;
    const result = await runGeminiGenerate(body);
    return NextResponse.json(result, { status: 200, headers: rateLimitHeaders(limit) });
  } catch {
    return NextResponse.json(geminiFailFromEnv(), { status: 200 });
  }
}
