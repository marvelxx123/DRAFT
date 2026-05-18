# CALLA — Technical Setup & Launch Guide
**Target: Live in 7 days. Under $500 upfront.**
*Pricing current as of May 2026.*

---

## 1. Platform Recommendation

### Comparison Matrix

| Criterion | Bland.ai | VAPI | Retell AI | Synthflow |
|-----------|----------|------|-----------|-----------|
| **Base platform fee** | $0 (pay-as-you-go) | $0 (Build tier) | $0 (pay-as-you-go) | $0 (pay-as-you-go) |
| **Effective cost/min (realistic)** | $0.14/min (Start) | $0.15–0.25/min | $0.11–0.15/min | $0.15–0.24/min |
| **Voice quality** | Good (limited voices) | Excellent (bring ElevenLabs) | Excellent (ElevenLabs built-in) | Good |
| **Latency** | ~800ms avg (reported issues) | ~600ms | ~500ms | ~700ms |
| **Ease of setup** | Moderate (API-heavy) | Hard (component assembly) | Easy (all-in-one) | Easy (no-code UI) |
| **Calendar/booking** | Via webhook/Zapier | Native Google Cal tool | Native (Calendly + Google Cal) | Via webhook |
| **Post-call webhooks** | Yes | Yes | Yes (built-in analytics) | Yes |
| **Built-in sentiment analysis** | No | No | **Yes (built-in, -1 to +1 score)** | No |
| **Built-in SMS** | $0.02/msg | $0.005/msg | $20/mo subscription + usage | Via Twilio BYOK |
| **Native white-label** | No | No | No (partner program) | $2,000/mo |
| **Concurrent calls (free)** | Not disclosed | 10 included | **20 included** | 5 included |
| **Phone number cost** | Via Twilio | Twilio pass-through | $2/mo (Retell numbers) | $1.50/mo |
| **Data retention** | 14 days | 14 days (Build) | Standard | Standard |
| **Air.ai** | **SKIP** — platform is effectively inactive in 2026, $25K–$100K licensing, enterprise-only |

### Recommendation: Retell AI

**Use Retell AI as your voice infrastructure.** Here is why:

1. **Lowest realistic all-in cost.** With GPT-4.1 mini as LLM (~$0.01/min) + Retell voice engine ($0.055/min) + telephony ($0.015/min), you land at approximately **$0.08–0.11/min** for a standard business call — the lowest realistic rate among evaluated platforms.

2. **CALLA SHIELD is free to build on Retell.** Retell's built-in post-call analysis outputs a sentiment score (-1.0 to +1.0) automatically on every call. You do not need to pay a separate OpenAI or Claude API call for sentiment — it's included in the per-minute rate. This is the single biggest technical advantage for CALLA's differentiator.

3. **Calendar integrations are native.** Retell has direct Calendly and Google Calendar integrations out of the box, not webhook-only.

4. **20 concurrent calls free.** With 10 clients you will never need to pay for concurrency upgrades.

5. **VAPI is more powerful but requires assembling 5+ vendors.** It's the right choice at 500+ clients when you need custom infrastructure. Not for Week 1.

6. **Synthflow's white-label costs $2,000/mo.** That is $24,000/year before you have clients. Disqualified for Year 1.

7. **Bland.ai** revised pricing upward in late 2025. Its $0.09/min advertised rate is now enterprise-only. The Start plan at $0.14/min is worse than Retell.

