-- Optional campaigns table for browser upsert via the anon key.
-- Matches lib/supabase.ts: { id, name, payload, updated_at }.
-- Campaign ids are app-generated strings (not necessarily UUIDs).
-- Do not use a service role; the Next.js client uses NEXT_PUBLIC_SUPABASE_ANON_KEY.

create table if not exists public.campaigns (
  id text primary key,
  name text,
  payload jsonb,
  updated_at timestamptz default now()
);

alter table public.campaigns enable row level security;

drop policy if exists "campaigns_select_anon_auth" on public.campaigns;
drop policy if exists "campaigns_insert_anon_auth" on public.campaigns;
drop policy if exists "campaigns_update_anon_auth" on public.campaigns;

-- App uses the anon key from the browser (no user auth required).
create policy "campaigns_select_anon_auth"
  on public.campaigns
  for select
  to anon, authenticated
  using (true);

create policy "campaigns_insert_anon_auth"
  on public.campaigns
  for insert
  to anon, authenticated
  with check (true);

create policy "campaigns_update_anon_auth"
  on public.campaigns
  for update
  to anon, authenticated
  using (true)
  with check (true);
