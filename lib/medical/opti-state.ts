import type { OptiModuleId } from "./opti-engines";

export interface OptiDeskState {
  module: OptiModuleId;
  industry: string;
  methods: string[];
  bottleneck: string;
  budget: string;
  sector: string;
  clinicType: string;
  hmo: string;
  engineSpecialty: string;
  city: string;
  currentPatients: string;
  targetMonth1: string;
  targetMonth2: string;
  closeRate: string;
  cpl: string;
  adCopy: string;
  simPrice: string;
  audience: string;
  ctr: string;
  cpcStart: string;
  cpcNow: string;
  days: string;
  competitorSignal: string;
  signalConfirmed: boolean;
  product: string;
  benefit: string;
  unitCost: string;
  offerPrice: string;
  eventId: string;
  eventConfirmed: boolean;
  trendCity: string;
  monthlyBookings: string;
  noShows: string;
  coldLeads: string;
  channel: string;
  noshowNotes: string;
  complianceCopy: string;
  rating: string;
  reviewCount: string;
  monthlyPatients: string;
  topComplaint: string;
  reviewQuote: string;
  reviewAuthor: string;
  cpm: string;
  lpRate: string;
  roasClose: string;
  customerValue: string;
  transcript: string;
  voiceChannel: string;
  coreMessage: string;
  audienceMix: string;
  platform: string;
  region: string;
  hook: string;
  badgePos: string;
  imageKind: string;
  subject: string;
  templateSector: string;
  templateObjective: string;
}

export const EMPTY_DESK: OptiDeskState = {
  module: "audit",
  industry: "clinic",
  methods: [],
  bottleneck: "",
  budget: "",
  sector: "medical",
  clinicType: "private",
  hmo: "",
  engineSpecialty: "pediatrics",
  city: "",
  currentPatients: "",
  targetMonth1: "",
  targetMonth2: "",
  closeRate: "",
  cpl: "",
  adCopy: "",
  simPrice: "",
  audience: "",
  ctr: "",
  cpcStart: "",
  cpcNow: "",
  days: "",
  competitorSignal: "",
  signalConfirmed: false,
  product: "",
  benefit: "",
  unitCost: "",
  offerPrice: "",
  eventId: "",
  eventConfirmed: false,
  trendCity: "",
  monthlyBookings: "",
  noShows: "",
  coldLeads: "",
  channel: "",
  noshowNotes: "",
  complianceCopy: "",
  rating: "",
  reviewCount: "",
  monthlyPatients: "",
  topComplaint: "",
  reviewQuote: "",
  reviewAuthor: "",
  cpm: "",
  lpRate: "",
  roasClose: "",
  customerValue: "",
  transcript: "",
  voiceChannel: "all",
  coreMessage: "",
  audienceMix: "balanced",
  platform: "meta",
  region: "",
  hook: "",
  badgePos: "tr",
  imageKind: "hero",
  subject: "",
  templateSector: "medical",
  templateObjective: "patients",
};

export function demoPediatricDesk(): OptiDeskState {
  return {
    ...EMPTY_DESK,
    industry: "clinic",
    methods: ["boosting", "no_followup"],
    bottleneck: "no_leads",
    budget: "2500",
    sector: "medical",
    clinicType: "private",
    engineSpecialty: "pediatrics",
    city: "נצרת",
    currentPatients: "",
    targetMonth1: "",
    adCopy: "",
    product: "מעקב גדילה והתפתחות",
    benefit: "",
    unitCost: "",
    offerPrice: "",
    eventId: "school",
    eventConfirmed: true,
    trendCity: "נצרת",
    monthlyBookings: "",
    noShows: "",
    channel: "WhatsApp",
    noshowNotes: "",
    complianceCopy: "",
    coreMessage: "מרפאת ילדים ומשפחה עם קבלה אחה״צ לפי היומן — בלי הבטחת ריפוי.",
    region: "נצרת",
    hook: "תור לילד — אם יש משבצת היום ביומן",
    subject: "מרפאת ילדים ומשפחה",
  };
}
