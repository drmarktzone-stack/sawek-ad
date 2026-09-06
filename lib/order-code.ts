import { createHash, randomBytes } from "crypto";

/** Short reference the customer must put in the Bit / bank transfer note. */
export function generateOrderCode(seed?: string): string {
  const material = seed || randomBytes(8).toString("hex");
  const hex = createHash("sha256").update(`sawek-order:${material}`).digest("hex");
  return `SAWEK-${hex.slice(0, 4).toUpperCase()}`;
}
