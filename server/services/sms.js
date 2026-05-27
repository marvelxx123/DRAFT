const twilio = require('twilio');

function getClient() {
  const sid   = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  return twilio(sid, token);
}

const FROM = () => process.env.TWILIO_FROM_NUMBER || '';
const OWNER = () => process.env.OWNER_PHONE || '';

async function send(to, body) {
  const client = getClient();
  if (!client || !FROM()) {
    console.log(`[sms] not configured — would have sent to ${to}: ${body}`);
    return;
  }
  try {
    await client.messages.create({ from: FROM(), to, body });
  } catch (err) {
    console.error(`[sms] failed to send to ${to}: ${err.message}`);
  }
}

// Confirmation to the customer
async function sendLeadConfirmation(phone, firstName) {
  const name = firstName ? ` ${firstName}` : '';
  await send(phone,
    `Hi${name}, got your request — we're on it. A pro will reach out within 30 minutes. ` +
    `Questions? Call us: (904) 468-3428. — 904 Garage Doors`
  );
}

// Alert to Tal
async function sendOwnerAlert(lead) {
  const owner = OWNER();
  if (!owner) return;
  const score = lead.leadScore ? ` [score: ${lead.leadScore}]` : '';
  await send(owner,
    `🔔 New lead${score}\n` +
    `Name: ${lead.name}\n` +
    `Phone: ${lead.phone}\n` +
    `Service: ${lead.service}\n` +
    `Urgency: ${lead.urgency}\n` +
    `City: ${lead.city}`
  );
}

// Warm-up follow-up if no one calls within 45 min
async function scheduleFollowUp(phone, firstName) {
  const name = firstName ? ` ${firstName}` : '';
  setTimeout(async () => {
    await send(phone,
      `Hi${name}, just checking in — 904 Garage Doors here. ` +
      `Still need help with your garage door? Call or text us anytime: (904) 468-3428.`
    );
  }, 45 * 60 * 1000);
}

module.exports = { sendLeadConfirmation, sendOwnerAlert, scheduleFollowUp };
