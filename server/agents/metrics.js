const fs   = require('fs');
const path = require('path');

const METRICS_FILE = path.join(__dirname, '../../data/metrics.json');

function read() {
  try { return JSON.parse(fs.readFileSync(METRICS_FILE, 'utf8')); }
  catch { return { totalCalls:0, totalCostUsd:0, totalFailures:0, totalInputTokens:0, totalOutputTokens:0, byAgent:{}, recentRuns:[] }; }
}
function save(m) {
  fs.mkdirSync(path.dirname(METRICS_FILE), { recursive: true });
  fs.writeFileSync(METRICS_FILE, JSON.stringify(m, null, 2));
}

function recordCall({ agentId, callType, latencyMs=0, inputTokens=0, outputTokens=0, costUsd=0, attempt=1, success, error }) {
  try {
    const m = read();
    m.totalCalls++;
    m.totalCostUsd       = +(m.totalCostUsd + costUsd).toFixed(6);
    m.totalInputTokens  += inputTokens;
    m.totalOutputTokens += outputTokens;
    if (!success) m.totalFailures++;

    if (!m.byAgent[agentId]) m.byAgent[agentId] = { calls:0, failures:0, totalCostUsd:0, totalLatencyMs:0, avgLatencyMs:0, successRate:100 };
    const a = m.byAgent[agentId];
    a.calls++;
    if (!success) a.failures++;
    a.totalCostUsd  = +(a.totalCostUsd + costUsd).toFixed(6);
    a.totalLatencyMs += latencyMs;
    a.avgLatencyMs   = Math.round(a.totalLatencyMs / a.calls);
    a.successRate    = Math.round(((a.calls - a.failures) / a.calls) * 100);
    a.lastCall       = new Date().toISOString();
    if (!success && error) a.lastError = error;
    save(m);
  } catch { /* metrics must never crash the system */ }
}

function recordRun({ agentId, success, durationMs, callsCount=0, costUsd=0, error }) {
  try {
    const m = read();
    if (!m.recentRuns) m.recentRuns = [];
    m.recentRuns.unshift({ agentId, success, durationMs, callsCount, costUsd:+(costUsd).toFixed(6), error:error||null, at: new Date().toISOString() });
    m.recentRuns = m.recentRuns.slice(0, 100);
    save(m);
  } catch {}
}

function readMetrics() { return read(); }

module.exports = { recordCall, recordRun, readMetrics };
