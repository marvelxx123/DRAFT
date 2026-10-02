# Automatic Email Sender

A voice-driven AI agent for Gmail. You talk, it drafts the email, reads it back to you, and sends it from the Gmail account you choose only after you approve.

**Flow**

1. Click **Talk** and say something like: *"Send an email from my work account to David about tomorrow's meeting. Tell him we start at nine and he should bring the report."*
2. The assistant asks for anything missing (which account, who David is, the subject).
3. It reads the complete email aloud: from, to, subject, body.
4. Say **"send it"** (or click **Approve and send**). Ask for changes instead and it reads the new version.
5. The email goes out through the Gmail API from the chosen account.

The send step is enforced in code: the server sends only the draft you just heard, and only after a review turn. The model cannot send on its own.

## Requirements

- Node.js 20 or newer
- An Anthropic API key
- A Google Cloud OAuth client with the Gmail API enabled
- Chrome or Edge for voice (they ship speech recognition; other browsers can still type)

## Setup

```bash
npm install
cp .env.example .env
# fill in ANTHROPIC_API_KEY, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
npm start
```

Open http://localhost:3000.

### Google OAuth

1. Go to https://console.cloud.google.com and create a project.
2. **APIs & Services → Library** → enable **Gmail API**.
3. **OAuth consent screen** → External. While the app is in testing mode, add each Gmail address you want to send from as a **test user**.
4. **Credentials → Create credentials → OAuth client ID → Web application**. Add `http://localhost:3000/auth/google/callback` as an authorized redirect URI. Copy the client ID and secret into `.env`.
5. In the app, click **Connect a Gmail account** once per account. Each account's refresh token is stored in `data/accounts.json` (ignored by git).

Scopes requested: `gmail.send` (send only, no reading) and `userinfo.email` (to know which address was connected).

### Contacts

Add people in the sidebar so you can say "send it to David". Stored in `data/contacts.json`.

## Configuration

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Claude API key |
| `CLAUDE_MODEL` | Optional. Defaults to `claude-opus-5-5` |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` | Google OAuth client |
| `PORT` | Defaults to 3000 |
| `APP_PASSWORD` | Optional. Protects the page with a password. Set it before exposing the app publicly |

## How it works

```
Browser                               Server                                  Claude / Google
───────                               ──────                                  ───────────────
speech → text  ──POST /message──▶  agent.js builds the conversation ──▶  Claude (structured JSON:
                                   and keeps one draft per session          say / action / draft)
text → speech  ◀── say + draft ──  state: collecting | review | sent
"send it"      ──POST /message──▶  gate: previous turn was a review ──▶  Gmail API users.messages.send
```

- `server/agent.js` holds the system prompt, the structured output schema and the send gate.
- `server/google.js` handles OAuth and builds the raw RFC 2822 message for Gmail.
- `public/app.js` does speech recognition, text-to-speech and the hands-free loop.

## Deploying

Any Node host works (Railway, Render, Fly, a VPS). Set the environment variables, change `GOOGLE_REDIRECT_URI` to your public URL, add that URL to the OAuth client, and set `APP_PASSWORD`. The `data/` folder must persist between restarts, or you will need to reconnect accounts.

## Tests

```bash
npm test
```
