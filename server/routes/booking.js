'use strict';
const express = require('express');
const router  = express.Router();
const store   = require('../services/bookingStore');
const notify  = require('../services/bookingNotifications');
const { requireAdmin: adminAuth } = require('../middleware/adminAuth');

// ─────────────────────────────────────────────
//  PUBLIC
// ─────────────────────────────────────────────

// Stripe publishable key (safe to expose)
router.get('/stripe-pk', (_req, res) => {
  res.json({ publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || null });
});

// Business config for booking widget
router.get('/config', (_req, res) => {
  const c = store.getConfig();
  res.json({
    business: c.business,
    services: c.services.filter(s => s.active),
    staff: c.staff.filter(s => s.active).map(s => ({
      id: s.id, name: s.name, title: s.title, bio: s.bio, color: s.color,
    })),
    hours: c.hours,
  });
});

// Available time slots for a date + service
router.get('/availability', (req, res) => {
  const { date, serviceId, staffId } = req.query;
  if (!date || !serviceId) return res.status(400).json({ error: 'date and serviceId required' });
  const slots = store.getAvailableSlots(date, serviceId, staffId);
  res.json({ slots });
});

// Which dates have availability in a given month
router.get('/available-dates', (req, res) => {
  const { year, month, serviceId, staffId } = req.query;
  if (!year || !month || !serviceId) {
    return res.status(400).json({ error: 'year, month, serviceId required' });
  }
  const config = store.getConfig();
  const y = parseInt(year), m = parseInt(month);
  const days = new Date(y, m, 0).getDate();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const maxDt = new Date();
  maxDt.setDate(maxDt.getDate() + (config.business.bookingWindow?.maxAdvanceDays || 60));

  const available = [];
  for (let d = 1; d <= days; d++) {
    const dt = new Date(y, m - 1, d);
    if (dt < today || dt > maxDt) continue;
    const ds = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if (store.getAvailableSlots(ds, serviceId, staffId).length > 0) available.push(ds);
  }
  res.json({ availableDates: available });
});

