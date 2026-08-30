import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { decrypt, encryptField } from "./crypto";
import {
  CLIENT_COOKIE,
  TOKEN_COOKIE_PREFIX,
  hasServiceRole,
  serviceRoleKey,
  supabaseUrl,
} from "./config";
import type { DecryptedToken, ProviderStatus, SocialProvider, StoredToken, TokenMeta } from "./types";
import { isSocialProvider } from "./types";

function adminClient(): SupabaseClient | null {
  const url = supabaseUrl();
  const key = serviceRoleKey();
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

function cookieName(provider: SocialProvider): string {
  return `${TOKEN_COOKIE_PREFIX}${provider}`;
}

type CookieBag = { get: (name: string) => { value: string } | undefined };

function readCookieToken(cookies: CookieBag, provider: SocialProvider): StoredToken | null {
  const raw = cookies.get(cookieName(provider))?.value;
  if (!raw) return null;
  try {
    const j = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as Record<string, unknown>;
    if (typeof j.a !== "string" || typeof j.iv !== "string") return null;
    return {
      provider,
      encrypted_access_token: j.a,
      encrypted_refresh_token: typeof j.r === "string" ? j.r : null,
      iv: j.iv,
      token_type: typeof j.tt === "string" ? j.tt : null,
      expires_at: typeof j.exp === "string" ? j.exp : null,
      meta: j.meta && typeof j.meta === "object" ? (j.meta as TokenMeta) : {},
    };
  } catch {
    return null;
  }
}

function cookieValue(row: StoredToken): string {
  const payload = {
    a: row.encrypted_access_token,
    r: row.encrypted_refresh_token ?? undefined,
    iv: row.iv,
    tt: row.token_type ?? undefined,
    exp: row.expires_at ?? undefined,
    meta: row.meta ?? {},
  };
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function applyTokenCookie(
  res: NextResponse,
  row: StoredToken,
  req: Request,
): void {
  const secure = appIsHttps(req);
  res.cookies.set(cookieName(row.provider), cookieValue(row), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 60,
    secure,
  });
}

export function clearTokenCookie(res: NextResponse, provider: SocialProvider, req: Request): void {
  res.cookies.set(cookieName(provider), "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    secure: appIsHttps(req),
  });
}

export function setClientIdCookie(res: NextResponse, clientId: string, req: Request): void {
  if (!clientId) return;
  res.cookies.set(CLIENT_COOKIE, clientId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    secure: appIsHttps(req),
  });
}

function appIsHttps(req: Request): boolean {
  const url = new URL(req.url);
  const proto = (req.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "")).split(",")[0]!.trim();
  return proto === "https";
}

function decryptRow(row: StoredToken): DecryptedToken | null {
  try {
    const accessToken = decrypt(row.encrypted_access_token, row.iv);
    if (!accessToken) return null;
    let refreshToken: string | undefined;
    if (row.encrypted_refresh_token) {
      try {
        const packed = row.encrypted_refresh_token;
        const first = packed.indexOf(":");
        if (first > 0 && !packed.slice(0, first).includes(":")) {
          refreshToken = decrypt(packed.slice(first + 1), packed.slice(0, first));
        } else {
          refreshToken = decrypt(packed, row.iv);
        }
      } catch {
        refreshToken = undefined;
      }
    }
    return {
      provider: row.provider,
      accessToken,
      refreshToken,
      tokenType: row.token_type ?? undefined,
      expiresAt: row.expires_at ?? undefined,
      meta: row.meta ?? {},
    };
  } catch {
    return null;
  }
}

function statusOf(row: StoredToken | null): ProviderStatus {
  if (!row) return { connected: false };
  const meta = row.meta ?? {};
  if (row.provider === "facebook" && meta.missingPage) {
    return { connected: false, expiresAt: row.expires_at, pageName: meta.pageName };
  }
  if (row.provider === "instagram" && !meta.igUserId) {
    return { connected: false, expiresAt: row.expires_at, pageName: meta.pageName };
  }
  if (row.provider === "linkedin" && !meta.personUrn) {
    return { connected: false, expiresAt: row.expires_at };
  }
  return {
    connected: true,
    expiresAt: row.expires_at,
    pageName: typeof meta.pageName === "string" ? meta.pageName : undefined,
  };
}

async function dbLoad(clientId: string, provider: SocialProvider): Promise<StoredToken | null> {
  const sb = adminClient();
  if (!sb || !clientId) return null;
  const { data, error } = await sb
    .from("user_tokens")
    .select("provider,encrypted_access_token,encrypted_refresh_token,iv,token_type,expires_at,meta")
    .eq("client_id", clientId)
    .eq("provider", provider)
    .maybeSingle();
  if (error || !data) return null;
  if (!isSocialProvider(data.provider)) return null;
  return {
    provider: data.provider,
    encrypted_access_token: data.encrypted_access_token,
    encrypted_refresh_token: data.encrypted_refresh_token,
    iv: data.iv,
    token_type: data.token_type,
    expires_at: data.expires_at,
    meta: (data.meta ?? {}) as TokenMeta,
  };
}

