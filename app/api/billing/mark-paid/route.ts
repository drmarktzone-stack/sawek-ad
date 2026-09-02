import { NextResponse } from "next/server";
import { sessionFromRequest, supabaseAnonClient, supabaseServiceClient } from "@/lib/auth-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { session } = await sessionFromRequest(req);
  if (!session?.user) return NextResponse.json({ ok: false, error: "auth" }, { status: 401 });
  let body: { method?: unknown } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }
  const method = body.method === "bit" ? "bit" : "bank";
  const now = new Date().toISOString();
  const patch = method === "bit" ? { bit_marked_paid_at: now, updated_at: now } : { bank_marked_paid_at: now, updated_at: now };
  const sb = supabaseServiceClient() ?? supabaseAnonClient();
  if (!sb) return NextResponse.json({ ok: false, error: "no_supabase" }, { status: 503 });
  const { error } = await sb.from("profiles").update(patch).eq("id", session.user.id);
  if (error) return NextResponse.json({ ok: false, error: "profile" }, { status: 400 });
  return NextResponse.json({ ok: true, method, at: now });
}
