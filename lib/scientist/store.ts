import type { CampaignPack } from "../types";
import { getClientId } from "../storage";
import { clientOwnerId } from "../plan";
import {
  SCIENTIST_DEMO_STORAGE_KEY,
  SCIENTIST_FEATURE_TYPE,
  SCIENTIST_STORAGE_KEY,
  type Experiment,
  type GrowthWorkspace,
} from "./types";
import { applyLearning, businessIdFromName, emptyWorkspace, experimentDeltas, experimentOutcomeFromMetrics, workspaceFromPack } from "./engines";
import { uid } from "../utils";

function canUse(): boolean {
  return typeof window !== "undefined";
}

function readKey(key: string): GrowthWorkspace[] {
  if (!canUse()) return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as GrowthWorkspace[]) : [];
  } catch {
    return [];
  }
}

function writeKey(key: string, list: GrowthWorkspace[]) {
  if (!canUse()) return;
  localStorage.setItem(key, JSON.stringify(list.slice(0, 40)));
}

export function loadScientistWorkspaces(): GrowthWorkspace[] {
  return readKey(SCIENTIST_STORAGE_KEY);
}

export function loadDemoScientistWorkspaces(): GrowthWorkspace[] {
  return readKey(SCIENTIST_DEMO_STORAGE_KEY);
}

export function clearDemoScientistWorkspaces() {
  if (!canUse()) return;
  try {
    localStorage.removeItem(SCIENTIST_DEMO_STORAGE_KEY);
  } catch {
    /* private mode */
  }
}

export function upsertWorkspace(ws: GrowthWorkspace): GrowthWorkspace[] {
  const sample = Boolean(ws.sample);
  const key = sample ? SCIENTIST_DEMO_STORAGE_KEY : SCIENTIST_STORAGE_KEY;
  const ownerId = clientOwnerId();
  const clientId = getClientId() || undefined;
  const stamped: GrowthWorkspace = {
    ...ws,
    ...(ownerId ? { ownerId } : {}),
    ...(clientId ? { clientId } : {}),
    updatedAt: new Date().toISOString(),
  };
  const list = readKey(key);
  const idx = list.findIndex((w) => w.id === stamped.id || w.businessId === stamped.businessId);
  if (idx >= 0) list[idx] = stamped;
  else list.unshift(stamped);
  writeKey(key, list);
  void syncWorkspaceRemote(stamped);
  return list;
}

export function getWorkspaceByBusiness(businessId: string): GrowthWorkspace | undefined {
  return (
    loadScientistWorkspaces().find((w) => w.businessId === businessId) ||
    loadDemoScientistWorkspaces().find((w) => w.businessId === businessId)
  );
}

export function getPrimaryWorkspace(): GrowthWorkspace | null {
  const own = loadScientistWorkspaces();
  if (own[0]) return own[0];
  return null;
}

export function ingestPack(pack: CampaignPack): GrowthWorkspace {
  const prior = getWorkspaceByBusiness(businessIdFromName(pack.intake.businessName || pack.name || pack.id));
  const next = workspaceFromPack(pack, prior);
  upsertWorkspace(next);
  return next;
}

export function recordExperiment(ws: GrowthWorkspace, partial: Omit<Experiment, "id" | "createdAt" | "updatedAt" | "deltas" | "outcome"> & { id?: string }): GrowthWorkspace {
  const t = new Date().toISOString();
  const deltas = experimentDeltas(partial.metrics);
  const outcome = experimentOutcomeFromMetrics(partial.metrics);
  const exp: Experiment = {
    ...partial,
    id: partial.id || uid("exp"),
    deltas,
    outcome,
    createdAt: t,
    updatedAt: t,
  };
  const experiments = [exp, ...ws.experiments.filter((e) => e.id !== exp.id)];
  const next = applyLearning({ ...ws, experiments });
  upsertWorkspace(next);
  return next;
}

export function completeExperiment(ws: GrowthWorkspace, experimentId: string, metrics: Experiment["metrics"], notes?: string): GrowthWorkspace {
  const experiments = ws.experiments.map((e) => {
    if (e.id !== experimentId) return e;
    const nextMetrics = metrics.length ? metrics : e.metrics;
    return {
      ...e,
      metrics: nextMetrics,
      notes: notes ?? e.notes,
      status: "completed" as const,
      deltas: experimentDeltas(nextMetrics),
      outcome: experimentOutcomeFromMetrics(nextMetrics),
      updatedAt: new Date().toISOString(),
    };
  });
  const next = applyLearning({ ...ws, experiments });
  upsertWorkspace(next);
  return next;
}

export function addManualRevenue(ws: GrowthWorkspace, amount: number, source: string): GrowthWorkspace {
  if (!Number.isFinite(amount) || amount <= 0) return ws;
  const event = {
    id: uid("rev"),
    amount,
    currency: "ILS",
    source: source.trim() || "user_entered",
    createdAt: new Date().toISOString(),
    evidence: [
      {
        source: "user_input" as const,
        ref: "revenue.manual",
        layer: "observed" as const,
        excerpt: String(amount),
        asOf: new Date().toISOString(),
      },
    ],
  };
  const events = [...ws.revenue.events, event];
  const next = applyLearning({
    ...ws,
    revenue: {
      events,
      total: events.reduce((s, e) => s + e.amount, 0),
      currency: "ILS",
      confidence: "low",
      note: "User-entered revenue. Attribution is partial — no ad-platform match.",
      updatedAt: new Date().toISOString(),
    },
  });
  upsertWorkspace(next);
  return next;
}

async function syncWorkspaceRemote(ws: GrowthWorkspace): Promise<void> {
  if (!canUse() || ws.sample) return;
  try {
    await fetch("/api/scientist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ workspace: ws, featureType: SCIENTIST_FEATURE_TYPE }),
    });
  } catch {
    /* local is enough */
  }
}

export async function fetchRemoteWorkspaces(): Promise<GrowthWorkspace[]> {
  if (!canUse()) return [];
  try {
    const res = await fetch("/api/scientist", { cache: "no-store", credentials: "same-origin" });
    if (!res.ok) return [];
    const data = (await res.json()) as { ok?: boolean; workspaces?: GrowthWorkspace[] };
    return Array.isArray(data.workspaces) ? data.workspaces : [];
  } catch {
    return [];
  }
}

export function mergeRemoteWorkspaces(remote: GrowthWorkspace[]) {
  const ownerId = clientOwnerId();
  const local = loadScientistWorkspaces();
  const byId = new Map(local.map((w) => [w.businessId, w]));
  for (const row of remote) {
    if (ownerId && row.ownerId && row.ownerId !== ownerId) continue;
    const existing = byId.get(row.businessId);
    if (!existing || existing.updatedAt < row.updatedAt) byId.set(row.businessId, row);
  }
  const next = [...byId.values()].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  writeKey(SCIENTIST_STORAGE_KEY, next);
  return next;
}

export function ensureWorkspaceForName(name: string): GrowthWorkspace {
  const business = {
    id: businessIdFromName(name),
    name: name.trim(),
    category: "",
    location: "",
    website: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const existing = getWorkspaceByBusiness(business.id);
  if (existing) return existing;
  const ws = emptyWorkspace(business);
  upsertWorkspace(ws);
  return ws;
}
