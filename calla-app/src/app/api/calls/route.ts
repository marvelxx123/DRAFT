import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Sentiment = "positive" | "neutral" | "negative";

interface CallRecord {
  id: string;
  vapi_call_id: string;
  business_id: string;
  caller_number: string;
  status: string;
  duration_seconds: number;
  transcript?: string;
  summary?: string;
  sentiment?: Sentiment;
  review_prompted?: boolean;
  started_at?: string;
  ended_at?: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key);
}

/**
 * Get the authenticated Supabase client (user session from cookies).
 * Used to check which business the logged-in user belongs to.
 */
function getSupabaseServer() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );
}

/**
 * Resolve and validate the businessId from either:
 * - Query param (admin/service role usage)
 * - Authenticated user session (dashboard usage)
 */
async function resolveBusinessId(
  request: NextRequest
): Promise<{ businessId: string | null; error: string | null }> {
  const { searchParams } = new URL(request.url);
  const queryBusinessId = searchParams.get("businessId");

  // If an explicit businessId is provided, use the service role to verify it exists
  if (queryBusinessId) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("businesses")
      .select("id")
      .eq("id", queryBusinessId)
      .single();
    if (error || !data) {
      return { businessId: null, error: "Business not found" };
    }
    return { businessId: queryBusinessId, error: null };
  }

  // Otherwise, look up the authenticated user's business
  const supabase = getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { businessId: null, error: "Unauthorized" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id")
    .eq("id", user.id)
    .single();

  if (!profile || !(profile as { business_id?: string }).business_id) {
    return { businessId: null, error: "No business associated with account" };
  }

  return {
    businessId: (profile as { business_id: string }).business_id,
    error: null,
  };
}

// ---------------------------------------------------------------------------
// GET /api/calls — paginated call list
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // Pagination
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 100);
  const offset = Math.max(parseInt(searchParams.get("offset") ?? "0", 10), 0);

  // Filters
  const sentimentFilter = searchParams.get("sentiment") as Sentiment | null;

  const { businessId, error: authError } = await resolveBusinessId(request);

  if (authError || !businessId) {
    const status = authError === "Unauthorized" ? 401 : 404;
    return NextResponse.json({ error: authError ?? "Not found" }, { status });
  }

  try {
    const supabase = getSupabaseAdmin();

    let query = supabase
      .from("calls")
      .select(
        "id, vapi_call_id, business_id, caller_number, status, duration_seconds, " +
        "summary, sentiment, review_prompted, started_at, ended_at, created_at",
        { count: "exact" }
      )
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply optional sentiment filter
    if (
      sentimentFilter === "positive" ||
      sentimentFilter === "neutral" ||
      sentimentFilter === "negative"
    ) {
      query = query.eq("sentiment", sentimentFilter);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("[Calls] Query error:", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    return NextResponse.json({
      calls: (data ?? []) as CallRecord[],
      total: count ?? 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error("[Calls] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
