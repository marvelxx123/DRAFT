/**
 * Cron Scheduler — runs the lead generation cycle every 2 hours automatically.
 *
 * Start it with:  node leads/cron.js
 *
 * It will keep running in the background, scanning for leads every 2 hours.
 * If you close the terminal window, it stops — so you'll want to run it on
 * a server or use a service to keep it alive (see notes below).
 *
 * ── FOR RUNNING 24/7 WITHOUT YOUR COMPUTER ──────────────────────────────────
 *
 * Option 1 — Railway (free tier, easiest):
 *   - Your app is already on Railway! You can add a cron job in the dashboard.
 *   - Go to your Railway project → "New Service" → "Cron Job"
 *   - Command: node leads/orchestrator.js
 *   - Schedule: 0 */2 * * *  (every 2 hours)
 *   - This runs on Railway's servers so it works even when your phone is off.
 *
 * Option 2 — cron-job.org (free, simple):
 *   - Go to https://cron-job.org and create a free account
 *   - Add a new cron job to hit your Railway URL: GET https://your-app.railway.app/api/health
 *   - This "wakes up" your app which won't trigger the lead scan, BUT...
 *   - Better approach: create a /leads/api/run endpoint and hit that
 *   - Schedule: every 2 hours
 *
 * Option 3 — PM2 on a VPS (most reliable):
 *   - npm install -g pm2
 *   - pm2 start leads/cron.js --name "garage-leads"
 *   - pm2 startup  (makes it survive reboots)
 *   - Works on any Linux server (DigitalOcean, Vultr, etc. — ~$4/month)
 *
 * For now, running node leads/cron.js on your own machine is totally fine
 * for testing and light use!
 */

const { runLeadCycle } = require('./orchestrator');

// How often to run the lead scan (2 hours in milliseconds)
const INTERVAL_MS = 2 * 60 * 60 * 1000;

// Show a friendly startup message
console.log('========================================');
console.log('  JACKSONVILLE GARAGE DOOR LEAD BOT');
console.log('  Running every 2 hours automatically');
console.log(`  Started: ${new Date().toLocaleString()}`);
console.log('  Press Ctrl+C to stop');
console.log('========================================\n');

/**
 * Runs one lead cycle and logs the time of the next scheduled run.
 */
async function runAndSchedule() {
  const startedAt = new Date().toLocaleString();
  console.log(`[Cron] Starting lead cycle at ${startedAt}`);

  try {
    await runLeadCycle();
  } catch (err) {
    // We catch errors here so the scheduler never crashes and stops running.
    // One bad run shouldn't shut down the whole system.
    console.error(`[Cron] Cycle failed: ${err.message}`);
    console.log('[Cron] Will try again at the next scheduled time');
  }

  const nextRun = new Date(Date.now() + INTERVAL_MS);
  console.log(`[Cron] Next run at: ${nextRun.toLocaleString()}\n`);
}

// Run immediately on startup, then every 2 hours after that
runAndSchedule();
setInterval(runAndSchedule, INTERVAL_MS);
