const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { log } = require('./logger');
const config = require('../../jaxConfig');

const AGENT_ID = 'content';
const CONTENT_FILE = path.join(__dirname, '../../data/generated-content.json');

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
  return (await res.json()).content[0].text.trim();
}

function readContent() {
  try { return JSON.parse(fs.readFileSync(CONTENT_FILE, 'utf8')); }
  catch { return {}; }
}

// Pick a random market from the priority list for geo-targeted content
function randomMarket() {
  const m = config.priorityMarkets;
  return m[Math.floor(Math.random() * m.length)];
}

async function run() {
  log(AGENT_ID, 'info', 'Content agent starting run…');
  const content = readContent();
  const market = randomMarket();
  const phone = config.business.phone;

  try {
    // 1. Hero tagline tailored to a specific market
    const tagline = await callClaude(
      `Write ONE punchy headline for a garage door repair company called "904 Garage Doors" ` +
      `targeting homeowners in ${market.name}, FL. ` +
      `Max 10 words. No quotes. Emphasize speed and local trust. ` +
      `Examples: "Fast Garage Door Repair in ${market.name} — Call Now" or ` +
      `"${market.name}'s Most Trusted Garage Door Tech."`
    );
    content.heroTagline = tagline;
    content.heroMarket  = market.name;
    log(AGENT_ID, 'success', `Hero tagline for ${market.name}: "${tagline}"`);

    // 2. Emergency service description
    const emergency = await callClaude(
      `Write 2 sentences for the emergency section of a garage door repair website. ` +
      `Business: 904 Garage Doors, serving ${market.name}, FL. Phone: ${phone}. ` +
      `Tone: urgent but reassuring. Focus on: broken springs, doors off track, car trapped. ` +
      `End with the phone number. No fluff.`
    );
    content.emergencyBlurb = emergency;
    log(AGENT_ID, 'success', 'Emergency blurb updated');

    // 3. SEO meta description for the landing page
    const metaDesc = await callClaude(
      `Write a Google meta description (max 155 chars) for 904 Garage Doors. ` +
      `Keywords to include: garage door repair, ${market.name} FL, same-day service, free estimate. ` +
      `Include a call to action. No quotes.`
    );
    content.metaDescription = metaDesc;
    log(AGENT_ID, 'success', 'Meta description updated');

    // 4. Trust-building FAQ answer (rotates daily)
    const faqs = [
      'How fast can you get to me for an emergency in ' + market.name + '?',
      'Are you licensed and insured in Florida?',
      'Do you charge for estimates in ' + market.name + '?',
      'Can you fix my garage door today?',
      'What garage door brands do you service?',
    ];
    const faq = faqs[new Date().getDay() % faqs.length];
    const faqAnswer = await callClaude(
      `Answer this customer question for 904 Garage Doors in ${market.name}, FL: "${faq}". ` +
      `2-3 sentences. Honest, friendly, confident. End with the phone number ${phone} if relevant.`
    );
    if (!content.faqs) content.faqs = {};
    content.faqs[faq] = faqAnswer;
    log(AGENT_ID, 'success', `FAQ updated: ${faq}`);

    content.lastUpdated = new Date().toISOString();
    fs.writeFileSync(CONTENT_FILE, JSON.stringify(content, null, 2));
    log(AGENT_ID, 'success', 'Content agent run complete.');
  } catch (err) {
    log(AGENT_ID, 'error', `Content agent error: ${err.message}`);
  }
}

module.exports = { run, AGENT_ID };
