import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe";
import twilio from "twilio";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BusinessRow {
  id: string;
  name: string;
  original_number: string | null;
  phone_number: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function getTwilioClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) throw new Error("Missing Twilio env vars");
  return twilio(sid, token);
}

/**
 * Trigger Twilio number provisioning via the internal /api/twilio/provision
 * endpoint. Uses the service role key as a server-to-server auth token.
 */
async function triggerProvision(businessId: string): Promise<string | null> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!appUrl || !serviceKey) {
    console.warn("[Confirm] Missing APP_URL or SUPABASE_SERVICE_ROLE_KEY — skipping provisioning");
    return null;
  }

  try {
    const res = await fetch(`${appUrl}/api/twilio/provision`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ businessId }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[Confirm] Provision call failed:", res.status, text);
      return null;
    }

    const data = (await res.json()) as { phoneNumber?: string };
    return data.phoneNumber ?? null;
  } catch (err) {
    console.error("[Confirm] Provision fetch error:", err);
    return null;
  }
}

/**
 * Send a welcome SMS to the business owner via Twilio.
 */
async function sendWelcomeSms(
  toNumber: string,
  businessName: string
): Promise<void> {
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;
  if (!fromNumber) {
    console.warn("[Confirm] TWILIO_PHONE_NUMBER not set — skipping welcome SMS");
    return;
  }

  const body =
    `🌿 Welcome to CALLA, ${businessName}!\n` +
    `Your AI receptionist ARIA is being set up right now.\n` +
    `You'll receive your CALLA number in the next 2 minutes.\n` +
    `— The CALLA Team`;

  try {
    const client = getTwilioClient();
    await client.messages.create({ to: toNumber, from: fromNumber, body });
    console.log(`[Confirm] Welcome SMS sent to ${toNumber}`);
  } catch (err) {
    // Non-fatal — log and continue
    console.error("[Confirm] Failed to send welcome SMS:", err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/stripe/checkout/confirm?session_id=<id>
// Called from the /success page to:
//   1. Verify payment completed
//   2. Update business plan in Supabase
//   3. Trigger Twilio number provisioning
//   4. Send welcome SMS
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session_id");

  if (!sessionId) {
    return NextResponse.json(
      { success: false, error: "session_id is required" },
      { status: 400 }
    );
  }

  const stripe = getStripe();
  const supabase = getSupabaseAdmin();

  try {
    // -----------------------------------------------------------------------
    // 1. Retrieve and verify the Stripe Checkout session
    // -----------------------------------------------------------------------
    let session;
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["subscription"],
      });
    } catch (err) {
      console.error("[Confirm] Stripe session retrieval failed:", err);
      return NextResponse.json(
        { success: false, error: "Invalid session ID" },
        { status: 404 }
      );
    }

    if (session.payment_status !== "paid" && session.status !== "complete") {
      console.warn(
        `[Confirm] Session ${sessionId} not paid. status=${session.status} payment_status=${session.payment_status}`
      );
      return NextResponse.json(
        { success: false, error: "Payment not completed" },
        { status: 402 }
      );
    }

    // -----------------------------------------------------------------------
    // 2. Extract metadata
    // -----------------------------------------------------------------------
    const businessId = session.metadata?.businessId;
    const planName = session.metadata?.planName ?? null;

    if (!businessId) {
      console.error("[Confirm] No businessId in session metadata:", sessionId);
      return NextResponse.json(
        { success: false, error: "Missing business reference" },
        { status: 400 }
      );
    }

    const subscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id ?? null;

    // -----------------------------------------------------------------------
    // 3. Update business in Supabase
    // -----------------------------------------------------------------------
    const planValue = planName as "trial" | "lite" | "pro" | "business" | "elite" | null;
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (planValue && ["lite", "pro", "business", "elite"].includes(planValue)) {
      updatePayload.plan = planValue;
    }
    if (subscriptionId) {
      updatePayload.stripe_subscription_id = subscriptionId;
    }

    const { data: rawUpdated, error: updateError } = await supabase
      .from("businesses")
      .update(updatePayload)
      .eq("id", businessId)
      .select("id, name, original_number, phone_number")
      .single();

    if (updateError) {
      console.error("[Confirm] Supabase update error:", updateError.message);
      // Non-fatal: continue so provisioning still runs
    }

    const updatedBusiness = rawUpdated as unknown as BusinessRow | null;
    const businessName = updatedBusiness?.name ?? "your business";

    console.log(
      `[Confirm] Business ${businessId} updated — plan: ${planValue ?? "(unchanged)"}, sub: ${subscriptionId}`
    );

    // -----------------------------------------------------------------------
    // 4. Trigger Twilio number provisioning (idempotent — provision route
    //    returns early if a number already exists)
    // -----------------------------------------------------------------------
    const callaNumber = await triggerProvision(businessId);

    if (callaNumber) {
      console.log(`[Confirm] Provisioned CALLA number ${callaNumber} for business ${businessId}`);
    }

    // -----------------------------------------------------------------------
    // 5. Send welcome SMS to business owner
    // -----------------------------------------------------------------------
    // Use the `original_number` (owner's mobile) stored during onboarding Step 4.
    // Fall back to the business's CALLA number only as last resort (unlikely to be self).
    const ownerMobile = updatedBusiness?.original_number;

    if (ownerMobile) {
      await sendWelcomeSms(ownerMobile, businessName);
    } else {
      console.warn(
        `[Confirm] No owner mobile on record for business ${businessId} — skipping welcome SMS`
      );
    }

    // -----------------------------------------------------------------------
    // 6. Return success
    // -----------------------------------------------------------------------
    return NextResponse.json({
      success: true,
      businessName,
      callaNumber: callaNumber ?? updatedBusiness?.phone_number ?? null,
    });
  } catch (error) {
    console.error("[Confirm] Unhandled error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
