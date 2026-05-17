import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BusinessSettings {
  id: string;
  name: string;
  greeting_message: string;
  services: string | string[];
  hours: string;
  google_review_link?: string;
  elevenlabs_voice_id?: string;
  owner_phone?: string;
  caller_sms_enabled?: boolean;
  plan?: string;
  twilio_number?: string;
  vapi_phone_number_id?: string;
}

interface BusinessUpdatePayload {
  greeting_message?: string;
  services?: string | string[];
  hours?: string;
  google_review_link?: string;
  elevenlabs_voice_id?: string;
  owner_phone?: string;
  caller_sms_enabled?: boolean;
  name?: string;
}

// Fields that cannot be updated via this endpoint (managed by system)
const PROTECTED_FIELDS = new Set([
  "id",
  "plan",
  "twilio_number",
  "vapi_phone_number_id",
  "stripe_customer_id",
  "stripe_subscription_id",
  "created_at",
  "updated_at",
]);

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
 * Get the authenticated user and their associated business ID.
 */
async function getAuthContext(): Promise<{
  userId: string | null;
  businessId: string | null;
  error: string | null;
}> {
  const supabase = getSupabaseServer();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { userId: null, businessId: null, error: "Unauthorized" };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("business_id")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return { userId: user.id, businessId: null, error: "Profile not found" };
  }

  const businessId = (profile as { business_id?: string }).business_id;
  if (!businessId) {
    return { userId: user.id, businessId: null, error: "No business associated" };
  }

  return { userId: user.id, businessId, error: null };
}

// ---------------------------------------------------------------------------
// GET /api/businesses/me — get current business settings
// ---------------------------------------------------------------------------

export async function GET(_request: NextRequest) {
  const { businessId, error } = await getAuthContext();

  if (error || !businessId) {
    const status = error === "Unauthorized" ? 401 : 404;
    return NextResponse.json({ error: error ?? "Not found" }, { status });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: business, error: dbError } = await supabase
      .from("businesses")
      .select(
        "id, name, greeting_message, services, hours, google_review_link, " +
        "elevenlabs_voice_id, owner_phone, caller_sms_enabled, plan, twilio_number, " +
        "vapi_phone_number_id, created_at, updated_at"
      )
      .eq("id", businessId)
      .single();

    if (dbError || !business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    return NextResponse.json({ business: business as BusinessSettings });
  } catch (err) {
    console.error("[Businesses] GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/businesses/me — update business settings
// ---------------------------------------------------------------------------

export async function PATCH(request: NextRequest) {
  const { businessId, error } = await getAuthContext();

  if (error || !businessId) {
    const status = error === "Unauthorized" ? 401 : 404;
    return NextResponse.json({ error: error ?? "Not found" }, { status });
  }

  let payload: BusinessUpdatePayload;
  try {
    payload = (await request.json()) as BusinessUpdatePayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Strip any protected/unknown fields from the payload
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (!PROTECTED_FIELDS.has(key) && value !== undefined) {
      sanitized[key] = value;
    }
  }

  if (Object.keys(sanitized).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400 }
    );
  }

  // Validate specific fields
  if (
    sanitized.caller_sms_enabled !== undefined &&
    typeof sanitized.caller_sms_enabled !== "boolean"
  ) {
    return NextResponse.json(
      { error: "caller_sms_enabled must be a boolean" },
      { status: 400 }
    );
  }

  if (sanitized.name !== undefined) {
    const name = sanitized.name as string;
    if (typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "name must be a non-empty string" },
        { status: 400 }
      );
    }
    sanitized.name = name.trim();
  }

  // Add updated_at timestamp
  sanitized.updated_at = new Date().toISOString();

  try {
    const supabase = getSupabaseAdmin();
    const { data: updated, error: dbError } = await supabase
      .from("businesses")
      .update(sanitized)
      .eq("id", businessId)
      .select(
        "id, name, greeting_message, services, hours, google_review_link, " +
        "elevenlabs_voice_id, owner_phone, caller_sms_enabled, plan, " +
        "twilio_number, updated_at"
      )
      .single();

    if (dbError) {
      console.error("[Businesses] Update error:", dbError);
      return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }

    return NextResponse.json({ business: updated as BusinessSettings });
  } catch (err) {
    console.error("[Businesses] PATCH error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
