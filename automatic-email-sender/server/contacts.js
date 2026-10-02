// Address book so you can say "send it to David" instead of spelling an address.
import { readStore, writeStore } from "./store.js";

const STORE = "contacts";

export function listContacts() {
  return readStore(STORE, []);
}

export function addContact({ name, email }) {
  const contacts = listContacts().filter((c) => c.email.toLowerCase() !== email.toLowerCase());
  contacts.push({ name: name.trim(), email: email.trim().toLowerCase() });
  contacts.sort((a, b) => a.name.localeCompare(b.name));
  writeStore(STORE, contacts);
  return contacts;
}

export function removeContact(email) {
  const contacts = listContacts().filter((c) => c.email.toLowerCase() !== email.toLowerCase());
  writeStore(STORE, contacts);
  return contacts;
}
