const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'data', 'db.json');

app.use(express.json());
app.use(express.static('public'));

// ── Simple JSON file database (no SQL needed, works on Render free tier) ──
function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    const init = { todos: [], reminders: [], progress: {} };
    fs.writeFileSync(DB_FILE, JSON.stringify(init, null, 2));
    return init;
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}
function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// ── TODOS API ──────────────────────────────────────────
app.get('/api/todos', (req, res) => res.json(readDB().todos));
app.post('/api/todos', (req, res) => {
  const db = readDB();
  const todo = { id: Date.now(), text: req.body.text, done: false,
    priority: req.body.priority || 'medium',
    due: req.body.due || null, created: new Date().toISOString() };
  db.todos.push(todo);
  writeDB(db); res.json(todo);
});
app.put('/api/todos/:id', (req, res) => {
  const db = readDB();
  const i = db.todos.findIndex(t => t.id == req.params.id);
  if (i === -1) return res.status(404).json({ error: 'Not found' });
  db.todos[i] = { ...db.todos[i], ...req.body };
  writeDB(db); res.json(db.todos[i]);
});
app.delete('/api/todos/:id', (req, res) => {
  const db = readDB();
  db.todos = db.todos.filter(t => t.id != req.params.id);
  writeDB(db); res.json({ ok: true });
});

// ── REMINDERS API ──────────────────────────────────────
app.get('/api/reminders', (req, res) => res.json(readDB().reminders));
app.post('/api/reminders', (req, res) => {
  const db = readDB();
  const r = { id: Date.now(), title: req.body.title, time: req.body.time,
    days: req.body.days || [], active: true, created: new Date().toISOString() };
  db.reminders.push(r);
  writeDB(db); res.json(r);
});
app.put('/api/reminders/:id', (req, res) => {
  const db = readDB();
  const i = db.reminders.findIndex(r => r.id == req.params.id);
  if (i === -1) return res.status(404).json({ error: 'Not found' });
  db.reminders[i] = { ...db.reminders[i], ...req.body };
  writeDB(db); res.json(db.reminders[i]);
});
app.delete('/api/reminders/:id', (req, res) => {
  const db = readDB();
  db.reminders = db.reminders.filter(r => r.id != req.params.id);
  writeDB(db); res.json({ ok: true });
});

// ── PROGRESS API (lecture watched status) ─────────────
app.get('/api/progress', (req, res) => res.json(readDB().progress));
app.post('/api/progress', (req, res) => {
  const db = readDB();
  db.progress[req.body.id] = { watched: req.body.watched, date: new Date().toISOString() };
  writeDB(db); res.json({ ok: true });
});
// Bulk sync (for offline→online sync)
app.post('/api/progress/sync', (req, res) => {
  const db = readDB();
  Object.assign(db.progress, req.body);
  writeDB(db); res.json({ ok: true, total: Object.keys(db.progress).length });
});

app.listen(PORT, () => console.log(`JEE Planner running on port ${PORT}`));
