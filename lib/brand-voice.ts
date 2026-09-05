import type { Locale } from "./types";

/**
 * Brand voice for the future viral-desk (Mohtawak-style).
 * Persist to Firestore collection `brand_voices` when that PR lands.
 * This module is the contract only — no invented live metrics.
 */
export type BrandVoice = {
  id: string;
  businessName: string;
  tone: string;
  do: string[];
  dont: string[];
  locales: Partial<Record<Locale, { sample: string }>>;
  updatedAt: string;
};

export interface BrandVoiceStore {
  get(id: string): Promise<BrandVoice | null>;
  set(voice: BrandVoice): Promise<void>;
  list?(): Promise<BrandVoice[]>;
}

/** In-process store so Cloud Run / local work without Firestore. */
const mem = new Map<string, BrandVoice>();

export const memoryBrandVoiceStore: BrandVoiceStore = {
  async get(id) {
    return mem.get(id) ?? null;
  },
  async set(voice) {
    mem.set(voice.id, { ...voice, updatedAt: new Date().toISOString() });
  },
  async list() {
    return [...mem.values()];
  },
};

let activeStore: BrandVoiceStore = memoryBrandVoiceStore;

/** Viral-desk PR: swap in a Firestore adapter. Do not invent platform metrics here. */
export function setBrandVoiceStore(store: BrandVoiceStore) {
  activeStore = store;
}

export function getBrandVoiceStore(): BrandVoiceStore {
  return activeStore;
}

export async function loadBrandVoice(id: string): Promise<BrandVoice | null> {
  return activeStore.get(id);
}

export async function saveBrandVoice(voice: BrandVoice): Promise<BrandVoice> {
  const next = { ...voice, updatedAt: new Date().toISOString() };
  await activeStore.set(next);
  return next;
}

export const FIRESTORE_BRAND_VOICE_COLLECTION = "brand_voices";
