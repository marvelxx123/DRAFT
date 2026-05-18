const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { log } = require('./logger');

const AGENT_ID = 'content';
const CONTENT_FILE = path.join(__dirname, '../../data/generated-content.json');

const PRODUCTS_SAMPLE = [
  'T-Shirts', 'Hoodies', 'Mugs', 'Sunglasses', 'Glass Panels',
  'Stickers', 'Pillows', 'Canvas Prints', 'Coasters', 'Keychains',
  'Water Bottles', 'Custom Socks', 'Face Masks', 'Tote Bags', 'Caps',
];

async function callClaude(prompt) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Claude API error: ${res.status}`);
  const data = await res.json();
  return data.content[0].text.trim();
}

function readContent() {
  try { return JSON.parse(fs.readFileSync(CONTENT_FILE, 'utf8')); }
  catch { return {}; }
}

async function run() {
  log(AGENT_ID, 'info', 'Content agent starting run…');
  const content = readContent();

  try {
    // 1. Generate a hero tagline
    const tagline = await callClaude(
      'Generate ONE punchy, bold streetwear-style marketing tagline for a custom print-on-demand store called WEARIT. ' +
      'Max 8 words. No quotes. Examples of tone: "Your Art. Their Eyes." or "Print It. Wear It. Own It."'
    );
    content.heroTagline = tagline;
    log(AGENT_ID, 'success', `Hero tagline updated: "${tagline}"`);

    // 2. Pick a random product and write a description
    const product = PRODUCTS_SAMPLE[Math.floor(Math.random() * PRODUCTS_SAMPLE.length)];
    const desc = await callClaude(
      `Write a 2-sentence product description for custom-printed ${product} sold on WEARIT. ` +
      `Tone: bold, streetwear, confident. Focus on uniqueness and quality. No fluff.`
    );
    if (!content.productDescriptions) content.productDescriptions = {};
    content.productDescriptions[product] = desc;
    log(AGENT_ID, 'success', `Product description updated: ${product}`);

    // 3. Generate a promotional banner message
    const promo = await callClaude(
      'Generate ONE short promotional banner message (max 12 words) for a print-on-demand store. ' +
      'Include a sense of urgency or exclusivity. No emoji. Uppercase style OK.'
    );
    content.promoBanner = promo;
    log(AGENT_ID, 'success', `Promo banner updated: "${promo}"`);

    content.lastUpdated = new Date().toISOString();
    fs.writeFileSync(CONTENT_FILE, JSON.stringify(content, null, 2));
    log(AGENT_ID, 'success', 'Content agent run complete. All content saved.');
  } catch (err) {
    log(AGENT_ID, 'error', `Content agent error: ${err.message}`);
  }
}

module.exports = { run, AGENT_ID };
