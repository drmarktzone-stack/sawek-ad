/**
 * Generation memory — creative fingerprints only.
 * Tenant / owner isolated. Demo never becomes customer truth.
 * Never written into Business DNA.
 */
import type { CampaignPack, CreativeFingerprint } from "../../types";
import { businessKey } from "./sources";

export const CREATIVE_HISTORY_KEY = "sawek-creative-history";

export interface MemoryScope {
  businessId: string;
  ownerId?: string;
  clientId?: string;
  sample?: boolean;
}

const memStore: CreativeFingerprint[] = [];

function canUseWindow(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readPersisted(): CreativeFingerprint[] {
  if (!canUseWindow()) return [];
  try {
    const raw = window.localStorage.getItem(CREATIVE_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { items?: CreativeFingerprint[] };
    return Array.isArray(parsed?.items) ? parsed.items : [];
  } catch {
    return [];
  }
}

function writePersisted(items: CreativeFingerprint[]) {
  if (!canUseWindow()) return;
  try {
    window.localStorage.setItem(CREATIVE_HISTORY_KEY, JSON.stringify({ items: items.slice(0, 200) }));
  } catch {
    /* private mode */
  }
}

function allItems(): CreativeFingerprint[] {
  const persisted = readPersisted();
  const seen = new Set<string>();
  const out: CreativeFingerprint[] = [];
  for (const item of [...memStore, ...persisted]) {
    const key = item.id || item.hash;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function sameTenant(item: CreativeFingerprint, scope: MemoryScope): boolean {
  if (businessKey(item.businessId) !== businessKey(scope.businessId) && item.businessId !== scope.businessId) {
    return false;
  }
  if (scope.ownerId && item.ownerId && item.ownerId !== scope.ownerId) return false;
  if (scope.clientId && item.clientId && item.clientId !== scope.clientId) return false;
  return true;
}

export function scopeFromPack(pack: Pick<CampaignPack, "intake" | "ownerId" | "clientId" | "demoMeta">): MemoryScope {
  return {
    businessId: businessKey(pack.intake.businessName || pack.intake.website || ""),
    ownerId: pack.ownerId,
    clientId: pack.clientId,
    sample: Boolean(pack.demoMeta?.sample),
  };
}

export function loadCreativeHistory(scope: MemoryScope): CreativeFingerprint[] {
  if (!scope.businessId || scope.businessId === "unnamed-business") return [];
  return allItems()
    .filter((item) => sameTenant(item, scope))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function recordCreativeFingerprint(scope: MemoryScope, fp: CreativeFingerprint): void {
  if (scope.sample) return;
  if (!scope.businessId || scope.businessId === "unnamed-business") return;
  const stamped: CreativeFingerprint = {
    ...fp,
    businessId: scope.businessId,
    ownerId: scope.ownerId || fp.ownerId,
    clientId: scope.clientId || fp.clientId,
  };
  const existingIdx = memStore.findIndex((x) => x.hash === stamped.hash && x.businessId === stamped.businessId);
  if (existingIdx >= 0) memStore[existingIdx] = stamped;
  else memStore.unshift(stamped);
  while (memStore.length > 200) memStore.pop();
  const persisted = readPersisted().filter(
    (x) => !(x.hash === stamped.hash && x.businessId === stamped.businessId && (x.ownerId || "") === (stamped.ownerId || "")),
  );
  writePersisted([stamped, ...persisted].slice(0, 200));
}

export function resetCreativeMemory(): void {
  memStore.length = 0;
  if (canUseWindow()) {
    try {
      window.localStorage.removeItem(CREATIVE_HISTORY_KEY);
    } catch {
      /* ignore */
    }
  }
}

/** Saved campaigns → fingerprints for THIS business + owner only. */
export function fingerprintsFromCampaigns(
  packs: CampaignPack[],
  scope: MemoryScope,
): CreativeFingerprint[] {
  if (scope.sample) return [];
  return packs
    .filter((p) => {
      if (p.demoMeta?.sample) return false;
      const bid = businessKey(p.intake.businessName || "");
      if (bid !== scope.businessId) return false;
      if (scope.ownerId && p.ownerId && p.ownerId !== scope.ownerId) return false;
      return true;
    })
    .map((p) => p.completeAd?.fingerprint)
    .filter((x): x is CreativeFingerprint => Boolean(x));
}
