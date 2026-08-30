import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { appBaseUrl, sanitizeClientId } from "@/lib/social/config";
import { loadDecrypted } from "@/lib/social/store";
import { publishFacebookPage, publishInstagram } from "@/lib/social/facebook";
import { publishLinkedIn } from "@/lib/social/linkedin";
import { isSocialProvider, type PublishResult, type SocialProvider } from "@/lib/social/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Parsed = {
  clientId: string;
  campaignId: string;
  platforms: SocialProvider[];
  message: string;
  imageUrl?: string;
  imageBytes?: Buffer;
  imageMime?: string;
};

function parsePlatforms(raw: unknown): SocialProvider[] {
  let list: unknown[] = [];
  if (Array.isArray(raw)) list = raw;
  else if (typeof raw === "string") {
    try {
      const j = JSON.parse(raw) as unknown;
      list = Array.isArray(j) ? j : raw.split(",");
    } catch {
      list = raw.split(",");
    }
  }
  const out: SocialProvider[] = [];
  for (const p of list) {
    const s = String(p).trim().toLowerCase();
    if (isSocialProvider(s) && !out.includes(s)) out.push(s);
  }
  return out;
}

async function parseRequest(req: Request): Promise<Parsed | { error: string; status: number }> {
  const ctype = req.headers.get("content-type") ?? "";
  if (ctype.includes("multipart/form-data")) {
    const form = await req.formData();
    const clientId = sanitizeClientId(form.get("clientId"));
    const campaignId = String(form.get("campaignId") ?? "").trim();
    const platforms = parsePlatforms(form.get("platforms"));
    const message = String(form.get("message") ?? "");
    const imageUrlRaw = String(form.get("imageUrl") ?? "").trim();
    const imageUrl = imageUrlRaw && /^https?:\/\//i.test(imageUrlRaw) ? imageUrlRaw : undefined;
    const file = form.get("image");
    let imageBytes: Buffer | undefined;
    let imageMime: string | undefined;
    if (file instanceof File && file.size > 0) {
      if (file.size > 8 * 1024 * 1024) return { error: "image_too_large", status: 400 };
      imageBytes = Buffer.from(await file.arrayBuffer());
      imageMime = file.type || "image/jpeg";
    }
    return { clientId, campaignId, platforms, message, imageUrl, imageBytes, imageMime };
  }
  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return { error: "invalid_json", status: 400 };
  }
  const clientId = sanitizeClientId(body.clientId);
  const campaignId = String(body.campaignId ?? "").trim();
  const platforms = parsePlatforms(body.platforms);
  const message = String(body.message ?? "");
  const imageUrlRaw = String(body.imageUrl ?? "").trim();
  const imageUrl = imageUrlRaw && /^https?:\/\//i.test(imageUrlRaw) ? imageUrlRaw : undefined;
  return { clientId, campaignId, platforms, message, imageUrl };
}

export async function POST(req: Request) {
  const parsed = await parseRequest(req);
  if ("error" in parsed && !("clientId" in parsed)) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: parsed.status });
  }
  const { clientId, platforms, message, imageUrl, imageBytes, imageMime } = parsed as Parsed;
  if (!clientId) return NextResponse.json({ ok: false, error: "missing_client" }, { status: 400 });
  if (!message.trim()) return NextResponse.json({ ok: false, error: "empty_message" }, { status: 400 });
  if (!platforms.length) return NextResponse.json({ ok: false, error: "no_platforms" }, { status: 400 });

  const jar = await cookies();
  const base = appBaseUrl(req);
  let bytes = imageBytes;
  let mime = imageMime;
  if (!bytes && imageUrl) {
    try {
      const imgRes = await fetch(imageUrl);
      if (imgRes.ok) {
        const buf = Buffer.from(await imgRes.arrayBuffer());
        if (buf.length > 0 && buf.length <= 8 * 1024 * 1024) {
          bytes = buf;
          mime = imgRes.headers.get("content-type") || "image/jpeg";
        }
      }
    } catch {
      /* keep URL-only; Facebook can post by URL */
    }
  }
  const results: PublishResult[] = [];

  for (const platform of platforms) {
    const tok = await loadDecrypted(clientId, platform, jar);
    if (!tok) {
      results.push({ platform, ok: false, error: "not_connected" });
      continue;
    }
    try {
      if (platform === "facebook") {
        const pageId = typeof tok.meta.pageId === "string" ? tok.meta.pageId : "";
        if (!pageId) {
          results.push({ platform, ok: false, error: "no_page" });
          continue;
        }
        const r = await publishFacebookPage({
          pageId,
          pageToken: tok.accessToken,
          message,
          imageUrl,
          imageBytes: bytes,
          imageMime: mime,
        });
        results.push(r.ok ? { platform, ok: true, postId: r.postId, permalink: r.permalink } : { platform, ok: false, error: r.error });
      } else if (platform === "instagram") {
        const igUserId = typeof tok.meta.igUserId === "string" ? tok.meta.igUserId : "";
        const pageId = typeof tok.meta.pageId === "string" ? tok.meta.pageId : undefined;
        if (!igUserId) {
          results.push({ platform, ok: false, error: "not_connected" });
          continue;
        }
        if (!imageUrl && !bytes) {
          results.push({ platform, ok: false, error: "instagram_needs_image" });
          continue;
        }
        const r = await publishInstagram({
          igUserId,
          pageToken: tok.accessToken,
          message,
          imageUrl,
          imageBytes: bytes,
          imageMime: mime,
          pageId,
          baseUrl: base,
        });
        results.push(r.ok ? { platform, ok: true, postId: r.postId, permalink: r.permalink } : { platform, ok: false, error: r.error });
      } else {
        const personUrn = typeof tok.meta.personUrn === "string" ? tok.meta.personUrn : "";
        if (!personUrn) {
          results.push({ platform, ok: false, error: "not_connected" });
          continue;
        }
        const r = await publishLinkedIn({
          accessToken: tok.accessToken,
          personUrn,
          message,
          imageBytes: bytes,
          imageMime: mime,
        });
        results.push(r.ok ? { platform, ok: true, postId: r.postId, permalink: r.permalink } : { platform, ok: false, error: r.error });
      }
    } catch {
      results.push({ platform, ok: false, error: "publish_failed" });
    }
  }

  const ok = results.some((r) => r.ok);
  return NextResponse.json({ ok, results });
}
