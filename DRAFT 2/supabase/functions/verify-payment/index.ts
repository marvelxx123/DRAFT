import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const STRIPE_SECRET        = Deno.env.get("STRIPE_SECRET_KEY") ?? ""
const SUPABASE_URL         = Deno.env.get("SUPABASE_URL") ?? ""
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors })

  try {
    const { session_id, user_id } = await req.json()

    const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${session_id}`, {
      headers: { "Authorization": `Bearer ${STRIPE_SECRET}` },
    })

    if (!res.ok) throw new Error("Could not verify Stripe session")
    const session = await res.json()

    if (session.payment_status === "paid" || session.status === "complete") {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
      await supabase.from("profiles").update({ scout_pro: true }).eq("id", user_id)
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...cors, "Content-Type": "application/json" },
      })
    }

    throw new Error("Payment not completed")
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    })
  }
})
