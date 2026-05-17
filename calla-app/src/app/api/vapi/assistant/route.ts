import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BusinessSettings {
  id: string;
  name: string;
  greeting_message: string;
  services: string | string[];
  hours: string;
  google_review_link?: string;
  elevenlabs_voice_id?: string;
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

/**
 * Build the dynamic system prompt for a business.
 */
function buildSystemPrompt(business: BusinessSettings): string {
  const services =
    typeof business.services === "string"
      ? business.services
      : Array.isArray(business.services)
      ? business.services.join(", ")
      : "various services";

  return `You are CALLA, the AI receptionist for ${business.name}.
You are warm, helpful, and professional — never robotic.
Business hours: ${business.hours}
Services offered: ${services}
To book an appointment, collect the caller's name, preferred date/time, and service needed.
Always offer to take a message if you can't help with something.
If a caller sounds upset or frustrated, acknowledge their feelings first before solving the problem.
Keep responses concise and conversational — this is a phone call, not a text chat.
Do not read out URLs or email addresses unless specifically asked.
Always end calls warmly, e.g. "Have a wonderful day!"`;
}

/**
 * Build the VAPI assistant configuration object for a given business.
 *
 * VAPI's custom LLM integration: we set model.provider = "custom-llm" and
 * point it at our own /api/vapi/llm endpoint (which proxies to Claude).
 * Alternatively, we use VAPI's direct "anthropic" provider support if available.
 */
function buildAssistantConfig(business: BusinessSettings) {
  const systemPrompt = buildSystemPrompt(business);

  // Default warm friendly female voice — ElevenLabs "Rachel" or business override
  const voiceId = business.elevenlabs_voice_id ?? "21m00Tcm4TlvDq8ikWAM"; // Rachel

  return {
    name: `CALLA — ${business.name}`,
    model: {
      provider: "anthropic",
      model: "claude-sonnet-4-6",
      systemPrompt,
      temperature: 0.7,
      maxTokens: 512,
    },
    voice: {
      provider: "11labs",
      voiceId,
      stability: 0.6,
      similarityBoost: 0.75,
      style: 0.2,
      useSpeakerBoost: true,
    },
    firstMessage: business.greeting_message,
    // Transcriber configuration
    transcriber: {
      provider: "deepgram",
      model: "nova-2",
      language: "en-US",
    },
    // End-of-call behavior
    endCallMessage: "Thank you for calling. Have a wonderful day!",
    endCallPhrases: [
      "goodbye",
      "bye",
      "talk to you later",
      "thank you goodbye",
      "have a good day",
    ],
    // Silence / no-speech handling
    silenceTimeoutSeconds: 30,
    maxDurationSeconds: 600, // 10-minute max call
    // Response latency tuning
    responseDelaySeconds: 0.4,
    llmRequestDelaySeconds: 0.1,
    // Callable functions the AI can invoke
    functions: [
      {
        name: "book_appointment",
        async: false,
        description:
          "Book an appointment for a caller. Use this when the caller wants to schedule a service.",
        parameters: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Full name of the caller",
            },
            service: {
              type: "string",
              description: "The service the caller wants to book",
            },
            date: {
              type: "string",
              description: "Preferred date in YYYY-MM-DD format",
            },
            time: {
              type: "string",
              description:
                "Preferred time in HH:MM format (24-hour) or natural language (e.g. '2pm')",
            },
            phone: {
              type: "string",
              description: "Caller's callback phone number",
            },
          },
          required: ["name", "service", "date", "time", "phone"],
        },
      },
      {
        name: "take_message",
        async: false,
        description:
          "Record a message from the caller to pass on to the business owner. Use when you can't directly help the caller.",
        parameters: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Caller's name",
            },
            message: {
              type: "string",
              description: "The message content to record",
            },
            phone: {
              type: "string",
              description: "Caller's callback phone number",
            },
          },
          required: ["name", "message", "phone"],
        },
      },
      {
        name: "transfer_call",
        async: false,
        description:
          "Transfer the call to a human. Use when the caller insists on speaking to a person, the situation is urgent or complex, or you cannot resolve the issue.",
        parameters: {
          type: "object",
          properties: {
            reason: {
              type: "string",
              description: "Brief reason for the transfer",
            },
          },
          required: ["reason"],
        },
      },
    ],
    // Webhook URL for VAPI to send events to
    serverUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/vapi/webhook`,
    serverUrlSecret: process.env.VAPI_SECRET ?? "",
  };
}

// ---------------------------------------------------------------------------
// GET handler — VAPI calls this to retrieve assistant config
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get("businessId");

  if (!businessId) {
    return NextResponse.json(
      { error: "businessId query parameter is required" },
      { status: 400 }
    );
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: business, error } = await supabase
      .from("businesses")
      .select(
        "id, name, greeting_message, services, hours, google_review_link, elevenlabs_voice_id"
      )
      .eq("id", businessId)
      .single();

    if (error || !business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    const config = buildAssistantConfig(business as BusinessSettings);
    return NextResponse.json(config);
  } catch (error) {
    console.error("[VAPI Assistant] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST handler — VAPI can also POST to this endpoint when requesting config
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  let businessId: string | undefined;

  try {
    const body = (await request.json()) as { businessId?: string };
    businessId = body.businessId;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!businessId) {
    return NextResponse.json(
      { error: "businessId is required" },
      { status: 400 }
    );
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: business, error } = await supabase
      .from("businesses")
      .select(
        "id, name, greeting_message, services, hours, google_review_link, elevenlabs_voice_id"
      )
      .eq("id", businessId)
      .single();

    if (error || !business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    const config = buildAssistantConfig(business as BusinessSettings);
    return NextResponse.json(config);
  } catch (error) {
    console.error("[VAPI Assistant] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