**Recommended Stack:**
- Voice AI: **Retell AI** (pay-as-you-go)
- Phone Numbers: **Twilio** (for number provisioning and call forwarding from client's existing number) OR Retell's native numbers at $2/mo each
- SMS: **Telnyx** (at $0.004/SMS, 2x cheaper than Twilio SMS for SHIELD alerts)
- Automation: **Make.com** (for CALLA SHIELD webhook logic — 10,000 ops/mo for $10.59/mo vs Zapier's 2,000 tasks for $19.99/mo)
- Payments: **Stripe** (no monthly fee, 2.9% + $0.30/transaction)
- Client Dashboard: **GoHighLevel Agency Pro** ($497/mo, white-label, automated billing, built-in CRM — justified at 6+ clients)

---

## 2. Step-by-Step Launch Stack

### Account Creation Order (do these in sequence — dependencies matter)

#### Day 1: Core Infrastructure

**Step 1 — Retell AI** (30 minutes)
- Sign up at retellai.com → Pay-as-you-go (free, $10 credits included)
- Create your first AI agent template: set system prompt for generic "answering service" persona
- Note your API key — you'll use it in Make.com later
- Enable post-call analysis on your account (Settings → Analytics)

**Step 2 — Twilio** (20 minutes)
- Sign up at twilio.com → Upgrade from trial ($20 deposit required to unlock full features)
- Purchase one US local number: $1.15/mo
- This number is your "CALLA provisioning number" for testing
- Note your Account SID and Auth Token for Make.com

**Step 3 — Telnyx** (15 minutes)
- Sign up at telnyx.com → add $20 credit
- This handles CALLA SHIELD SMS only (cheaper than Twilio SMS)
- Purchase one 10DLC-registered number: ~$1/mo
- Complete 10DLC brand registration (required for A2P SMS — takes 1–3 days, do this first)
- Note your API key

**Step 4 — Make.com** (10 minutes)
- Sign up at make.com → Core plan ($10.59/mo, 10,000 ops)
- No configuration yet — set up scenarios in Day 3

#### Day 2: Payments + Client Interface

**Step 5 — Stripe** (20 minutes)
- Sign up at stripe.com → activate account (free, no monthly fee)
- Create two products:
  - "CALLA Starter" — $297/mo recurring
  - "CALLA Pro" — $497/mo recurring
- Enable Stripe Customer Portal (clients can manage their own subscription)
- Note your Stripe webhook secret — needed for GoHighLevel

**Step 6 — GoHighLevel Agency Pro** ($497/mo) (45 minutes)
- Sign up at gohighlevel.com → Agency Pro plan
- Connect your Stripe account for automated client billing
- Set up white-label domain (yourname.com/login)
- Create two sub-account snapshots (templates):
  - "CALLA Starter Client" — pre-loaded CRM, call log pipeline
  - "CALLA Pro Client" — adds review request automation
- This is your client-facing dashboard. Clients log in here to see call logs, recordings, and SHIELD alerts.
- **Cost justification:** At 2 clients paying $297/mo = $594 revenue. GHL costs $497. You're already profitable on tooling.

#### Day 3: Integration & Automation

**Step 7 — Google Calendar / Calendly** (10 minutes)
- Use client's existing Google Workspace or Calendly account
- In Retell AI dashboard: Agent → Tools → Add Calendar Tool
- Select "Google Calendar" or "Calendly" → OAuth authorize with client credentials
- Set booking instructions in agent prompt: "If the caller wants to schedule an appointment, use the booking tool to check availability and confirm a time."

**Step 8 — Make.com CALLA SHIELD Scenario** (45 minutes — see Section 3 for full build)
- Connect Retell AI webhook → Make.com HTTP listener
- Build sentiment routing logic
- Connect Telnyx SMS module
- Test end-to-end

**Step 9 — Connect Everything in GoHighLevel** (30 minutes)
- Install the "Retell AI" integration or use webhook triggers in GHL workflows
- Set up inbound call notifications to client's GHL sub-account
- Configure GoHighLevel pipeline: New Call → In Progress → Completed → Booked / Not Booked

#### Day 4–5: Testing

**Step 10 — Test the Full Flow**
- Call your Twilio/Retell test number
- Verify agent answers with correct persona
- Test calendar booking: "I'd like to schedule a consultation"
- Verify post-call webhook fires to Make.com
- Verify SHIELD SMS sends to test number
- Log into GHL sub-account and confirm call appears

#### Days 6–7: First Client Onboarding
- Follow the Client Onboarding Checklist in Section 4

---

## 3. CALLA SHIELD Technical Implementation

CALLA SHIELD is your free differentiator: every call triggers automated sentiment analysis and routes to either a Google Review request (positive) or an owner alert (negative).

### Architecture

```
Call ends
    │
    ▼
Retell AI fires post_call_analysis webhook
(JSON payload includes transcript + sentiment_score: -1.0 to 1.0)
    │
    ▼
Make.com HTTP webhook listener receives payload
    │
    ├── sentiment_score >= 0.3 → POSITIVE path
    │       │
    │       └── Telnyx SMS to caller:
    │           "Thanks for calling [Business]! We'd love your feedback:
    │            [Google Review Link]. Reply STOP to opt out."
    │
    ├── sentiment_score -0.2 to 0.3 → NEUTRAL (no action or log only)
    │
    └── sentiment_score < -0.2 → NEGATIVE path
            │
            └── Telnyx SMS to business owner:
                "⚠ CALLA SHIELD Alert: Possible unhappy caller.
                 Caller: [caller_number] at [time].
                 Transcript snippet: [first 200 chars]
                 Call back ASAP."
```

### Make.com Scenario — Exact Build Steps

**Scenario: "CALLA SHIELD"**

1. **Module 1 — Webhooks: Custom Webhook** (trigger)
   - Create a new webhook URL in Make.com
   - Paste this URL into Retell AI: Dashboard → Settings → Webhooks → Post Call Analysis URL
   - Retell sends: `call_id`, `caller_number`, `called_number`, `transcript`, `call_analysis.user_sentiment` (score -1 to 1), `call_duration_seconds`

2. **Module 2 — Router** (branching)
   - Route A condition: `{{1.call_analysis.user_sentiment}} >= 0.3`
   - Route B condition: `{{1.call_analysis.user_sentiment}} < -0.2`
   - Route C: (everything else — neutral, log only)

3. **Module 3A — Telnyx: Send SMS** (positive branch)
   - From: Your Telnyx 10DLC number
   - To: `{{1.caller_number}}`
   - Message: `"Thanks for calling [Client Name]! We'd love a quick review: [GOOGLE_REVIEW_URL]"`
   - Store per-client Google Review URL as a Make.com variable or data store value keyed by the called number

4. **Module 3B — Telnyx: Send SMS** (negative branch)
   - From: Your Telnyx 10DLC number
   - To: Client owner's cell phone (stored in Make.com data store keyed by called number)
   - Message: `"⚠ CALLA Alert — Possible unhappy caller at [time]. Number: [caller_number]. Transcript: [first 200 chars of transcript]. Call them back."`

5. **Module 4 (all branches) — GoHighLevel: Create/Update Contact**
   - Log call outcome, sentiment score, and caller number to GHL CRM

**Total Make.com operations per call: 4–6 ops** (well within 10,000/mo free tier for 100+ clients)

### Sentiment API Decision

**Use Retell AI's built-in sentiment analysis — do not pay for a separate API.**

Retell's post-call analysis engine outputs `user_sentiment` as a float (-1.0 to +1.0) on every call at no additional per-call charge. It analyzes tone, pacing, pitch, contextual language, and phrase patterns. This is included in your per-minute rate.

Only consider switching to a standalone sentiment API (Claude Haiku 4.5 at $1/M input tokens or GPT-4.1 mini) if you need:
- Multi-language sentiment beyond what Retell covers
- Custom sentiment categories (e.g., "frustrated about pricing" vs. "frustrated about service")

At launch, Retell's built-in is sufficient and the cost is zero.

### SMS Provider Decision

Use **Telnyx** for CALLA SHIELD SMS, not Twilio.

| | Twilio | Telnyx |
|---|---|---|
| SMS cost (US) | $0.0083/msg | $0.0040/msg |
| Inbound SMS | $0.0083/msg | $0.0040/msg |
| Number cost | $1.15/mo | ~$1.00/mo |
| Setup | Easy | Easy |
| 10DLC registration | Required | Required |

Telnyx is 52% cheaper per message. At scale (500 clients × 10 SHIELD SMS/day = 5,000 SMS/day), Telnyx saves $6,000+/year vs Twilio.

### CALLA SHIELD Cost Per Call

Assuming a 3-minute average call:

| Component | Cost |
|-----------|------|
| Retell AI voice (3 min × $0.09/min blended) | $0.27 |
| Sentiment analysis (built into Retell) | $0.00 |
| SHIELD SMS (1 SMS via Telnyx, triggered ~60% of calls) | $0.0024 |
| Make.com ops (4 ops × $0.000001/op) | ~$0.000004 |
| **CALLA SHIELD add-on cost per call** | **~$0.002** |

CALLA SHIELD costs essentially nothing to run. It is pure margin and pure differentiation.

---

## 4. Client Onboarding Technical Checklist

**Target: 15 minutes from payment to live.**

### Pre-Requisites (Set Up Once)
- [ ] Retell AI base agent template saved (system prompt with `{{business_name}}`, `{{business_hours}}`, `{{services}}`, `{{booking_instructions}}` variables)
- [ ] Make.com SHIELD scenario live and tested
- [ ] GoHighLevel sub-account snapshot ready to deploy
- [ ] Telnyx SHIELD number registered and tested

### Per-Client Onboarding Steps

**Step 1 — Stripe Payment Triggers Automation (0 min, automated)**
- Client pays on your website via Stripe checkout link
- Stripe webhook fires to Make.com (or Zapier) → creates GHL sub-account → sends welcome email with login

**Step 2 — Provision CALLA Phone Number (2 min)**
- Option A (Recommended): In Retell AI dashboard → Phone Numbers → Purchase New Number ($2/mo)
  - Select area code matching client's city for local presence
  - Assign the base AI agent template to this number
- Option B: In Twilio Console → Phone Numbers → Buy ($1.15/mo)
  - Configure webhook: `https://api.retellai.com/twilio-voice-webhook/[AGENT_ID]`
  - This routes all inbound calls to Retell AI

**Step 3 — Configure AI Agent with Client's Business Info (5 min)**
- In Retell AI: Agents → Clone base template → Rename to client
- Fill variables in system prompt:
  - `business_name`: "Smith Plumbing"
  - `business_hours`: "Monday–Friday 8am–5pm Pacific"
  - `services`: "Residential and commercial plumbing, drain cleaning, water heater installation"
  - `booking_instructions`: "Appointments available same-day for emergencies, next-day for standard service"
  - `owner_name`: "Mike Smith"
  - `fallback_number`: Client's personal cell (for transfers if AI can't handle)
- Assign this agent to the provisioned phone number

**Step 4 — Set Up Call Forwarding from Client's Existing Number (3 min)**

The client keeps their existing phone number — they simply forward it to the CALLA number.

Forwarding setup by carrier type:
- **AT&T landline**: Dial `*72` then the CALLA number, press #
- **Verizon mobile**: Settings → Call Forwarding → Enable → Enter CALLA number
- **Most VoIP/Google Voice**: Settings → Calls → Forward to → Enter CALLA number
- **If client has existing Twilio number**: Update TwiML webhook to point to Retell agent URL

Alternatively, CALLA can handle this technically: provision the CALLA number, and instruct the client to have calls forwarded from their carrier's app or call their carrier support.

**Step 5 — Connect Client's Calendar (3 min)**
- In Retell AI agent: Tools → Add Tool → Google Calendar or Calendly
- Click "Connect" → OAuth flow with client's Google account (or Calendly API key)
- Set buffer time and booking window in the tool configuration
- Test: Call the number, ask to book an appointment, verify it appears in calendar

**Step 6 — Configure SHIELD for This Client (1 min)**
- In Make.com data store: add entry for client's CALLA number
  - Key: CALLA phone number (E.164 format)
  - Values: `owner_cell`, `google_review_url`, `business_name`
- No code changes needed — the scenario reads from the data store dynamically

**Step 7 — Test the Full Flow (2 min)**
- Call the CALLA number
- Confirm AI answers: "Thank you for calling [Business Name]! How can I help you today?"
- Test booking: "I'd like to make an appointment for Tuesday afternoon"
- Verify calendar event created
- End call → wait 30 seconds → verify SHIELD SMS arrives on owner's cell

**Total time: ~15 minutes** (5 min admin, 10 min config)

---

## 5. Monthly Cost at Various Client Scales

### Cost Assumptions
- Average call duration: 3 minutes
- Average calls per client per month: 200 (small business)
- Retell AI blended rate: $0.09/min (voice engine $0.055 + GPT-4.1 mini LLM $0.015 + telephony $0.015 + small buffer)
- SHIELD SMS: 60% of calls trigger 1 SMS = 120 SMS/client/month @ $0.004 (Telnyx)
- GoHighLevel: $497/mo fixed (Agency Pro)
- Make.com: $10.59/mo (Core, 10K ops — sufficient through ~80 clients)
- Telnyx SHIELD number: $1/mo (one shared number for outbound SHIELD)
- Retell phone numbers: $2/client/mo

### Cost Tables

#### At 10 Clients

| Cost Item | Monthly |
|-----------|---------|
| Retell AI voice (10 clients × 200 calls × 3 min × $0.09) | $540 |
| Retell phone numbers (10 × $2) | $20 |
| GoHighLevel Agency Pro | $497 |
| Make.com Core | $11 |
| Telnyx SHIELD SMS (10 × 120 SMS × $0.004) | $5 |
| Telnyx number (1 shared SHIELD number) | $1 |
| Stripe fees (10 × $297 × 2.9% + $0.30) | $89 |
| **Total Monthly Cost** | **$1,163** |
| **Revenue (10 × $297)** | **$2,970** |
| **Gross Profit** | **$1,807** |
| **Margin** | **61%** |

#### At 50 Clients

| Cost Item | Monthly |
|-----------|---------|
| Retell AI voice (50 × 200 × 3 × $0.09) | $2,700 |
| Retell phone numbers (50 × $2) | $100 |
| GoHighLevel Agency Pro | $497 |
| Make.com Core → upgrade to Pro at $19/mo | $19 |
| Telnyx SHIELD SMS (50 × 120 × $0.004) | $24 |
| Telnyx numbers (2 numbers for redundancy) | $2 |
| Stripe fees (50 × $297 × 2.9% + $0.30) | $446 |
| **Total Monthly Cost** | **$3,788** |
| **Revenue (50 × $297)** | **$14,850** |
| **Gross Profit** | **$11,062** |
| **Margin** | **74%** |

#### At 100 Clients

| Cost Item | Monthly |
|-----------|---------|
| Retell AI voice (100 × 200 × 3 × $0.085 — slight volume discount) | $5,100 |
| Retell phone numbers (100 × $2) | $200 |
| GoHighLevel Agency Pro | $497 |
| Make.com Teams plan (higher ops) | $29 |
| Telnyx SHIELD SMS (100 × 120 × $0.004) | $48 |
| Telnyx numbers | $3 |
| Stripe fees (100 × $297 × 2.9% + $0.30) | $891 |
| Part-time support hire or VA (est.) | $1,000 |
| **Total Monthly Cost** | **$7,768** |
| **Revenue (100 × $297)** | **$29,700** |
| **Gross Profit** | **$21,932** |
| **Margin** | **74%** |

#### At 500 Clients

At this scale, negotiate volume pricing with Retell AI (contact enterprise sales; expect $0.06–0.07/min blended). Switch higher-tier clients to $497/mo Pro pricing.

| Cost Item | Monthly |
|-----------|---------|
| Retell AI voice (500 × 200 × 3 × $0.07 — volume rate) | $21,000 |
| Retell phone numbers (500 × $2) | $1,000 |
| GoHighLevel Agency Pro | $497 |
| Make.com Teams or custom | $100 |
| Telnyx SHIELD SMS (500 × 120 × $0.004) | $240 |
| Telnyx numbers | $10 |
| Stripe fees (blended: 400 × $297 + 100 × $497 × 2.9% + $0.30) | $5,000 est. |
| Engineering + support team (3 FTE est.) | $25,000 |
| **Total Monthly Cost** | **$52,847** |
| **Revenue (400 × $297 + 100 × $497)** | **$168,500** |
| **Gross Profit** | **$115,653** |
| **Margin** | **69%** |

> Note: At 500 clients, you should strongly consider migrating from Retell AI (reseller) to VAPI with your own provider keys (ElevenLabs, Deepgram, OpenAI) to reduce voice infrastructure cost by 30–40% further.

---

## 6. What to Build Custom (Later) vs. Use Off-the-Shelf Now

### Year 1: Use Everything Off-the-Shelf

Do not build any of this in Year 1. Your job is to find clients and prove the model.

| What NOT to Build | Why Not | Use Instead |
|---|---|---|
| Custom voice AI infrastructure | 6–12 months of engineering | Retell AI |
| Custom client dashboard / portal | Months of dev time | GoHighLevel white-label |
| Custom billing system | Complex, compliance risk | Stripe + GHL |
| Custom phone number provisioning API | Requires carrier relationships | Twilio / Retell numbers |
| Custom SMS delivery | 10DLC compliance nightmare | Telnyx |
| Custom analytics / reporting | Not your moat | GHL + Retell dashboard |
| Custom booking widget | Solved problem | Calendly / Google Cal |
| Custom CRM | Not your core product | GoHighLevel CRM |
| Custom IVR / call routing | Already built | Retell AI routing |
| White-label mobile app | Expensive, slow | GHL white-label mobile app (included in Agency Pro) |

**Year 1 focus:** Sales, client success, and refining the CALLA SHIELD positioning. Get to 50 paying clients.

### Year 2: Build These When Revenue Justifies It

Revenue threshold: **$200K+ ARR** (approximately 55+ clients at $297/mo). At this point engineering investment has real ROI.

| What to Build | Why | Estimated Build Cost | Monthly Savings |
|---|---|---|---|
| **Own VAPI/Retell infrastructure with direct provider keys** | At 500+ clients, direct ElevenLabs + Deepgram + OpenAI is 30% cheaper than Retell's packaged rate | $15K one-time | $3,000–6,000/mo at scale |
| **Custom client onboarding portal** | Replace GHL for a purpose-built CALLA portal that does onboarding in 5 min, not 15. Genuine competitive moat | $20K one-time | Reduced churn |
| **SHIELD 2.0: multi-channel alerts** | Slack, email, and SMS for owner alerts. Review request via email + text | $5K | Upsell $50/mo/client |
| **Custom analytics dashboard** | Branded, call volume trends, sentiment trends, missed call rate. Client retention tool | $10K | Reduced churn |
| **Vertical-specific AI agent templates** | Pre-built agents for dental, HVAC, legal, real estate. Reduces onboarding to 5 minutes | $8K | Faster sales cycle |
| **Multi-location support** | One client, multiple numbers, location-routing, consolidated billing | $12K | Enables $997/mo enterprise tier |
| **API for agency resellers** | Let other agencies white-label CALLA. Wholesale pricing, your margins expand | $20K | New revenue channel |

### Never Build in Year 1 or 2

- **Your own STT (speech-to-text) model** — ElevenLabs, Deepgram, and OpenAI are better-funded than you
- **Your own TTS voice model** — same reason
- **Your own LLM** — same reason
- **Custom telephony infrastructure / SIP trunking** — regulatory complexity, capital requirements, requires telecom expertise

### The Honest Year 1 Stack Cost

You are essentially renting a $200K/year engineering team (Retell AI) for $0 upfront plus per-minute usage. That is the correct trade-off. Your moat is not the technology — it is distribution, client relationships, vertical expertise, and the CALLA SHIELD brand promise.

---

## Appendix: Upfront Cost to Launch

| Item | Cost |
|------|------|
| Retell AI (pay-as-you-go, no upfront) | $0 |
| Twilio account deposit | $20 |
| Telnyx account deposit | $20 |
| GoHighLevel Agency Pro (first month) | $497 |
| Make.com Core (first month) | $11 |
| Stripe (no setup fee) | $0 |
| Domain + hosting for marketing site | $20 |
| **Total Upfront** | **$568** |

> Slightly over $500 due to GHL's $497 cost, but GHL pays for itself the moment the first client ($297) pays. Consider starting on GHL's $97 Starter plan for the first 30 days and upgrading once you have 2+ clients.

**With GHL Starter ($97) as first-month substitute:**

| Item | Cost |
|------|------|
| GoHighLevel Starter (Month 1) | $97 |
| Twilio deposit | $20 |
| Telnyx deposit | $20 |
| Make.com Core | $11 |
| Domain + hosting | $20 |
| **Total Upfront (Month 1)** | **$168** |

At 2 clients ($594/mo revenue), upgrade to GHL Agency Pro. You're live, profitable, and under $500 upfront.
