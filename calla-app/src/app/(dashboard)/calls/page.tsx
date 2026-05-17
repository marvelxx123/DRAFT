"use client";

import { useEffect, useState, useCallback } from "react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { createBrowserClient, type Call, type Sentiment } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SentimentFilter = Sentiment | "all";
type DatePreset = "today" | "7days" | "30days" | "custom";

interface FilterState {
  preset: DatePreset;
  from: string;
  to: string;
  sentiment: SentimentFilter;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds < 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m === 0 ? `${s}s` : `${m}m ${s}s`;
}

function sentimentConfig(sentiment: Call["sentiment"]) {
  switch (sentiment) {
    case "positive":
      return { emoji: "😊", label: "Positive", cls: "bg-green-50 text-green-700 ring-green-200" };
    case "negative":
      return { emoji: "😠", label: "Negative", cls: "bg-red-50 text-red-700 ring-red-200" };
    default:
      return { emoji: "😐", label: "Neutral", cls: "bg-gray-100 text-gray-500 ring-gray-200" };
  }
}

function isoDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function presetDates(preset: DatePreset): { from: string; to: string } {
  const today = new Date();
  switch (preset) {
    case "today":
      return { from: isoDate(today), to: isoDate(today) };
    case "7days":
      return { from: isoDate(subDays(today, 6)), to: isoDate(today) };
    case "30days":
      return { from: isoDate(subDays(today, 29)), to: isoDate(today) };
    default:
      return { from: isoDate(subDays(today, 6)), to: isoDate(today) };
  }
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function CallsPage() {
  const supabase = createBrowserClient();

  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);

  const todayDates = presetDates("7days");
  const [filters, setFilters] = useState<FilterState>({
    preset: "7days",
    from: todayDates.from,
    to: todayDates.to,
    sentiment: "all",
  });

  // Fetch business ID once
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("businesses")
        .select("id")
        .eq("user_id", user.id)
        .single()
        .then(({ data }) => {
          if (data) setBusinessId(data.id);
        });
    });
  }, [supabase]);

  const fetchCalls = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from("calls")
        .select("*")
        .eq("business_id", businessId)
        .gte("created_at", startOfDay(new Date(filters.from)).toISOString())
        .lte("created_at", endOfDay(new Date(filters.to)).toISOString())
        .order("created_at", { ascending: false });

      if (filters.sentiment !== "all") {
        query = query.eq("sentiment", filters.sentiment);
      }

      const { data, error: queryError } = await query;

      if (queryError) throw queryError;
      setCalls(data ?? []);
    } catch (err) {
      console.error("[Calls] fetch error:", err);
      setError("Failed to load calls. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [supabase, businessId, filters]);

  useEffect(() => {
    fetchCalls();
  }, [fetchCalls]);

  function handlePresetChange(preset: DatePreset) {
    if (preset === "custom") {
      setFilters((f) => ({ ...f, preset }));
      return;
    }
    const dates = presetDates(preset);
    setFilters((f) => ({ ...f, preset, ...dates }));
  }

  function handleSentimentChange(s: SentimentFilter) {
    setFilters((f) => ({ ...f, sentiment: s }));
  }

  const PRESETS: { label: string; value: DatePreset }[] = [
    { label: "Today", value: "today" },
    { label: "Last 7 days", value: "7days" },
    { label: "Last 30 days", value: "30days" },
    { label: "Custom", value: "custom" },
  ];

  const SENTIMENTS: { label: string; value: SentimentFilter }[] = [
    { label: "All", value: "all" },
    { label: "😊 Positive", value: "positive" },
    { label: "😐 Neutral", value: "neutral" },
    { label: "😠 Negative", value: "negative" },
  ];

  return (
    <div className="px-8 py-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Call Log</h1>
        <p className="mt-1 text-sm text-gray-500">
          Browse, search and filter every call CALLA has handled.
        </p>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Filters Bar                                                          */}
      {/* ------------------------------------------------------------------ */}
      <div className="mb-6 flex flex-wrap gap-4 items-end">
        {/* Date preset pills */}
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">
            Date range
          </p>
          <div className="flex rounded-lg overflow-hidden ring-1 ring-gray-200 bg-white">
            {PRESETS.map((p) => (
              <button
                key={p.value}
                onClick={() => handlePresetChange(p.value)}
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  filters.preset === p.value
                    ? "bg-emerald-brand text-cream"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom date inputs */}
        {filters.preset === "custom" && (
          <div className="flex gap-2 items-center">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                From
              </label>
              <input
                type="date"
                value={filters.from}
                max={filters.to}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, from: e.target.value }))
                }
                className="input text-sm py-2"
              />
            </div>
            <span className="text-gray-400 mt-5">—</span>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                To
              </label>
              <input
                type="date"
                value={filters.to}
                min={filters.from}
                max={isoDate(new Date())}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, to: e.target.value }))
                }
                className="input text-sm py-2"
              />
            </div>
          </div>
        )}

        {/* Sentiment filter */}
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">
            Sentiment
          </p>
          <div className="flex rounded-lg overflow-hidden ring-1 ring-gray-200 bg-white">
            {SENTIMENTS.map((s) => (
              <button
                key={s.value}
                onClick={() => handleSentimentChange(s.value)}
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  filters.sentiment === s.value
                    ? "bg-emerald-brand text-cream"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Result count */}
        {!loading && (
          <div className="ml-auto self-end pb-0.5 text-sm text-gray-400">
            {calls.length} {calls.length === 1 ? "call" : "calls"}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Error state                                                          */}
      {/* ------------------------------------------------------------------ */}
      {error && (
        <div className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
          {error}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Table                                                                */}
      {/* ------------------------------------------------------------------ */}
      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-brand border-t-transparent" />
          </div>
        ) : calls.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-5xl mb-4">🔍</div>
            <p className="font-medium text-gray-700">No calls found</p>
            <p className="mt-1 text-sm text-gray-400 max-w-xs">
              Try adjusting your filters or date range.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Caller
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Date &amp; Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Summary
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Sentiment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                    SHIELD
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {calls.map((call) => {
                  const s = sentimentConfig(call.sentiment);
                  return (
                    <tr
                      key={call.id}
                      className="hover:bg-gray-50/80 transition-colors"
                    >
                      <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                        {call.caller_number ?? (
                          <span className="text-gray-400">Unknown</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                        <div>
                          {format(new Date(call.created_at), "MMM d, yyyy")}
                        </div>
                        <div className="text-xs text-gray-400">
                          {format(new Date(call.created_at), "h:mm a")}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-500 whitespace-nowrap tabular-nums">
                        {formatDuration(call.duration_seconds)}
                      </td>
                      <td className="px-6 py-4 text-gray-600 max-w-xs">
                        <p className="truncate">
                          {call.summary ?? (
                            <span className="text-gray-300 italic">
                              No summary
                            </span>
                          )}
                        </p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${s.cls}`}
                        >
                          {s.emoji} {s.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {call.shield_sms_sent ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-brand ring-1 ring-emerald-200">
                            ✓ Sent
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