// Create booking
router.post('/', async (req, res) => {
  try {
    const { serviceId, staffId, date, time, customer, intakeResponses, notes } = req.body;
    if (!serviceId || !date || !time || !customer?.name || !customer?.email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const config = store.getConfig();
    const service = config.services.find(s => s.id === serviceId && s.active);
    if (!service) return res.status(404).json({ error: 'Service not found' });

    // Re-validate slot is still open
    const slots = store.getAvailableSlots(date, serviceId, staffId);
    if (!slots.some(s => s.time24 === time)) {
      return res.status(409).json({ error: 'That time slot is no longer available. Please choose another.' });
    }

    // Assign staff
    let assignedStaffId = staffId && staffId !== 'any' ? staffId : null;
    if (!assignedStaffId) {
      const slot = slots.find(s => s.time24 === time);
      assignedStaffId = slot?.availableStaff?.[0] || null;
    }
    const assignedStaff = assignedStaffId ? config.staff.find(s => s.id === assignedStaffId) : null;

    const cust = store.findOrCreateCustomer(customer);
    const startIso = `${date}T${time}:00`;
    const endMs    = new Date(startIso).getTime() + service.duration * 60000;
    const endIso   = new Date(endMs).toISOString().replace(/\.\d{3}Z$/, '');

    const requiresPayment = service.price > 0;
    const chargeAmount = service.depositRequired > 0 ? service.depositRequired : service.price;

    const booking = store.createBooking({
      serviceId, serviceName: service.name, serviceColor: service.color,
      staffId: assignedStaffId || 'any', staffName: assignedStaff?.name || 'Any Available',
      start: startIso, end: endIso, duration: service.duration,
      price: service.price, depositRequired: service.depositRequired, amountPaid: 0,
      status: requiresPayment ? 'pending_payment' : 'confirmed',
      customerId: cust.id,
      customer: { name: customer.name, email: customer.email, phone: customer.phone || '' },
      notes: notes || '', intakeResponses: intakeResponses || {},
      paymentIntentId: null, source: 'online',
    });

    let paymentIntent = null;
    if (requiresPayment && process.env.STRIPE_SECRET_KEY) {
      try {
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        const pi = await stripe.paymentIntents.create({
          amount: Math.round(chargeAmount * 100),
          currency: config.business.currency || 'usd',
          metadata: { bookingId: booking.id },
          description: `${service.name} — ${customer.name}`,
        });
        store.updateBooking(booking.id, { paymentIntentId: pi.id });
        paymentIntent = { clientSecret: pi.client_secret, amount: chargeAmount };
      } catch (e) {
        console.error('[booking] Stripe create intent error:', e.message);
        // Treat as free booking (no payment collected) rather than fail
        store.updateBooking(booking.id, { status: 'confirmed' });
      }
    }

    if (!requiresPayment || !paymentIntent) {
      store.incrementCustomerStats(cust.id, 0);
      const finalBooking = store.getBookingById(booking.id);
      notify.sendConfirmation(finalBooking, config).catch(console.error);
      notify.sendSMS(finalBooking, config, 'confirmation').catch(console.error);
      return res.json({ booking: finalBooking, paymentIntent: null });
    }

    res.json({ booking, paymentIntent });
  } catch (e) {
    console.error('[booking] create error:', e);
    res.status(500).json({ error: 'Booking failed. Please try again.' });
  }
});

// Confirm Stripe payment
router.post('/confirm-payment', async (req, res) => {
  try {
    const { bookingId, paymentIntentId } = req.body;
    const booking = store.getBookingById(bookingId);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    if (process.env.STRIPE_SECRET_KEY) {
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
      if (pi.status !== 'succeeded') return res.status(400).json({ error: 'Payment not confirmed' });
    }

    const config = store.getConfig();
    const amountPaid = booking.depositRequired > 0 ? booking.depositRequired : booking.price;
    const updated = store.updateBooking(bookingId, { status: 'confirmed', paymentIntentId, amountPaid });
    store.incrementCustomerStats(booking.customerId, amountPaid);
    notify.sendConfirmation(updated, config).catch(console.error);
    notify.sendSMS(updated, config, 'confirmation').catch(console.error);
    res.json({ booking: updated });
  } catch (e) {
    console.error('[booking] confirm-payment:', e);
    res.status(500).json({ error: 'Payment confirmation failed' });
  }
});

// Customer: view booking via token
router.get('/manage/:id', (req, res) => {
  const { token } = req.query;
  const b = store.getBookingById(req.params.id);
  if (!b) return res.status(404).json({ error: 'Booking not found' });
  if (token !== b.cancelToken && token !== b.rescheduleToken) {
    return res.status(403).json({ error: 'Invalid token' });
  }
  res.json({ booking: b });
});

// Customer: cancel
router.post('/manage/:id/cancel', async (req, res) => {
  try {
    const { token, reason } = req.body;
    const b = store.getBookingById(req.params.id);
    if (!b) return res.status(404).json({ error: 'Booking not found' });
    if (token !== b.cancelToken) return res.status(403).json({ error: 'Invalid token' });
    if (b.status === 'cancelled') return res.status(400).json({ error: 'Already cancelled' });

    const config = store.getConfig();
    if (!config.business.cancellationPolicy?.allowCustomerCancel) {
      return res.status(403).json({ error: 'Online cancellations are disabled. Please contact us.' });
    }
    const noticeH = config.business.cancellationPolicy.notice || 24;
    const hoursUntil = (new Date(b.start) - Date.now()) / 3600000;
    if (hoursUntil < noticeH) {
      return res.status(400).json({ error: `Cancellations require at least ${noticeH} hours notice.` });
    }

    const updated = store.updateBooking(b.id, {
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
      cancelReason: reason || '',
    });
    notify.sendCancellation(updated, config).catch(console.error);
    res.json({ booking: updated });
  } catch (e) { res.status(500).json({ error: 'Cancellation failed' }); }
});

// Customer: get availability for reschedule
router.get('/manage/:id/availability', (req, res) => {
  const { token, date } = req.query;
  const b = store.getBookingById(req.params.id);
  if (!b || (token !== b.cancelToken && token !== b.rescheduleToken)) {
    return res.status(403).json({ error: 'Invalid' });
  }
  if (!date) return res.status(400).json({ error: 'date required' });
  const slots = store.getAvailableSlots(date, b.serviceId, b.staffId);
  res.json({ slots });
});

// Customer: reschedule
router.post('/manage/:id/reschedule', async (req, res) => {
  try {
    const { token, date, time } = req.body;
    const b = store.getBookingById(req.params.id);
    if (!b) return res.status(404).json({ error: 'Booking not found' });
    if (token !== b.rescheduleToken) return res.status(403).json({ error: 'Invalid token' });
    if (b.status === 'cancelled') return res.status(400).json({ error: 'Booking is cancelled' });

    const config = store.getConfig();
    if (!config.business.cancellationPolicy?.allowCustomerReschedule) {
      return res.status(403).json({ error: 'Online rescheduling is disabled. Please contact us.' });
    }

    const slots = store.getAvailableSlots(date, b.serviceId, b.staffId);
    if (!slots.some(s => s.time24 === time)) {
      return res.status(409).json({ error: 'That slot is no longer available.' });
    }

    const startIso = `${date}T${time}:00`;
    const endMs = new Date(startIso).getTime() + b.duration * 60000;
    const endIso = new Date(endMs).toISOString().replace(/\.\d{3}Z$/, '');
    const updated = store.updateBooking(b.id, { start: startIso, end: endIso, status: 'confirmed' });
    notify.sendReschedule(updated, config).catch(console.error);
    res.json({ booking: updated });
  } catch (e) { res.status(500).json({ error: 'Reschedule failed' }); }
});

// Customer: join waitlist
router.post('/waitlist', (req, res) => {
  const config = store.getConfig();
  const entry = { id: store.genId('wl'), ...req.body, createdAt: new Date().toISOString() };
  config.waitlist = config.waitlist || [];
  config.waitlist.push(entry);
  store.saveConfig(config);
  res.json({ entry });
});

// Download .ics calendar file
router.get('/manage/:id/ics', (req, res) => {
  const { token } = req.query;
  const b = store.getBookingById(req.params.id);
  if (!b || (token !== b.cancelToken && token !== b.rescheduleToken)) {
    return res.status(403).send('Invalid');
  }
  const config = store.getConfig();
  res.setHeader('Content-Type', 'text/calendar');
  res.setHeader('Content-Disposition', `attachment; filename="appointment.ics"`);
  res.send(buildICS(b, config));
});

function buildICS(b, config) {
  const icsDate = d => new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z?$/, '') + 'Z';
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0',
    'PRODID:-//Sparq//EN', 'CALSCALE:GREGORIAN', 'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `DTSTART:${icsDate(b.start)}`,
    `DTEND:${icsDate(b.end)}`,
    `SUMMARY:${b.serviceName} with ${b.staffName}`,
    `DESCRIPTION:Booking ID: ${b.id}\\nService: ${b.serviceName}\\nWith: ${b.staffName}\\nDuration: ${b.duration} min`,
    `LOCATION:${config.business.address || ''}`,
    `ORGANIZER;CN="${config.business.name}":mailto:${config.business.email || 'noreply@example.com'}`,
    `ATTENDEE;CN="${b.customer.name}";ROLE=REQ-PARTICIPANT:mailto:${b.customer.email}`,
    `UID:${b.id}@bookingpro`,
    `DTSTAMP:${icsDate(new Date())}`,
    'STATUS:CONFIRMED', 'SEQUENCE:0',
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
}

