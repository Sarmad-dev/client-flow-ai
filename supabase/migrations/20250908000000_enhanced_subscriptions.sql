-- Enhanced subscriptions table with comprehensive fields
create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  
  -- Subscription details
  plan text not null check (plan in ('free','basic','pro','enterprise')) default 'free',
  status text not null check (status in ('active','expired','cancelled','trial','grace_period')) default 'active',
  is_active boolean not null default false,
  billing_period text check (billing_period in ('monthly','yearly')),
  
  -- Dates
  expires_at timestamptz,
  trial_ends_at timestamptz,
  cancelled_at timestamptz,
  will_renew boolean default false,
  
  -- RevenueCat integration fields
  rc_entitlement text,
  rc_original_app_user_id text,
  rc_latest_expiration_at timestamptz,
  rc_platform text check (rc_platform in ('ios','android','web')),
  rc_product_identifier text,
  rc_period_type text,
  rc_is_sandbox boolean,
  
  -- Metadata
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

comment on table public.subscriptions is 'Enhanced user subscription state synchronized from RevenueCat';

-- Subscription usage events tracking
create table if not exists public.subscription_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('lead_created','client_created','task_created','email_sent','storage_used')),
  metadata jsonb,
  created_at timestamptz not null default now()
);

comment on table public.subscription_usage_events is 'Track subscription usage events for analytics';

-- Subscription change history
create table if not exists public.subscription_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  from_plan text not null,
  to_plan text not null,
  change_type text not null check (change_type in ('upgrade','downgrade','renewal','cancellation','trial_start','trial_end')),
  effective_date timestamptz not null default now(),
  metadata jsonb,
  created_at timestamptz not null default now()
);

comment on table public.subscription_history is 'Track subscription plan changes over time';

-- Promotional codes
create table if not exists public.subscription_promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  discount_type text not null check (discount_type in ('percentage','fixed_amount','trial_extension')),
  discount_value numeric not null,
  applicable_plans text[] not null,
  max_uses integer,
  current_uses integer default 0,
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  is_active boolean default true,
  created_at timestamptz not null default now()
);

comment on table public.subscription_promo_codes is 'Promotional codes for subscription discounts';

-- User promo code redemptions
create table if not exists public.subscription_promo_redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  promo_code_id uuid not null references public.subscription_promo_codes(id) on delete cascade,
  redeemed_at timestamptz not null default now(),
  unique(user_id, promo_code_id)
);

comment on table public.subscription_promo_redemptions is 'Track which users have redeemed which promo codes';

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

-- Function to log subscription changes
create or replace function public.log_subscription_change()
returns trigger language plpgsql as $$
declare
  v_old_rank integer;
  v_new_rank integer;
begin
  if (TG_OP = 'UPDATE' and OLD.plan != NEW.plan) then
    -- Assign numeric ranks to plans for comparison
    v_old_rank := case OLD.plan
      when 'free' then 0
      when 'basic' then 1
      when 'pro' then 2
      when 'enterprise' then 3
      else 0
    end;
    
    v_new_rank := case NEW.plan
      when 'free' then 0
      when 'basic' then 1
      when 'pro' then 2
      when 'enterprise' then 3
      else 0
    end;
    
    insert into public.subscription_history (user_id, from_plan, to_plan, change_type, metadata)
    values (
      NEW.user_id,
      OLD.plan,
      NEW.plan,
      case
        when v_new_rank > v_old_rank then 'upgrade'
        else 'downgrade'
      end,
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status,
        'old_billing_period', OLD.billing_period,
        'new_billing_period', NEW.billing_period
      )
    );
  end if;
  return NEW;
end;
$$;

drop trigger if exists log_subscription_change_trigger on public.subscriptions;
create trigger log_subscription_change_trigger
after update on public.subscriptions
for each row execute function public.log_subscription_change();

-- Enable RLS
alter table public.subscriptions enable row level security;
alter table public.subscription_usage_events enable row level security;
alter table public.subscription_history enable row level security;
alter table public.subscription_promo_codes enable row level security;
alter table public.subscription_promo_redemptions enable row level security;

