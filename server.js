const express = require('express');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 3000;
const APP_URL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
const DB_FILE = path.join(__dirname, 'data', 'db.json');

// Create data folder if missing
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
}

app.use(express.json());
app.use(express.static('public'));

// ── DATABASE ───────────────────────────────────────────────────────────────
function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    const init = { todos: [], reminders: [], progress: {} };
    fs.writeFileSync(DB_FILE, JSON.stringify(init, null, 2));
    return init;
  }
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch(e) {
    return { todos: [], reminders: [], progress: {} };
  }
}
function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// ── PING endpoint (keeps server awake) ────────────────────────────────────
app.get('/ping', (req, res) => {
  res.json({ status: 'alive', time: new Date().toISOString(), uptime: process.uptime() });
});

// ── Health check ──────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ ok: true }));

// ── TODOS API ──────────────────────────────────────────────────────────────
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

// ── REMINDERS API ──────────────────────────────────────────────────────────
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

// ── PROGRESS API ───────────────────────────────────────────────────────────
app.get('/api/progress', (req, res) => res.json(readDB().progress));
app.post('/api/progress', (req, res) => {
  const db = readDB();
  db.progress[req.body.id] = { watched: req.body.watched, date: new Date().toISOString() };
  writeDB(db); res.json({ ok: true });
});
app.post('/api/progress/sync', (req, res) => {
  const db = readDB();
  Object.assign(db.progress, req.body);
  writeDB(db); res.json({ ok: true, total: Object.keys(db.progress).length });
});

// ── SELF-PING to prevent Render free tier sleep ────────────────────────────
function selfPing() {
  const url = APP_URL + '/ping';
  const lib = url.startsWith('https') ? https : http;
  lib.get(url, (res) => {
    console.log(`[KeepAlive] Pinged at ${new Date().toLocaleTimeString()} — status: ${res.statusCode}`);
  }).on('error', (err) => {
    console.log(`[KeepAlive] Ping failed: ${err.message}`);
  });
}

// Ping every 10 minutes (Render spins down after 15 min inactivity)
const PING_INTERVAL = 10 * 60 * 1000; // 10 minutes
setTimeout(() => {
  selfPing(); // first ping after 30s
  setInterval(selfPing, PING_INTERVAL);
}, 30000);

// ── START ──────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ JEE Planner running on port ${PORT}`);
  console.log(`🔗 URL: ${APP_URL}`);
  console.log(`⏰ Self-ping every 10 min to stay awake`);
});
