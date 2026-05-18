"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ChangeEvent } from "react";
import { createBrowserClient } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type BusinessType =
  | "Hair Salon"
  | "Dental Office"
  | "Law Firm"
  | "HVAC/Plumbing"
  | "Real Estate"
  | "Other";

type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

interface DayHours {
  open: string;
  close: string;
  closed: boolean;
}

type BusinessHours = Record<DayKey, DayHours>;

interface OnboardingData {
  // Step 1 — Business Info
  businessName: string;
  businessType: BusinessType | "";
  cityZip: string;
  // Step 2 — Services
  services: string;
  // Step 3 — Business Hours
  hours: BusinessHours;
  // Step 4 — Phone Setup
  currentPhone: string;
  googleReviewLink: string;
  mobileNumber: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DAYS: { key: DayKey; label: string }[] = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
];

const BUSINESS_TYPES: BusinessType[] = [
  "Hair Salon",
  "Dental Office",
  "Law Firm",
  "HVAC/Plumbing",
  "Real Estate",
  "Other",
];

const DEFAULT_HOURS: BusinessHours = {
  mon: { open: "09:00", close: "18:00", closed: false },
  tue: { open: "09:00", close: "18:00", closed: false },
  wed: { open: "09:00", close: "18:00", closed: false },
  thu: { open: "09:00", close: "18:00", closed: false },
  fri: { open: "09:00", close: "18:00", closed: false },
  sat: { open: "09:00", close: "16:00", closed: false },
  sun: { open: "09:00", close: "17:00", closed: true },
};

interface PlanCard {
  id: "lite" | "pro" | "business";
  name: string;
  price: number;
  minutes: number;
  features: string[];
  badge?: string;
  priceEnvKey: string;
}

const PLANS: PlanCard[] = [
  {
    id: "lite",
    name: "CALLA Lite",
    price: 79,
    minutes: 100,
    features: ["100 min/month", "Basic FAQ answering", "Call summaries", "CALLA SHIELD free"],
    priceEnvKey: "NEXT_PUBLIC_STRIPE_PRICE_ID_LITE",
  },
  {
    id: "pro",
    name: "CALLA Pro",
    price: 149,
    minutes: 300,
    features: [
      "300 min/month",
      "Appointment booking",
      "Lead capture",
      "CRM integration",
      "CALLA SHIELD free",
    ],
    badge: "Most Popular",
    priceEnvKey: "NEXT_PUBLIC_STRIPE_PRICE_ID_PRO",
  },
  {
    id: "business",
    name: "CALLA Business",
    price: 249,
    minutes: 700,
    features: [
      "700 min/month",
      "Unlimited features",
      "Priority support",
      "Custom AI greeting",
      "CALLA SHIELD free",
    ],
    priceEnvKey: "NEXT_PUBLIC_STRIPE_PRICE_ID_BUSINESS",
  },
];

// Map plan id → Stripe price ID env var names (read at runtime on client)
const PRICE_ID_MAP: Record<string, string> = {
  lite: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_LITE ?? "",
  pro: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO ?? "",
  business: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_BUSINESS ?? "",
};

const TOTAL_STEPS = 5;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ProgressBar({ step }: { step: number }) {
  const pct = Math.round((step / TOTAL_STEPS) * 100);
  return (
    <div className="mb-10">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-500">
          Step {step} of {TOTAL_STEPS}
        </span>
        <span className="text-sm font-semibold text-emerald-brand">{pct}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-emerald-brand transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function StepHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-8">
      <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">{title}</h1>
      <p className="mt-2 text-base text-gray-500">{subtitle}</p>
    </div>
  );
}

function NavButtons({
  step,
  onBack,
  onNext,
  nextLabel,
  nextDisabled,
  loading,
}: {
  step: number;
  onBack: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  loading?: boolean;
}) {
  return (
    <div className="mt-10 flex items-center justify-between gap-4">
      {step > 1 ? (
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          className="btn-secondary px-6 py-3"
        >
          ← Back
        </button>
      ) : (
        <div />
      )}
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled || loading}
        className="btn-primary px-8 py-3 text-base"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <SpinnerIcon className="h-4 w-4 animate-spin" />
            Saving…
          </span>
        ) : (
          nextLabel ?? "Next →"
        )}
      </button>
    </div>
  );
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full
        border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2
        focus:ring-emerald-brand focus:ring-offset-2
        ${checked ? "bg-emerald-brand" : "bg-gray-200"}`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white
          shadow ring-0 transition duration-200
          ${checked ? "translate-x-5" : "translate-x-0"}`}
      />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Step components
// ---------------------------------------------------------------------------

