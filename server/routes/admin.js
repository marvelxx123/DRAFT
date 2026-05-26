const express = require('express');
const router  = express.Router();
const fs      = require('fs');
const path    = require('path');
const { execSync } = require('child_process');
const { checkPassword, createSession, requireAdmin } = require('../middleware/adminAuth');
const { readLogs, log } = require('../agents/logger');
const agentRunner = require('../agents/agentRunner');

const ROOT = path.join(__dirname, '../..');

const ALL_PAGES = [
  { label: 'Homepage',          file: '904garage.html',                         url: '/',                                       critical: true  },
  { label: 'Ponte Vedra',       file: 'garage-door-repair-ponte-vedra.html',    url: '/garage-door-repair-ponte-vedra',         critical: false },
  { label: 'Jacksonville Beach',file: 'garage-door-repair-jacksonville-beach.html', url: '/garage-door-repair-jacksonville-beach', critical: false },
  { label: 'Fernandina Beach',  file: 'garage-door-repair-fernandina-beach.html',url: '/garage-door-repair-fernandina-beach',   critical: false },
  { label: 'Yulee',             file: 'garage-door-repair-yulee.html',           url: '/garage-door-repair-yulee',              critical: false },
  { label: 'Nocatee',           file: 'garage-door-repair-nocatee.html',         url: '/garage-door-repair-nocatee',            critical: false },
  { label: 'Mandarin',          file: 'garage-door-repair-mandarin.html',        url: '/garage-door-repair-mandarin',           critical: false },
  { label: 'Orange Park',       file: 'garage-door-repair-orange-park.html',     url: '/garage-door-repair-orange-park',        critical: false },
  { label: 'Fleming Island',    file: 'garage-door-repair-fleming-island.html',  url: '/garage-door-repair-fleming-island',     critical: false },
  { label: 'Neptune Beach',     file: 'garage-door-repair-neptune-beach.html',   url: '/garage-door-repair-neptune-beach',      critical: false },
  { label: 'Atlantic Beach',    file: 'garage-door-repair-atlantic-beach.html',  url: '/garage-door-repair-atlantic-beach',     critical: false },
  { label: 'Bartram Park',      file: 'garage-door-repair-bartram-park.html',    url: '/garage-door-repair-bartram-park',       critical: false },
  { label: 'Arlington',         file: 'garage-door-repair-arlington.html',       url: '/garage-door-repair-arlington',          critical: false },
  { label: 'Southside',         file: 'garage-door-repair-southside.html',       url: '/garage-door-repair-southside',          critical: false },
  { label: 'St. Johns',         file: 'garage-door-repair-st-johns.html',        url: '/garage-door-repair-st-johns',           critical: false },
  { label: 'Middleburg',        file: 'garage-door-repair-middleburg.html',      url: '/garage-door-repair-middleburg',         critical: false },
  { label: 'Ortega',            file: 'garage-door-repair-ortega.html',          url: '/garage-door-repair-ortega',             critical: false },
  { label: 'Sitemap',           file: 'sitemap.xml',                             url: '/sitemap.xml',                           critical: false },
  { label: 'Command Center',    file: 'jax-command.html',                        url: '/jax-command',                           critical: true  },
];

function checkPage(page) {
  const filePath = path.join(ROOT, page.file);
  const result = { label: page.label, url: page.url, file: page.file, critical: page.critical };
  try {
    const stat = fs.statSync(filePath);
    const size = stat.size;
    if (size < 500) { result.status = 'error'; result.reason = 'File too small — may be empty'; return result; }
    const sample = fs.readFileSync(filePath, 'utf8').slice(0, 2000);
    if (page.file.endsWith('.html') && !sample.includes('904')) {
      result.status = 'error'; result.reason = 'Missing brand content'; return result;
    }
    result.status = 'ok';
    result.sizeKb = Math.round(size / 1024);
    result.checkedAt = new Date().toISOString();
  } catch {
    result.status = 'missing';
    result.reason = 'File not found';
  }
  return result;
}

