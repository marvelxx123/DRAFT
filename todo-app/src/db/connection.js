// ── Database connection ─────────────────────────────────────────────────────
// LESSON: `better-sqlite3` is deliberately SYNCHRONOUS (no promises, no
// callbacks — `db.prepare(...).get()` just returns the row). That sounds
// backwards for a server ("isn't blocking the event loop bad?"), but SQLite
// lives in a single file on local disk with no network round-trip, so each
// query takes microseconds. The synchronous API removes a whole category of
// async bugs (forgetting an `await`, unhandled promise rejections) while
// teaching you real SQL — you're not fighting an ORM's abstractions on top
// of learning how joins and indexes work. This is also genuinely how plenty
// of production Node services use SQLite, not just a teaching toy.
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// A factory function, not a module-level singleton. LESSON: if we exported
// one shared `db` instance directly, every test would fight over the same
// database file. By making callers explicitly create a connection (real file
// for the app, ":memory:" for tests), each test gets a fresh, isolated
// SQLite database that vanishes when the process exits — no test can leak
// state into another.
export function createConnection(dbPath) {
  if (dbPath !== ':memory:') {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }

  const db = new Database(dbPath);

  // SQLite ships with foreign key ENFORCEMENT turned off by default for
  // backwards-compatibility reasons dating back decades. Without this line,
  // `REFERENCES users(id) ON DELETE CASCADE` in schema.sql would be silently
  // ignored — you could insert a task with a user_id that doesn't exist.
  db.pragma('foreign_keys = ON');

  // WAL (Write-Ahead Logging) mode lets reads and writes happen concurrently
  // instead of writers blocking readers. Doesn't matter much for ":memory:"
  // but is the right default for the real file-backed database.
  if (dbPath !== ':memory:') {
    db.pragma('journal_mode = WAL');
  }

  return db;
}

export function runMigrations(db) {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  // db.exec() runs a whole string of semicolon-separated statements at once —
  // unlike db.prepare(), which only handles a single statement.
  db.exec(schema);
}
