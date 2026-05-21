# Jacksonville Garage Door Lead Machine

This is your automated lead generation system. It runs in the background while you're out working and finds people in Jacksonville who need garage door help — before your competition does.

---

## The 5-Agent Team (Plain English)

**1. Scout** (`agents/scout.js`)
Scans Craigslist Jacksonville every 2 hours looking for garage door posts. Like having an assistant who watches Craigslist all day so you don't have to.

**2. Qualifier** (`agents/qualifier.js`)
Reads each lead and scores it. Emergency leads (broken spring, car trapped, won't open) go to the top of the list. Low-priority leads (just browsing, commercial, far away) get sorted below.

**3. Outreach** (`agents/outreach.js`)
Writes a personalized response for each lead — emergency tone for urgent ones, friendly quote offer for standard ones. All you do is copy and paste it. No more staring at a blank screen wondering what to write.

**4. Follow-Up** (`agents/followUp.js`)
Checks your outreach log every cycle. If someone hasn't responded after 24 hours and you haven't marked them as contacted, it writes a short follow-up message. One follow-up doubles your close rate.

**5. Profile Keeper** (`agents/profileKeeper.js`)
Generates a weekly to-do list to keep your free Google, Yelp, Thumbtack, and Nextdoor listings fresh. Fresh listings rank higher. Higher rank = free phone calls.

---

## How to Run

```bash
# Run one lead cycle manually (finds leads right now):
node leads/orchestrator.js

# Start the automatic scheduler (runs every 2 hours):
node leads/cron.js

# View your dashboard (after starting the main server):
node server/index.js
# Then open: http://localhost:3000/leads/
```

---

## Automated Scheduling (Free)

### Option A — Railway Cron Job (Recommended — your app is already there)
1. Go to your Railway project dashboard
2. Click **New Service** → **Cron Job**
3. Set the command to: `node leads/orchestrator.js`
4. Set the schedule to: `0 */2 * * *` (every 2 hours)
5. Done — it runs forever without your computer being on

### Option B — cron-job.org (also free)
1. Go to https://cron-job.org and sign up (free)
2. Create a new cron job
3. URL: your Railway app URL + `/api/health`
4. Schedule: every 2 hours
5. This keeps your app awake, but for the lead scan you'd want to add a `/leads/api/run` trigger endpoint

### Option C — Run it on your phone's hotspot overnight
Just leave `node leads/cron.js` running. Not fancy but it works.

---

## Step-by-Step: Set Up Google Business Profile (Most Important!)

Google Business Profile is 100% free and the single best way to get garage door calls in Jacksonville. When someone searches "garage door repair near me," you want to show up in the map results.

1. **Go to** https://business.google.com
2. **Click** "Manage now" and sign in with a Google account
3. **Search** for your business name — if it doesn't exist, click "Add your business to Google"
4. **Choose category:** Select "Garage Door Supplier" or "Garage Door Repair Service"
5. **Add your service area:** Jacksonville, Orange Park, Fleming Island, Ponte Vedra, Mandarin — all the areas you cover
6. **Add your phone number** — this is how they call you directly from Google Maps
7. **Verify your business:** Google will mail a postcard to your address with a 5-digit code (takes 1-2 weeks). Enter the code to verify.
8. **After verifying:**
   - Add 10+ photos (your truck, your tools, before/after jobs)
   - Write a description mentioning "Jacksonville garage door repair," "broken spring," "same-day service"
   - Add all your services with descriptions
   - Set your hours accurately
9. **Every week:** Post one photo or update to stay active in rankings

**Pro tip:** Ask every happy customer to leave a Google review. Even 5 reviews beats most competitors who have zero.

---

## Step-by-Step: Set Up Thumbtack (Second Most Important)

Thumbtack connects homeowners actively looking for a pro with local technicians. It's free to join and you only pay when you choose to respond to a lead.

1. **Go to** https://www.thumbtack.com/pro and click "Get started"
2. **Enter your trade:** Search for "Garage Door Repair" or "Garage Door Installation"
3. **Set your service area:** Jacksonville metro + surrounding areas
4. **Fill out your profile:**
   - Add a clear headshot or professional photo
   - Write a bio that mentions Jacksonville, your experience, and what you specialize in
   - List your services and rough price ranges (customers want to see ballpark numbers)
5. **Add your license and insurance info** — this makes you stand out from unlicensed competitors
6. **Request reviews:** Thumbtack will prompt you to invite past customers via email — do this immediately
7. **Set your preferences:** Tell Thumbtack what job types and size you want
8. **Respond fast:** Thumbtack shows customers who responds quickly — aim for under 1 hour

**Cost note:** Leads on Thumbtack cost $5-$20 each. Only respond to leads you actually want. Emergency jobs are worth paying for.

---

## How to Post on Craigslist Jacksonville Services

Craigslist posts in the services section cost **$5** and stay up for 30 days. That's $5 for potentially dozens of calls.

1. **Go to** https://jacksonville.craigslist.org
2. **Click** "post to classifieds" in the top left
3. **Choose:** Service offered → Skilled Trades / Artisan
4. **Write your post:**

```
Title: Garage Door Repair - Same Day Service - Jacksonville & Surrounding Areas

Body:
Local Jacksonville garage door technician — licensed and insured.

Services:
- Broken spring replacement (most common issue — $150-250 parts + labor)
- Cables off track or snapped
- Door won't open or close — opener repair or replacement
- New door installation
- Safety inspections and tune-ups

SAME DAY SERVICE available for emergencies. I carry parts on my truck.

Serving: Jacksonville, Orange Park, Fleming Island, Ponte Vedra, Mandarin, Southside, Northside

Call or text: [YOUR PHONE NUMBER]
```

5. **Add 2-3 photos** of your work or your truck
6. **Pay the $5** with a credit card
7. **Renew the post** every 30 days

---

## Jacksonville Facebook Groups to Join

Search for these groups on Facebook and request to join. Once accepted, you can post about your services (read the group rules first) and respond when people ask for garage door help.

1. **Jacksonville FL Community** — largest general group, 50,000+ members
2. **Jacksonville Neighborhood Network** — active local community board
3. **Fleming Island & Orange Park Community Board** — great for Westside customers
4. **Ponte Vedra Beach Locals** — higher-income area, bigger jobs
5. **Mandarin / Southside Jacksonville Community** — fast-growing area

**How to use them:**
- Search "garage door" in each group weekly — people ask for recommendations constantly
- Post a brief intro: "Hey neighbors! I'm a local garage door tech serving this area..."
- Reply to any posts asking for garage door help with a friendly, helpful response
- Don't spam — one good helpful reply is worth more than 10 sales pitches

---

## How to Set Up Email Alerts (Free with Gmail)

Right now, emergency leads print to the console. To get a **text message to your phone** when an emergency lead comes in:

1. **Create a Gmail App Password:**
   - Go to https://myaccount.google.com/security
   - Enable 2-Step Verification (if not already on)
   - Go to "App passwords" → Create one → Name it "Garage Lead Bot"
   - Copy the 16-character password (you only see it once)

2. **Add to your `.env` file:**
   ```
   ALERT_EMAIL_USER=your.gmail@gmail.com
   ALERT_EMAIL_PASS=abcd efgh ijkl mnop
   ALERT_EMAIL_TO=9045551234@txt.att.net
   ```

   SMS gateway addresses (replace the number with yours):
   - AT&T: `number@txt.att.net`
   - T-Mobile: `number@tmomail.net`
   - Verizon: `number@vtext.com`

3. **Activate in the code:**
   Open `leads/agents/outreach.js` and follow the TODO instructions to uncomment the nodemailer code.

4. **Install nodemailer:**
   ```bash
   npm install nodemailer
   ```

---

## File Structure

```
leads/
├── agents/
│   ├── scout.js          — Finds leads on Craigslist and other sources
│   ├── qualifier.js      — Scores and prioritizes leads
│   ├── outreach.js       — Generates response messages and logs them
│   ├── followUp.js       — Flags old leads that need a follow-up
│   └── profileKeeper.js  — Generates weekly listing maintenance checklist
├── data/
│   ├── outreach_log.json     — Record of every lead and outreach message
│   ├── profile_tasks.txt     — Weekly platform maintenance checklist
│   ├── lead_report_*.json    — Full report from each cycle
│   └── sample_lead.json      — Example lead (for testing the dashboard)
├── orchestrator.js       — Runs all 5 agents in sequence
├── cron.js               — Automated scheduler (every 2 hours)
├── api.js                — API endpoints for the dashboard
├── dashboard.html        — Mobile-friendly lead management UI
└── README.md             — This file
```

---

## Quick Wins Checklist (Do These First)

- [ ] Set up Google Business Profile — takes 30 min, pays off for years
- [ ] Join the 5 Facebook groups above and post an introduction
- [ ] Post on Craigslist Jacksonville — $5, takes 10 minutes
- [ ] Set up Thumbtack profile — free, takes 20 minutes
- [ ] Run `node leads/orchestrator.js` and check the dashboard
- [ ] Set up the cron job on Railway so it runs automatically

The goal is simple: get your name in front of Jacksonville homeowners before they find someone else. This system does the watching — you just have to show up and do the work.
