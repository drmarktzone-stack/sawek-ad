import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { CampaignPack, LabFeatureType, LabRun } from "./types";
import { getClientId, upsertCampaign as upsertLocal, upsertLabRunLocal } from "./storage";
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

/** Best-effort remote sync. Always writes localStorage. Never throws to the UI. */
export async function syncCampaign(pack: CampaignPack): Promise<void> {
  try {
    upsertLocal(pack);
    const sb = await getClient();
    if (!sb) return;
    await upsertCampaignRow(sb, {
      id: pack.id,
      name: pack.name,
      payload: pack,
      updated_at: pack.updatedAt,
      feature_type: pack.featureType ?? "campaign",
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
};

async function upsertCampaignRow(
  sb: SupabaseClient,
  row: {
    id: string;
    name: string;
    payload: unknown;
    updated_at: string;
    feature_type?: string;
  },
): Promise<void> {
  const withType = await sb.from("campaigns").upsert({
    id: row.id,
    name: row.name,
    payload: row.payload,
    updated_at: row.updated_at,
    feature_type: row.feature_type ?? null,
  });
  if (!withType.error) return;
  await sb.from("campaigns").upsert({
    id: row.id,
    name: row.name,
    payload: row.payload,
    updated_at: row.updated_at,
  });
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
    await upsertCampaignRow(sb, {
      id: run.id,
      name: FEATURE_LABEL[featureType],
      payload,
      updated_at: createdAt,
      feature_type: featureType,
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
    const withType = await sb
      .from("campaigns")
      .select("id,name,payload,updated_at,feature_type")
      .order("updated_at", { ascending: false });
    if (!withType.error && Array.isArray(withType.data)) {
      return withType.data as RemoteCampaignRow[];
    }
    const plain = await sb
      .from("campaigns")
      .select("id,name,payload,updated_at")
      .order("updated_at", { ascending: false });
    if (plain.error || !Array.isArray(plain.data)) return [];
    return plain.data as RemoteCampaignRow[];
  } catch {
    return [];
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
