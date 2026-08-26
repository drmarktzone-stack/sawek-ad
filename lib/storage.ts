import type { CampaignPack, Intake, Locale, SelfPlan, SelfProfile, StudioPiece } from "./types";
import { emptyIntake } from "./engine/validate";

const K = {
  locale: "omniad-locale",
  draft: "omniad-draft",
  campaigns: "omniad-campaigns",
  studio: "omniad-studio-library",
  selfProfile: "omniad-self-profile",
  selfPlans: "omniad-self-plans",
  packLang: "omniad-pack-lang",
};

function canUse(): boolean {
  return typeof window !== "undefined";
}

function read<T>(key: string, fallback: T): T {
  if (!canUse()) return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (!canUse()) return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function loadLocale(): Locale {
  const v = canUse() ? localStorage.getItem(K.locale) : null;
  if (v === "he" || v === "ar" || v === "en") return v;
  return "he";
}

export function saveLocale(locale: Locale) {
  if (canUse()) localStorage.setItem(K.locale, locale);
}

export function loadPackLang(): Locale {
  const v = canUse() ? localStorage.getItem(K.packLang) : null;
  if (v === "he" || v === "ar" || v === "en") return v;
  return loadLocale();
}

export function savePackLang(locale: Locale) {
  if (canUse()) localStorage.setItem(K.packLang, locale);
}

export interface DraftState {
  intake: Intake;
  step: 1 | 2 | 3 | 4;
}

export function loadDraft(): DraftState {
  return read<DraftState>(K.draft, { intake: emptyIntake(), step: 1 });
}

export function saveDraft(draft: DraftState) {
  write(K.draft, draft);
}

export function clearDraft() {
  write(K.draft, { intake: emptyIntake(), step: 1 });
}

export function loadCampaigns(): CampaignPack[] {
  return read<CampaignPack[]>(K.campaigns, []);
}

export function saveCampaigns(list: CampaignPack[]) {
  write(K.campaigns, list);
}

export function upsertCampaign(pack: CampaignPack): CampaignPack[] {
  const list = loadCampaigns();
  const idx = list.findIndex((c) => c.id === pack.id);
  const next = { ...pack, saved: true, updatedAt: new Date().toISOString() };
  if (idx >= 0) list[idx] = next;
  else list.unshift(next);
  saveCampaigns(list);
  return list;
}

export function deleteCampaign(id: string): CampaignPack[] {
  const list = loadCampaigns().filter((c) => c.id !== id);
  saveCampaigns(list);
  return list;
}

export function loadStudio(): StudioPiece[] {
  return read<StudioPiece[]>(K.studio, []);
}

export function saveStudio(list: StudioPiece[]) {
  write(K.studio, list);
}

export function loadSelfProfile(): SelfProfile {
  return read<SelfProfile>(K.selfProfile, {
    name: "",
    craft: "",
    audience: "",
    cadence: "",
    channels: "",
    offer: "אין מבצע",
  });
}

export function saveSelfProfile(p: SelfProfile) {
  write(K.selfProfile, p);
}

export function loadSelfPlans(): SelfPlan[] {
  return read<SelfPlan[]>(K.selfPlans, []);
}

export function saveSelfPlans(list: SelfPlan[]) {
  write(K.selfPlans, list);
}

export function supabaseEnabled(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
