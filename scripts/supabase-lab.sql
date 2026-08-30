-- Optional lab columns. The app also stores lab runs inside payload.lab so it
-- works without this migration. Run in the Supabase SQL editor if you want
-- feature_type filterable at the table level.
-- payload jsonb remains the generated_content dump (campaign pack or lab run).

alter table public.campaigns add column if not exists feature_type text;

create index if not exists campaigns_feature_type_idx on public.campaigns (feature_type);
create index if not exists campaigns_updated_at_idx on public.campaigns (updated_at desc);
