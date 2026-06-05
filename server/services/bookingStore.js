'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '../../data');
const CONFIG_FILE  = path.join(DATA_DIR, 'booking-config.json');
const BOOKINGS_FILE = path.join(DATA_DIR, 'bookings.json');
const CUSTOMERS_FILE = path.join(DATA_DIR, 'customers.json');

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJSON(file, def) {
  try {
    if (!fs.existsSync(file)) return def;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch { return def; }
}

function writeJSON(file, data) {
  ensureDir();
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, file);
}

function genId(prefix = 'id') {
  return `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
}
function genToken() {
  return crypto.randomBytes(20).toString('hex');
}

// ── Default seed config ──────────────────────────────────────
const DEFAULT_CONFIG = {
  business: {
    name: 'My Business',
    tagline: 'Professional Services',
    phone: '(555) 000-0000',
    email: 'hello@mybusiness.com',
    address: '123 Main St, City, ST 12345',
    timezone: 'America/New_York',
    currency: 'usd',
    logo: '',
    primaryColor: '#4F46E5',
    bookingPage: {
      title: 'Book an Appointment',
      description: 'Select a service and time that works for you.',
    },
    cancellationPolicy: {
      notice: 24,
      allowCustomerCancel: true,
      allowCustomerReschedule: true,
    },
    bookingWindow: { minAdvanceHours: 2, maxAdvanceDays: 60 },
    bufferMinutes: 15,
    reminderHours: 24,
  },
  hours: {
    '0': { open: false },
    '1': { open: true, start: '09:00', end: '17:00' },
    '2': { open: true, start: '09:00', end: '17:00' },
    '3': { open: true, start: '09:00', end: '17:00' },
    '4': { open: true, start: '09:00', end: '17:00' },
    '5': { open: true, start: '09:00', end: '17:00' },
    '6': { open: false },
  },
  services: [
    {
      id: 'svc_1', name: 'Initial Consultation',
      description: 'A comprehensive introductory session to understand your needs and goals.',
      duration: 60, price: 150, depositRequired: 0,
      color: '#4F46E5', category: 'Consultations',
      intakeQuestions: [
        { id: 'q1', label: 'What brings you in today?', type: 'textarea', required: false },
      ],
      staffIds: ['*'], active: true,
    },
    {
      id: 'svc_2', name: 'Follow-Up Session',
      description: 'A focused 30-minute follow-up to review progress and next steps.',
      duration: 30, price: 75, depositRequired: 0,
      color: '#0EA5E9', category: 'Follow-Ups',
      intakeQuestions: [],
      staffIds: ['*'], active: true,
    },
    {
      id: 'svc_3', name: 'Deep Dive Workshop',
      description: 'A comprehensive 2-hour workshop session.',
      duration: 120, price: 299, depositRequired: 100,
      color: '#10B981', category: 'Workshops',
      intakeQuestions: [
        { id: 'q1', label: 'What specific outcomes are you hoping to achieve?', type: 'textarea', required: true },
        { id: 'q2', label: 'Experience level?', type: 'select', options: ['Beginner', 'Intermediate', 'Advanced'], required: false },
      ],
      staffIds: ['*'], active: true,
    },
  ],
  staff: [
    {
      id: 'staff_1', name: 'Alex Johnson', title: 'Senior Specialist',
      bio: 'Over 8 years of experience delivering exceptional results.',
      color: '#8B5CF6', hours: null, active: true,
    },
    {
      id: 'staff_2', name: 'Maria Santos', title: 'Certified Consultant',
      bio: 'Specializing in tailored solutions for every client.',
      color: '#F59E0B', hours: null, active: true,
    },
  ],
  blockedTimes: [],
  waitlist: [],
};

// ── Config ───────────────────────────────────────────────────
function getConfig() {
  const c = readJSON(CONFIG_FILE, null);
  if (!c) { writeJSON(CONFIG_FILE, DEFAULT_CONFIG); return DEFAULT_CONFIG; }
  return c;
}
function saveConfig(config) { writeJSON(CONFIG_FILE, config); return config; }

// ── Bookings ─────────────────────────────────────────────────
function _bd() { return readJSON(BOOKINGS_FILE, { bookings: [] }); }
function _sbd(d) { writeJSON(BOOKINGS_FILE, d); }

function getAllBookings() { return _bd().bookings; }

function getBookingById(id) { return _bd().bookings.find(b => b.id === id) || null; }

function createBooking(data) {
  const db = _bd();
  const now = new Date().toISOString();
  const b = {
    id: genId('bk'),
    ...data,
    cancelToken: genToken(),
    rescheduleToken: genToken(),
    createdAt: now,
    updatedAt: now,
    cancelledAt: null,
    completedAt: null,
    noShow: false,
  };
  db.bookings.push(b);
  _sbd(db);
  return b;
}

function updateBooking(id, updates) {
  const db = _bd();
  const i = db.bookings.findIndex(b => b.id === id);
  if (i === -1) return null;
  db.bookings[i] = { ...db.bookings[i], ...updates, updatedAt: new Date().toISOString() };
  _sbd(db);
  return db.bookings[i];
}

function deleteBooking(id) {
  const db = _bd();
  const i = db.bookings.findIndex(b => b.id === id);
  if (i === -1) return false;
  db.bookings.splice(i, 1);
  _sbd(db);
  return true;
}

// ── Customers ────────────────────────────────────────────────
function _cd() { return readJSON(CUSTOMERS_FILE, { customers: [] }); }
function _scd(d) { writeJSON(CUSTOMERS_FILE, d); }

function getAllCustomers() { return _cd().customers; }

function findOrCreateCustomer(info) {
  const db = _cd();
  const email = (info.email || '').toLowerCase().trim();
  let c = db.customers.find(x => x.email === email);
  if (!c) {
    c = {
      id: genId('cust'), name: info.name, email,
      phone: info.phone || '', notes: '', tags: [],
      totalBookings: 0, totalSpend: 0,
      createdAt: new Date().toISOString(),
    };
    db.customers.push(c);
  } else {
    if (info.name) c.name = info.name;
    if (info.phone) c.phone = info.phone;
  }
  _scd(db);
  return c;
}

function updateCustomer(id, updates) {
  const db = _cd();
  const i = db.customers.findIndex(c => c.id === id);
  if (i === -1) return null;
  db.customers[i] = { ...db.customers[i], ...updates };
  _scd(db);
  return db.customers[i];
}

function incrementCustomerStats(customerId, amount) {
  const db = _cd();
  const i = db.customers.findIndex(c => c.id === customerId);
  if (i === -1) return;
  db.customers[i].totalBookings = (db.customers[i].totalBookings || 0) + 1;
  db.customers[i].totalSpend = (db.customers[i].totalSpend || 0) + (amount || 0);
  _scd(db);
}

// ── Availability ─────────────────────────────────────────────
function parseTime(str) {
  const [h, m] = str.split(':').map(Number);
  return h * 60 + m;
}
function pad2(n) { return n.toString().padStart(2, '0'); }
function minsTo24(mins) { return `${pad2(Math.floor(mins / 60))}:${pad2(mins % 60)}`; }
function minsTo12(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${pad2(m)} ${ampm}`;
}