function Step1BusinessInfo({
  data,
  onChange,
}: {
  data: OnboardingData;
  onChange: (patch: Partial<OnboardingData>) => void;
}) {
  return (
    <>
      <StepHeading
        title="Tell us about your business"
        subtitle="This helps ARIA introduce your business to every caller."
      />

      <div className="space-y-6">
        <div>
          <label htmlFor="businessName" className="label">
            Business name
          </label>
          <input
            id="businessName"
            type="text"
            className="input"
            value={data.businessName}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onChange({ businessName: e.target.value })
            }
            placeholder="Acme Hair Studio"
            autoFocus
          />
        </div>

        <div>
          <label htmlFor="businessType" className="label">
            Business type
          </label>
          <select
            id="businessType"
            className="input"
            value={data.businessType}
            onChange={(e) =>
              onChange({ businessType: e.target.value as BusinessType })
            }
          >
            <option value="">Select your business type…</option>
            {BUSINESS_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="cityZip" className="label">
            City or ZIP code
          </label>
          <input
            id="cityZip"
            type="text"
            className="input"
            value={data.cityZip}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onChange({ cityZip: e.target.value })
            }
            placeholder="Austin, TX or 78701"
          />
        </div>
      </div>
    </>
  );
}

function Step2Services({
  data,
  onChange,
}: {
  data: OnboardingData;
  onChange: (patch: Partial<OnboardingData>) => void;
}) {
  return (
    <>
      <StepHeading
        title="What services do you offer?"
        subtitle="ARIA will use this to answer questions from your callers."
      />

      <div>
        <label htmlFor="services" className="label">
          List your services
        </label>
        <textarea
          id="services"
          rows={6}
          className="input resize-none leading-relaxed"
          value={data.services}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
            onChange({ services: e.target.value })
          }
          placeholder="Haircuts, Color treatments, Highlights, Blowouts, Deep conditioning…"
        />
        <p className="mt-2 text-sm text-gray-400">
          Separate each service with a comma or new line. ARIA will use this to
          answer questions about what you offer.
        </p>
      </div>
    </>
  );
}

