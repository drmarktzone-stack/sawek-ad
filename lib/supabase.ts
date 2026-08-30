import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { CampaignPack } from "./types";
import { upsertCampaign as upsertLocal } from "./storage";

let client: SupabaseClient | null = null;
let clientPromise: Promise<SupabaseClient | null> | null = null;

function envCreds(): { url: string; key: string } | null {
  const url = String(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const key = String(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
  if (!url || !key) return null;
  return { url, key };
}

type PublicConfig = {
  supabaseUrl?: unknown;
  supabaseAnonKey?: unknown;
  supabaseEnabled?: unknown;
};

async function loadBrowserCreds(): Promise<{ url: string; key: string } | null> {
  if (typeof window === "undefined") return null;
  try {
    const res = await fetch("/api/public-config");
    if (!res.ok) return null;
    const data = (await res.json()) as PublicConfig;
    const url = typeof data.supabaseUrl === "string" ? data.supabaseUrl.trim() : "";
    const key = typeof data.supabaseAnonKey === "string" ? data.supabaseAnonKey.trim() : "";
    if (!url || !key) return null;
    return { url, key };
  } catch {
    return null;
  }
}

async function getClient(): Promise<SupabaseClient | null> {
  if (client) return client;
  if (!clientPromise) {
    clientPromise = (async () => {
      try {
        const creds = envCreds() ?? (await loadBrowserCreds());
        if (!creds) return null;
        client = createClient(creds.url, creds.key);
        return client;
      } catch {
        return null;
      }
    })();
  }
  try {
    return await clientPromise;
  } catch {
    return null;
  }
}

/** Best-effort remote sync. Always writes localStorage. Never throws to the UI. */
export async function syncCampaign(pack: CampaignPack): Promise<void> {
  try {
    upsertLocal(pack);
    const sb = await getClient();
    if (!sb) return;
    await sb.from("campaigns").upsert({
      id: pack.id,
      name: pack.name,
      payload: pack,
      updated_at: pack.updatedAt,
    });
  } catch {
    // localStorage is enough
  }
}