function getAvailableSlots(dateStr, serviceId, staffId) {
  const config = getConfig();
  const service = config.services.find(s => s.id === serviceId && s.active);
  if (!service) return [];

  const date = new Date(dateStr + 'T12:00:00');
  const dow = date.getDay().toString();

  // Which staff can perform this service
  let staffPool = config.staff.filter(s => s.active);
  if (service.staffIds && service.staffIds[0] !== '*') {
    staffPool = staffPool.filter(s => service.staffIds.includes(s.id));
  }
  if (staffId && staffId !== 'any') {
    staffPool = staffPool.filter(s => s.id === staffId);
  }
  if (staffPool.length === 0) staffPool = config.staff.filter(s => s.active);

  // Business hours
  const bizHours = config.hours[dow];
  if (!bizHours || !bizHours.open) return [];

  const bizStart = parseTime(bizHours.start);
  const bizEnd   = parseTime(bizHours.end);
  const svcDuration = service.duration;
  const buffer   = config.business.bufferMinutes || 0;
  const slotStep = 30; // generate slots every 30 mins

  // Min advance check
  const minAdvanceMins = (config.business.bookingWindow.minAdvanceHours || 2) * 60;
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
  const isToday = dateStr === todayStr;
  const nowMins = isToday ? now.getHours() * 60 + now.getMinutes() : 0;

  // Existing bookings for this date
  const dayBookings = getAllBookings().filter(b =>
    b.start.startsWith(dateStr) && ['confirmed', 'pending_payment'].includes(b.status)
  );

  // Blocked times for this date
  const dayBlocks = (config.blockedTimes || []).filter(bt => bt.start.startsWith(dateStr));

  const slotMap = new Map(); // time24 -> [staffIds]

  for (const staff of staffPool) {
    // Staff-specific hours override
    let sStart = bizStart, sEnd = bizEnd;
    if (staff.hours && staff.hours[dow] !== undefined) {
      if (!staff.hours[dow].open) continue;
      sStart = parseTime(staff.hours[dow].start);
      sEnd   = parseTime(staff.hours[dow].end);
    }

    const staffBookings = dayBookings.filter(b => b.staffId === staff.id || b.staffId === 'any');
    const staffBlocks   = dayBlocks.filter(bt => bt.staffId === staff.id || bt.staffId === '*');

    for (let slot = sStart; slot + svcDuration <= sEnd; slot += slotStep) {
      if (isToday && slot < nowMins + minAdvanceMins) continue;

      const slotEnd = slot + svcDuration;

      // Occupied by booking (include buffer on both ends)
      const booked = staffBookings.some(b => {
        const bStart = parseTime(b.start.substring(11, 16));
        const bEnd   = bStart + b.duration + buffer;
        return !(slotEnd + buffer <= bStart || slot >= bEnd);
      });
      if (booked) continue;

      // Blocked time
      const blocked = staffBlocks.some(bt => {
        const btS = parseTime(bt.start.substring(11, 16));
        const btE = parseTime(bt.end.substring(11, 16));
        return !(slotEnd <= btS || slot >= btE);
      });
      if (blocked) continue;

      const t24 = minsTo24(slot);
      if (!slotMap.has(t24)) slotMap.set(t24, []);
      slotMap.get(t24).push(staff.id);
    }
  }

  return [...slotMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([t24, staffIds]) => ({
      time24: t24,
      time12: minsTo12(parseTime(t24)),
      availableStaff: staffIds,
    }));
}

module.exports = {
  getConfig, saveConfig,
  getAllBookings, getBookingById, createBooking, updateBooking, deleteBooking,
  getAllCustomers, findOrCreateCustomer, updateCustomer, incrementCustomerStats,
  getAvailableSlots,
  genId, genToken,
};
