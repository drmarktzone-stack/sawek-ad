/**
 * Owned reachable list — pillar 4. Local capture only.
 * Never invents leads, ROAS, or follower counts.
 */
import { businessKey } from "./engine/ad-engine/sources";

export type CampaignLead = {
  id: string;
  name: string;
  phone: string;
  note: string;
  createdAt: string;
};

export type OwnedListState = {
  businessKey: string;
  whatsappReady: boolean;
  leads: CampaignLead[];
};

const STORAGE_KEY = "sawek-owned-lists";

function canUse(): boolean {
  return typeof window !== "undefined";
}

function readAll(): Record<string, OwnedListState> {
  if (!canUse()) return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, OwnedListState>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(all: Record<string, OwnedListState>) {
  if (!canUse()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function ownedListKey(businessName: string): string {
  return businessKey(businessName) || "unnamed";
}

export function emptyOwnedList(key: string): OwnedListState {
  return { businessKey: key, whatsappReady: false, leads: [] };
}

export function loadOwnedList(businessName: string): OwnedListState {
  const key = ownedListKey(businessName);
  return readAll()[key] ?? emptyOwnedList(key);
}

export function saveOwnedList(businessName: string, next: OwnedListState) {
  const key = ownedListKey(businessName);
  const all = readAll();
  all[key] = { ...next, businessKey: key };
  writeAll(all);
}

export function ownedListIsReady(state: OwnedListState): boolean {
  return state.whatsappReady || state.leads.length > 0;
}

export function addCampaignLead(
  businessName: string,
  lead: { name: string; phone: string; note: string },
): OwnedListState {
  const cur = loadOwnedList(businessName);
  const name = lead.name.replace(/\s+/g, " ").trim();
  const phone = lead.phone.replace(/\s+/g, " ").trim();
  if (!name && !phone) return cur;
  const next: OwnedListState = {
    ...cur,
    leads: [
      {
        id: `lead-${Date.now().toString(36)}`,
        name,
        phone,
        note: lead.note.replace(/\s+/g, " ").trim(),
        createdAt: new Date().toISOString(),
      },
      ...cur.leads,
    ].slice(0, 200),
  };
  saveOwnedList(businessName, next);
  return next;
}
