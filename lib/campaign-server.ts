import type { CampaignPack } from "./types";
import { supabaseServiceClient, supabaseAnonClient } from "./auth-server";

export type CampaignRow = {
  id: string;
  name: string | null;
  payload: unknown;
  updated_at: string;
  feature_type?: string | null;
  owner_id?: string | null;
  client_id?: string | null;
  share_enabled?: boolean | null;
};

function db() {
  return supabaseServiceClient() ?? supabaseAnonClient();
}

export function isCampaignPack(payload: unknown): payload is CampaignPack {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return false;
  const o = payload as Record<string, unknown>;
  return Boolean(o.intake && o.id && Array.isArray(o.variants));
}

function selectCols(): string {
  return "id,name,payload,updated_at,feature_type,owner_id,client_id,share_enabled";
}

export async function listOwnedCampaignRows(ownerId: string): Promise<CampaignRow[]> {
  const sb = db();
  if (!sb || !ownerId) return [];
  try {
    const scoped = await sb
      .from("campaigns")
      .select(selectCols())
      .eq("owner_id", ownerId)
      .order("updated_at", { ascending: false });
    if (!scoped.error && Array.isArray(scoped.data)) return scoped.data as CampaignRow[];
    const plain = await sb.from("campaigns").select("id,name,payload,updated_at,owner_id,client_id").eq("owner_id", ownerId);
    if (plain.error || !Array.isArray(plain.data)) return [];
    return plain.data as CampaignRow[];
  } catch {
    return [];
  }
}

export async function getCampaignRowById(id: string): Promise<CampaignRow | null> {
  const sb = db();
  const key = String(id ?? "").trim();
  if (!sb || !key || key.length > 120 || /[^\w.-]/.test(key)) return null;
  try {
    const withShare = await sb.from("campaigns").select(selectCols()).eq("id", key).maybeSingle();
    if (!withShare.error && withShare.data) return withShare.data as CampaignRow;
    const plain = await sb.from("campaigns").select("id,name,payload,updated_at,owner_id,client_id").eq("id", key).maybeSingle();
    if (plain.error || !plain.data) return null;
    return plain.data as CampaignRow;
  } catch {
    return null;
  }
}

export function callerMayReadRow(row: CampaignRow, ownerId: string | null): boolean {
  if (ownerId && row.owner_id && row.owner_id === ownerId) return true;
  if (row.share_enabled === true) return true;
  const payload =
    row.payload && typeof row.payload === "object" && !Array.isArray(row.payload)
      ? (row.payload as { ownerId?: unknown; shareEnabled?: unknown })
      : {};
  if (ownerId && typeof payload.ownerId === "string" && payload.ownerId === ownerId) return true;
  if (payload.shareEnabled === true) return true;
  return false;
}

export async function upsertOwnedCampaign(ownerId: string, pack: CampaignPack): Promise<{ ok: boolean; reason?: string }> {
  const sb = db();
  if (!sb) return { ok: false, reason: "no_supabase" };
  if (!ownerId) return { ok: false, reason: "unauthorized" };
  const id = String(pack.id ?? "").trim();
  if (!id || id.length > 120 || /[^\w.-]/.test(id)) return { ok: false, reason: "invalid" };
  const existing = await getCampaignRowById(id);
  if (existing && existing.owner_id && existing.owner_id !== ownerId) {
    return { ok: false, reason: "forbidden" };
  }
  const stamped: CampaignPack = {
    ...pack,
    ownerId,
    updatedAt: pack.updatedAt || new Date().toISOString(),
  };
  const row = {
    id,
    name: stamped.name || id,
    payload: stamped,
    updated_at: stamped.updatedAt,
    feature_type: stamped.featureType ?? "campaign",
    owner_id: ownerId,
    client_id: stamped.clientId ?? null,
    share_enabled: stamped.shareEnabled === true,
  };
  try {
    const full = await sb.from("campaigns").upsert(row);
    if (!full.error) return { ok: true };
    const noShare = await sb.from("campaigns").upsert({
      id: row.id,
      name: row.name,
      payload: row.payload,
      updated_at: row.updated_at,
      feature_type: row.feature_type,
      owner_id: row.owner_id,
      client_id: row.client_id,
    });
    if (!noShare.error) return { ok: true };
    return { ok: false, reason: "persist_failed" };
  } catch {
    return { ok: false, reason: "persist_failed" };
  }
}
