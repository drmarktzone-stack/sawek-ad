import { createClient, type Session, type User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { runtimeEnv } from "./runtime-env";
import { isOwnerEmail, resolvePlan, type PlanId } from "./plan";

export const ACCESS_COOKIE = "sawek-sb-access";
export const REFRESH_COOKIE = "sawek-sb-refresh";

export type AuthSession = {
  user: { id: string; email: string };
  plan: PlanId;
  profile: ProfileRow | null;
};

export type ProfileRow = {
  id: string;
  email: string | null;
  plan: string | null;
  billing_interval: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  bank_marked_paid_at: string | null;
  bank_confirmed_at: string | null;
  bit_marked_paid_at: string | null;
};

export function supabaseAnonCreds(): { url: string; key: string } | null {
  const url = runtimeEnv("NEXT_PUBLIC_SUPABASE_URL") || runtimeEnv("SUPABASE_URL");
  const key = runtimeEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!url || !key) return null;
  return { url, key };
}

export function supabaseServiceKey(): string {
  return runtimeEnv("SUPABASE_SERVICE_ROLE_KEY");
}

export function supabaseAnonClient() {
  const creds = supabaseAnonCreds();
  if (!creds) return null;
  return createClient(creds.url, creds.key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export function supabaseServiceClient() {
  const creds = supabaseAnonCreds();
  const service = supabaseServiceKey();
  if (!creds || !service) return null;
  return createClient(creds.url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function parseCookieHeader(header: string, name: string): string {
  const parts = header.split(/;\s*/);
  for (const p of parts) {
    const eq = p.indexOf("=");
    if (eq < 0) continue;
    if (p.slice(0, eq).trim() === name) {
      try {
        return decodeURIComponent(p.slice(eq + 1));
      } catch {
        return p.slice(eq + 1);
      }
    }
  }
  return "";
}

export function readAuthCookies(req: Request): { access: string; refresh: string } {
  const header = req.headers.get("cookie") ?? "";
  return {
    access: parseCookieHeader(header, ACCESS_COOKIE),
    refresh: parseCookieHeader(header, REFRESH_COOKIE),
  };
}

function cookieSecure(req: Request): boolean {
  const proto = (req.headers.get("x-forwarded-proto") ?? "").split(",")[0]?.trim();
  return proto === "https" || runtimeEnv("NODE_ENV") === "production";
}

export function applyAuthCookies(
  res: NextResponse,
  req: Request,
  tokens: { access: string; refresh: string } | null,
): NextResponse {
  const secure = cookieSecure(req);
  const base = { httpOnly: true, sameSite: "lax" as const, path: "/", secure };
  if (!tokens) {
    res.cookies.set(ACCESS_COOKIE, "", { ...base, maxAge: 0 });
    res.cookies.set(REFRESH_COOKIE, "", { ...base, maxAge: 0 });
    return res;
  }
  res.cookies.set(ACCESS_COOKIE, tokens.access, { ...base, maxAge: 60 * 60 });
  res.cookies.set(REFRESH_COOKIE, tokens.refresh, { ...base, maxAge: 60 * 60 * 24 * 30 });
  return res;
}

function userEmail(user: User | null): string {
  return String(user?.email ?? user?.user_metadata?.email ?? "").trim();
}

async function loadProfile(userId: string): Promise<ProfileRow | null> {
  const sb = supabaseServiceClient() ?? supabaseAnonClient();
  if (!sb) return null;
  try {
    const { data, error } = await sb.from("profiles").select("*").eq("id", userId).maybeSingle();
    if (error || !data) return null;
    return data as ProfileRow;
  } catch {
    return null;
  }
}

export async function ensureProfile(user: User): Promise<ProfileRow | null> {
  const email = userEmail(user);
  const plan = isOwnerEmail(email) ? "pro" : "free";
  const row = {
    id: user.id,
    email: email || null,
    plan,
    updated_at: new Date().toISOString(),
  };
  const service = supabaseServiceClient();
  if (service) {
    try {
      const existing = await service.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (existing.data) {
        const patch: Record<string, unknown> = { email: email || existing.data.email, updated_at: row.updated_at };
        if (isOwnerEmail(email) && existing.data.plan !== "pro") patch.plan = "pro";
        await service.from("profiles").update(patch).eq("id", user.id);
        return { ...(existing.data as ProfileRow), ...(patch as object) } as ProfileRow;
      }
      await service.from("profiles").insert(row);
      return { ...row, billing_interval: null, stripe_customer_id: null, stripe_subscription_id: null, bank_marked_paid_at: null, bank_confirmed_at: null, bit_marked_paid_at: null };
    } catch {
      return null;
    }
  }
  const anon = supabaseAnonClient();
  if (!anon) return null;
  try {
    const { data } = await anon.from("profiles").select("*").eq("id", user.id).maybeSingle();
    if (data) return data as ProfileRow;
    await anon.from("profiles").insert(row);
    return { ...row, billing_interval: null, stripe_customer_id: null, stripe_subscription_id: null, bank_marked_paid_at: null, bank_confirmed_at: null, bit_marked_paid_at: null };
  } catch {
    return null;
  }
}

export async function markProfilePro(opts: {
  userId?: string;
  email?: string;
  interval?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}): Promise<boolean> {
  const service = supabaseServiceClient();
  if (!service) return false;
  try {
    const patch: Record<string, unknown> = {
      plan: "pro",
      updated_at: new Date().toISOString(),
    };
    if (opts.interval) patch.billing_interval = opts.interval;
    if (opts.stripeCustomerId) patch.stripe_customer_id = opts.stripeCustomerId;
    if (opts.stripeSubscriptionId) patch.stripe_subscription_id = opts.stripeSubscriptionId;
    if (opts.userId) {
      const { error } = await service.from("profiles").update(patch).eq("id", opts.userId);
      if (!error) return true;
    }
    if (opts.email) {
      const { error } = await service.from("profiles").update(patch).eq("email", opts.email.toLowerCase());
      return !error;
    }
    return false;
  } catch {
    return false;
  }
}

export async function sessionFromRequest(req: Request): Promise<{
  session: AuthSession | null;
  tokens: { access: string; refresh: string } | null;
  refreshed: boolean;
}> {
  const creds = supabaseAnonCreds();
  if (!creds) return { session: null, tokens: null, refreshed: false };
  const cookies = readAuthCookies(req);
  if (!cookies.access && !cookies.refresh) return { session: null, tokens: null, refreshed: false };
  const sb = createClient(creds.url, creds.key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  let access = cookies.access;
  let refresh = cookies.refresh;
  let refreshed = false;
  let user: User | null = null;

  if (access) {
    const got = await sb.auth.getUser(access);
    if (got.data.user) user = got.data.user;
  }
  if (!user && refresh) {
    const next = await sb.auth.refreshSession({ refresh_token: refresh });
    if (next.data.session?.access_token && next.data.user) {
      user = next.data.user;
      access = next.data.session.access_token;
      refresh = next.data.session.refresh_token ?? refresh;
      refreshed = true;
    }
  }
  if (!user) return { session: null, tokens: null, refreshed: false };

  const email = userEmail(user);
  let profile = await loadProfile(user.id);
  if (!profile) profile = await ensureProfile(user);
  const plan = resolvePlan({
    email,
    profilePlan: profile?.plan,
    bankConfirmed: Boolean(profile?.bank_confirmed_at),
  });
  return {
    session: {
      user: { id: user.id, email },
      plan,
      profile,
    },
    tokens: access && refresh ? { access, refresh } : null,
    refreshed,
  };
}

export async function planFromRequest(req: Request): Promise<PlanId> {
  const { session } = await sessionFromRequest(req);
  return session?.plan ?? "free";
}

export function tokensFromSupabaseSession(s: Session | null): { access: string; refresh: string } | null {
  if (!s?.access_token || !s.refresh_token) return null;
  return { access: s.access_token, refresh: s.refresh_token };
}

export function publicAppBase(req: Request): string {
  const env = (runtimeEnv("APP_BASE_URL") || runtimeEnv("NEXT_PUBLIC_APP_BASE_URL")).replace(/\/$/, "");
  if (env) return env;
  const url = new URL(req.url);
  const proto = (req.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "")).split(",")[0]!.trim();
  const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? url.host).split(",")[0]!.trim();
  return `${proto}://${host}`;
}
