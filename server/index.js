require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const checkoutRoutes = require('./routes/checkout');
const webhookRoutes = require('./routes/webhooks');

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

// ── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    stripe: !!process.env.STRIPE_SECRET_KEY,
    printful: !!process.env.PRINTFUL_API_KEY,
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
  console.log(`\n🚀 WEARIT server running on http://localhost:${PORT}`);
  console.log(`   Stripe:   ${process.env.STRIPE_SECRET_KEY ? '✓ configured' : '✗ missing STRIPE_SECRET_KEY'}`);
  console.log(`   Printful: ${process.env.PRINTFUL_API_KEY ? '✓ configured' : '✗ missing PRINTFUL_API_KEY'}`);
  console.log(`   Webhooks: POST /api/webhooks/stripe`);
  console.log(`             POST /api/webhooks/printful\n`);
});
