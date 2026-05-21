/**
 * Leads API Router
 *
 * Mounted at /leads in server/index.js. All routes are relative to that:
 *   GET  /leads/api/latest
 *   GET  /leads/api/outreach-log
 *   GET  /leads/api/stats
 *   POST /leads/api/mark-contacted/:id
 *   POST /leads/api/contact
 *   GET  /leads/dashboard
 *   GET  /leads/
 */

const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

const DATA_DIR = path.join(__dirname, 'data');
const OUTREACH_LOG = path.join(DATA_DIR, 'outreach_log.json');
const CONTACT_SUBMISSIONS = path.join(DATA_DIR, 'contact_submissions.json');

/** Ensure data directory exists. */
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

/**
 * Finds the most recently generated lead report file.
 * Reports are named lead_report_YYYY-MM-DDTHH-MM-SS.json
 */
function getLatestReportFile() {
  if (!fs.existsSync(DATA_DIR)) return null;
  const files = fs.readdirSync(DATA_DIR)
    .filter((f) => f.startsWith('lead_report_') && f.endsWith('.json'))
    .sort();
  if (files.length === 0) return null;
  return path.join(DATA_DIR, files[files.length - 1]);
}

/** Returns all report files sorted oldest→newest. */
function getAllReportFiles() {
  if (!fs.existsSync(DATA_DIR)) return [];
  return fs.readdirSync(DATA_DIR)
    .filter((f) => f.startsWith('lead_report_') && f.endsWith('.json'))
    .sort()
    .map((f) => path.join(DATA_DIR, f));
}

/** Safely read + parse a JSON file. Returns defaultValue on any error. */
function readJson(filePath, defaultValue) {
  try {
    if (!fs.existsSync(filePath)) return defaultValue;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return defaultValue;
  }
}

// ── GET /leads/api/latest ────────────────────────────────────────────────────
router.get('/api/latest', (req, res) => {
  const reportFile = getLatestReportFile();
  if (!reportFile) {
    return res.json({
      message: 'No reports yet — run node leads/orchestrator.js to generate your first report',
      leads: [],
      counts: { total: 0, emergency: 0, standard: 0, opportunity: 0 },
      generatedAt: null,
    });
  }
  try {
    const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: 'Could not read report file', detail: err.message });
  }
});

// ── GET /leads/api/outreach-log ──────────────────────────────────────────────
router.get('/api/outreach-log', (req, res) => {
  if (!fs.existsSync(OUTREACH_LOG)) return res.json([]);
  try {
    const log = JSON.parse(fs.readFileSync(OUTREACH_LOG, 'utf8'));
    const sorted = log.sort((a, b) => new Date(b.outreachAt) - new Date(a.outreachAt));
    res.json(sorted);
  } catch (err) {
    res.status(500).json({ error: 'Could not read outreach log', detail: err.message });
  }
});

