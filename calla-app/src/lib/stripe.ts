import Stripe from "stripe";

// ---------------------------------------------------------------------------
// Plan definitions
// ---------------------------------------------------------------------------

export type StripePlan = "lite" | "pro" | "business" | "elite";

export interface PlanDetails {
  id: StripePlan;
  name: string;
  description: string;
  monthlyPrice: number;        // in USD cents
  callLimit: number | null;    // null = unlimited
  features: string[];
  priceId: string;             // Stripe Price ID from environment
  highlighted?: boolean;       // shown as "most popular"
}

function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required environment variable: ${key}`);
  return val;
}

// Price IDs — resolved lazily so the module can be imported without env vars
// being present at build time (e.g. during `next build` in CI).
export const STRIPE_PRICE_IDS = {
  lite: () => requireEnv("STRIPE_PRICE_ID_LITE"),
  pro: () => requireEnv("STRIPE_PRICE_ID_PRO"),
  business: () => requireEnv("STRIPE_PRICE_ID_BUSINESS"),
  elite: () => requireEnv("STRIPE_PRICE_ID_ELITE"),
} as const;

export const PLANS: PlanDetails[] = [
  {
    id: "lite",
    name: "Lite",
    description: "Perfect for solo operators and small shops.",
    monthlyPrice: 4900,   // $49
    callLimit: 100,
    features: [
      "Up to 100 calls/month",
      "AI call answering",
      "Call summaries",
      "SMS notifications",
    ],
    get priceId() {
      return STRIPE_PRICE_IDS.lite();
    },
  },
  {
    id: "pro",
    name: "Pro",
    description: "For growing businesses that need more capacity.",
    monthlyPrice: 9900,   // $99
    callLimit: 300,
    highlighted: true,
    features: [
      "Up to 300 calls/month",
      "Everything in Lite",
      "CALLA SHIELD (review prompting)",
      "Google Calendar integration",
      "Sentiment analysis",
    ],
    get priceId() {
      return STRIPE_PRICE_IDS.pro();
    },
  },
  {
    id: "business",
    name: "Business",
    description: "High-volume teams with advanced needs.",
    monthlyPrice: 19900,  // $199
    callLimit: 1000,
    features: [
      "Up to 1,000 calls/month",
      "Everything in Pro",
      "CRM webhook integration",
      "Priority support",
      "Custom AI greeting",
    ],
    get priceId() {
      return STRIPE_PRICE_IDS.business();
    },
  },
  {
    id: "elite",
    name: "Elite",
    description: "Enterprise-grade, no limits.",
    monthlyPrice: 34900,  // $349
    callLimit: null,
    features: [
      "Unlimited calls",
      "Everything in Business",
      "Dedicated onboarding",
      "SLA guarantee",
      "Custom integrations",
    ],
    get priceId() {
      return STRIPE_PRICE_IDS.elite();
    },
  },
];

export function getPlanById(id: StripePlan): PlanDetails {
  const plan = PLANS.find((p) => p.id === id);
  if (!plan) throw new Error(`Unknown plan: ${id}`);
  return plan;
}

// ---------------------------------------------------------------------------
// Stripe server client (API routes / Server Actions only)
// ---------------------------------------------------------------------------

let _stripe: Stripe | null = null;

/**
 * Returns a singleton Stripe instance for server-side usage.
 * Import and call this only in API routes or Server Actions.
 */
export function getStripe(): Stripe {
  if (_stripe) return _stripe;

  const secretKey = requireEnv("STRIPE_SECRET_KEY");

  _stripe = new Stripe(secretKey, {
    apiVersion: "2024-06-20",
    typescript: true,
    appInfo: {
      name: "CALLA",
      version: "0.1.0",
    },
  });

  return _stripe;
}

// ---------------------------------------------------------------------------
// Stripe browser client (Client Components)
// ---------------------------------------------------------------------------

import { loadStripe } from "@stripe/stripe-js";
import type { Stripe as StripeJs } from "@stripe/stripe-js";

let _stripeJs: Promise<StripeJs | null> | null = null;

/**
 * Lazily loads the Stripe.js browser client.
 * Use inside Client Components for Elements or redirectToCheckout.
 */
export function getStripeJs(): Promise<StripeJs | null> {
  if (_stripeJs) return _stripeJs;

  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!publishableKey) {
    console.error("Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");
    return Promise.resolve(null);
  }

  _stripeJs = loadStripe(publishableKey);
  return _stripeJs;
}

// ---------------------------------------------------------------------------
// Webhook helpers
// ---------------------------------------------------------------------------

/**
 * Constructs and verifies a Stripe webhook event.
 * Call this in your /api/webhooks/stripe route.
 */
export function constructWebhookEvent(
  body: string | Buffer,
  signature: string
): Stripe.Event {
  const webhookSecret = requireEnv("STRIPE_WEBHOOK_SECRET");
  return getStripe().webhooks.constructEvent(body, signature, webhookSecret);
}
