import { NextResponse } from "next/server";
import { factsToIntake, type GenerateBody } from "@/lib/engine/gemini-generate";
import { buildResearchSkeleton, runMarketResearch } from "@/lib/engine/ad-research";
import { checkAiRateLimit, rateLimitHeaders, userIdFromRequest } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Free public ad-intelligence: Meta Library / TikTok CC / peers + Search Grounding. */
export async function POST(req: Request) {
  try {
    const userId = await userIdFromRequest(req);
    const limit = checkAiRateLimit(req, "research", userId);
    if (!limit.allowed) {
      return NextResponse.json(
        { ...buildResearchSkeleton(factsToIntake({})), fetched: true, reason: "rate_limited" },
        { status: 200, headers: rateLimitHeaders(limit) },
      );
    }
    const body = (await req.json()) as GenerateBody & { retry?: unknown };
    const intake = factsToIntake(body);
    if (!intake.businessName.trim() && !intake.description.trim() && !intake.website.trim() && !intake.category.trim()) {
      return NextResponse.json({ ...buildResearchSkeleton(intake), fetched: true }, { status: 200 });
    }
    const research = await runMarketResearch(intake, { bypassCache: Boolean(body.retry) });
    return NextResponse.json(research, { status: 200 });
  } catch {
    return NextResponse.json({ ...buildResearchSkeleton(factsToIntake({})), fetched: true }, { status: 200 });
  }
}
