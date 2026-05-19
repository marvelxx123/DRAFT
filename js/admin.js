'use strict';

let AUTH_TOKEN = sessionStorage.getItem('mc_token') || null;
let activeFilter = 'all';
let refreshTimer = null;

// ── AUTH ───────────────────────────────────────────────────────────────────
async function login() {
  const pw = document.getElementById('loginPassword').value;
  const err = document.getElementById('loginError');
  err.textContent = '';
  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw }),
    });
    const data = await res.json();
    if (!res.ok) { err.textContent = data.error || 'Invalid password'; return; }
    AUTH_TOKEN = data.token;
    sessionStorage.setItem('mc_token', AUTH_TOKEN);
    showDashboard();
  } catch {
    err.textContent = 'Connection error';
  }
}

function logout() {
  AUTH_TOKEN = null;
  sessionStorage.removeItem('mc_token');
  if (refreshTimer) clearInterval(refreshTimer);
  document.getElementById('loginScreen').classList.remove('hidden');
  document.getElementById('dashboard').classList.add('hidden');
  document.getElementById('loginPassword').value = '';
}

// ── API HELPERS ────────────────────────────────────────────────────────────
async function api(method, path, body) {
  const res = await fetch('/api/admin' + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + AUTH_TOKEN,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) { logout(); return null; }
  return res.json();
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────
function showDashboard() {
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');
  loadAll();
  refreshTimer = setInterval(loadAll, 8000); // auto-refresh every 8s
}

async function loadAll() {
  await Promise.all([loadAgentStatus(), loadLogs(), loadContent(), loadLeads()]);
}

// ── LEADS ─────────────────────────────────────────────────────────────────
async function loadLeads() {
  try {
    const res = await fetch('/api/contact', {
      headers: { 'Authorization': 'Bearer ' + AUTH_TOKEN }
    });
    const data = await res.json();
    renderLeads(data.leads || []);
  } catch { /* silently fail */ }
}

function renderLeads(leads) {
  const empty = document.getElementById('leadsEmpty');
  const list  = document.getElementById('leadsList');
  if (!leads.length) { empty.style.display = ''; list.innerHTML = ''; return; }
  empty.style.display = 'none';
  const urgColor = { 'Emergency — Right Now': '#e63946', 'Today': '#f39c12', 'This Week': '#2ecc71', 'Just Getting a Quote': '#888' };
  list.innerHTML = leads.slice(0, 30).map(l => `
    <div style="background:var(--card,#161616);border:1px solid ${l.status==='new'?'rgba(46,204,113,0.4)':'var(--border,#232323)'};border-radius:10px;padding:1rem 1.25rem;margin-bottom:0.65rem;display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;">
      <div style="display:flex;flex-direction:column;gap:0.2rem;">
        <div style="font-weight:700;font-size:0.95rem;">${escHtml(l.name)}</div>
        <div style="font-size:0.85rem;color:#aaa;">${escHtml(l.service)}</div>
        <div style="font-size:0.72rem;color:#666;">${formatTime(l.createdAt)}</div>
      </div>
      <div style="display:flex;align-items:center;gap:0.75rem;flex-wrap:wrap;">
        <span style="font-size:0.7rem;font-weight:700;letter-spacing:0.1em;padding:0.2rem 0.6rem;border-radius:4px;background:${(urgColor[l.urgency]||'#888')}22;color:${urgColor[l.urgency]||'#888'};border:1px solid ${urgColor[l.urgency]||'#888'}44;">${escHtml(l.urgency)}</span>
        <a href="tel:${escHtml(l.phone)}" style="font-family:'Bebas Neue',sans-serif;font-size:1.2rem;color:#c8a96e;letter-spacing:0.05em;">${escHtml(l.phone)}</a>
        ${l.status==='new' ? `<button onclick="markCalled(${l.id})" style="background:#2ecc71;color:#000;font-weight:700;font-size:0.72rem;letter-spacing:0.08em;padding:0.3rem 0.7rem;border-radius:5px;border:none;cursor:pointer;">✓ MARK CALLED</button>` : `<span style="font-size:0.72rem;color:#555;font-weight:600;">CALLED</span>`}
      </div>
    </div>
  `).join('');
}

async function markCalled(id) {
  await fetch(`/api/contact/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + AUTH_TOKEN },
    body: JSON.stringify({ status: 'called' }),
  });
  loadLeads();
}

// ── AGENT STATUS ──────────────────────────────────────────────────────────
async function loadAgentStatus() {
  const data = await api('GET', '/status');
  if (!data) return;
  data.agents.forEach(renderAgent);
}

function renderAgent(agent) {
  const card = document.querySelector(`.agent-card[data-agent="${agent.id}"]`);
  if (!card) return;

  // Status badge
  const badge = card.querySelector('.agent-status-badge');
  const statusLabel = agent.paused ? 'paused' : agent.status;
  badge.className = `agent-status-badge ${statusLabel}`;
  const dots = { idle: '○', running: '◉', error: '✗', paused: '⏸' };
  badge.innerHTML = `<span>${dots[statusLabel] || '○'}</span>${statusLabel.toUpperCase()}`;

  // Meta rows
  card.querySelector('.meta-last').textContent  = agent.lastRun ? formatTime(agent.lastRun) : '—';
  card.querySelector('.meta-next').textContent  = agent.nextRun ? formatTime(agent.nextRun) : '—';
  card.querySelector('.meta-sched').textContent = agent.schedule;

  // Pause / resume button
  const pauseBtn = card.querySelector('.btn-pause');
  if (pauseBtn) {
    pauseBtn.textContent = agent.paused ? 'RESUME' : 'PAUSE';
    pauseBtn.className = `adm-btn ${agent.paused ? 'primary' : 'warning'}`;
    pauseBtn.onclick = () => togglePause(agent.id, agent.paused);
  }
}

async function triggerAgent(id) {
  toast(`Running ${id} agent…`);
  const btn = document.querySelector(`.agent-card[data-agent="${id}"] .btn-run`);
  if (btn) btn.disabled = true;
  await api('POST', `/agents/${id}/run`);
  setTimeout(() => { if (btn) btn.disabled = false; loadAll(); }, 3000);
  toast(`${id} agent triggered`);
}

async function togglePause(id, currentlyPaused) {
  await api('POST', `/agents/${id}/${currentlyPaused ? 'resume' : 'pause'}`);
  toast(`Agent ${id} ${currentlyPaused ? 'resumed' : 'paused'}`);
  loadAgentStatus();
}

// ── LOGS ──────────────────────────────────────────────────────────────────
async function loadLogs() {
  const params = activeFilter !== 'all' ? `?agentId=${activeFilter}` : '';
  const data = await api('GET', '/logs' + params);
  if (!data) return;
  renderLogs(data.logs);
}

function renderLogs(logs) {
  const feed = document.getElementById('logFeed');
  if (!logs.length) {
    feed.innerHTML = '<div class="log-empty">No logs yet — agents start automatically</div>';
    return;
  }
  feed.innerHTML = logs.map(l => `
    <div class="log-entry">
      <span class="log-time">${formatTime(l.timestamp)}</span>
      <span class="log-agent ${l.agentId}">${l.agentId}</span>
      <span class="log-level ${l.level}">${{ info:'●', success:'✓', warn:'⚠', error:'✗' }[l.level] || '●'}</span>
      <span class="log-msg">${escHtml(l.message)}</span>
    </div>
  `).join('');
}

function setFilter(agentId) {
  activeFilter = agentId;
  document.querySelectorAll('.log-filter-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.filter === agentId);
  });
  loadLogs();
}

// ── CONTENT PREVIEW ───────────────────────────────────────────────────────
async function loadContent() {
  const data = await api('GET', '/content');
  if (!data) return;

  if (data.content) {
    setText('previewTagline', data.content.heroTagline || '—');
    setText('previewPromo', data.content.promoBanner || '—');
    if (data.content.productDescriptions) {
      const entries = Object.entries(data.content.productDescriptions);
      if (entries.length) {
        const [prod, desc] = entries[entries.length - 1];
        setText('previewProdDesc', `[${prod}]\n${desc}`);
      }
    }
  }

  if (data.ads && data.ads.campaigns && data.ads.campaigns.length) {
    const latest = data.ads.campaigns[0];
    setText('previewIg', latest.instagram || '—');
    setText('previewDiscount', latest.discount || '—');
  }

  if (data.seo) {
    setText('previewMeta', `Title: ${data.seo.metaTitle || '—'}\n\n${data.seo.metaDescription || '—'}`);
    if (data.seo.keywords) {
      setText('previewKeywords', data.seo.keywords.join('\n'));
    }
  }

  // JAX Lead Gen previews
  if (data.jaxProfiles && data.jaxProfiles.entries && data.jaxProfiles.entries.length) {
    const latest = data.jaxProfiles.entries[0];
    setText('previewJaxGBP',      latest.googlePost    || '—');
    setText('previewJaxNextdoor', latest.nextdoorIntro || '—');
  }
  if (data.jaxSocial && data.jaxSocial.posts && data.jaxSocial.posts.length) {
    setText('previewJaxFB', data.jaxSocial.posts[0].facebookGroup || '—');
  }
  if (data.jaxCraigslist && data.jaxCraigslist.ads && data.jaxCraigslist.ads.length) {
    const ad = data.jaxCraigslist.ads[0];
    setText('previewJaxCL', `[${ad.title}]\n\n${ad.body || '—'}`);
  }
  if (data.jaxOutreach && data.jaxOutreach.packs && data.jaxOutreach.packs.length) {
    setText('previewJaxRE', data.jaxOutreach.packs[0].realEstateDM || '—');
  }
  if (data.jaxFollowup && data.jaxFollowup.sequences && data.jaxFollowup.sequences.length) {
    setText('previewJaxSMS', data.jaxFollowup.sequences[0].thankYouSms || '—');
  }
}

// ── UTILS ─────────────────────────────────────────────────────────────────
function formatTime(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now - d;
  if (diff < 60_000)  return Math.round(diff / 1000) + 's ago';
  if (diff < 3600_000) return Math.round(diff / 60_000) + 'm ago';
  if (diff < 86400_000) return Math.round(diff / 3600_000) + 'h ago';
  return d.toLocaleDateString();
}

function escHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function toast(msg) {
  const el = document.getElementById('adminToast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2500);
}

// ── INIT ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('loginPassword').addEventListener('keydown', e => {
    if (e.key === 'Enter') login();
  });

  // Set up log filter buttons
  document.querySelectorAll('.log-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => setFilter(btn.dataset.filter));
  });

  // Auto-login if token exists
  if (AUTH_TOKEN) showDashboard();
});
