import type { Locale } from "../types";

export type MedicalSpecialty =
  | "family"
  | "peds"
  | "dental"
  | "vet"
  | "aesthetic"
  | "physio"
  | "obgyn"
  | "ent";

export type LandingTemplateId =
  | "clinical-trust"
  | "bold-conversion"
  | "editorial"
  | "luxury-aesthetic"
  | "vet-warm"
  | "dental-bright";

export type ClaimKind = "doctor-fact" | "cited-source" | "marketing-copy";
export type LeadStatus = "new" | "in-progress" | "closed";

export type Tri = Record<Locale, string>;

export interface ClinicHours {
  day: "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";
  open: string;
  close: string;
  closed: boolean;
}

export interface ClinicProfile {
  id: string;
  name: string;
  doctorName: string;
  specialty: MedicalSpecialty;
  whatsapp: string;
  address: string;
  city: string;
  disclaimer: string;
  hours: ClinicHours[];
  slotMinutes: number;
}

export interface Treatment {
  id: string;
  serviceId: string;
  name: string;
  indication: string;
  duration: string;
  price: string;
  cost: string;
  technology: string;
  successRate: string;
  sourceUrl: string;
  consentBeforeAfter: boolean;
  beforeCaption: string;
  afterCaption: string;
}

export interface Claim {
  id: string;
  text: Tri;
  kind: ClaimKind;
  source: string;
}

export interface MedicalCopyBlock {
  locale: Locale;
  landingHeadline: string;
  landingSub: string;
  servicesBlurb: string;
  faq: { q: string; a: string }[];
  socialPosts: { platform: string; body: string }[];
  whatsappScript: string;
  voiceScript: string;
  disclaimer: string;
}

export interface MedicalCampaign {
  id: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
  clinic: ClinicProfile;
  treatment: Treatment;
  template: LandingTemplateId;
  copy: MedicalCopyBlock[];
  claims: Claim[];
  approved: boolean;
  markerCount: number;
}

export interface MedicalLead {
  id: string;
  campaignId: string;
  slug: string;
  name: string;
  phone: string;
  message: string;
  status: LeadStatus;
  createdAt: string;
  appointmentId?: string;
}

export type AppointmentStatus = "pending" | "confirmed" | "cancelled";

export interface MedicalAppointment {
  id: string;
  leadId?: string;
  campaignId: string;
  name: string;
  phone: string;
  startsAt: string;
  durationMin: number;
  notes: string;
  reminderPlan: string;
  status?: AppointmentStatus;
}

export interface OptiInputs {
  monthlySpend: string;
  revenue: string;
  noShowPercent: string;
  oldMethod: string;
  bottleneck: string;
  competitorName: string;
  competitorNote: string;
  localEvent: string;
}

export const DEFAULT_HOURS: ClinicHours[] = [
  { day: "sun", open: "08:00", close: "16:00", closed: false },
  { day: "mon", open: "08:00", close: "16:00", closed: false },
  { day: "tue", open: "08:00", close: "16:00", closed: false },
  { day: "wed", open: "08:00", close: "16:00", closed: false },
  { day: "thu", open: "08:00", close: "16:00", closed: false },
  { day: "fri", open: "08:00", close: "12:00", closed: false },
  { day: "sat", open: "09:00", close: "13:00", closed: true },
];

export const EMPTY_TREATMENT: Treatment = {
  id: "",
  serviceId: "",
  name: "",
  indication: "",
  duration: "",
  price: "",
  cost: "",
  technology: "",
  successRate: "",
  sourceUrl: "",
  consentBeforeAfter: false,
  beforeCaption: "",
  afterCaption: "",
};

export const EMPTY_OPTI: OptiInputs = {
  monthlySpend: "",
  revenue: "",
  noShowPercent: "",
  oldMethod: "",
  bottleneck: "",
  competitorName: "",
  competitorNote: "",
  localEvent: "",
};
