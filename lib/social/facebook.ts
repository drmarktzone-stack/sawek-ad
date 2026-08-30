import { FB_GRAPH, facebookAppId, facebookAppSecret } from "./config";
import { fetchJson, graphError } from "./http";
import { putTmpImage } from "./tmp-media";
import type { TokenMeta } from "./types";

export type FacebookExchange = {
  facebook?: {
    accessToken: string;
    expiresAt?: string;
    tokenType?: string;
    meta: TokenMeta;
  };
  instagram?: {
    accessToken: string;
    expiresAt?: string;
    tokenType?: string;
    meta: TokenMeta;
  };
  grantedScopes: string[];
  error?: string;
};

function expiresIso(seconds: unknown): string | undefined {
  const n = typeof seconds === "number" ? seconds : Number(seconds);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return new Date(Date.now() + n * 1000).toISOString();
}

async function graphGet(path: string, token: string, params: Record<string, string> = {}) {
  const u = new URL(`${FB_GRAPH}${path.startsWith("/") ? path : `/${path}`}`);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  u.searchParams.set("access_token", token);
  return fetchJson(u.toString());
}

export async function exchangeFacebookCode(code: string, redirectUri: string): Promise<FacebookExchange> {
  const shortUrl = new URL(`${FB_GRAPH}/oauth/access_token`);
  shortUrl.searchParams.set("client_id", facebookAppId());
  shortUrl.searchParams.set("client_secret", facebookAppSecret());
  shortUrl.searchParams.set("redirect_uri", redirectUri);
  shortUrl.searchParams.set("code", code);
  const short = await fetchJson(shortUrl.toString());
  const shortToken = typeof short.data.access_token === "string" ? short.data.access_token : "";
  if (!shortToken) return { grantedScopes: [], error: graphError(short.data, "token_exchange_failed") };

  const longUrl = new URL(`${FB_GRAPH}/oauth/access_token`);
  longUrl.searchParams.set("grant_type", "fb_exchange_token");
  longUrl.searchParams.set("client_id", facebookAppId());
  longUrl.searchParams.set("client_secret", facebookAppSecret());
  longUrl.searchParams.set("fb_exchange_token", shortToken);
  const longRes = await fetchJson(longUrl.toString());
  const userToken = typeof longRes.data.access_token === "string" ? longRes.data.access_token : shortToken;
  const expiresAt = expiresIso(longRes.data.expires_in ?? short.data.expires_in);
  const tokenType = typeof longRes.data.token_type === "string" ? longRes.data.token_type : "bearer";

  const perm = await graphGet("/me/permissions", userToken);
  const grantedScopes: string[] = [];
  const pdata = perm.data.data;
  if (Array.isArray(pdata)) {
    for (const row of pdata) {
      if (row && typeof row === "object") {
        const r = row as { permission?: unknown; status?: unknown };
        if (r.status === "granted" && typeof r.permission === "string") grantedScopes.push(r.permission);
      }
    }
  }

  const accounts = await graphGet("/me/accounts", userToken, {
    fields: "id,name,access_token,instagram_business_account{id,username}",
  });
  const list = Array.isArray(accounts.data.data) ? accounts.data.data : [];
  type Page = { id?: string; name?: string; access_token?: string; instagram_business_account?: { id?: string; username?: string } };
  const pages = list.filter((x): x is Page => Boolean(x && typeof x === "object")) as Page[];
  const page = pages.find((p) => p.access_token && p.id) ?? pages[0];

  if (!page?.id || !page.access_token) {
    return {
      grantedScopes,
      facebook: {
        accessToken: userToken,
        expiresAt,
        tokenType,
        meta: { grantedScopes, missingPage: true },
      },
      error: "no_page",
    };
  }

  let igUserId: string | undefined;
  let igUsername: string | undefined;
  const igLinked = page.instagram_business_account;
  if (igLinked && typeof igLinked.id === "string") {
    igUserId = igLinked.id;
    igUsername = igLinked.username;
  } else {
    const pageInfo = await graphGet(`/${page.id}`, page.access_token, {
      fields: "instagram_business_account{id,username}",
    });
    const iba = pageInfo.data.instagram_business_account;
    if (iba && typeof iba === "object") {
      const o = iba as { id?: unknown; username?: unknown };
      if (typeof o.id === "string") igUserId = o.id;
      if (typeof o.username === "string") igUsername = o.username;
    }
  }

  const pageMeta: TokenMeta = {
    pageId: page.id,
    pageName: page.name,
    grantedScopes,
    ...(igUserId ? { igUserId } : {}),
    ...(igUsername ? { igUsername } : {}),
  };

  const out: FacebookExchange = {
    grantedScopes,
    facebook: {
      accessToken: page.access_token,
      expiresAt,
      tokenType,
      meta: pageMeta,
    },
  };
  if (igUserId) {
    out.instagram = {
      accessToken: page.access_token,
      expiresAt,
      tokenType,
      meta: { ...pageMeta, igUserId },
    };
  }
  return out;
}

