const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '../../data/agent-logs.json');
const MAX_ENTRIES = 500;

function readLogs() {
  try {
    return JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writeLogs(logs) {
  fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2));
}

function log(agentId, level, message, meta = {}) {
  const entry = {
    id: Date.now() + '-' + Math.random().toString(36).slice(2, 7),
    agentId,
    level,    // 'info' | 'success' | 'warn' | 'error'
    message,
    meta,
    timestamp: new Date().toISOString(),
  };
  const logs = readLogs();
  logs.unshift(entry);
  writeLogs(logs.slice(0, MAX_ENTRIES));
  const icon = { info: '●', success: '✓', warn: '⚠', error: '✗' }[level] || '●';
  console.log(`[${agentId}] ${icon} ${message}`);
  return entry;
}

module.exports = { log, readLogs };
