import { NextResponse } from "next/server";
import { localeFromUnknown, localizeTriple, translateTexts } from "@/lib/translate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cloud Translation API — HE ↔ AR ↔ EN. Neural MT, not string replace.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      texts?: unknown;
      text?: unknown;
      target?: unknown;
      source?: unknown;
      he?: unknown;
      ar?: unknown;
      en?: unknown;
    };
    const target = localeFromUnknown(body.target);
    const source = localeFromUnknown(body.source) ?? undefined;

    if (body.he || body.ar || body.en) {
      const loc = await localizeTriple(
        {
          he: typeof body.he === "string" ? body.he : undefined,
          ar: typeof body.ar === "string" ? body.ar : undefined,
          en: typeof body.en === "string" ? body.en : undefined,
        },
        source || "he",
      );
      return NextResponse.json(
        { ok: !loc.reason || Boolean(loc.triple.he || loc.triple.ar || loc.triple.en), ...loc.triple, reason: loc.reason },
        { status: 200 },
      );
    }

    if (!target) {
      return NextResponse.json({ ok: false, reason: "translation_error" }, { status: 200 });
    }
    const texts = Array.isArray(body.texts)
      ? body.texts.filter((t): t is string => typeof t === "string")
      : typeof body.text === "string"
        ? [body.text]
        : [];
    const result = await translateTexts({ texts, target, source });
    return NextResponse.json(result, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false, reason: "translation_error" }, { status: 200 });
  }
}
