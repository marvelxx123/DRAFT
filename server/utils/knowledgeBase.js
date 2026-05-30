const fs   = require('fs');
const path = require('path');

const KB_FILE = path.join(__dirname, '../../data/knowledge-base.json');

function read() {
  try { return JSON.parse(fs.readFileSync(KB_FILE, 'utf8')); }
  catch { return { entries: [], lastUpdated: null }; }
}
function save(kb) {
  fs.mkdirSync(path.dirname(KB_FILE), { recursive: true });
  fs.writeFileSync(KB_FILE, JSON.stringify(kb, null, 2));
}

// type: 'competitor_intel' | 'win_pattern' | 'market_insight' | 'outreach_result' | 'seasonal' | 'local'
function addEntry({ type, content, tags = [], source = '' }) {
  const kb = read();
  // Deduplicate: skip if identical content exists from same source
  if (kb.entries.some(e => e.content === content && e.source === source)) return;
  kb.entries.unshift({ id: Date.now(), type, content, tags, source, addedAt: new Date().toISOString(), useCount: 0 });
  kb.entries = kb.entries.slice(0, 500);
  kb.lastUpdated = new Date().toISOString();
  save(kb);
}

function retrieve(query, { types, limit = 5 } = {}) {
  const kb = read();
  let entries = kb.entries;
  if (types?.length) entries = entries.filter(e => types.includes(e.type));

  const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  if (!words.length) return entries.slice(0, limit);

  const scored = entries.map(e => {
    const text  = `${e.content} ${e.tags.join(' ')}`.toLowerCase();
    const score = words.reduce((s, w) => s + (text.includes(w) ? 1 : 0), 0);
    return { ...e, _score: score };
  }).filter(e => e._score > 0).sort((a, b) => b._score - a._score).slice(0, limit);

  // Track usage
  if (scored.length) {
    const kb2 = read();
    for (const r of scored) {
      const e = kb2.entries.find(x => x.id === r.id);
      if (e) e.useCount++;
    }
    save(kb2);
  }
  return scored;
}

function buildContext(query, options = {}) {
  const results = retrieve(query, options);
  if (!results.length) return '';
  return `\nKNOWLEDGE BASE (retrieved context):\n${results.map(r => `[${r.type.toUpperCase()}] ${r.content}`).join('\n')}`;
}

module.exports = { addEntry, retrieve, buildContext };