function autoFix(results) {
  const broken = results.filter(r => r.status !== 'ok' && !r.critical && r.file.includes('garage-door-repair'));
  if (broken.length === 0) return [];

  const fixed = [];
  try {
    execSync(`node ${path.join(ROOT, 'generate-city-pages.js')}`, { cwd: ROOT, timeout: 30000 });
    for (const page of broken) {
      const filePath = path.join(ROOT, page.file);
      if (fs.existsSync(filePath) && fs.statSync(filePath).size > 500) {
        fixed.push(page.label);
        page.status = 'fixed';
        page.reason = 'Auto-regenerated';
        log('pagehealth', 'success', `Auto-fixed: ${page.label} (${page.file})`);
      }
    }
  } catch (err) {
    log('pagehealth', 'error', `Auto-fix failed: ${err.message}`);
  }
  return fixed;
}

// GET /api/admin/pages-health
router.get('/pages-health', requireAdmin, (_req, res) => {
  const results = ALL_PAGES.map(checkPage);
  const fixed   = autoFix(results);
  const summary = {
    total:   results.length,
    ok:      results.filter(r => r.status === 'ok' || r.status === 'fixed').length,
    issues:  results.filter(r => r.status === 'error' || r.status === 'missing').length,
    fixed:   fixed.length,
    checkedAt: new Date().toISOString(),
  };
  res.json({ pages: results, summary, fixed });
});

// POST /api/admin/login
router.post('/login', (req, res) => {
  const { password } = req.body || {};
  if (!password || !checkPassword(password)) {
    return res.status(401).json({ error: 'Invalid password' });
  }
  const token = createSession();
  res.json({ token });
});

// GET /api/admin/status — agent status cards
router.get('/status', requireAdmin, (_req, res) => {
  res.json({ agents: agentRunner.getStatus() });
});

// GET /api/admin/logs?limit=100&agentId=content
router.get('/logs', requireAdmin, (req, res) => {
  let logs = readLogs();
  const { agentId, limit = 200 } = req.query;
  if (agentId) logs = logs.filter(l => l.agentId === agentId);
  res.json({ logs: logs.slice(0, Number(limit)) });
});

