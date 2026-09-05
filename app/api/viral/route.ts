import { NextResponse } from "next/server";
import { ingestUrl } from "@/lib/url-ingest";
import { factsToIntake, geminiFailFromEnv } from "@/lib/engine/gemini-generate";
import { runViralDesk, type ViralBody } from "@/lib/engine/gemini-viral";
import { remixFromSource, remixNeedTranscript } from "@/lib/engine/viral-content";

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

function publicTextFromIngest(result: Awaited<ReturnType<typeof ingestUrl>>): string {
  if (!result.ok) return "";
  const posts = (result.posts ?? []).map((p) => p.text || "").filter(Boolean).join("\n");
  return [result.title, result.text, posts].filter(Boolean).join("\n").replace(/\s+/g, " ").trim();
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ViralBody;
    const mode = body.mode;
    const transcript = typeof body.transcript === "string" ? body.transcript.trim() : "";
    const caption = typeof body.caption === "string" ? body.caption.trim() : "";
    const sourceUrl = typeof body.sourceUrl === "string" ? body.sourceUrl.trim() : "";
    const language = body.language === "ar" || body.language === "en" ? body.language : "he";

    if (mode === "remix" && sourceUrl && !transcript && !caption) {
      const ingested = await ingestUrl(sourceUrl, selfHosts(req));
      const publicText = publicTextFromIngest(ingested);
      if (!ingested.ok || publicText.length < 12) {
        return NextResponse.json(
          {
            ok: true,
            mode: "remix",
            locale: language,
            source: "template",
            remix: remixNeedTranscript(language, sourceUrl),
          },
          { status: 200 },
        );
      }
      const intake = factsToIntake(body);
      const remix = remixFromSource(intake, language, {
        sourceText: publicText,
        sourceUrl,
        idea: typeof body.idea === "string" ? body.idea : "",
        source: "public_text",
      });
      const enriched = await runViralDesk({
        ...body,
        mode: "remix",
        transcript: publicText,
        sourceUrl,
      });
      return NextResponse.json(
        { ...enriched, remix: enriched.remix?.status === "ok" ? enriched.remix : remix },
        { status: 200 },
      );
    }

    const result = await runViralDesk(body);
    return NextResponse.json(result, { status: 200 });
  } catch {
    return NextResponse.json(geminiFailFromEnv(), { status: 200 });
  }
}
