import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// Supabase Dashboard > Edge Functions > Secrets:
//   STRIPE_SECRET_KEY  — from dashboard.stripe.com/apikeys
//   STRIPE_PRICE_ID    — from dashboard.stripe.com/products (the recurring price ID)

const STRIPE_SECRET = Deno.env.get("STRIPE_SECRET_KEY") ?? ""
const PRICE_ID      = Deno.env.get("STRIPE_PRICE_ID") ?? ""

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors })

  try {
    const { user_id, return_url } = await req.json()
    if (!STRIPE_SECRET) throw new Error("STRIPE_SECRET_KEY not configured")
    if (!PRICE_ID)      throw new Error("STRIPE_PRICE_ID not configured")

    const body = new URLSearchParams({
      "mode":                      "subscription",
      "line_items[0][price]":      PRICE_ID,
      "line_items[0][quantity]":   "1",
      "success_url":               `${return_url}?success=true&session_id={CHECKOUT_SESSION_ID}`,
      "cancel_url":                `${return_url}?canceled=true`,
      "metadata[user_id]":         user_id,
    })

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization":  `Bearer ${STRIPE_SECRET}`,
        "Content-Type":   "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    })

    if (!res.ok) throw new Error(await res.text())
    const session = await res.json()

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...cors, "Content-Type": "application/json" },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    })
  }
})
