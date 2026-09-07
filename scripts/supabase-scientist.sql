-- SAWEK AD — Growth Scientist schema (owner-scoped).
-- Apply in the Supabase SQL editor AFTER scripts/supabase-campaigns.sql.
-- Until applied, the app stores a GrowthWorkspace JSON blob
-- (campaigns.feature_type = 'scientist' or localStorage sawek-scientist).

create table if not exists public.scientist_workspaces (
  id text primary key,
  owner_id uuid not null,
  client_id text,
  business_id text not null,
  payload jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists scientist_workspaces_owner_idx on public.scientist_workspaces (owner_id);
create index if not exists scientist_workspaces_business_idx on public.scientist_workspaces (owner_id, business_id);

alter table public.scientist_workspaces enable row level security;

drop policy if exists scientist_ws_select_own on public.scientist_workspaces;
drop policy if exists scientist_ws_insert_own on public.scientist_workspaces;
drop policy if exists scientist_ws_update_own on public.scientist_workspaces;
drop policy if exists scientist_ws_delete_own on public.scientist_workspaces;

create policy scientist_ws_select_own
  on public.scientist_workspaces for select to authenticated
  using (owner_id = auth.uid());

create policy scientist_ws_insert_own
  on public.scientist_workspaces for insert to authenticated
  with check (owner_id = auth.uid());

create policy scientist_ws_update_own
  on public.scientist_workspaces for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy scientist_ws_delete_own
  on public.scientist_workspaces for delete to authenticated
  using (owner_id = auth.uid());

-- Normalized evidence tables (optional; payload remains source of truth until backfill).
create table if not exists public.scientist_entities (
  id text primary key,
  owner_id uuid not null,
  workspace_id text not null,
  kind text not null,
  payload jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists scientist_entities_owner_idx on public.scientist_entities (owner_id, kind);
alter table public.scientist_entities enable row level security;

drop policy if exists scientist_ent_select_own on public.scientist_entities;
drop policy if exists scientist_ent_write_own on public.scientist_entities;
drop policy if exists scientist_ent_update_own on public.scientist_entities;
drop policy if exists scientist_ent_delete_own on public.scientist_entities;

create policy scientist_ent_select_own
  on public.scientist_entities for select to authenticated
  using (owner_id = auth.uid());

create policy scientist_ent_write_own
  on public.scientist_entities for insert to authenticated
  with check (owner_id = auth.uid());

create policy scientist_ent_update_own
  on public.scientist_entities for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy scientist_ent_delete_own
  on public.scientist_entities for delete to authenticated
  using (owner_id = auth.uid());
