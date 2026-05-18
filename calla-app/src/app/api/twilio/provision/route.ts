import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import twilio from "twilio";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BusinessRecord {
  id: string;
  name: string;
  zip_code?: string;
  twilio_number?: string;
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

/**
 * Look up the area code for a US zip code using a free geo lookup.
 * Falls back to area code 800 (toll-free prefix fallback) if the lookup fails,
 * which callers should treat as "buy any available number".
 *
 * In production you can replace this with a paid geocoding API or a local
 * zip→area-code database for deterministic results.
 */
async function getAreaCodeForZip(zipCode: string): Promise<number | null> {
  try {
    const response = await fetch(
      `https://api.zippopotam.us/us/${encodeURIComponent(zipCode)}`,
      { signal: AbortSignal.timeout(5000) }
    );

    if (!response.ok) return null;

    // zippopotam gives us lat/lng but not area code; we use the state to pick
    // a fallback area code mapping for US states. For a real product, integrate
    // a dedicated zip→area-code service.
    const data = (await response.json()) as {
      "post code": string;
      places?: Array<{ state?: string; "state abbreviation"?: string }>;
    };

    const stateAbbr = data.places?.[0]?.["state abbreviation"]?.toUpperCase();
    if (!stateAbbr) return null;

    // Rough state → primary area code mapping (first/most common area code per state).
    // This is intentionally simple — for production accuracy use a zip→NPA database.
    const STATE_AREA_CODES: Record<string, string> = {
      AL: "205", AK: "907", AZ: "602", AR: "501", CA: "213",
      CO: "303", CT: "203", DE: "302", FL: "305", GA: "404",
      HI: "808", ID: "208", IL: "312", IN: "317", IA: "319",
      KS: "316", KY: "502", LA: "504", ME: "207", MD: "301",
      MA: "617", MI: "313", MN: "612", MS: "601", MO: "314",
      MT: "406", NE: "402", NV: "702", NH: "603", NJ: "201",
      NM: "505", NY: "212", NC: "704", ND: "701", OH: "216",
      OK: "405", OR: "503", PA: "215", RI: "401", SC: "803",
      SD: "605", TN: "615", TX: "214", UT: "801", VT: "802",
      VA: "703", WA: "206", WV: "304", WI: "414", WY: "307",
      DC: "202", PR: "787",
    };

    const code = STATE_AREA_CODES[stateAbbr];
    return code ? parseInt(code, 10) : null;
  } catch {
    return null;
  }
}

/**
 * Search for an available local Twilio phone number in the given area code.
 * Falls back to searching without an area code constraint if none are found.
 */
async function findAvailableNumber(
  twilioClient: ReturnType<typeof twilio>,
  areaCode: number | null
): Promise<string | null> {
  try {
    const numbers = await twilioClient
      .availablePhoneNumbers("US")
      .local.list(
        areaCode !== null
          ? { voiceEnabled: true, smsEnabled: true, areaCode, limit: 5 }
          : { voiceEnabled: true, smsEnabled: true, limit: 5 }
      );

    if (numbers.length > 0) {
      return numbers[0].phoneNumber;
    }

    // Area code had no results — search nationally
    if (areaCode !== null) {
      const fallback = await twilioClient
        .availablePhoneNumbers("US")
        .local.list({ voiceEnabled: true, smsEnabled: true, limit: 1 });
      return fallback[0]?.phoneNumber ?? null;
    }

    return null;
  } catch (err) {
    console.error("[Twilio/Provision] Number search error:", err);
    return null;
  }
}

/**
 * Purchase a Twilio phone number and configure its voice webhook to point at
 * our VAPI assistant endpoint.
 */
async function purchaseAndConfigureNumber(
  twilioClient: ReturnType<typeof twilio>,
  phoneNumber: string,
  businessId: string
): Promise<string> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  // VAPI assistant URL — VAPI will call this to get the assistant config
  const voiceUrl = `${appUrl}/api/vapi/assistant?businessId=${businessId}`;

  const purchased = await twilioClient.incomingPhoneNumbers.create({
    phoneNumber,
    voiceUrl,
    voiceMethod: "GET",
    // Also configure SMS URL so inbound texts can be handled later
    smsUrl: `${appUrl}/api/twilio/sms?businessId=${businessId}`,
    smsMethod: "POST",
    friendlyName: `CALLA — Business ${businessId}`,
  });

  return purchased.phoneNumber;
}

