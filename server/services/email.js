const fetch = require('node-fetch');
const { log } = require('../agents/logger');

const FROM_ADDRESS = 'outreach@904garagedoors.com';
const FROM_NAME    = '904 Garage Doors';
const REPLY_TO     = 'garageworld2025@gmail.com';

async function sendEmail({ to, subject, body, agentId = 'email' }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    log(agentId, 'warn', `RESEND_API_KEY not set — skipping email to ${to}`);
    return { sent: false, reason: 'not_configured' };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from:     `${FROM_NAME} <${FROM_ADDRESS}>`,
        to:       [to],
        subject,
        text:     body,
        reply_to: REPLY_TO,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Resend ${res.status}: ${err}`);
    }

    log(agentId, 'success', `Email sent → ${to} | "${subject}"`);
    return { sent: true };
  } catch (err) {
    log(agentId, 'error', `Email failed → ${to}: ${err.message}`);
    return { sent: false, reason: err.message };
  }
}

module.exports = { sendEmail };
