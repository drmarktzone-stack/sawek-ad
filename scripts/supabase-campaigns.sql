-- Optional campaigns table for browser upsert.
-- Matches lib/supabase.ts: { id, name, payload, updated_at, feature_type, owner_id, client_id }.
-- Campaign ids are app-generated strings (not necessarily UUIDs).
-- Apply this in the Supabase SQL editor. Until owner_id RLS is live, the app
-- still filters remote rows client-side and will not merge unsigned foreign packs.

create table if not exists public.campaigns (
  id text primary key,
  name text,
  payload jsonb,
  updated_at timestamptz default now()
);

alter table public.campaigns add column if not exists feature_type text;
alter table public.campaigns add column if not exists owner_id uuid;
alter table public.campaigns add column if not exists client_id text;

alter table public.campaigns enable row level security;

drop policy if exists "campaigns_select_anon_auth" on public.campaigns;
drop policy if exists "campaigns_insert_anon_auth" on public.campaigns;
drop policy if exists "campaigns_update_anon_auth" on public.campaigns;
drop policy if exists "campaigns_select_own" on public.campaigns;
drop policy if exists "campaigns_insert_own" on public.campaigns;
drop policy if exists "campaigns_update_own" on public.campaigns;
drop policy if exists "campaigns_select_by_id_anon" on public.campaigns;

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

-- Share-by-id landing: anon may read a single known id (no list UI in the app).
-- Dashboard listing uses owner/client filters and ignores unsigned rows.
create policy "campaigns_select_by_id_anon"
  on public.campaigns
  for select
  to anon
  using (true);
