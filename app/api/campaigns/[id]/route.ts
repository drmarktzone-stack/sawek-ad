import { NextResponse } from "next/server";
import { supabaseAnonClient, supabaseServiceClient } from "@/lib/auth-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isPack(payload: unknown): payload is Record<string, unknown> {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return false;
  const o = payload as Record<string, unknown>;
  return Boolean(o.intake && o.id && Array.isArray(o.variants));
}

/** Share-by-id landing. Returns one pack or 404. Never lists campaigns. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const key = String(id || "").trim();
  if (!key || key.length > 120 || /[^\w.-]/.test(key)) {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }
  const sb = supabaseServiceClient() ?? supabaseAnonClient();
  if (!sb) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  try {
    const { data, error } = await sb.from("campaigns").select("id,payload").eq("id", key).maybeSingle();
    if (error || !data || !isPack(data.payload)) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, pack: data.payload });
  } catch {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
}
