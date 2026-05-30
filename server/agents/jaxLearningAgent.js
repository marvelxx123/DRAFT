const fs    = require('fs');
const path  = require('path');
const { log } = require('./logger');
const { callClaudeJSON } = require('../utils/claudeClient');
const { addEntry } = require('../utils/knowledgeBase');

const AGENT_ID   = 'jaxlearning';
const LEADS_FILE = path.join(__dirname, '../../data/leads.json');
const MEMORY_FILE = path.join(__dirname, '../../data/agent-memory.json');

function readLeads() {
  try {
    const raw = JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8'));
    return Array.isArray(raw) ? raw : (raw.leads || []);
  } catch { return []; }
}

function readMemory() {
  try { return JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8')); } catch { return {}; }
}

function analyzeOutcomes(leads) {
  const closed = leads.filter(l => l.status === 'closed');
  const lost   = leads.filter(l => l.status === 'lost');
  const total  = closed.length + lost.length;
  if (total === 0) return null;

  const totalRevenue = closed.reduce((s, l) => s + (l.jobValue || 0), 0);

  // Win rates by dimension
  const dims = { service: {}, city: {}, urgency: {} };
  const wins = { service: {}, city: {}, urgency: {} };

  for (const l of [...closed, ...lost]) {
    dims.service[l.service || 'Unknown'] = (dims.service[l.service || 'Unknown'] || 0) + 1;
    dims.city[l.city || 'Unknown']       = (dims.city[l.city || 'Unknown'] || 0) + 1;
    dims.urgency[l.urgency || 'Unknown'] = (dims.urgency[l.urgency || 'Unknown'] || 0) + 1;
  }
  for (const l of closed) {
    wins.service[l.service || 'Unknown'] = (wins.service[l.service || 'Unknown'] || 0) + 1;
    wins.city[l.city || 'Unknown']       = (wins.city[l.city || 'Unknown'] || 0) + 1;
    wins.urgency[l.urgency || 'Unknown'] = (wins.urgency[l.urgency || 'Unknown'] || 0) + 1;
  }

  const rateTable = (dim) => Object.entries(dims[dim])
    .map(([k, n]) => ({ name: k, total: n, wins: wins[dim][k] || 0, rate: Math.round(((wins[dim][k] || 0) / n) * 100) }))
    .sort((a, b) => b.rate - a.rate).slice(0, 5);

  const lossReasons = {};
  for (const l of lost) { const r = l.lossReason || 'Unknown'; lossReasons[r] = (lossReasons[r] || 0) + 1; }

  const hourWins = {};
  for (const l of closed) {
    if (l.timestamp) { const h = new Date(l.timestamp).getHours(); hourWins[h] = (hourWins[h] || 0) + 1; }
  }

  return {
    totalClosed: closed.length, totalLost: lost.length, totalRevenue,
    winRate:     Math.round((closed.length / total) * 100),
    avgJobValue: closed.length ? Math.round(totalRevenue / closed.length) : 0,
    serviceWinRates: rateTable('service'),
    cityWinRates:    rateTable('city'),
    urgencyWinRates: rateTable('urgency'),
    topLossReasons:  Object.entries(lossReasons).sort((a,b) => b[1]-a[1]).map(([r,c]) => ({ reason: r, count: c })),
    bestHours:       Object.entries(hourWins).sort((a,b) => b[1]-a[1]).slice(0, 3).map(([h,c]) => ({ hour: Number(h), count: c })),
  };
}

async function generateInstructions(stats, manualNotes) {
  const notesText = manualNotes?.length ? `\nOwner notes: ${manualNotes.slice(0,5).map(n=>n.note).join(' | ')}` : '';

  if (!stats) {
    return {
      craigslist: `No closed deals yet. Default strategy: target emergency and spring replacement posts in Ponte Vedra (32082), Nocatee (32081), and Jacksonville Beach (32250). Prioritize posts from homeowners, not contractors.${notesText}`,
      outreach:   `No closed deals yet. Default strategy: focus on property managers with 20+ units in premium zip codes. HOAs in Ponte Vedra and Nocatee have highest income levels.${notesText}`,
      funnel:     `No closed deals yet. Default strategy: optimize for emergency leads — they close fastest and pay most. Reduce form friction on mobile.${notesText}`,
      research:   `No closed deals yet. Default strategy: monitor Precision Garage Door and A1A Overhead Door pricing and response time claims weekly.${notesText}`,
    };
  }

  const prompt = `You are the intelligence engine for 904 Garage Doors lead gen platform in Jacksonville FL.

REAL PERFORMANCE DATA:
- Win rate: ${stats.winRate}% (${stats.totalClosed} closed, ${stats.totalLost} lost)
- Total revenue closed: $${stats.totalRevenue}
- Avg job value: $${stats.avgJobValue}
- Best services (by win rate): ${stats.serviceWinRates.slice(0,3).map(s=>`${s.name} ${s.rate}%`).join(', ')}
- Best cities (by win rate): ${stats.cityWinRates.slice(0,3).map(c=>`${c.name} ${c.rate}%`).join(', ')}
- Top loss reasons: ${stats.topLossReasons.slice(0,3).map(r=>`${r.reason} (${r.count}x)`).join(', ')}
- Best hours: ${stats.bestHours.map(h=>`${h.hour}:00`).join(', ')}${notesText}

Write highly specific, data-driven instructions for each agent. Use exact numbers, zip codes, and service names from the data above. These instructions replace generic defaults — be aggressive and specific.

Return JSON only:
{
  "craigslist": "...",
  "outreach": "...",
  "funnel": "...",
  "research": "..."
}`;

  const raw = await callClaudeJSON(prompt, { agentId: AGENT_ID, maxTokens: 900, schema: { type: 'object', required: ['craigslist','outreach','funnel','research'] } });
  return raw;
}

async function run() {
  log(AGENT_ID, 'info', 'Learning agent starting — analyzing outcomes and evolving agent instructions...');

  const leads  = readLeads();
  const memory = readMemory();
  const stats  = analyzeOutcomes(leads);

  if (stats) {
    log(AGENT_ID, 'info', `${stats.totalClosed} closed ($${stats.totalRevenue}), ${stats.totalLost} lost — win rate ${stats.winRate}%`);
    addEntry({ type: 'win_pattern', content: `Win rate ${stats.winRate}% on ${stats.totalClosed+stats.totalLost} outcomes. Best service: ${stats.serviceWinRates[0]?.name}. Best city: ${stats.cityWinRates[0]?.name}. Avg job: $${stats.avgJobValue}`, tags: ['win','performance','jacksonville'], source: AGENT_ID });
    if (stats.topLossReasons[0]) {
      addEntry({ type: 'win_pattern', content: `Top loss reason: ${stats.topLossReasons[0].reason} (${stats.topLossReasons[0].count} times). Address this in all agent messaging.`, tags: ['loss','pattern','improve'], source: AGENT_ID });
    }
  } else {
    log(AGENT_ID, 'info', 'No outcome data yet — writing default instructions');
  }

  let agentInstructions;
  try {
    agentInstructions = await generateInstructions(stats, memory.manualNotes);
    log(AGENT_ID, 'success', 'Agent instructions evolved from real outcome data');
  } catch (err) {
    log(AGENT_ID, 'error', `Instruction generation error: ${err.message}`);
    agentInstructions = memory.agentInstructions;
  }

  const updated = {
    lastUpdated: new Date().toISOString(),
    version: (memory.version || 0) + 1,
    ...(stats || {
      totalClosed: memory.totalClosed || 0, totalLost: memory.totalLost || 0,
      totalRevenue: memory.totalRevenue || 0, winRate: memory.winRate || 0,
      avgJobValue: memory.avgJobValue || 0, serviceWinRates: memory.serviceWinRates || [],
      cityWinRates: memory.cityWinRates || [], topLossReasons: memory.topLossReasons || [],
      bestHours: memory.bestHours || [],
    }),
    agentInstructions,
    manualNotes: memory.manualNotes || [],
  };

  fs.mkdirSync(path.dirname(MEMORY_FILE), { recursive: true });
  fs.writeFileSync(MEMORY_FILE, JSON.stringify(updated, null, 2));
  log(AGENT_ID, 'success', `Memory v${updated.version} saved — win rate ${updated.winRate}%, $${updated.totalRevenue} total revenue tracked`);
}

module.exports = { run, AGENT_ID };
