import { NextResponse } from "next/server";
import { ingestUrl, inspectUrl, type UrlIngestErrorCode, type UrlIngestFields, type UrlIngestOk } from "@/lib/url-ingest";
import { buildPastCampaignAuditFromPosts, overlayPastCampaignAudit } from "@/lib/engine/past-campaign-audit";
import { runGeminiGenerate, type GenerateBrand } from "@/lib/engine/gemini-generate";
import { inventsForbidden } from "@/lib/engine/coach";
import { emptyIntake } from "@/lib/engine/validate";
import { filled } from "@/lib/utils";
import { isClinicLike } from "@/lib/vertical";
import type { IngestFieldId } from "@/lib/document-ingest";
import type { Intake } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SCAN_TIMEOUT_MS = 10_000;
const PAGE_TEXT_SLICE = 3500;

const BRAND_TO_FIELD = [
  ["tone", "brandTone"],
  ["positioning", "brandPositioning"],
  ["problem", "biggestProblem"],
  ["advantage", "uniqueAdvantage"],
  ["audience", "audience"],
] as const satisfies ReadonlyArray<readonly [keyof GenerateBrand, IngestFieldId]>;

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

function labeledFields(fields: UrlIngestFields): string {
  return (Object.entries(fields) as [string, string | undefined][])
    .filter(([, v]) => typeof v === "string" && v.trim())
    .map(([k, v]) => `${k}: ${v!.trim()}`)
    .join("\n");
}

function pageIntake(result: UrlIngestOk): Intake {
  const i = emptyIntake();
  const f = result.fields;
  i.businessName = f.businessName ?? "";
  i.category = f.category ?? "";
  i.description = [labeledFields(f), result.text].filter(Boolean).join("\n");
  i.location = f.location ?? "";
  i.website = f.website ?? "";
  i.whatsapp = f.whatsapp ?? "";
  i.clinicHours = f.clinicHours ?? "";
  i.offer = f.offer ?? i.offer;
  i.audience = f.audience ?? "";
  i.biggestProblem = f.biggestProblem ?? "";
  i.uniqueAdvantage = f.uniqueAdvantage ?? "";
  i.brandTone = f.brandTone ?? "";
  i.brandPositioning = f.brandPositioning ?? "";
  i.mainGoal = f.mainGoal ?? "";
  return i;
}

function mergeScanBrand(result: UrlIngestOk, brand: GenerateBrand): UrlIngestOk {
  const intake = pageIntake(result);
  const joined = [brand.tone, brand.positioning, brand.problem, brand.advantage, brand.audience].join(" ");
  if (!joined.trim()) return result;
  if (inventsForbidden(joined, intake)) return result;

  const fields: UrlIngestFields = { ...result.fields };
  for (const [brandKey, fieldId] of BRAND_TO_FIELD) {
    const incoming = brand[brandKey]?.trim();
    if (!incoming) continue;
    if (filled(fields[fieldId])) continue;
    fields[fieldId] = incoming;
  }
  return { ...result, fields };
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
  const excerpt = (result.text || "").slice(0, PAGE_TEXT_SLICE);
  const generated = await withTimeout(
    runGeminiGenerate({
      description: `Extracted fields (facts — do not invent over these):\n${facts}\n\nPage text (visible only, not HTML):\n${excerpt}`,
      audience: result.fields.audience || "",
      language: "he",
      medical: isClinicLike({
        businessName: result.fields.businessName || "",
        category: result.fields.category || "",
        description: excerpt,
      }),
      mode: "scan",
      prompt:
        "mode=scan. Interpret the extracted text only. Fill brand from this page text; empty string if not in the text. Do not put prices in brand. Never overwrite phone/address/hours/offer/name/website.",
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