// ─────────────────────────────────────────────
//  ADMIN (protected)
// ─────────────────────────────────────────────

router.get('/admin/config', adminAuth, (_req, res) => res.json(store.getConfig()));

router.put('/admin/config', adminAuth, (req, res) => {
  const merged = deepMerge(store.getConfig(), req.body);
  res.json(store.saveConfig(merged));
});

function deepMerge(base, override) {
  const out = { ...base };
  for (const k of Object.keys(override)) {
    if (override[k] !== null && typeof override[k] === 'object' && !Array.isArray(override[k])) {
      out[k] = deepMerge(base[k] || {}, override[k]);
    } else {
      out[k] = override[k];
    }
  }
  return out;
}

// Services CRUD
router.post('/admin/services', adminAuth, (req, res) => {
  const config = store.getConfig();
  const svc = { id: store.genId('svc'), active: true, staffIds: ['*'], intakeQuestions: [], ...req.body };
  config.services.push(svc);
  store.saveConfig(config);
  res.json({ service: svc });
});
router.put('/admin/services/:id', adminAuth, (req, res) => {
  const config = store.getConfig();
  const i = config.services.findIndex(s => s.id === req.params.id);
  if (i === -1) return res.status(404).json({ error: 'Not found' });
  config.services[i] = { ...config.services[i], ...req.body };
  store.saveConfig(config);
  res.json({ service: config.services[i] });
});
router.delete('/admin/services/:id', adminAuth, (req, res) => {
  const config = store.getConfig();
  config.services = config.services.filter(s => s.id !== req.params.id);
  store.saveConfig(config);
  res.json({ success: true });
});

