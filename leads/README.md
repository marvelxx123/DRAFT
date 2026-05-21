# 904 Garage Doors — Lead Generation System

## What this system does

- **Scouts** Craigslist Jacksonville every 2 hours for garage door leads and scores them Emergency / Standard / Opportunity
- **Generates** a personalized outreach message for every lead and logs who you've contacted — no more staring at a blank screen wondering what to write
- **Tracks** follow-ups automatically — flags leads you haven't heard from after 24 hours so nothing falls through the cracks

---

## How to run

```bash
# Run one lead cycle right now (finds leads, scores them, writes outreach messages):
node leads/orchestrator.js

# Start the automatic scheduler (runs every 2 hours, leave it running):
node leads/cron.js

# View the dashboard (start the server first, then open in browser):
node server/index.js
# → Open: http://localhost:3000/leads/dashboard
```

---

## 3 things blocking go-live

| # | Item | Status |
|---|------|--------|
| 1 | **Business phone** (904) 468-3428 | ✓ Done |
| 2 | **Facebook Business Page** — needed for Facebook Group leads | Not yet created |
| 3 | **Railway deploy** — needed for 24/7 automated scouting | Not yet deployed |

---

## Step-by-step: Set up a free Google Business Profile

Google Business Profile is the single most important free thing you can do — it puts you on Google Maps when someone searches "garage door repair near me."

1. Go to **https://business.google.com** and sign in with a Google account
2. Click **Manage now** → search for "904 Garage Doors" → if not found, click **Add your business to Google**
3. Choose category: **Garage Door Supplier** or **Garage Door Repair Service**
4. Set your service area: Jacksonville, Orange Park, Fleming Island, Ponte Vedra, Mandarin, Southside, Northside
5. Add your phone: **(904) 468-3428**
6. Click **Verify** — Google mails a postcard with a 5-digit code (1–2 weeks). Enter the code to go live.
7. After verifying: add 10+ photos (truck, tools, before/after jobs), write a description mentioning "Jacksonville garage door repair" and "same-day service," and add all your services
8. Every week: post one photo or job update to stay active in rankings

**Pro tip:** Ask every happy customer to leave a Google review. Even 5 reviews beats most competitors who have zero.

---

## Step-by-step: Create a Facebook Business Page for "904 Garage Doors"

1. Go to **https://www.facebook.com/pages/create**
2. Choose **Business or Brand**
3. Page name: **904 Garage Doors**
4. Category: **Garage Door Service** (search for it)
5. Add your phone **(904) 468-3428**, website, and service area
6. Upload a profile photo (your logo or a photo of your truck) and a cover photo (a job you're proud of)
7. Click **Publish Page**
8. In your `.env` file, add: `FACEBOOK_PAGE_URL=https://facebook.com/your-page-url`
9. Join these Jacksonville groups and introduce yourself: *Jacksonville FL Community*, *Fleming Island & Orange Park Community Board*, *Ponte Vedra Beach Locals*, *Mandarin / Southside Jacksonville Community*

---

## How to set up Railway cron to run the orchestrator every 2 hours

Your app is already on Railway — adding a cron job takes about 3 minutes.

1. Go to your Railway project at **https://railway.app/dashboard**
2. Click **New Service** (the + button)
3. Select **Cron Job**
4. Set **Command** to: `node leads/orchestrator.js`
5. Set **Schedule** to: `0 */2 * * *` (runs at the top of every even hour)
6. Click **Deploy**

That's it — the orchestrator now runs on Railway's servers 24/7, even when your phone is off. Leads will accumulate in `leads/data/` and show up on your dashboard automatically.
