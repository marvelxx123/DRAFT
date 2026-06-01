const fs   = require('fs');
const path = require('path');
const { log } = require('./logger');
const { callClaudeJSON } = require('../utils/claudeClient');
const { addEntry } = require('../utils/knowledgeBase');
const { readMemory } = require('../services/memory');

const AGENT_ID   = 'jaxcfo';
const DATA_FILE  = path.join(__dirname, '../../data/jax-cfo.json');
const LEADS_FILE = path.join(__dirname, '../../data/leads.json');
const METRICS_FILE = path.join(__dirname, '../../data/metrics.json');

// Known monthly platform costs — update as you upgrade plans
const PLATFORM_COSTS = {
  render:    7.00,   // $7/month paid plan
  resend:    0.00,   // free tier
  twilio:    0.00,   // pay per SMS (~$0.008 each), tracked separately
  anthropic: 0.00,   // tracked via metrics.json
};

function readLeads() {
  try {
    const raw = JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8'));
    return Array.isArray(raw) ? raw : [];
  } catch { return []; }
}

function readMetricsData() {
  try { return JSON.parse(fs.readFileSync(METRICS_FILE, 'utf8')); }
  catch { return {}; }
}

const DISPATCH_CUT = 0.67; // owner keeps 67% on dispatched jobs (tech gets 33%)

function calcFinancials(leads, metricsData) {
  const closed = leads.filter(l => l.status === 'closed');
  const lost   = leads.filter(l => l.status === 'lost');
  const active = leads.filter(l => l.status === 'new' || l.status === 'called');

  // Split personal vs dispatched jobs
  const personalJobs    = closed.filter(l => l.jobType === 'personal');
  const dispatchedJobs  = closed.filter(l => l.jobType === 'dispatched' || !l.jobType);

  const personalRevenue   = personalJobs.reduce((s, l) => s + (l.jobValue || 0), 0);
  const dispatchedRevenue = dispatchedJobs.reduce((s, l) => s + Math.round((l.jobValue || 0) * DISPATCH_CUT), 0);
  const totalRevenue      = personalRevenue + dispatchedRevenue;

  const avgJobValue    = closed.length ? Math.round(totalRevenue / closed.length) : 0;
  const conversionRate = leads.length  ? Math.round((closed.length / leads.length) * 100) : 0;

  const apiCostTotal       = metricsData.totals?.costUsd || 0;
  const monthlyPlatformCost = Object.values(PLATFORM_COSTS).reduce((s, v) => s + v, 0);

  // Revenue by service
  const byService = {};
  for (const l of closed) {
    const svc = l.service || 'Unknown';
    if (!byService[svc]) byService[svc] = { count: 0, revenue: 0 };
    byService[svc].count++;
    byService[svc].revenue += (l.jobValue || 0);
  }

  // Revenue by city
  const byCity = {};
  for (const l of closed) {
    const city = l.city || 'Unknown';
    if (!byCity[city]) byCity[city] = { count: 0, revenue: 0 };
    byCity[city].count++;
    byCity[city].revenue += (l.jobValue || 0);
  }

  // Loss reasons
  const lossReasons = {};
  for (const l of lost) {
    const r = l.lossReason || 'Unknown';
    lossReasons[r] = (lossReasons[r] || 0) + 1;
  }

  const now = Date.now();
  const last30 = leads.filter(l => (now - new Date(l.timestamp).getTime()) < 30 * 86400000);
  const last7  = leads.filter(l => (now - new Date(l.timestamp).getTime()) < 7  * 86400000);
  const closedLast30 = last30.filter(l => l.status === 'closed');
  const revLast30    = closedLast30.reduce((s, l) => s + (l.jobValue || 0), 0);

  return {
    totalLeads:       leads.length,
    totalClosed:      closed.length,
    totalLost:        lost.length,
    totalActive:      active.length,
    personalJobs:     personalJobs.length,
    dispatchedJobs:   dispatchedJobs.length,
    personalRevenue,
    dispatchedRevenue,
    totalRevenue,
    avgJobValue,
    conversionRate,
    apiCostTotal:   Math.round(apiCostTotal * 100) / 100,
    monthlyPlatformCost,
    profitLoss:     Math.round(totalRevenue - apiCostTotal - monthlyPlatformCost),
    topServices:    Object.entries(byService).sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 5),
    topCities:      Object.entries(byCity).sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 5),
    topLossReasons: Object.entries(lossReasons).sort((a, b) => b[1] - a[1]).slice(0, 3),
    last30Days:     { leads: last30.length, closed: closedLast30.length, revenue: revLast30 },
    last7Days:      { leads: last7.length, closed: last7.filter(l => l.status === 'closed').length },
  };
}