// ---------------------------------------------------------------------------
// POST /api/twilio/provision — provision a Twilio number for a business
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  // ------------------------------------------------------------------
  // Auth — this endpoint is server-to-server only.
  // Accept requests bearing the Supabase service role key as a Bearer token.
  // ------------------------------------------------------------------
  const authHeader = request.headers.get("authorization");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey || authHeader !== `Bearer ${serviceRoleKey}`) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ------------------------------------------------------------------
  // Parse body
  // ------------------------------------------------------------------
  let businessId: string;
  try {
    const body = (await request.json()) as { businessId?: string };
    if (!body.businessId) {
      return NextResponse.json(
        { error: "businessId is required" },
        { status: 400 }
      );
    }
    businessId = body.businessId;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();

    // ------------------------------------------------------------------
    // 1. Look up business
    // ------------------------------------------------------------------
    const { data: business, error: bizError } = await supabase
      .from("businesses")
      .select("id, name, zip_code, twilio_number")
      .eq("id", businessId)
      .single();

    if (bizError || !business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    const biz = business as BusinessRecord;

    // Idempotency — if the business already has a number, return it
    if (biz.twilio_number) {
      console.log(
        `[Twilio/Provision] Business ${businessId} already has number: ${biz.twilio_number}`
      );
      return NextResponse.json({ phoneNumber: biz.twilio_number });
    }

    // ------------------------------------------------------------------
    // 2. Determine area code from business zip code
    // ------------------------------------------------------------------
    const areaCode: number | null = biz.zip_code
      ? await getAreaCodeForZip(biz.zip_code)
      : null;

    if (areaCode !== null) {
      console.log(
        `[Twilio/Provision] Using area code ${areaCode} for zip ${biz.zip_code}`
      );
    } else {
      console.log(
        `[Twilio/Provision] No area code found for zip ${biz.zip_code ?? "(none)"} — searching nationally`
      );
    }

    // ------------------------------------------------------------------
    // 3. Find an available number
    // ------------------------------------------------------------------
    const twilioClient = getTwilioClient();
    const availableNumber = await findAvailableNumber(twilioClient, areaCode);

    if (!availableNumber) {
      console.error("[Twilio/Provision] No available numbers found");
      return NextResponse.json(
        { error: "No available phone numbers" },
        { status: 503 }
      );
    }

    // ------------------------------------------------------------------
    // 4. Purchase and configure the number
    // ------------------------------------------------------------------
    const purchasedNumber = await purchaseAndConfigureNumber(
      twilioClient,
      availableNumber,
      businessId
    );

    console.log(
      `[Twilio/Provision] Purchased ${purchasedNumber} for business ${businessId}`
    );

    // ------------------------------------------------------------------
    // 5. Save number to database
    // ------------------------------------------------------------------
    const { error: updateError } = await supabase
      .from("businesses")
      .update({
        twilio_number: purchasedNumber,
        updated_at: new Date().toISOString(),
      })
      .eq("id", businessId);

    if (updateError) {
      // The number was purchased but we couldn't save it — log critically
      // so an operator can manually associate the number.
      console.error(
        `[Twilio/Provision] CRITICAL: Purchased ${purchasedNumber} but failed to save to DB for business ${businessId}:`,
        updateError
      );
      // Still return success so the caller (stripe webhook) can attempt VAPI provisioning
    } else {
      console.log(
        `[Twilio/Provision] Saved ${purchasedNumber} to business ${businessId}`
      );
    }

    return NextResponse.json({ phoneNumber: purchasedNumber });
  } catch (error) {
    console.error("[Twilio/Provision] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
