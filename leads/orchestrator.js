/**
 * Lead Generation Orchestrator
 *
 * This is the "brain" that runs all your agents in order:
 *   1. Scout   — scans Craigslist for garage door leads in Jacksonville
 *   2. Qualify — scores each lead (Emergency / Standard / Opportunity)
 *   3. Outreach — writes a personalized message for each lead and logs it
 *   4. FollowUp — flags old leads that need a follow-up nudge
 *   5. ProfileKeeper — generates your weekly listing maintenance checklist
 *
 * Run manually:     node leads/orchestrator.js
 * Run on schedule:  node leads/cron.js
 */

const fs = require('fs');
const path = require('path');

const { scoutLeads } = require('./agents/scout');
const { qualifyAll } = require('./agents/qualifier');
const { processOutreach } = require('./agents/outreach');
const { runFollowUps } = require('./agents/followUp');
const { runProfileCheck } = require('./agents/profileKeeper');

const DATA_DIR = path.join(__dirname, 'data');
const SAMPLE_LEAD_FILE = path.join(DATA_DIR, 'sample_lead.json');

/**
 * Makes sure the data directory exists.
 * No data directory = no place to save reports = crash. We prevent that here.
 */
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Loads sample leads from disk (if it exists) so the dashboard
 * always has at least one lead to show, even before the first real scouting cycle.
 * Supports both a single object and an array.
 */
function loadSampleLead() {
  if (fs.existsSync(SAMPLE_LEAD_FILE)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(SAMPLE_LEAD_FILE, 'utf8'));
      // Support both array format (new) and single-object format (old)
      if (Array.isArray(parsed)) return parsed;
      return parsed;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Saves the full lead report as a timestamped JSON file.
 * Each run creates a new file so you have a history of all lead cycles.
 * The dashboard always shows the most recent one.
 */
function saveReport(report) {
  ensureDataDir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `lead_report_${timestamp}.json`;
  const filepath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
  console.log(`[Orchestrator] Report saved to leads/data/${filename}`);
  return filepath;
}

/**
 * The main lead generation cycle. Runs all 5 agents in sequence.
 * Safe to run multiple times — agents handle duplicates gracefully.
 */
async function runLeadCycle() {
  const startTime = Date.now();
  console.log('\n========================================');
  console.log('  JACKSONVILLE GARAGE DOOR LEAD ENGINE');
  console.log(`  Started: ${new Date().toLocaleString()}`);
  console.log('========================================\n');

  ensureDataDir();

  // ── STEP 1: SCOUT ────────────────────────────────────────────────────────────
  let rawLeads = [];
  try {
    rawLeads = await scoutLeads();
  } catch (err) {
    console.log(`[Orchestrator] Scout had an error: ${err.message}`);
    console.log('[Orchestrator] Continuing with any leads already found...');
  }

  // Include the sample lead(s) so the dashboard always has something to show
  const sampleLead = loadSampleLead();
  if (sampleLead && rawLeads.length === 0) {
    console.log('[Orchestrator] No live leads found — using sample leads for demonstration');
    rawLeads = Array.isArray(sampleLead) ? sampleLead : [sampleLead];
  }

  // ── STEP 2: QUALIFY ──────────────────────────────────────────────────────────
  const qualifiedLeads = qualifyAll(rawLeads);

  // ── STEP 3: OUTREACH ─────────────────────────────────────────────────────────
  const outreachedLeads = [];
  for (const lead of qualifiedLeads) {
    try {
      const result = await processOutreach(lead);
      outreachedLeads.push(result);
    } catch (err) {
      console.log(`[Orchestrator] Outreach failed for lead "${lead.title}": ${err.message}`);
      outreachedLeads.push(lead); // Keep the lead even if outreach logging fails
    }
  }

  // ── STEP 4: FOLLOW-UP ────────────────────────────────────────────────────────
  let followUps = [];
  try {
    followUps = await runFollowUps();
  } catch (err) {
    console.log(`[Orchestrator] FollowUp agent error: ${err.message}`);
  }

  // ── STEP 5: PROFILE KEEPER ───────────────────────────────────────────────────
  // Only run the profile checklist on Mondays, or if it's the first run
  // (We don't want to overwrite the checklist on every 2-hour cycle)
  const isMonday = new Date().getDay() === 1;
  const profileTasksExist = fs.existsSync(path.join(DATA_DIR, 'profile_tasks.txt'));
  if (isMonday || !profileTasksExist) {
    try {
      await runProfileCheck();
    } catch (err) {
      console.log(`[Orchestrator] ProfileKeeper error: ${err.message}`);
    }
  }

  // ── SUMMARY ──────────────────────────────────────────────────────────────────
  const counts = {
    total: outreachedLeads.length,
    emergency: outreachedLeads.filter((l) => l.priority === 'EMERGENCY').length,
    standard: outreachedLeads.filter((l) => l.priority === 'STANDARD').length,
    opportunity: outreachedLeads.filter((l) => l.priority === 'OPPORTUNITY').length,
    followUps: followUps.length,
  };

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n========================================');
  console.log('  CYCLE COMPLETE');
  console.log(`  Total leads found:  ${counts.total}`);
  console.log(`  🚨 Emergency:       ${counts.emergency}`);
  console.log(`  📋 Standard:        ${counts.standard}`);
  console.log(`  💼 Opportunity:     ${counts.opportunity}`);
  console.log(`  🔔 Follow-ups due:  ${counts.followUps}`);
  console.log(`  Time taken:         ${elapsed}s`);
  console.log('========================================\n');

  if (counts.emergency > 0) {
    console.log('*** ACTION NEEDED: You have EMERGENCY leads — respond ASAP! ***\n');
  }

  // ── SAVE REPORT ──────────────────────────────────────────────────────────────
  const report = {
    generatedAt: new Date().toISOString(),
    cycleTime: `${elapsed}s`,
    counts,
    leads: outreachedLeads,
    followUps,
  };

  const reportPath = saveReport(report);

  return report;
}

// ── STANDALONE EXECUTION ─────────────────────────────────────────────────────
// When you run `node leads/orchestrator.js` directly, this block runs.
// When other files require() this module, only runLeadCycle is exported.
if (require.main === module) {
  runLeadCycle()
    .then(() => {
      console.log('Done! Check leads/data/ for your report.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Orchestrator] Fatal error:', err.message);
      process.exit(1);
    });
}

module.exports = { runLeadCycle };
