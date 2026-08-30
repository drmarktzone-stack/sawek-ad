import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const SYSTEM_INSTRUCTION =
  "You are SAWEK AD / سوِّق إعلانك بنفسك, a bilingual marketing agency. Produce converting headlines, ad copy, and CTAs in Hebrew, Arabic, and English (or the requested language). Use ONLY facts in the user message. Never invent prices, discounts, ratings, testimonials, VIP, ROAS, CAC, medical claims, or competitors. If a fact is missing, write [יש להשלים] / [يجب الاستكمال] / [TO COMPLETE]. Medical: no clinical decoration.";

const TEMPLATES = { ok: false, useTemplates: true } as const;

type Lang = "he" | "ar" | "en";

function asString(v: unknown): string | undefined {
  if (typeof v === "string" && v.trim()) return v.trim();
  if (Array.isArray(v)) {
    const joined = v
      .filter((x): x is string => typeof x === "string")
      .map((s) => s.trim())
      .filter(Boolean)
      .join("\n");
    return joined || undefined;
  }
  return undefined;
}

function asHeadlines(v: unknown): string[] | undefined {
  if (typeof v === "string" && v.trim()) return [v.trim()];
  if (Array.isArray(v)) {
    const list = v
      .filter((x): x is string => typeof x === "string")
      .map((s) => s.trim())
      .filter(Boolean);
    return list.length ? list : undefined;
  }
  return undefined;
}

function parseStructured(text: string): {
  headlines?: string[];
  copy?: string;
  cta?: string;
} {
  const stripped = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  let obj: Record<string, unknown> | null = null;
  try {
    const parsed: unknown = JSON.parse(stripped);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      obj = parsed as Record<string, unknown>;
    }
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        const parsed: unknown = JSON.parse(match[0]);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          obj = parsed as Record<string, unknown>;
        }
      } catch {
        obj = null;
      }
    }
  }
  if (!obj) return {};
  const headlines = asHeadlines(obj.headlines ?? obj.headline);
  const copy = asString(obj.copy ?? obj.body ?? obj.adCopy);
  const cta = asString(obj.cta ?? obj.CTA);
  return { headlines, copy, cta };
}

function buildUserMessage(body: Record<string, unknown>): string {
  const parts: string[] = [];
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const audience = typeof body.audience === "string" ? body.audience.trim() : "";
  const language: Lang | "" =
    body.language === "he" || body.language === "ar" || body.language === "en"
      ? body.language
      : "";
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  const medical = body.medical === true;

  if (description) parts.push(`Description:\n${description}`);
  if (audience) parts.push(`Audience:\n${audience}`);
  if (language) parts.push(`Language: ${language}`);
  if (medical) parts.push("Medical: true. No clinical decoration.");
  if (prompt) parts.push(prompt);
  parts.push(
    'If you can structure the result, reply with JSON: {"headlines":["..."],"copy":"...","cta":"..."}. Use only facts above.',
  );
  return parts.join("\n\n").slice(0, 4000);
}

/**
 * Optional Gemini enrichment. The client never depends on this.
 * Without GEMINI_API_KEY the app uses intake-driven templates.
 */
export async function POST(req: Request) {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    return NextResponse.json(
      { ok: false, reason: "no_key", useTemplates: true },
      { status: 200 },
    );
  }
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const userMessage = buildUserMessage(body);
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({
      model: "gemini-3.6-flash",
      systemInstruction: SYSTEM_INSTRUCTION,
      generationConfig: {
        temperature: body.medical === true ? 0.2 : 0.4,
      },
    });
    const result = await model.generateContent(userMessage);
    const text = result.response.text() ?? "";
    const parsed = parseStructured(text);
    return NextResponse.json({
      ok: true,
      text,
      ...(parsed.headlines ? { headlines: parsed.headlines } : {}),
      ...(parsed.copy ? { copy: parsed.copy } : {}),
      ...(parsed.cta ? { cta: parsed.cta } : {}),
    });
  } catch {
    return NextResponse.json(TEMPLATES, { status: 200 });
  }
}
