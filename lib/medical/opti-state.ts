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
    methods: [],
    bottleneck: "",
    budget: "",
    sector: "medical",
    clinicType: "hmo",
    hmo: "clalit",
    engineSpecialty: "pediatrics",
    city: "באקה אל-גרביה",
    currentPatients: "",
    targetMonth1: "",
    adCopy: "",
    product: "",
    benefit: "",
    unitCost: "",
    offerPrice: "",
    eventId: "",
    eventConfirmed: false,
    trendCity: "באקה אל-גרביה",
    monthlyBookings: "",
    noShows: "",
    channel: "WhatsApp",
    noshowNotes: "",
    complianceCopy: "טקסט לבדיקת מגן מדיניות (דוגמה לסריקה בלבד, לא טענת המרפאה): ריפוי, 100%, הרופא הטוב ביותר.",
    coreMessage: "מרפאת ילדים כללית במתחם אל-נור, באקה אל-גרביה — בלי הבטחת ריפוי.",
    region: "באקה אל-גרביה",
    hook: "",
    subject: "מרפאת ילדים ד״ר סאמר אבו מוך",
  };
}
