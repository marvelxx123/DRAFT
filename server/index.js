require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const checkoutRoutes = require('./routes/checkout');
const webhookRoutes  = require('./routes/webhooks');
const adminRoutes    = require('./routes/admin');
const contactRoutes  = require('./routes/contact');
const blogRoutes     = require('./routes/blog');
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
app.use('/api/contact',  contactRoutes);
app.use('/api/blog',     blogRoutes);

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

app.listen(PORT, () => {
  console.log(`\n WEARIT server running on http://localhost:${PORT}`);
  console.log(`   Stripe:    ${process.env.STRIPE_SECRET_KEY ? '✓' : '✗ missing STRIPE_SECRET_KEY'}`);
  console.log(`   Printful:  ${process.env.PRINTFUL_API_KEY  ? '✓' : '✗ missing PRINTFUL_API_KEY'}`);
  console.log(`   Claude AI: ${process.env.ANTHROPIC_API_KEY ? '✓' : '✗ missing ANTHROPIC_API_KEY (agents need this)'}`);
  console.log(`   Admin:     POST /api/admin/login  GET /api/admin/status\n`);

  // Start autonomous agents
  agentRunner.startAll();
});
