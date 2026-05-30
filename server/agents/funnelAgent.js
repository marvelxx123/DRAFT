const fs    = require('fs');
const path  = require('path');
const { log } = require('./logger');
const { getInstructions, readMemory } = require('../services/memory');
const { callClaude } = require('../utils/claudeClient');

const AGENT_ID    = 'funnel';
const DATA_FILE   = path.join(__dirname, '../../data/funnel-insights.json');
const LEADS_FILE  = path.join(__dirname, '../../data/leads.json');
const CHANGE_LOG  = path.join(__dirname, '../../data/funnel-changelog.json');

function readLeads() {
  try {
    const raw = JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8'));
    return Array.isArray(raw) ? raw : (raw.leads || []);
  } catch { return []; }
}

function readChangelog() {
  try { return JSON.parse(fs.readFileSync(CHANGE_LOG, 'utf8')); } catch { return []; }
}

function analyzeLeads(leads) {
  if (!leads.length) return null;
  const now = Date.now();
  const last7d  = leads.filter(l => (now - new Date(l.timestamp).getTime()) < 7  * 86400000);
  const last30d = leads.filter(l => (now - new Date(l.timestamp).getTime()) < 30 * 86400000);

  const byService  = {};
  const byCity     = {};
  const byUrgency  = {};
  const byHour     = {};
  const bySource   = {};

  for (const l of leads) {
    const svc = l.service || 'Unknown'; byService[svc]  = (byService[svc]  || 0) + 1;
    const cty = l.city    || 'Unknown'; byCity[cty]     = (byCity[cty]     || 0) + 1;
    const urg = l.urgency || 'Unknown'; byUrgency[urg]  = (byUrgency[urg]  || 0) + 1;
    const src = l.source  || 'Unknown'; bySource[src]   = (bySource[src]   || 0) + 1;
    if (l.timestamp) {
      const h = new Date(l.timestamp).getHours();
      byHour[h] = (byHour[h] || 0) + 1;
    }
  }

  const topService = Object.entries(byService).sort((a,b) => b[1]-a[1]).slice(0,3);
  const topCity    = Object.entries(byCity).sort((a,b)    => b[1]-a[1]).slice(0,3);
  const topUrgency = Object.entries(byUrgency).sort((a,b) => b[1]-a[1]).slice(0,3);
  const peakHour   = Object.entries(byHour).sort((a,b)   => b[1]-a[1])[0];
  const emergency  = leads.filter(l => (l.urgency||'').toLowerCase().includes('emergency')).length;
  const avgScore   = leads.length ? Math.round(leads.reduce((s,l) => s + (l.score||0), 0) / leads.length) : 0;

  return { total: leads.length, last7d: last7d.length, last30d: last30d.length,
    topService, topCity, topUrgency, bySource, peakHour, emergency, avgScore };
}

async function researchFunnelTactics(leadsData) {
  const context = leadsData
    ? `Current data: ${leadsData.total} total leads, ${leadsData.last7d} in last 7 days, top service: ${leadsData.topService[0]?.[0]||'unknown'}, emergency rate: ${Math.round(leadsData.emergency/Math.max(leadsData.total,1)*100)}%`
    : 'No lead data yet — business just launched';

  const memory = readMemory();
  const learned = getInstructions('funnel');
  const memStats = memory.winRate ? `Win rate: ${memory.winRate}%, avg job: $${memory.avgJobValue}, top loss: ${memory.topLossReasons?.[0]?.reason || 'unknown'}. ` : '';

  const prompt = `You are a conversion rate optimization expert specializing in local service businesses (garage door repair, HVAC, plumbers) in the US.

Business: 904 Garage Doors — Jacksonville FL metro, same-day dispatch, professional service platform
Current funnel state: ${context}
REAL PERFORMANCE DATA: ${memStats}${learned}

Research and provide the TOP 5 highest-impact sales funnel improvements for a local garage door repair business RIGHT NOW in 2025. Focus on:
1. What's working in local service lead gen today (real tactics, not theory)
2. Mobile conversion — most local service searches are mobile
3. Emergency/urgency conversion (highest value leads)
4. Trust signals that convert in 2025
5. One specific thing to change on the homepage form based on current data

For each tactic: what it is, why it works NOW, and exactly how to implement it.
Return as JSON array: [{"tactic":"","why":"","implement":"","impact":"high/medium","effort":"low/medium/high"}]
Return ONLY the JSON array.`;

  const raw = await callClaude(prompt, { agentId: AGENT_ID, maxTokens: 1500 });
  try { return JSON.parse(raw); } catch { return [{ tactic: raw, why: '', implement: '', impact: 'medium', effort: 'medium' }]; }
}