-- Subscriptions policies
drop policy if exists subscriptions_select_own on public.subscriptions;
create policy subscriptions_select_own
  on public.subscriptions for select
  using (auth.uid() = user_id);

drop policy if exists subscriptions_insert_own on public.subscriptions;
create policy subscriptions_insert_own
  on public.subscriptions for insert
  with check (auth.uid() = user_id);

drop policy if exists subscriptions_update_own on public.subscriptions;
create policy subscriptions_update_own
  on public.subscriptions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Usage events policies
drop policy if exists usage_events_select_own on public.subscription_usage_events;
create policy usage_events_select_own
  on public.subscription_usage_events for select
  using (auth.uid() = user_id);

drop policy if exists usage_events_insert_own on public.subscription_usage_events;
create policy usage_events_insert_own
  on public.subscription_usage_events for insert
  with check (auth.uid() = user_id);

-- History policies
drop policy if exists history_select_own on public.subscription_history;
create policy history_select_own
  on public.subscription_history for select
  using (auth.uid() = user_id);

-- Promo codes policies (read-only for users)
drop policy if exists promo_codes_select_all on public.subscription_promo_codes;
create policy promo_codes_select_all
  on public.subscription_promo_codes for select
  using (is_active = true and valid_until > now());

-- Promo redemptions policies
drop policy if exists promo_redemptions_select_own on public.subscription_promo_redemptions;
create policy promo_redemptions_select_own
  on public.subscription_promo_redemptions for select
  using (auth.uid() = user_id);

drop policy if exists promo_redemptions_insert_own on public.subscription_promo_redemptions;
create policy promo_redemptions_insert_own
  on public.subscription_promo_redemptions for insert
  with check (auth.uid() = user_id);

-- Indexes for performance
create index if not exists idx_subscriptions_user_id on public.subscriptions(user_id);
create index if not exists idx_subscriptions_plan on public.subscriptions(plan);
create index if not exists idx_subscriptions_status on public.subscriptions(status);
create index if not exists idx_usage_events_user_id on public.subscription_usage_events(user_id);
create index if not exists idx_usage_events_type on public.subscription_usage_events(event_type);
create index if not exists idx_usage_events_created_at on public.subscription_usage_events(created_at);
create index if not exists idx_history_user_id on public.subscription_history(user_id);
create index if not exists idx_promo_codes_code on public.subscription_promo_codes(code);
create index if not exists idx_promo_redemptions_user_id on public.subscription_promo_redemptions(user_id);

-- Function to check if user can perform action based on subscription
create or replace function public.check_subscription_limit(
  p_user_id uuid,
  p_feature text,
  p_current_count integer
) returns boolean as $$
declare
  v_plan text;
  v_limit integer;
begin
  -- Get user's current plan
  select plan into v_plan
  from public.subscriptions
  where user_id = p_user_id and is_active = true;
  
  if v_plan is null then
    v_plan := 'free';
  end if;
  
  -- Get limit for feature based on plan (matching subscriptionConfig.ts)
  v_limit := case
    when v_plan = 'free' then
      case p_feature
        when 'leads' then 5
        when 'clients' then 3
        when 'tasks' then 5
        when 'emails' then 10
        when 'automation_rules' then 0
        when 'email_templates' then 2
        else 0
      end
    when v_plan = 'basic' then
      case p_feature
        when 'leads' then 50
        when 'clients' then 25
        when 'tasks' then 20
        when 'emails' then 50
        when 'automation_rules' then 5
        when 'email_templates' then 10
        when 'team_members' then 3
        else 0
      end
    when v_plan = 'pro' then
      case p_feature
        when 'leads' then 500
        when 'clients' then 250
        when 'tasks' then -1
        when 'emails' then -1
        when 'automation_rules' then 25
        when 'email_templates' then 50
        when 'team_members' then 10
        else -1
      end
    when v_plan = 'enterprise' then -1
    else 0
  end;
  
  -- -1 means unlimited
  if v_limit = -1 then
    return true;
  end if;
  
  return p_current_count < v_limit;
end;
$$ language plpgsql security definer;
