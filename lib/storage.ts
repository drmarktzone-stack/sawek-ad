import type { CampaignPack, CoachReport, Intake, LabRun, Locale, SelfPlan, SelfProfile, StudioPiece } from "./types";
import { emptyIntake } from "./engine/validate";
import { coachIntake } from "./engine/coach";
import { intakeIsClinicDemo, isBlockedEmptySessionName } from "./clinic-leak";
import { filterCustomerCampaigns } from "./sample-packs";
import { canSaveAnotherCampaign, clientPlan } from "./plan";

const K = {
  locale: "omniad-locale",
  draft: "omniad-draft",
  campaigns: "omniad-campaigns",
  studio: "omniad-studio-library",
  selfProfile: "omniad-self-profile",
  selfPlans: "omniad-self-plans",
  packLang: "omniad-pack-lang",
  labRuns: "omniad-lab-runs",
  clientId: "omniad-client-id",
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

export type WizardPhase = "wizard" | "interview" | "agents";

export interface DraftState {
  intake: Intake;
  step: 1 | 2 | 3 | 4;
  phase?: WizardPhase;
  packId?: string;
  coach?: CoachReport;
}

export function loadDraft(): DraftState {
  const d = read<DraftState>(K.draft, { intake: emptyIntake(), step: 1, phase: "wizard" });
  const phase: WizardPhase =
    d.phase === "interview" || d.phase === "agents" ? d.phase : "wizard";
  return {
    step: d.step === 2 || d.step === 3 || d.step === 4 ? d.step : 1,
    intake: {
      ...emptyIntake(),
      ...d.intake,
      operatingModel: d.intake?.operatingModel === "free_service" ? "free_service" : (d.intake?.operatingModel === "paid" ? "paid" : emptyIntake().operatingModel),
      mediaAssets: Array.isArray(d.intake?.mediaAssets) ? d.intake.mediaAssets : [],
      ingestedDocs: Array.isArray(d.intake?.ingestedDocs) ? d.intake.ingestedDocs : [],
      pastCreatives: Array.isArray(d.intake?.pastCreatives) ? d.intake.pastCreatives : [],
      brandTone: typeof d.intake?.brandTone === "string" ? d.intake.brandTone : "",
      brandPositioning: typeof d.intake?.brandPositioning === "string" ? d.intake.brandPositioning : "",
      channelNotes: typeof d.intake?.channelNotes === "string" ? d.intake.channelNotes : "",
      whatsappTemplates: typeof d.intake?.whatsappTemplates === "string" ? d.intake.whatsappTemplates : "",
      landingLines: typeof d.intake?.landingLines === "string" ? d.intake.landingLines : "",
      brandKit:
        d.intake?.brandKit && typeof d.intake.brandKit === "object"
          ? {
              logoSrc: typeof d.intake.brandKit.logoSrc === "string" ? d.intake.brandKit.logoSrc : undefined,
              colors: Array.isArray(d.intake.brandKit.colors)
                ? d.intake.brandKit.colors.filter((c): c is string => typeof c === "string")
                : [],
              source: d.intake.brandKit.source === "scan" ? "scan" : "none",
            }
          : { colors: [], source: "none" },
    },
    phase,
    packId: typeof d.packId === "string" ? d.packId : undefined,
    coach: d.coach && typeof d.coach === "object" ? d.coach : undefined,
  };
}

const EMPTY_CAMPAIGN_FLAG = "sawek-empty-campaign";

function emptySessionActive(): boolean {
  if (!canUse()) return false;
  try {
    if (localStorage.getItem(EMPTY_CAMPAIGN_FLAG) === "1") return true;
    if (sessionStorage.getItem(EMPTY_CAMPAIGN_FLAG) === "1") return true;
  } catch {
    return false;
  }
  return false;
}

export function saveDraft(draft: DraftState) {
  if (emptySessionActive()) {
    const name = String(draft.intake?.businessName ?? "").trim();
    const clinic = intakeIsClinicDemo(draft.intake ?? {}) || isBlockedEmptySessionName(name);
    if (!name || clinic) {
      write(K.draft, { intake: emptyIntake(), step: 1, phase: "wizard" });
      return;
    }
  }
  write(K.draft, draft);
}

export const INGEST_APPLIED_EVENT = "sawek-ingest-applied";

/** Merge intake into the current draft and notify the wizard (same window).
 * resetWizard: URL ingest replaces the previous business — leave demo/agents pack, reload steps.
 */
export function applyIntakeToDraft(intake: Intake, opts?: { resetWizard?: boolean }): DraftState {
  const d = loadDraft();
  const coach = coachIntake(intake);
  const next: DraftState = opts?.resetWizard
    ? { intake, step: 2, phase: "wizard", coach }
    : { ...d, intake, coach };
  saveDraft(next);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(INGEST_APPLIED_EVENT));
  }
  return next;
}

export function clearDraft() {
  write(K.draft, { intake: emptyIntake(), step: 1, phase: "wizard" });
}

export function loadCampaigns(): CampaignPack[] {
  const list = read<CampaignPack[]>(K.campaigns, []);
  const kept = filterCustomerCampaigns(list);
  if (kept.length !== list.length) write(K.campaigns, kept);
  return kept;
}

export function saveCampaigns(list: CampaignPack[]) {
  write(K.campaigns, list);
}

export function upsertCampaign(pack: CampaignPack): CampaignPack[] {
  const list = loadCampaigns();
  const idx = list.findIndex((c) => c.id === pack.id);
  const next = { ...pack, saved: true, updatedAt: new Date().toISOString() };
  if (idx >= 0) list[idx] = next;
  else if (!canSaveAnotherCampaign(clientPlan(), list.length, false)) return list;
  else list.unshift(next);
  saveCampaigns(list);
  return list;
}

export function getCampaign(id: string): CampaignPack | undefined {
  return loadCampaigns().find((c) => c.id === id);
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

export function getClientId(): string {
  if (!canUse()) return "";
  try {
    const existing = localStorage.getItem(K.clientId);
    if (existing && existing.trim()) return existing.trim();
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `anon_${Math.random().toString(36).slice(2, 12)}`;
    localStorage.setItem(K.clientId, id);
    return id;
  } catch {
    return "";
  }
}

export function loadLabRuns(): LabRun[] {
  const list = read<LabRun[]>(K.labRuns, []);
  return Array.isArray(list) ? list : [];
}

export function saveLabRuns(list: LabRun[]) {
  write(K.labRuns, list.slice(0, 80));
}

export function upsertLabRunLocal(run: LabRun): LabRun[] {
  const list = loadLabRuns().filter((r) => r.id !== run.id);
  list.unshift(run);
  saveLabRuns(list);
  return list;
}

export function getLabRun(id: string): LabRun | undefined {
  return loadLabRuns().find((r) => r.id === id);
}
