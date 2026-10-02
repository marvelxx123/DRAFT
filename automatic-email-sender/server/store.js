// Tiny JSON file store. Each store is one file under data/.
// Used for connected Gmail accounts (refresh tokens) and the contacts list.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = path.resolve(here, "..", "data");

function fileFor(name) {
  return path.join(DATA_DIR, `${name}.json`);
}

export function readStore(name, fallback) {
  try {
    return JSON.parse(fs.readFileSync(fileFor(name), "utf8"));
  } catch {
    return fallback;
  }
}

export function writeStore(name, value) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = fileFor(name) + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, fileFor(name));
}
