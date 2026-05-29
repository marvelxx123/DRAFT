const fs   = require('fs');
const path = require('path');

const MEMORY_FILE = path.join(__dirname, '../../data/agent-memory.json');

function readMemory() {
  try { return JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8')); }
  catch {
    return {
      lastUpdated: null, version: 0,
      totalClosed: 0, totalLost: 0, totalRevenue: 0,
      winRate: 0, avgJobValue: 0,
      serviceWinRates: [], cityWinRates: [], topLossReasons: [], bestHours: [],
      agentInstructions: {
        craigslist: 'No outcome data yet — focus on emergency and spring replacement posts in Ponte Vedra, Nocatee, Jacksonville Beach.',
        outreach:   'No outcome data yet — prioritize property managers and HOAs in premium zip codes (32082, 32081).',
        funnel:     'No outcome data yet — focus on mobile conversion and emergency urgency signals.',
        research:   'No outcome data yet — track competitor pricing, response times, and service guarantees.',
      },
      manualNotes: [],
    };
  }
}

function getInstructions(agentId) {
  const memory = readMemory();
  return memory.agentInstructions?.[agentId] || '';
}

module.exports = { readMemory, getInstructions };
