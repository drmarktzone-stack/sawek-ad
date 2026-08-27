import { applyPediatricDemoDraft } from "./demo";
import { installDemoPack } from "./active-pack";
import { buildPediatricDemoCampaign, demoPediatricOpti } from "./medical/demo";
import { demoPediatricDesk } from "./medical/opti-state";
import { saveClinic, saveOpti, saveOptiDesk, upsertMedCampaign } from "./medical/storage";
import { loadLocale } from "./storage";
import { withLang } from "./locale-url";
import type { Locale } from "./types";

/** Persist Dr. Samer pediatric facts into wizard + OptiBrain. No invented metrics. */
export function seedPediatricDemo(locale?: Locale) {
  applyPediatricDemoDraft(locale ?? loadLocale());
  installDemoPack();
  const { clinic, campaign } = buildPediatricDemoCampaign();
  saveClinic(clinic);
  upsertMedCampaign(campaign);
  saveOpti(demoPediatricOpti());
  saveOptiDesk(demoPediatricDesk());
}

/** One-click pediatric demo: persist intake + medical pack, then open the 4-step wizard. */
export function startPediatricDemoFlow(locale?: Locale) {
  if (typeof window === "undefined") return;
  const loc = locale ?? loadLocale();
  try {
    seedPediatricDemo(loc);
  } catch (err) {
    console.error("pediatric medical pack failed; wizard will still start", err);
    applyPediatricDemoDraft(loc);
  }
  window.location.assign(withLang("/?demo=samer", loc));
}
