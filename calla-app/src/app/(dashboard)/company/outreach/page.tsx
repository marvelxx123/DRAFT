"use client";

import { useEffect, useState, useCallback } from "react";
import { createBrowserClient } from "@/lib/supabase";
import type { OutreachItem } from "../page";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type StatusFilter = "all" | "ready" | "sent";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: OutreachItem["status"] }) {
  return status === "sent" ? (
    <span className="inline-flex items-center rounded-full bg-emerald-brand-50 border border-emerald-brand-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-brand-600">
      Sent
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-gold-brand-50 border border-gold-brand-100 px-2.5 py-0.5 text-xs font-semibold text-gold-brand-600">
      Ready
    </span>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for non-secure context
    }
  }

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all duration-150 ${
        copied
          ? "border-emerald-brand bg-emerald-brand text-cream"
          : "border-gray-200 bg-white text-gray-600 hover:border-emerald-brand hover:text-emerald-brand"
      }`}
    >
      {copied ? (
        <>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-3.5 w-3.5">
            <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Copied!
        </>
      ) : (
        <>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {label}
        </>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      <td className="px-4 py-4">
        <div className="h-3.5 w-32 rounded bg-gray-200" />
        <div className="h-3 w-20 rounded bg-gray-100 mt-1.5" />
      </td>
      <td className="px-4 py-4">
        <div className="h-3 w-40 rounded bg-gray-200" />
        <div className="h-3 w-28 rounded bg-gray-100 mt-1.5" />
      </td>
      <td className="px-4 py-4">
        <div className="h-3 w-36 rounded bg-gray-200" />
      </td>
      <td className="px-4 py-4">
        <div className="h-6 w-14 rounded-full bg-gray-200" />
      </td>
      <td className="px-4 py-4">
        <div className="h-3 w-20 rounded bg-gray-200" />
      </td>
      <td className="px-4 py-4">
        <div className="flex gap-2">
          <div className="h-7 w-20 rounded-lg bg-gray-200" />
          <div className="h-7 w-24 rounded-lg bg-gray-200" />
        </div>
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function OutreachPipelinePage() {
  const [items, setItems] = useState<OutreachItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const supabase = createBrowserClient();

  const fetchItems = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("outreach_queue")
      .select(
        "id, created_at, business_name, business_type, dm_copy, email_subject, email_body, status, sent_at"
      )
      .order("created_at", { ascending: false });

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    const { data } = await query;
    setItems((data as OutreachItem[]) ?? []);
    setLoading(false);
  }, [statusFilter, supabase]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const totalProspects = items.length;
  const contactedThisWeek = items.filter((i) => {
    if (i.status !== "sent" || !i.sent_at) return false;
    const sentDate = new Date(i.sent_at);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return sentDate >= weekAgo;
  }).length;

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <div className="bg-emerald-brand px-8 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <a
              href="/company"
              className="text-white/50 text-sm hover:text-white/80 transition-colors"
            >
              Company HQ
            </a>
            <span className="text-white/30">/</span>
            <span className="text-cream text-sm font-medium">Outreach Pipeline</span>
          </div>
          <h1 className="text-2xl font-extrabold text-cream tracking-tight">
            📬 Outreach Pipeline
          </h1>
          <p className="mt-1 text-white/70 text-sm">
            Prospect queue managed by your Outreach Agent.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-8 space-y-6">
        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 text-center">
            <p className="text-3xl font-extrabold text-emerald-brand">
              {loading ? "—" : totalProspects}
            </p>
            <p className="text-xs font-semibold text-gray-500 mt-1 uppercase tracking-wider">
              Total Prospects
            </p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 text-center">
            <p className="text-3xl font-extrabold text-emerald-brand">
              {loading ? "—" : contactedThisWeek}
            </p>
            <p className="text-xs font-semibold text-gray-500 mt-1 uppercase tracking-wider">
              Contacted This Week
            </p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 text-center">
            <p className="text-3xl font-extrabold text-gold-brand">—</p>
            <p className="text-xs font-semibold text-gray-500 mt-1 uppercase tracking-wider">
              Response Rate
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">Coming soon</p>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Status:
            </span>
            {(["all", "ready", "sent"] as StatusFilter[]).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold border transition-colors duration-150 ${
                  statusFilter === s
                    ? "bg-emerald-brand text-cream border-emerald-brand"
                    : "bg-white text-gray-600 border-gray-200 hover:border-emerald-brand hover:text-emerald-brand"
                }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400">
            {loading ? "Loading…" : `${items.length} prospect${items.length !== 1 ? "s" : ""}`}
          </p>
        </div>

        {/* Table */}
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Business
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    DM Preview
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Email Subject
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Sent
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-400 italic">
                      No prospects in queue.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50/60 transition-colors duration-100"
                    >
                      {/* Business */}
                      <td className="px-4 py-4 min-w-[160px]">
                        <p className="font-semibold text-gray-900">
                          {item.business_name}
                        </p>
                        {item.business_type && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            {item.business_type}
                          </p>
                        )}
                      </td>

                      {/* DM preview */}
                      <td className="px-4 py-4 min-w-[220px]">
                        {item.dm_copy ? (
                          <p className="text-gray-600 text-xs line-clamp-2 max-w-xs">
                            {item.dm_copy}
                          </p>
                        ) : (
                          <span className="text-gray-300 text-xs italic">—</span>
                        )}
                      </td>

                      {/* Email subject */}
                      <td className="px-4 py-4 min-w-[200px]">
                        {item.email_subject ? (
                          <p className="text-gray-700 text-xs font-medium truncate max-w-[200px]">
                            {item.email_subject}
                          </p>
                        ) : (
                          <span className="text-gray-300 text-xs italic">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4">
                        <StatusBadge status={item.status} />
                      </td>

                      {/* Sent date */}
                      <td className="px-4 py-4 text-xs text-gray-400 whitespace-nowrap">
                        {item.sent_at
                          ? new Date(item.sent_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })
                          : "—"}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          {item.dm_copy && (
                            <CopyButton text={item.dm_copy} label="Copy DM" />
                          )}
                          {item.email_subject && item.email_body && (
                            <CopyButton
                              text={`Subject: ${item.email_subject}\n\n${item.email_body}`}
                              label="Copy Email"
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
