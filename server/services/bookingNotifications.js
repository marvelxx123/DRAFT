'use strict';
const nodemailer = require('nodemailer');

// ─────────────────────────────────────────────
//  EMAIL
// ─────────────────────────────────────────────
function getTransport() {
  if (process.env.RESEND_API_KEY) {
    return nodemailer.createTransport({
      host: 'smtp.resend.com', port: 465, secure: true,
      auth: { user: 'resend', pass: process.env.RESEND_API_KEY },
    });
  }
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  if (process.env.GMAIL_USER && process.env.GMAIL_PASS) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS },
    });
  }
  return null;
}

function fmtDate(iso) {
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

function siteUrl() { return process.env.SITE_URL || 'http://localhost:3000'; }
function fromAddr(config) {
  const addr = config.business.email || process.env.EMAIL_FROM || 'noreply@example.com';
  return `"${config.business.name}" <${addr}>`;
}

function baseTemplate(config, content) {
  const color = config.business.primaryColor || '#4F46E5';
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F9FAFB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;padding:40px 16px">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);max-width:600px">
<tr><td style="background:${color};padding:28px 40px">
  <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700">${config.business.name}</h1>
  ${config.business.tagline ? `<p style="margin:4px 0 0;color:rgba(255,255,255,.75);font-size:13px">${config.business.tagline}</p>` : ''}
</td></tr>
<tr><td style="padding:36px 40px">${content}</td></tr>
<tr><td style="padding:20px 40px;background:#F9FAFB;border-top:1px solid #E5E7EB">
  <p style="margin:0;color:#9CA3AF;font-size:12px;text-align:center">
    ${config.business.name}${config.business.phone ? ' · ' + config.business.phone : ''}${config.business.address ? ' · ' + config.business.address : ''}
  </p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function detailsTable(b) {
  const rows = [
    ['Service', b.serviceName],
    ['Date & Time', fmtDate(b.start)],
    ['Duration', b.duration + ' minutes'],
    ['With', b.staffName],
    b.price > 0 ? ['Price', '$' + b.price.toFixed(2)] : null,
  ].filter(Boolean);
  return `<table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;border-radius:12px;margin:24px 0">
    ${rows.map(([l, v]) => `<tr>
      <td style="padding:10px 18px;color:#6B7280;font-size:13px;width:120px;border-bottom:1px solid #E5E7EB">${l}</td>
      <td style="padding:10px 18px;font-weight:600;color:#111827;font-size:14px;border-bottom:1px solid #E5E7EB">${v}</td>
    </tr>`).join('')}
  </table>`;
}

function manageLink(b, config) {
  const color = config.business.primaryColor || '#4F46E5';
  const url = `${siteUrl()}/booking/manage?id=${b.id}&token=${b.cancelToken}`;
  return `
<div style="text-align:center;margin:28px 0">
  <a href="${url}" style="background:${color};color:#fff;padding:13px 30px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block">
    Manage Appointment
  </a>
</div>
<p style="color:#9CA3AF;font-size:12px;text-align:center;margin:0">
  Need to cancel or reschedule? <a href="${url}" style="color:${color}">Click here</a> · Booking ID: ${b.id}
</p>`;
}

async function sendEmail(config, to, subject, html) {
  const transport = getTransport();
  if (!transport) {
    console.log(`[notify] No email transport. Would send to ${to}: ${subject}`);
    return;
  }
  await transport.sendMail({ from: fromAddr(config), to, subject, html });
}

async function sendConfirmation(b, config) {
  const content = `
<h2 style="margin:0 0 6px;font-size:22px;color:#111827">Appointment Confirmed ✓</h2>
<p style="color:#6B7280;margin:0 0 4px">Hi ${b.customer.name},</p>
<p style="color:#6B7280;margin:0 0 24px">Your appointment is booked and confirmed.</p>
${detailsTable(b)}
${manageLink(b, config)}`;

  await sendEmail(config, b.customer.email, `Confirmed: ${b.serviceName} on ${fmtDate(b.start).split(' at')[0]}`, baseTemplate(config, content));

  // Notify business
  if (config.business.email && config.business.email !== b.customer.email) {
    const biz = `
<h2 style="margin:0 0 6px;font-size:22px;color:#111827">New Booking 📅</h2>
<p style="color:#6B7280;margin:0 0 24px">A new appointment was booked by <strong>${b.customer.name}</strong> (${b.customer.email}${b.customer.phone ? ', ' + b.customer.phone : ''})</p>
${detailsTable(b)}
${b.notes ? `<p style="color:#374151;font-size:14px"><strong>Notes:</strong> ${b.notes}</p>` : ''}`;
    await sendEmail(config, config.business.email, `New Booking: ${b.customer.name} — ${b.serviceName}`, baseTemplate(config, biz));
  }
}

async function sendReminder(b, config) {
  const content = `
<h2 style="margin:0 0 6px;font-size:22px;color:#111827">Appointment Tomorrow ⏰</h2>
<p style="color:#6B7280;margin:0 0 4px">Hi ${b.customer.name},</p>
<p style="color:#6B7280;margin:0 0 24px">This is a friendly reminder about your upcoming appointment.</p>
${detailsTable(b)}
${manageLink(b, config)}`;

  await sendEmail(config, b.customer.email, `Reminder: ${b.serviceName} — ${fmtDate(b.start)}`, baseTemplate(config, content));
}

async function sendCancellation(b, config) {
  const color = config.business.primaryColor || '#4F46E5';
  const content = `
<h2 style="margin:0 0 6px;font-size:22px;color:#111827">Appointment Cancelled</h2>
<p style="color:#6B7280;margin:0 0 24px">Hi ${b.customer.name}, your appointment has been cancelled.</p>
${detailsTable(b)}
<div style="text-align:center;margin:28px 0">
  <a href="${siteUrl()}/booking" style="background:${color};color:#fff;padding:13px 30px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block">
    Book a New Appointment
  </a>
</div>`;

  await sendEmail(config, b.customer.email, `Cancelled: ${b.serviceName}`, baseTemplate(config, content));
}

async function sendReschedule(b, config) {
  const content = `
<h2 style="margin:0 0 6px;font-size:22px;color:#111827">Appointment Rescheduled ✓</h2>
<p style="color:#6B7280;margin:0 0 4px">Hi ${b.customer.name},</p>
<p style="color:#6B7280;margin:0 0 24px">Your appointment has been rescheduled to the new time below.</p>
${detailsTable(b)}
${manageLink(b, config)}`;

  await sendEmail(config, b.customer.email, `Rescheduled: ${b.serviceName}`, baseTemplate(config, content));
}

// ─────────────────────────────────────────────
//  SMS (Twilio)
// ─────────────────────────────────────────────
function getTwilio() {
  const sid  = process.env.TWILIO_ACCOUNT_SID;
  const auth = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!sid || !auth || !from) return null;
  try { return { client: require('twilio')(sid, auth), from }; } catch { return null; }
}

function fmtShort(iso) {
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

async function sendSMS(b, config, type = 'confirmation') {
  if (!b.customer.phone) return;
  const tw = getTwilio();
  if (!tw) {
    console.log(`[notify] No Twilio config. Would SMS ${b.customer.phone} (${type})`);
    return;
  }

  const bizName = config.business.name;
  const manageUrl = `${siteUrl()}/booking/manage?id=${b.id}&token=${b.cancelToken}`;
  const messages = {
    confirmation: `Hi ${b.customer.name}! ✓ Your ${b.serviceName} is confirmed for ${fmtShort(b.start)}. Manage: ${manageUrl} — ${bizName}`,
    reminder:     `Reminder: You have a ${b.serviceName} tomorrow at ${fmtShort(b.start)} with ${b.staffName}. Manage: ${manageUrl} — ${bizName}`,
    cancellation: `Your ${b.serviceName} on ${fmtShort(b.start)} has been cancelled. Book again: ${siteUrl()}/booking — ${bizName}`,
  };

  const body = messages[type] || messages.confirmation;
  await tw.client.messages.create({ from: tw.from, to: b.customer.phone, body });
  console.log(`[notify] SMS sent (${type}) to ${b.customer.phone}`);
}

module.exports = { sendConfirmation, sendReminder, sendCancellation, sendReschedule, sendSMS };
