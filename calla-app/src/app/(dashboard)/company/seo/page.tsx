import { Suspense } from "react";
import { createServerClient } from "@/lib/supabase";
import type { SEOReport } from "../page";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type KeywordIntent = "informational" | "commercial" | "transactional" | string;

interface Keyword {
  keyword: string;
  intent: KeywordIntent;
  volume?: number | null;
  difficulty?: number | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function IntentBadge({ intent }: { intent: KeywordIntent }) {
  const styles: Record<string, string> = {
    informational: "bg-blue-50 text-blue-700 border-blue-100",
    commercial: "bg-gold-brand-50 text-gold-brand-600 border-gold-brand-100",
    transactional: "bg-emerald-brand-50 text-emerald-brand-600 border-emerald-brand-100",
  };
  const style = styles[intent.toLowerCase()] ?? "bg-gray-50 text-gray-600 border-gray-100";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${style}`}>
      {intent}
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (typeof navigator !== "undefined") {
          navigator.clipboard.writeText(text).catch(() => {});
        }
      }}
    >
      <button
        type="submit"
        className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:border-emerald-brand hover:text-emerald-brand transition-colors duration-150"
      >
        Copy
      </button>
    </form>
  );
}

function SkeletonBlock({ h = "h-4", w = "w-full" }: { h?: string; w?: string }) {
  return <div className={`animate-pulse rounded bg-gray-200 ${h} ${w}`} />;
}

// ---------------------------------------------------------------------------
// Main data section (server)
// ---------------------------------------------------------------------------

async function SEOContent() {
  const supabase = createServerClient();

  const { data: report } = await supabase
    .from("seo_reports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!report) {
    return (
      <div className="rounded-2xl bg-white p-12 text-center shadow-sm ring-1 ring-gray-100">
        <p className="text-gray-400 italic text-sm">
          No SEO reports yet. The SEO Agent will generate one on its next run.
        </p>
      </div>
    );
  }

  const r = report as unknown as SEOReport;
  const keywords: Keyword[] = (r.keywords as Keyword[]) ?? [];
  const contentGaps = r.content_gaps ?? [];
  const backlinkTargets = r.backlink_targets ?? [];

  return (
    <div className="space-y-8">
      {/* Report overview card */}
      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden">
        {/* Gold accent bar */}
        <div className="h-1.5 bg-gold-brand" />
        <div className="p-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
              Target Page
            </p>
            <p className="text-sm font-semibold text-gray-900 break-all">
              {r.target_page}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
              Keywords Found
            </p>
            <p className="text-3xl font-extrabold text-emerald-brand">
              {r.keyword_count ?? keywords.length}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
              Content Gaps
            </p>
            <p className="text-3xl font-extrabold text-emerald-brand">
              {contentGaps.length}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
              Generated
            </p>
            <p className="text-sm font-semibold text-gray-700">
              {new Date(r.created_at).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
        </div>

        {/* Meta suggestions */}
        {(r.meta_title || r.meta_description) && (
          <div className="border-t border-gray-100 px-6 py-5 bg-gray-50 grid gap-4 sm:grid-cols-2">
            {r.meta_title && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                  Suggested Meta Title
                </p>
                <p className="text-sm text-gray-700 font-medium">{r.meta_title}</p>
              </div>
            )}
            {r.meta_description && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                  Suggested Meta Description
                </p>
                <p className="text-sm text-gray-600">{r.meta_description}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Keywords table */}
      {keywords.length > 0 && (
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">
            Keywords
          </h2>
          <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      Keyword
                    </th>
                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      Intent
                    </th>
                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      Volume
                    </th>
                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      Difficulty
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {keywords.map((kw, i) => (
                    <tr key={i} className="hover:bg-gray-50/60 transition-colors duration-100">
                      <td className="px-5 py-3 font-medium text-gray-900">
                        {kw.keyword}
                      </td>
                      <td className="px-5 py-3">
                        <IntentBadge intent={kw.intent} />
                      </td>
                      <td className="px-5 py-3 text-gray-500">
                        {kw.volume != null ? kw.volume.toLocaleString() : "—"}
                      </td>
                      <td className="px-5 py-3">
                        {kw.difficulty != null ? (
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-20 rounded-full bg-gray-100 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  kw.difficulty < 30
                                    ? "bg-emerald-brand-300"
                                    : kw.difficulty < 60
                                    ? "bg-gold-brand"
                                    : "bg-red-400"
                                }`}
                                style={{ width: `${Math.min(kw.difficulty, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500">{kw.difficulty}</span>
                          </div>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* Two-column: Content gaps + Backlink targets */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Content gaps */}
        {contentGaps.length > 0 && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">
              Content Gaps
            </h2>
            <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 p-5 space-y-2">
              {contentGaps.map((gap, i) => (
                <label
                  key={i}
                  className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group"
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-emerald-brand focus:ring-emerald-brand focus:ring-offset-0 cursor-pointer"
                  />
                  <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors leading-snug">
                    {gap}
                  </span>
                </label>
              ))}
            </div>
          </section>
        )}

        {/* Backlink targets */}
        {backlinkTargets.length > 0 && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">
              Backlink Targets
            </h2>
            <div className="space-y-3">
              {backlinkTargets.map((target, i) => (
                <div
                  key={i}
                  className="rounded-xl bg-white shadow-sm ring-1 ring-gray-100 px-4 py-3 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-brand-50 border border-emerald-brand-100">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-4 w-4 text-emerald-brand">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {target}
                    </p>
                  </div>
                  <a
                    href={target.startsWith("http") ? target : `https://${target}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:border-emerald-brand hover:text-emerald-brand transition-colors duration-150"
                  >
                    Visit →
                  </a>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Copy suggestions */}
      {(r.hero_headline || r.subheadline || r.cta_text) && (
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">
            Copy Suggestions
          </h2>
          <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 divide-y divide-gray-100 overflow-hidden">
            {r.hero_headline && (
              <div className="px-6 py-5 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gold-brand-500 mb-1">
                    Hero Headline
                  </p>
                  <p className="text-lg font-bold text-gray-900">{r.hero_headline}</p>
                </div>
                <CopyButton text={r.hero_headline} />
              </div>
            )}
            {r.subheadline && (
              <div className="px-6 py-5 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                    Subheadline
                  </p>
                  <p className="text-base text-gray-700">{r.subheadline}</p>
                </div>
                <CopyButton text={r.subheadline} />
              </div>
            )}
            {r.cta_text && (
              <div className="px-6 py-5 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                    CTA Text
                  </p>
                  <p className="inline-flex items-center rounded-xl bg-emerald-brand px-5 py-2.5 text-sm font-bold text-cream">
                    {r.cta_text}
                  </p>
                </div>
                <CopyButton text={r.cta_text} />
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function SEOSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 p-6">
        <div className="grid grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <SkeletonBlock h="h-2.5" w="w-24" />
              <SkeletonBlock h="h-8" w="w-16" />
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 p-6 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <SkeletonBlock h="h-4" w="w-48" />
            <SkeletonBlock h="h-4" w="w-24" />
            <SkeletonBlock h="h-4" w="w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SEOReportsPage() {
  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <div className="bg-emerald-brand px-8 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <a
              href="/company"
              className="text-white/50 text-sm hover:text-white/80 transition-colors"
            >
              Company HQ
            </a>
            <span className="text-white/30">/</span>
            <span className="text-cream text-sm font-medium">SEO Reports</span>
          </div>
          <h1 className="text-2xl font-extrabold text-cream tracking-tight">
            🔍 SEO Reports
          </h1>
          <p className="mt-1 text-white/70 text-sm">
            Latest analysis from your SEO Agent.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-8">
        <Suspense fallback={<SEOSkeleton />}>
          <SEOContent />
        </Suspense>
      </div>
    </div>
  );
}
