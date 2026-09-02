-- SAWEK AD auth + billing tables.
-- Run in the Supabase SQL editor for project dmtxnrljtlriztaugwwh.
-- Do NOT put a service role key in git. The Stripe webhook uses
-- SUPABASE_SERVICE_ROLE_KEY from Cloud Run env only (optional; owners
-- can also confirm bank/Bit payments while logged in).

-- Profiles: one row per auth.users. plan is 'free' or 'pro'.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  billing_interval text check (billing_interval is null or billing_interval in ('monthly', 'yearly', 'bank', 'bit', 'paypal')),
  stripe_customer_id text,
  stripe_subscription_id text,
  bank_marked_paid_at timestamptz,
  bank_confirmed_at timestamptz,
  bit_marked_paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_email_idx on public.profiles (email);
create index if not exists profiles_plan_idx on public.profiles (plan);

alter table public.profiles enable row level security;

drop policy if exists profiles_self_select on public.profiles;
drop policy if exists profiles_self_insert on public.profiles;
drop policy if exists profiles_self_update on public.profiles;
drop policy if exists profiles_owner_select on public.profiles;
drop policy if exists profiles_owner_update on public.profiles;

grant select, insert, update on public.profiles to authenticated;

create policy profiles_self_select on public.profiles
  for select to authenticated
  using (id = auth.uid());

create policy profiles_self_insert on public.profiles
  for insert to authenticated
  with check (id = auth.uid());

-- Users may mark bank/Bit "I paid". They must not set plan=pro themselves.
create policy profiles_self_update on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and plan = (select p.plan from public.profiles p where p.id = auth.uid())
  );

-- Product owners can see/confirm every profile (bank/Bit flag).
create policy profiles_owner_select on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or lower(coalesce(auth.jwt()->>'email', '')) in (
      'drmarktzone@gmail.com',
      'drbrawlluxegame@gmail.com'
    )
  );

create policy profiles_owner_update on public.profiles
  for update to authenticated
  using (
    lower(coalesce(auth.jwt()->>'email', '')) in (
      'drmarktzone@gmail.com',
      'drbrawlluxegame@gmail.com'
    )
  )
  with check (
    lower(coalesce(auth.jwt()->>'email', '')) in (
      'drmarktzone@gmail.com',
      'drbrawlluxegame@gmail.com'
    )
  );

-- Optional subscription audit (Stripe webhook writes via service role).
create table if not exists public.subscriptions (
  id text primary key,
  user_id uuid references auth.users (id) on delete set null,
  email text,
  plan text not null default 'pro',
  interval text,
  status text,
  provider text not null default 'stripe',
  raw jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;
revoke all on public.subscriptions from anon, public;
grant select on public.subscriptions to authenticated;

drop policy if exists subscriptions_self_select on public.subscriptions;
create policy subscriptions_self_select on public.subscriptions
  for select to authenticated
  using (user_id = auth.uid());

-- New auth users get a profile. Owner emails are always Pro.
create or replace function public.sawek_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  email_l text := lower(coalesce(new.email, ''));
  initial_plan text := 'free';
begin
  if email_l in ('drmarktzone@gmail.com', 'drbrawlluxegame@gmail.com') then
    initial_plan := 'pro';
  end if;
  insert into public.profiles (id, email, plan)
  values (new.id, new.email, initial_plan)
  on conflict (id) do update
    set email = excluded.email,
        plan = case
          when email_l in ('drmarktzone@gmail.com', 'drbrawlluxegame@gmail.com') then 'pro'
          else public.profiles.plan
        end,
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists sawek_on_auth_user_created on auth.users;
create trigger sawek_on_auth_user_created
  after insert on auth.users
  for each row execute function public.sawek_handle_new_user();

-- Optional: tie campaigns to a user (app still works with the older open RLS).
alter table public.campaigns add column if not exists user_id uuid references auth.users (id) on delete set null;
