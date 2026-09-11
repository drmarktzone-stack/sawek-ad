import { NextResponse } from "next/server";
import { factsToIntake, type GenerateBody } from "@/lib/engine/gemini-generate";
import { generateGroundedCopyLines, buildLocalCopyLinePool, COPY_LINE_MIN } from "@/lib/engine/copy-lines";
import { runMarketResearch, buildResearchSkeleton } from "@/lib/engine/ad-research";
import { checkAiRateLimit, rateLimitHeaders, userIdFromRequest } from "@/lib/rate-limit";
import type { Intake, Locale, MarketResearch } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Body = GenerateBody & {
  locale?: unknown;
  exclude?: unknown;
  research?: MarketResearch;
  retry?: unknown;
  intake?: unknown;
};

/**
 * Hook/headline/body/CTA marketplace for THIS business.
 * Hits research + Gemini when possible; facts-only pool (≥12 real lines) if models are down.
 */
export async function POST(req: Request) {
  let intake: Intake | undefined;
  let locale: Locale = "ar";
  let exclude: string[] = [];
  let research: MarketResearch | undefined;
  try {
    const userId = await userIdFromRequest(req);
    const limit = checkAiRateLimit(req, "vertex", userId);
    const body = (await req.json()) as Body;
    intake = factsToIntake(body);
    locale = body.locale === "he" || body.locale === "en" || body.locale === "ar" ? body.locale : "ar";
    exclude = Array.isArray(body.exclude)
      ? body.exclude.filter((x): x is string => typeof x === "string").map((s) => s.trim()).filter(Boolean)
      : [];

    research = body.research && Array.isArray(body.research.sources) ? body.research : undefined;
    if (!research || !research.fetched) {
      try {
        research = await runMarketResearch(intake, { bypassCache: Boolean(body.retry) });
      } catch {
        research = buildResearchSkeleton(intake);
      }
    }

    if (!limit.allowed) {
      const pool = buildLocalCopyLinePool(intake, locale, { research, exclude });
      return NextResponse.json(
        { ok: true, ...pool, reason: "rate_limited", min: COPY_LINE_MIN },
        { status: 200, headers: rateLimitHeaders(limit) },
      );
    }

    const pool = await generateGroundedCopyLines({ intake, locale, research, exclude });
    return NextResponse.json({ ok: true, ...pool, min: COPY_LINE_MIN }, { status: 200, headers: rateLimitHeaders(limit) });
  } catch {
    if (intake) {
      const pool = buildLocalCopyLinePool(intake, locale, { research, exclude });
      return NextResponse.json({ ok: true, ...pool, reason: "fallback", min: COPY_LINE_MIN }, { status: 200 });
    }
    return NextResponse.json({ ok: false, options: [], selectedIds: [], primaryIds: [], min: COPY_LINE_MIN }, { status: 200 });
  }
}
