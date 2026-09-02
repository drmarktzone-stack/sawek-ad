import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabaseUrl = String(process.env["NEXT_PUBLIC_SUPABASE_URL"] ?? "").trim();
  const supabaseAnonKey = String(process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] ?? "").trim();
  const supabaseEnabled = Boolean(supabaseUrl && supabaseAnonKey);
  const appBaseUrl = String(process.env["APP_BASE_URL"] ?? process.env["NEXT_PUBLIC_APP_BASE_URL"] ?? "")
    .trim()
    .replace(/\/$/, "");
  return NextResponse.json({ supabaseUrl, supabaseAnonKey, supabaseEnabled, appBaseUrl });
}
