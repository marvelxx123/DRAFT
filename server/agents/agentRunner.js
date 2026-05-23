const contentAgent      = require('./contentAgent');
const adAgent           = require('./adAgent');
const seoAgent          = require('./seoAgent');
const googleAdsAgent    = require('./googleAdsAgent');
const socialAgent       = require('./socialAgent');
const emailAgent        = require('./emailAgent');
const jaxProfileAgent   = require('./jaxProfileAgent');
const jaxSocialAgent    = require('./jaxSocialAgent');
const jaxCraigslistAgent = require('./jaxCraigslistAgent');
const jaxOutreachAgent  = require('./jaxOutreachAgent');
const jaxFollowupAgent  = require('./jaxFollowupAgent');
const jaxResearchAgent  = require('./jaxResearchAgent');
const funnelAgent       = require('./funnelAgent');
const { log } = require('./logger');

const SCHEDULES = {
  content:        6  * 60 * 60 * 1000,
  ads:            12 * 60 * 60 * 1000,
  seo:            24 * 60 * 60 * 1000,
  googleads:      48 * 60 * 60 * 1000,
  social:         8  * 60 * 60 * 1000,
  email:          24 * 60 * 60 * 1000,
  jaxprofile:     168 * 60 * 60 * 1000,
  jaxsocial:      24 * 60 * 60 * 1000,
  jaxcraigslist:  48 * 60 * 60 * 1000,
  jaxoutreach:    24 * 60 * 60 * 1000,
  jaxfollowup:    24 * 60 * 60 * 1000,
  jaxresearch:    12 * 60 * 60 * 1000, // twice daily
  funnel:         12 * 60 * 60 * 1000, // twice daily
};

const AGENT_NAMES = {
  content:        'Content Agent',
  ads:            'Ad Agent',
  seo:            'SEO Agent',
  googleads:      'Google Ads Agent',
  social:         'Social Media Agent',
  email:          'Email Agent',
  jaxprofile:     'JAX Profile Agent',
  jaxsocial:      'JAX Social Agent',
  jaxcraigslist:  'JAX Craigslist Agent',
  jaxoutreach:    'JAX Outreach Agent',
  jaxfollowup:    'JAX Follow-Up Agent',
  jaxresearch:    'JAX Research Agent',
  funnel:         'Funnel Intelligence Agent',
};

const AGENT_SCHEDULES_LABEL = {
  content:        'Every 6 hours',
  ads:            'Every 12 hours',
  seo:            'Every 24 hours',
  googleads:      'Every 48 hours',
  social:         'Every 8 hours',
  email:          'Every 24 hours',
  jaxprofile:     'Every 7 days',
  jaxsocial:      'Every 24 hours',
  jaxcraigslist:  'Every 48 hours',
  jaxoutreach:    'Every 24 hours',
  jaxfollowup:    'Every 24 hours',
  jaxresearch:    'Twice daily (6 AM & 7 PM)',
  funnel:         'Twice daily — funnel research & lead analytics',
};

const agentState = {};
for (const id of Object.keys(SCHEDULES)) {
  agentState[id] = { status: 'idle', lastRun: null, nextRun: null, paused: false, timer: null };
}

const agents = {
  content: contentAgent, ads: adAgent, seo: seoAgent, googleads: googleAdsAgent,
  social: socialAgent, email: emailAgent,
  jaxprofile: jaxProfileAgent, jaxsocial: jaxSocialAgent,
  jaxcraigslist: jaxCraigslistAgent, jaxoutreach: jaxOutreachAgent,
  jaxfollowup: jaxFollowupAgent, jaxresearch: jaxResearchAgent, funnel: funnelAgent,
};

async function runAgent(id) {
  const state = agentState[id];
  if (state.paused) { log(id, 'warn', `Agent ${id} paused — skipping`); return; }
  state.status = 'running';
  state.lastRun = new Date().toISOString();
  try {
    await agents[id].run();
    state.status = 'idle';
  } catch (err) {
    log(id, 'error', `Unhandled error in ${id}: ${err.message}`);
    state.status = 'error';
  }
}

function scheduleAgent(id) {
  const interval = SCHEDULES[id];
  const state = agentState[id];
  // Stagger starts so they don't all hit the API at once
  const stagger = { content: 10, ads: 20, seo: 30, googleads: 40, social: 15, email: 25,
    jaxprofile: 35, jaxsocial: 45, jaxcraigslist: 55, jaxoutreach: 65, jaxfollowup: 75,
    jaxresearch: 90, funnel: 105 };
  setTimeout(() => runAgent(id), (stagger[id] || 10) * 1000);
  state.nextRun = new Date(Date.now() + interval).toISOString();
  state.timer = setInterval(async () => {
    await runAgent(id);
    state.nextRun = new Date(Date.now() + interval).toISOString();
  }, interval);
}

function startAll() {
  log('runner', 'info', 'Agent runner starting — 13 agents: 6 WEARIT + 5 JAX Lead Gen + 1 JAX Research + 1 Funnel');
  for (const id of Object.keys(agents)) scheduleAgent(id);
}

function getStatus() {
  return Object.entries(agentState).map(([id, s]) => ({
    id, name: AGENT_NAMES[id], status: s.status, paused: s.paused,
    lastRun: s.lastRun, nextRun: s.nextRun, schedule: AGENT_SCHEDULES_LABEL[id],
  }));
}

function pauseAgent(id)  { if (!agentState[id]) return false; agentState[id].paused = true;  log(id, 'warn', `Agent ${id} paused by admin`);   return true; }
function resumeAgent(id) { if (!agentState[id]) return false; agentState[id].paused = false; log(id, 'info', `Agent ${id} resumed by admin`);  return true; }
async function triggerAgent(id) { if (!agents[id]) return false; log(id, 'info', `Agent ${id} manually triggered`); await runAgent(id); return true; }

module.exports = { startAll, getStatus, pauseAgent, resumeAgent, triggerAgent };