// Staff CRUD
router.post('/admin/staff', adminAuth, (req, res) => {
  const config = store.getConfig();
  const member = { id: store.genId('staff'), active: true, hours: null, ...req.body };
  config.staff.push(member);
  store.saveConfig(config);
  res.json({ staff: member });
});
router.put('/admin/staff/:id', adminAuth, (req, res) => {
  const config = store.getConfig();
  const i = config.staff.findIndex(s => s.id === req.params.id);
  if (i === -1) return res.status(404).json({ error: 'Not found' });
  config.staff[i] = { ...config.staff[i], ...req.body };
  store.saveConfig(config);
  res.json({ staff: config.staff[i] });
});
router.delete('/admin/staff/:id', adminAuth, (req, res) => {
  const config = store.getConfig();
  config.staff = config.staff.filter(s => s.id !== req.params.id);
  store.saveConfig(config);
  res.json({ success: true });
});

// Bookings list + search
router.get('/admin/bookings', adminAuth, (req, res) => {
  let all = store.getAllBookings();
  const { status, from, to, search, staffId } = req.query;
  if (status && status !== 'all') all = all.filter(b => b.status === status);
  if (from)    all = all.filter(b => b.start >= from);
  if (to)      all = all.filter(b => b.start <= to + 'T23:59:59');
  if (staffId) all = all.filter(b => b.staffId === staffId);
  if (search) {
    const q = search.toLowerCase();
    all = all.filter(b =>
      b.customer.name.toLowerCase().includes(q) ||
      b.customer.email.toLowerCase().includes(q) ||
      (b.customer.phone || '').includes(q) ||
      b.serviceName.toLowerCase().includes(q) ||
      b.id.includes(q)
    );
  }
  all.sort((a, b) => (a.start > b.start ? -1 : 1));
  const page  = Math.max(1, parseInt(req.query.page) || 1);
  const limit = parseInt(req.query.limit) || 50;
  res.json({ bookings: all.slice((page - 1) * limit, page * limit), total: all.length, page });
});

