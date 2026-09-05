import type { CampaignPack, Locale } from "./types";
import { ensureAgency } from "./engine/agency";
import { buildDemoPack } from "./engine/run";
import { loadCampaigns, upsertCampaign } from "./storage";
import { DEMO_ID } from "./demo-catalog";

export function latestPack(): CampaignPack | null {
  const list = loadCampaigns();
  return list[0] ? ensureAgency(list[0]) : null;
}

export function packById(id: string): CampaignPack | null {
  const found = loadCampaigns().find((c) => c.id === id);
  return found ? ensureAgency(found) : null;
}

export function installDemoPack(idOrSlug: string = DEMO_ID, locale?: Locale): CampaignPack {
  const pack = buildDemoPack(idOrSlug, locale);
  upsertCampaign(pack);
  return pack;
}
