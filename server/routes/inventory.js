// ── INVENTORY API ─────────────────────────────────────────────────────────────
// Simple stock tracking for garage door technicians.
// Items live in data/inventory.json, photos in uploads/inventory/.
//
//   GET    /api/inventory              → list all items
//   POST   /api/inventory              → create item
//   PUT    /api/inventory/:id          → edit item fields
//   PATCH  /api/inventory/:id/stock    → adjust stock { delta } or set { qty }
//   POST   /api/inventory/:id/photo    → upload photo { photo: dataURL }
//   DELETE /api/inventory/:id/photo    → remove photo
//   DELETE /api/inventory/:id          → delete item (and its photo)

const express = require('express');
const router  = express.Router();
const fs      = require('fs');
const path    = require('path');
const crypto  = require('crypto');

const DATA_FILE   = path.join(__dirname, '../../data/inventory.json');
const UPLOAD_DIR  = path.join(__dirname, '../../uploads/inventory');
const UPLOAD_URL  = '/uploads/inventory';
const MAX_PHOTO   = 4 * 1024 * 1024; // 4 MB decoded
const MAX_HISTORY = 30;

const CATEGORIES = [
  'Springs', 'Cables', 'Rollers', 'Hinges', 'Tracks', 'Openers',
  'Remotes & Keypads', 'Bearings & Drums', 'Weather Seals', 'Hardware', 'Other',
];

// ── Storage helpers ──────────────────────────────────────────────────────────
function readItems() {
  try {
    const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    return Array.isArray(raw) ? raw : (raw.items || []);
  } catch { return []; }
}

function saveItems(items) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(items, null, 2));
  fs.renameSync(tmp, DATA_FILE); // atomic swap so a crash never leaves a half-written file
}

function findItem(items, id) {
  return items.find(i => i.id === id);
}

// ── Validation ───────────────────────────────────────────────────────────────
function str(v, max = 120) {
  if (v === undefined || v === null) return '';
  return String(v).replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max);
}

function int(v, fallback = 0) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

function clampQty(n) {
  return Math.max(0, Math.min(999999, n));
}

function cleanFields(body = {}, existing = {}) {
  const name = str(body.name !== undefined ? body.name : existing.name, 80);
  const category = str(body.category !== undefined ? body.category : existing.category, 40) || 'Other';
  return {
    name,
    category,
    sku:      str(body.sku      !== undefined ? body.sku      : existing.sku, 40),
    location: str(body.location !== undefined ? body.location : existing.location, 60),
    notes:    str(body.notes    !== undefined ? body.notes    : existing.notes, 500),
    minQty:   clampQty(int(body.minQty !== undefined ? body.minQty : existing.minQty, 2)),
  };
}

function pushHistory(item, delta, qtyAfter, note) {
  item.history = item.history || [];
  item.history.unshift({
    ts: new Date().toISOString(),
    delta,
    qty: qtyAfter,
    note: str(note, 120),
  });
  if (item.history.length > MAX_HISTORY) item.history.length = MAX_HISTORY;
}

// ── Photo helpers ────────────────────────────────────────────────────────────
function decodeDataUrl(dataUrl) {
  if (typeof dataUrl !== 'string') return null;
  const m = dataUrl.match(/^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=\s]+)$/);
  if (!m) return null;
  const ext = m[1] === 'jpg' ? 'jpeg' : m[1];
  const buf = Buffer.from(m[2].replace(/\s/g, ''), 'base64');
  if (!buf.length || buf.length > MAX_PHOTO) return null;
  return { ext: ext === 'jpeg' ? 'jpg' : ext, buf };
}

function removePhotoFile(photoUrl) {
  if (!photoUrl || !photoUrl.startsWith(UPLOAD_URL + '/')) return;
  const file = path.join(UPLOAD_DIR, path.basename(photoUrl));
  fs.unlink(file, () => {});
}

