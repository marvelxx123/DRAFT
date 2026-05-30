const fetch = require('node-fetch');
const fs    = require('fs');
const path  = require('path');
const { log } = require('./logger');
const { getInstructions } = require('../services/memory');
const { callClaude } = require('../utils/claudeClient');
const { addEntry, buildContext } = require('../utils/knowledgeBase');
const { auditOutput } = require('../utils/security');

const AGENT_ID   = 'jaxresearch';
const DATA_FILE  = path.join(__dirname, '../../data/jax-research.json');

const COMPETITORS = [
  { name: 'Precision Garage Door Jacksonville', url: 'https://garagedoorsjacksonvillefl.com' },
  { name: 'OGD Overhead Garage Door',           url: 'https://www.ogdoors.com' },
  { name: 'Overhead Door Jacksonville',         url: 'https://www.overheaddoorjacksonville.com' },
  { name: 'A1A Overhead Door',                  url: 'https://www.a1aoverheaddoor.com' },
];

const CITY_KEYWORDS = [
  'garage door repair Jacksonville FL',
  'garage door repair Ponte Vedra',
  'garage door repair Fernandina Beach',
  'garage door repair Yulee FL',
  'garage door repair Nocatee FL',
  'garage door repair Mandarin Jacksonville',
  'emergency garage door repair Jacksonville',
  'broken spring replacement Jacksonville FL',
  'garage door opener installation Jacksonville',
  'same day garage door repair Jacksonville',
];


async function fetchCompetitorPage(competitor) {
  try {
    const res = await fetch(competitor.url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; research-bot/1.0)' },
      timeout: 10000,
    });
    if (!res.ok) return null;
    const html = await res.text();
    // Extract visible text (rough strip of HTML tags)
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 3000);
    return text;
  } catch {
    return null;
  }
}

