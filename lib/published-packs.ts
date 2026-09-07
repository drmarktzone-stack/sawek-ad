import type { CampaignPack } from "./types";
import { getCampaign, loadCampaigns } from "./storage";
import { PUBLISHED_DEMO_ID_SET } from "./demo-catalog";
import { fetchRemoteCampaignById } from "./supabase";

function onlyAllowedDemos(packs: CampaignPack[]): CampaignPack[] {
  return packs.filter((p) => PUBLISHED_DEMO_ID_SET.has(p.id));
}

let cache: CampaignPack[] | null = null;
let inflight: Promise<CampaignPack[]> | null = null;

export function cachedPublished(): CampaignPack[] {
  return cache ?? [];
}

export function mergeCampaigns(local: CampaignPack[], published: CampaignPack[]): CampaignPack[] {
  const ids = new Set(local.map((c) => c.id));
  return [...local, ...published.filter((p) => !ids.has(p.id))];
}

export async function fetchPublishedPacks(): Promise<CampaignPack[]> {
  if (cache) return cache;
  if (typeof window === "undefined") return [];
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await fetch("/packs/published.json", { cache: "no-store" });
      if (!res.ok) {
        cache = [];
        return cache;
      }
      const data: unknown = await res.json();
      const raw = Array.isArray(data) ? (data as CampaignPack[]) : [];
      cache = onlyAllowedDemos(raw);
      return cache;
    } catch {
      cache = [];
      return cache;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

export async function loadCampaignsMerged(): Promise<CampaignPack[]> {
  const published = await fetchPublishedPacks();
  return mergeCampaigns(loadCampaigns(), published);
}

function asPack(payload: unknown, id: string): CampaignPack | undefined {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return undefined;
  const o = payload as CampaignPack;
  if (!o.intake || !Array.isArray(o.variants)) return undefined;
  return { ...o, id: o.id || id };
}

export async function getCampaignMerged(id: string): Promise<CampaignPack | undefined> {
  const local = getCampaign(id);
  if (local) return local;
  const published = await fetchPublishedPacks();
  const demo = published.find((c) => c.id === id);
  if (demo) return demo;
  try {
    const res = await fetch(`/api/campaigns/${encodeURIComponent(id)}`, { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as { ok?: boolean; pack?: unknown };
      const fromApi = data.ok ? asPack(data.pack, id) : undefined;
      if (fromApi) return fromApi;
    }
  } catch {
    /* fall through to browser supabase */
  }
  const remote = await fetchRemoteCampaignById(id);
  return remote ? asPack(remote.payload, remote.id) : undefined;
}
