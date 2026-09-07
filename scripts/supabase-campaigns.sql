-- SAWEK AD campaigns — owner isolation.
-- Apply in the Supabase SQL editor. This agent cannot apply it to live Supabase.
-- Until applied, the app uses cookie-session server APIs and never lists unsigned foreign rows.
--
-- Matches lib/supabase.ts + lib/campaign-server.ts:
--   { id, name, payload, updated_at, feature_type, owner_id, client_id, share_enabled }

create table if not exists public.campaigns (
  id text primary key,
  name text,
  payload jsonb,
  updated_at timestamptz default now()
);

alter table public.campaigns add column if not exists feature_type text;
alter table public.campaigns add column if not exists owner_id uuid;
alter table public.campaigns add column if not exists client_id text;
alter table public.campaigns add column if not exists share_enabled boolean default false;

create index if not exists campaigns_owner_id_idx on public.campaigns (owner_id);
create index if not exists campaigns_client_id_idx on public.campaigns (client_id);

alter table public.campaigns enable row level security;

drop policy if exists "campaigns_select_anon_auth" on public.campaigns;
drop policy if exists "campaigns_insert_anon_auth" on public.campaigns;
drop policy if exists "campaigns_update_anon_auth" on public.campaigns;
drop policy if exists "campaigns_select_own" on public.campaigns;
drop policy if exists "campaigns_insert_own" on public.campaigns;
drop policy if exists "campaigns_update_own" on public.campaigns;
drop policy if exists "campaigns_delete_own" on public.campaigns;
drop policy if exists "campaigns_select_by_id_anon" on public.campaigns;
drop policy if exists "campaigns_select_shared_anon" on public.campaigns;

-- Authenticated users only see / write their own rows.
create policy "campaigns_select_own"
  on public.campaigns
  for select
  to authenticated
  using (owner_id = auth.uid());

create policy "campaigns_insert_own"
  on public.campaigns
  for insert
  to authenticated
  with check (owner_id = auth.uid());

create policy "campaigns_update_own"
  on public.campaigns
  for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "campaigns_delete_own"
  on public.campaigns
  for delete
  to authenticated
  using (owner_id = auth.uid());

-- Public landing: anon may read ONLY rows the owner marked share_enabled.
-- Never `using (true)` — that leaked every campaign to the anon key.
create policy "campaigns_select_shared_anon"
  on public.campaigns
  for select
  to anon
  using (share_enabled = true);

-- Service role (server cookie APIs) bypasses RLS. App still filters by owner_id.
