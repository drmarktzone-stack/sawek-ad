import { applyCatalogDemoDraft, applyPediatricDemoDraft } from "./demo";
import { installDemoPack } from "./active-pack";
import { buildPediatricDemoCampaign, demoPediatricOpti } from "./medical/demo";
import { demoPediatricDesk } from "./medical/opti-state";
import { saveClinic, saveOpti, saveOptiDesk, upsertMedCampaign } from "./medical/storage";
import { loadLocale } from "./storage";
import { withLang } from "./locale-url";
import { demoEntry, DEMO_ID, type DemoPackId } from "./demo-catalog";
import type { Locale } from "./types";

function seedClinicMedical(locale: Locale) {
  applyPediatricDemoDraft(locale);
  installDemoPack(DEMO_ID);
  const { clinic, campaign } = buildPediatricDemoCampaign();
  saveClinic(clinic);
  upsertMedCampaign(campaign);
  saveOpti(demoPediatricOpti());
  saveOptiDesk(demoPediatricDesk());
}

export function seedDemo(idOrSlug: string, locale?: Locale) {
  const loc = locale ?? loadLocale();
  const entry = demoEntry(idOrSlug);
  if (!entry) return;
  if (entry.id === DEMO_ID) {
    try {
      seedClinicMedical(loc);
    } catch (err) {
      console.error("pediatric medical pack failed; wizard will still start", err);
      applyPediatricDemoDraft(loc);
      installDemoPack(DEMO_ID);
    }
    return;
  }
  applyCatalogDemoDraft(entry.id, loc);
  installDemoPack(entry.id);
}

export function startDemoFlow(idOrSlug: string, locale?: Locale) {
  if (typeof window === "undefined") return;
  const loc = locale ?? loadLocale();
  const entry = demoEntry(idOrSlug);
  if (!entry) return;
  seedDemo(entry.id, loc);
  window.location.assign(withLang(`/?demo=${entry.slug}`, loc));
}

export function startPediatricDemoFlow(locale?: Locale) {
  startDemoFlow(DEMO_ID, locale);
}

export type { DemoPackId };
