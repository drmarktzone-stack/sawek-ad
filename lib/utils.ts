import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function uid(prefix = "id"): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function parseNumber(value: string | undefined | null): number | undefined {
  if (value == null) return undefined;
  const cleaned = String(value).replace(/[^\d.-]/g, "").trim();
  if (!cleaned) return undefined;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : undefined;
}

export function isBlank(value: string | undefined | null): boolean {
  return !value || !String(value).trim();
}

export function filled(value: string | undefined | null): boolean {
  return !isBlank(value);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
