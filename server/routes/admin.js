const express = require('express');
const router = express.Router();
const { checkPassword, createSession, requireAdmin } = require('../middleware/adminAuth');
const { readLogs } = require('../agents/logger');
const agentRunner = require('../agents/agentRunner');

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

module.exports = router;
