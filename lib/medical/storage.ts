import type {
  ClinicProfile,
  MedicalAppointment,
  MedicalCampaign,
  MedicalLead,
  OptiInputs,
} from "./types";
import { EMPTY_OPTI } from "./types";
import { EMPTY_DESK, type OptiDeskState } from "./opti-state";

const K = {
  clinic: "sawek-medical-clinic",
  campaigns: "sawek-medical-campaigns",
  leads: "sawek-medical-leads",
  appointments: "sawek-medical-appointments",
  opti: "sawek-medical-opti",
  desk: "sawek-optibrain-desk",
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

export function loadClinic(): ClinicProfile | null {
  return read<ClinicProfile | null>(K.clinic, null);
}

export function saveClinic(c: ClinicProfile) {
  write(K.clinic, c);
}

export function loadMedCampaigns(): MedicalCampaign[] {
  return read<MedicalCampaign[]>(K.campaigns, []);
}

export function saveMedCampaigns(list: MedicalCampaign[]) {
  write(K.campaigns, list);
}

export function upsertMedCampaign(c: MedicalCampaign): MedicalCampaign[] {
  const list = loadMedCampaigns();
  const next = { ...c, updatedAt: new Date().toISOString() };
  const i = list.findIndex((x) => x.id === next.id);
  if (i >= 0) list[i] = next;
  else list.unshift(next);
  saveMedCampaigns(list);
  return list;
}

export function campaignBySlug(slug: string): MedicalCampaign | undefined {
  return loadMedCampaigns().find((c) => c.slug === slug);
}

export function loadLeads(): MedicalLead[] {
  return read<MedicalLead[]>(K.leads, []);
}

export function saveLeads(list: MedicalLead[]) {
  write(K.leads, list);
}

export function addLead(lead: MedicalLead): MedicalLead[] {
  const list = [lead, ...loadLeads()];
  saveLeads(list);
  return list;
}

export function loadAppointments(): MedicalAppointment[] {
  return read<MedicalAppointment[]>(K.appointments, []);
}

export function saveAppointments(list: MedicalAppointment[]) {
  write(K.appointments, list);
}

export function loadOpti(): OptiInputs {
  return read<OptiInputs>(K.opti, { ...EMPTY_OPTI });
}

export function saveOpti(o: OptiInputs) {
  write(K.opti, o);
}

export function loadOptiDesk(): OptiDeskState {
  return { ...EMPTY_DESK, ...read<Partial<OptiDeskState>>(K.desk, {}) };
}

export function saveOptiDesk(state: OptiDeskState) {
  write(K.desk, state);
}

/** Wipe pediatric demo leftovers so New Campaign does not reopen the clinic desk. */
export function clearPediatricMedicalLeftovers() {
  if (!canUse()) return;
  const clinic = loadClinic();
  const blob = `${clinic?.id ?? ""}\n${clinic?.name ?? ""}\n${clinic?.doctorName ?? ""}\n${clinic?.whatsapp ?? ""}`;
  const isPedsDemo =
    clinic?.id === "demo-samer-peds" ||
    /052-?8885800|סאמר|أبو مخ|أبو موخ|Abu Mokh|demo-samer-peds/i.test(blob);
  if (isPedsDemo) {
    try {
      localStorage.removeItem(K.clinic);
    } catch {
      /* private mode */
    }
  }
  const camps = loadMedCampaigns().filter(
    (c) => c.id !== "demo-samer-peds-campaign" && c.slug !== "samer-abu-mokh-peds",
  );
  if (camps.length !== loadMedCampaigns().length) saveMedCampaigns(camps);
  const desk = loadOptiDesk();
  if (/סאמר|أبو مخ|Abu Mokh|באקה אל-גרביה|باقة/i.test(`${desk.subject}\n${desk.city}\n${desk.coreMessage}`)) {
    write(K.desk, { ...EMPTY_DESK });
  }
}