async function analyzeCompetitorFunnels() {
  const prompt = `Analyze the sales funnel strategies used by the TOP local garage door repair companies in the US in 2025.

Focus on: Precision Garage Door, America's Garage Doors, A1 Garage Door Service, Overhead Door Company.

What specific funnel tactics are the winners using that smaller local companies miss?
Consider: landing page structure, CTA placement, trust signals, urgency triggers, mobile UX, form design, follow-up sequences.

Return as JSON: {"winnerTactics":[],"commonMistakes":[],"quickWins":[],"emergingTrends":[]}
Return ONLY the JSON.`;

  const raw = await callClaude(prompt, { agentId: AGENT_ID, maxTokens: 1200 });
  try { return JSON.parse(raw); } catch { return { raw }; }
}

async function generatePageImprovements(leadsData) {
  const topCity    = leadsData?.topCity?.[0]?.[0]    || 'Jacksonville';
  const topService = leadsData?.topService?.[0]?.[0] || 'Spring Replacement';
  const peakHour   = leadsData?.peakHour?.[0]        || '9';

  const prompt = `You are improving a local garage door repair website for more leads.

Business: 904 Garage Doors, Jacksonville FL
Top lead source city: ${topCity}
Most requested service: ${topService}
Peak call hour: ${peakHour}:00

Generate specific micro-copy improvements for these elements. Be concrete and specific — actual words to use.

1. Hero form headline (currently: "We'll Call You in 30 Minutes") — suggest 3 alternatives
2. Submit button text (currently: "Send — Get My Free Quote") — suggest 3 alternatives
3. Hero sub-headline (currently: "Same-day garage door repair across all of Jacksonville...") — suggest improved version
4. Trust bar items — suggest 2 new items to add
5. Emergency CTA section headline — suggest stronger version

Return as JSON: {"formHeadlines":[],"submitButtons":[],"heroSub":"","trustItems":[],"emergencyHeadline":""}
Return ONLY the JSON.`;

  const raw = await callClaude(prompt, { agentId: AGENT_ID, maxTokens: 800 });
  try { return JSON.parse(raw); } catch { return null; }
}

async function run() {
  log(AGENT_ID, 'info', 'Funnel Agent starting — research + analysis run…');

  const leads      = readLeads();
  const leadsData  = analyzeLeads(leads);
  const changelog  = readChangelog();
  const existing   = (() => { try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch { return {}; } })();

  const report = {
    lastRun:    new Date().toISOString(),
    runNumber:  (existing.runNumber || 0) + 1,
    leadsStats: leadsData,
    tactics:    [],
    competitorFunnels: {},
    improvements: {},
    changelog:  changelog.slice(0, 30),
  };

  // 1. LEADS ANALYSIS
  if (leadsData) {
    log(AGENT_ID, 'success', `Leads analyzed — ${leadsData.total} total, ${leadsData.last7d} this week, ${leadsData.emergency} emergency`);
  } else {
    log(AGENT_ID, 'info', 'No leads yet — running strategy research only');
  }

  // 2. FUNNEL TACTICS RESEARCH
  try {
    report.tactics = await researchFunnelTactics(leadsData);
    log(AGENT_ID, 'success', `${report.tactics.length} funnel tactics researched`);
  } catch (err) {
    log(AGENT_ID, 'error', `Tactics research error: ${err.message}`);
  }

  // 3. COMPETITOR FUNNEL ANALYSIS
  try {
    report.competitorFunnels = await analyzeCompetitorFunnels();
    log(AGENT_ID, 'success', 'Competitor funnel analysis complete');
  } catch (err) {
    log(AGENT_ID, 'error', `Competitor funnel error: ${err.message}`);
  }

  // 4. PAGE IMPROVEMENTS
  try {
    report.improvements = await generatePageImprovements(leadsData);
    if (report.improvements) {
      const entry = {
        at:       new Date().toISOString(),
        run:      report.runNumber,
        type:     'improvement-suggestions',
        details:  `Generated copy improvements based on ${leadsData?.total || 0} leads`,
      };
      changelog.unshift(entry);
      fs.mkdirSync(path.dirname(CHANGE_LOG), { recursive: true });
      fs.writeFileSync(CHANGE_LOG, JSON.stringify(changelog.slice(0, 100), null, 2));
      log(AGENT_ID, 'success', 'Page improvement suggestions generated');
    }
  } catch (err) {
    log(AGENT_ID, 'error', `Improvements error: ${err.message}`);
  }

  // 5. SAVE
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(report, null, 2));
  log(AGENT_ID, 'success', `Funnel Agent run #${report.runNumber} complete`);
}

module.exports = { run, AGENT_ID };
