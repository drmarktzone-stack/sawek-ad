import { NextResponse } from "next/server";
import { publicGeminiStatus } from "@/lib/vertex";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const status = await publicGeminiStatus();
  return NextResponse.json(status);
}
