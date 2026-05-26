const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { log } = require('./logger');
const cfg = require('./jaxConfig');

const AGENT_ID = 'jaxfollowup';
const OUT_FILE = path.join(__dirname, '../../data/jax-followup.json');

async function callClaude(prompt) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 600,
      messages: [{ role: 'user', content: prompt }] }),
  });
  if (!res.ok) throw new Error(`Claude API ${res.status}`);
  return (await res.json()).content[0].text.trim();
}

function readData() {
  try { return JSON.parse(fs.readFileSync(OUT_FILE, 'utf8')); }
  catch { return { sequences: [] }; }
}

const context = `Business: ${cfg.businessName}. Jacksonville FL. Phone: ${cfg.phone}. USP: ${cfg.usp}.`;
const reviewLink = cfg.reviewLink || `[Your Google Maps Review Link]`;

async function run() {
  log(AGENT_ID, 'info', 'Follow-up agent starting…');
  const data = readData();
  const seq = { id: Date.now(), date: new Date().toISOString() };

  // Same-day thank you + review request SMS
  seq.thankYouSms = await callClaude(
    `Write a post-job thank you SMS for a Jacksonville FL garage door technician to send to a customer same day. ` +
    `${context} Max 160 chars (one SMS). Thank them, mention the work was done, ask for a Google review with this link: ${reviewLink}. ` +
    `Warm and personal. Sign with your first name only, not a company name.`
  );
  log(AGENT_ID, 'success', 'Thank-you SMS generated');

  // 3-day follow-up review nudge
  seq.reviewNudgeSms = await callClaude(
    `Write a gentle 3-day-later follow-up SMS from a Jacksonville garage door tech to a recent customer. ` +
    `${context} Max 160 chars. Friendly check-in, no pressure. ` +
    `Mention that a quick Google review would really help a small local business. Include review link: ${reviewLink}. ` +
    `Casual, human tone. Not automated-sounding.`
  );
  log(AGENT_ID, 'success', '3-day review nudge generated');

  // Referral request text (after job, when customer is happy)
  seq.referralSms = await callClaude(
    `Write an SMS asking for referrals, from a Jacksonville garage door technician to a happy customer. ` +
    `${context} Max 160 chars. ` +
    `Mention that referrals are appreciated and we prioritize past customers. ` +
    `Light, friendly. Not a mass-marketing text — sounds personal.`
  );
  log(AGENT_ID, 'success', 'Referral SMS generated');

  // 6-month maintenance reminder
  seq.maintenanceReminder = await callClaude(
    `Write a 6-month maintenance reminder SMS from a Jacksonville garage door tech to a past customer. ` +
    `${context} Max 160 chars. ` +
    `Remind them an annual tune-up prevents costly repairs. Offer to schedule quickly. Include phone. ` +
    `Warm tone, sounds like a human remembering them, not a bot blast.`
  );
  log(AGENT_ID, 'success', 'Maintenance reminder generated');

  // Seasonal upsell (weather-based)
  seq.seasonalUpsell = await callClaude(
    `Write a seasonal text message from a Jacksonville FL garage door technician to past customers. ` +
    `${context} It's ${new Date().toLocaleString('default', { month: 'long' })} in Florida. ` +
    `Reference the local weather/season (hurricane season, heat, etc.) and tie it to a garage door check. ` +
    `Max 160 chars. Helpful, not salesy. Include phone.`
  );
  log(AGENT_ID, 'success', 'Seasonal upsell generated');

  // Lead qualification script (for when someone calls in)
  seq.phoneScript = await callClaude(
    `Write a short phone script for a Jacksonville garage door technician when a new lead calls. ` +
    `${context} Include: greeting, 4 quick qualifying questions (type of issue, door type, how urgent, property type), ` +
    `and a close that books the appointment or gives a ballpark estimate to keep them on the hook. ` +
    `Conversational, max 200 words. Format as a script with [brackets] for what to listen for.`
  );
  log(AGENT_ID, 'success', 'Phone script generated');

  data.sequences.unshift(seq);
  data.sequences = data.sequences.slice(0, 30);
  data.lastUpdated = new Date().toISOString();
  fs.writeFileSync(OUT_FILE, JSON.stringify(data, null, 2));
  log(AGENT_ID, 'success', 'Follow-up agent complete. 6 templates saved.');
}

module.exports = { run, AGENT_ID };