export async function publishFacebookPage(opts: {
  pageId: string;
  pageToken: string;
  message: string;
  imageUrl?: string;
  imageBytes?: Buffer;
  imageMime?: string;
}): Promise<{ ok: true; postId: string; permalink?: string } | { ok: false; error: string }> {
  const { pageId, pageToken, message } = opts;
  if (opts.imageBytes && opts.imageBytes.length) {
    const form = new FormData();
    form.set("caption", message);
    form.set("access_token", pageToken);
    const blob = new Blob([new Uint8Array(opts.imageBytes)], { type: opts.imageMime || "image/jpeg" });
    form.set("source", blob, "image.jpg");
    const res = await fetchJson(`${FB_GRAPH}/${pageId}/photos`, { method: "POST", body: form });
    if (!res.ok) return { ok: false, error: graphError(res.data, "facebook_photo_failed") };
    const postId = String(res.data.post_id ?? res.data.id ?? "");
    const permalink = await facebookPermalink(postId, pageToken);
    return { ok: true, postId, permalink };
  }
  if (opts.imageUrl && /^https?:\/\//i.test(opts.imageUrl)) {
    const body = new URLSearchParams({
      url: opts.imageUrl,
      caption: message,
      access_token: pageToken,
    });
    const res = await fetchJson(`${FB_GRAPH}/${pageId}/photos`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok) return { ok: false, error: graphError(res.data, "facebook_photo_failed") };
    const postId = String(res.data.post_id ?? res.data.id ?? "");
    const permalink = await facebookPermalink(postId, pageToken);
    return { ok: true, postId, permalink };
  }
  const body = new URLSearchParams({ message, access_token: pageToken });
  const res = await fetchJson(`${FB_GRAPH}/${pageId}/feed`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) return { ok: false, error: graphError(res.data, "facebook_feed_failed") };
  const postId = String(res.data.id ?? "");
  const permalink = await facebookPermalink(postId, pageToken);
  return { ok: true, postId, permalink };
}

async function facebookPermalink(id: string, token: string): Promise<string | undefined> {
  if (!id) return undefined;
  const res = await graphGet(`/${id}`, token, { fields: "permalink_url,link" });
  if (typeof res.data.permalink_url === "string") return res.data.permalink_url;
  if (typeof res.data.link === "string") return res.data.link;
  return undefined;
}

/** Host bytes as an unpublished Page photo and return a CDN URL Instagram can fetch. */
export async function unpublishedPageImageUrl(
  pageId: string,
  pageToken: string,
  imageBytes: Buffer,
  imageMime?: string,
): Promise<string | undefined> {
  const form = new FormData();
  form.set("published", "false");
  form.set("access_token", pageToken);
  const blob = new Blob([new Uint8Array(imageBytes)], { type: imageMime || "image/jpeg" });
  form.set("source", blob, "image.jpg");
  const res = await fetchJson(`${FB_GRAPH}/${pageId}/photos`, { method: "POST", body: form });
  const photoId = typeof res.data.id === "string" ? res.data.id : "";
  if (!photoId) return undefined;
  const info = await graphGet(`/${photoId}`, pageToken, { fields: "images" });
  const images = info.data.images;
  if (Array.isArray(images) && images[0] && typeof images[0] === "object") {
    const src = (images[0] as { source?: unknown }).source;
    if (typeof src === "string" && /^https?:\/\//i.test(src)) return src;
  }
  return undefined;
}

export async function publicizeBytes(baseUrl: string, bytes: Buffer, mime: string): Promise<string> {
  const id = putTmpImage(bytes, mime);
  return `${baseUrl.replace(/\/$/, "")}/api/social/tmp-image/${id}`;
}

export async function publishInstagram(opts: {
  igUserId: string;
  pageToken: string;
  message: string;
  imageUrl?: string;
  imageBytes?: Buffer;
  imageMime?: string;
  pageId?: string;
  baseUrl?: string;
}): Promise<{ ok: true; postId: string; permalink?: string } | { ok: false; error: string }> {
  if (!opts.message) {
    /* caption can be empty on IG but we still require campaign text at the route layer */
  }
  let imageUrl = opts.imageUrl && /^https?:\/\//i.test(opts.imageUrl) && !opts.imageUrl.startsWith("data:")
    ? opts.imageUrl
    : undefined;

  if (!imageUrl && opts.imageBytes && opts.pageId) {
    imageUrl = await unpublishedPageImageUrl(opts.pageId, opts.pageToken, opts.imageBytes, opts.imageMime);
  }
  if (!imageUrl && opts.imageBytes && opts.baseUrl) {
    imageUrl = await publicizeBytes(opts.baseUrl, opts.imageBytes, opts.imageMime || "image/jpeg");
  }
  if (!imageUrl) return { ok: false, error: "instagram_needs_image" };

  const createBody = new URLSearchParams({
    image_url: imageUrl,
    caption: opts.message,
    access_token: opts.pageToken,
  });
  const created = await fetchJson(`${FB_GRAPH}/${opts.igUserId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: createBody,
  });
  const creationId = typeof created.data.id === "string" ? created.data.id : "";
  if (!creationId) return { ok: false, error: graphError(created.data, "instagram_container_failed") };

  for (let i = 0; i < 8; i++) {
    const st = await graphGet(`/${creationId}`, opts.pageToken, { fields: "status_code,status" });
    const code = String(st.data.status_code ?? "");
    if (code === "FINISHED" || code === "PUBLISHED") break;
    if (code === "ERROR" || code === "EXPIRED") {
      return { ok: false, error: graphError(st.data, "instagram_container_error") };
    }
    await new Promise((r) => setTimeout(r, 1500));
  }

  const pub = await fetchJson(`${FB_GRAPH}/${opts.igUserId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ creation_id: creationId, access_token: opts.pageToken }),
  });
  const mediaId = typeof pub.data.id === "string" ? pub.data.id : "";
  if (!mediaId) return { ok: false, error: graphError(pub.data, "instagram_publish_failed") };
  const permalink = await facebookPermalink(mediaId, opts.pageToken);
  return { ok: true, postId: mediaId, permalink };
}
