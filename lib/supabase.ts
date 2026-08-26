import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { CampaignPack } from "./types";
import { supabaseEnabled, upsertCampaign as upsertLocal } from "./storage";

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient | null {
  if (!supabaseEnabled()) return null;
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  client = createClient(url, key);
  return client;
}

/** Best-effort remote sync. Always writes localStorage. Never throws to the UI. */
export async function syncCampaign(pack: CampaignPack): Promise<void> {
  upsertLocal(pack);
  const sb = getClient();
  if (!sb) return;
  try {
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
