const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { log } = require('./logger');
const cfg = require('./jaxConfig');

const AGENT_ID = 'jaxoutreach';
const OUT_FILE = path.join(__dirname, '../../data/jax-outreach.json');

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
  catch { return { packs: [] }; }
}

const context = `My name is [YOUR NAME], owner of ${cfg.businessName} in Jacksonville FL. ` +
  `Phone: ${cfg.phone}. Services: ${cfg.services.join(', ')}. USP: ${cfg.usp}. Years in business: ${cfg.yearsExp}.`;

const month = String(new Date().getMonth() + 1);
const seasonal = cfg.seasonalContext[month] || 'standard season';
const pmTarget = cfg.pmCompanies[Math.floor(Math.random() * cfg.pmCompanies.length)];
const hoaTarget = cfg.hoaTargets[Math.floor(Math.random() * cfg.hoaTargets.length)];

async function run() {
  log(AGENT_ID, 'info', 'Outreach agent starting…');
  const data = readData();
  const pack = { id: Date.now(), date: new Date().toISOString() };

  // Real estate agent cold DM (Facebook/Instagram/LinkedIn)
  pack.realEstateDM = await callClaude(
    `Write a short cold DM/message to a Jacksonville FL real estate agent, from a local garage door technician. ` +
    `${context} Goal: become their go-to garage door vendor for buyers/sellers. ` +
    `Max 80 words. Friendly, not salesy. Mention we can do quick estimates before listings and same-day fixes for buyers. ` +
    `End with a soft ask ("Would you be open to keeping my number on hand?"). First person. No corporate language.`
  );
  log(AGENT_ID, 'success', 'Real estate agent DM generated');

  // Property manager cold email — uses a real Jacksonville PM company name
  pack.propertyManagerEmail = await callClaude(
    `Write a cold email to the maintenance coordinator at ${pmTarget}, a Jacksonville FL residential property management company, from a local garage door technician. ` +
    `${context} Goal: become their preferred vendor for garage door calls across their properties. ` +
    `Subject line + body. Max 150 words total. Professional but human. ` +
    `Mention volume pricing, fast response, and that we handle both emergency and routine calls. ` +
    `Include phone. End with a simple CTA (a quick call or adding us to their vendor list).`
  );
  pack.propertyManagerTarget = pmTarget;
  log(AGENT_ID, 'success', 'Property manager email generated');

  // HOA pitch — targets a real Ponte Vedra / Jacksonville Beach HOA community
  pack.hoaPitch = await callClaude(
    `Write a short message to the community manager at ${hoaTarget} HOA in Ponte Vedra / Jacksonville FL, from a local garage door technician. ` +
    `${context} Goal: get added to the HOA preferred vendor list and/or mentioned in the community newsletter. ` +
    `Max 100 words. Suggest sending their info in the HOA newsletter or vendor list. ` +
    `Mention being local, licensed, and offering HOA-member discounts. Friendly and neighbor-like tone.`
  );
  pack.hoaTarget = hoaTarget;
  log(AGENT_ID, 'success', 'HOA pitch generated');

  // Apartment complex maintenance director pitch
  pack.apartmentPitch = await callClaude(
    `Write a cold message to an apartment complex maintenance director in Jacksonville FL, from a local garage door tech. ` +
    `${context} Goal: win a recurring vendor contract for garage door maintenance and repairs. ` +
    `Max 120 words. Emphasize volume pricing, fast turn-around, invoicing flexibility. ` +
    `Professional tone. Ask if they can add us to their approved vendor list.`
  );
  log(AGENT_ID, 'success', 'Apartment complex pitch generated');

  // Where to find leads — actionable list
  pack.prospectingSources = [
    'Facebook: Search Jacksonville real estate agent groups → DM top active agents',
    'LinkedIn: Search "property manager Jacksonville FL" → send connection + note',
    'Zillow/Realtor.com: Find top Jacksonville agents → contact via their listed email',
    'Google Maps: Search "property management Jacksonville FL" → call or email each one',
    'Apartments.com: Find large complexes near you → call front desk and ask for maintenance',
    'NextDoor Business: Post intro in each neighborhood section weekly',
    'Facebook Groups: "Jacksonville Home Owners", "Jacksonville FL Real Estate" — join and post helpful tips',
    'Yelp: Free business listing + respond to every review',
    'Thumbtack: Free profile — bid on leads (some free credits)',
    'Angi (formerly Angie\'s List): Free basic listing',
  ];

  data.packs.unshift(pack);
  data.packs = data.packs.slice(0, 30);
  data.lastUpdated = new Date().toISOString();
  fs.writeFileSync(OUT_FILE, JSON.stringify(data, null, 2));
  log(AGENT_ID, 'success', 'Outreach agent complete. 4 templates + source list saved.');
}

module.exports = { run, AGENT_ID };
