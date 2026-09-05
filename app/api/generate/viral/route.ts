import { NextResponse } from "next/server";
import { runViralDeskJob, type ViralDeskJob } from "@/lib/engine/viral-desk";
import { type GenerateBody } from "@/lib/engine/gemini-generate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const JOBS: ViralDeskJob[] = ["scripts", "hooks", "predict", "rewrite", "carousel", "calendar30", "trends"];

/** Mohtawak-style jobs for the viral-desk PR. Scores are estimates, not live metrics. */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as GenerateBody & { job?: unknown; script?: unknown; slides?: unknown };
    const job = JOBS.includes(body.job as ViralDeskJob) ? (body.job as ViralDeskJob) : "scripts";
    const result = await runViralDeskJob(job, body);
    return NextResponse.json(result, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false, job: "scripts", reason: "gemini_error" }, { status: 200 });
  }
}
