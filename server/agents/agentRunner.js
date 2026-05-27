const contentAgent       = require('./contentAgent');
const seoAgent           = require('./seoAgent');
const jaxProfileAgent    = require('./jaxProfileAgent');
const jaxSocialAgent     = require('./jaxSocialAgent');
const jaxCraigslistAgent = require('./jaxCraigslistAgent');
const jaxOutreachAgent   = require('./jaxOutreachAgent');
const jaxFollowupAgent   = require('./jaxFollowupAgent');
const jaxResearchAgent   = require('./jaxResearchAgent');
const funnelAgent        = require('./funnelAgent');
const { log } = require('./logger');

const SCHEDULES = {
  content:        12 * 60 * 60 * 1000, // twice daily
  seo:            24 * 60 * 60 * 1000,
  jaxprofile:    168 * 60 * 60 * 1000, // weekly
  jaxsocial:      24 * 60 * 60 * 1000,
  jaxcraigslist:  12 * 60 * 60 * 1000, // twice daily
  jaxoutreach:    24 * 60 * 60 * 1000,
  jaxfollowup:    24 * 60 * 60 * 1000,
  jaxresearch:    12 * 60 * 60 * 1000, // twice daily
  funnel:         12 * 60 * 60 * 1000, // twice daily
};

const AGENT_NAMES = {
  content:       'Content Agent',
  seo:           'SEO Agent',
  jaxprofile:    'JAX Profile Agent',
  jaxsocial:     'JAX Social Agent',
  jaxcraigslist: 'JAX Craigslist Agent',
  jaxoutreach:   'JAX Outreach Agent',
  jaxfollowup:   'JAX Follow-Up Agent',
  jaxresearch:   'JAX Research Agent',
  funnel:        'Funnel Intelligence Agent',
};

const AGENT_SCHEDULES_LABEL = {
  content:       'Twice daily',
  seo:           'Every 24 hours',
  jaxprofile:    'Every 7 days',
  jaxsocial:     'Every 24 hours',
  jaxcraigslist: 'Twice daily',
  jaxoutreach:   'Every 24 hours',
  jaxfollowup:   'Every 24 hours',
  jaxresearch:   'Twice daily',
  funnel:        'Twice daily',
};

// Agents paused until their prerequisites are ready:
// content + seo — resume when blog/SEO push is a priority
// jaxprofile   — resume when GMB is verified
// jaxsocial    — resume when social accounts are active
// jaxfollowup  — resume when lead volume justifies it
const PAUSED_BY_DEFAULT = new Set(['content', 'seo', 'jaxprofile', 'jaxsocial', 'jaxfollowup']);

const agentState = {};
for (const id of Object.keys(SCHEDULES)) {
  agentState[id] = {
    status: 'idle', lastRun: null, nextRun: null,
    paused: PAUSED_BY_DEFAULT.has(id), timer: null,
  };
}

const agents = {
  content: contentAgent, seo: seoAgent,
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
  const stagger = { content: 10, seo: 25,
    jaxprofile: 40, jaxsocial: 55, jaxcraigslist: 70, jaxoutreach: 85, jaxfollowup: 100,
    jaxresearch: 115, funnel: 130 };
  setTimeout(() => runAgent(id), (stagger[id] || 10) * 1000);
  state.nextRun = new Date(Date.now() + interval).toISOString();
  state.timer = setInterval(async () => {
    await runAgent(id);
    state.nextRun = new Date(Date.now() + interval).toISOString();
  }, interval);
}

function startAll() {
  log('runner', 'info', '904 Garage Doors agent runner starting — 4 active: craigslist, outreach, research, funnel');
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
