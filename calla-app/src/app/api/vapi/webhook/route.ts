import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import twilio from "twilio";
import crypto from "crypto";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VapiCallStartedPayload {
  type: "call-started";
  callId: string;
  phoneNumberId: string;
  customer?: { number?: string };
}

interface VapiTranscriptPayload {
  type: "transcript";
  callId: string;
  transcript: string;
  role: "user" | "assistant";
  transcriptType: "partial" | "final";
}

interface VapiFunctionCallPayload {
  type: "function-call";
  callId: string;
  functionCall: {
    name: string;
    parameters: Record<string, unknown>;
  };
}

interface VapiCallEndedPayload {
  type: "call-ended";
  callId: string;
  durationSeconds?: number;
  transcript?: string;
  summary?: string;
  customer?: { number?: string };
  phoneNumberId?: string;
}

interface VapiHangPayload {
  type: "hang";
  callId: string;
}

type VapiWebhookPayload =
  | VapiCallStartedPayload
  | VapiTranscriptPayload
  | VapiFunctionCallPayload
  | VapiCallEndedPayload
  | VapiHangPayload;

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

/**
 * Verify the VAPI webhook signature.
 * VAPI signs requests using HMAC-SHA256 over the raw body with the secret key.
 * Header: x-vapi-signature
 */
function verifyVapiSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.VAPI_SECRET;
  if (!secret) {
    console.warn("VAPI_SECRET not set — skipping signature verification");
    return true; // Allow in dev; enforce in production by always setting the secret
  }
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(signature, "hex")
    );
  } catch {
    return false;
  }
}

/**
 * Generate a call summary using Claude.
 */
async function generateSummary(transcript: string): Promise<string> {
  const anthropic = getAnthropicClient();
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    system:
      "You are a concise AI assistant. Summarize the following phone call transcript in 2–4 sentences. Focus on: what the caller needed, what was resolved, and any follow-up required.",
    messages: [{ role: "user", content: transcript }],
  });
  const block = response.content.find((b) => b.type === "text");
  return block && block.type === "text" ? block.text : "No summary available.";
}

/**
 * Look up which business owns the given VAPI phone number ID.
 */
async function getBusinessByPhoneNumberId(
  phoneNumberId: string
): Promise<{ id: string; name: string; owner_phone: string } | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("businesses")
    .select("id, name, owner_phone")
    .eq("vapi_phone_number_id", phoneNumberId)
    .single();
  if (error || !data) return null;
  return data as { id: string; name: string; owner_phone: string };
}

/**
 * Handle the book_appointment function call.
 */
async function handleBookAppointment(
  params: Record<string, unknown>,
  businessId: string
): Promise<string> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("appointments").insert({
    business_id: businessId,
    caller_name: params.name,
    service: params.service,
    preferred_date: params.date,
    preferred_time: params.time,
    phone: params.phone,
    status: "pending",
  });
  if (error) {
    console.error("Failed to book appointment:", error);
    return JSON.stringify({
      success: false,
      message:
        "I was unable to book the appointment right now. We'll follow up with you shortly.",
    });
  }
  return JSON.stringify({
    success: true,
    message: `Great! I've requested an appointment for ${params.name} on ${params.date} at ${params.time} for ${params.service}. We'll confirm shortly!`,
  });
}

/**
 * Handle the take_message function call.
 */
async function handleTakeMessage(
  params: Record<string, unknown>,
  businessId: string
): Promise<string> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("messages").insert({
    business_id: businessId,
    caller_name: params.name,
    message_text: params.message,
    phone: params.phone,
    status: "unread",
  });
  if (error) {
    console.error("Failed to save message:", error);
    return JSON.stringify({ success: false, message: "Unable to save message." });
  }
  return JSON.stringify({
    success: true,
    message: `I've recorded your message, ${params.name}. Someone from our team will get back to you at ${params.phone} as soon as possible.`,
  });
}

/**
 * Handle the transfer_call function call.
 * Returns a result telling VAPI to transfer; actual transfer is configured in VAPI dashboard.
 */
