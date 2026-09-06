import { NextResponse } from "next/server";
import { factsToIntake, type GenerateBody } from "@/lib/engine/gemini-generate";
import { buildResearchSkeleton, runMarketResearch } from "@/lib/engine/ad-research";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Free public ad-intelligence: Meta Library / TikTok CC / peers + Search Grounding. */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as GenerateBody;
    const intake = factsToIntake(body);
    if (!intake.businessName.trim() && !intake.description.trim() && !intake.website.trim() && !intake.category.trim()) {
      return NextResponse.json({ ...buildResearchSkeleton(intake), fetched: true }, { status: 200 });
    }
    const research = await runMarketResearch(intake);
    return NextResponse.json(research, { status: 200 });
  } catch {
    return NextResponse.json({ ...buildResearchSkeleton(factsToIntake({})), fetched: true }, { status: 200 });
  }
}
