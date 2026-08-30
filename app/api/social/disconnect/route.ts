import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sanitizeClientId } from "@/lib/social/config";
import { deleteToken } from "@/lib/social/store";
import { isSocialProvider } from "@/lib/social/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { provider?: unknown; clientId?: unknown } = {};
  try {
    body = (await req.json()) as { provider?: unknown; clientId?: unknown };
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  if (!isSocialProvider(body.provider)) {
    return NextResponse.json({ ok: false, error: "bad_provider" }, { status: 400 });
  }
  const jar = await cookies();
  const clientId =
    sanitizeClientId(body.clientId) || sanitizeClientId(jar.get("sawek_client_id")?.value);
  if (!clientId) return NextResponse.json({ ok: false, error: "missing_client" }, { status: 400 });
  const res = NextResponse.json({ ok: true, provider: body.provider });
  await deleteToken(clientId, body.provider, res, req);
  return res;
}
