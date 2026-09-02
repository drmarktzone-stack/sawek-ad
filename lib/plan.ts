/** Free vs Pro entitlements. Owner emails are always Pro (no paywall). */

export type PlanId = "free" | "pro";

export const OWNER_EMAILS = ["drmarktzone@gmail.com", "drbrawlluxegame@gmail.com"] as const;

export const PRICE_MONTHLY_ILS = 99;
export const PRICE_YEARLY_ILS = 990;

export const FREE_SAVED_CAMPAIGNS = 1;
export const FREE_BUSINESSES = 1;

export function normalizeEmail(email?: string | null): string {
  return String(email ?? "").trim().toLowerCase();
}

export function isOwnerEmail(email?: string | null): boolean {
  return (OWNER_EMAILS as readonly string[]).includes(normalizeEmail(email));
}

export function resolvePlan(opts: {
  email?: string | null;
  profilePlan?: string | null;
  stripeActive?: boolean;
  bankConfirmed?: boolean;
}): PlanId {
  if (isOwnerEmail(opts.email)) return "pro";
  const p = String(opts.profilePlan ?? "").trim().toLowerCase();
  if (p === "pro") return "pro";
  if (opts.stripeActive) return "pro";
  if (opts.bankConfirmed) return "pro";
  return "free";
}

export function isPro(plan: PlanId | string | null | undefined): boolean {
  return String(plan ?? "").toLowerCase() === "pro";
}

export type ProFeature = "vertex" | "zip" | "landing" | "calendar" | "extraCampaign" | "extraBusiness";

export function canUse(plan: PlanId, feature: ProFeature): boolean {
  if (isPro(plan)) return true;
  return false;
}

export function canSaveAnotherCampaign(plan: PlanId, savedCount: number, updatingExisting: boolean): boolean {
  if (isPro(plan)) return true;
  if (updatingExisting) return true;
  return savedCount < FREE_SAVED_CAMPAIGNS;
}

declare global {
  interface Window {
    __SAWEK_PLAN?: PlanId;
    __SAWEK_EMAIL?: string;
  }
}

export function clientPlan(): PlanId {
  if (typeof window === "undefined") return "free";
  return window.__SAWEK_PLAN === "pro" ? "pro" : "free";
}

export function setClientPlan(plan: PlanId, email?: string | null) {
  if (typeof window === "undefined") return;
  window.__SAWEK_PLAN = plan;
  window.__SAWEK_EMAIL = email ? normalizeEmail(email) : "";
}
