// Browser side: speech in (Web Speech API), speech out (speechSynthesis), and the agent calls.
const $ = (id) => document.getElementById(id);
const els = {
  status: $("status"), mic: $("mic"), micLabel: $("micLabel"), handsFree: $("handsFree"), lang: $("lang"),
  newEmail: $("newEmail"), interim: $("interim"), typeForm: $("typeForm"), typed: $("typed"), log: $("log"),
  draft: $("draft"), dFrom: $("dFrom"), dTo: $("dTo"), dSubject: $("dSubject"), dBody: $("dBody"),
  approve: $("approve"), cancel: $("cancel"), draftNote: $("draftNote"),
  accounts: $("accounts"), contacts: $("contacts"), contactForm: $("contactForm"), cName: $("cName"), cEmail: $("cEmail"),
};

let session = null;
let busy = false;
let recognition = null;
let listening = false;

// ── Helpers ──────────────────────────────────────────────────────────────────
async function api(method, url, body) {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `${res.status} ${res.statusText}`);
  return data;
}

function addMsg(kind, text) {
  const div = document.createElement("div");
  div.className = `msg ${kind}`;
  div.textContent = text;
  els.log.appendChild(div);
  els.log.scrollTop = els.log.scrollHeight;
}

function speak(text) {
  return new Promise((resolve) => {
    if (!("speechSynthesis" in window) || !text) return resolve();
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = els.lang.value;
    const voice = speechSynthesis.getVoices().find((v) => v.lang.replace("_", "-") === els.lang.value);
    if (voice) u.voice = voice;
    u.onend = resolve;
    u.onerror = resolve;
    speechSynthesis.speak(u);
  });
}

function showDraft(draft, state) {
  if (!draft) { els.draft.classList.add("hidden"); return; }
  els.draft.classList.remove("hidden");
  els.dFrom.textContent = draft.from || "—";
  els.dTo.textContent = draft.to || "—";
  els.dSubject.textContent = draft.subject || "—";
  els.dBody.textContent = draft.body || "";
  const ready = state === "review";
  els.draft.classList.toggle("ready", ready);
  els.approve.disabled = !ready;
  els.draftNote.textContent =
    state === "review" ? "Waiting for your approval. Say “send it” or click the button." :
    state === "sent" ? "Sent." :
    state === "cancelled" ? "Cancelled." : "Still collecting details.";
}

function setBusy(v) {
  busy = v;
  els.mic.disabled = v;
  els.micLabel.textContent = v ? "Thinking…" : listening ? "Listening…" : "Talk";
}

// ── Session & agent ──────────────────────────────────────────────────────────
async function startSession() {
  speechSynthesis?.cancel();
  session = await api("POST", "/api/session");
  els.log.innerHTML = "";
  showDraft(null);
  addMsg("system", "New email. Tell me who it is for and what you want to say.");
}

async function applyResult(result) {
  addMsg("assistant", result.say);
  showDraft(result.draft, result.state);
  await speak(result.say);
  if (result.state === "sent") {
    addMsg("system", "Email sent. Click “New email” to write another.");
  } else if (result.state === "cancelled") {
    addMsg("system", "Draft discarded. Click “New email” to start again.");
  } else if (els.handsFree.checked) {
    startListening();
  }
}

async function sendText(text) {
  text = text.trim();
  if (!text || busy) return;
  if (!session) await startSession();
  addMsg("user", text);
  setBusy(true);
  try {
    const result = await api("POST", `/api/session/${session.id}/message`, { text });
    await applyResult(result);
  } catch (err) {
    addMsg("error", err.message);
    await speak("Sorry, something went wrong. " + err.message);
  } finally {
    setBusy(false);
  }
}

async function approve() {
  if (!session || busy) return;
  setBusy(true);
  try {
    const result = await api("POST", `/api/session/${session.id}/send`);
    addMsg("user", "(Approved with the button)");
    await applyResult(result);
  } catch (err) {
    addMsg("error", err.message);
  } finally {
    setBusy(false);
  }
}

async function cancelDraft() {
  if (!session) return;
  stopListening();
  await api("POST", `/api/session/${session.id}/cancel`).catch(() => {});
  showDraft(null);
  addMsg("system", "Draft discarded. Click “New email” to start again.");
  session = null;
}

