// Google OAuth (connect a Gmail account) and Gmail sending.
import { google } from "googleapis";
import { getAccount, saveAccount } from "./accounts.js";

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/userinfo.email",
];

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set. Copy .env.example to .env and fill it in.`);
  return v;
}

export function oauthClient() {
  return new google.auth.OAuth2(
    requireEnv("GOOGLE_CLIENT_ID"),
    requireEnv("GOOGLE_CLIENT_SECRET"),
    requireEnv("GOOGLE_REDIRECT_URI"),
  );
}

export function authUrl(state) {
  return oauthClient().generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // always return a refresh token, even for re-connects
    scope: SCOPES,
    state,
  });
}

// Exchange the OAuth code, discover which Gmail address it belongs to, store the refresh token.
export async function completeAuth(code) {
  const client = oauthClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) {
    throw new Error("Google did not return a refresh token. Remove the app at https://myaccount.google.com/permissions and connect again.");
  }
  client.setCredentials(tokens);
  const oauth2 = google.oauth2({ version: "v2", auth: client });
  const { data } = await oauth2.userinfo.get();
  if (!data.email) throw new Error("Could not read the email address of the connected account.");
  saveAccount({ email: data.email, refreshToken: tokens.refresh_token });
  return data.email;
}

function encodeHeader(value) {
  // RFC 2047 encode non-ASCII header values (subjects with accents, Hebrew, emoji, ...)
  return /^[\x20-\x7e]*$/.test(value) ? value : `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

export function buildRawMessage({ from, to, subject, body }) {
  const lines = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${encodeHeader(subject)}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(body, "utf8").toString("base64"),
  ];
  return Buffer.from(lines.join("\r\n")).toString("base64url");
}

export async function sendGmail({ from, to, subject, body }) {
  const account = getAccount(from);
  if (!account) throw new Error(`Gmail account ${from} is not connected.`);
  const client = oauthClient();
  client.setCredentials({ refresh_token: account.refreshToken });
  const gmail = google.gmail({ version: "v1", auth: client });
  const res = await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw: buildRawMessage({ from, to, subject, body }) },
  });
  return { id: res.data.id, threadId: res.data.threadId };
}
