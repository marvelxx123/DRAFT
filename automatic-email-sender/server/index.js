import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listAccounts, removeAccount } from "./accounts.js";
import { addContact, listContacts, removeContact } from "./contacts.js";
import { authUrl, completeAuth } from "./google.js";
import { MODEL, handleUserText, newSession, sendApproved } from "./agent.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: "200kb" }));

// Optional password protection (HTTP basic auth). Set APP_PASSWORD in .env.
app.use((req, res, next) => {
  const expected = process.env.APP_PASSWORD;
  if (!expected) return next();
  const header = req.headers.authorization || "";
  const [scheme, encoded] = header.split(" ");
  const supplied = scheme === "Basic" && encoded ? Buffer.from(encoded, "base64").toString().split(":").slice(1).join(":") : "";
  if (supplied === expected) return next();
  res.set("WWW-Authenticate", 'Basic realm="Automatic Email Sender"');
  res.status(401).send("Password required");
});

app.use(express.static(path.join(here, "..", "public")));

// ── Gmail accounts ───────────────────────────────────────────────────────────
app.get("/auth/google", (req, res) => {
  try {
    res.redirect(authUrl("connect"));
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.get("/auth/google/callback", async (req, res) => {
  try {
    if (req.query.error) throw new Error(`Google returned: ${req.query.error}`);
    const email = await completeAuth(String(req.query.code || ""));
    res.redirect(`/?connected=${encodeURIComponent(email)}`);
  } catch (err) {
    res.status(500).send(`Could not connect Gmail account: ${err.message}`);
  }
});

app.get("/api/accounts", (req, res) => res.json(listAccounts()));
app.delete("/api/accounts/:email", (req, res) => {
  removeAccount(req.params.email);
  res.json(listAccounts());
});

// ── Contacts ─────────────────────────────────────────────────────────────────
app.get("/api/contacts", (req, res) => res.json(listContacts()));
app.post("/api/contacts", (req, res) => {
  const { name, email } = req.body || {};
  if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "A name and a valid email address are required." });
  }
  res.json(addContact({ name, email }));
});
app.delete("/api/contacts/:email", (req, res) => res.json(removeContact(req.params.email)));

// ── Agent sessions (in memory, one per email) ────────────────────────────────
const sessions = new Map();
const SESSION_TTL_MS = 60 * 60 * 1000;
setInterval(() => {
  const cutoff = Date.now() - SESSION_TTL_MS;
  for (const [id, s] of sessions) if (s.updatedAt < cutoff) sessions.delete(id);
}, 5 * 60 * 1000).unref();

function getSession(req, res) {
  const s = sessions.get(req.params.id);
  if (!s) res.status(404).json({ error: "Session not found. Start a new one." });
  return s;
}

app.post("/api/session", (req, res) => {
  const s = newSession();
  sessions.set(s.id, s);
  res.json({ id: s.id, state: s.state, model: MODEL });
});

app.post("/api/session/:id/message", async (req, res) => {
  const s = getSession(req, res);
  if (!s) return;
  const text = String(req.body?.text || "").trim();
  if (!text) return res.status(400).json({ error: "Empty message." });
  try {
    res.json(await handleUserText(s, text));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// On-screen "Approve and send" button. Same gate as voice approval.
app.post("/api/session/:id/send", async (req, res) => {
  const s = getSession(req, res);
  if (!s) return;
  try {
    const result = await sendApproved(s);
    res.json({ say: "Sent.", action: "send", draft: s.draft, state: s.state, sent: result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/session/:id/cancel", (req, res) => {
  const s = getSession(req, res);
  if (!s) return;
  s.state = "cancelled";
  res.json({ state: s.state });
});

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    model: MODEL,
    anthropicKey: !!process.env.ANTHROPIC_API_KEY,
    googleClient: !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET,
    accounts: listAccounts().length,
  });
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => console.log(`Automatic Email Sender running at http://localhost:${port}`));
