// Connected Gmail accounts. One entry per address, holding the OAuth refresh token.
import { readStore, writeStore } from "./store.js";

const STORE = "accounts";

export function listAccounts() {
  const all = readStore(STORE, {});
  return Object.values(all).map((a) => ({ email: a.email, connectedAt: a.connectedAt }));
}

export function getAccount(email) {
  const all = readStore(STORE, {});
  return all[email.toLowerCase()] || null;
}

export function saveAccount({ email, refreshToken }) {
  const all = readStore(STORE, {});
  const key = email.toLowerCase();
  all[key] = {
    email: key,
    refreshToken,
    connectedAt: all[key]?.connectedAt || new Date().toISOString(),
  };
  writeStore(STORE, all);
}

export function removeAccount(email) {
  const all = readStore(STORE, {});
  delete all[email.toLowerCase()];
  writeStore(STORE, all);
}
