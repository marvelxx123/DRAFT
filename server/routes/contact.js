const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const LEADS_FILE = path.join(__dirname, '../../data/leads.json');

function readLeads() {
  try { return JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8')); }
  catch { return { leads: [] }; }
}

function saveLeads(data) {
  fs.writeFileSync(LEADS_FILE, JSON.stringify(data, null, 2));
}

// POST /api/contact — save inbound lead from landing page
router.post('/', (req, res) => {
  const { name, phone, service, urgency } = req.body || {};
  if (!phone) return res.status(400).json({ error: 'Phone required' });

  const data = readLeads();
  data.leads.unshift({
    id:        Date.now(),
    createdAt: new Date().toISOString(),
    name:      name || 'Unknown',
    phone,
    service:   service || 'Not specified',
    urgency:   urgency || 'Not specified',
    status:    'new',
    source:    '904garage.html',
  });
  data.leads = data.leads.slice(0, 500);
  saveLeads(data);

  res.json({ success: true });
});

// GET /api/contact — list leads (admin use)
router.get('/', (req, res) => {
  const data = readLeads();
  res.json(data);
});

// PATCH /api/contact/:id — mark lead as called / closed
router.patch('/:id', (req, res) => {
  const { status } = req.body || {};
  const data = readLeads();
  const lead = data.leads.find(l => l.id === Number(req.params.id));
  if (!lead) return res.status(404).json({ error: 'Lead not found' });
  lead.status = status || 'called';
  lead.updatedAt = new Date().toISOString();
  saveLeads(data);
  res.json({ success: true, lead });
});

module.exports = router;
