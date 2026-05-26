require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const adminRoutes    = require('./routes/admin');
const contactRoutes  = require('./routes/contact');
const blogRoutes     = require('./routes/blog');
const agentRunner    = require('./agents/agentRunner');

const app = express();
const PORT = process.env.PORT || 3000;

// ── MIDDLEWARE ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.SITE_URL || '*',
  methods: ['GET', 'POST'],
}));
app.use(express.json({ limit: '10mb' }));

// ── API ROUTES ───────────────────────────────────────────────────────────────
app.use('/api/admin',    adminRoutes);
app.use('/api/contact',  contactRoutes);
app.use('/api/blog',     blogRoutes);

// ── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    agents:    agentRunner.getStatus().map(a => ({ id: a.id, status: a.status })),
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

// ── WWW → non-www redirect ───────────────────────────────────────────────────
app.use((req, res, next) => {
  if (req.headers.host && req.headers.host.startsWith('www.')) {
    const target = `https://${req.headers.host.slice(4)}${req.url}`;
    return res.redirect(301, target);
  }
  next();
});

// ── SERVE FRONTEND ───────────────────────────────────────────────────────────
// index:false prevents express.static from auto-serving index.html for /
app.use(express.static(path.join(__dirname, '..'), { index: false }));
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', '904garage.html'));
});

// 904 Garage Doors command dashboard
app.get('/jax-command', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'jax-command.html'));
});

// City landing pages — clean URLs without .html extension
app.get('/garage-door-repair-:city', (req, res) => {
  const city = req.params.city.replace(/[^a-z0-9-]/g, '');
  res.sendFile(
    path.join(__dirname, '..', `garage-door-repair-${city}.html`),
    err => { if (err) res.sendFile(path.join(__dirname, '..', '404.html')); }
  );
});

// Sitemap
app.get('/sitemap.xml', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'sitemap.xml'));
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', '404.html'));
});

// ── GLOBAL ERROR HANDLER ─────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[server]', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// Ensure data directory exists
const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

app.listen(PORT, () => {
  console.log(`\n 904 Garage Doors — server running on http://localhost:${PORT}`);
  console.log(`   Claude AI:  ${process.env.ANTHROPIC_API_KEY ? '✓' : '✗ missing ANTHROPIC_API_KEY (agents need this)'}`);
  console.log(`   Admin pwd:  ${process.env.ADMIN_PASSWORD    ? '✓ (from env)' : '⚠ using default password — set ADMIN_PASSWORD on Railway'}`);
  console.log(`   Dashboard:  /jax-command`);
  console.log(`   Health:     /api/health\n`);

  // Start autonomous agents
  agentRunner.startAll();
});
