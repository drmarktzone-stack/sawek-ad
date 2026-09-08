import { NextResponse } from "next/server";
import { ingestUrl, inspectUrl, type UrlIngestErrorCode, type UrlIngestFields, type UrlIngestOk } from "@/lib/url-ingest";
import { buildPastCampaignAuditFromPosts, overlayPastCampaignAudit } from "@/lib/engine/past-campaign-audit";
import { runGeminiGenerate, type GenerateBrand } from "@/lib/engine/gemini-generate";
import { isClinicLike } from "@/lib/vertical";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SCAN_TIMEOUT_MS = 10_000;

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
  if (error === "site_blocked") return 422;
  if (error === "timeout") return 504;
  if (error === "too_large") return 413;
  if (error === "network") return 502;
  return 422;
}

function labeledFields(fields: UrlIngestFields): string {
  return (Object.entries(fields) as [string, string | undefined][])
    .filter(([, v]) => typeof v === "string" && v.trim())
    .map(([k, v]) => `${k}: ${v!.trim()}`)
    .join("\n");
}

function mergeScanBrand(result: UrlIngestOk, brand: GenerateBrand): UrlIngestOk {
  const joined = [brand.tone, brand.positioning, brand.problem, brand.advantage, brand.audience]
    .filter((s) => String(s || "").trim())
    .map((s) => `INFERENCE · scan: ${s.trim()}`);
  if (!joined.length) return result;
  return { ...result, insights: [...(result.insights ?? []), ...joined] };
}

async function withTimeout<T>(work: Promise<T>, ms: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function enrichScanWithGemini(result: UrlIngestOk): Promise<UrlIngestOk> {
  const facts = labeledFields(result.fields);
  const generated = await withTimeout(
    runGeminiGenerate({
      description: `LAYER A Business Truth only (already classified). Do not treat page chrome as facts:\n${facts}`,
      audience: result.fields.audience || "",
      language: "he",
      medical: isClinicLike({
        businessName: result.fields.businessName || "",
        category: result.fields.category || "",
        description: result.fields.description || "",
      }),
      mode: "scan",
      prompt:
        "mode=scan. Output is INFERENCE / AI insights only. NEVER write into Business Truth. Empty string if not an explicit business-owned fact. Do not use nav, footer, shipping banners, reviews, blogs, or third-party widgets.",
    }),
    SCAN_TIMEOUT_MS,
  );
  if (!generated || generated.ok === false || !generated.brand) return result;
  return mergeScanBrand(result, generated.brand);
}

async function attachPastCampaignAudit(result: UrlIngestOk): Promise<UrlIngestOk> {
  const posts = result.posts ?? [];
  if (!posts.length) return result;
  const heuristic = buildPastCampaignAuditFromPosts(posts, {
    location: result.fields.location,
    description: result.fields.description,
  });
  if (!heuristic) return result;
  try {
    const overlaid = await withTimeout(
      overlayPastCampaignAudit(heuristic, posts, {
        location: result.fields.location,
        description: result.fields.description,
      }),
      SCAN_TIMEOUT_MS,
    );
    return { ...result, pastCampaignAudit: overlaid ?? heuristic };
  } catch {
    return { ...result, pastCampaignAudit: heuristic };
  }
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
    return NextResponse.json(
      {
        ok: false,
        error: result.error,
        ...(result.messageHe ? { messageHe: result.messageHe, messageAr: result.messageAr, messageEn: result.messageEn } : {}),
      },
      { status: statusFor(result.error) },
    );
  }
  try {
    const merged = await attachPastCampaignAudit(await enrichScanWithGemini(result));
    return NextResponse.json(merged);
  } catch {
    return NextResponse.json(result);
  }
}
