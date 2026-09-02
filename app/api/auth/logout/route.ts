import { NextResponse } from "next/server";
import { applyAuthCookies } from "@/lib/auth-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const res = NextResponse.json({ ok: true });
  return applyAuthCookies(res, req, null);
}
