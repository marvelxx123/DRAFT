import { Suspense } from "react";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Supabase types for Company AI tables
// ---------------------------------------------------------------------------

export interface WeeklyPlan {
  id: string;
  created_at: string;
  week_start: string;
  weekly_goal: string;
  content_topics: string[];
  seo_target: string | null;
  outreach_segment: string | null;
  outreach_daily_volume: number | null;
}

export interface ContentPost {
  id: string;
  created_at: string;
  topic: string;
  format: "blog" | "instagram" | "twitter" | "linkedin";
  blog_body: string | null;
  social_caption: string | null;
  status: "ready" | "published";
}

export interface SEOReport {
  id: string;
  created_at: string;
  target_page: string;
  keyword_count: number | null;
  keywords: Array<{ keyword: string; intent: string }> | null;
  meta_title: string | null;
  meta_description: string | null;
  content_gaps: string[] | null;
  backlink_targets: string[] | null;
  hero_headline: string | null;
  subheadline: string | null;
  cta_text: string | null;
}

export interface OutreachItem {
  id: string;
  created_at: string;
  business_name: string;
  business_type: string | null;
  dm_copy: string | null;
  email_subject: string | null;
  email_body: string | null;
  status: "ready" | "sent";
  sent_at: string | null;
}

// ---------------------------------------------------------------------------
// Agent config (static display metadata)
// ---------------------------------------------------------------------------

const AGENTS = [
  {
    key: "marketing_manager",
    icon: "🧠",
    name: "Marketing Manager",
    description: "Orchestrates all marketing activities",
    lastRun: "Today, 6:00 AM",
    nextRun: "Tomorrow, 6:00 AM",
    outputLabel: "Plans generated",
    outputCount: 1,
    status: "active" as const,
  },
  {
    key: "content_agent",
    icon: "✍️",
    name: "Content Agent",
    description: "Writes blog posts and social content",
    lastRun: "Today, 6:15 AM",
    nextRun: "Tomorrow, 6:15 AM",
    outputLabel: "Posts created",
    outputCount: 4,
    status: "active" as const,
  },
  {
    key: "seo_agent",
    icon: "🔍",
    name: "SEO Agent",
    description: "Keyword research and on-page optimization",
    lastRun: "Today, 6:30 AM",
    nextRun: "Tomorrow, 6:30 AM",
    outputLabel: "Reports this week",
    outputCount: 1,
    status: "active" as const,
  },
  {
    key: "outreach_agent",
    icon: "📬",
    name: "Outreach Agent",
    description: "Builds and manages prospect pipeline",
    lastRun: "Today, 7:00 AM",
    nextRun: "Today, 5:00 PM",
    outputLabel: "Prospects queued",
    outputCount: 12,
    status: "scheduled" as const,
  },
];

// ---------------------------------------------------------------------------
// Helper components
// ---------------------------------------------------------------------------

function StatusDot({ status }: { status: "active" | "scheduled" | "error" }) {
  const classes = {
    active: "bg-green-500 shadow-green-500/50",
    scheduled: "bg-yellow-400 shadow-yellow-400/50",
    error: "bg-red-500 shadow-red-500/50",
  };
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full shadow-md ${classes[status]}`}
      aria-label={status}
    />
  );
}

function StatusBadge({ status }: { status: "active" | "scheduled" | "error" }) {
  const styles = {
    active: "bg-emerald-brand-50 text-emerald-brand-600 border-emerald-brand-100",
    scheduled: "bg-gold-brand-50 text-gold-brand-600 border-gold-brand-100",
    error: "bg-red-50 text-red-600 border-red-100",
  };
  const label = {
    active: "Active",
    scheduled: "Scheduled",
    error: "Error",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${styles[status]}`}
    >
      {label[status]}
    </span>
  );
}

