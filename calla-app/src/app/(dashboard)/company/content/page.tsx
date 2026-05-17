"use client";

import { useEffect, useState, useCallback } from "react";
import { createBrowserClient } from "@/lib/supabase";
import type { ContentPost } from "../page";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type StatusFilter = "all" | "ready" | "published";
type FormatFilter = "all" | "blog" | "instagram" | "twitter" | "linkedin";

interface FullPost extends ContentPost {
  social_versions?: Array<{
    format: "instagram" | "twitter" | "linkedin";
    caption: string;
  }>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FORMAT_LABELS: Record<ContentPost["format"], string> = {
  blog: "Blog",
  instagram: "Instagram",
  twitter: "Twitter",
  linkedin: "LinkedIn",
};

const FORMAT_COLORS: Record<ContentPost["format"], string> = {
  blog: "bg-blue-50 text-blue-700 border-blue-100",
  instagram: "bg-pink-50 text-pink-700 border-pink-100",
  twitter: "bg-sky-50 text-sky-700 border-sky-100",
  linkedin: "bg-indigo-50 text-indigo-700 border-indigo-100",
};

function FormatBadge({ format }: { format: ContentPost["format"] }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${FORMAT_COLORS[format]}`}
    >
      {FORMAT_LABELS[format]}
    </span>
  );
}

function StatusBadge({ status }: { status: ContentPost["status"] }) {
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

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function SkeletonRow() {
  return (
    <div className="animate-pulse rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
      <div className="h-4 w-2/3 rounded bg-gray-200 mb-3" />
      <div className="h-3 w-1/3 rounded bg-gray-100" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Expanded post detail
// ---------------------------------------------------------------------------

function PostDetail({
  post,
  onClose,
  onMarkPublished,
}: {
  post: FullPost;
  onClose: () => void;
  onMarkPublished: (id: string) => Promise<void>;
}) {
  const [publishing, setPublishing] = useState(false);

  async function handlePublish() {
    setPublishing(true);
    await onMarkPublished(post.id);
    setPublishing(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl ring-1 ring-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <FormatBadge format={post.format} />
            <StatusBadge status={post.status} />
          </div>
          <div className="flex items-center gap-3">
            {post.status === "ready" && (
              <button
                onClick={handlePublish}
                disabled={publishing}
                className="btn-primary text-xs px-4 py-2 disabled:opacity-50"
              >
                {publishing ? "Marking…" : "Mark as Published"}
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              aria-label="Close"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-6 max-h-[70vh] overflow-y-auto">
          <h2 className="text-xl font-bold text-gray-900">{post.topic}</h2>
          <p className="text-xs text-gray-400">
            Created{" "}
            {new Date(post.created_at).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>

          {/* Blog body */}
          {post.blog_body && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                Blog Post
              </h3>
              <div className="rounded-xl bg-gray-50 border border-gray-100 p-5 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {post.blog_body}
              </div>
            </div>
          )}

          {/* Social caption */}
          {post.social_caption && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                Social Caption
              </h3>
              <div className="rounded-xl bg-gray-50 border border-gray-100 p-5 text-sm text-gray-700 whitespace-pre-wrap">
                {post.social_caption}
              </div>
            </div>
          )}

          {/* Social versions */}
          {post.social_versions && post.social_versions.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                All Social Versions
              </h3>
              <div className="space-y-3">
                {post.social_versions.map((v, i) => (
                  <div key={i} className="rounded-xl border border-gray-100 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FormatBadge format={v.format} />
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {v.caption}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Post card
// ---------------------------------------------------------------------------

function PostCard({
  post,
  onClick,
}: {
  post: ContentPost;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 hover:ring-emerald-brand hover:shadow-md transition-all duration-150 group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900 truncate group-hover:text-emerald-brand transition-colors">
            {post.topic}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {new Date(post.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <StatusBadge status={post.status} />
          <FormatBadge format={post.format} />
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-emerald-brand font-medium group-hover:underline">
          View full post →
        </span>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function ContentLibraryPage() {
  const [posts, setPosts] = useState<ContentPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [formatFilter, setFormatFilter] = useState<FormatFilter>("all");
  const [expandedPost, setExpandedPost] = useState<FullPost | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const supabase = createBrowserClient();

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("content_posts")
      .select("id, created_at, topic, format, blog_body, social_caption, status")
      .order("created_at", { ascending: false });

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }
    if (formatFilter !== "all") {
      query = query.eq("format", formatFilter);
    }

    const { data } = await query;
    setPosts((data as ContentPost[]) ?? []);
    setLoading(false);
  }, [statusFilter, formatFilter, supabase]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  async function handleOpenPost(post: ContentPost) {
    setLoadingDetail(true);
    // Fetch full detail including social_versions if stored separately
    const { data } = await supabase
      .from("content_posts")
      .select("*, social_versions(*)")
      .eq("id", post.id)
      .single();
    setExpandedPost(data != null ? (data as unknown as FullPost) : (post as unknown as FullPost));
    setLoadingDetail(false);
  }

  async function handleMarkPublished(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("content_posts")
      .update({ status: "published" })
      .eq("id", id);
    // Refresh list and update expanded
    setPosts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: "published" as const } : p))
    );
    if (expandedPost?.id === id) {
      setExpandedPost((prev) => prev ? { ...prev, status: "published" as const } : null);
    }
  }

  const filteredPosts = posts;

  return (
    <>
      {expandedPost && (
        <PostDetail
          post={expandedPost}
          onClose={() => setExpandedPost(null)}
          onMarkPublished={handleMarkPublished}
        />
      )}

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
              <span className="text-cream text-sm font-medium">Content Library</span>
            </div>
            <h1 className="text-2xl font-extrabold text-cream tracking-tight">
              ✍️ Content Library
            </h1>
            <p className="mt-1 text-white/70 text-sm">
              All posts created by your Content Agent.
            </p>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-8 py-8">
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            {/* Status filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Status:
              </span>
              {(["all", "ready", "published"] as StatusFilter[]).map((s) => (
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

            {/* Format filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Format:
              </span>
              {(["all", "blog", "instagram", "twitter", "linkedin"] as FormatFilter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFormatFilter(f)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold border transition-colors duration-150 ${
                    formatFilter === f
                      ? "bg-emerald-brand text-cream border-emerald-brand"
                      : "bg-white text-gray-600 border-gray-200 hover:border-emerald-brand hover:text-emerald-brand"
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Results count */}
          <p className="text-xs text-gray-400 mb-4">
            {loading ? "Loading…" : `${filteredPosts.length} post${filteredPosts.length !== 1 ? "s" : ""}`}
          </p>

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="rounded-2xl bg-white p-12 text-center shadow-sm ring-1 ring-gray-100">
              <p className="text-gray-400 italic text-sm">
                No posts match your filters.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onClick={() => handleOpenPost(post)}
                />
              ))}
            </div>
          )}

          {loadingDetail && (
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/20">
              <div className="rounded-2xl bg-white px-8 py-6 shadow-xl text-sm font-medium text-gray-700">
                Loading post…
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
