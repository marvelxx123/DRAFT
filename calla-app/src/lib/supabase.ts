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
// Agent table types — mirrors schema-agents.sql
// ---------------------------------------------------------------------------

export interface WeeklyPlanRow {
  id: string;
  created_at: string;
  week_of: string;
  goal: string | null;
  plan_json: Record<string, unknown> | null;
  status: "active" | "archived" | "superseded";
}

export interface ContentPostRow {
  id: string;
  created_at: string;
  topic: string | null;
  blog_post: string | null;
  instagram_caption: string | null;
  twitter_thread: Record<string, unknown> | null;
  linkedin_post: string | null;
  meta_title: string | null;
  meta_description: string | null;
  status: "ready" | "published" | "archived";
  published_at: string | null;
}

export interface SEOReportRow {
  id: string;
  created_at: string;
  target_page: string;
  keywords: Record<string, unknown>[] | null;
  meta_title: string | null;
  meta_description: string | null;
  content_gaps: Record<string, unknown>[] | null;
  backlink_targets: Record<string, unknown>[] | null;
  status: "new" | "reviewed" | "implemented" | "archived";
}

export interface ProspectRow {
  id: string;
  created_at: string;
  business_name: string | null;
  business_type: string | null;
  instagram_handle: string | null;
  email: string | null;
  city: string | null;
  status: "new" | "contacted" | "responded" | "converted" | "disqualified";
}

export interface OutreachQueueRow {
  id: string;
  created_at: string;
  prospect_id: string;
  dm_copy: string | null;
  email_subject: string | null;
  email_body: string | null;
  channel: "instagram" | "email" | "both";
  status: "ready" | "sent" | "failed" | "skipped";
  sent_at: string | null;
}

export interface CopySuggestionRow {
  id: string;
  created_at: string;
  page: string;
  hero_headline: string | null;
  hero_subheadline: string | null;
  cta_text: string | null;
  status: "pending" | "approved" | "rejected" | "deployed";
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
        Row: WeeklyPlanRow;
        Insert: Omit<WeeklyPlanRow, "id" | "created_at">;
        Update: Partial<Omit<WeeklyPlanRow, "id" | "created_at">>;
      };
      content_posts: {
        Row: ContentPostRow;
        Insert: Omit<ContentPostRow, "id" | "created_at">;
        Update: Partial<Omit<ContentPostRow, "id" | "created_at">>;
      };
      seo_reports: {
        Row: SEOReportRow;
        Insert: Omit<SEOReportRow, "id" | "created_at">;
        Update: Partial<Omit<SEOReportRow, "id" | "created_at">>;
      };
      prospects: {
        Row: ProspectRow;
        Insert: Omit<ProspectRow, "id" | "created_at">;
        Update: Partial<Omit<ProspectRow, "id" | "created_at">>;
      };
      outreach_queue: {
        Row: OutreachQueueRow;
        Insert: Omit<OutreachQueueRow, "id" | "created_at">;
        Update: Partial<Omit<OutreachQueueRow, "id" | "created_at">>;
      };
      copy_suggestions: {
        Row: CopySuggestionRow;
        Insert: Omit<CopySuggestionRow, "id" | "created_at">;
        Update: Partial<Omit<CopySuggestionRow, "id" | "created_at">>;
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
