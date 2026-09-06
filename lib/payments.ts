import { PRICE_MONTHLY_ILS, PRICE_YEARLY_ILS } from "./plan";
import { runtimeEnv } from "./runtime-env";

/** Server-side receive defaults. Never ship these on public pages or public-config. */
export const DEFAULT_BIT_PHONE = "052-8885800";
export const DEFAULT_BANK_NAME = "בנק הפועלים";
export const DEFAULT_BANK_NAME_EN = "Bank Hapoalim";
export const DEFAULT_BANK_CODE = "12";
export const DEFAULT_BANK_BRANCH = "666";
export const DEFAULT_BANK_ACCOUNT = "422494";
export const DEFAULT_BANK_HOLDER = "ד״ר סאמר / Drmarktzone (Markt)";

export const MANUAL_PAY_PENDING_KEY = "sawek-manual-pay-pending";

export type ManualPayMethod = "bit" | "bank";
export type BillingInterval = "monthly" | "yearly";

export type ManualPayPending = {
  method: ManualPayMethod;
  interval: BillingInterval;
  orderCode: string;
  at: string;
};

/** Flags only — safe for anonymous GET /api/public-config. */
export type PublicPayments = {
  stripeEnabled: boolean;
  stripePublishableKey: string;
  paypalEnabled: false;
  paypalMe: "";
  paypalOffline: true;
  bitConfigured: boolean;
  bankConfigured: boolean;
};

export type BitReceiveDetails = {
  method: "bit";
  bitPhone: string;
  bitInstructions: string;
};

export type BankReceiveDetails = {
  method: "bank";
  bankName: string;
  bankNameEn: string;
  bankCode: string;
  bankBranch: string;
  bankAccount: string;
  bankHolder: string;
  bankIban: "";
  bankInstructions: string;
};

export type ReceiveDetails = {
  interval: BillingInterval;
  amountIls: number;
  orderCode: string;
  holder: string;
} & (BitReceiveDetails | BankReceiveDetails);

/** Owner decision: PayPal Business for drmarktzone@gmail.com is permanently deactivated. */
export function paypalLiveEnabled(): boolean {
  return false;
}

export function paypalMeUrl(): string {
  return "";
}

/** Format Israeli mobile as 052-8885800. */
export function formatBitPhone(raw: string): string {
  const trimmed = String(raw ?? "").trim();
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("05")) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }
  if (digits.length === 9 && digits.startsWith("5")) {
    return `0${digits.slice(0, 2)}-${digits.slice(2)}`;
  }
  return trimmed || DEFAULT_BIT_PHONE;
}

function envOr(name: string, fallback: string): string {
  return runtimeEnv(name) || fallback;
}

export function bitPhone(): string {
  return formatBitPhone(envOr("BIT_PHONE", DEFAULT_BIT_PHONE));
}

export function bankName(): string {
  return envOr("BANK_NAME", DEFAULT_BANK_NAME);
}

export function bankNameEn(): string {
  return envOr("BANK_NAME_EN", DEFAULT_BANK_NAME_EN);
}

export function bankCode(): string {
  return envOr("BANK_CODE", DEFAULT_BANK_CODE);
}

export function bankBranch(): string {
  return envOr("BANK_BRANCH", DEFAULT_BANK_BRANCH);
}

export function bankAccount(): string {
  return envOr("BANK_ACCOUNT", DEFAULT_BANK_ACCOUNT);
}

export function bankHolder(): string {
  return envOr("BANK_HOLDER", DEFAULT_BANK_HOLDER);
}

/** Never invent an IBAN. Only returned if the owner sets BANK_IBAN. */
export function bankIban(): string {
  return runtimeEnv("BANK_IBAN");
}

function defaultBitInstructions(phone: string): string {
  return `ביט למספר ${phone}`;
}

function defaultBankInstructions(opts: {
  name: string;
  code: string;
  branch: string;
  account: string;
  holder: string;
}): string {
  const lines = [
    opts.name,
    opts.code ? `קוד בנק: ${opts.code}` : "",
    opts.branch ? `סניף: ${opts.branch}` : "",
    opts.account ? `חשבון: ${opts.account}` : "",
    opts.holder ? `על שם: ${opts.holder}` : "",
    "העברה מקומית בישראל. אין IBAN.",
  ].filter(Boolean);
  return lines.join("\n");
}

