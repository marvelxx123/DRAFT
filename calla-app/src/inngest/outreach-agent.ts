import Anthropic from "@anthropic-ai/sdk";
import type { GetStepTools } from "inngest";
import { inngest } from "@/lib/inngest";
import { createAgentAdminClient } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Prospect {
  id: string;
  business_name: string | null;
  business_type: string | null;
  instagram_handle: string | null;
  email: string | null;
  city: string | null;
  status: string;
}

interface OutreachCopy {
  dm_copy: string;
  email_subject: string;
  email_body: string;
}

// ---------------------------------------------------------------------------
// Claude system prompt
// ---------------------------------------------------------------------------

const OUTREACH_WRITER_SYSTEM_PROMPT = `You are the outreach specialist for CALLA, an AI phone answering service for small businesses.

Your job is to write personalized cold outreach messages that feel like they came from a real person — warm, specific, not salesy.

CALLA's killer feature: CALLA SHIELD — every call gets a post-call SMS recap sent to the business owner, plus automatic Google review prompting for happy callers. This is completely free with CALLA.

Key rules:
- Never sound like a bot or mass marketing
- Reference their specific business type naturally
- Lead with a genuine problem they face (missing calls, after-hours inquiries, looking unprofessional)
- Keep DMs SHORT (5 lines max) — they'll read it on their phone
- Keep emails warm but brief — 100 words max for the body
- Never use "leverage", "synergy", "game-changing", or similar corporate words
- Write like a friendly local business person, not a tech company

Return ONLY valid JSON with no surrounding text.`;

// ---------------------------------------------------------------------------
// Generate outreach for one prospect
// ---------------------------------------------------------------------------

