import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { CampaignPack, LabFeatureType, LabRun } from "./types";
import { getClientId, upsertCampaign as upsertLocal, upsertLabRunLocal } from "./storage";
import { clientOwnerId } from "./plan";
import { uid } from "./utils";

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

function ownershipStamp(extra?: { clientId?: string }): { ownerId: string; clientId: string } {
  const ownerId = clientOwnerId();
  const clientId = extra?.clientId || getClientId() || "";
  return { ownerId, clientId };
}

function stampPayload<T extends Record<string, unknown>>(payload: T): T & { ownerId?: string; clientId?: string } {
  const { ownerId, clientId } = ownershipStamp(
    typeof payload.clientId === "string" ? { clientId: payload.clientId } : undefined,
  );
  return {
    ...payload,
    ...(ownerId ? { ownerId } : {}),
    ...(clientId ? { clientId } : {}),
  };
}

function rowBelongsToCaller(row: { owner_id?: string | null; client_id?: string | null; payload?: unknown }): boolean {
  const ownerId = clientOwnerId();
  const clientId = getClientId();
  const payload =
    row.payload && typeof row.payload === "object" && !Array.isArray(row.payload)
      ? (row.payload as { ownerId?: unknown; clientId?: unknown })
      : {};
  const rowOwner = String(row.owner_id || payload.ownerId || "").trim();
  const rowClient = String(row.client_id || payload.clientId || "").trim();
  if (ownerId && rowOwner) return rowOwner === ownerId;
  if (clientId && rowClient) return rowClient === clientId;
  return false;
}

/** Best-effort remote sync. Always writes localStorage. Never throws to the UI. */
export async function syncCampaign(pack: CampaignPack): Promise<void> {
  try {
    const { ownerId, clientId } = ownershipStamp({ clientId: pack.clientId });
    const stamped: CampaignPack = {
      ...pack,
      ...(ownerId ? { ownerId } : {}),
      ...(clientId ? { clientId } : {}),
    };
    upsertLocal(stamped);
    const sb = await getClient();
    if (!sb) return;
    await upsertCampaignRow(sb, {
      id: stamped.id,
      name: stamped.name,
      payload: stamped,
      updated_at: stamped.updatedAt,
      feature_type: stamped.featureType ?? "campaign",
      owner_id: ownerId || undefined,
      client_id: clientId || undefined,
    });
  } catch {
    // localStorage is enough
  }
}

export type RemoteCampaignRow = {
  id: string;
  name: string;
  payload: unknown;
  updated_at: string;
  feature_type?: string | null;
  owner_id?: string | null;
  client_id?: string | null;
};

async function upsertCampaignRow(
  sb: SupabaseClient,
  row: {
    id: string;
    name: string;
    payload: unknown;
    updated_at: string;
    feature_type?: string;
    owner_id?: string;
    client_id?: string;
  },
): Promise<void> {
  const payload = stampPayload(
    row.payload && typeof row.payload === "object" && !Array.isArray(row.payload)
      ? (row.payload as Record<string, unknown>)
      : { value: row.payload },
  );
  const base = {
    id: row.id,
    name: row.name,
    payload,
    updated_at: row.updated_at,
  };
  const withOwner = await sb.from("campaigns").upsert({
    ...base,
    feature_type: row.feature_type ?? null,
    owner_id: row.owner_id || null,
    client_id: row.client_id || null,
  });
  if (!withOwner.error) return;
  const withType = await sb.from("campaigns").upsert({
    ...base,
    feature_type: row.feature_type ?? null,
  });
  if (!withType.error) return;
  await sb.from("campaigns").upsert(base);
}

function stripLabInput(input: unknown): unknown {
  if (!input || typeof input !== "object" || Array.isArray(input)) return input;
  const o = { ...(input as Record<string, unknown>) };
  delete o.imageBase64;
  if (typeof o.imageUrl === "string" && o.imageUrl.startsWith("data:")) {
    o.imageUrl = "[image]";
  }
  if (typeof o.mime === "string") o.mime = o.mime;
  return o;
}

const FEATURE_LABEL: Record<LabFeatureType, string> = {
  angles: "Lab · angles",
  vision: "Lab · vision",
  score: "Lab · score",
  campaign: "Campaign",
};

/**
 * Persist a lab run to localStorage and, when enabled, into campaigns.payload.lab
 * (works without the feature_type column migration).
 */
