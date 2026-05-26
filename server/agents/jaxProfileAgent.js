const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { log } = require('./logger');
const cfg = require('./jaxConfig');

const AGENT_ID = 'jaxprofile';
const OUT_FILE = path.join(__dirname, '../../data/jax-profiles.json');

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
  catch { return { entries: [] }; }
}

const context = `Business: ${cfg.businessName}. Location: Jacksonville FL area (${cfg.areas.join(', ')}). Services: ${cfg.services.join(', ')}. USP: ${cfg.usp}. Phone: ${cfg.phone}.`;

async function run() {
  log(AGENT_ID, 'info', 'Profile agent starting…');
  const data = readData();
  const entry = { id: Date.now(), date: new Date().toISOString() };

  // Google Business Profile weekly post
  entry.googlePost = await callClaude(
    `Write a Google Business Profile weekly post for a local garage door service company. ${context} ` +
    `Make it 100-150 words. Focus on one service. Include a clear CTA with the phone number. ` +
    `Mention Jacksonville specifically. Professional but friendly tone. No hashtags.`
  );
  log(AGENT_ID, 'success', 'Google Business post generated');

  // Nextdoor business description
  entry.nextdoorBio = await callClaude(
    `Write a Nextdoor business bio for a local garage door service company. ${context} ` +
    `Max 180 words. Neighborhood-friendly, trustworthy tone. Mention the specific neighborhoods served. ` +
    `End with contact info. Represent 904 Garage Doors as a professional service platform that dispatches trusted pros across Jacksonville.`
  );
  log(AGENT_ID, 'success', 'Nextdoor bio generated');

  // Yelp / Angi / Thumbtack "About" section
  entry.platformBio = await callClaude(
    `Write an "About the business" section for Yelp, Angi, and Thumbtack for a local garage door company. ${context} ` +
    `Max 200 words. Highlight experience, licensing, and same-day availability. ` +
    `Mention emergency service. End with a soft CTA. SEO-friendly with local keywords.`
  );
  log(AGENT_ID, 'success', 'Platform bio generated');

  // Nextdoor intro post (post once in local groups)
  entry.nextdoorIntro = await callClaude(
    `Write a short Nextdoor "business introduction" post for a garage door technician. ${context} ` +
    `Sound like a real local person, not a company. Max 100 words. First-person. ` +
    `Mention fast response across Jacksonville and that we connect homeowners with trusted garage door pros. ` +
    `Soft intro — not a sales pitch. End with phone number.`
  );
  log(AGENT_ID, 'success', 'Nextdoor intro post generated');

  data.entries.unshift(entry);
  data.entries = data.entries.slice(0, 12);
  data.lastUpdated = new Date().toISOString();
  fs.writeFileSync(OUT_FILE, JSON.stringify(data, null, 2));
  log(AGENT_ID, 'success', 'Profile agent complete. 4 assets saved.');
}

module.exports = { run, AGENT_ID };
