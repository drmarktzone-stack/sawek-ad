import { lookup } from "node:dns/promises";
import { NextResponse } from "next/server";
import { inspectUrl, isBlockedIp } from "@/lib/url-ingest";
import {
  decodeVisionImage,
  geminiFailFromEnv,
  runGeminiVision,
  VISION_MAX_BYTES,
  type VisionBody,
} from "@/lib/engine/gemini-generate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_MIME = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

async function fetchImageUrl(raw: string): Promise<{ mime: string; data: string } | null> {
  const inspected = inspectUrl(raw);
  if (!inspected.ok) return null;
  const host = inspected.url.hostname;
  try {
    const records = await lookup(host, { all: true, verbatim: true });
    if (!records.length || records.some((r) => isBlockedIp(r.address))) return null;
  } catch {
    return null;
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(inspected.url.toString(), {
      method: "GET",
      redirect: "follow",
      signal: ctrl.signal,
      headers: { Accept: "image/jpeg,image/png,image/webp,image/*;q=0.8" },
    });
    if (!res.ok) return null;
    const mimeRaw = (res.headers.get("content-type") ?? "").split(";")[0]?.trim().toLowerCase() ?? "";
    const mime = mimeRaw === "image/jpg" ? "image/jpeg" : mimeRaw;
    if (!ALLOWED_MIME.has(mime)) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (!buf.length || buf.length > VISION_MAX_BYTES) return null;
    return { mime: mime === "image/jpg" ? "image/jpeg" : mime, data: buf.toString("base64") };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as VisionBody;
    let image = decodeVisionImage(body);
    if (!image && typeof body.imageUrl === "string" && body.imageUrl.trim()) {
      image = await fetchImageUrl(body.imageUrl.trim());
    }
    if (!image) {
      return NextResponse.json(geminiFailFromEnv(), { status: 200 });
    }
    const result = await runGeminiVision(body, image);
    return NextResponse.json(result, { status: 200 });
  } catch {
    return NextResponse.json(geminiFailFromEnv(), { status: 200 });
  }
}