// ── Routes ───────────────────────────────────────────────────────────────────
router.get('/categories', (_req, res) => {
  res.json({ categories: CATEGORIES });
});

router.get('/', (_req, res) => {
  const items = readItems();
  const lowStock = items.filter(i => i.qty <= i.minQty).length;
  res.json({ items, count: items.length, lowStock, categories: CATEGORIES });
});

router.post('/', (req, res) => {
  const fields = cleanFields(req.body);
  if (!fields.name) return res.status(400).json({ error: 'Item name is required' });

  const items = readItems();
  const now = new Date().toISOString();
  const item = {
    id: crypto.randomBytes(8).toString('hex'),
    ...fields,
    qty: clampQty(int(req.body.qty, 0)),
    photo: null,
    history: [],
    createdAt: now,
    updatedAt: now,
  };
  pushHistory(item, item.qty, item.qty, 'Added to inventory');

  // Photo can be sent along with the new item in one request
  const photo = decodeDataUrl(req.body.photo);
  if (photo) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    const filename = `${item.id}-${Date.now()}.${photo.ext}`;
    fs.writeFileSync(path.join(UPLOAD_DIR, filename), photo.buf);
    item.photo = `${UPLOAD_URL}/${filename}`;
  }

  items.unshift(item);
  saveItems(items);
  res.status(201).json({ item });
});

router.put('/:id', (req, res) => {
  const items = readItems();
  const item = findItem(items, req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });

  const fields = cleanFields(req.body, item);
  if (!fields.name) return res.status(400).json({ error: 'Item name is required' });
  Object.assign(item, fields);

  // Allow setting qty directly from the edit form
  if (req.body.qty !== undefined) {
    const newQty = clampQty(int(req.body.qty, item.qty));
    if (newQty !== item.qty) {
      pushHistory(item, newQty - item.qty, newQty, 'Count corrected');
      item.qty = newQty;
    }
  }

  item.updatedAt = new Date().toISOString();
  saveItems(items);
  res.json({ item });
});

router.patch('/:id/stock', (req, res) => {
  const items = readItems();
  const item = findItem(items, req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });

  let newQty;
  if (req.body.qty !== undefined) {
    newQty = clampQty(int(req.body.qty, item.qty));
  } else {
    const delta = int(req.body.delta, 0);
    if (!delta) return res.status(400).json({ error: 'delta or qty required' });
    newQty = clampQty(item.qty + delta);
  }

  const delta = newQty - item.qty;
  if (delta !== 0) {
    pushHistory(item, delta, newQty, req.body.note || (delta > 0 ? 'Stocked' : 'Used'));
    item.qty = newQty;
    item.updatedAt = new Date().toISOString();
    saveItems(items);
  }
  res.json({ item });
});

router.post('/:id/photo', (req, res) => {
  const items = readItems();
  const item = findItem(items, req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });

  const photo = decodeDataUrl(req.body.photo);
  if (!photo) return res.status(400).json({ error: 'Photo must be a JPEG, PNG or WebP under 4 MB' });

  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const filename = `${item.id}-${Date.now()}.${photo.ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), photo.buf);

  removePhotoFile(item.photo);
  item.photo = `${UPLOAD_URL}/${filename}`;
  item.updatedAt = new Date().toISOString();
  saveItems(items);
  res.json({ item });
});

router.delete('/:id/photo', (req, res) => {
  const items = readItems();
  const item = findItem(items, req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });

  removePhotoFile(item.photo);
  item.photo = null;
  item.updatedAt = new Date().toISOString();
  saveItems(items);
  res.json({ item });
});

router.delete('/:id', (req, res) => {
  const items = readItems();
  const idx = items.findIndex(i => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Item not found' });

  const [removed] = items.splice(idx, 1);
  removePhotoFile(removed.photo);
  saveItems(items);
  res.json({ ok: true, id: removed.id });
});

module.exports = router;
