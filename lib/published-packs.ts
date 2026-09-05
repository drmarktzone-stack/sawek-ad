import type { CampaignPack } from "./types";
import { getCampaign, loadCampaigns } from "./storage";
import { PUBLISHED_DEMO_ID_SET } from "./demo-catalog";

/** Customer-facing published demos: clinic + two fictional sample businesses. */
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

/** LocalStorage first; published.json fills missing ids. */
export async function loadCampaignsMerged(): Promise<CampaignPack[]> {
  const published = await fetchPublishedPacks();
  return mergeCampaigns(loadCampaigns(), published);
}

export async function getCampaignMerged(id: string): Promise<CampaignPack | undefined> {
  const local = getCampaign(id);
  if (local) return local;
  const published = await fetchPublishedPacks();
  return published.find((c) => c.id === id);
}

