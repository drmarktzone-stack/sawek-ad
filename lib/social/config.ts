export function facebookConfigured(): boolean {
  return Boolean(
    String(process.env.FACEBOOK_APP_ID ?? "").trim() &&
      String(process.env.FACEBOOK_APP_SECRET ?? "").trim(),
  );
}

export function linkedinConfigured(): boolean {
  return Boolean(
    String(process.env.LINKEDIN_CLIENT_ID ?? "").trim() &&
      String(process.env.LINKEDIN_CLIENT_SECRET ?? "").trim(),
  );
}

export function facebookAppId(): string {
  return String(process.env.FACEBOOK_APP_ID ?? "").trim();
}

export function facebookAppSecret(): string {
  return String(process.env.FACEBOOK_APP_SECRET ?? "").trim();
}

export function linkedinClientId(): string {
  return String(process.env.LINKEDIN_CLIENT_ID ?? "").trim();
}

export function linkedinClientSecret(): string {
  return String(process.env.LINKEDIN_CLIENT_SECRET ?? "").trim();
}

export function supabaseUrl(): string {
  return String(
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  ).trim();
}

export function serviceRoleKey(): string {
  return String(process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
}

export function hasServiceRole(): boolean {
  return Boolean(supabaseUrl() && serviceRoleKey());
}

export function appBaseUrl(req: Request): string {
  const env = String(process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_BASE_URL ?? "")
    .trim()
    .replace(/\/$/, "");
  if (env) return env;
  const url = new URL(req.url);
  const proto = (req.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "")).split(",")[0]!.trim();
  const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? url.host)
    .split(",")[0]!
    .trim();
  return `${proto}://${host}`;
}

export function sanitizeClientId(raw: unknown): string {
  const s = String(raw ?? "").trim();
  if (!s || s.length > 80) return "";
  if (!/^[A-Za-z0-9._:-]+$/.test(s)) return "";
  return s;
}

export const FB_GRAPH = "https://graph.facebook.com/v21.0";
export const FB_DIALOG = "https://www.facebook.com/v21.0/dialog/oauth";
export const FB_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
  "instagram_basic",
  "instagram_content_publish",
  "business_management",
].join(",");

export const LI_AUTH = "https://www.linkedin.com/oauth/v2/authorization";
export const LI_TOKEN = "https://www.linkedin.com/oauth/v2/accessToken";
export const LI_USERINFO = "https://api.linkedin.com/v2/userinfo";
export const LI_SCOPES = "openid profile w_member_social";
export const LI_VERSION = "202411";
export const LI_API = "https://api.linkedin.com/rest";

export const CLIENT_COOKIE = "sawek_client_id";
export const STATE_COOKIE = "sawek_oauth_state";
export const TOKEN_COOKIE_PREFIX = "sawek_tok_";
