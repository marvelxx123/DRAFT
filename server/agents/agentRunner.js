const contentAgent       = require('./contentAgent');
const seoAgent           = require('./seoAgent');
const jaxProfileAgent    = require('./jaxProfileAgent');
const jaxSocialAgent     = require('./jaxSocialAgent');
const jaxCraigslistAgent = require('./jaxCraigslistAgent');
const jaxOutreachAgent   = require('./jaxOutreachAgent');
const jaxFollowupAgent   = require('./jaxFollowupAgent');
const jaxResearchAgent   = require('./jaxResearchAgent');
const funnelAgent        = require('./funnelAgent');
const jaxLearningAgent   = require('./jaxLearningAgent');
const { log } = require('./logger');
const { recordRun } = require('./metrics');

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
  jaxlearning:    24 * 60 * 60 * 1000, // daily — runs after others have data
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
  jaxlearning:   'Learning & Memory Agent',
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
  jaxlearning:   'Daily — evolves all agent instructions',
};

// Agents paused until their prerequisites are ready:
// content + seo — resume when blog/SEO push is a priority
// jaxprofile   — resume when GMB is verified
// jaxsocial    — resume when social accounts are active
// jaxfollowup  — resume when lead volume justifies it
const PAUSED_BY_DEFAULT = new Set(['content', 'seo', 'jaxprofile', 'jaxsocial', 'jaxfollowup']);
// jaxlearning always runs — it's the brain, never pause it

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
  jaxfollowup: jaxFollowupAgent, jaxresearch: jaxResearchAgent,
  funnel: funnelAgent, jaxlearning: jaxLearningAgent,
};

// ── CIRCUIT BREAKER ──────────────────────────────────────────────────────────
const circuitState = {};
const CB_OPEN_AFTER  = 3;        // failures before opening
const CB_RESET_MS    = 30 * 60 * 1000; // 30 min before retry

function cbIsOpen(id) {
  const cb = circuitState[id];
  if (!cb || cb.state !== 'open') return false;
  if (Date.now() > cb.openedAt + CB_RESET_MS) { cb.state = 'half-open'; return false; }
  return true;
}
function cbSuccess(id) { circuitState[id] = { state: 'closed', failures: 0 }; }
function cbFailure(id) {
  if (!circuitState[id]) circuitState[id] = { state: 'closed', failures: 0 };
  circuitState[id].failures++;
  if (circuitState[id].failures >= CB_OPEN_AFTER) {
    circuitState[id].state    = 'open';
    circuitState[id].openedAt = Date.now();
    log(id, 'warn', `Circuit breaker OPEN — ${CB_OPEN_AFTER} consecutive failures. Auto-reset in 30 min.`);
  }
}

async function runAgent(id) {
  const state = agentState[id];
  if (state.paused) { log(id, 'warn', `Agent ${id} paused — skipping`); return; }
  if (cbIsOpen(id)) { log(id, 'warn', `Circuit breaker open for ${id} — skipping until auto-reset`); return; }

  state.status  = 'running';
  state.lastRun = new Date().toISOString();
  const t0      = Date.now();

  try {
    await agents[id].run();
    state.status = 'idle';
    cbSuccess(id);
    recordRun({ agentId: id, success: true, durationMs: Date.now() - t0 });
  } catch (err) {
    log(id, 'error', `Unhandled error in ${id}: ${err.message}`);
    state.status = 'error';
    cbFailure(id);
    recordRun({ agentId: id, success: false, durationMs: Date.now() - t0, error: err.message });
  }
}

function scheduleAgent(id) {
  const interval = SCHEDULES[id];
  const state = agentState[id];
  // Stagger starts so they don't all hit the API at once
  const stagger = { content: 10, seo: 25,
    jaxprofile: 40, jaxsocial: 55, jaxcraigslist: 70, jaxoutreach: 85, jaxfollowup: 100,
    jaxresearch: 115, funnel: 130, jaxlearning: 150 };
  setTimeout(() => runAgent(id), (stagger[id] || 10) * 1000);
  state.nextRun = new Date(Date.now() + interval).toISOString();
  state.timer = setInterval(async () => {
    await runAgent(id);
    state.nextRun = new Date(Date.now() + interval).toISOString();
  }, interval);
}

function startAll() {
  log('runner', 'info', '904 Garage Doors agent runner starting — 5 active: craigslist, outreach, research, funnel, learning');
  for (const id of Object.keys(agents)) scheduleAgent(id);
}

function getStatus() {
  return Object.entries(agentState).map(([id, s]) => ({
    id, name: AGENT_NAMES[id], status: s.status, paused: s.paused,
    lastRun: s.lastRun, nextRun: s.nextRun, schedule: AGENT_SCHEDULES_LABEL[id],
    circuit: circuitState[id]?.state || 'closed',
  }));
}

function pauseAgent(id)  { if (!agentState[id]) return false; agentState[id].paused = true;  log(id, 'warn', `Agent ${id} paused by admin`);   return true; }
function resumeAgent(id) { if (!agentState[id]) return false; agentState[id].paused = false; log(id, 'info', `Agent ${id} resumed by admin`);  return true; }
async function triggerAgent(id) { if (!agents[id]) return false; log(id, 'info', `Agent ${id} manually triggered`); await runAgent(id); return true; }

module.exports = { startAll, getStatus, pauseAgent, resumeAgent, triggerAgent };
