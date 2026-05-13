-- =============================================
-- NEXUS AI Platform — Supabase Schema
-- =============================================

-- PROFILES
create table profiles (
  id                    uuid references auth.users on delete cascade primary key,
  email                 text,
  full_name             text,
  avatar_url            text,
  -- brand memory
  brand_name            text,
  brand_niche           text,
  brand_tone            text,
  brand_audience        text,
  brand_description     text,
  -- subscription
  plan                  text default 'free' check (plan in ('free','starter','growth','pro')),
  credits_remaining     int default 30,
  credits_total         int default 30,
  credits_reset_at      timestamptz default (now() + interval '30 days'),
  stripe_customer_id    text,
  stripe_subscription_id text,
  onboarding_completed  boolean default false,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

-- CREDIT TRANSACTIONS (audit log)
create table credit_transactions (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references profiles(id) on delete cascade not null,
  amount      int not null,
  type        text not null check (type in ('usage','top_up','reset','bonus')),
  tool        text,
  description text,
  created_at  timestamptz default now()
);

-- GENERATIONS (history)
create table generations (
  id           uuid default gen_random_uuid() primary key,
  user_id      uuid references profiles(id) on delete cascade not null,
  tool         text not null,
  inputs       jsonb not null default '{}',
  outputs      jsonb not null default '{}',
  credits_used int not null default 5,
  created_at   timestamptz default now()
);

-- ── ROW LEVEL SECURITY ───────────────────────────────────────

alter table profiles             enable row level security;
alter table credit_transactions  enable row level security;
alter table generations          enable row level security;

create policy "profiles_owner"       on profiles            for all using (auth.uid() = id);
create policy "transactions_owner"   on credit_transactions for all using (auth.uid() = user_id);
create policy "generations_owner"    on generations         for all using (auth.uid() = user_id);

-- ── TRIGGERS ─────────────────────────────────────────────────

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ── FUNCTIONS ────────────────────────────────────────────────

-- Atomic credit deduction (prevents race conditions)
create or replace function deduct_credits(p_user_id uuid, p_amount int)
returns int as $$
declare
  new_balance int;
begin
  update profiles
  set credits_remaining = greatest(credits_remaining - p_amount, 0),
      updated_at = now()
  where id = p_user_id
  returning credits_remaining into new_balance;
  return new_balance;
end;
$$ language plpgsql security definer;

-- Monthly credit reset (call via cron or webhook)
create or replace function reset_monthly_credits(p_user_id uuid)
returns void as $$
declare
  plan_credits int;
  user_plan text;
begin
  select plan into user_plan from profiles where id = p_user_id;
  plan_credits := case user_plan
    when 'starter' then 200
    when 'growth'  then 600
    when 'pro'     then 2000
    else 30
  end;
  update profiles
  set credits_remaining = plan_credits,
      credits_total = plan_credits,
      credits_reset_at = now() + interval '30 days',
      updated_at = now()
  where id = p_user_id;
  insert into credit_transactions (user_id, amount, type, description)
  values (p_user_id, plan_credits, 'reset', 'Monthly credit reset');
end;
$$ language plpgsql security definer;
