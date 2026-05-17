import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { getStripe } from "@/lib/stripe";
import type { Database } from "@/lib/supabase";

export async function GET(): Promise<NextResponse> {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient<Database>({
    cookies: () => cookieStore,
  });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.redirect(
      new URL("/login", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
      { status: 302 }
    );
  }

  const { data: business, error } = await supabase
    .from("businesses")
    .select("stripe_customer_id")
    .eq("user_id", session.user.id)
    .single();

  if (error || !business?.stripe_customer_id) {
    return NextResponse.json(
      { error: "No billing account found. Please contact support." },
      { status: 404 }
    );
  }

  const stripe = getStripe();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: business.stripe_customer_id,
    return_url: `${appUrl}/settings`,
  });

  return NextResponse.redirect(portalSession.url, { status: 302 });
}
