# DRAFT — Basketball Recruitment App

TikTok-style video feed for basketball players to get discovered by scouts.

---

## Deploy in 20 minutes (no experience needed)

### Step 1 — Supabase (database + video storage)

1. Go to **supabase.com** → Create account → New project
2. Wait for it to load (~2 min)
3. Go to **SQL Editor** → paste the entire contents of `supabase_schema.sql` → Run
4. Go to **Storage** → New bucket:
   - Name: `videos`
   - Public: ✅ ON
   - Max file size: `500` MB
   - Allowed MIME: `video/mp4, video/quicktime, video/webm, video/avi`
5. Go to **Settings → API** → copy:
   - `Project URL`
   - `anon public` key

### Step 2 — Set up on your iMac

Open **Terminal** and run:

```bash
# Install Node if you don't have it
brew install node

# Go into this folder
cd DRAFT

# Install dependencies
npm install

# Create your env file
cp .env.example .env
```

Open `.env` and fill in your Supabase keys:
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

Run it locally:
```bash
npm run dev
```

Open **http://localhost:5173** — the app is running.
Your phone (same WiFi) can open the Network URL shown in terminal.

---

### Step 3 — GitHub

```bash
git init
git add .
git commit -m "DRAFT app initial commit"
```

Go to **github.com** → New repository → name it `draft-app` → copy the commands it shows you to push.

---

### Step 4 — Vercel (live link, works on any phone)

1. Go to **vercel.com** → Sign up with GitHub
2. Click **Add New Project** → Import your `draft-app` repo
3. Add environment variables:
   - `VITE_SUPABASE_URL` = your Supabase URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase key
4. Click **Deploy**

You get a link like **`draft-app.vercel.app`** — share it with anyone, open it on your phone, works everywhere.

Every time you push to GitHub, Vercel auto-deploys. No extra steps.

---

## Features

- 🏀 TikTok-style vertical video feed
- 📹 Real video upload (any user can upload)
- ❤️ Like videos (real-time count)
- 💬 Comments on every video
- 👤 Player profiles with video history
- 🔍 Discover & search players
- 🔐 Auth (sign up / sign in)
- 📱 Works on phone via URL — no download needed

## Tech Stack

- React + Vite
- Supabase (auth + database + video storage)
- React Router
- Hosted on Vercel
