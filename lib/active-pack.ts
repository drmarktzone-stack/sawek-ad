import type { CampaignPack, Locale } from "./types";
import { ensureAgency } from "./engine/agency";
import { buildDemoPack } from "./engine/run";
import { loadCampaigns, upsertCampaign } from "./storage";
import { DEMO_ID, isPublishedDemoId } from "./demo-catalog";
import { wantsEmptyCampaign } from "./empty-campaign";

/** Latest *user* pack. Published demos never auto-fill departments — only Demo click. */
export function latestPack(): CampaignPack | null {
  if (wantsEmptyCampaign()) return null;
  const list = loadCampaigns();
  const own = list.find((p) => !isPublishedDemoId(p.id) && !p.demoMeta);
  return own ? ensureAgency(own) : null;
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