async function run() {
  log(AGENT_ID, 'info', 'CFO Agent starting — financial analysis and strategic briefing…');

  const existing = (() => { try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch { return {}; } })();
  const leads    = readLeads();
  const metrics  = readMetricsData();
  const memory   = readMemory();
  const fin      = calcFinancials(leads, metrics);

  const report = {
    lastRun:    new Date().toISOString(),
    runNumber:  (existing.runNumber || 0) + 1,
    financials: fin,
    briefing:   {},
  };

  try {
    const topServices   = fin.topServices.map(([s, d]) => `${s}: $${d.revenue} (${d.count} jobs)`).join(', ') || 'no closed jobs yet';
    const topCities     = fin.topCities.map(([c, d]) => `${c}: $${d.revenue}`).join(', ') || 'no closed jobs yet';
    const lossReasons   = fin.topLossReasons.map(([r, c]) => `${r} (${c}x)`).join(', ') || 'none recorded';
    const memoryContext = memory.agentInstructions?.research || 'No performance data yet';
    const jobSplit      = `Personal jobs: ${fin.personalJobs || 0} ($${fin.personalRevenue || 0} full margin) | Dispatched jobs: ${fin.dispatchedJobs || 0} ($${fin.dispatchedRevenue || 0} at 67% cut)`;

    const prompt = `You are the CFO and strategic advisor for 904 Garage Doors — a garage door lead generation and dispatch platform in Jacksonville, FL. You think like a Harvard MBA with real street-level business instinct. You are direct, honest, and never generic.

FOUNDATIONAL STRATEGY — READ THIS FIRST:
We do NOT compete with Precision Garage Door, OGD, or Overhead Door. We want ONE profitable slice of Jacksonville — 1-2% of the market is enough. Our edge is speed, lean operations, and smart targeting. Once we own the slice in Jacksonville, we copy the exact playbook to Tampa → Orlando → Miami. Every recommendation must answer: does this help us own our slice faster, or does it try to beat everyone at once?

CORE VALUES: Speed. Focus. Honesty. Simplicity. Momentum.

BUSINESS MODEL — TWO REVENUE STREAMS:
(A) Personal jobs: Owner (Tal) does the work himself. Highest margin — full job revenue minus platform costs. Target: at least 1 personal job per day.
(B) Dispatched jobs: Independent tech does the work, collects from customer, sends owner 65-70% cut. Tech keeps 30-35%.
PRIMARY ASSET: Not labor — the ability to consistently generate quality leads.

THREE-PHASE ROADMAP:
Phase 1 (NOW): Prove Jacksonville. Consistent lead gen, predictable profit, reliable tech network, repeatable processes. Min bar: 10 closed jobs, 5+ reviews, positive cash flow.
Phase 2: Multi-market. Replicate lead system to Tampa, Orlando, Miami. Build tech networks in each city.
Phase 3: Vertical SaaS. Build software platform for garage door companies based on real operational experience — lead management, dispatch, follow-up, marketing tracking. Nationwide.

PHASE 1 IS NOT COMPLETE UNTIL: consistent leads flowing, profitable month achieved, 1-2 reliable techs on standby, operating procedures documented.

LIVE FINANCIAL SNAPSHOT:
- Total leads all time: ${fin.totalLeads}
- Closed jobs: ${fin.totalClosed} | Lost: ${fin.totalLost} | Active/pending: ${fin.totalActive}
- Total revenue: $${fin.totalRevenue}
- Average job value: $${fin.avgJobValue}
- Conversion rate: ${fin.conversionRate}%
- Job split: ${jobSplit}
- Last 30 days: ${fin.last30Days.leads} leads, ${fin.last30Days.closed} closed, $${fin.last30Days.revenue} revenue
- Last 7 days: ${fin.last7Days.leads} leads, ${fin.last7Days.closed} closed
- API costs to date: $${fin.apiCostTotal}
- Monthly platform cost: $${fin.monthlyPlatformCost}/month
- Net profit/loss: $${fin.profitLoss}
- Top revenue services: ${topServices}
- Top revenue cities: ${topCities}
- Top loss reasons: ${lossReasons}

BUSINESS CONTEXT:
- Model: dispatch platform — connect homeowners with pros, not hands-on service
- Stage: early — building Google reviews, GMB verification pending
- Google LSA active (background check complete)
- AI agents running: research, funnel, craigslist, outreach, learning
- Auto-outreach live: emails to property managers, HOAs, apartment complexes
- SMS: customer confirmation + owner alert + 45-min follow-up
- Market intelligence: ${memoryContext}

PHASE ROADMAP:
- Phase 1 (now): Prove Jacksonville, get first 10 closed jobs, build reviews
- Phase 2: Scale Jacksonville with paid Google LSA, hit $5k/month
- Phase 3: Copy playbook to Tampa/Orlando

STRATEGIC OPTION TO EVALUATE WHEN JUSTIFIED:
- Co-working space near Jacksonville city center ($50-350/month) — improves Google Local Pack proximity ranking for downtown Jacksonville searches. Not urgent until revenue is consistent. Worth recommending when health score ≥ 6 and 10+ closed jobs.

As CFO, give a sharp, specific, honest strategic briefing. No generic advice.

Return as JSON:
{
  "healthScore": 1-10,
  "healthReason": "one honest sentence",
  "weeklyPriorities": ["specific action 1", "specific action 2", "specific action 3"],
  "investmentRecommendation": {"amount": 0, "what": "...", "why": "..."},
  "biggestRisk": "one honest sentence about what could kill this business right now",
  "expansionReady": false,
  "expansionReason": "why or why not — be specific",
  "doTodayFree": "one specific action that costs $0 and moves the needle today",
  "revenueTarget": {"monthly": 0, "howToGetThere": "..."}
}
Return ONLY the JSON.`;

    const schema = {
      type: 'object',
      required: ['healthScore', 'healthReason', 'weeklyPriorities', 'biggestRisk', 'doTodayFree'],
    };

    report.briefing = await callClaudeJSON(prompt, { agentId: AGENT_ID, maxTokens: 1200, schema });
    log(AGENT_ID, 'success', `CFO briefing generated — health score: ${report.briefing.healthScore}/10`);

    addEntry({
      type:    'strategic_insight',
      content: `CFO health: ${report.briefing.healthScore}/10. Priorities: ${(report.briefing.weeklyPriorities || []).join(' | ')}. Risk: ${report.briefing.biggestRisk}`,
      tags:    ['cfo', 'strategy', 'finance', 'jacksonville'],
      source:  AGENT_ID,
    });
  } catch (err) {
    log(AGENT_ID, 'error', `CFO briefing failed: ${err.message}`);
  }

  const history = existing.history || [];
  history.unshift({
    runAt:       report.lastRun,
    runNumber:   report.runNumber,
    healthScore: report.briefing.healthScore,
    revenue:     fin.totalRevenue,
    leads:       fin.totalLeads,
  });
  if (history.length > 30) history.length = 30;

  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify({ ...report, history }, null, 2));
  log(AGENT_ID, 'success', `CFO Agent run #${report.runNumber} complete — health: ${report.briefing.healthScore}/10, P&L: $${fin.profitLoss}`);
}

module.exports = { run, AGENT_ID };
