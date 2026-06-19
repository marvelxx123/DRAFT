// ── LEAD TRIAGE AGENT ────────────────────────────────────────────────────
// Runs only on leads worth a judgment call (see shouldTriage). It researches
// the lead via tools, then drafts a recommendation — it never sends anything
// itself. A human approves/rejects in the Command Center before any SMS goes
// out to a real customer.
const fs = require('fs');
const path = require('path');
const jaxConfig = require('./jaxConfig');
const { callClaudeWithTools } = require('../utils/claudeClient');
const { log } = require('./logger');

const TRIAGE_FILE   = path.join(__dirname, '../../data/jax-triage.json');
const LEADS_FILE    = path.join(__dirname, '../../data/leads.json');
const RESEARCH_FILE = path.join(__dirname, '../../data/lead-research.json');

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

function readTriage() {
  const raw = readJson(TRIAGE_FILE, { queue: [] });
  return Array.isArray(raw.queue) ? raw.queue : [];
}

function saveTriage(queue) {
  fs.mkdirSync(path.dirname(TRIAGE_FILE), { recursive: true });
  fs.writeFileSync(TRIAGE_FILE, JSON.stringify({ queue }, null, 2));
}

// ── Tools — the model pulls only the data it decides it needs, instead of
// every lead's prompt carrying the full markets/leads/research dataset.
const tools = [
  {
    name: 'get_market_data',
    description: 'Look up demographic/market notes for a Jacksonville-area city.',
    input_schema: {
      type: 'object',
      properties: { city: { type: 'string', description: 'City name, e.g. "Ponte Vedra"' } },
      required: ['city'],
    },
  },
  {
    name: 'get_lead_history',
    description: "Check whether this phone number has submitted leads before, and what happened to them.",
    input_schema: {
      type: 'object',
      properties: { phone: { type: 'string' } },
      required: ['phone'],
    },
  },
  {
    name: 'get_competitor_research',
    description: 'Get current lead-channel/competitor research notes (cost, conversion rate) for context.',
    input_schema: {
      type: 'object',
      properties: { service: { type: 'string' } },
      required: ['service'],
    },
  },
  {
    name: 'get_seasonal_context',
    description: "Get what's currently happening seasonally in Jacksonville for garage doors (e.g. hurricane prep, post-storm surge, snowbird patterns) — use this to decide whether the draft SMS should mention something timely.",
    input_schema: { type: 'object', properties: {}, required: [] },
  },
];

const toolHandlers = {
  get_market_data: async ({ city }) => {
    const entry = Object.entries(jaxConfig.markets)
      .find(([name]) => name.toLowerCase().includes(String(city || '').toLowerCase()));
    return entry ? { city: entry[0], ...entry[1] } : { found: false };
  },
  get_lead_history: async ({ phone }) => {
    const raw = readJson(LEADS_FILE, { leads: [] });
    const all = Array.isArray(raw) ? raw : (raw.leads || []);
    const matches = all.filter(l => l.phone === phone);
    return {
      count: matches.length,
      history: matches.slice(0, 5).map(l => ({ date: l.timestamp, service: l.service, status: l.status })),
    };
  },
  get_competitor_research: async () => {
    const research = readJson(RESEARCH_FILE, {});
    return { topChannels: research.topChannels || [], keyInsights: research.keyInsights || [] };
  },
  get_seasonal_context: async () => {
    const month = String(new Date().getMonth() + 1);
    return { month, context: jaxConfig.seasonalContext[month] || 'no seasonal notes for this month' };
  },
};

// ── Routine layer (deterministic, free) decides WHETHER to spend tokens at
// all. Most leads are handled fine by the existing static SMS flow — only
// high-value or ambiguous ones go to the agent.
function shouldTriage(lead) {
  return (lead.leadScore || 0) >= 7 || lead.customerType === 'commercial';
}

function buildPrompt(lead) {
  return `You are a lead-triage assistant for ${jaxConfig.businessName}, a Jacksonville-area garage door service company (owner: ${jaxConfig.ownerName}, phone ${jaxConfig.phone}).
A new lead just came in. Research it with the tools available, then decide what should happen next and draft a follow-up SMS for the owner to review — it will NOT be sent automatically, a human approves it first.

Lead:
- Name: ${lead.name}
- Phone: ${lead.phone}
- Service: ${lead.service}
- Urgency: ${lead.urgency}
- City: ${lead.city}
- Message: ${lead.message || '(none)'}
- Lead score: ${lead.leadScore}
- Customer type: ${lead.customerType}

Use get_market_data for the lead's city, get_lead_history for their phone number, get_competitor_research for their service type, and get_seasonal_context before deciding — don't skip the research. If the seasonal context is relevant to this lead's service or urgency, weave it into the draft SMS naturally.

Respond with ONLY raw JSON in this exact shape, no markdown:
{
  "priority": "high" | "normal" | "low",
  "escalate": true or false,
  "escalateReason": "string, empty if escalate is false",
  "draftSms": "follow-up text message in 904 Garage Doors' voice",
  "reasoning": "1-2 sentence internal note explaining the decision, not customer-facing"
}

Voice rules: ${jaxConfig.platformRules.join(' ')}`;
}

async function triageLead(lead) {
  if (!shouldTriage(lead)) return null;

  let decision;
  try {
    const { text } = await callClaudeWithTools(buildPrompt(lead), {
      model: 'claude-haiku-4-5-20251001',
      agentId: 'triage',
      callType: 'triage',
      tools,
      toolHandlers,
      maxTokens: 700,
    });
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    decision = JSON.parse(cleaned);
  } catch (err) {
    log('triage', 'error', `Triage failed for lead ${lead.id}: ${err.message}`);
    decision = {
      priority: 'normal',
      escalate: true,
      escalateReason: `Triage agent error: ${err.message}`,
      draftSms: '',
      reasoning: 'Automated triage failed — needs manual review.',
    };
  }

  const entry = {
    id:        lead.id,
    leadId:    lead.id,
    name:      lead.name,
    phone:     lead.phone,
    service:   lead.service,
    city:      lead.city,
    leadScore: lead.leadScore,
    createdAt: new Date().toISOString(),
    status:    'pending',
    priority:       decision.priority       || 'normal',
    escalate:       !!decision.escalate,
    escalateReason: decision.escalateReason || '',
    draftSms:       decision.draftSms       || '',
    reasoning:      decision.reasoning      || '',
  };

  const queue = readTriage();
  queue.unshift(entry);
  saveTriage(queue.slice(0, 200));
  log('triage', 'success', `Triaged lead ${lead.id} (${lead.name}) — priority ${entry.priority}`);
  return entry;
}

module.exports = { triageLead, shouldTriage, tools, toolHandlers };
