import { applyPediatricDemoDraft } from "./demo";
import { installDemoPack } from "./active-pack";
import { buildPediatricDemoCampaign, demoPediatricOpti } from "./medical/demo";
import { demoPediatricDesk } from "./medical/opti-state";
import { saveClinic, saveOpti, saveOptiDesk, upsertMedCampaign } from "./medical/storage";

/** Persist Dr. Samer pediatric facts into wizard + OptiBrain. No invented metrics. */
export function seedPediatricDemo() {
  applyPediatricDemoDraft();
  installDemoPack();
  const { clinic, campaign } = buildPediatricDemoCampaign();
  saveClinic(clinic);
  upsertMedCampaign(campaign);
  saveOpti(demoPediatricOpti());
  saveOptiDesk(demoPediatricDesk());
}

/** One-click pediatric demo: persist intake + medical pack, then open the 4-step wizard. */
export function startPediatricDemoFlow() {
  if (typeof window === "undefined") return;
  try {
    seedPediatricDemo();
  } catch (err) {
    console.error("pediatric medical pack failed; wizard will still start", err);
    applyPediatricDemoDraft();
  }
  window.location.assign("/?demo=samer");
}
