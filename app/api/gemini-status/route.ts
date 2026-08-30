import { NextResponse } from "next/server";
import { runtimeEnv } from "@/lib/runtime-env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ configured: Boolean(runtimeEnv("GEMINI_API_KEY")) });
}
