const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { log } = require('./logger');
const cfg = require('./jaxConfig');

const AGENT_ID = 'jaxsocial';
const OUT_FILE = path.join(__dirname, '../../data/jax-social.json');

async function callClaude(prompt) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 700,
      messages: [{ role: 'user', content: prompt }] }),
  });
  if (!res.ok) throw new Error(`Claude API ${res.status}`);
  return (await res.json()).content[0].text.trim();
}

function readData() {
  try { return JSON.parse(fs.readFileSync(OUT_FILE, 'utf8')); }
  catch { return { posts: [] }; }
}

const ANGLES = [
  'emergency same-day repair',
  'broken spring warning signs',
  'seasonal maintenance reminder',
  'new homeowner garage tips',
  'before & after transformation',
  'opener upgrade benefits',
  'common DIY mistakes to avoid',
  'price transparency / no hidden fees',
];

const context = `Business: ${cfg.businessName}. Jacksonville FL. Phone: ${cfg.phone}. Services: ${cfg.services.join(', ')}. USP: ${cfg.usp}.`;
const month = new Date().toLocaleString('default', { month: 'long' });
const monthNum = String(new Date().getMonth() + 1);
const seasonal = (cfg.seasonalContext && cfg.seasonalContext[monthNum]) || '';
const areas = cfg.areas.join(', ');

async function run() {
  log(AGENT_ID, 'info', 'Jacksonville social agent starting…');
  const angle = ANGLES[Math.floor(Math.random() * ANGLES.length)];
  const data = readData();
  const pack = { id: Date.now(), date: new Date().toISOString(), angle };

  // Facebook group post (community-style, triggers replies)
  pack.facebookGroup = await callClaude(
    `Write a Facebook community group post for a Jacksonville FL garage door technician. ${context} ` +
    `Angle: "${angle}". Month: ${month}. Seasonal context: ${seasonal}. Areas covered: ${areas}. ` +
    `Sound like a real local person, not a corporation. Max 120 words. ` +
    `Ask the community a question to drive engagement (e.g. "Has anyone in Ponte Vedra dealt with this?"). ` +
    `Include phone number naturally at the end. No hashtags.`
  );
  log(AGENT_ID, 'success', 'Facebook group post generated');

  // Facebook Business Page post
  pack.facebookPage = await callClaude(
    `Write a Facebook business page post for a Jacksonville FL garage door company. ${context} ` +
    `Angle: "${angle}". Month: ${month}. ` +
    `Professional but warm. 80-120 words. Include a tip or fact. End with a CTA and phone. ` +
    `2-3 relevant local hashtags (e.g. #Jacksonville #JaxFL #GarageDoor).`
  );
  log(AGENT_ID, 'success', 'Facebook page post generated');

  // Instagram caption
  pack.instagram = await callClaude(
    `Write an Instagram caption for a Jacksonville FL garage door technician. ${context} ` +
    `Angle: "${angle}". Month: ${month}. Max 150 words. ` +
    `Hook in first line. Real, human tone. End with link in bio CTA and 6-8 hashtags including #Jacksonville #JaxFL.`
  );
  log(AGENT_ID, 'success', 'Instagram caption generated');

  // Nextdoor post (hyper-local, one neighborhood)
  const hood = cfg.areas[Math.floor(Math.random() * cfg.areas.length)];
  pack.nextdoor = await callClaude(
    `Write a Nextdoor post for a local garage door technician in ${hood}, Jacksonville FL. ${context} ` +
    `Angle: "${angle}". Month: ${month}. Max 100 words. ` +
    `Professional but approachable tone. Represent 904 Garage Doors as a reliable service platform. Mention the specific neighborhood. ` +
    `No sales pressure. End with phone number. First-person voice.`
  );
  pack.nextdoorNeighborhood = hood;
  log(AGENT_ID, 'success', `Nextdoor post generated for ${hood}`);

  data.posts.unshift(pack);
  data.posts = data.posts.slice(0, 60);
  data.lastUpdated = new Date().toISOString();
  fs.writeFileSync(OUT_FILE, JSON.stringify(data, null, 2));
  log(AGENT_ID, 'success', 'Jacksonville social agent complete. 4 posts saved.');
}

module.exports = { run, AGENT_ID };
