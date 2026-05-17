import Anthropic from "@anthropic-ai/sdk";
import type { GetStepTools } from "inngest";
import { inngest } from "@/lib/inngest";
import { createAdminClient } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface KeywordEntry {
  keyword: string;
  intent: "informational" | "commercial" | "transactional";
  monthly_searches_estimate: string;
  difficulty: "low" | "medium" | "high";
  notes: string;
}

interface InternalLinkSuggestion {
  from_page: string;
  to_page: string;
  anchor_text: string;
  reason: string;
}

interface BacklinkTarget {
  site_type: string;
  example_angle: string;
  outreach_hook: string;
}

interface SEOReport {
  target_page: string;
  keywords: KeywordEntry[];
  meta_title: string;
  meta_description: string;
  internal_links: InternalLinkSuggestion[];
  content_gaps: string[];
  backlink_targets: BacklinkTarget[];
}

interface CopySuggestion {
  page: string;
  hero_headline: string;
  hero_subheadline: string;
  cta_text: string;
}

// ---------------------------------------------------------------------------
// Claude system prompt
// ---------------------------------------------------------------------------

const SEO_EXPERT_SYSTEM_PROMPT = `You are the SEO expert for CALLA, an AI phone answering service for small businesses.

CALLA's target customers: hair salons, beauty studios, dental offices, law firms, HVAC companies.
CALLA's killer feature: CALLA SHIELD — free post-call SMS + sentiment detection + Google review prompting.

Your job: generate actionable SEO recommendations for CALLA's website pages. Focus on:
- Local SEO for small business owners searching for answering services
- Long-tail keywords that show commercial or transactional intent
- Content gaps that CALLA's competitors are missing
- Link-building angles that are genuinely achievable

Return ONLY valid JSON with no surrounding text.`;

// ---------------------------------------------------------------------------
// Generate SEO report
// ---------------------------------------------------------------------------

async function generateSEOReport(
  anthropic: Anthropic,
  targetPage: string,
  keyMessage: string
): Promise<SEOReport> {
  const userMessage = `
Generate a comprehensive SEO report for this CALLA website page: "${targetPage}"

Key message this week: ${keyMessage}

Return a JSON object with exactly this structure:

{
  "target_page": "${targetPage}",
  "keywords": [
    {
      "keyword": "exact keyword phrase",
      "intent": "informational | commercial | transactional",
      "monthly_searches_estimate": "e.g. 500-1000/mo",
      "difficulty": "low | medium | high",
      "notes": "why this keyword matters for CALLA"
    }
  ],
  "meta_title": "Optimized meta title under 60 characters including primary keyword",
  "meta_description": "Compelling meta description under 160 characters with primary keyword and value prop",
  "internal_links": [
    {
      "from_page": "which CALLA page should link here",
      "to_page": "${targetPage}",
      "anchor_text": "natural anchor text to use",
      "reason": "why this internal link matters for SEO"
    }
  ],
  "content_gaps": [
    "Topic this page is missing that competitors cover",
    "Question potential customers ask that isn't answered",
    "Feature or benefit that should be highlighted more"
  ],
  "backlink_targets": [
    {
      "site_type": "type of website that should link to CALLA",
      "example_angle": "specific angle or story pitch",
      "outreach_hook": "the opening line of an outreach email"
    }
  ]
}

Provide exactly 10 keywords, exactly 3 internal link suggestions, exactly 5 content gaps, and exactly 3 backlink targets.
Focus on keywords that small business owners in the US actually search for.
`.trim();

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 3000,
    system: SEO_EXPERT_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude returned no text for SEO report");
  }

  const raw = textBlock.text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  return JSON.parse(raw) as SEOReport;
}

// ---------------------------------------------------------------------------
// Generate hero copy for landing/homepage
// ---------------------------------------------------------------------------

async function generateHeroCopy(
  anthropic: Anthropic,
  targetPage: string,
  keyMessage: string
): Promise<CopySuggestion> {
  const userMessage = `
Generate updated hero section copy for the CALLA "${targetPage}" page.

Key message this week: ${keyMessage}
Target audience: small business owners who are missing calls and want to look more professional.

Return a JSON object:
{
  "page": "${targetPage}",
  "hero_headline": "Punchy headline under 10 words that speaks to the pain of missed calls",
  "hero_subheadline": "2-sentence subheadline that explains CALLA SHIELD and the core benefit, under 30 words",
  "cta_text": "CTA button text, action-oriented, under 6 words"
}

Write for small business owners, not tech enthusiasts. Make them feel the pain and the relief.
`.trim();

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    system: SEO_EXPERT_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude returned no text for hero copy");
  }

  const raw = textBlock.text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  return JSON.parse(raw) as CopySuggestion;
}

