import { applyPediatricDemoDraft } from "./demo";
import { buildPediatricDemoCampaign, demoPediatricOpti } from "./medical/demo";
import { demoPediatricDesk } from "./medical/opti-state";
import { saveClinic, saveOpti, saveOptiDesk, upsertMedCampaign } from "./medical/storage";

/** One-click pediatric demo: persist intake + medical pack, then hard-navigate to the OmniAd wizard. */
export function startPediatricDemoFlow() {
  applyPediatricDemoDraft();
  try {
    const { clinic, campaign } = buildPediatricDemoCampaign();
    saveClinic(clinic);
    upsertMedCampaign(campaign);
    saveOpti(demoPediatricOpti());
    saveOptiDesk(demoPediatricDesk());
  } catch (err) {
    console.error("pediatric medical pack failed; wizard will still start", err);
  }
  window.location.assign("/?demo=samer");
}
