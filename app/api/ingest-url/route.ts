import { NextResponse } from "next/server";
import { ingestUrl, inspectUrl, type UrlIngestErrorCode } from "@/lib/url-ingest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function selfHosts(req: Request): string[] {
  const out: string[] = [];
  const host = req.headers.get("host");
  if (host) out.push(host.split(":")[0] ?? "");
  const xf = req.headers.get("x-forwarded-host");
  if (xf) out.push(xf.split(",")[0]?.split(":")[0] ?? "");
  const origin = req.headers.get("origin");
  if (origin) {
    try {
      out.push(new URL(origin).hostname);
    } catch {
      /* ignore */
    }
  }
  return out.filter(Boolean);
}

function statusFor(error: UrlIngestErrorCode): number {
  if (error === "invalid_url" || error === "blocked") return 400;
  if (error === "timeout") return 504;
  if (error === "too_large") return 413;
  return 422;
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_url" }, { status: 400 });
  }
  const url = typeof (body as { url?: unknown })?.url === "string" ? (body as { url: string }).url : "";
  const blocked = selfHosts(req);
  const inspected = inspectUrl(url, blocked);
  if (!inspected.ok) {
    return NextResponse.json({ ok: false, error: inspected.error }, { status: statusFor(inspected.error) });
  }
  const result = await ingestUrl(url, blocked);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: statusFor(result.error) });
  }
  return NextResponse.json(result);
}
