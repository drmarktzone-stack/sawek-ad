import { saveDraft, type DraftState } from "./storage";
import { emptyIntake } from "./engine/validate";
import { intakeIsClinicDemo, isBlockedEmptySessionName } from "./clinic-leak";

export const EMPTY_CAMPAIGN_KEY = "sawek-empty-campaign";
export const EMPTY_CAMPAIGN_EVENT = "sawek-empty-campaign";

function stripDemoFromUrl() {
  try {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has("demo") && !url.searchParams.has("empty")) return;
    url.searchParams.delete("demo");
    url.searchParams.delete("empty");
    const next = url.pathname + url.search + url.hash;
    window.history.replaceState(window.history.state, "", next);
  } catch {
    /* ignore */
  }
}

function writeEmptyFlag(on: boolean) {
  try {
    if (on) {
      localStorage.setItem(EMPTY_CAMPAIGN_KEY, "1");
      sessionStorage.setItem(EMPTY_CAMPAIGN_KEY, "1");
    } else {
      localStorage.removeItem(EMPTY_CAMPAIGN_KEY);
      sessionStorage.removeItem(EMPTY_CAMPAIGN_KEY);
    }
  } catch {
    /* private mode */
  }
}

/** New campaign: strip ?demo= FIRST, then wipe every wizard field. Sticky until a new business name. */
export function markEmptyCampaign() {
  stripDemoFromUrl();
  try {
    sessionStorage.removeItem("sawek-pending-demo");
    localStorage.removeItem("sawek-pending-demo");
  } catch {
    /* private mode */
  }
  writeEmptyFlag(true);
  // Persist blank draft so a remount cannot reload clinic leftovers from a stale draft blob.
  applyEmptyCampaignHydrate();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(EMPTY_CAMPAIGN_EVENT));
  }
}

/** Same-page header CTA: wipe + don't navigate when already on home. */
export function beginNewCampaign(event?: { preventDefault?: () => void }) {
  markEmptyCampaign();
  try {
    if (typeof window === "undefined") return;
    const path = window.location.pathname.replace(/\/+$/, "") || "/";
    if (path === "/") event?.preventDefault?.();
  } catch {
    /* ignore */
  }
}

export function wantsEmptyCampaign(): boolean {
  try {
    if (typeof window === "undefined") return false;
    if (localStorage.getItem(EMPTY_CAMPAIGN_KEY) === "1") return true;
    if (sessionStorage.getItem(EMPTY_CAMPAIGN_KEY) === "1") return true;
    return new URLSearchParams(window.location.search).get("empty") === "1";
  } catch {
    return false;
  }
}

export function clearEmptyCampaign() {
  writeEmptyFlag(false);
}

/** Keep the sticky empty session until the user types a NEW business name (not Samer/clinic). */
export function releaseEmptyIfTypedName(businessName: string): boolean {
  const name = String(businessName ?? "").trim();
  if (!name || isBlockedEmptySessionName(name)) return false;
  clearEmptyCampaign();
  return true;
}

/** Persist a blank draft. Keep the empty flag so a remount cannot reload the clinic. */
export function applyEmptyCampaignHydrate(): DraftState {
  const draft: DraftState = { intake: emptyIntake(), step: 1, phase: "wizard" };
  saveDraft(draft);
  return draft;
}

/** Explicit demo click: `?demo=samer` in the URL. Session leftovers do not count. */
export function explicitDemoInUrl(): boolean {
  try {
    if (typeof window === "undefined") return false;
    const q = new URLSearchParams(window.location.search).get("demo");
    return q === "samer" || q === "peds";
  } catch {
    return false;
  }
}

export function shouldSaveEmptyOnly(intake: { businessName?: string; website?: string; whatsapp?: string; description?: string; location?: string }): boolean {
  if (!wantsEmptyCampaign()) return false;
  const name = String(intake.businessName ?? "").trim();
  if (!name) return true;
  return intakeIsClinicDemo(intake as never) || isBlockedEmptySessionName(name);
}

export { intakeIsClinicDemo, isBlockedEmptySessionName };
