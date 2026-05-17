-- =============================================================================
-- CALLA Database Schema
-- Run this against your Supabase project via the SQL editor or CLI.
-- =============================================================================

-- Enable UUID generation (already available in Supabase by default)
-- create extension if not exists "pgcrypto";

-- =============================================================================
-- BUSINESSES
-- One row per CALLA customer (business owner account).
-- =============================================================================
create table if not exists businesses (
  id                      uuid primary key default gen_random_uuid(),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),

  -- Auth link
  user_id                 uuid not null references auth.users(id) on delete cascade,

  -- Identity
  name                    text not null,
  address                 text,
  website                 text,

  -- Phone numbers
  phone_number            text,           -- CALLA-provisioned Twilio number shown to callers
  original_number         text,           -- Business's actual phone number (for forwarding)

  -- AI configuration
  greeting_message        text default 'Thank you for calling. How can I help you today?',
  services                text[],         -- Array of service names the AI knows about
  faqs                    jsonb,          -- [{ question: string, answer: string }]
  business_hours          jsonb,          -- { mon: {open:"09:00", close:"17:00", closed:false}, ... }

  -- Stripe billing
  stripe_customer_id      text unique,
  stripe_subscription_id  text unique,
  plan                    text not null default 'trial'
                            check (plan in ('trial', 'lite', 'pro', 'business', 'elite')),
  plan_call_limit         integer,        -- monthly call limit for this plan tier

  -- Integrations
  calendar_url            text,           -- Google Calendar / Cal.com URL for booking
  crm_webhook_url         text,           -- Webhook endpoint to push call data to CRM

  -- Features
  calla_shield_enabled    boolean not null default true,  -- CALLA SHIELD review prompting
  voicemail_enabled       boolean not null default false,

  unique (user_id)
);

-- Auto-update updated_at
create or replace function update_updated_at_column()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger businesses_updated_at
  before update on businesses
  for each row execute function update_updated_at_column();

-- =============================================================================
-- CALLS
-- One row per inbound call handled by CALLA.
-- =============================================================================
create table if not exists calls (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),

  -- Relationship
  business_id         uuid not null references businesses(id) on delete cascade,

  -- Call metadata
  caller_number       text,                   -- E.164 format, e.g. +15551234567
  duration_seconds    integer,
  started_at          timestamptz,
  ended_at            timestamptz,

  -- AI output
  transcript          text,                   -- Full verbatim transcript
  summary             text,                   -- AI-generated 1-2 sentence summary
  sentiment           text check (sentiment in ('positive', 'neutral', 'negative')),
  action_items        text[],                 -- Any follow-up tasks extracted by AI

  -- CALLA SHIELD
  shield_sms_sent     boolean not null default false,   -- Review-request SMS sent?
  shield_sms_at       timestamptz,
  review_prompted     boolean not null default false,

  -- Recording
  recording_url       text,                   -- Signed URL to audio file in Supabase Storage

  -- Vapi integration
  vapi_call_id        text unique,            -- Vapi's call ID for lookups / webhooks

  -- Twilio
  twilio_call_sid     text unique
);

-- Index for fast per-business call lookups (most common query)
create index if not exists calls_business_id_created_at_idx
  on calls (business_id, created_at desc);

-- Index for Vapi webhook dedup
create index if not exists calls_vapi_call_id_idx
  on calls (vapi_call_id) where vapi_call_id is not null;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

alter table businesses enable row level security;
alter table calls enable row level security;

-- Businesses: each authenticated user can only see/modify their own business row.
create policy "businesses: owner select"
  on businesses for select
  using (auth.uid() = user_id);

create policy "businesses: owner insert"
  on businesses for insert
  with check (auth.uid() = user_id);

create policy "businesses: owner update"
  on businesses for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "businesses: owner delete"
  on businesses for delete
  using (auth.uid() = user_id);

-- Calls: a user can access calls that belong to their business.
create policy "calls: owner select"
  on calls for select
  using (
    exists (
      select 1 from businesses b
      where b.id = calls.business_id
        and b.user_id = auth.uid()
    )
  );

create policy "calls: owner insert"
  on calls for insert
  with check (
    exists (
      select 1 from businesses b
      where b.id = calls.business_id
        and b.user_id = auth.uid()
    )
  );

create policy "calls: owner update"
  on calls for update
  using (
    exists (
      select 1 from businesses b
      where b.id = calls.business_id
        and b.user_id = auth.uid()
    )
  );

create policy "calls: owner delete"
  on calls for delete
  using (
    exists (
      select 1 from businesses b
      where b.id = calls.business_id
        and b.user_id = auth.uid()
    )
  );

-- =============================================================================
-- SERVICE ROLE BYPASS (for API routes / webhooks that use the service key)
-- The service role bypasses RLS by default in Supabase — no extra config needed.
-- =============================================================================

-- =============================================================================
-- HELPFUL VIEWS
-- =============================================================================

-- Daily call summary per business
create or replace view business_call_stats as
select
  b.id                                          as business_id,
  b.name                                        as business_name,
  date_trunc('day', c.created_at)               as call_date,
  count(*)                                      as total_calls,
  count(*) filter (where c.sentiment = 'positive') as positive_calls,
  count(*) filter (where c.sentiment = 'neutral')  as neutral_calls,
  count(*) filter (where c.sentiment = 'negative') as negative_calls,
  count(*) filter (where c.shield_sms_sent = true) as shield_smses_sent,
  avg(c.duration_seconds)::integer              as avg_duration_seconds
from businesses b
join calls c on c.business_id = b.id
group by b.id, b.name, date_trunc('day', c.created_at);

-- =============================================================================
-- COMPANY AI TABLES
-- Used by the AI marketing agents that run CALLA's own marketing operations.
-- =============================================================================

-- Weekly marketing plan created by the Marketing Manager agent
create table if not exists weekly_plans (
  id                    uuid primary key default gen_random_uuid(),
  created_at            timestamptz not null default now(),
  week_start            date not null,
  weekly_goal           text not null,
  content_topics        text[] not null default '{}',
  seo_target            text,
  outreach_segment      text,
  outreach_daily_volume integer
);

-- Content posts created by the Content Agent
create table if not exists content_posts (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  topic           text not null,
  format          text not null check (format in ('blog', 'instagram', 'twitter', 'linkedin')),
  blog_body       text,
  social_caption  text,
  status          text not null default 'ready' check (status in ('ready', 'published'))
);

create index if not exists content_posts_status_idx on content_posts (status);
create index if not exists content_posts_format_idx on content_posts (format);

-- SEO reports created by the SEO Agent
create table if not exists seo_reports (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  target_page       text not null,
  keyword_count     integer,
  keywords          jsonb,   -- [{ keyword, intent, volume?, difficulty? }]
  meta_title        text,
  meta_description  text,
  content_gaps      text[],
  backlink_targets  text[],
  hero_headline     text,
  subheadline       text,
  cta_text          text
);

-- Outreach queue managed by the Outreach Agent
create table if not exists outreach_queue (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  business_name   text not null,
  business_type   text,
  dm_copy         text,
  email_subject   text,
  email_body      text,
  status          text not null default 'ready' check (status in ('ready', 'sent')),
  sent_at         timestamptz
);

create index if not exists outreach_queue_status_idx on outreach_queue (status);
