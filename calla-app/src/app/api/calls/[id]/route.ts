import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CallDetail {
  id: string;
  vapi_call_id: string;
  business_id: string;
  caller_number: string;
  status: string;
  duration_seconds: number;
  transcript?: string;
  summary?: string;
  sentiment?: string;
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
 * Verify the requesting user has access to this call's business.
 */
async function getUserBusinessId(): Promise<string | null> {
  const supabase = getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id")
    .eq("id", user.id)
    .single();

  return (profile as { business_id?: string } | null)?.business_id ?? null;
}

// ---------------------------------------------------------------------------
// GET /api/calls/[id] — single call detail
// ---------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const callId = params.id;

  if (!callId) {
    return NextResponse.json({ error: "Call ID is required" }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();

    // Fetch the call record
    const { data: call, error } = await supabase
      .from("calls")
      .select("*")
      .eq("id", callId)
      .single();

    if (error || !call) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    const callRecord = call as CallDetail;

    // Authorization: verify the requesting user owns this business
    // (or allow via service role if called server-to-server)
    const authHeader = request.headers.get("authorization");
    const isServiceRole = authHeader === `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`;

    if (!isServiceRole) {
      const userBusinessId = await getUserBusinessId();
      if (!userBusinessId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (userBusinessId !== callRecord.business_id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    return NextResponse.json({ call: callRecord });
  } catch (error) {
    console.error("[Calls/ID] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