// ── GET /leads/api/stats ─────────────────────────────────────────────────────
router.get('/api/stats', (req, res) => {
  try {
    // Collect all leads from all reports
    const reportFiles = getAllReportFiles();
    const allLeads = [];
    const seenIds = new Set();

    for (const file of reportFiles) {
      const report = readJson(file, { leads: [] });
      for (const lead of (report.leads || [])) {
        if (lead.id && !seenIds.has(lead.id)) {
          seenIds.add(lead.id);
          allLeads.push({ ...lead, _reportFile: path.basename(file) });
        }
      }
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Sunday

    const leadsToday = allLeads.filter((l) => l.postedAt && new Date(l.postedAt) >= startOfToday).length;
    const leadsThisWeek = allLeads.filter((l) => l.postedAt && new Date(l.postedAt) >= startOfWeek).length;

    const emergencyLeads = allLeads.filter((l) => l.priority === 'EMERGENCY');
    const standardLeads  = allLeads.filter((l) => l.priority === 'STANDARD');
    const opportunityLeads = allLeads.filter((l) => l.priority === 'OPPORTUNITY');

    const avgScore = allLeads.length > 0
      ? Math.round(allLeads.reduce((sum, l) => sum + (l.score || 0), 0) / allLeads.length)
      : 0;

    // Top platform by count
    const platformCounts = {};
    for (const lead of allLeads) {
      const p = lead.platform || 'unknown';
      platformCounts[p] = (platformCounts[p] || 0) + 1;
    }
    const topPlatform = Object.entries(platformCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'none';

    // Contact form submissions count
    const submissions = readJson(CONTACT_SUBMISSIONS, []);

    // Leads per day for the last 7 days
    const leadsPerDay = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(startOfToday);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      leadsPerDay[key] = 0;
    }
    for (const lead of allLeads) {
      if (lead.postedAt) {
        const key = lead.postedAt.slice(0, 10);
        if (key in leadsPerDay) leadsPerDay[key]++;
      }
    }

    res.json({
      totalLeads: allLeads.length,
      emergencyCount: emergencyLeads.length,
      standardCount: standardLeads.length,
      opportunityCount: opportunityLeads.length,
      avgScore,
      topPlatform,
      leadsToday,
      leadsThisWeek,
      contactSubmissions: submissions.length,
      leadsPerDay,
    });
  } catch (err) {
    res.status(500).json({ error: 'Could not compute stats', detail: err.message });
  }
});

// ── POST /leads/api/mark-contacted/:id ──────────────────────────────────────
router.post('/api/mark-contacted/:id', (req, res) => {
  const { id } = req.params;
  if (!fs.existsSync(OUTREACH_LOG)) {
    return res.status(404).json({ error: 'No outreach log found' });
  }
  try {
    const log = JSON.parse(fs.readFileSync(OUTREACH_LOG, 'utf8'));
    const index = log.findIndex((entry) => entry.id === id);
    if (index === -1) {
      return res.status(404).json({ error: `Lead ${id} not found in log` });
    }
    log[index].contacted = true;
    log[index].contactedAt = new Date().toISOString();
    fs.writeFileSync(OUTREACH_LOG, JSON.stringify(log, null, 2));
    console.log(`[API] Marked lead ${id} as contacted: "${log[index].title}"`);
    res.json({ success: true, lead: log[index] });
  } catch (err) {
    res.status(500).json({ error: 'Could not update outreach log', detail: err.message });
  }
});

// ── POST /leads/api/contact ──────────────────────────────────────────────────
// Saves a contact form submission (from 904.html or the dashboard form).
router.post('/api/contact', (req, res) => {
  ensureDataDir();
  try {
    const submissions = readJson(CONTACT_SUBMISSIONS, []);
    const entry = {
      id: `cf_${Date.now()}`,
      name:    req.body.name    || '',
      phone:   req.body.phone   || '',
      email:   req.body.email   || '',
      service: req.body.service || '',
      area:    req.body.area    || '',
      message: req.body.message || '',
      status:  'new',
      submittedAt: new Date().toISOString(),
    };
    submissions.push(entry);
    fs.writeFileSync(CONTACT_SUBMISSIONS, JSON.stringify(submissions, null, 2));
    console.log(`[API] New contact submission from ${entry.name} (${entry.phone})`);
    res.json({ success: true, id: entry.id });
  } catch (err) {
    res.status(500).json({ error: 'Could not save submission', detail: err.message });
  }
});

// ── GET /leads/api/submissions ───────────────────────────────────────────────
// Returns all contact form submissions (for the dashboard table).
router.get('/api/submissions', (req, res) => {
  const submissions = readJson(CONTACT_SUBMISSIONS, []);
  const sorted = submissions.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  res.json(sorted);
});

// ── POST /leads/api/run ──────────────────────────────────────────────────────
// Triggers a manual scout cycle from the dashboard "Run Scout Now" button.
router.post('/api/run', (req, res) => {
  // Kick off in background so we can return immediately
  const { runLeadCycle } = require('./orchestrator');
  runLeadCycle()
    .then((report) => {
      console.log(`[API] Manual scout cycle complete: ${report.counts.total} leads`);
    })
    .catch((err) => {
      console.error('[API] Manual scout cycle error:', err.message);
    });
  res.json({ success: true, message: 'Scout cycle started — check server console for progress' });
});

// ── GET /leads/dashboard ─────────────────────────────────────────────────────
router.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// ── GET /leads/ ──────────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

module.exports = router;
