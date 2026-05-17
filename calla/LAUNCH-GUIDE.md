# CALLA — Launch in 10 Minutes

Follow these steps IN ORDER. Each one takes 2 minutes or less.

---

## STEP 1 — Supabase (Database) — 2 min

1. Go to **supabase.com** → Sign up (free)
2. Create new project → name it `calla` → pick a region close to you → set a password
3. Wait ~60 seconds for it to provision
4. Go to **Settings → API** → copy:
   - `Project URL` → this is your `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → this is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → this is your `SUPABASE_SERVICE_ROLE_KEY`
5. Go to **SQL Editor** → paste the entire contents of `supabase/schema.sql` → click **Run**

---

## STEP 2 — Twilio (Phone Numbers + SMS) — 2 min

1. Go to **twilio.com** → Sign up (free trial gives $15 credit)
2. From the Console Dashboard, copy:
   - **Account SID** → `TWILIO_ACCOUNT_SID`
   - **Auth Token** → `TWILIO_AUTH_TOKEN`
3. Go to **Phone Numbers → Buy a Number** → buy any US local number
   - This is your `TWILIO_PHONE_NUMBER` (format: +1XXXXXXXXXX)

---

## STEP 3 — Retell AI (Voice AI Platform) — 1 min

1. Go to **retellai.com** → Sign up
2. Dashboard → **API Keys** → copy your key → `RETELL_API_KEY`
3. Go to **Phone Numbers** → import your Twilio number using your Twilio SID + Auth Token
   - Retell will give you a `Phone Number ID` → `RETELL_PHONE_NUMBER_ID`

---

## STEP 4 — Stripe (Payments) — 2 min

1. Go to **stripe.com** → Sign up
2. Dashboard → **Developers → API Keys** → copy:
   - `Publishable key` → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `Secret key` → `STRIPE_SECRET_KEY`
3. Go to **Products** → create 3 products:
   - CALLA Lite — $79/month recurring → copy the **Price ID** → `STRIPE_PRICE_LITE`
   - CALLA Pro — $149/month recurring → copy Price ID → `STRIPE_PRICE_PRO`
   - CALLA Business — $249/month recurring → copy Price ID → `STRIPE_PRICE_BUSINESS`
4. Go to **Developers → Webhooks** → Add endpoint:
   - URL: `https://your-vercel-url.vercel.app/api/stripe/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.deleted`, `customer.subscription.updated`
   - Copy the **Signing secret** → `STRIPE_WEBHOOK_SECRET`

---

## STEP 5 — Vercel (Deploy) — 2 min

1. Go to **vercel.com** → Sign up with GitHub
2. Click **Add New Project** → Import the `marvelxx123/DRAFT` repository
3. Set **Root Directory** to `calla-app`
4. Add ALL environment variables from your `.env.local` file (copy/paste each one)
5. Click **Deploy**

Your live URL will be: `https://calla-app.vercel.app` (or similar)

6. Copy that URL → go back to Stripe webhook → update the URL with your real Vercel domain
7. Set `NEXT_PUBLIC_APP_URL` in Vercel to your live URL

---

## STEP 6 — Fill in your `.env.local`

Open `calla-app/.env.local` — it already has the structure. Just paste your values:

```
NEXT_PUBLIC_SUPABASE_URL=           ← from Supabase Step 1
NEXT_PUBLIC_SUPABASE_ANON_KEY=      ← from Supabase Step 1
SUPABASE_SERVICE_ROLE_KEY=          ← from Supabase Step 1

TWILIO_ACCOUNT_SID=                 ← from Twilio Step 2
TWILIO_AUTH_TOKEN=                  ← from Twilio Step 2
TWILIO_PHONE_NUMBER=                ← from Twilio Step 2

RETELL_API_KEY=                     ← from Retell Step 3
RETELL_PHONE_NUMBER_ID=             ← from Retell Step 3

NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY= ← from Stripe Step 4
STRIPE_SECRET_KEY=                  ← from Stripe Step 4
STRIPE_WEBHOOK_SECRET=              ← from Stripe Step 4
STRIPE_PRICE_LITE=                  ← from Stripe Step 4
STRIPE_PRICE_PRO=                   ← from Stripe Step 4
STRIPE_PRICE_BUSINESS=              ← from Stripe Step 4

NEXT_PUBLIC_APP_URL=                ← your Vercel URL from Step 5
```

---

## You're Live.

Total cost to launch:
- Supabase: **$0** (free tier)
- Twilio: **$0** (trial credit covers first numbers + SMS)
- Retell AI: **$0** (free trial)
- Stripe: **$0** (no fees until you charge customers)
- Vercel: **$0** (free hobby plan)

**First paying client covers everything.**

Now go send your first DM using `calla/OUTREACH-KIT.md`.