// Get single booking (admin)
router.get('/admin/bookings/:id', adminAuth, (req, res) => {
  const b = store.getBookingById(req.params.id);
  if (!b) return res.status(404).json({ error: 'Not found' });
  res.json({ booking: b });
});

// Admin create booking
router.post('/admin/bookings', adminAuth, async (req, res) => {
  try {
    const { serviceId, staffId, date, time, customer, notes, sendConfirmEmail } = req.body;
    const config = store.getConfig();
    const service = config.services.find(s => s.id === serviceId);
    if (!service) return res.status(404).json({ error: 'Service not found' });

    const cust = store.findOrCreateCustomer(customer);
    const assignedStaff = config.staff.find(s => s.id === staffId);
    const startIso = `${date}T${time}:00`;
    const endMs = new Date(startIso).getTime() + service.duration * 60000;
    const endIso = new Date(endMs).toISOString().replace(/\.\d{3}Z$/, '');

    const b = store.createBooking({
      serviceId, serviceName: service.name, serviceColor: service.color,
      staffId: staffId || 'any', staffName: assignedStaff?.name || 'Any Available',
      start: startIso, end: endIso, duration: service.duration,
      price: service.price, depositRequired: service.depositRequired, amountPaid: service.price,
      status: 'confirmed', customerId: cust.id,
      customer: { name: customer.name, email: customer.email, phone: customer.phone || '' },
      notes: notes || '', intakeResponses: {}, paymentIntentId: null, source: 'admin',
    });
    store.incrementCustomerStats(cust.id, service.price);
    if (sendConfirmEmail) notify.sendConfirmation(b, config).catch(console.error);
    res.json({ booking: b });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Admin update booking
router.put('/admin/bookings/:id', adminAuth, (req, res) => {
  const updated = store.updateBooking(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Not found' });
  res.json({ booking: updated });
});

// Admin delete booking
router.delete('/admin/bookings/:id', adminAuth, (req, res) => {
  if (!store.deleteBooking(req.params.id)) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

// Send reminder
router.post('/admin/bookings/:id/reminder', adminAuth, async (req, res) => {
  const b = store.getBookingById(req.params.id);
  if (!b) return res.status(404).json({ error: 'Not found' });
  const config = store.getConfig();
  await notify.sendReminder(b, config).catch(console.error);
  await notify.sendSMS(b, config, 'reminder').catch(console.error);
  res.json({ success: true });
});

// Customers
router.get('/admin/customers', adminAuth, (req, res) => {
  let all = store.getAllCustomers();
  const { search } = req.query;
  if (search) {
    const q = search.toLowerCase();
    all = all.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.phone || '').includes(q)
    );
  }
  all.sort((a, b) => (b.totalBookings || 0) - (a.totalBookings || 0));
  res.json({ customers: all });
});

router.put('/admin/customers/:id', adminAuth, (req, res) => {
  const updated = store.updateCustomer(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Not found' });
  res.json({ customer: updated });
});

// Analytics — fixed to include cancelRate + noShowRate
router.get('/admin/analytics', adminAuth, (_req, res) => {
  const all = store.getAllBookings();
  const confirmed = all.filter(b => b.status === 'confirmed');
  const cancelled = all.filter(b => b.status === 'cancelled');
  const noShows   = all.filter(b => b.noShow);
  const now = new Date();
  const todayStr  = now.toISOString().split('T')[0];
  const weekAgo   = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo  = new Date(now); monthAgo.setDate(monthAgo.getDate() - 30);

  const todayBk  = confirmed.filter(b => b.start.startsWith(todayStr));
  const weekBk   = confirmed.filter(b => new Date(b.start) >= weekAgo);
  const monthBk  = confirmed.filter(b => new Date(b.start) >= monthAgo);

  const revenue = arr => arr.reduce((s, b) => s + (b.amountPaid || 0), 0);

  const byService = {};
  confirmed.forEach(b => { byService[b.serviceName] = (byService[b.serviceName] || 0) + 1; });

  const byStaff = {};
  confirmed.forEach(b => { byStaff[b.staffName] = (byStaff[b.staffName] || 0) + 1; });

  // Daily bookings — last 30 days
  const daily = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    daily[d.toISOString().split('T')[0]] = 0;
  }
  confirmed.forEach(b => {
    const k = b.start.split('T')[0];
    if (daily[k] !== undefined) daily[k]++;
  });

  const total = all.length;
  res.json({
    summary: {
      totalBookings: confirmed.length,
      todayBookings: todayBk.length,
      weekBookings: weekBk.length,
      monthBookings: monthBk.length,
      totalRevenue: revenue(confirmed),
      weekRevenue: revenue(weekBk),
      monthRevenue: revenue(monthBk),
      cancelled: cancelled.length,
      noShows: noShows.length,
      cancelRate: total > 0 ? Math.round(cancelled.length / total * 100) : 0,
      noShowRate: confirmed.length > 0 ? Math.round(noShows.length / confirmed.length * 100) : 0,
      totalCustomers: store.getAllCustomers().length,
    },
    byService, byStaff, daily,
  });
});

// Block time off
router.get('/admin/blocks', adminAuth, (_req, res) => {
  res.json({ blocks: store.getConfig().blockedTimes || [] });
});
router.post('/admin/blocks', adminAuth, (req, res) => {
  const config = store.getConfig();
  const block = { id: store.genId('blk'), ...req.body, createdAt: new Date().toISOString() };
  config.blockedTimes = config.blockedTimes || [];
  config.blockedTimes.push(block);
  store.saveConfig(config);
  res.json({ block });
});
router.delete('/admin/blocks/:id', adminAuth, (req, res) => {
  const config = store.getConfig();
  config.blockedTimes = (config.blockedTimes || []).filter(b => b.id !== req.params.id);
  store.saveConfig(config);
  res.json({ success: true });
});

// Waitlist
router.get('/admin/waitlist', adminAuth, (_req, res) => {
  res.json({ waitlist: store.getConfig().waitlist || [] });
});
router.delete('/admin/waitlist/:id', adminAuth, (req, res) => {
  const config = store.getConfig();
  config.waitlist = (config.waitlist || []).filter(w => w.id !== req.params.id);
  store.saveConfig(config);
  res.json({ success: true });
});

// ─────────────────────────────────────────────
//  REMINDER SCHEDULER — runs on module load
// ─────────────────────────────────────────────
let reminderSchedulerStarted = false;
function startReminderScheduler() {
  if (reminderSchedulerStarted) return;
  reminderSchedulerStarted = true;

  async function runReminders() {
    try {
      const config = store.getConfig();
      const reminderHours = config.business?.reminderHours || 24;
      const now = new Date();
      const windowEnd = new Date(now.getTime() + reminderHours * 3600000 + 30 * 60000);
      const windowStart = new Date(now.getTime() + reminderHours * 3600000 - 30 * 60000);

      const due = store.getAllBookings().filter(b => {
        if (b.status !== 'confirmed' || b.reminderSent || b.noShow) return false;
        const start = new Date(b.start);
        return start >= windowStart && start <= windowEnd;
      });

      for (const b of due) {
        console.log(`[reminders] Sending reminder for booking ${b.id} — ${b.customer.name}`);
        await notify.sendReminder(b, config).catch(e => console.error('[reminders] email failed:', e.message));
        await notify.sendSMS(b, config, 'reminder').catch(e => console.error('[reminders] SMS failed:', e.message));
        store.updateBooking(b.id, { reminderSent: true });
      }
    } catch (e) { console.error('[reminders] scheduler error:', e.message); }
  }

  // Run every 30 minutes
  runReminders();
  setInterval(runReminders, 30 * 60 * 1000);
  console.log('[reminders] Scheduler started — checking every 30 minutes');
}

startReminderScheduler();

module.exports = router;
