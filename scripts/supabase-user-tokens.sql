-- Encrypted OAuth tokens for Facebook / Instagram / LinkedIn.
-- Server (SUPABASE_SERVICE_ROLE_KEY) is the only process that reads/writes rows.
-- The browser anon key must never see this table. user_id stays NULL until real auth.

create extension if not exists pgcrypto;

create table if not exists public.user_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null,
  client_id text not null,
  provider text not null check (provider in ('facebook','instagram','linkedin')),
  encrypted_access_token text not null,
  encrypted_refresh_token text,
  iv text not null,
  token_type text,
  expires_at timestamptz,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, provider)
);

create index if not exists user_tokens_client_id_idx on public.user_tokens (client_id);

alter table public.user_tokens enable row level security;

-- Browser anon key must NEVER read/write tokens (encrypted or not).
drop policy if exists user_tokens_no_anon on public.user_tokens;
revoke all on public.user_tokens from anon, authenticated, public;

drop policy if exists user_tokens_self_select on public.user_tokens;
drop policy if exists user_tokens_self_insert on public.user_tokens;
drop policy if exists user_tokens_self_update on public.user_tokens;
drop policy if exists user_tokens_self_delete on public.user_tokens;

-- Authenticated users (future login) may only touch their own rows.
-- GRANT is required after REVOKE so RLS policies can fire.
grant select, insert, update, delete on public.user_tokens to authenticated;

create policy user_tokens_self_select on public.user_tokens
  for select to authenticated
  using (user_id is not null and user_id = auth.uid());
create policy user_tokens_self_insert on public.user_tokens
  for insert to authenticated
  with check (user_id is not null and user_id = auth.uid());
create policy user_tokens_self_update on public.user_tokens
  for update to authenticated
  using (user_id is not null and user_id = auth.uid())
  with check (user_id is not null and user_id = auth.uid());
create policy user_tokens_self_delete on public.user_tokens
  for delete to authenticated
  using (user_id is not null and user_id = auth.uid());
