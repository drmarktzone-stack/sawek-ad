import { NextResponse } from "next/server";
import { sessionFromRequest } from "@/lib/auth-server";
import { generateOrderCode } from "@/lib/order-code";
import { parseInterval, parsePayMethod, receiveDetails } from "@/lib/payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { session } = await sessionFromRequest(req);
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "auth" }, { status: 401 });
  }
  let body: { method?: unknown; interval?: unknown } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }
  const method = parsePayMethod(body.method);
  if (!method) {
    return NextResponse.json({ ok: false, error: "method" }, { status: 400 });
  }
  const interval = parseInterval(body.interval);
  const orderCode = generateOrderCode(`${session.user.id}:${interval}:${method}`);
  return NextResponse.json({
    ok: true,
    ...receiveDetails({ method, interval, orderCode }),
  });
}
