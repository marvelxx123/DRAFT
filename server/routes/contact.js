const express = require('express');
const router  = express.Router();
const fs      = require('fs');
const path    = require('path');
const jaxConfig = require('../agents/jaxConfig');
const sms       = require('../services/sms');
const jaxTriageAgent = require('../agents/jaxTriageAgent');
const { sanitizeContactBody, detectInjection } = require('../utils/security');
const { log } = require('../agents/logger');

const LEADS_FILE = path.join(__dirname, '../../data/leads.json');

function readLeads() {
  try {
    const raw = JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8'));
    return Array.isArray(raw) ? raw : (raw.leads || []);
  } catch { return []; }
}

function saveLeads(leads) {
  fs.mkdirSync(path.dirname(LEADS_FILE), { recursive: true });
  fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2));
}

// ── Lead scoring using jaxConfig ─────────────────────────────────────────────
function scoreLead({ urgency = '', service = '', name = '', message = '' }) {
  const { leadScoring, customerTypes } = jaxConfig;
  let score = 0;

  // Urgency score — exact match from dropdown values
  const urgencyScore = leadScoring.urgency[urgency];
  if (urgencyScore !== undefined) {
    score += urgencyScore;
  }

  // Service score — exact match from dropdown values
  const serviceScore = leadScoring.service[service];
  if (serviceScore !== undefined) {
    score += serviceScore;
  }

  // Zip bonus — scan full message text for known zip codes
  const fullText = `${name} ${service} ${urgency} ${message}`;
  for (const [zip, bonus] of Object.entries(leadScoring.zipBonus)) {
    if (fullText.includes(zip)) {
      score += bonus;
      break; // only apply the highest zip bonus once
    }
  }

  return score;
}

// ── Customer type detection ───────────────────────────────────────────────────
function detectCustomerType({ name = '', service = '', urgency = '', message = '' }) {
  const { customerTypes } = jaxConfig;
  const fullText = `${name} ${service} ${urgency} ${message}`.toLowerCase();

  let bestType = 'general';
  let bestBoost = -1;

  for (const [type, data] of Object.entries(customerTypes)) {
    const matched = data.signals.some(signal => fullText.includes(signal.toLowerCase()));
    if (matched && data.scoreBoost > bestBoost) {
      bestType  = type;
      bestBoost = data.scoreBoost;
    }
  }

  return bestType;
}

// POST /api/contact
router.post('/', (req, res) => {
  const raw = req.body || {};
  const { cleaned, injectionAttempt } = sanitizeContactBody(raw);
  const { name, phone, service, urgency, city, source, page, cta, message } = cleaned;
  if (!phone || phone === '[filtered]') return res.status(400).json({ error: 'Phone required' });
  if (injectionAttempt) {
    log('security', 'warn', `Prompt injection attempt from ${phone} — fields sanitized`);
  }

  const leadScore    = scoreLead({ urgency: urgency || '', service: service || '', name: name || '', message: message || '' });
  const customerType = detectCustomerType({ name: name || '', service: service || '', urgency: urgency || '', message: message || '' });

  const leads = readLeads();
  leads.unshift({
    id:           Date.now(),
    timestamp:    new Date().toISOString(),
    name:         name    || 'Unknown',
    phone,
    service:      service || 'Not specified',
    urgency:      urgency || 'Not specified',
    city:         city    || 'Jacksonville',
    source:       source  || 'homepage',
    page:         page    || '/',
    cta:          cta     || 'form',
    message:      message || '',
    status:       'new',
    leadScore,
    customerType,
  });
  const saved = leads[0];
  saveLeads(leads.slice(0, 500));
  res.json({ success: true });

  // SMS — fire and forget, never block the response
  const firstName = (name || '').split(' ')[0];
  sms.sendLeadConfirmation(phone, firstName);
  sms.sendOwnerAlert(saved);
  sms.scheduleFollowUp(phone, firstName);

  // Autonomous triage — researches high-value/commercial leads and drafts a
  // recommendation for owner approval. Never sends anything itself.
  jaxTriageAgent.triageLead(saved).catch(err => log('triage', 'error', `Triage call failed for lead ${saved.id}: ${err.message}`));
});

// GET /api/contact
router.get('/', (_req, res) => res.json(readLeads()));

// PATCH /api/contact/:id
router.patch('/:id', (req, res) => {
  const { status } = req.body || {};
  const leads = readLeads();
  const lead  = leads.find(l => l.id === Number(req.params.id));
  if (!lead) return res.status(404).json({ error: 'Lead not found' });
  lead.status    = status || 'called';
  lead.updatedAt = new Date().toISOString();
  saveLeads(leads);
  res.json({ success: true, lead });
});

module.exports = router;
