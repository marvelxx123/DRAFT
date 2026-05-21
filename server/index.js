require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const adminRoutes = require('./routes/admin');
const agentRunner = require('./agents/agentRunner');
const leadsRouter = require('../leads/api');

const app = express();
const PORT = process.env.PORT || 3000;

// ── MIDDLEWARE ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.SITE_URL || '*',
  methods: ['GET', 'POST'],
}));
app.use(express.json({ limit: '10mb' }));

// ── API ROUTES ───────────────────────────────────────────────────────────────
app.use('/api/admin', adminRoutes);
app.use('/leads',     leadsRouter);

// ── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status:    'ok',
    business:  '904 Garage Doors',
    agents:    agentRunner.getStatus().map(a => ({ id: a.id, status: a.status })),
    timestamp: new Date().toISOString(),
  });
});

// ── SERVE FRONTEND ───────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '..')));

// Root → 904 Garage Doors landing page
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', '904.html'));
});

// Catch-all → garage door homepage (not the old WearIt index.html)
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', '904.html'));
});

// ── GLOBAL ERROR HANDLER ─────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[server]', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`\n 904 Garage Doors server running on http://localhost:${PORT}`);
  console.log(`   Claude AI: ${process.env.ANTHROPIC_API_KEY ? '✓' : '✗ missing ANTHROPIC_API_KEY (agents need this)'}`);
  console.log(`   Admin:     POST /api/admin/login  GET /api/admin/status`);
  console.log(`   Leads:     GET /leads/dashboard`);
  console.log(`   Site:      GET /904.html  GET /yulee.html  GET /fernandina-beach.html\n`);

  // Start autonomous agents
  agentRunner.startAll();
});