// POST /api/admin/agents/:id/run — manual trigger
router.post('/agents/:id/run', requireAdmin, async (req, res) => {
  const ok = await agentRunner.triggerAgent(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Unknown agent' });
  res.json({ success: true, message: `Agent ${req.params.id} triggered` });
});

// POST /api/admin/agents/:id/pause
router.post('/agents/:id/pause', requireAdmin, (req, res) => {
  const ok = agentRunner.pauseAgent(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Unknown agent' });
  res.json({ success: true });
});

// POST /api/admin/agents/:id/resume
router.post('/agents/:id/resume', requireAdmin, (req, res) => {
  const ok = agentRunner.resumeAgent(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Unknown agent' });
  res.json({ success: true });
});

// GET /api/admin/content — read generated content files
router.get('/content', requireAdmin, (_req, res) => {
  const fs = require('fs'), path = require('path');
  const base = path.join(__dirname, '../../data');
  const read = f => { try { return JSON.parse(fs.readFileSync(path.join(base, f), 'utf8')); } catch { return null; } };
  res.json({
    content:       read('generated-content.json'),
    ads:           read('generated-ads.json'),
    seo:           read('generated-seo.json'),
    jaxProfiles:   read('jax-profiles.json'),
    jaxSocial:     read('jax-social.json'),
    jaxCraigslist: read('jax-craigslist.json'),
    jaxOutreach:   read('jax-outreach.json'),
    jaxFollowup:   read('jax-followup.json'),
  });
});

// GET /api/admin/research — 904 garage doors competitive research
router.get('/research', requireAdmin, (_req, res) => {
  const fs = require('fs'), path = require('path');
  try {
    const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../../data/jax-research.json'), 'utf8'));
    res.json(data);
  } catch {
    res.json({ error: 'No research data yet — agent runs twice daily' });
  }
});

// GET /api/admin/funnel — funnel intelligence
router.get('/funnel', requireAdmin, (_req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/funnel-insights.json'), 'utf8'));
    res.json(data);
  } catch {
    res.json({ error: 'Funnel agent has not run yet' });
  }
});

// GET /api/admin/leads — 904 garage doors leads
router.get('/leads', requireAdmin, (_req, res) => {
  const fs = require('fs'), path = require('path');
  try {
    const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../../data/leads.json'), 'utf8'));
    res.json(Array.isArray(data) ? data : [data]);
  } catch {
    res.json([]);
  }
});

// ── CRAIGSLIST ROUTES ──────────────────────────────────────────────────────────

const CL_FILE      = path.join(ROOT, 'data/jax-craigslist.json');
const OUTREACH_FILE = path.join(ROOT, 'data/jax-outreach.json');

function readCL() {
  try { return JSON.parse(fs.readFileSync(CL_FILE, 'utf8')); }
  catch { return { foundLeads: [], ads: [], lastPostedAt: null, postingDue: false, lastRun: null }; }
}

function readOutreach() {
  try { return JSON.parse(fs.readFileSync(OUTREACH_FILE, 'utf8')); }
  catch { return { sendQueue: [], sent: [], contactedTargets: {}, lastRun: null }; }
}

// GET /api/admin/craigslist — return foundLeads + ads + postingDue
router.get('/craigslist', requireAdmin, (_req, res) => {
  const data = readCL();
  res.json({
    foundLeads:    data.foundLeads   || [],
    ads:           data.ads          || [],
    postingDue:    data.postingDue   || false,
    lastPostedAt:  data.lastPostedAt || null,
    lastRun:       data.lastRun      || null,
  });
});

// POST /api/admin/craigslist/posted — mark that user posted to Craigslist today
router.post('/craigslist/posted', requireAdmin, (_req, res) => {
  const data = readCL();
  data.lastPostedAt = new Date().toISOString();
  data.postingDue   = false;
  fs.writeFileSync(CL_FILE, JSON.stringify(data, null, 2));
  log('admin', 'success', 'Craigslist posting marked as done');
  res.json({ success: true, lastPostedAt: data.lastPostedAt });
});

// ── OUTREACH ROUTES ────────────────────────────────────────────────────────────

// GET /api/admin/outreach — return pending queue + sent count
router.get('/outreach', requireAdmin, (_req, res) => {
  const data = readOutreach();
  const pending = (data.sendQueue || []).filter(i => i.status === 'pending');
  const sentAll = data.sent || [];
  // Count sent this month
  const now   = new Date();
  const y     = now.getFullYear();
  const m     = now.getMonth();
  const sentThisMonth = sentAll.filter(i => {
    if (!i.sentAt) return false;
    const d = new Date(i.sentAt);
    return d.getFullYear() === y && d.getMonth() === m;
  }).length;
  res.json({ sendQueue: pending, sentCount: sentAll.length, sentThisMonth });
});

// POST /api/admin/outreach/:id/sent — mark an outreach item as sent
router.post('/outreach/:id/sent', requireAdmin, (req, res) => {
  const { id } = req.params;
  const data = readOutreach();
  const idx = (data.sendQueue || []).findIndex(i => String(i.id) === String(id));
  if (idx === -1) {
    return res.status(404).json({ error: 'Outreach item not found' });
  }
  const [item] = data.sendQueue.splice(idx, 1);
  item.status = 'sent';
  item.sentAt = new Date().toISOString();
  if (!data.sent) data.sent = [];
  data.sent.unshift(item);
  data.sent = data.sent.slice(0, 100);
  fs.writeFileSync(OUTREACH_FILE, JSON.stringify(data, null, 2));
  log('admin', 'success', `Outreach item ${id} marked sent`);
  res.json({ success: true, item });
});

module.exports = router;