function ContentStatusBadge({ status }: { status: "ready" | "published" }) {
  return status === "published" ? (
    <span className="inline-flex items-center rounded-full bg-emerald-brand-50 border border-emerald-brand-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-brand-600">
      Published
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-gold-brand-50 border border-gold-brand-100 px-2.5 py-0.5 text-xs font-semibold text-gold-brand-600">
      Ready
    </span>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100 animate-pulse">
      <div className="h-4 w-1/2 rounded bg-gray-200 mb-3" />
      <div className="h-3 w-3/4 rounded bg-gray-100 mb-2" />
      <div className="h-3 w-1/3 rounded bg-gray-100" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Agent status card
// ---------------------------------------------------------------------------

function AgentCard({
  icon,
  name,
  description,
  lastRun,
  nextRun,
  outputLabel,
  outputCount,
  status,
}: (typeof AGENTS)[number]) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl leading-none">{icon}</span>
          <div>
            <h3 className="font-semibold text-gray-900 leading-tight">{name}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusDot status={status} />
          <StatusBadge status={status} />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3 rounded-xl bg-gray-50 p-4">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400 mb-0.5">
            Last run
          </p>
          <p className="text-xs font-semibold text-gray-700">{lastRun}</p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400 mb-0.5">
            Next run
          </p>
          <p className="text-xs font-semibold text-gray-700">{nextRun}</p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400 mb-0.5">
            {outputLabel}
          </p>
          <p className="text-sm font-bold text-emerald-brand">{outputCount}</p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Weekly plan section (server-fetched)
// ---------------------------------------------------------------------------

async function WeeklyPlanSection() {
  const supabase = createServerClient();

  const { data: plan } = await supabase
    .from("weekly_plans")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!plan) {
    return (
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <p className="text-sm text-gray-400 italic">
          No weekly plan generated yet. The Marketing Manager will create one
          on next run.
        </p>
      </div>
    );
  }

  const p = plan as unknown as WeeklyPlan;

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">Weekly Goal</h3>
          <p className="text-sm text-gray-600 mt-1">{p.weekly_goal}</p>
        </div>
        <span className="text-xs text-gray-400">
          Week of{" "}
          {new Date(p.week_start).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Content topics */}
        <div className="rounded-xl bg-emerald-brand-50 border border-emerald-brand-100 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-brand-400 mb-2">
            Content Topics
          </p>
          {p.content_topics && p.content_topics.length > 0 ? (
            <ul className="space-y-1">
              {p.content_topics.map((t, i) => (
                <li key={i} className="text-xs text-emerald-brand font-medium flex items-start gap-1.5">
                  <span className="mt-0.5 text-emerald-brand-300">•</span>
                  {t}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-gray-400">None assigned</p>
          )}
        </div>

        {/* SEO target */}
        <div className="rounded-xl bg-gold-brand-50 border border-gold-brand-100 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gold-brand-500 mb-2">
            SEO Target
          </p>
          <p className="text-xs font-semibold text-gray-700">
            {p.seo_target ?? "Not set"}
          </p>
        </div>

        {/* Outreach segment */}
        <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
            Outreach Segment
          </p>
          <p className="text-xs font-semibold text-gray-700">
            {p.outreach_segment ?? "Not set"}
          </p>
        </div>

        {/* Outreach daily volume */}
        <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
            Daily Outreach
          </p>
          <p className="text-2xl font-extrabold text-emerald-brand">
            {p.outreach_daily_volume ?? "—"}
          </p>
          <p className="text-xs text-gray-400">prospects / day</p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Recent output tabs (server-fetched)
// ---------------------------------------------------------------------------

async function RecentOutputSection() {
  const supabase = createServerClient();

  const [contentRes, seoRes, outreachRes] = await Promise.all([
    supabase
      .from("content_posts")
      .select("id, created_at, topic, format, status")
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("seo_reports")
      .select("id, created_at, target_page, keyword_count")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("outreach_queue")
      .select("status")
      .in("status", ["ready", "sent"]),
  ]);

  const posts = (contentRes.data ?? []) as Pick<
    ContentPost,
    "id" | "created_at" | "topic" | "format" | "status"
  >[];
  const seoReport = seoRes.data as Pick<
    SEOReport,
    "id" | "created_at" | "target_page" | "keyword_count"
  > | null;
  const outreachItems = (outreachRes.data ?? []) as Pick<
    OutreachItem,
    "status"
  >[];
  const readyCount = outreachItems.filter((i) => i.status === "ready").length;
  const sentCount = outreachItems.filter((i) => i.status === "sent").length;

  return <RecentOutputTabs posts={posts} seoReport={seoReport} readyCount={readyCount} sentCount={sentCount} />;
}

// We embed a simple server-rendered tab layout (no client JS needed for display)
function RecentOutputTabs({
  posts,
  seoReport,
  readyCount,
  sentCount,
}: {
  posts: Pick<ContentPost, "id" | "created_at" | "topic" | "format" | "status">[];
  seoReport: Pick<SEOReport, "id" | "created_at" | "target_page" | "keyword_count"> | null;
  readyCount: number;
  sentCount: number;
}) {
  const formatLabel: Record<ContentPost["format"], string> = {
    blog: "Blog",
    instagram: "Instagram",
    twitter: "Twitter",
    linkedin: "LinkedIn",
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* Content */}
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <span>✍️</span> Content
          </h3>
          <Link
            href="/company/content"
            className="text-xs font-medium text-emerald-brand hover:underline"
          >
            View all →
          </Link>
        </div>
        {posts.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No posts yet.</p>
        ) : (
          <ul className="space-y-3">
            {posts.map((p) => (
              <li key={p.id} className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {p.topic}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatLabel[p.format]} ·{" "}
                    {new Date(p.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <ContentStatusBadge status={p.status} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* SEO */}
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <span>🔍</span> SEO
          </h3>
          <Link
            href="/company/seo"
            className="text-xs font-medium text-emerald-brand hover:underline"
          >
            View report →
          </Link>
        </div>
        {!seoReport ? (
          <p className="text-sm text-gray-400 italic">No report yet.</p>
        ) : (
          <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 space-y-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">
                Target page
              </p>
              <p className="text-sm font-semibold text-gray-800 break-all">
                {seoReport.target_page}
              </p>
            </div>
            <div className="flex gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">
                  Keywords
                </p>
                <p className="text-xl font-extrabold text-emerald-brand">
                  {seoReport.keyword_count ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">
                  Generated
                </p>
                <p className="text-xs font-semibold text-gray-600">
                  {new Date(seoReport.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Outreach */}
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <span>📬</span> Outreach
          </h3>
          <Link
            href="/company/outreach"
            className="text-xs font-medium text-emerald-brand hover:underline"
          >
            View pipeline →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-gold-brand-50 border border-gold-brand-100 p-4 text-center">
            <p className="text-3xl font-extrabold text-emerald-brand">
              {readyCount}
            </p>
            <p className="text-xs font-medium text-gold-brand-600 mt-1">
              Ready to send
            </p>
          </div>
          <div className="rounded-xl bg-emerald-brand-50 border border-emerald-brand-100 p-4 text-center">
            <p className="text-3xl font-extrabold text-emerald-brand">
              {sentCount}
            </p>
            <p className="text-xs font-medium text-emerald-brand-400 mt-1">
              Sent today
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function CompanyHQPage() {
  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <div className="bg-emerald-brand px-8 py-10">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-extrabold text-cream tracking-tight">
                CALLA Company HQ
              </h1>
              <p className="mt-1 text-white/70 text-sm font-medium">
                Your AI team is running the company.
              </p>
            </div>
            {/* Live indicator strip */}
            <div className="flex items-center gap-4 rounded-xl bg-white/10 px-4 py-2.5">
              <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">
                Live
              </span>
              {AGENTS.map((a) => (
                <div key={a.key} className="flex items-center gap-1.5">
                  <StatusDot status={a.status} />
                  <span className="text-xs text-white/80 font-medium">
                    {a.icon}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick nav */}
          <div className="mt-6 flex gap-3">
            {[
              { href: "/company/content", label: "✍️ Content", },
              { href: "/company/seo", label: "🔍 SEO" },
              { href: "/company/outreach", label: "📬 Outreach" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg bg-white/10 border border-white/20 px-4 py-2 text-sm font-semibold text-cream hover:bg-white/20 transition-colors duration-150"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-8 space-y-8">
        {/* Agent cards */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">
            Agent Status
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {AGENTS.map((agent) => (
              <AgentCard key={agent.key} {...agent} />
            ))}
          </div>
        </section>

        {/* Weekly plan */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">
            This Week&rsquo;s Plan
          </h2>
          <Suspense fallback={<SkeletonCard />}>
            <WeeklyPlanSection />
          </Suspense>
        </section>

        {/* Recent output */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">
            Recent Agent Output
          </h2>
          <Suspense
            fallback={
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </div>
            }
          >
            <RecentOutputSection />
          </Suspense>
        </section>
      </div>
    </div>
  );
}
