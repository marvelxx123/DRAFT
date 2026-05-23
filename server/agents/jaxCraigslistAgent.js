const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { log } = require('./logger');
const cfg = require('./jaxConfig');

const AGENT_ID = 'jaxcraigslist';
const OUT_FILE = path.join(__dirname, '../../data/jax-craigslist.json');

async function callClaude(prompt) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 500,
      messages: [{ role: 'user', content: prompt }] }),
  });
  if (!res.ok) throw new Error(`Claude API ${res.status}`);
  return (await res.json()).content[0].text.trim();
}

function readData() {
  try { return JSON.parse(fs.readFileSync(OUT_FILE, 'utf8')); }
  catch { return { ads: [] }; }
}

// Rotate through these so listings feel fresh and different
const AD_TYPES = [
  { type: 'emergency', title: 'SAME DAY Garage Door Repair – Jacksonville' },
  { type: 'spring',    title: 'Broken Spring? We Fix It Today – JAX Area' },
  { type: 'opener',   title: 'Garage Door Opener Install/Replace – Jacksonville' },
  { type: 'tune',     title: 'Garage Door Tune-Up Special – All Jacksonville Areas' },
  { type: 'new',      title: 'New Garage Door Installation – Jacksonville & Surrounding' },
  { type: 'cable',    title: 'Garage Door Cable Repair – Fast Service Jacksonville FL' },
];

const context = `Business: ${cfg.businessName}. Phone: ${cfg.phone}. Areas: ${cfg.areas.join(', ')}. USP: ${cfg.usp}. Services: ${cfg.services.join(', ')}.`;

async function run() {
  log(AGENT_ID, 'info', 'Craigslist agent starting…');
  const adType = AD_TYPES[Math.floor(Math.random() * AD_TYPES.length)];
  const data = readData();

  const body = await callClaude(
    `Write a Craigslist "Services" listing body for a garage door company in Jacksonville FL. ` +
    `${context} Ad type: "${adType.type}" service. ` +
    `Format: short punchy opening line, bullet list of 5-7 key service points, pricing approach (free estimates, flat-rate), ` +
    `availability (same-day, emergency), service area, and call to action with phone. ` +
    `Total max 200 words. Plain text, no markdown. Sound trustworthy and local. ` +
    `Do NOT sound like a big chain — this is a local Jacksonville tech.`
  );
  log(AGENT_ID, 'success', `Craigslist ad generated: "${adType.title}"`);

  const entry = {
    id: Date.now(),
    date: new Date().toISOString(),
    type: adType.type,
    title: adType.title,
    body,
    postingInstructions: [
      `Go to craigslist.org → Jacksonville → Services → Skilled Trades`,
      `Title: "${adType.title}"`,
      `Category: Skilled Trades`,
      `Location: Jacksonville, FL`,
      `Renew every 48 hours to stay at the top`,
      `Post from a different email each time to avoid Craigslist flagging`,
    ],
  };

  data.ads.unshift(entry);
  data.ads = data.ads.slice(0, 30);
  data.lastUpdated = new Date().toISOString();
  fs.writeFileSync(OUT_FILE, JSON.stringify(data, null, 2));
  log(AGENT_ID, 'success', 'Craigslist agent complete. Ad saved.');
}

module.exports = { run, AGENT_ID };