export function bitInstructions(): string {
  const override = runtimeEnv("BIT_INSTRUCTIONS");
  const phone = bitPhone();
  const built = defaultBitInstructions(phone);
  if (!override) return built;
  return override.includes(phone) ? override : `${built}\n${override}`;
}

export function bankInstructions(): string {
  const override = runtimeEnv("BANK_INSTRUCTIONS");
  const built = defaultBankInstructions({
    name: bankName(),
    code: bankCode(),
    branch: bankBranch(),
    account: bankAccount(),
    holder: bankHolder(),
  });
  if (!override) return built;
  if (/IBAN|iban/i.test(override) && !bankIban()) {
    return built;
  }
  return `${built}\n\n${override}`;
}

export function bitConfigured(): boolean {
  return Boolean(bitPhone());
}

export function bankConfigured(): boolean {
  return Boolean(bankName() && bankBranch() && bankAccount());
}

export function parseInterval(raw: unknown): BillingInterval {
  return raw === "yearly" ? "yearly" : "monthly";
}

export function parsePayMethod(raw: unknown): ManualPayMethod | null {
  if (raw === "bit" || raw === "bank") return raw;
  return null;
}

export function amountForInterval(interval: BillingInterval): number {
  return interval === "yearly" ? PRICE_YEARLY_ILS : PRICE_MONTHLY_ILS;
}

export function publicPayments(opts: {
  stripeEnabled: boolean;
  stripePublishableKey: string;
}): PublicPayments {
  return {
    stripeEnabled: opts.stripeEnabled,
    stripePublishableKey: opts.stripePublishableKey,
    paypalEnabled: false,
    paypalMe: "",
    paypalOffline: true,
    bitConfigured: bitConfigured(),
    bankConfigured: bankConfigured(),
  };
}

export function receiveDetails(opts: {
  method: ManualPayMethod;
  interval: BillingInterval;
  orderCode: string;
}): ReceiveDetails {
  const interval: BillingInterval = opts.interval === "yearly" ? "yearly" : "monthly";
  const base = {
    interval,
    amountIls: amountForInterval(interval),
    orderCode: opts.orderCode,
    holder: bankHolder(),
  };
  if (opts.method === "bit") {
    return {
      ...base,
      method: "bit",
      bitPhone: bitPhone(),
      bitInstructions: bitInstructions(),
    };
  }
  return {
    ...base,
    method: "bank",
    bankName: bankName(),
    bankNameEn: bankNameEn(),
    bankCode: bankCode(),
    bankBranch: bankBranch(),
    bankAccount: bankAccount(),
    bankHolder: bankHolder(),
    bankIban: "",
    bankInstructions: bankInstructions(),
  };
}

const SECRET_KEYS = [
  "bitPhone",
  "bankAccount",
  "bankBranch",
  "bankCode",
  "bankHolder",
  "bankIban",
  "bankInstructions",
  "bitInstructions",
  "bankName",
  "bankNameEn",
] as const;

export function publicPayloadLeaksReceiveDetails(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;
  const rec = payload as Record<string, unknown>;
  for (const key of SECRET_KEYS) {
    const v = rec[key];
    if (typeof v === "string" && v.trim()) return true;
  }
  const blob = JSON.stringify(payload);
  if (blob.includes(DEFAULT_BIT_PHONE)) return true;
  if (blob.includes(DEFAULT_BANK_ACCOUNT)) return true;
  if (/\b052[- ]?8885800\b/.test(blob)) return true;
  return false;
}

export function readLocalPending(): ManualPayPending | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(MANUAL_PAY_PENDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ManualPayPending;
    if (parsed?.method !== "bit" && parsed?.method !== "bank") return null;
    if (parsed.interval !== "monthly" && parsed.interval !== "yearly") return null;
    if (!parsed.at || !parsed.orderCode) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeLocalPending(opts: {
  method: ManualPayMethod;
  interval: BillingInterval;
  orderCode: string;
}): ManualPayPending {
  const next: ManualPayPending = {
    method: opts.method,
    interval: opts.interval,
    orderCode: opts.orderCode,
    at: new Date().toISOString(),
  };
  if (typeof window !== "undefined") {
    window.localStorage.setItem(MANUAL_PAY_PENDING_KEY, JSON.stringify(next));
  }
  return next;
}
