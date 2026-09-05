import { NextResponse } from "next/server";
import { publicGcpStackStatus, publicGeminiStatus } from "@/lib/vertex";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("stack") === "0") {
    return NextResponse.json(await publicGeminiStatus());
  }
  const status = await publicGcpStackStatus();
  return NextResponse.json(status);
}
