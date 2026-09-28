import Database from 'better-sqlite3';
import fs from 'node:fs';

fs.mkdirSync('./data', { recursive: true });
const db = new Database('./data/todo.sqlite');

// Runs once at startup. IF NOT EXISTS means it's safe to run every time.
db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    done  INTEGER NOT NULL DEFAULT 0
  )
`);

export default db;
