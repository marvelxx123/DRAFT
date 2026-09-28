import express from 'express';
import db from './db.js';

const app = express();
app.use(express.json()); // lets us read a JSON body sent with POST

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/tasks', (req, res) => {
  const tasks = db.prepare('SELECT * FROM tasks').all();
  res.json(tasks);
});

app.post('/api/tasks', (req, res) => {
  const { title } = req.body;
  const info = db.prepare('INSERT INTO tasks (title) VALUES (?)').run(title);
  res.status(201).json({ id: info.lastInsertRowid, title });
});

app.get('/api/tasks/:id', (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  res.json(task);
});

// PATCH = "change just the fields I send." Anything you don't send stays
// as it was — different from PUT, which means "replace the whole thing."
app.patch('/api/tasks/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const title = req.body.title ?? existing.title;
  const done = req.body.done ?? existing.done;
  db.prepare('UPDATE tasks SET title = ?, done = ? WHERE id = ?').run(title, done ? 1 : 0, req.params.id);

  res.json({ id: Number(req.params.id), title, done: done ? 1 : 0 });
});

app.delete('/api/tasks/:id', (req, res) => {
  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  res.status(204).send(); // 204 = "worked, nothing to send back"
});

app.listen(4000, () => {
  console.log('listening on port 4000');
});
