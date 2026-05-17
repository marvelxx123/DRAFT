"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ConfirmResult {
  success: boolean;
  businessName?: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Icon components
// ---------------------------------------------------------------------------

function CheckCircleIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-20 w-20 text-emerald-brand"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
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

function PhoneForwardIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6 text-emerald-brand"
      aria-hidden="true"
    >
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
      <path d="M21 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.36 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.11 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16.92z" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6 text-emerald-brand"
      aria-hidden="true"
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6 text-emerald-brand"
      aria-hidden="true"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Next-step cards
// ---------------------------------------------------------------------------

interface NextStepCard {
  icon: React.ReactNode;
  title: string;
  description: React.ReactNode;
}

function NextStepCards({ callaNumber }: { callaNumber?: string }) {
  const cards: NextStepCard[] = [
    {
      icon: <PhoneForwardIcon />,
      title: "Forward your old number",
      description: (
        <>
          Call your carrier and ask to forward calls to your new CALLA number.
          On most carriers this takes under 30 seconds — just dial{" "}
          <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono">
            *72
          </code>{" "}
          + your CALLA number.
        </>
      ),
    },
    {
      icon: <UsersIcon />,
      title: "Tell your team",
      description: (
        <>
          Let your staff know ARIA is live. Your CALLA number is{" "}
          {callaNumber ? (
            <span className="font-semibold text-emerald-brand">{callaNumber}</span>
          ) : (
            <span className="italic text-gray-400">being provisioned…</span>
          )}
          . Share it on your website and Google Business profile.
        </>
      ),
    },
    {
      icon: <EyeIcon />,
      title: "Watch CALLA work",
      description: (
        <>
          Head to your{" "}
          <Link
            href="/dashboard"
            className="font-semibold text-emerald-brand hover:underline"
          >
            dashboard
          </Link>{" "}
          to see every call ARIA handles, read transcripts, and track your
          review growth in real time.
        </>
      ),
    },
  ];

  return (
    <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
      {cards.map((card) => (
        <div
          key={card.title}
          className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
        >
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-brand/10">
            {card.icon}
          </div>
          <h3 className="mb-2 text-sm font-bold text-gray-900">{card.title}</h3>
          <p className="text-sm leading-relaxed text-gray-500">{card.description}</p>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main success content (needs useSearchParams — must be in Suspense)
// ---------------------------------------------------------------------------

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const [businessName, setBusinessName] = useState<string | null>(null);
  const [callaNumber, setCallaNumber] = useState<string | undefined>();
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [redirectCount, setRedirectCount] = useState(3);
  const hasConfirmed = useRef(false);

  // ---------------------------------------------------------------------------
  // On mount: call confirm endpoint, then count down to dashboard redirect
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!sessionId || hasConfirmed.current) return;
    hasConfirmed.current = true;

    (async () => {
      try {
        const res = await fetch(
          `/api/stripe/checkout/confirm?session_id=${encodeURIComponent(sessionId)}`
        );
        const json = (await res.json()) as ConfirmResult & {
          callaNumber?: string;
        };

        if (!res.ok || !json.success) {
          console.error("[Success] Confirm failed:", json.error);
          setConfirmError(json.error ?? "Verification failed.");
        } else {
          setBusinessName(json.businessName ?? null);
          setCallaNumber(json.callaNumber);
        }
      } catch (err) {
        console.error("[Success] Confirm fetch error:", err);
        setConfirmError("Could not verify payment. Your account is being reviewed.");
      }
    })();
  }, [sessionId]);

  // Auto-redirect countdown
  useEffect(() => {
    if (redirectCount <= 0) {
      router.push("/dashboard");
      return;
    }
    const timer = setTimeout(() => setRedirectCount((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [redirectCount, router]);

  return (
    <main className="min-h-screen bg-cream px-4 py-16">
      <div className="mx-auto max-w-2xl">
        {/* Hero section */}
        <div className="rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-gray-100">
          {/* Animated checkmark */}
          <div
            className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full
                        bg-emerald-brand/10 animate-[pulse_2s_ease-in-out_3]"
          >
            <CheckCircleIcon />
          </div>

          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            You&rsquo;re in! 🎉
          </h1>

          {businessName && (
            <p className="mt-2 text-base text-gray-500">
              Welcome to CALLA,{" "}
              <span className="font-semibold text-gray-800">{businessName}</span>
              !
            </p>
          )}

          {/* Phone provisioning status */}
          <div className="mt-6 flex items-center justify-center gap-3 rounded-xl bg-emerald-brand/5 px-6 py-4">
            <SpinnerIcon className="h-5 w-5 animate-spin text-emerald-brand" />
            <p className="text-sm font-medium text-emerald-brand">
              Your CALLA number is being set up…
            </p>
          </div>

          <p className="mt-4 text-sm text-gray-400">
            You&rsquo;ll receive an SMS with your CALLA number in the next 2 minutes.
          </p>

          {/* Error state */}
          {confirmError && (
            <div
              role="alert"
              className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700 ring-1 ring-amber-200"
            >
              {confirmError} — Your subscription is active; we&rsquo;ll follow up via
              email.
            </div>
          )}

          {/* Redirect countdown */}
          <p className="mt-6 text-xs text-gray-400">
            Redirecting to your dashboard in{" "}
            <span className="font-semibold text-gray-600">{redirectCount}s</span>
            …{" "}
            <Link
              href="/dashboard"
              className="font-medium text-emerald-brand hover:underline"
            >
              Go now →
            </Link>
          </p>
        </div>

        {/* Next-step cards */}
        <NextStepCards callaNumber={callaNumber} />
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Page export — wraps in Suspense so useSearchParams() works at build time
// ---------------------------------------------------------------------------

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-cream">
          <SpinnerIcon className="h-10 w-10 animate-spin text-emerald-brand" />
        </main>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
