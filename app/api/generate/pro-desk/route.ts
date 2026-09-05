import { NextResponse } from "next/server";
import { runProDesk } from "@/lib/engine/gemini-pro-jobs";
import { factsToIntake, type GenerateBody } from "@/lib/engine/gemini-generate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Vertex Gemini Pro — CMO strategy, audit, calendar, script packs. */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as GenerateBody;
    const desk = await runProDesk(factsToIntake(body));
    return NextResponse.json(desk, { status: 200 });
  } catch {
    return NextResponse.json({ tier: "pro", down: true, reason: "gemini_error" }, { status: 200 });
  }
}