function Step3Hours({
  data,
  onChange,
}: {
  data: OnboardingData;
  onChange: (patch: Partial<OnboardingData>) => void;
}) {
  function updateDay(key: DayKey, patch: Partial<DayHours>) {
    onChange({
      hours: {
        ...data.hours,
        [key]: { ...data.hours[key], ...patch },
      },
    });
  }

  function copyMonFriHours() {
    const monHours = data.hours.mon;
    const updated: BusinessHours = { ...data.hours };
    const weekdays: DayKey[] = ["mon", "tue", "wed", "thu", "fri"];
    weekdays.forEach((d) => {
      updated[d] = { ...monHours, closed: false };
    });
    onChange({ hours: updated });
  }

  return (
    <>
      <StepHeading
        title="When are you open?"
        subtitle="ARIA will tell callers your exact hours and stop taking messages after hours."
      />

      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={copyMonFriHours}
          className="rounded-lg border border-emerald-brand px-4 py-2 text-sm font-medium
                     text-emerald-brand hover:bg-emerald-brand hover:text-cream transition-colors duration-150"
        >
          Copy Mon–Fri hours
        </button>
      </div>

      <div className="space-y-3">
        {DAYS.map(({ key, label }) => {
          const day = data.hours[key];
          return (
            <div
              key={key}
              className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:gap-4
                ${day.closed ? "border-gray-100 bg-gray-50" : "border-gray-200 bg-white"}`}
            >
              {/* Day label + toggle */}
              <div className="flex w-28 flex-shrink-0 items-center gap-3">
                <ToggleSwitch
                  checked={!day.closed}
                  onChange={(open) => updateDay(key, { closed: !open })}
                  label={`Toggle ${label}`}
                />
                <span
                  className={`text-sm font-medium ${
                    day.closed ? "text-gray-400" : "text-gray-800"
                  }`}
                >
                  {label.slice(0, 3)}
                </span>
              </div>

              {day.closed ? (
                <span className="text-sm text-gray-400 italic">Closed</span>
              ) : (
                <div className="flex flex-1 items-center gap-3">
                  <input
                    type="time"
                    value={day.open}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      updateDay(key, { open: e.target.value })
                    }
                    className="input w-auto flex-1"
                    aria-label={`${label} open time`}
                  />
                  <span className="text-sm text-gray-400">to</span>
                  <input
                    type="time"
                    value={day.close}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      updateDay(key, { close: e.target.value })
                    }
                    className="input w-auto flex-1"
                    aria-label={`${label} close time`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

function Step4PhoneSetup({
  data,
  onChange,
}: {
  data: OnboardingData;
  onChange: (patch: Partial<OnboardingData>) => void;
}) {
  return (
    <>
      <StepHeading
        title="Phone setup"
        subtitle="A few details so we can connect CALLA to your business."
      />

      <div className="space-y-6">
        <div>
          <label htmlFor="currentPhone" className="label">
            Your current business phone number
          </label>
          <input
            id="currentPhone"
            type="tel"
            className="input"
            value={data.currentPhone}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onChange({ currentPhone: e.target.value })
            }
            placeholder="(555) 123-4567"
          />
          <p className="mt-2 text-sm text-gray-400">
            We&rsquo;ll give you a CALLA number. Forward your old number to it
            — takes about 30 seconds.
          </p>
        </div>

        <div>
          <label htmlFor="googleReviewLink" className="label">
            Google review link{" "}
            <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <input
            id="googleReviewLink"
            type="url"
            className="input"
            value={data.googleReviewLink}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onChange({ googleReviewLink: e.target.value })
            }
            placeholder="https://g.page/r/…/review"
          />
          <p className="mt-2 text-sm text-gray-400">
            CALLA SHIELD will text happy callers this link to leave you a
            review.
          </p>
        </div>

        <div>
          <label htmlFor="mobileNumber" className="label">
            Your mobile number for CALLA alerts
          </label>
          <input
            id="mobileNumber"
            type="tel"
            className="input"
            value={data.mobileNumber}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onChange({ mobileNumber: e.target.value })
            }
            placeholder="(555) 987-6543"
          />
          <p className="mt-2 text-sm text-gray-400">
            CALLA SHIELD sends SMS alerts here when urgent calls come in or
            leads are captured.
          </p>
        </div>
      </div>
    </>
  );
}

function Step5ChoosePlan({
  onSelectPlan,
  loading,
  selectedPlan,
}: {
  onSelectPlan: (planId: PlanCard["id"]) => void;
  loading: boolean;
  selectedPlan: PlanCard["id"] | null;
}) {
  return (
    <>
      <StepHeading
        title="Choose your plan"
        subtitle="Start with a 7-day free trial. Cancel anytime."
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {PLANS.map((plan) => {
          const isSelected = selectedPlan === plan.id;
          const isPro = plan.id === "pro";

          return (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-2xl border-2 p-6 transition-all duration-150
                ${
                  isPro
                    ? "border-emerald-brand shadow-lg shadow-emerald-brand/10"
                    : "border-gray-200 hover:border-gray-300"
                }
                ${isSelected ? "ring-2 ring-gold-brand ring-offset-2" : ""}
              `}
            >
              {/* Badge */}
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-gold-brand px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-brand shadow-sm">
                    {plan.badge}
                  </span>
                </div>
              )}

              {/* Plan name */}
              <h2 className="text-lg font-bold text-gray-900">{plan.name}</h2>

              {/* Price */}
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-emerald-brand">
                  ${plan.price}
                </span>
                <span className="text-sm text-gray-400">/mo</span>
              </div>

              {/* Minutes */}
              <p className="mt-1 text-sm font-medium text-gray-500">
                {plan.minutes} minutes included
              </p>

              {/* Features */}
              <ul className="mt-5 flex-1 space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                    <CheckIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-brand" />
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <button
                type="button"
                disabled={loading}
                onClick={() => onSelectPlan(plan.id)}
                className={`mt-6 w-full rounded-lg py-3 text-sm font-semibold transition-colors duration-150
                  disabled:opacity-60 disabled:cursor-not-allowed
                  ${
                    isPro
                      ? "bg-emerald-brand text-cream hover:bg-emerald-brand-600"
                      : "border border-emerald-brand text-emerald-brand hover:bg-emerald-brand hover:text-cream"
                  }
                `}
              >
                {loading && isSelected ? (
                  <span className="flex items-center justify-center gap-2">
                    <SpinnerIcon className="h-4 w-4 animate-spin" />
                    Redirecting…
                  </span>
                ) : (
                  "Choose Plan →"
                )}
              </button>
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-center text-xs text-gray-400">
        All plans include CALLA SHIELD (reputation defense) at no extra cost.
        7-day free trial — no charge until your trial ends.
      </p>
    </>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
        clipRule="evenodd"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createBrowserClient();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanCard["id"] | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);

  const [data, setData] = useState<OnboardingData>({
    businessName: "",
    businessType: "",
    cityZip: "",
    services: "",
    hours: DEFAULT_HOURS,
    currentPhone: "",
    googleReviewLink: "",
    mobileNumber: "",
  });

  // Pre-fill business name from the authenticated user's business row
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session || cancelled) return;

      const { data: rawBiz } = await supabase
        .from("businesses")
        .select("id, name")
        .eq("user_id", session.user.id)
        .single();

      if (!rawBiz || cancelled) return;
      const biz = rawBiz as unknown as { id: string; name: string };
      setBusinessId(biz.id);
      setData((prev) => ({ ...prev, businessName: biz.name ?? prev.businessName }));
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  function patch(update: Partial<OnboardingData>) {
    setData((prev) => ({ ...prev, ...update }));
  }

  // ---------------------------------------------------------------------------
  // Validation per step
  // ---------------------------------------------------------------------------
  function canProceed(): boolean {
    switch (step) {
      case 1:
        return (
          data.businessName.trim().length > 0 &&
          data.businessType !== "" &&
          data.cityZip.trim().length > 0
        );
      case 2:
        return data.services.trim().length > 0;
      case 3:
        return true; // hours always valid (sun can be closed)
      case 4:
        return data.currentPhone.trim().length > 0 && data.mobileNumber.trim().length > 0;
      default:
        return true;
    }
  }

  // ---------------------------------------------------------------------------
  // Save onboarding data to Supabase
  // ---------------------------------------------------------------------------
  async function saveToSupabase(): Promise<string | null> {
    if (!businessId) return null;

    // Normalise services: split by comma or newline → unique trimmed strings
    const servicesArray = data.services
      .split(/[,\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    const updatePayload: Record<string, unknown> = {
      name: data.businessName.trim(),
      address: data.cityZip.trim(),
      services: servicesArray,
      business_hours: data.hours,
      original_number: data.currentPhone.trim() || null,
      calendar_url: data.googleReviewLink.trim() || null,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const table = (supabase as any).from("businesses");
    const { error: updateError } = await table
      .update(updatePayload)
      .eq("id", businessId);

    if (updateError) {
      console.error("[Onboarding] Supabase update error:", updateError.message);
      return updateError.message;
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // Step 5 — plan selected: save data, create Stripe session, redirect
  // ---------------------------------------------------------------------------
  async function handleSelectPlan(planId: PlanCard["id"]) {
    setError(null);
    setSelectedPlan(planId);
    setLoading(true);

    try {
      // 1. Save all onboarding data first
      const saveError = await saveToSupabase();
      if (saveError) {
        setError("Failed to save your info. Please try again.");
        setLoading(false);
        return;
      }

      if (!businessId) {
        setError("No business found. Please sign out and try again.");
        setLoading(false);
        return;
      }

      // 2. Resolve priceId
      const priceId = PRICE_ID_MAP[planId];
      if (!priceId) {
        setError("Plan configuration error. Please contact support.");
        setLoading(false);
        return;
      }

      // 3. Call /api/stripe/checkout
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, priceId, planName: planId }),
      });

      if (!response.ok) {
        const errData = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(errData.error ?? "Failed to create checkout session.");
        setLoading(false);
        return;
      }

      const { url } = (await response.json()) as { url?: string };
      if (!url) {
        setError("Invalid response from checkout. Please try again.");
        setLoading(false);
        return;
      }

      // 4. Redirect to Stripe Checkout
      window.location.href = url;
    } catch (err) {
      console.error("[Onboarding] handleSelectPlan error:", err);
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Navigation handlers
  // ---------------------------------------------------------------------------
  function handleNext() {
    if (!canProceed()) return;
    setError(null);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }

  function handleBack() {
    setError(null);
    setStep((s) => Math.max(s - 1, 1));
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <main className="min-h-screen bg-cream px-4 py-12">
      <div className="mx-auto w-full max-w-2xl">
        {/* Logo */}
        <div className="mb-8 text-center">
          <span className="text-3xl font-extrabold tracking-tight text-emerald-brand">
            CALLA
          </span>
        </div>

        {/* Progress */}
        <ProgressBar step={step} />

        {/* Card */}
        <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-100 sm:p-10">
          {/* Error banner */}
          {error && (
            <div
              role="alert"
              className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200"
            >
              {error}
            </div>
          )}

          {/* Step content */}
          {step === 1 && <Step1BusinessInfo data={data} onChange={patch} />}
          {step === 2 && <Step2Services data={data} onChange={patch} />}
          {step === 3 && <Step3Hours data={data} onChange={patch} />}
          {step === 4 && <Step4PhoneSetup data={data} onChange={patch} />}
          {step === 5 && (
            <Step5ChoosePlan
              onSelectPlan={handleSelectPlan}
              loading={loading}
              selectedPlan={selectedPlan}
            />
          )}

          {/* Nav buttons (not shown on step 5 — each plan card has its own CTA) */}
          {step < 5 && (
            <NavButtons
              step={step}
              onBack={handleBack}
              onNext={handleNext}
              nextDisabled={!canProceed()}
              loading={loading}
            />
          )}

          {/* Back button on step 5 */}
          {step === 5 && (
            <div className="mt-8 flex justify-start">
              <button
                type="button"
                onClick={handleBack}
                disabled={loading}
                className="btn-secondary px-6 py-3"
              >
                ← Back
              </button>
            </div>
          )}
        </div>

        {/* Footer note */}
        <p className="mt-6 text-center text-xs text-gray-400">
          Your data is encrypted and never shared.
        </p>
      </div>
    </main>
  );
}
