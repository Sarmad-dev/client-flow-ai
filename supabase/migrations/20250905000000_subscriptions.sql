-- Create subscriptions table tied to auth.users
create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null check (plan in ('free','pro')) default 'free',
  is_active boolean not null default false,
  rc_entitlement text,
  rc_original_app_user_id text,
  rc_latest_expiration_at timestamptz,
  rc_platform text check (rc_platform in ('ios','android','web')),
  rc_product_identifier text,
  rc_period_type text,
  rc_is_sandbox boolean,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

comment on table public.subscriptions is 'User subscription state synchronized from RevenueCat';

-- Ensure updated_at is maintained
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_public_subscriptions_updated_at on public.subscriptions;
create trigger set_public_subscriptions_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at();

-- Enable RLS
alter table public.subscriptions enable row level security;

-- Policies: users can read/write only their own row
drop policy if exists subscriptions_select_own on public.subscriptions;
create policy subscriptions_select_own
  on public.subscriptions
  for select
  using (auth.uid() = user_id);

drop policy if exists subscriptions_insert_own on public.subscriptions;
create policy subscriptions_insert_own
  on public.subscriptions
  for insert
  with check (auth.uid() = user_id);

drop policy if exists subscriptions_update_own on public.subscriptions;
create policy subscriptions_update_own
  on public.subscriptions
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Helpful index for queries
create index if not exists idx_subscriptions_user_id on public.subscriptions(user_id);


