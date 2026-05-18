const contentAgent = require('./contentAgent');
const adAgent = require('./adAgent');
const seoAgent = require('./seoAgent');
const { log } = require('./logger');

// Schedule intervals in milliseconds
const SCHEDULES = {
  content: 6  * 60 * 60 * 1000,  // every 6 hours
  ads:     12 * 60 * 60 * 1000,  // every 12 hours
  seo:     24 * 60 * 60 * 1000,  // every 24 hours
};

const agentState = {
  content: { status: 'idle', lastRun: null, nextRun: null, paused: false, timer: null },
  ads:     { status: 'idle', lastRun: null, nextRun: null, paused: false, timer: null },
  seo:     { status: 'idle', lastRun: null, nextRun: null, paused: false, timer: null },
};

const agents = {
  content: contentAgent,
  ads:     adAgent,
  seo:     seoAgent,
};

async function runAgent(id) {
  const state = agentState[id];
  if (state.paused) {
    log(id, 'warn', `Agent ${id} is paused, skipping run`);
    return;
  }
  state.status = 'running';
  state.lastRun = new Date().toISOString();
  try {
    await agents[id].run();
    state.status = 'idle';
  } catch (err) {
    log(id, 'error', `Unhandled error in agent ${id}: ${err.message}`);
    state.status = 'error';
  }
}

function scheduleAgent(id) {
  const interval = SCHEDULES[id];
  const state = agentState[id];

  // Run immediately on start (after 10s delay so server is fully up)
  setTimeout(() => runAgent(id), 10_000);
  state.nextRun = new Date(Date.now() + interval).toISOString();

  state.timer = setInterval(async () => {
    await runAgent(id);
    state.nextRun = new Date(Date.now() + interval).toISOString();
  }, interval);
}

function startAll() {
  log('runner', 'info', 'Agent runner starting — Content(6h), Ads(12h), SEO(24h)');
  for (const id of Object.keys(agents)) {
    scheduleAgent(id);
  }
}

function getStatus() {
  return Object.entries(agentState).map(([id, s]) => ({
    id,
    name: { content: 'Content Agent', ads: 'Ad Agent', seo: 'SEO Agent' }[id],
    status: s.status,
    paused: s.paused,
    lastRun: s.lastRun,
    nextRun: s.nextRun,
    schedule: { content: 'Every 6 hours', ads: 'Every 12 hours', seo: 'Every 24 hours' }[id],
  }));
}

function pauseAgent(id) {
  if (!agentState[id]) return false;
  agentState[id].paused = true;
  log(id, 'warn', `Agent ${id} paused by admin`);
  return true;
}

function resumeAgent(id) {
  if (!agentState[id]) return false;
  agentState[id].paused = false;
  log(id, 'info', `Agent ${id} resumed by admin`);
  return true;
}

async function triggerAgent(id) {
  if (!agents[id]) return false;
  log(id, 'info', `Agent ${id} manually triggered by admin`);
  await runAgent(id);
  return true;
}

module.exports = { startAll, getStatus, pauseAgent, resumeAgent, triggerAgent };
