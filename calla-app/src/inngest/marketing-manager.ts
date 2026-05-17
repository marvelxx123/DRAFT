import Anthropic from "@anthropic-ai/sdk";
import { inngest } from "@/lib/inngest";
import { createAdminClient } from "@/lib/supabase";
import { format } from "date-fns";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ContentAssignment {
  topic: string;
  angle: string;
  theme:
    | "missed_calls_revenue"
    | "ai_answering_education"
    | "google_reviews_seo"
    | "customer_story"
    | "calla_shield_spotlight";
}

export interface WeeklyPlan {
  week_of: string;
  goal: string;
  content_assignments: ContentAssignment[];
  seo_target_page: string;
  outreach_segment: string;
  outreach_daily_volume: number;
  key_message_this_week: string;
}

// ---------------------------------------------------------------------------
// Claude system prompt
// ---------------------------------------------------------------------------

const MARKETING_MANAGER_SYSTEM_PROMPT = `You are the Marketing Manager for CALLA, an AI phone answering service.
Your job is to plan the week's marketing activities to grow CALLA's client base.
Target customers: hair salons, beauty studios, dental offices, law firms, HVAC companies.
CALLA's killer feature: CALLA SHIELD — free post-call SMS + sentiment detection + Google review prompting.
Analyze the data provided and return a JSON weekly plan with specific assignments for content, SEO, and outreach.

Return ONLY valid JSON matching this exact structure:
{
  "week_of": "YYYY-MM-DD",
  "goal": "string describing the week's primary growth goal",
  "content_assignments": [
    {
      "topic": "specific topic for this post",
      "angle": "the unique angle or hook for this topic",
      "theme": "missed_calls_revenue | ai_answering_education | google_reviews_seo | customer_story | calla_shield_spotlight"
    }
  ],
  "seo_target_page": "which page on the CALLA website to optimize this week",
  "outreach_segment": "which business type to target this week",
  "outreach_daily_volume": 25,
  "key_message_this_week": "the core message that ties all activities together"
}

The content_assignments array must contain exactly 3 items.
Do not include any text outside the JSON object.`;

// ---------------------------------------------------------------------------
// Helper: fetch context data from Supabase
// ---------------------------------------------------------------------------

async function fetchMarketingContext() {
  const supabase = createAdminClient();

  // Total active clients
  const { count: clientCount } = await supabase
    .from("businesses")
    .select("*", { count: "exact", head: true })
    .not("stripe_subscription_id", "is", null);

  // Last week's content performance — most recent 10 posts with metrics
  const { data: recentPosts } = await supabase
    .from("content_posts")
    .select("topic, status, created_at, published_at")
    .order("created_at", { ascending: false })
    .limit(10);

  return {
    clientCount: clientCount ?? 0,
    recentPosts: recentPosts ?? [],
  };
}

// ---------------------------------------------------------------------------
// Main Inngest function — runs every Monday at 9am
// ---------------------------------------------------------------------------

export const marketingManagerFunction = inngest.createFunction(
  {
    id: "marketing-manager-weekly",
    name: "AI Marketing Manager — Weekly Planning",
  },
  { cron: "0 9 * * 1" },
  async ({ step }) => {
    const supabase = createAdminClient();
    const anthropic = new Anthropic();

    // Step 1: Gather context
    const context = await step.run("fetch-marketing-context", async () => {
      return fetchMarketingContext();
    });

    // Step 2: Generate weekly plan via Claude
    const weeklyPlan = await step.run("generate-weekly-plan", async () => {
      const weekOf = format(new Date(), "yyyy-MM-dd");
      const currentMonth = format(new Date(), "MMMM yyyy");

      const userMessage = `
Today's date: ${new Date().toISOString()}
Current month: ${currentMonth}
Current CALLA client count: ${context.clientCount} paying businesses

Last week's content posts:
${
  context.recentPosts.length > 0
    ? context.recentPosts
        .map(
          (p) =>
            `- Topic: ${p.topic || "untitled"} | Status: ${p.status} | Created: ${p.created_at}`
        )
        .join("\n")
    : "No posts yet — we are just getting started."
}

Based on this data, create a comprehensive weekly marketing plan for CALLA. Consider:
1. What topics haven't been covered recently (avoid repetition)
2. Seasonal relevance for ${currentMonth}
3. Which customer segment has the highest conversion potential right now
4. The most impactful page to optimize for SEO this week

Set the week_of field to: ${weekOf}
`.trim();

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        system: MARKETING_MANAGER_SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      });

      const textBlock = response.content.find((b) => b.type === "text");
      if (!textBlock || textBlock.type !== "text") {
        throw new Error("Claude returned no text content");
      }

      const plan: WeeklyPlan = JSON.parse(textBlock.text);
      return plan;
    });

    // Step 3: Save the weekly plan to Supabase
    const savedPlan = await step.run("save-weekly-plan", async () => {
      const { data, error } = await supabase
        .from("weekly_plans")
        .insert({
          week_of: weeklyPlan.week_of,
          goal: weeklyPlan.goal,
          plan_json: weeklyPlan as unknown as Record<string, unknown>,
          status: "active",
        })
        .select()
        .single();

      if (error) throw new Error(`Failed to save weekly plan: ${error.message}`);
      return data;
    });

    // Step 4: Trigger sub-agents with their assignments
    await step.sendEvent("trigger-sub-agents", [
      {
        name: "calla/content-agent.triggered",
        data: {
          weekly_plan_id: savedPlan.id,
          assignments: weeklyPlan.content_assignments,
          key_message: weeklyPlan.key_message_this_week,
        },
      },
      {
        name: "calla/seo-agent.triggered",
        data: {
          weekly_plan_id: savedPlan.id,
          target_page: weeklyPlan.seo_target_page,
          key_message: weeklyPlan.key_message_this_week,
        },
      },
      {
        name: "calla/outreach-agent.triggered",
        data: {
          weekly_plan_id: savedPlan.id,
          segment: weeklyPlan.outreach_segment,
          daily_volume: weeklyPlan.outreach_daily_volume,
        },
      },
    ]);

    return {
      success: true,
      plan_id: savedPlan.id,
      week_of: weeklyPlan.week_of,
      goal: weeklyPlan.goal,
      agents_triggered: ["content", "seo", "outreach"],
    };
  }
);
