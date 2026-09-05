import { NextResponse } from "next/server";
import { loadBrandVoice, saveBrandVoice, FIRESTORE_BRAND_VOICE_COLLECTION } from "@/lib/gcp-ai";
import type { BrandVoice } from "@/lib/brand-voice";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function asVoice(body: unknown): BrandVoice | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  const id = typeof o.id === "string" && o.id.trim() ? o.id.trim() : "";
  if (!id) return null;
  const locales =
    o.locales && typeof o.locales === "object" ? (o.locales as BrandVoice["locales"]) : {};
  return {
    id,
    businessName: typeof o.businessName === "string" ? o.businessName : "",
    tone: typeof o.tone === "string" ? o.tone : typeof o.personalVoice === "string" ? o.personalVoice : "",
    do: Array.isArray(o.do) ? o.do.filter((x): x is string => typeof x === "string") : [],
    dont: Array.isArray(o.dont) ? o.dont.filter((x): x is string => typeof x === "string") : [],
    locales,
    updatedAt: new Date().toISOString(),
    niche: typeof o.niche === "string" ? o.niche : "",
    coreMessage: typeof o.coreMessage === "string" ? o.coreMessage : "",
    personalVoice: typeof o.personalVoice === "string" ? o.personalVoice : "",
    dialect: typeof o.dialect === "string" ? o.dialect : "",
  };
}

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id") || "";
  if (!id) {
    return NextResponse.json({ ok: false, collection: FIRESTORE_BRAND_VOICE_COLLECTION }, { status: 200 });
  }
  const voice = await loadBrandVoice(id);
  return NextResponse.json({ ok: Boolean(voice), voice, collection: FIRESTORE_BRAND_VOICE_COLLECTION }, { status: 200 });
}

export async function POST(req: Request) {
  try {
    const voice = asVoice(await req.json());
    if (!voice) return NextResponse.json({ ok: false, reason: "no_id" }, { status: 200 });
    const saved = await saveBrandVoice(voice);
    return NextResponse.json({ ok: true, voice: saved, collection: FIRESTORE_BRAND_VOICE_COLLECTION }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false, reason: "save_error" }, { status: 200 });
  }
}
