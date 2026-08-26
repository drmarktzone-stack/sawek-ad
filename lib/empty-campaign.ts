import { clearDraft } from "./storage";

export const EMPTY_CAMPAIGN_KEY = "sawek-empty-campaign";

export function markEmptyCampaign() {
  try {
    sessionStorage.removeItem("sawek-pending-demo");
  } catch {
    /* private mode */
  }
  clearDraft();
  try {
    localStorage.setItem(EMPTY_CAMPAIGN_KEY, "1");
  } catch {
    /* private mode */
  }
}

export function wantsEmptyCampaign(): boolean {
  try {
    if (typeof window === "undefined") return false;
    if (localStorage.getItem(EMPTY_CAMPAIGN_KEY) === "1") return true;
    return new URLSearchParams(window.location.search).get("empty") === "1";
  } catch {
    return false;
  }
}

export function clearEmptyCampaign() {
  try {
    localStorage.removeItem(EMPTY_CAMPAIGN_KEY);
  } catch {
    /* ignore */
  }
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
