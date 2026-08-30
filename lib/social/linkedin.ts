import {
  LI_API,
  LI_TOKEN,
  LI_USERINFO,
  LI_VERSION,
  linkedinClientId,
  linkedinClientSecret,
} from "./config";
import { fetchJson, graphError, redact } from "./http";
import type { TokenMeta } from "./types";

export type LinkedInExchange = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
  tokenType?: string;
  meta: TokenMeta;
  error?: string;
};

function expiresIso(seconds: unknown): string | undefined {
  const n = typeof seconds === "number" ? seconds : Number(seconds);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return new Date(Date.now() + n * 1000).toISOString();
}

export async function exchangeLinkedInCode(code: string, redirectUri: string): Promise<LinkedInExchange> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: linkedinClientId(),
    client_secret: linkedinClientSecret(),
  });
  const tok = await fetchJson(LI_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const accessToken = typeof tok.data.access_token === "string" ? tok.data.access_token : "";
  if (!accessToken) return { accessToken: "", meta: {}, error: graphError(tok.data, "token_exchange_failed") };
  const refreshToken = typeof tok.data.refresh_token === "string" ? tok.data.refresh_token : undefined;
  const expiresAt = expiresIso(tok.data.expires_in);
  const tokenType = typeof tok.data.token_type === "string" ? tok.data.token_type : "Bearer";

  const info = await fetchJson(LI_USERINFO, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const sub = typeof info.data.sub === "string" ? info.data.sub : "";
  let personUrn = sub ? (sub.startsWith("urn:") ? sub : `urn:li:person:${sub}`) : "";
  if (!personUrn) {
    const me = await fetchJson("https://api.linkedin.com/v2/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "X-Restli-Protocol-Version": "2.0.0",
      },
    });
    const id = typeof me.data.id === "string" ? me.data.id : "";
    if (id) personUrn = `urn:li:person:${id}`;
  }
  if (!personUrn) {
    return { accessToken, refreshToken, expiresAt, tokenType, meta: {}, error: "no_person" };
  }
  const name = typeof info.data.name === "string" ? info.data.name : undefined;
  return {
    accessToken,
    refreshToken,
    expiresAt,
    tokenType,
    meta: { personUrn, ...(name ? { pageName: name } : {}) },
  };
}

async function linkedinJson(path: string, token: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("LinkedIn-Version", LI_VERSION);
  headers.set("X-Restli-Protocol-Version", "2.0.0");
  if (!headers.has("Content-Type") && init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  return fetchJson(path.startsWith("http") ? path : `${LI_API}${path}`, { ...init, headers });
}

export async function publishLinkedIn(opts: {
  accessToken: string;
  personUrn: string;
  message: string;
  imageBytes?: Buffer;
  imageMime?: string;
}): Promise<{ ok: true; postId: string; permalink?: string } | { ok: false; error: string }> {
  let imageUrn: string | undefined;
  if (opts.imageBytes && opts.imageBytes.length) {
    const init = await linkedinJson(`${LI_API}/images?action=initializeUpload`, opts.accessToken, {
      method: "POST",
      body: JSON.stringify({ initializeUploadRequest: { owner: opts.personUrn } }),
    });
    const value = init.data.value && typeof init.data.value === "object" ? (init.data.value as Record<string, unknown>) : init.data;
    const uploadUrl = typeof value.uploadUrl === "string" ? value.uploadUrl : "";
    const image = typeof value.image === "string" ? value.image : "";
    if (!uploadUrl || !image) return { ok: false, error: graphError(init.data, "linkedin_image_init_failed") };
    const put = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${opts.accessToken}`,
        "Content-Type": opts.imageMime || "application/octet-stream",
        "LinkedIn-Version": LI_VERSION,
      },
      body: new Uint8Array(opts.imageBytes),
    });
    if (!put.ok) {
      const t = redact((await put.text()).slice(0, 200));
      return { ok: false, error: t || "linkedin_image_upload_failed" };
    }
    imageUrn = image;
  }

  const post: Record<string, unknown> = {
    author: opts.personUrn,
    commentary: opts.message,
    visibility: "PUBLIC",
    distribution: {
      feedDistribution: "MAIN_FEED",
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState: "PUBLISHED",
    isReshareDisabledByAuthor: false,
  };
  if (imageUrn) {
    post.content = { media: { id: imageUrn } };
  }

  const created = await linkedinJson(`${LI_API}/posts`, opts.accessToken, {
    method: "POST",
    body: JSON.stringify(post),
  });
  if (!created.ok) return { ok: false, error: graphError(created.data, "linkedin_post_failed") };
  const id =
    (typeof created.data.id === "string" && created.data.id) ||
    (typeof created.data.urn === "string" && created.data.urn) ||
    "";
  const permalink = id
    ? `https://www.linkedin.com/feed/update/${encodeURIComponent(id)}/`
    : undefined;
  return { ok: true, postId: id || "ok", permalink };
}
