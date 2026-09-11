import { NextResponse } from "next/server";
import { factsToIntake, type GenerateBody } from "@/lib/engine/gemini-generate";
import { generateGroundedCopyLines, COPY_LINE_MIN } from "@/lib/engine/copy-lines";
import { runMarketResearch, buildResearchSkeleton } from "@/lib/engine/ad-research";
import { checkAiRateLimit, rateLimitHeaders, userIdFromRequest } from "@/lib/rate-limit";
import type { Locale, MarketResearch } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Body = GenerateBody & {
  locale?: unknown;
  exclude?: unknown;
  research?: MarketResearch;
  retry?: unknown;
};

/**
 * Grounded hook/headline/body/CTA marketplace for THIS business.
 * Always hits research + Gemini when possible; facts-only pool if models are down.
 */
export async function POST(req: Request) {
  try {
    const userId = await userIdFromRequest(req);
    const limit = checkAiRateLimit(req, "vertex", userId);
    const body = (await req.json()) as Body;
    const intake = factsToIntake(body);
    const locale: Locale = body.locale === "he" || body.locale === "en" || body.locale === "ar" ? body.locale : "ar";
    const exclude = Array.isArray(body.exclude)
      ? body.exclude.filter((x): x is string => typeof x === "string").map((s) => s.trim()).filter(Boolean)
      : [];

    let research = body.research && Array.isArray(body.research.sources) ? body.research : undefined;
    if (!research || !research.fetched) {
      try {
        research = await runMarketResearch(intake, { bypassCache: Boolean(body.retry) });
      } catch {
        research = buildResearchSkeleton(intake);
      }
    }

    if (!limit.allowed) {
      const { buildLocalCopyLinePool } = await import("@/lib/engine/copy-lines");
      const pool = buildLocalCopyLinePool(intake, locale, { research, exclude });
      return NextResponse.json(
        { ok: true, ...pool, reason: "rate_limited", min: COPY_LINE_MIN },
        { status: 200, headers: rateLimitHeaders(limit) },
      );
    }

    const pool = await generateGroundedCopyLines({ intake, locale, research, exclude });
    return NextResponse.json({ ok: true, ...pool, min: COPY_LINE_MIN }, { status: 200, headers: rateLimitHeaders(limit) });
  } catch {
    return NextResponse.json({ ok: false, options: [], selectedIds: [], primaryIds: [], min: COPY_LINE_MIN }, { status: 200 });
  }
}