function handleTransferCall(params: Record<string, unknown>): string {
  return JSON.stringify({
    success: true,
    action: "transfer",
    reason: params.reason,
    message: "I'm transferring your call now. Please hold for just a moment.",
  });
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  // 1. Read raw body for signature verification
  const rawBody = await request.text();
  const signature = request.headers.get("x-vapi-signature") ?? "";

  // 2. Verify signature
  if (!verifyVapiSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // 3. Parse payload
  let payload: VapiWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as VapiWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    switch (payload.type) {
      // -----------------------------------------------------------------------
      case "call-started": {
        console.log(`[VAPI] Call started: ${payload.callId}`);
        const supabase = getSupabaseAdmin();
        await supabase.from("calls").upsert({
          vapi_call_id: payload.callId,
          caller_number: payload.customer?.number ?? "unknown",
          status: "in-progress",
          started_at: new Date().toISOString(),
        });
        return NextResponse.json({ received: true });
      }

      // -----------------------------------------------------------------------
      case "transcript": {
        // Only persist final transcripts to avoid write storms
        if (payload.transcriptType === "final") {
          const supabase = getSupabaseAdmin();
          // Append to existing transcript column
          const { data: existing } = await supabase
            .from("calls")
            .select("transcript")
            .eq("vapi_call_id", payload.callId)
            .single();
          const current = (existing as { transcript?: string } | null)?.transcript ?? "";
          const updated = current
            ? `${current}\n[${payload.role.toUpperCase()}]: ${payload.transcript}`
            : `[${payload.role.toUpperCase()}]: ${payload.transcript}`;
          await supabase
            .from("calls")
            .update({ transcript: updated })
            .eq("vapi_call_id", payload.callId);
        }
        return NextResponse.json({ received: true });
      }

      // -----------------------------------------------------------------------
      case "function-call": {
        const { name, parameters } = payload.functionCall;
        console.log(`[VAPI] Function call: ${name}`, parameters);

        // Look up business context from the call record
        const supabase = getSupabaseAdmin();
        const { data: callData } = await supabase
          .from("calls")
          .select("business_id")
          .eq("vapi_call_id", payload.callId)
          .single();
        const businessId = (callData as { business_id?: string } | null)?.business_id ?? "";

        let result: string;
        switch (name) {
          case "book_appointment":
            result = await handleBookAppointment(parameters, businessId);
            break;
          case "take_message":
            result = await handleTakeMessage(parameters, businessId);
            break;
          case "transfer_call":
            result = handleTransferCall(parameters);
            break;
          default:
            result = JSON.stringify({ error: `Unknown function: ${name}` });
        }

        // VAPI expects { result } in the response to function-call webhooks
        return NextResponse.json({ result });
      }

      // -----------------------------------------------------------------------
      case "call-ended": {
        console.log(`[VAPI] Call ended: ${payload.callId}`);
        const supabase = getSupabaseAdmin();

        // Fetch the full call record first
        const { data: callRecord } = await supabase
          .from("calls")
          .select("*")
          .eq("vapi_call_id", payload.callId)
          .single();

        const transcript =
          payload.transcript ??
          (callRecord as Record<string, string> | null)?.transcript ??
          "";
        const callerNumber =
          payload.customer?.number ??
          (callRecord as Record<string, string> | null)?.caller_number ??
          "Unknown";

        // Generate summary via Claude
        const summary = transcript
          ? await generateSummary(transcript)
          : "No transcript available.";

        // Persist the completed call
        await supabase
          .from("calls")
          .update({
            status: "completed",
            duration_seconds: payload.durationSeconds ?? 0,
            transcript,
            summary,
            ended_at: new Date().toISOString(),
          })
          .eq("vapi_call_id", payload.callId);

        // Determine business
        const phoneNumberId =
          payload.phoneNumberId ??
          (callRecord as Record<string, string> | null)?.vapi_phone_number_id;
        const business = phoneNumberId
          ? await getBusinessByPhoneNumberId(phoneNumberId)
          : null;

        // Trigger CALLA SHIELD asynchronously (fire-and-forget via fetch)
        if (business && transcript) {
          const shieldUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/shield`;
          const updatedCall = await supabase
            .from("calls")
            .select("id")
            .eq("vapi_call_id", payload.callId)
            .single();
          const callId = (updatedCall.data as { id?: string } | null)?.id;

          fetch(shieldUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              callId,
              transcript,
              callerNumber,
              businessId: business.id,
            }),
          }).catch((err) => console.error("[VAPI] Shield trigger failed:", err));
        }

        // Send SMS summary to business owner via Twilio
        if (business?.owner_phone) {
          try {
            const twilioClient = getTwilioClient();
            const fromNumber =
              process.env.TWILIO_PHONE_NUMBER ?? "";
            await twilioClient.messages.create({
              body: `📞 CALLA — New call received\nCaller: ${callerNumber}\nDuration: ${payload.durationSeconds ?? 0}s\nSummary: ${summary}\n— CALLA`,
              from: fromNumber,
              to: business.owner_phone,
            });
          } catch (smsErr) {
            console.error("[VAPI] Owner SMS failed:", smsErr);
          }
        }

        return NextResponse.json({ received: true });
      }

      // -----------------------------------------------------------------------
      case "hang": {
        console.log(`[VAPI] Caller hung up: ${payload.callId}`);
        const supabase = getSupabaseAdmin();
        await supabase
          .from("calls")
          .update({ status: "hung-up", ended_at: new Date().toISOString() })
          .eq("vapi_call_id", payload.callId);
        return NextResponse.json({ received: true });
      }

      // -----------------------------------------------------------------------
      default: {
        // Unknown event type — return 200 to prevent VAPI retry storms
        console.warn("[VAPI] Unknown event type:", (payload as { type: string }).type);
        return NextResponse.json({ received: true });
      }
    }
  } catch (error) {
    console.error("[VAPI] Webhook handler error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
