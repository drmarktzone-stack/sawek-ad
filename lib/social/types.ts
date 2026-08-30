export const SOCIAL_PROVIDERS = ["facebook", "instagram", "linkedin"] as const;
export type SocialProvider = (typeof SOCIAL_PROVIDERS)[number];

export function isSocialProvider(v: unknown): v is SocialProvider {
  return typeof v === "string" && (SOCIAL_PROVIDERS as readonly string[]).includes(v);
}

export type TokenMeta = {
  pageId?: string;
  pageName?: string;
  igUserId?: string;
  personUrn?: string;
  grantedScopes?: string[];
  missingPage?: boolean;
  [k: string]: unknown;
};

export type StoredToken = {
  provider: SocialProvider;
  encrypted_access_token: string;
  encrypted_refresh_token?: string | null;
  iv: string;
  token_type?: string | null;
  expires_at?: string | null;
  meta: TokenMeta;
};

export type DecryptedToken = {
  provider: SocialProvider;
  accessToken: string;
  refreshToken?: string;
  tokenType?: string;
  expiresAt?: string;
  meta: TokenMeta;
};

export type ProviderStatus = {
  connected: boolean;
  expiresAt?: string | null;
  pageName?: string;
};

export type SocialStatusResponse = {
  facebook: ProviderStatus;
  instagram: ProviderStatus;
  linkedin: ProviderStatus;
  configured: { facebook: boolean; linkedin: boolean };
  needs_service_role: boolean;
};

export type PublishResult = {
  platform: SocialProvider;
  ok: boolean;
  postId?: string;
  permalink?: string;
  error?: string;
};
