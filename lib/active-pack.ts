import type { CampaignPack, Locale } from "./types";
import { ensureAgency } from "./engine/agency";
import { buildDemoPack } from "./engine/run";
import { loadCampaigns, loadDraft, upsertCampaign } from "./storage";
import { DEMO_ID, isPublishedDemoId } from "./demo-catalog";
import { isBlockedEmptySessionName, wantsEmptyCampaign } from "./empty-campaign";
import { businessKey } from "./engine/ad-engine/sources";

/** Latest *user* pack for the current draft business. Never show a previous clinic pack after a new scan. */
export function latestPack(): CampaignPack | null {
  if (wantsEmptyCampaign()) return null;
  const list = loadCampaigns();
  const own = list.filter((p) => !isPublishedDemoId(p.id) && !p.demoMeta);
  const draftName = String(loadDraft().intake?.businessName ?? "").trim();
  if (draftName && !isBlockedEmptySessionName(draftName)) {
    const key = businessKey(draftName);
    const match = own.find((p) => businessKey(p.intake.businessName) === key);
    return match ? ensureAgency(match) : null;
  }
  const latest = own[0];
  return latest ? ensureAgency(latest) : null;
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
