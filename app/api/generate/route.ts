import { NextResponse } from "next/server";

/**
 * Optional LLM enrichment. The client never depends on this.
 * Without OPENAI_API_KEY the app uses intake-driven templates.
 */
export async function POST(req: Request) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return NextResponse.json(
      { ok: false, reason: "no_key", useTemplates: true },
      { status: 200 },
    );
  }
  try {
    const body = await req.json();
    const prompt = typeof body?.prompt === "string" ? body.prompt.slice(0, 4000) : "";
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.4,
        messages: [
          {
            role: "system",
            content:
              "You write advertising copy from provided facts only. Never invent numbers, testimonials, ratings, competitors, or discounts. If a field is missing, say it is missing. Reply in the requested language.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content ?? "";
    return NextResponse.json({ ok: true, text });
  } catch {
    return NextResponse.json({ ok: false, useTemplates: true }, { status: 200 });
  }
}