async function dbLoadAll(clientId: string): Promise<StoredToken[]> {
  const sb = adminClient();
  if (!sb || !clientId) return [];
  const { data, error } = await sb
    .from("user_tokens")
    .select("provider,encrypted_access_token,encrypted_refresh_token,iv,token_type,expires_at,meta")
    .eq("client_id", clientId);
  if (error || !Array.isArray(data)) return [];
  return data.filter((r) => isSocialProvider(r.provider)).map((r) => ({
    provider: r.provider as SocialProvider,
    encrypted_access_token: r.encrypted_access_token,
    encrypted_refresh_token: r.encrypted_refresh_token,
    iv: r.iv,
    token_type: r.token_type,
    expires_at: r.expires_at,
    meta: (r.meta ?? {}) as TokenMeta,
  }));
}

async function dbUpsert(clientId: string, row: StoredToken): Promise<boolean> {
  const sb = adminClient();
  if (!sb || !clientId) return false;
  const { error } = await sb.from("user_tokens").upsert(
    {
      user_id: null,
      client_id: clientId,
      provider: row.provider,
      encrypted_access_token: row.encrypted_access_token,
      encrypted_refresh_token: row.encrypted_refresh_token ?? null,
      iv: row.iv,
      token_type: row.token_type ?? null,
      expires_at: row.expires_at ?? null,
      meta: row.meta ?? {},
      updated_at: new Date().toISOString(),
    },
    { onConflict: "client_id,provider" },
  );
  return !error;
}

async function dbDelete(clientId: string, provider: SocialProvider): Promise<boolean> {
  const sb = adminClient();
  if (!sb || !clientId) return false;
  const { error } = await sb.from("user_tokens").delete().eq("client_id", clientId).eq("provider", provider);
  return !error;
}

export type SaveOutcome = { persisted: "db" | "cookie"; needs_service_role: boolean };

export function encryptTokenInput(input: {
  provider: SocialProvider;
  accessToken: string;
  refreshToken?: string;
  tokenType?: string;
  expiresAt?: string | null;
  meta: TokenMeta;
}): StoredToken {
  const packed = encryptField(input.accessToken);
  if (!packed) throw new Error("encrypt_failed");
  let refreshPacked: string | null = null;
  if (input.refreshToken) {
    const r = encryptField(input.refreshToken);
    // Self-contained: refresh uses its own IV (GCM must not reuse IVs).
    refreshPacked = r ? `${r.iv}:${r.cipher}` : null;
  }
  return {
    provider: input.provider,
    encrypted_access_token: packed.cipher,
    encrypted_refresh_token: refreshPacked,
    iv: packed.iv,
    token_type: input.tokenType ?? "bearer",
    expires_at: input.expiresAt ?? null,
    meta: input.meta,
  };
}

/**
 * Prefer Supabase service-role upsert. If the key is missing or the write fails,
 * keep the encrypted token in an httpOnly cookie and flag needs_service_role.
 */
export async function saveTokens(
  clientId: string,
  tokens: Array<{
    provider: SocialProvider;
    accessToken: string;
    refreshToken?: string;
    tokenType?: string;
    expiresAt?: string | null;
    meta: TokenMeta;
  }>,
  res: NextResponse,
  req: Request,
): Promise<SaveOutcome> {
  let allDb = hasServiceRole();
  for (const t of tokens) {
    const row = encryptTokenInput(t);
    if (allDb) {
      const ok = await dbUpsert(clientId, row);
      if (!ok) allDb = false;
    }
    if (!allDb) applyTokenCookie(res, row, req);
  }
  return { persisted: allDb ? "db" : "cookie", needs_service_role: !allDb };
}

export async function loadDecrypted(
  clientId: string,
  provider: SocialProvider,
  cookies: CookieBag,
): Promise<DecryptedToken | null> {
  const fromDb = await dbLoad(clientId, provider);
  const row = fromDb ?? readCookieToken(cookies, provider);
  if (!row) return null;
  return decryptRow(row);
}

export async function statusForClient(
  clientId: string,
  cookies: CookieBag,
): Promise<{
  facebook: ProviderStatus;
  instagram: ProviderStatus;
  linkedin: ProviderStatus;
  needs_service_role: boolean;
}> {
  const dbRows = await dbLoadAll(clientId);
  const by = new Map<SocialProvider, StoredToken>();
  for (const r of dbRows) by.set(r.provider, r);
  for (const p of ["facebook", "instagram", "linkedin"] as const) {
    if (!by.has(p)) {
      const c = readCookieToken(cookies, p);
      if (c) by.set(p, c);
    }
  }
  return {
    facebook: statusOf(by.get("facebook") ?? null),
    instagram: statusOf(by.get("instagram") ?? null),
    linkedin: statusOf(by.get("linkedin") ?? null),
    needs_service_role: !hasServiceRole(),
  };
}

export async function deleteToken(
  clientId: string,
  provider: SocialProvider,
  res: NextResponse,
  req: Request,
): Promise<void> {
  if (hasServiceRole()) await dbDelete(clientId, provider);
  clearTokenCookie(res, provider, req);
}

export { hasServiceRole };
