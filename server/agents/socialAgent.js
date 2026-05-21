const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { log } = require('./logger');
const config = require('../../jaxConfig');

const AGENT_ID = 'social';
const SOCIAL_FILE = path.join(__dirname, '../../data/social-content.json');

const POST_THEMES = [
  'spring replacement tip',
  'emergency service story',
  'before & after',
  'maintenance tip',
  'seasonal reminder',
  'local area shoutout',
  'free estimate offer',
  'customer win',
];

async function callClaude(prompt) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 800,
      messages: [{ role: 'user', content: prompt }] }),
  });
  if (!res.ok) throw new Error(`Claude API ${res.status}`);
  return (await res.json()).content[0].text.trim();
}

function readContent() {
  try { return JSON.parse(fs.readFileSync(SOCIAL_FILE, 'utf8')); }
  catch { return { packs: [] }; }
}

function randomItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

async function run() {
  log(AGENT_ID, 'info', 'Social agent starting…');
  const market = randomItem(config.priorityMarkets);
  const theme  = randomItem(POST_THEMES);
  const phone  = config.business.phone;
  const name   = config.business.name;

  log(AGENT_ID, 'info', `Theme: "${theme}" · Market: ${market.name}`);

  const content = readContent();
  const pack = { id: Date.now(), date: new Date().toISOString(), market: market.name, theme };

  const context = `Business: ${name}. Phone: ${phone}. Location: ${market.name}, FL (${market.county} County). ` +
    `Theme: "${theme}". Tone: friendly, local, trustworthy — like a neighbor who's also a pro.`;

  try {
    // Facebook — most important for garage door leads
    pack.facebook = await callClaude(
      `${context} Write a Facebook post for a local garage door company. ` +
      `Max 120 words. Start with something that stops the scroll — a relatable situation ` +
      `("Had a customer in ${market.name} this morning who couldn't get their car out..."). ` +
      `End with a CTA including the phone number. Conversational, zero corporate speak. ` +
      `Add 3 relevant local hashtags at the end (#904GarageDoors #${market.name.replace(' ','')}FL #JacksonvilleGarage).`
    );
    log(AGENT_ID, 'success', 'Facebook post generated');

    // Nextdoor — hyper-local, very effective for trades
    pack.nextdoor = await callClaude(
      `${context} Write a Nextdoor post (as a local business introducing itself). ` +
      `Max 80 words. Sound like a neighbor, not an ad. Mention ${market.name} specifically. ` +
      `Offer something free (estimate, safety check). Include phone: ${phone}. No hashtags.`
    );
    log(AGENT_ID, 'success', 'Nextdoor post generated');

    // Google Business update post
    pack.googleBusiness = await callClaude(
      `${context} Write a Google Business Profile post for a garage door company. ` +
      `Max 100 words. Include a specific offer or tip. End with the phone number. ` +
      `Focus on ${market.name} area. Professional but approachable.`
    );
    log(AGENT_ID, 'success', 'Google Business post generated');

    // Craigslist services ad (refresh weekly)
    pack.craigslist = await callClaude(
      `${context} Write a Craigslist "Services" ad for garage door repair/install in ${market.name}, FL. ` +
      `Format: short title (max 60 chars), then 4-6 bullet points of what's offered, ` +
      `then the phone number. Include "Free Estimates" and "Same-Day Service." Plain text, no markdown.`
    );
    log(AGENT_ID, 'success', 'Craigslist ad generated');

    content.packs.unshift(pack);
    content.packs = content.packs.slice(0, 30);
    content.lastUpdated = new Date().toISOString();
    fs.writeFileSync(SOCIAL_FILE, JSON.stringify(content, null, 2));
    log(AGENT_ID, 'success', `Social pack saved for ${market.name}.`);
  } catch (err) {
    log(AGENT_ID, 'error', `Social agent error: ${err.message}`);
  }
}

module.exports = { run, AGENT_ID };