async function run() {
  log(AGENT_ID, 'info', 'JAX Research Agent starting — competitive analysis run…');

  const existing = (() => {
    try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch { return {}; }
  })();

  const report = {
    lastRun:     new Date().toISOString(),
    runNumber:   (existing.runNumber || 0) + 1,
    keywords:    {},
    competitors: [],
    insights:    [],
    marketAlerts: [],
  };

  // ── 1. KEYWORD STRATEGY ───────────────────────────────────────────────────
  try {
    const kwPrompt = `You are a local SEO expert specializing in garage door repair businesses in Northeast Florida.

Analyze these target keywords for 904 Garage Doors (Jacksonville, FL area):
${CITY_KEYWORDS.map((k, i) => `${i + 1}. ${k}`).join('\n')}

For each keyword, provide:
- Search intent (emergency/informational/commercial)
- Estimated competition level (low/medium/high)
- Recommended content angle to beat competitors
- Whether a dedicated page exists or should be created

Return as JSON array: [{"keyword":"...","intent":"...","competition":"...","angle":"...","needsPage":true/false}]
Return ONLY the JSON array, no other text.`;

    const kwRaw = await callClaude(kwPrompt, { agentId: AGENT_ID, maxTokens: 1200 });
    try {
      report.keywords.analysis = JSON.parse(kwRaw);
    } catch {
      report.keywords.raw = kwRaw;
    }
    log(AGENT_ID, 'success', 'Keyword strategy analysis complete');
  } catch (err) {
    log(AGENT_ID, 'error', `Keyword analysis error: ${err.message}`);
  }

  // ── 2. COMPETITOR INTELLIGENCE ────────────────────────────────────────────
  for (const comp of COMPETITORS) {
    try {
      log(AGENT_ID, 'info', `Checking competitor: ${comp.name}`);
      const pageText = await fetchCompetitorPage(comp);
      if (!pageText) {
        report.competitors.push({ name: comp.name, url: comp.url, status: 'unreachable', insights: [] });
        continue;
      }

      const compPrompt = `You are analyzing a competitor garage door company in Jacksonville, FL for 904 Garage Doors.

Competitor: ${comp.name} (${comp.url})
Page content excerpt:
"""
${pageText}
"""

Extract and analyze:
1. What services do they prominently advertise?
2. What pricing or guarantees do they mention?
3. What geographic areas do they target?
4. What trust signals do they use (reviews, years in business, certifications)?
5. What are their top 3 weaknesses that 904 Garage Doors could exploit?
6. What are they doing WELL that we should match or beat?

Return as JSON: {"services":[],"pricing":"","areas":[],"trustSignals":[],"weaknesses":[],"strengths":[]}
Return ONLY the JSON, no other text.`;

      const compRaw = await callClaude(compPrompt, { agentId: AGENT_ID, maxTokens: 1200 });
      let compData = {};
      try { compData = JSON.parse(compRaw); } catch { compData = { raw: compRaw }; }

      report.competitors.push({
        name:     comp.name,
        url:      comp.url,
        status:   'analyzed',
        ...compData,
      });
      addEntry({ type: 'competitor_intel', content: `${comp.name}: weaknesses=${compData.weaknesses?.join(', ')||'unknown'}, strengths=${compData.strengths?.join(', ')||'unknown'}`, tags: [comp.name, 'jacksonville', 'competitor'], source: AGENT_ID });
      log(AGENT_ID, 'success', `${comp.name} analyzed`);
    } catch (err) {
      log(AGENT_ID, 'error', `Competitor ${comp.name} error: ${err.message}`);
    }
  }

  // ── 3. STRATEGIC INSIGHTS ─────────────────────────────────────────────────
  try {
    const learned = getInstructions('research');
    const insightPrompt = `You are the marketing strategist for 904 Garage Doors, a local garage door repair company in Jacksonville, FL targeting:
PERFORMANCE INTELLIGENCE: ${learned}
- Jacksonville metro (all neighborhoods)
- Ponte Vedra / Ponte Vedra Beach (premium market)
- Fernandina Beach / Amelia Island (Nassau County)
- Yulee FL (fastest-growing suburb, 30%+ growth since 2019)
- Nocatee, Mandarin, Orange Park, Fleming Island

Key facts about the business:
- Just launched, building reviews from zero
- Has Google LSA (background check complete)
- Has GMB profile (verification pending)
- Same-day dispatch, professional service platform, 7 days/week
- Phone: (904) 468-3428

Based on current local SEO best practices and the Jacksonville garage door market, generate:
1. Top 3 immediate action items to rank faster in Google Local Pack
2. Top 3 content angles that competitors are NOT covering well
3. 2 seasonal or market timing opportunities right now
4. Recommended next city page to build (beyond the 10 already live)

Return as JSON: {"immediateActions":[],"contentGaps":[],"timingOpportunities":[],"nextCityPage":""}
Return ONLY the JSON.`;

    const insightRaw = await callClaude(insightPrompt, { agentId: AGENT_ID, maxTokens: 1200 });
    try { report.insights = JSON.parse(insightRaw); } catch { report.insights = { raw: insightRaw }; }
    log(AGENT_ID, 'success', 'Strategic insights generated');
  } catch (err) {
    log(AGENT_ID, 'error', `Insights error: ${err.message}`);
  }

  // ── 4. MARKET ALERTS ──────────────────────────────────────────────────────
  try {
    const alertPrompt = `For a garage door repair business in Jacksonville FL area, identify 3 current market conditions or events that could generate more leads if acted on NOW.

Consider: seasonal patterns (FL heat, hurricane season prep, back to school, end of year), local housing market trends, Google Ads opportunities, review platform timing.

Today is ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}.

Return as JSON array: [{"alert":"...","action":"...","urgency":"high/medium/low"}]
Return ONLY the JSON array.`;

    const alertRaw = await callClaude(alertPrompt, { agentId: AGENT_ID, maxTokens: 1200 });
    try { report.marketAlerts = JSON.parse(alertRaw); } catch { report.marketAlerts = [{ raw: alertRaw }]; }
    for (const alert of (report.marketAlerts||[])) {
      if (alert.alert) addEntry({ type: 'market_insight', content: `${alert.alert} — Action: ${alert.action}`, tags: ['jacksonville','market','alert'], source: AGENT_ID });
    }
    log(AGENT_ID, 'success', 'Market alerts generated');
  } catch (err) {
    log(AGENT_ID, 'error', `Market alerts error: ${err.message}`);
  }

  // ── SAVE ──────────────────────────────────────────────────────────────────
  const history = existing.history || [];
  history.unshift({ runAt: report.lastRun, runNumber: report.runNumber });
  if (history.length > 20) history.length = 20;

  const output = { ...report, history };
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(output, null, 2));
  log(AGENT_ID, 'success', `JAX Research Agent run #${report.runNumber} complete — data saved`);
}

module.exports = { run, AGENT_ID };
