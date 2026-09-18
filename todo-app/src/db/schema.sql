-- ── Database schema ─────────────────────────────────────────────────────────
-- LESSON: This file is the single source of truth for the shape of our data.
-- Notice we NEVER build SQL by concatenating strings with user input anywhere
-- in this project (see repositories/*.js) — we always use "?" placeholders
-- and pass values separately. That's the entire defense against SQL
-- injection: the database driver treats placeholder values as pure data,
-- never as code, no matter what characters they contain.

PRAGMA foreign_keys = ON; -- SQLite defaults this OFF; without it, ON DELETE
                          -- CASCADE below would silently do nothing.

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL, -- NEVER store plaintext passwords. See authService.js.
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- One row per task. `parent_task_id` self-references this same table, which
-- is how we model subtasks (a task whose parent is another task) without a
-- separate table — a classic "adjacency list" tree structure.
CREATE TABLE IF NOT EXISTS tasks (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  description    TEXT,
  status         TEXT NOT NULL DEFAULT 'todo'
                   CHECK (status IN ('todo', 'in_progress', 'done')),
  priority       TEXT NOT NULL DEFAULT 'medium'
                   CHECK (priority IN ('low', 'medium', 'high')),
  due_date       TEXT, -- ISO 8601 date string, e.g. "2026-09-30". TEXT because
                        -- SQLite has no native DATE type — it stores whatever
                        -- affinity you tell it to and trusts the app layer.
  position       INTEGER NOT NULL DEFAULT 0, -- manual drag-and-drop ordering
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- A user's personal tag vocabulary. UNIQUE(user_id, name) means two
-- different users can both have a tag called "work", but the same user can't
-- create "work" twice.
CREATE TABLE IF NOT EXISTS tags (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name    TEXT NOT NULL,
  UNIQUE (user_id, name)
);

-- LESSON: this is a "join table" (a.k.a. junction/bridge table). A task can
-- have many tags, and a tag can be attached to many tasks — that's a
-- many-to-many relationship, and a relational database can only express it
-- via a third table like this one that holds pairs of foreign keys. The
-- composite PRIMARY KEY (task_id, tag_id) also enforces "no duplicate
-- attachments" for free — the database itself rejects attaching the same
-- tag to the same task twice.
CREATE TABLE IF NOT EXISTS task_tags (
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  tag_id  INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, tag_id)
);

-- Short-term memory for the AI agent (see src/agent/). Every message in a
-- conversation — from the user, from the model, or a tool result — gets a
-- row here so a later request can rebuild the conversation and the agent has
-- context, the same way it would if the whole thing were one long chat.
CREATE TABLE IF NOT EXISTS agent_messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  -- We store the raw Anthropic "content block" JSON (text and/or tool_use /
  -- tool_result blocks), not just plain text, so we can replay an exact
  -- conversation back to the API on the next turn.
  content    TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- LESSON: indexes trade write-speed and disk space for read-speed. Every
-- query we'll actually run filters tasks by user_id (almost always combined
-- with status), so we index exactly that combination. Without this index,
-- SQLite would do a full table scan on every "list my tasks" request — fine
-- at 50 rows, painfully slow at 500,000.
CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON tasks (user_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks (parent_task_id);
CREATE INDEX IF NOT EXISTS idx_agent_messages_user ON agent_messages (user_id, created_at);
