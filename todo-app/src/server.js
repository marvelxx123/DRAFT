import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from './db.js';

const SECRET = 'dev-only-secret-well-fix-this-properly-later';

const app = express();
app.use(express.json()); // lets us read a JSON body sent with POST

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/register', async (req, res) => {
  const { email, password } = req.body;
  const passwordHash = await bcrypt.hash(password, 10); // "blend" the password
  const info = db.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)').run(email, passwordHash);
  res.status(201).json({ id: info.lastInsertRowid, email });
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // Blend the password they just typed and compare it to the stored smoothie.
  // bcrypt.compare does this correctly and safely - we never "un-blend" anything.
  const passwordMatches = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatches) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = jwt.sign({ userId: user.id }, SECRET);
  res.json({ token });
});

// The checkpoint: runs BEFORE any route it's attached to. Checks the
// wristband is real, then attaches whose it is (req.userId) so every route
// below can use it.
function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''; // "Bearer <token>"
  const token = header.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No wristband — log in first' });
  }

  try {
    const payload = jwt.verify(token, SECRET); // throws if forged/invalid
    req.userId = payload.userId;
    next(); // let the request continue to the actual route
  } catch {
    return res.status(401).json({ error: 'Invalid wristband' });
  }
}

app.get('/api/tasks', requireAuth, (req, res) => {
  const tasks = db.prepare('SELECT * FROM tasks WHERE user_id = ?').all(req.userId);
  res.json(tasks);
});

app.post('/api/tasks', requireAuth, (req, res) => {
  const { title } = req.body;
  const info = db.prepare('INSERT INTO tasks (user_id, title) VALUES (?, ?)').run(req.userId, title);
  res.status(201).json({ id: info.lastInsertRowid, title });
});

app.get('/api/tasks/:id', requireAuth, (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  res.json(task);
});

// PATCH = "change just the fields I send." Anything you don't send stays
// as it was — different from PUT, which means "replace the whole thing."
app.patch('/api/tasks/:id', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!existing) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const title = req.body.title ?? existing.title;
  const done = req.body.done ?? existing.done;
  db.prepare('UPDATE tasks SET title = ?, done = ? WHERE id = ?').run(title, done ? 1 : 0, req.params.id);

  res.json({ id: Number(req.params.id), title, done: done ? 1 : 0 });
});

app.delete('/api/tasks/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  res.status(204).send(); // 204 = "worked, nothing to send back"
});

app.listen(4000, () => {
  console.log('listening on port 4000');
});