// ---------------------------------------------------------------------------
// Inngest function — runs Monday at 11am + triggered by marketing manager
// ---------------------------------------------------------------------------

export const seoAgentScheduled = inngest.createFunction(
  {
    id: "seo-agent-scheduled",
    name: "AI SEO Expert — Weekly Optimization",
  },
  { cron: "0 11 * * 1" },
  async ({ step }) => {
    const supabase = createAdminClient();

    const latestPlan = await step.run("fetch-latest-plan", async () => {
      const { data, error } = await supabase
        .from("weekly_plans")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error || !data) return null;
      return data;
    });

    if (!latestPlan) {
      return { success: false, reason: "No active weekly plan found" };
    }

    const planJson = latestPlan.plan_json as {
      seo_target_page?: string;
      key_message_this_week?: string;
    };

    const targetPage = planJson?.seo_target_page ?? "homepage";
    const keyMessage = planJson?.key_message_this_week ?? "CALLA helps small businesses never miss a call.";

    return runSEOOptimization(step, targetPage, keyMessage);
  }
);

export const seoAgentTriggered = inngest.createFunction(
  {
    id: "seo-agent-triggered",
    name: "AI SEO Expert — Triggered by Marketing Manager",
  },
  { event: "calla/seo-agent.triggered" },
  async ({ event, step }) => {
    const { target_page, key_message } = event.data as {
      weekly_plan_id: string;
      target_page: string;
      key_message: string;
    };

    return runSEOOptimization(step, target_page, key_message);
  }
);

// ---------------------------------------------------------------------------
// Shared logic
// ---------------------------------------------------------------------------

async function runSEOOptimization(
  step: Parameters<Parameters<typeof inngest.createFunction>[2]>[0]["step"],
  targetPage: string,
  keyMessage: string
) {
  const supabase = createAdminClient();
  const anthropic = new Anthropic();

  // Generate SEO report
  const seoReport = await step.run("generate-seo-report", async () => {
    return generateSEOReport(anthropic, targetPage, keyMessage);
  });

  // Save SEO report
  const savedReport = await step.run("save-seo-report", async () => {
    const { data, error } = await supabase
      .from("seo_reports")
      .insert({
        target_page: seoReport.target_page,
        keywords: seoReport.keywords as unknown as Record<string, unknown>[],
        meta_title: seoReport.meta_title,
        meta_description: seoReport.meta_description,
        content_gaps: seoReport.content_gaps as unknown as Record<string, unknown>[],
        backlink_targets: seoReport.backlink_targets as unknown as Record<string, unknown>[],
        status: "new",
      })
      .select("id")
      .single();

    if (error) throw new Error(`Failed to save SEO report: ${error.message}`);
    return data;
  });

  // Generate hero copy if this is a landing page or homepage
  const isLandingPage =
    targetPage.toLowerCase().includes("home") ||
    targetPage.toLowerCase().includes("landing") ||
    targetPage === "/" ||
    targetPage.toLowerCase() === "homepage";

  let copySuggestionId: string | null = null;

  if (isLandingPage) {
    const heroCopy = await step.run("generate-hero-copy", async () => {
      return generateHeroCopy(anthropic, targetPage, keyMessage);
    });

    const savedCopy = await step.run("save-hero-copy", async () => {
      const { data, error } = await supabase
        .from("copy_suggestions")
        .insert({
          page: heroCopy.page,
          hero_headline: heroCopy.hero_headline,
          hero_subheadline: heroCopy.hero_subheadline,
          cta_text: heroCopy.cta_text,
          status: "pending",
        })
        .select("id")
        .single();

      if (error) throw new Error(`Failed to save copy suggestion: ${error.message}`);
      return data;
    });

    copySuggestionId = savedCopy.id as string;
  }

  return {
    success: true,
    seo_report_id: savedReport.id,
    target_page: targetPage,
    keywords_generated: seoReport.keywords.length,
    hero_copy_generated: isLandingPage,
    copy_suggestion_id: copySuggestionId,
  };
}
