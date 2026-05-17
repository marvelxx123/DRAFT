import Anthropic from "@anthropic-ai/sdk";
import type { GetStepTools } from "inngest";
import { inngest } from "@/lib/inngest";
import { createAdminClient } from "@/lib/supabase";
import type { ContentAssignment } from "./marketing-manager";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TwitterThread {
  tweets: string[];
}

interface ContentPost {
  topic: string;
  blog_post: string;
  instagram_caption: string;
  twitter_thread: TwitterThread;
  linkedin_post: string;
  meta_title: string;
  meta_description: string;
}

// ---------------------------------------------------------------------------
// Claude system prompt
// ---------------------------------------------------------------------------

const CONTENT_WRITER_SYSTEM_PROMPT = `You are the content writer for CALLA, an AI phone answering service for small businesses.

Write like a confident, warm small-business advisor — not a tech company. Your readers are busy owners of hair salons, dental offices, HVAC companies, law firms, and beauty studios. They don't care about AI for AI's sake — they care about not missing calls, looking professional, and getting more Google reviews.

CALLA's main product: AI phone answering that sounds human, works 24/7, and includes CALLA SHIELD (free post-call SMS recap + sentiment detection + automatic Google review prompting).

Writing style:
- Conversational and direct, like a trusted friend who knows business
- Lead with the problem (pain), not the product
- Use real numbers and relatable scenarios when possible
- Short paragraphs, scannable formatting for blog posts
- No corporate jargon, no "leverage synergies", no "cutting-edge AI"

For each piece of content, you will return a JSON object. Return ONLY valid JSON with no surrounding text.`;

// ---------------------------------------------------------------------------
// Generate one full content set for a topic
// ---------------------------------------------------------------------------

async function generateContentSet(
  anthropic: Anthropic,
  assignment: ContentAssignment,
  keyMessage: string
): Promise<ContentPost> {
  const userMessage = `
Write a complete content set for CALLA based on this assignment:

Topic: ${assignment.topic}
Angle: ${assignment.angle}
Theme category: ${assignment.theme}
Key message this week: ${keyMessage}

Return a JSON object with exactly these fields:

{
  "topic": "${assignment.topic}",
  "blog_post": "Full blog post, 800-1200 words. SEO-optimized. Targeting small business owners. Include an H1 title at the top. Use ## for H2 subheadings. Include a clear call-to-action at the end mentioning CALLA.",
  "instagram_caption": "Instagram caption under 2200 characters. Hook in the first line. Storytelling middle. Call to action at end. 15-20 relevant hashtags on the last line starting with a line break.",
  "twitter_thread": {
    "tweets": [
      "Tweet 1 (hook — the problem or surprising stat, under 280 chars)",
      "Tweet 2 (expand on the problem, under 280 chars)",
      "Tweet 3 (the insight or turning point, under 280 chars)",
      "Tweet 4 (how CALLA solves it, under 280 chars)",
      "Tweet 5 (CALLA SHIELD benefit, under 280 chars)",
      "Tweet 6 (social proof or example, under 280 chars)",
      "Tweet 7 (CTA — try CALLA, under 280 chars)"
    ]
  },
  "linkedin_post": "LinkedIn post, professional but warm tone. 150-300 words. Written as a small business insight. End with a question to drive comments. No hashtag spam — max 3 relevant hashtags.",
  "meta_title": "SEO meta title under 60 characters",
  "meta_description": "SEO meta description under 160 characters, includes primary keyword"
}

Write for real small business owners. Make the blog post genuinely useful even without CALLA. Mention CALLA naturally where it fits.
`.trim();

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: CONTENT_WRITER_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude returned no text content for content generation");
  }

  // Strip potential markdown code fences
  const raw = textBlock.text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  return JSON.parse(raw) as ContentPost;
}

// ---------------------------------------------------------------------------
// Inngest function — triggered by marketing manager OR on schedule
// Runs Tuesday and Thursday at 10am for scheduled posts
// ---------------------------------------------------------------------------

export const contentAgentScheduled = inngest.createFunction(
  {
    id: "content-agent-scheduled",
    name: "AI Content Agent — Scheduled Posts",
  },
  { cron: "0 10 * * 2,4" },
  async ({ step }) => {
    const supabase = createAdminClient();

    // Fetch latest active weekly plan for context
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
      content_assignments?: ContentAssignment[];
      key_message_this_week?: string;
    };

    const assignments: ContentAssignment[] = planJson?.content_assignments ?? [];
    const keyMessage: string = planJson?.key_message_this_week ?? "CALLA helps small businesses never miss a call.";

    return runContentGeneration(step, assignments, keyMessage);
  }
);

export const contentAgentTriggered = inngest.createFunction(
  {
    id: "content-agent-triggered",
    name: "AI Content Agent — Triggered by Marketing Manager",
  },
  { event: "calla/content-agent.triggered" },
  async ({ event, step }) => {
    const { assignments, key_message } = event.data as {
      weekly_plan_id: string;
      assignments: ContentAssignment[];
      key_message: string;
    };

    return runContentGeneration(step, assignments, key_message);
  }
);

// ---------------------------------------------------------------------------
// Shared logic: generate and save all assignments
// ---------------------------------------------------------------------------

async function runContentGeneration(
  step: GetStepTools<typeof inngest>,
  assignments: ContentAssignment[],
  keyMessage: string
) {
  const supabase = createAdminClient();
  const anthropic = new Anthropic();
  const createdIds: string[] = [];

  for (let i = 0; i < assignments.length; i++) {
    const assignment = assignments[i];

    const content = await step.run(
      `generate-content-${i + 1}`,
      async () => {
        return generateContentSet(anthropic, assignment, keyMessage);
      }
    );

    const savedId = await step.run(`save-content-${i + 1}`, async () => {
      const { data, error } = await supabase
        .from("content_posts")
        .insert({
          topic: content.topic,
          blog_post: content.blog_post,
          instagram_caption: content.instagram_caption,
          twitter_thread: content.twitter_thread as unknown as Record<string, unknown>,
          linkedin_post: content.linkedin_post,
          meta_title: content.meta_title,
          meta_description: content.meta_description,
          status: "ready",
        })
        .select("id")
        .single();

      if (error) throw new Error(`Failed to save content post: ${error.message}`);
      return data.id as string;
    });

    createdIds.push(savedId);
  }

  return {
    success: true,
    posts_created: createdIds.length,
    post_ids: createdIds,
  };
}
