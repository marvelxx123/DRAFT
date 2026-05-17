import { createClient } from "@supabase/supabase-js";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

// ---------------------------------------------------------------------------
// Type definitions mirroring the database schema
// ---------------------------------------------------------------------------

export type Plan = "trial" | "lite" | "pro" | "business" | "elite";
export type Sentiment = "positive" | "neutral" | "negative";

export interface Business {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  name: string;
  address: string | null;
  website: string | null;
  phone_number: string | null;
  original_number: string | null;
  greeting_message: string | null;
  services: string[] | null;
  faqs: Array<{ question: string; answer: string }> | null;
  business_hours: Record<
    string,
    { open: string; close: string; closed: boolean }
  > | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan: Plan;
  plan_call_limit: number | null;
  calendar_url: string | null;
  crm_webhook_url: string | null;
  calla_shield_enabled: boolean;
  voicemail_enabled: boolean;
}

export interface Call {
  id: string;
  created_at: string;
  business_id: string;
  caller_number: string | null;
  duration_seconds: number | null;
  started_at: string | null;
  ended_at: string | null;
  transcript: string | null;
  summary: string | null;
  sentiment: Sentiment | null;
  action_items: string[] | null;
  shield_sms_sent: boolean;
  shield_sms_at: string | null;
  review_prompted: boolean;
  recording_url: string | null;
  vapi_call_id: string | null;
  twilio_call_sid: string | null;
}

// ---------------------------------------------------------------------------
// Company AI table types
// ---------------------------------------------------------------------------

export interface WeeklyPlan {
  id: string;
  created_at: string;
  week_start: string;
  weekly_goal: string;
  content_topics: string[];
  seo_target: string | null;
  outreach_segment: string | null;
  outreach_daily_volume: number | null;
}

export interface ContentPost {
  id: string;
  created_at: string;
  topic: string;
  format: "blog" | "instagram" | "twitter" | "linkedin";
  blog_body: string | null;
  social_caption: string | null;
  status: "ready" | "published";
}

export interface SEOReport {
  id: string;
  created_at: string;
  target_page: string;
  keyword_count: number | null;
  keywords: Array<{ keyword: string; intent: string; volume?: number | null; difficulty?: number | null }> | null;
  meta_title: string | null;
  meta_description: string | null;
  content_gaps: string[] | null;
  backlink_targets: string[] | null;
  hero_headline: string | null;
  subheadline: string | null;
  cta_text: string | null;
}

export interface OutreachItem {
  id: string;
  created_at: string;
  business_name: string;
  business_type: string | null;
  dm_copy: string | null;
  email_subject: string | null;
  email_body: string | null;
  status: "ready" | "sent";
  sent_at: string | null;
}

export interface Database {
  public: {
    Tables: {
      businesses: {
        Row: Business;
        Insert: Omit<Business, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Business, "id" | "created_at">>;
      };
      calls: {
        Row: Call;
        Insert: Omit<Call, "id" | "created_at">;
        Update: Partial<Omit<Call, "id" | "created_at">>;
      };
      weekly_plans: {
        Row: WeeklyPlan;
        Insert: Omit<WeeklyPlan, "id" | "created_at">;
        Update: Partial<Omit<WeeklyPlan, "id" | "created_at">>;
      };
      content_posts: {
        Row: ContentPost;
        Insert: Omit<ContentPost, "id" | "created_at">;
        Update: Partial<Omit<ContentPost, "id" | "created_at">>;
      };
      seo_reports: {
        Row: SEOReport;
        Insert: Omit<SEOReport, "id" | "created_at">;
        Update: Partial<Omit<SEOReport, "id" | "created_at">>;
      };
      outreach_queue: {
        Row: OutreachItem;
        Insert: Omit<OutreachItem, "id" | "created_at">;
        Update: Partial<Omit<OutreachItem, "id" | "created_at">>;
      };
    };
    Views: {
      business_call_stats: {
        Row: {
          business_id: string;
          business_name: string;
          call_date: string;
          total_calls: number;
          positive_calls: number;
          neutral_calls: number;
          negative_calls: number;
          shield_smses_sent: number;
          avg_duration_seconds: number;
        };
      };
    };
  };
}

// ---------------------------------------------------------------------------
// Environment validation
// ---------------------------------------------------------------------------

function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("Missing env: NEXT_PUBLIC_SUPABASE_URL");
  return url;
}

function getSupabaseAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) throw new Error("Missing env: NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return key;
}

function getSupabaseServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Missing env: SUPABASE_SERVICE_ROLE_KEY");
  return key;
}

// ---------------------------------------------------------------------------
// Browser client (Client Components)
// Uses the auth-helpers cookie-based session management automatically.
// ---------------------------------------------------------------------------

/**
 * Use inside Client Components:
 *   const supabase = createBrowserClient();
 */
export function createBrowserClient() {
  return createClientComponentClient<Database>();
}

// ---------------------------------------------------------------------------
// Server Component client (Server Components, layouts, pages)
// ---------------------------------------------------------------------------

/**
 * Use inside Server Components, page.tsx, layout.tsx:
 *   const supabase = createServerClient();
 *   const { data: { session } } = await supabase.auth.getSession();
 */
export function createServerClient() {
  // cookies() must be called inside a Server Component request context.
  const cookieStore = cookies();
  return createServerComponentClient<Database>({ cookies: () => cookieStore });
}

// ---------------------------------------------------------------------------
// Admin / service-role client (API routes, webhooks, server actions)
// NEVER import this in client-side code — it bypasses RLS.
// ---------------------------------------------------------------------------

let _adminClient: ReturnType<typeof createClient<Database>> | null = null;

/**
 * Use inside API routes and Server Actions only.
 * Singleton to avoid creating multiple Supabase connections per process.
 */
export function createAdminClient() {
  if (_adminClient) return _adminClient;
  _adminClient = createClient<Database>(
    getSupabaseUrl(),
    getSupabaseServiceRoleKey(),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
  return _adminClient;
}
