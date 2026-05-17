import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import twilio from "twilio";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Sentiment = "positive" | "neutral" | "negative";

interface SentimentAnalysis {
  sentiment: Sentiment;
  topic: string;
  intent: string;
  urgency: 1 | 2 | 3 | 4 | 5;
}

interface ShieldRequest {
  callId: string;
  transcript: string;
  callerNumber: string;
  businessId: string;
}

interface BusinessRecord {
  id: string;
  name: string;
  owner_phone: string;
  google_review_link?: string;
  caller_sms_enabled?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key);
}

function getTwilioClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) throw new Error("Missing Twilio env vars");
  return twilio(sid, token);
}

function getAnthropicClient() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("Missing ANTHROPIC_API_KEY");
  return new Anthropic({ apiKey: key });
}

function sentimentEmoji(sentiment: Sentiment): string {
  switch (sentiment) {
    case "positive": return "😊";
    case "neutral":  return "😐";
    case "negative": return "😟";
  }
}

/**
 * Analyze sentiment of a transcript using Claude.
 * Returns structured JSON with sentiment, topic, intent, and urgency.
 */
async function analyzeSentiment(transcript: string): Promise<SentimentAnalysis> {
  const anthropic = getAnthropicClient();

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 256,
    system: `You are a customer experience analyst. Analyze call transcripts and return ONLY valid JSON with exactly these fields:
{
  "sentiment": "positive" | "neutral" | "negative",
  "topic": "<main topic in 5 words or less>",
  "intent": "<caller's primary intent in 8 words or less>",
  "urgency": <integer 1-5 where 1=low, 5=critical>
}
No explanation, no markdown, no code blocks — raw JSON only.`,
    messages: [
      {
        role: "user",
        content: `Analyze this phone call transcript:\n\n${transcript}`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  const raw = textBlock && textBlock.type === "text" ? textBlock.text.trim() : "{}";

  try {
    const parsed = JSON.parse(raw) as Partial<SentimentAnalysis>;

    // Validate and normalise the fields
    const sentiment: Sentiment =
      parsed.sentiment === "positive" ||
      parsed.sentiment === "neutral" ||
      parsed.sentiment === "negative"
        ? parsed.sentiment
        : "neutral";

    const urgencyRaw = Number(parsed.urgency);
    const urgency = (
      Number.isInteger(urgencyRaw) && urgencyRaw >= 1 && urgencyRaw <= 5
        ? urgencyRaw
        : 3
    ) as 1 | 2 | 3 | 4 | 5;

    return {
      sentiment,
      topic: parsed.topic ?? "General inquiry",
      intent: parsed.intent ?? "Caller contacted business",
      urgency,
    };
  } catch {
    console.error("[SHIELD] Failed to parse sentiment JSON:", raw);
    return { sentiment: "neutral", topic: "Unknown", intent: "Unknown", urgency: 3 };
  }
}

/**
 * Send an SMS via Twilio.
 */
async function sendSms(to: string, body: string): Promise<void> {
  const twilioClient = getTwilioClient();
  const fromNumber = process.env.TWILIO_PHONE_NUMBER ?? "";
  if (!fromNumber) throw new Error("TWILIO_PHONE_NUMBER not configured");

  await twilioClient.messages.create({ body, from: fromNumber, to });
}

/**
 * Schedule the Google review SMS.
 * We wait 30 minutes before sending to the caller. In production this should
 * use a proper job queue (e.g. Inngest, Upstash QStash, Supabase pg_cron).
 * Here we use setTimeout for simplicity — works in serverless with caution.
 *
 * NOTE: In a Vercel/serverless environment, long-running timeouts won't survive
 * the function's max execution window. For production, trigger a separate
 * scheduled job or use a queue service.
 */
function scheduleGoogleReviewSms(
  callerNumber: string,
  businessName: string,
  googleReviewLink: string
): void {
  const THIRTY_MINUTES = 30 * 60 * 1000;

  setTimeout(async () => {
    try {
      await sendSms(
        callerNumber,
        `Hi! Thanks for calling ${businessName}. ` +
        `We hope we were helpful! If you have a moment, ` +
        `a Google review would mean the world to us: ${googleReviewLink}\n` +
        `— The team at ${businessName}`
      );
      console.log(`[SHIELD] Google review SMS sent to ${callerNumber}`);
    } catch (err) {
      console.error("[SHIELD] Google review SMS failed:", err);
    }
  }, THIRTY_MINUTES);
}

// ---------------------------------------------------------------------------
// POST handler — CALLA SHIELD
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  let body: ShieldRequest;
  try {
    body = (await request.json()) as ShieldRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { callId, transcript, callerNumber, businessId } = body;

  // Validate required fields
  if (!callId || !transcript || !callerNumber || !businessId) {
    return NextResponse.json(
      { error: "callId, transcript, callerNumber, and businessId are required" },
      { status: 400 }
    );
  }

  // Truncate very long transcripts to stay within token limits
  const truncatedTranscript = transcript.length > 8000
    ? transcript.slice(0, 8000) + "\n[transcript truncated]"
    : transcript;

  try {
    const supabase = getSupabaseAdmin();

    // 1. Fetch business details
    const { data: business, error: bizError } = await supabase
      .from("businesses")
      .select("id, name, owner_phone, google_review_link, caller_sms_enabled")
      .eq("id", businessId)
      .single();

    if (bizError || !business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    const biz = business as BusinessRecord;

    // 2. Sentiment analysis via Claude
    const analysis = await analyzeSentiment(truncatedTranscript);
    console.log(`[SHIELD] Sentiment for call ${callId}:`, analysis);

    // 3. Fetch call duration for the summary SMS
    const { data: callData } = await supabase
      .from("calls")
      .select("duration_seconds")
      .eq("id", callId)
      .single();
    const durationSeconds = (callData as { duration_seconds?: number } | null)?.duration_seconds ?? 0;
    const durationFmt = durationSeconds > 0
      ? `${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s`
      : "unknown";

    const actionNeeded =
      analysis.sentiment === "negative" || analysis.urgency >= 4 ? "Yes" : "No";

    // 4. Handle negative sentiment — alert owner immediately
    if (analysis.sentiment === "negative") {
      await supabase
        .from("calls")
        .update({ sentiment: "negative" })
        .eq("id", callId);

      if (biz.owner_phone) {
        try {
          await sendSms(
            biz.owner_phone,
            `🚨 CALLA SHIELD Alert — ${biz.name}\n` +
            `Caller ${callerNumber} may be unhappy.\n` +
            `Topic: ${analysis.topic}\n` +
            `Call them back ASAP to prevent a bad review.\n` +
            `— CALLA`
          );
        } catch (err) {
          console.error("[SHIELD] Negative sentiment alert SMS failed:", err);
        }
      }
    }

    // 5. Handle positive sentiment — schedule Google review request to caller
    if (analysis.sentiment === "positive") {
      await supabase
        .from("calls")
        .update({ sentiment: "positive", review_prompted: false })
        .eq("id", callId);

      const reviewLink = biz.google_review_link;
      const callerSmsEnabled = biz.caller_sms_enabled !== false; // default true

      if (reviewLink && callerNumber !== "unknown" && callerSmsEnabled) {
        scheduleGoogleReviewSms(callerNumber, biz.name, reviewLink);
        // Mark review_prompted after scheduling (will be updated to true after actual send in prod)
        await supabase
          .from("calls")
          .update({ review_prompted: true })
          .eq("id", callId);
      }
    }

    // 6. For neutral sentiment — update the sentiment field
    if (analysis.sentiment === "neutral") {
      await supabase
        .from("calls")
        .update({ sentiment: "neutral" })
        .eq("id", callId);
    }

    // 7. Always — send call summary SMS to business owner
    if (biz.owner_phone) {
      try {
        await sendSms(
          biz.owner_phone,
          `📞 New CALLA Call Summary\n` +
          `Caller: ${callerNumber}\n` +
          `Duration: ${durationFmt}\n` +
          `Topic: ${analysis.topic}\n` +
          `Mood: ${sentimentEmoji(analysis.sentiment)}\n` +
          `Action needed: ${actionNeeded}\n` +
          `— CALLA`
        );
      } catch (err) {
        console.error("[SHIELD] Summary SMS to owner failed:", err);
      }
    }

    return NextResponse.json({
      success: true,
      sentiment: analysis.sentiment,
      topic: analysis.topic,
      urgency: analysis.urgency,
    });
  } catch (error) {
    console.error("[SHIELD] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
