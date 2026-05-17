import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createServerClient, type Call } from "@/lib/supabase";
import { format, startOfDay, endOfDay } from "date-fns";

export const metadata: Metadata = {
  title: "Dashboard",
};

// ---------------------------------------------------------------------------
// Helper: format duration seconds → "1m 23s"
// ---------------------------------------------------------------------------
function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds < 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

// ---------------------------------------------------------------------------
// Helper: sentiment → display label + colour class
// ---------------------------------------------------------------------------
function sentimentBadge(sentiment: Call["sentiment"]) {
  switch (sentiment) {
    case "positive":
      return {
        emoji: "😊",
        label: "Positive",
        className: "bg-green-50 text-green-700 ring-green-200",
      };
    case "negative":
      return {
        emoji: "😠",
        label: "Negative",
        className: "bg-red-50 text-red-700 ring-red-200",
      };
    default:
      return {
        emoji: "😐",
        label: "Neutral",
        className: "bg-gray-100 text-gray-600 ring-gray-200",
      };
  }
}

// ---------------------------------------------------------------------------
// Stat card sub-component
// ---------------------------------------------------------------------------
interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: "emerald" | "gold" | "gray";
}

function StatCard({ label, value, sub, accent = "gray" }: StatCardProps) {
  const accentBar = {
    emerald: "bg-emerald-brand",
    gold: "bg-gold-brand",
    gray: "bg-gray-200",
  }[accent];

  return (
    <div className="stat-card relative overflow-hidden">
      <div className={`absolute left-0 top-0 h-full w-1 ${accentBar}`} />
      <p className="pl-3 text-xs font-medium uppercase tracking-wider text-gray-500">
        {label}
      </p>
      <p className="mt-2 pl-3 text-4xl font-bold text-gray-900">{value}</p>
      {sub && <p className="mt-1 pl-3 text-sm text-gray-400">{sub}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default async function DashboardPage() {
  const supabase = createServerClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  // Fetch the user's business
  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .select("id, name, phone_number, plan, calla_shield_enabled")
    .eq("user_id", session.user.id)
    .single();

  if (businessError || !business) {
    // Business not set up yet — send to onboarding
    redirect("/onboarding");
  }

  const now = new Date();
  const todayStart = startOfDay(now).toISOString();
  const todayEnd = endOfDay(now).toISOString();

  // Fetch today's calls
  const { data: todaysCalls, error: callsError } = await supabase
    .from("calls")
    .select("*")
    .eq("business_id", business.id)
    .gte("created_at", todayStart)
    .lte("created_at", todayEnd)
    .order("created_at", { ascending: false });

  // Fetch 10 most recent calls (for the activity list)
  const { data: recentCalls } = await supabase
    .from("calls")
    .select("*")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false })
    .limit(10);

  const calls = todaysCalls ?? [];
  const recent = recentCalls ?? [];

  const todayCount = calls.length;
  const reviewsPrompted = calls.filter((c) => c.review_prompted).length;
  const positiveToday = calls.filter((c) => c.sentiment === "positive").length;

  return (
    <div className="px-8 py-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Good{getTimeOfDay()}, {business.name.split(" ")[0]}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {format(now, "EEEE, MMMM d, yyyy")}
          </p>
        </div>
        {business.phone_number && (
          <div className="rounded-xl bg-emerald-brand px-4 py-3 text-right">
            <p className="text-xs font-medium text-white/60 uppercase tracking-wider">
              Your CALLA number
            </p>
            <p className="text-lg font-bold text-cream mt-0.5">
              {business.phone_number}
            </p>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Stat Cards                                                           */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-10">
        <StatCard
          label="Calls today"
          value={todayCount}
          sub="Since midnight"
          accent="emerald"
        />
        <StatCard
          label="Missed calls"
          value={0}
          sub="All calls answered"
          accent="gold"
        />
        <StatCard
          label="SHIELD reviews prompted"
          value={reviewsPrompted}
          sub="Today"
          accent="gold"
        />
        <StatCard
          label="Happy callers"
          value={positiveToday}
          sub="Positive sentiment today"
          accent="emerald"
        />
      </div>

      {callsError && (
        <div className="mb-6 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
          Could not load call data. Please refresh the page.
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Recent Calls                                                         */}
      {/* ------------------------------------------------------------------ */}
      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            Recent calls
          </h2>
          <a
            href="/calls"
            className="text-sm font-medium text-emerald-brand hover:underline"
          >
            View all
          </a>
        </div>

        {recent.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-5xl mb-4">📞</div>
            <p className="text-gray-700 font-medium">No calls yet</p>
            <p className="mt-1 text-sm text-gray-400 max-w-xs">
              Once you forward calls to your CALLA number, they&apos;ll appear
              here in real time.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                  Caller
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                  Summary
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                  Sentiment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                  SHIELD
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recent.map((call) => {
                const badge = sentimentBadge(call.sentiment);
                return (
                  <tr key={call.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                      {call.caller_number ?? "Unknown"}
                    </td>
                    <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                      {format(new Date(call.created_at), "h:mm a")}
                    </td>
                    <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                      {formatDuration(call.duration_seconds)}
                    </td>
                    <td className="px-6 py-4 text-gray-600 max-w-xs truncate">
                      {call.summary ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${badge.className}`}
                      >
                        {badge.emoji} {badge.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {call.shield_sms_sent ? (
                        <span className="text-emerald-brand font-medium">
                          ✓ Sent
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function getTimeOfDay(): string {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}
