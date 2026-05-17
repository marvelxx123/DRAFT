"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createBrowserClient } from "@/lib/supabase";

interface FormState {
  businessName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export default function SignupPage() {
  const router = useRouter();
  const supabase = createBrowserClient();

  const [form, setForm] = useState<FormState>({
    businessName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function validate(): string | null {
    if (!form.businessName.trim()) return "Business name is required.";
    if (!form.email.trim()) return "Email address is required.";
    if (form.password.length < 8)
      return "Password must be at least 8 characters.";
    if (form.password !== form.confirmPassword)
      return "Passwords do not match.";
    return null;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      // 1. Create the Supabase auth user
      const { data: authData, error: signUpError } =
        await supabase.auth.signUp({
          email: form.email.trim().toLowerCase(),
          password: form.password,
          options: {
            // Pass business name through so the DB trigger / onboarding can use it
            data: { business_name: form.businessName.trim() },
          },
        });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      const user = authData.user;
      if (!user) {
        // Supabase returned no error but also no user — usually means
        // "email confirmation required". Redirect to a confirmation notice page.
        router.push("/check-email");
        return;
      }

      // 2. Insert the business row. RLS requires the user to be authenticated,
      //    which they now are (session was set by signUp).
      const { error: insertError } = await supabase
        .from("businesses")
        .insert({
          user_id: user.id,
          name: form.businessName.trim(),
          plan: "trial",
          calla_shield_enabled: true,
          voicemail_enabled: false,
        });

      if (insertError) {
        // Non-fatal: onboarding can re-create the row if needed.
        // Log it but don't block the user from continuing.
        console.error("[Signup] businesses insert error:", insertError.message);
      }

      // 3. Redirect to onboarding
      router.push("/onboarding");
      router.refresh();
    } catch (err) {
      console.error("[Signup] unexpected error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const isFormFilled =
    form.businessName && form.email && form.password && form.confirmPassword;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-cream px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <span className="text-4xl font-extrabold tracking-tight text-emerald-brand">
            CALLA
          </span>
          <p className="mt-2 text-sm text-gray-500">
            Set up your account in minutes.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-100">
          <h1 className="mb-6 text-xl font-semibold text-gray-900">
            Create your account
          </h1>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Business Name */}
            <div>
              <label htmlFor="businessName" className="label">
                Business name
              </label>
              <input
                id="businessName"
                name="businessName"
                type="text"
                autoComplete="organization"
                required
                value={form.businessName}
                onChange={handleChange}
                className="input"
                placeholder="Acme Plumbing Co."
                disabled={loading}
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="label">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={form.email}
                onChange={handleChange}
                className="input"
                placeholder="you@yourbusiness.com"
                disabled={loading}
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="label">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={form.password}
                onChange={handleChange}
                className="input"
                placeholder="Min. 8 characters"
                disabled={loading}
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="label">
                Confirm password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={form.confirmPassword}
                onChange={handleChange}
                className="input"
                placeholder="Re-enter your password"
                disabled={loading}
              />
            </div>

            {/* Error */}
            {error && (
              <div
                role="alert"
                className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200"
              >
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !isFormFilled}
              className="btn-primary w-full"
            >
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-gray-400">
            By signing up you agree to our{" "}
            <Link href="/terms" className="underline hover:text-gray-600">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="underline hover:text-gray-600">
              Privacy Policy
            </Link>
            .
          </p>
        </div>

        {/* Login link */}
        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-emerald-brand hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