export async function saveLabRun(
  featureType: LabFeatureType,
  input: unknown,
  output: unknown,
): Promise<LabRun> {
  const createdAt = new Date().toISOString();
  const clientId = getClientId() || undefined;
  const run: LabRun = {
    id: uid("lab"),
    featureType,
    input: stripLabInput(input),
    output,
    createdAt,
    ...(clientId ? { clientId } : {}),
  };
  try {
    upsertLabRunLocal(run);
  } catch {
    /* ignore */
  }
  try {
    const sb = await getClient();
    if (!sb) return run;
    const payload = {
      featureType,
      lab: [run],
      clientId: clientId ?? null,
      generated_content: output,
    };
    const { ownerId, clientId: cid } = ownershipStamp({ clientId });
    await upsertCampaignRow(sb, {
      id: run.id,
      name: FEATURE_LABEL[featureType],
      payload: stampPayload({ ...payload, ownerId: ownerId || undefined, clientId: cid || clientId }),
      updated_at: createdAt,
      feature_type: featureType,
      owner_id: ownerId || undefined,
      client_id: cid || undefined,
    });
  } catch {
    /* localStorage is enough */
  }
  return run;
}

export async function fetchRemoteCampaigns(): Promise<RemoteCampaignRow[]> {
  try {
    const sb = await getClient();
    if (!sb) return [];
    const ownerId = clientOwnerId();
    const clientId = getClientId();
    const scoped =
      ownerId
        ? await sb
            .from("campaigns")
            .select("id,name,payload,updated_at,feature_type,owner_id,client_id")
            .eq("owner_id", ownerId)
            .order("updated_at", { ascending: false })
        : clientId
          ? await sb
              .from("campaigns")
              .select("id,name,payload,updated_at,feature_type,owner_id,client_id")
              .eq("client_id", clientId)
              .order("updated_at", { ascending: false })
          : null;
    if (scoped && !scoped.error && Array.isArray(scoped.data)) {
      return scoped.data as RemoteCampaignRow[];
    }
    const withType = await sb
      .from("campaigns")
      .select("id,name,payload,updated_at,feature_type,owner_id,client_id")
      .order("updated_at", { ascending: false });
    const rows = !withType.error && Array.isArray(withType.data)
      ? (withType.data as RemoteCampaignRow[])
      : await (async () => {
          const plain = await sb
            .from("campaigns")
            .select("id,name,payload,updated_at")
            .order("updated_at", { ascending: false });
          if (plain.error || !Array.isArray(plain.data)) return [];
          return plain.data as RemoteCampaignRow[];
        })();
    return rows.filter((row) => rowBelongsToCaller(row));
  } catch {
    return [];
  }
}

/** Share-by-id landing fetch. Does not list other users' campaigns. */
export async function fetchRemoteCampaignById(id: string): Promise<RemoteCampaignRow | null> {
  const key = String(id ?? "").trim();
  if (!key || key.length > 120) return null;
  try {
    const sb = await getClient();
    if (!sb) return null;
    const withType = await sb
      .from("campaigns")
      .select("id,name,payload,updated_at,feature_type")
      .eq("id", key)
      .maybeSingle();
    if (!withType.error && withType.data) return withType.data as RemoteCampaignRow;
    const plain = await sb.from("campaigns").select("id,name,payload,updated_at").eq("id", key).maybeSingle();
    if (plain.error || !plain.data) return null;
    return plain.data as RemoteCampaignRow;
  } catch {
    return null;
  }
}

export function payloadFeatureType(payload: unknown, col?: string | null): LabFeatureType | "campaign" {
  if (col === "angles" || col === "vision" || col === "score" || col === "campaign") return col;
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const o = payload as Record<string, unknown>;
    const ft = o.featureType;
    if (ft === "angles" || ft === "vision" || ft === "score" || ft === "campaign") return ft;
    if (Array.isArray(o.lab) && o.lab.length && !("intake" in o)) {
      const first = o.lab[0] as { featureType?: unknown };
      if (
        first?.featureType === "angles" ||
        first?.featureType === "vision" ||
        first?.featureType === "score"
      ) {
        return first.featureType;
      }
    }
  }
  return "campaign";
}

export function payloadLabRuns(payload: unknown): LabRun[] {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return [];
  const lab = (payload as { lab?: unknown }).lab;
  if (!Array.isArray(lab)) return [];
  return lab.filter((r): r is LabRun => Boolean(r && typeof r === "object" && typeof (r as LabRun).id === "string"));
}
