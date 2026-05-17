# CALLA Manual Onboarding SOP

**For:** Founder (you), onboarding clients one by one before the automated flow is live.
**Target time:** 15 minutes per client, start to finish.
**Last updated:** May 2026

---

## Before You Get on the Call

Have all of this ready before you touch any dashboard:

- [ ] Client's full business name (exactly how it should appear on calls)
- [ ] Business type (salon, med spa, dental, etc.)
- [ ] Services list (every service ARIA might be asked about)
- [ ] Their current phone number (the one they're forwarding from)
- [ ] Their Google review link (google.com/maps/... URL)
- [ ] Their preferred alert mobile number (where CALLA SHIELD texts go)
- [ ] Their zip code (for matching Twilio area code)
- [ ] Their business hours (day by day, open and close times)

Open these tabs before you start:
- Supabase dashboard — SQL editor
- Twilio console — Phone Numbers → Buy a Number
- Retell AI dashboard — Agents

---

## Step 1 — Supabase (2 min)

Open the **SQL Editor** in your Supabase dashboard.

Run this query, filling in the client's real info:

```sql
INSERT INTO businesses (
  user_id,
  name,
  original_number,
  phone_number,
  services,
  plan,
  calla_shield_enabled,
  business_hours,
  greeting_message
)
VALUES (
  '00000000-0000-0000-0000-000000000000',  -- placeholder: update after they create an account, or use your admin user_id for now
  'Salon Name',
  '+13055550000',   -- their CURRENT number (the one callers dial today)
  NULL,             -- will be filled in after Twilio step
  ARRAY['Haircuts', 'Color', 'Blowouts'],
  'pro',
  true,
  '{
    "monday":    {"open": "9:00 AM", "close": "6:00 PM", "closed": false},
    "tuesday":   {"open": "9:00 AM", "close": "6:00 PM", "closed": false},
    "wednesday": {"open": "9:00 AM", "close": "6:00 PM", "closed": false},
    "thursday":  {"open": "9:00 AM", "close": "6:00 PM", "closed": false},
    "friday":    {"open": "9:00 AM", "close": "5:00 PM", "closed": false},
    "saturday":  {"open": "10:00 AM", "close": "3:00 PM", "closed": false},
    "sunday":    {"open": null, "close": null, "closed": true}
  }',
  'Hi there! You''ve reached [Business Name] — I''m ARIA, and I''m here to help. What can I do for you today?'
)
RETURNING id;
```

**Copy the UUID that comes back.** You'll use it in every step from here.

> Note: `user_id` is required by the schema. If the client hasn't created a CALLA account yet, use your own admin user UUID as a placeholder and update it later when they sign up. You can find your user UUID in Supabase → Authentication → Users.

Also run this to store their Google review link and alert number. Replace the UUID with the one you just got:

```sql
UPDATE businesses
SET
  google_review_link = 'https://g.page/r/THEIR_REVIEW_ID/review',
  owner_phone = '+13055551234'   -- where SHIELD alerts go (owner's mobile)
WHERE id = 'PASTE-UUID-HERE';
```

---

## Step 2 — Twilio (3 min)

### Buy the number

1. Go to **console.twilio.com**
2. Click **Phone Numbers** → **Manage** → **Buy a Number**
3. In the search, enter their area code (from their current number or zip code)
4. Filter: check **Voice** and **SMS**
5. Pick any local number from the results
6. Click **Buy** — confirm the purchase ($1–2/month)

### Configure the webhook

1. After purchase, click the new number
2. Scroll to **Voice & Fax** → **A call comes in**
3. Set to: **Webhook** | **HTTP GET**
4. URL: `https://your-app-url.vercel.app/api/vapi/assistant?businessId=PASTE-UUID-HERE`

   Replace `your-app-url` with your actual Vercel deployment URL and paste the UUID from Step 1.

5. Click **Save**

### Save the number to Supabase

```sql
UPDATE businesses
SET phone_number = '+13055559999'   -- the Twilio number you just bought
WHERE id = 'PASTE-UUID-HERE';
```

---

## Step 3 — Retell AI (5 min)

### Create the agent

1. Go to **app.retellai.com**
2. Click **Create Agent**
3. Name it: `ARIA — [Business Name]`
4. Set the LLM to: **Custom LLM** or **Claude claude-sonnet-4-6** depending on your Retell plan

### Set the system prompt

Use the full ARIA template from `aria-persona.ts` (`buildAriaSystemPrompt`). Fill in the business context:

- `business.name` — the client's business name
- `business.services` — their services list
- `business.businessHours` — their hours day by day
- `business.ownerName` — owner's first name (optional but warm)

The function will generate the full formatted prompt. Copy the output and paste it into Retell's system prompt field.

If you don't want to run the function manually, here's the minimum you need to customize in the prompt:

```
Business name: [Name]
Owner: [First name]

Services:
  - [Service 1]
  - [Service 2]
  - [Service 3]

Business hours:
  - Monday: 9:00 AM – 6:00 PM
  - Tuesday: 9:00 AM – 6:00 PM
  - [etc.]
```

### Import the Twilio number

1. In Retell, go to **Phone Numbers** → **Import Number**
2. Enter your Twilio Account SID and Auth Token
3. Select the number you just bought
4. Assign it to the ARIA agent you just created

### Test the agent

Call the Twilio number from your own phone. ARIA should answer with the greeting you set. Confirm:
- [ ] She says the correct business name
- [ ] She knows the services when you ask
- [ ] She handles a booking request correctly
- [ ] She sounds warm, not robotic

If anything is off, adjust the system prompt and call again.

---

## Step 4 — Client Setup (2 min)

Text the client (use the template in the "Client Communications" section below):

> "Your CALLA is live. Your new number is [Twilio number]. Now just forward your old number to it."

Send them the call forwarding guide: `/calla/CALL-FORWARDING-GUIDE.md`

Then confirm with them:
- [ ] They forwarded their number
- [ ] You called their original number and ARIA answered

If ARIA didn't answer, troubleshoot the forwarding before moving to Step 5.

---

## Step 5 — CALLA SHIELD (1 min)

Verify both fields are set in Supabase:

```sql
SELECT
  name,
  owner_phone,
  google_review_link,
  calla_shield_enabled
FROM businesses
WHERE id = 'PASTE-UUID-HERE';
```

Both `owner_phone` and `google_review_link` should be non-null. `calla_shield_enabled` should be `true`.

### Test SHIELD

Make a test call to the client's forwarded number. Have a short conversation with ARIA. Then check Supabase to confirm a row was created in the `calls` table:

```sql
SELECT
  id,
  caller_number,
  duration_seconds,
  sentiment,
  shield_sms_sent,
  review_prompted
FROM calls
WHERE business_id = 'PASTE-UUID-HERE'
ORDER BY created_at DESC
LIMIT 3;
```

Also check that the owner received an SMS summary on their alert number. That's the SHIELD call summary firing correctly.

If the SMS didn't arrive:
- Confirm `owner_phone` is in E.164 format (`+1XXXXXXXXXX`)
- Check your Twilio console → Logs → Messaging to see if the message was attempted

---

## Step 6 — Handoff

Send the client the "You're live" message (template below).

Add three follow-up reminders to your calendar or task manager:
- **Day 1** — same-day or next morning check-in
- **Day 3** — first SHIELD report
- **Day 7** — conversion ask

---

## Client Communications

### "Your CALLA is live"

Send this the moment Step 5 is confirmed.

**SMS:**
```
Hey [Name]! CALLA is live for [Business Name].

Your new number: [Twilio number]
Forward your current number to this number and you're all set.

Call forwarding guide: [link to guide]

ARIA is answering calls right now. You'll get a text summary after each call. If anything sounds off, just reply here.

— [Your name], CALLA
```

---

### Day 1 Check-in

Send the morning after their first live night (or same evening if they went live during the day).

**SMS:**
```
Hey [Name]! How did CALLA's first night go?

Did ARIA pick up any calls? Any feedback from callers so far?

I'm watching the dashboard and everything looks good on my end — just want to make sure it felt right to you.

— [Your name]
```

---

### Day 3 SHIELD Report

Pull their call stats from Supabase before sending:

```sql
SELECT
  COUNT(*) AS total_calls,
  COUNT(*) FILTER (WHERE sentiment = 'positive') AS positive,
  COUNT(*) FILTER (WHERE sentiment = 'neutral')  AS neutral,
  COUNT(*) FILTER (WHERE sentiment = 'negative') AS negative,
  COUNT(*) FILTER (WHERE shield_sms_sent = true)  AS shield_alerts,
  COUNT(*) FILTER (WHERE review_prompted = true)  AS review_requests_sent
FROM calls
WHERE
  business_id = 'PASTE-UUID-HERE'
  AND created_at > now() - interval '3 days';
```

**SMS:**
```
Hey [Name]! Here's your CALLA report for the first 3 days:

Calls answered: [X]
Happy callers: [X]
Neutral: [X]
Needed follow-up: [X]
Review requests sent: [X]

[If negative calls > 0:]
ARIA flagged [X] caller(s) who might have been frustrated. We sent you alerts in real time so you could follow up. Did those get resolved?

Everything's running smoothly. Let me know if you want to tweak anything about how ARIA talks or what she knows.

— CALLA
```

---

### Day 7 Conversion Ask

**SMS:**
```
Hey [Name] — it's been a week. ARIA has answered [X] calls for [Business Name]. How's it feeling?

If you're happy with how things are going, now's a good time to make it official. I can set you up on a monthly plan that fits your call volume.

Want to jump on a quick call this week and lock it in? Just say the word.

— [Your name], CALLA
```

---

## Quick Reference

| Step | Tool | Time | Key action |
|---|---|---|---|
| 1 | Supabase | 2 min | INSERT businesses row, copy UUID |
| 2 | Twilio | 3 min | Buy number, set webhook, update Supabase |
| 3 | Retell AI | 5 min | Create agent, load ARIA prompt, import number, test call |
| 4 | Client | 2 min | Text number, confirm forwarding |
| 5 | Supabase | 1 min | Verify SHIELD fields, test call, confirm SMS fired |
| 6 | You | — | Send "live" message, set Day 1/3/7 reminders |

---

## Common Issues

**ARIA answers with the wrong business name.**
You probably copied a prompt from a previous client. Check the system prompt in Retell and update the business name field.

**No call row appearing in Supabase.**
The VAPI webhook isn't firing. Check Retell → Agent → Server URL. It should be `https://your-app-url.vercel.app/api/vapi/webhook`. Also check Vercel function logs for errors.

**Owner isn't getting SHIELD texts.**
Check `owner_phone` in Supabase — must be E.164 format (`+13055551234`, not `(305) 555-1234`). Then check Twilio logs.

**Client says ARIA doesn't know about a service.**
Add the service to the `services` array in Supabase and update the system prompt in Retell. Both need to match.

```sql
UPDATE businesses
SET services = ARRAY['Haircuts', 'Color', 'Blowouts', 'New Service']
WHERE id = 'PASTE-UUID-HERE';
```
