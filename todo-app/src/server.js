import express from 'express';

const app = express();

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// No database yet — just proving the URL -> function -> response idea
// with a fake, hardcoded list.
app.get('/api/tasks', (req, res) => {
  res.json([
    { id: 1, title: 'Learn what an API is' },
    { id: 2, title: 'Build the real database next' },
  ]);
});

app.listen(4000, () => {
  console.log('listening on port 4000');
});
