require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const checkoutRoutes = require('./routes/checkout');
const webhookRoutes  = require('./routes/webhooks');
const adminRoutes    = require('./routes/admin');
const agentRunner    = require('./agents/agentRunner');

const app = express();
const PORT = process.env.PORT || 3000;

// ── STRIPE WEBHOOK: must receive raw body before any json() middleware ──────
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));

// ── MIDDLEWARE ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.SITE_URL || '*',
  methods: ['GET', 'POST'],
}));
app.use(express.json({ limit: '10mb' }));

// ── API ROUTES ───────────────────────────────────────────────────────────────
app.use('/api/checkout', checkoutRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/admin',    adminRoutes);

// ── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    stripe:   !!process.env.STRIPE_SECRET_KEY,
    printful: !!process.env.PRINTFUL_API_KEY,
    agents:   agentRunner.getStatus().map(a => ({ id: a.id, status: a.status })),
    timestamp: new Date().toISOString(),
  });
});

// ── SERVE FRONTEND ───────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '..')));
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// ── GLOBAL ERROR HANDLER ─────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[server]', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`\n WEARIT server running on http://localhost:${PORT}`);
  console.log(`   Stripe:    ${process.env.STRIPE_SECRET_KEY ? '✓' : '✗ missing STRIPE_SECRET_KEY'}`);
  console.log(`   Printful:  ${process.env.PRINTFUL_API_KEY  ? '✓' : '✗ missing PRINTFUL_API_KEY'}`);
  console.log(`   Claude AI: ${process.env.ANTHROPIC_API_KEY ? '✓' : '✗ missing ANTHROPIC_API_KEY (agents need this)'}`);
  console.log(`   Admin:     POST /api/admin/login  GET /api/admin/status\n`);

  // Start autonomous agents
  agentRunner.startAll();
});