async function generateOutreachCopy(
  anthropic: Anthropic,
  prospect: Prospect,
  segment: string,
  keyMessage: string
): Promise<OutreachCopy> {
  const businessDescription = [
    prospect.business_name,
    prospect.business_type,
    prospect.city ? `in ${prospect.city}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  const userMessage = `
Write personalized cold outreach for this business:

Business: ${businessDescription}
Business type: ${prospect.business_type ?? "small business"}
Instagram handle: ${prospect.instagram_handle ?? "not available"}
This week's key message: ${keyMessage}
Target segment context: ${segment}

Return a JSON object:
{
  "dm_copy": "A cold Instagram DM, maximum 5 lines. Line 1: genuine observation or hook about their business type. Line 2: the problem (missing calls). Line 3: what CALLA does in one sentence. Line 4: mention CALLA SHIELD briefly. Line 5: soft CTA — no pressure.",
  "email_subject": "Cold email subject line, under 50 characters, curiosity-driven or problem-focused",
  "email_body": "Cold email body, exactly 100 words or under. Paragraph 1 (2-3 sentences): the problem they face. Paragraph 2 (2-3 sentences): how CALLA solves it, mention CALLA SHIELD. Paragraph 3 (1-2 sentences): soft CTA — offer a free trial or 5-minute call, no pressure. Sign off with a real-person name: 'Alex at CALLA'"
}

The outreach should feel like it came from someone who genuinely understands their business, not a blast email.
`.trim();

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: OUTREACH_WRITER_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error(`Claude returned no text for prospect ${prospect.id}`);
  }

  const raw = textBlock.text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  return JSON.parse(raw) as OutreachCopy;
}

// ---------------------------------------------------------------------------
// Inngest function — runs every weekday at 8am
// ---------------------------------------------------------------------------

export const outreachAgentScheduled = inngest.createFunction(
  {
    id: "outreach-agent-scheduled",
    name: "AI Outreach Agent — Daily Prospecting",
    triggers: [{ cron: "0 8 * * 1-5" }],
    // Throttle to avoid hitting Claude rate limits if volume is high
    throttle: {
      limit: 1,
      period: "1d",
      key: "event.data.segment",
    },
  },
  async ({ step }) => {
    const supabase = createAgentAdminClient();

    // Fetch the latest active weekly plan
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
      outreach_segment?: string;
      outreach_daily_volume?: number;
      key_message_this_week?: string;
    } | null;

    const segment = planJson?.outreach_segment ?? "hair salons";
    const dailyVolume = planJson?.outreach_daily_volume ?? 25;
    const keyMessage = planJson?.key_message_this_week ?? "CALLA helps small businesses never miss a call.";

    return runOutreachGeneration(step, segment, dailyVolume, keyMessage);
  }
);

export const outreachAgentTriggered = inngest.createFunction(
  {
    id: "outreach-agent-triggered",
    name: "AI Outreach Agent — Triggered by Marketing Manager",
    triggers: [{ event: "calla/outreach-agent.triggered" }],
  },
  async ({ event, step }) => {
    const { segment, daily_volume } = event.data as {
      weekly_plan_id: string;
      segment: string;
      daily_volume: number;
    };

    const supabase = createAgentAdminClient();

    const keyMessage = await step.run("fetch-key-message", async () => {
      const { data } = await supabase
        .from("weekly_plans")
        .select("plan_json")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      const json = data?.plan_json as { key_message_this_week?: string } | null;
      return json?.key_message_this_week ?? "CALLA helps small businesses never miss a call.";
    });

    return runOutreachGeneration(step, segment, daily_volume, keyMessage);
  }
);

// ---------------------------------------------------------------------------
// Shared logic: fetch prospects, generate copy, save to queue
// ---------------------------------------------------------------------------

async function runOutreachGeneration(
  step: GetStepTools<typeof inngest>,
  segment: string,
  dailyVolume: number,
  keyMessage: string
) {
  const supabase = createAgentAdminClient();
  const anthropic = new Anthropic();

  // Fetch prospects not yet contacted, filtered by segment
  const prospects = await step.run("fetch-prospects", async () => {
    const { data, error } = await supabase
      .from("prospects")
      .select("id, business_name, business_type, instagram_handle, email, city, status")
      .eq("status", "new")
      .ilike("business_type", `%${segment}%`)
      .limit(dailyVolume);

    if (error) throw new Error(`Failed to fetch prospects: ${error.message}`);
    return (data ?? []) as Prospect[];
  });

  if (prospects.length === 0) {
    return {
      success: true,
      processed: 0,
      reason: `No new prospects found for segment: ${segment}`,
    };
  }

  const processedIds: string[] = [];

  // Process each prospect — generate copy, save to queue, mark as contacted
  // Use fan-out for up to 5 at a time to stay within rate limits
  const batchSize = 5;
  for (let i = 0; i < prospects.length; i += batchSize) {
    const batch = prospects.slice(i, i + batchSize);

    await step.run(`process-batch-${Math.floor(i / batchSize) + 1}`, async () => {
      for (const prospect of batch) {
        try {
          const outreach = await generateOutreachCopy(
            anthropic,
            prospect,
            segment,
            keyMessage
          );

          // Determine channel based on available contact info
          const channel =
            prospect.instagram_handle && prospect.email
              ? "both"
              : prospect.instagram_handle
              ? "instagram"
              : prospect.email
              ? "email"
              : "instagram";

          // Save to outreach queue
          const { error: insertError } = await supabase
            .from("outreach_queue")
            .insert({
              prospect_id: prospect.id,
              dm_copy: outreach.dm_copy,
              email_subject: outreach.email_subject,
              email_body: outreach.email_body,
              channel,
              status: "ready",
            });

          if (insertError) {
            console.error(
              `Failed to save outreach for prospect ${prospect.id}:`,
              insertError.message
            );
            return;
          }

          // Mark prospect as contacted
          const { error: updateError } = await supabase
            .from("prospects")
            .update({ status: "contacted" })
            .eq("id", prospect.id);

          if (updateError) {
            console.error(
              `Failed to update prospect status for ${prospect.id}:`,
              updateError.message
            );
            return;
          }

          processedIds.push(prospect.id);
        } catch (err) {
          console.error(
            `Error processing prospect ${prospect.id}:`,
            err instanceof Error ? err.message : String(err)
          );
        }
      }
    });
  }

  return {
    success: true,
    segment,
    prospects_found: prospects.length,
    processed: processedIds.length,
    prospect_ids: processedIds,
  };
}
