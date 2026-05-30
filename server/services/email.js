const nodemailer = require('nodemailer');
const { log } = require('../agents/logger');

const FROM_ADDRESS = 'garageworld2025@gmail.com';
const FROM_NAME    = '904 Garage Doors';

function getTransport() {
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!pass) return null;
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: FROM_ADDRESS, pass },
  });
}

async function sendEmail({ to, subject, body, agentId = 'email' }) {
  const transport = getTransport();
  if (!transport) {
    log(agentId, 'warn', `GMAIL_APP_PASSWORD not set — skipping email to ${to}`);
    return { sent: false, reason: 'not_configured' };
  }
  try {
    await transport.sendMail({
      from:     `"${FROM_NAME}" <${FROM_ADDRESS}>`,
      to,
      subject,
      text:     body,
      replyTo:  FROM_ADDRESS,
    });
    log(agentId, 'success', `Email sent → ${to} | "${subject}"`);
    return { sent: true };
  } catch (err) {
    log(agentId, 'error', `Email failed → ${to}: ${err.message}`);
    return { sent: false, reason: err.message };
  }
}

module.exports = { sendEmail };
