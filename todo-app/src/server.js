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

app.listen(4000, () => {
  console.log('listening on port 4000');
});
