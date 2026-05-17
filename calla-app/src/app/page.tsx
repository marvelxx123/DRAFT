import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase";

/**
 * Root page — stateless redirect gate.
 * Authenticated  → /dashboard
 * Unauthenticated → /login
 *
 * This is a Server Component so we can read the session securely
 * without a client-side flash.
 */
export default async function RootPage() {
  const supabase = createServerClient();

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  // On Supabase auth errors (e.g. misconfigured env), fall back to login
  // rather than crashing the app.
  if (error) {
    console.error("[RootPage] auth.getSession error:", error.message);
    redirect("/login");
  }

  if (session) {
    redirect("/dashboard");
  } else {
    redirect("/login");
  }
}
