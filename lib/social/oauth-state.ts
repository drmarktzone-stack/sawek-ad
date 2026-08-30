import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import type { SocialProvider } from "./types";

function hmacKey(): Buffer {
  const hex = String(process.env.TOKEN_ENCRYPTION_KEY ?? "").trim();
  if (/^[0-9a-fA-F]{64}$/.test(hex)) return Buffer.from(hex, "hex");
  const fallback = String(process.env.FACEBOOK_APP_SECRET ?? process.env.LINKEDIN_CLIENT_SECRET ?? "sawek-oauth-state");
  return createHmac("sha256", "sawek").update(fallback).digest();
}

export type OAuthState = {
  n: string;
  c: string;
  p: SocialProvider | "facebook" | "linkedin";
  t: number;
};

function sign(payloadB64: string): string {
  return createHmac("sha256", hmacKey()).update(payloadB64).digest("base64url");
}

export function createOAuthState(clientId: string, provider: "facebook" | "linkedin"): string {
  const payload: OAuthState = {
    n: randomBytes(16).toString("hex"),
    c: clientId,
    p: provider,
    t: Date.now(),
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${payloadB64}.${sign(payloadB64)}`;
}

export function verifyOAuthState(raw: string | undefined | null, maxAgeMs = 10 * 60 * 1000): OAuthState | null {
  const s = String(raw ?? "").trim();
  const dot = s.lastIndexOf(".");
  if (dot < 8) return null;
  const payloadB64 = s.slice(0, dot);
  const sig = s.slice(dot + 1);
  const expected = sign(payloadB64);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const parsed = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8")) as OAuthState;
    if (!parsed?.n || !parsed?.p || typeof parsed.t !== "number") return null;
    if (Date.now() - parsed.t > maxAgeMs) return null;
    return parsed;
  } catch {
    return null;
  }
}
