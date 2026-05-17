import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CheckoutRequestBody {
  businessId?: string;
  priceId?: string;
  planName?: string;
}

// ---------------------------------------------------------------------------
// POST /api/stripe/checkout
// Creates a Stripe Checkout session for the given business and price.
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  // -------------------------------------------------------------------------
  // 1. Parse and validate request body
  // -------------------------------------------------------------------------
  let body: CheckoutRequestBody;
  try {
    body = (await request.json()) as CheckoutRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { businessId, priceId, planName } = body;

  if (!businessId || typeof businessId !== "string" || !businessId.trim()) {
    return NextResponse.json(
      { error: "businessId is required" },
      { status: 400 }
    );
  }
  if (!priceId || typeof priceId !== "string" || !priceId.trim()) {
    return NextResponse.json(
      { error: "priceId is required" },
      { status: 400 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    console.error("[Stripe/Checkout] NEXT_PUBLIC_APP_URL not set");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  const supabase = createAdminClient();
  const stripe = getStripe();

  try {
    // -----------------------------------------------------------------------
    // 2. Fetch the business record from Supabase
    // -----------------------------------------------------------------------
    const { data: business, error: bizError } = await supabase
      .from("businesses")
      .select("id, name, stripe_customer_id")
      .eq("id", businessId)
      .single();

    if (bizError || !business) {
      console.error("[Stripe/Checkout] Business not found:", businessId, bizError?.message);
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    // We need the owner's email — fetch via auth.users through the business's user_id
    const { data: businessWithUser, error: userError } = await supabase
      .from("businesses")
      .select("id, name, stripe_customer_id, user_id")
      .eq("id", businessId)
      .single();

    if (userError || !businessWithUser) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    // Resolve email via the admin API
    let ownerEmail: string | undefined;
    try {
      const { data: userData } = await supabase.auth.admin.getUserById(
        businessWithUser.user_id
      );
      ownerEmail = userData?.user?.email ?? undefined;
    } catch (err) {
      // Non-fatal — proceed without email; Stripe will prompt for it at checkout
      console.warn("[Stripe/Checkout] Could not resolve owner email:", err);
    }

    // -----------------------------------------------------------------------
    // 3. Get or create the Stripe customer
    // -----------------------------------------------------------------------
    let stripeCustomerId = business.stripe_customer_id;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: ownerEmail,
        name: business.name,
        metadata: { businessId: business.id },
      });

      stripeCustomerId = customer.id;

      // Persist the new customer ID immediately so subsequent calls are idempotent
      const { error: saveError } = await supabase
        .from("businesses")
        .update({ stripe_customer_id: stripeCustomerId })
        .eq("id", businessId);

      if (saveError) {
        // Non-fatal — log but continue. The customer was created in Stripe.
        console.error(
          "[Stripe/Checkout] Failed to save stripe_customer_id:",
          saveError.message
        );
      }

      console.log(
        `[Stripe/Checkout] Created Stripe customer ${stripeCustomerId} for business ${businessId}`
      );
    }

    // -----------------------------------------------------------------------
    // 4. Create the Stripe Checkout Session
    // -----------------------------------------------------------------------
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/onboarding?step=5`,
      metadata: {
        businessId: business.id,
        planName: planName ?? "",
      },
      subscription_data: {
        trial_period_days: 7,
        metadata: {
          businessId: business.id,
          planName: planName ?? "",
        },
      },
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      customer_update: {
        address: "auto",
      },
    });

    if (!session.url) {
      console.error("[Stripe/Checkout] Session created but no URL returned");
      return NextResponse.json(
        { error: "Failed to create checkout URL" },
        { status: 500 }
      );
    }

    console.log(
      `[Stripe/Checkout] Created session ${session.id} for business ${businessId} (plan: ${planName})`
    );

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[Stripe/Checkout] Error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