// ── Speech recognition ───────────────────────────────────────────────────────
function setupRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    els.mic.disabled = true;
    els.micLabel.textContent = "No mic support";
    addMsg("system", "This browser has no speech recognition. Use Chrome or Edge, or type your message below.");
    return;
  }
  recognition = new SR();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.onstart = () => { listening = true; els.mic.classList.add("listening"); els.micLabel.textContent = "Listening…"; };
  recognition.onend = () => { listening = false; els.mic.classList.remove("listening"); if (!busy) els.micLabel.textContent = "Talk"; els.interim.textContent = ""; };
  recognition.onerror = (e) => { if (e.error !== "no-speech" && e.error !== "aborted") addMsg("error", `Microphone: ${e.error}`); };
  recognition.onresult = (e) => {
    let interim = "", final = "";
    for (const r of e.results) (r.isFinal ? (final += r[0].transcript) : (interim += r[0].transcript));
    els.interim.textContent = interim;
    if (final) sendText(final);
  };
}

function startListening() {
  if (!recognition || listening || busy) return;
  speechSynthesis?.cancel();
  recognition.lang = els.lang.value;
  try { recognition.start(); } catch { /* already started */ }
}
function stopListening() { if (recognition && listening) recognition.stop(); }

// ── Accounts & contacts ──────────────────────────────────────────────────────
async function loadAccounts() {
  const accounts = await api("GET", "/api/accounts");
  els.accounts.innerHTML = accounts.length ? "" : "<li class='muted'>No Gmail account connected yet.</li>";
  for (const a of accounts) {
    const li = document.createElement("li");
    li.innerHTML = `<span></span><button class="danger">Remove</button>`;
    li.querySelector("span").textContent = a.email;
    li.querySelector("button").onclick = async () => {
      if (confirm(`Disconnect ${a.email}?`)) { await api("DELETE", `/api/accounts/${encodeURIComponent(a.email)}`); loadAccounts(); }
    };
    els.accounts.appendChild(li);
  }
  return accounts;
}

async function loadContacts() {
  const contacts = await api("GET", "/api/contacts");
  els.contacts.innerHTML = contacts.length ? "" : "<li class='muted'>No contacts yet. Add people you email often.</li>";
  for (const c of contacts) {
    const li = document.createElement("li");
    li.innerHTML = `<span></span><button class="danger">Remove</button>`;
    li.querySelector("span").textContent = `${c.name} — ${c.email}`;
    li.querySelector("button").onclick = async () => { await api("DELETE", `/api/contacts/${encodeURIComponent(c.email)}`); loadContacts(); };
    els.contacts.appendChild(li);
  }
}

async function loadStatus() {
  const h = await api("GET", "/api/health");
  const problems = [];
  if (!h.anthropicKey) problems.push("ANTHROPIC_API_KEY missing");
  if (!h.googleClient) problems.push("Google OAuth not configured");
  if (!h.accounts) problems.push("no Gmail account connected");
  els.status.textContent = problems.length ? `Setup needed: ${problems.join(", ")}.` : `Ready · ${h.model} · ${h.accounts} account${h.accounts === 1 ? "" : "s"}`;
}

// ── Wire up ──────────────────────────────────────────────────────────────────
els.mic.onclick = () => (listening ? stopListening() : startListening());
els.newEmail.onclick = startSession;
els.approve.onclick = approve;
els.cancel.onclick = cancelDraft;
els.typeForm.onsubmit = (e) => { e.preventDefault(); const t = els.typed.value; els.typed.value = ""; sendText(t); };
els.contactForm.onsubmit = async (e) => {
  e.preventDefault();
  try {
    await api("POST", "/api/contacts", { name: els.cName.value, email: els.cEmail.value });
    els.cName.value = ""; els.cEmail.value = "";
    loadContacts();
  } catch (err) { alert(err.message); }
};
els.lang.value = localStorage.getItem("lang") || "en-US";
els.lang.onchange = () => localStorage.setItem("lang", els.lang.value);

setupRecognition();
loadStatus();
loadAccounts();
loadContacts();
const connected = new URLSearchParams(location.search).get("connected");
if (connected) { addMsg("system", `Connected ${connected}.`); history.replaceState(null, "", "/"); }
