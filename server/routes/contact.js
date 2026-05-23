const express = require('express');
const router  = express.Router();
const fs      = require('fs');
const path    = require('path');

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

function scoreLead({ urgency = '', service = '' }) {
  let score = 0;
  const u = urgency.toLowerCase();
  const s = service.toLowerCase();
  if (u.includes('emergency') || u.includes('right now')) score += 50;
  else if (u.includes('today'))     score += 30;
  else if (u.includes('this week')) score += 15;
  if (s.includes('new door'))       score += 25;
  if (s.includes('spring'))         score += 20;
  if (s.includes('emergency'))      score += 20;
  if (s.includes('opener'))         score += 15;
  if (s.includes('cable'))          score += 15;
  return score;
}

// POST /api/contact
router.post('/', (req, res) => {
  const { name, phone, service, urgency, city, source, page, cta } = req.body || {};
  if (!phone) return res.status(400).json({ error: 'Phone required' });

  const leads = readLeads();
  leads.unshift({
    id:        Date.now(),
    timestamp: new Date().toISOString(),
    name:      name    || 'Unknown',
    phone,
    service:   service || 'Not specified',
    urgency:   urgency || 'Not specified',
    city:      city    || 'Jacksonville',
    source:    source  || 'homepage',
    page:      page    || '/',
    cta:       cta     || 'form',
    status:    'new',
    score:     scoreLead({ urgency, service }),
  });
  saveLeads(leads.slice(0, 500));
  res.json({ success: true });
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
