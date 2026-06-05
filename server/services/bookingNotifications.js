'use strict';
const nodemailer = require('nodemailer');

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

function fmt(iso) {
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

function fromAddr(config) {
  const addr = config.business.email || process.env.EMAIL_FROM || 'noreply@example.com';
  return `"${config.business.name}" <${addr}>`;
}

function baseHtml(config, content) {
  const color = config.business.primaryColor || '#4F46E5';
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F9FAFB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:${color};padding:32px 40px;">
            <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">${config.business.name}</h1>
            ${config.business.tagline ? `<p style="margin:4px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">${config.business.tagline}</p>` : ''}
          </td>
        </tr>
        <tr><td style="padding:40px;">${content}</td></tr>
        <tr>
          <td style="padding:24px 40px;background:#F9FAFB;border-top:1px solid #E5E7EB;">
            <p style="margin:0;color:#9CA3AF;font-size:12px;text-align:center;">
              ${config.business.name} &bull; ${config.business.phone || ''} &bull; ${config.business.address || ''}
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function detailsTable(booking) {
  return `
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;border-radius:12px;padding:24px;margin:24px 0;border-collapse:collapse;">
  <tr>
    <td style="padding:8px 16px;color:#6B7280;font-size:14px;width:120px;">Service</td>
    <td style="padding:8px 16px;font-weight:600;color:#111827;">${booking.serviceName}</td>
  </tr>
  <tr>
    <td style="padding:8px 16px;color:#6B7280;font-size:14px;">Date & Time</td>
    <td style="padding:8px 16px;font-weight:600;color:#111827;">${fmt(booking.start)}</td>
  </tr>
  <tr>
    <td style="padding:8px 16px;color:#6B7280;font-size:14px;">Duration</td>
    <td style="padding:8px 16px;font-weight:600;color:#111827;">${booking.duration} minutes</td>
  </tr>
  <tr>
    <td style="padding:8px 16px;color:#6B7280;font-size:14px;">With</td>
    <td style="padding:8px 16px;font-weight:600;color:#111827;">${booking.staffName}</td>
  </tr>
  ${booking.price > 0 ? `<tr>
    <td style="padding:8px 16px;color:#6B7280;font-size:14px;">Price</td>
    <td style="padding:8px 16px;font-weight:600;color:#111827;">$${booking.price.toFixed(2)}</td>
  </tr>` : ''}
</table>`;
}

function manageBtn(booking, config) {
  const base = process.env.SITE_URL || 'http://localhost:3000';
  const url = `${base}/booking/manage?id=${booking.id}&token=${booking.cancelToken}`;
  const color = config.business.primaryColor || '#4F46E5';
  return `
<div style="text-align:center;margin:32px 0;">
  <a href="${url}" style="background:${color};color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block;">
    Manage Appointment
  </a>
</div>
<p style="color:#9CA3AF;font-size:13px;text-align:center;">
  Need to cancel or reschedule? <a href="${url}" style="color:${color};">Click here</a>
</p>`;
}

async function sendEmail(config, to, subject, bodyHtml) {
  const transport = getTransport();
  if (!transport) {
    console.log(`[booking-notify] No email transport configured. Would send to ${to}: ${subject}`);
    return;
  }
  await transport.sendMail({ from: fromAddr(config), to, subject, html: bodyHtml });
}

async function sendConfirmation(booking, config) {
  const content = `
<h2 style="margin:0 0 8px;color:#111827;font-size:24px;">Appointment Confirmed ✓</h2>
<p style="color:#6B7280;margin:0 0 24px;">Hi ${booking.customer.name}, your appointment is booked!</p>
${detailsTable(booking)}
${manageBtn(booking, config)}`;

  await sendEmail(config, booking.customer.email, `Confirmed: ${booking.serviceName}`, baseHtml(config, content));

  // Notify business owner
  if (config.business.email && config.business.email !== booking.customer.email) {
    const bizContent = `
<h2 style="margin:0 0 8px;color:#111827;font-size:24px;">New Booking Received</h2>
<p style="color:#6B7280;margin:0 0 24px;">A new appointment has been booked by <strong>${booking.customer.name}</strong></p>
<p style="color:#6B7280;">Email: ${booking.customer.email}<br>Phone: ${booking.customer.phone || 'Not provided'}</p>
${detailsTable(booking)}
${booking.notes ? `<p><strong>Notes:</strong> ${booking.notes}</p>` : ''}`;
    await sendEmail(config, config.business.email, `New Booking: ${booking.customer.name} — ${booking.serviceName}`, baseHtml(config, bizContent));
  }
}

async function sendReminder(booking, config) {
  const content = `
<h2 style="margin:0 0 8px;color:#111827;font-size:24px;">Appointment Reminder</h2>
<p style="color:#6B7280;margin:0 0 24px;">Hi ${booking.customer.name}, this is a reminder about your upcoming appointment.</p>
${detailsTable(booking)}
${manageBtn(booking, config)}`;

  await sendEmail(config, booking.customer.email, `Reminder: ${booking.serviceName} Tomorrow`, baseHtml(config, content));
}

async function sendCancellation(booking, config) {
  const base = process.env.SITE_URL || 'http://localhost:3000';
  const color = config.business.primaryColor || '#4F46E5';
  const content = `
<h2 style="margin:0 0 8px;color:#111827;font-size:24px;">Appointment Cancelled</h2>
<p style="color:#6B7280;margin:0 0 24px;">Hi ${booking.customer.name}, your appointment has been cancelled.</p>
${detailsTable(booking)}
<div style="text-align:center;margin:32px 0;">
  <a href="${base}/booking" style="background:${color};color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;">
    Book a New Appointment
  </a>
</div>`;

  await sendEmail(config, booking.customer.email, `Cancelled: ${booking.serviceName}`, baseHtml(config, content));
}

async function sendReschedule(booking, config) {
  const content = `
<h2 style="margin:0 0 8px;color:#111827;font-size:24px;">Appointment Rescheduled ✓</h2>
<p style="color:#6B7280;margin:0 0 24px;">Hi ${booking.customer.name}, your appointment has been rescheduled.</p>
${detailsTable(booking)}
${manageBtn(booking, config)}`;

  await sendEmail(config, booking.customer.email, `Rescheduled: ${booking.serviceName}`, baseHtml(config, content));
}

module.exports = { sendConfirmation, sendReminder, sendCancellation, sendReschedule };
