import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Business {
  id: string;
  name: string;
  owner_phone: string;
  twilio_number?: string;
  vapi_phone_number_id?: string;
  plan?: string;
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

function getStripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY");
  return new Stripe(key, { apiVersion: "2024-09-30.acacia" });
}

/**
 * Map a Stripe price ID to a plan name.
 */
function getPlanFromPriceId(priceId: string): string {
  const priceMap: Record<string, string> = {
    [process.env.STRIPE_PRICE_ID_LITE ?? ""]: "lite",
    [process.env.STRIPE_PRICE_ID_PRO ?? ""]: "pro",
    [process.env.STRIPE_PRICE_ID_BUSINESS ?? ""]: "business",
    [process.env.STRIPE_PRICE_ID_ELITE ?? ""]: "elite",
  };
  return priceMap[priceId] ?? "unknown";
}

/**
 * Provision a VAPI phone number for a business.
 * Calls the VAPI API to create a phone number resource pointed at our assistant.
 */
async function provisionVapiNumber(
  twilioPhoneNumber: string,
  businessId: string
): Promise<string | null> {
  const vapiApiKey = process.env.VAPI_API_KEY;
  if (!vapiApiKey) {
    console.warn("[Stripe] VAPI_API_KEY not set — skipping VAPI provisioning");
    return null;
  }

  try {
    const response = await fetch("https://api.vapi.ai/phone-number", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${vapiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        provider: "twilio",
        number: twilioPhoneNumber,
        assistantId: null, // Will be set dynamically via serverUrl
        serverUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/vapi/webhook`,
        serverUrlSecret: process.env.VAPI_SECRET ?? "",
        name: `Business ${businessId}`,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("[Stripe] VAPI provisioning failed:", err);
      return null;
    }

    const data = (await response.json()) as { id?: string };
    return data.id ?? null;
  } catch (err) {
    console.error("[Stripe] VAPI provisioning error:", err);
    return null;
  }
}

/**
 * Provision a Twilio phone number for a business by calling our own
 * /api/twilio/provision endpoint.
 */
async function provisionTwilioNumber(
  businessId: string
): Promise<string | null> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) return null;

  try {
    const response = await fetch(`${appUrl}/api/twilio/provision`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Use service role key as a server-to-server auth token
        "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ businessId }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("[Stripe] Twilio provision call failed:", err);
      return null;
    }

    const data = (await response.json()) as { phoneNumber?: string };
    return data.phoneNumber ?? null;
  } catch (err) {
    console.error("[Stripe] Twilio provision error:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Handle checkout.session.completed
// ---------------------------------------------------------------------------

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const stripe = getStripeClient();

  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id;
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;

  if (!customerId || !subscriptionId) {
    console.error("[Stripe] Missing customer or subscription ID in session");
    return;
  }

  // Look up subscription to get price ID
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const priceId = subscription.items.data[0]?.price?.id;
  const plan = priceId ? getPlanFromPriceId(priceId) : "unknown";

  // Get business by Stripe customer ID or user email
  const customerEmail =
    typeof session.customer_details?.email === "string"
      ? session.customer_details.email
      : null;

  let business: Business | null = null;

  // Try by stripe_customer_id first
  const { data: byCustomerId } = await supabase
    .from("businesses")
    .select("id, name, owner_phone, twilio_number, vapi_phone_number_id, plan")
    .eq("stripe_customer_id", customerId)
    .single();

  if (byCustomerId) {
    business = byCustomerId as Business;
  } else if (customerEmail) {
    // Fall back to matching by owner email via profiles
    const { data: profile } = await supabase
      .from("profiles")
      .select("business_id")
      .eq("email", customerEmail)
      .single();

    if (profile) {
      const { data: biz } = await supabase
        .from("businesses")
        .select("id, name, owner_phone, twilio_number, vapi_phone_number_id, plan")
        .eq("id", (profile as { business_id?: string }).business_id)
        .single();
      if (biz) business = biz as Business;
    }
  }

  if (!business) {
    console.error("[Stripe] Could not find business for customer:", customerId);
    return;
  }

  // Update business plan and Stripe IDs
  await supabase
    .from("businesses")
    .update({
      plan,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      plan_activated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", business.id);

  console.log(`[Stripe] Business ${business.id} upgraded to plan: ${plan}`);

  // Provision Twilio number if not already assigned
  if (!business.twilio_number) {
    const phoneNumber = await provisionTwilioNumber(business.id);
    if (phoneNumber) {
      console.log(`[Stripe] Provisioned Twilio number: ${phoneNumber}`);

      // Provision VAPI phone number
      const vapiPhoneNumberId = await provisionVapiNumber(phoneNumber, business.id);
      if (vapiPhoneNumberId) {
        await supabase
          .from("businesses")
          .update({ vapi_phone_number_id: vapiPhoneNumberId })
          .eq("id", business.id);
        console.log(`[Stripe] Provisioned VAPI phone number ID: ${vapiPhoneNumberId}`);
      }
    }
  } else if (!business.vapi_phone_number_id && business.twilio_number) {
    // Has Twilio number but no VAPI — provision VAPI only
    const vapiPhoneNumberId = await provisionVapiNumber(
      business.twilio_number,
      business.id
    );
    if (vapiPhoneNumberId) {
      await supabase
        .from("businesses")
        .update({ vapi_phone_number_id: vapiPhoneNumberId })
        .eq("id", business.id);
    }
  }
}

// ---------------------------------------------------------------------------
// Handle customer.subscription.deleted
// ---------------------------------------------------------------------------

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .single();

  if (!business) {
    console.error("[Stripe] No business found for customer:", customerId);
    return;
  }

  const businessId = (business as { id: string }).id;

  await supabase
    .from("businesses")
    .update({
      plan: "suspended",
      stripe_subscription_id: null,
      plan_suspended_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", businessId);

  console.log(`[Stripe] Business ${businessId} plan suspended`);
}

// ---------------------------------------------------------------------------
// POST handler — Stripe webhook
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[Stripe] STRIPE_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const stripe = getStripeClient();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("[Stripe] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.updated": {
        // Handle plan changes mid-subscription
        const subscription = event.data.object as Stripe.Subscription;
        const priceId = subscription.items.data[0]?.price?.id;
        const plan = priceId ? getPlanFromPriceId(priceId) : null;
        if (plan && plan !== "unknown") {
          const supabase = getSupabaseAdmin();
          const customerId =
            typeof subscription.customer === "string"
              ? subscription.customer
              : subscription.customer.id;
          await supabase
            .from("businesses")
            .update({ plan, updated_at: new Date().toISOString() })
            .eq("stripe_customer_id", customerId);
          console.log(`[Stripe] Subscription updated — new plan: ${plan}`);
        }
        break;
      }

      default:
        // Log unhandled events for debugging; return 200 to stop Stripe retries
        console.log(`[Stripe] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Stripe] Event handling error:", error);
    // Return 500 so Stripe retries the event
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }
}
