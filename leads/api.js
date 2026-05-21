/**
 * Leads API Router
 *
 * This provides the data endpoints that the dashboard (dashboard.html) reads from.
 * It's mounted at /leads so all routes here are like:
 *   GET /leads/api/latest
 *   GET /leads/api/outreach-log
 *   POST /leads/api/mark-contacted/[lead-id]
 *
 * Mount this in server/index.js with:
 *   const leadsRouter = require('../leads/api');
 *   app.use('/leads', leadsRouter);
 */

const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

const DATA_DIR = path.join(__dirname, 'data');
const OUTREACH_LOG = path.join(DATA_DIR, 'outreach_log.json');

/**
 * Finds the most recently generated lead report file.
 * Reports are named lead_report_YYYY-MM-DDTHH-MM-SS.json
 * We sort by name (which is also chronological) and return the last one.
 */
function getLatestReportFile() {
  if (!fs.existsSync(DATA_DIR)) return null;

  const files = fs.readdirSync(DATA_DIR)
    .filter((f) => f.startsWith('lead_report_') && f.endsWith('.json'))
    .sort(); // ISO timestamps sort correctly alphabetically

  if (files.length === 0) return null;
  return path.join(DATA_DIR, files[files.length - 1]);
}

/**
 * GET /leads/api/latest
 * Returns the most recent lead cycle report.
 * If no report exists yet, returns a helpful message instead of an error.
 */
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

/**
 * GET /leads/api/outreach-log
 * Returns the full outreach history — all leads that have been processed,
 * whether contacted or not, with timestamps and follow-up status.
 */
router.get('/api/outreach-log', (req, res) => {
  if (!fs.existsSync(OUTREACH_LOG)) {
    return res.json([]);
  }

  try {
    const log = JSON.parse(fs.readFileSync(OUTREACH_LOG, 'utf8'));
    // Sort by most recent first so the dashboard shows newest leads at the top
    const sorted = log.sort((a, b) => new Date(b.outreachAt) - new Date(a.outreachAt));
    res.json(sorted);
  } catch (err) {
    res.status(500).json({ error: 'Could not read outreach log', detail: err.message });
  }
});

/**
 * POST /leads/api/mark-contacted/:id
 * Marks a lead as contacted so the Follow-Up agent knows not to follow up.
 * Call this after you've actually reached out to the customer.
 *
 * Usage from dashboard: automatically called when you click "Mark Contacted"
 * Usage from curl: curl -X POST http://localhost:3000/leads/api/mark-contacted/[lead-id]
 */
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

/**
 * GET /leads/
 * Serves the dashboard HTML file directly.
 * So you can go to http://localhost:3000/leads/ in your browser.
 */
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

module.exports = router;
