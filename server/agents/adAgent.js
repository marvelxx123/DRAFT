const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { log } = require('./logger');
const config = require('../../jaxConfig');

const AGENT_ID = 'ads';
const ADS_FILE = path.join(__dirname, '../../data/generated-ads.json');

// Ad formats per platform — garage door services convert best on
// Facebook (homeowners), Nextdoor (hyper-local), and Instagram (visual)
const PLATFORMS = ['facebook', 'nextdoor', 'instagram'];

async function callClaude(prompt) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 600,
      messages: [{ role: 'user', content: prompt }] }),
  });
  if (!res.ok) throw new Error(`Claude API error: ${res.status}`);
  return (await res.json()).content[0].text.trim();
}

function readAds() {
  try { return JSON.parse(fs.readFileSync(ADS_FILE, 'utf8')); }
  catch { return { campaigns: [] }; }
}

function randomMarket() {
  const m = config.priorityMarkets;
  return m[Math.floor(Math.random() * m.length)];
}

async function run() {
  log(AGENT_ID, 'info', 'Ad agent starting run…');
  const ads    = readAds();
  const market = randomMarket();
  const phone  = config.business.phone;
  const name   = config.business.name;

  const campaign = { id: Date.now(), date: new Date().toISOString(), market: market.name };

  try {
    // Facebook — best ROI platform for local home services
    campaign.facebook = await callClaude(
      `Write a Facebook paid ad for ${name}, a garage door repair company in ${market.name}, FL. ` +
      `Phone: ${phone}. Objective: get homeowners to call or click. ` +
      `Format:\nHEADLINE: (max 40 chars, create urgency)\nBODY: (max 90 words, relatable home situation, local reference, CTA)\nCTA_BUTTON: (one of: Call Now, Get Quote, Learn More)\n` +
      `Tone: friendly neighbor who happens to be a pro. No corporate speak. Mention same-day service.`
    );
    log(AGENT_ID, 'success', `Facebook ad generated for ${market.name}`);

    // Nextdoor — hyper-local, high trust for trades
    campaign.nextdoor = await callClaude(
      `Write a Nextdoor Business ad for ${name} in ${market.name}, FL. Phone: ${phone}. ` +
      `Max 80 words. Sound like a neighbor introducing their business, not an ad. ` +
      `Mention: local, licensed, same-day, free estimate. Include the phone number. No hashtags. ` +
      `Reference ${market.name} or ${market.county} County by name.`
    );
    log(AGENT_ID, 'success', `Nextdoor ad generated for ${market.name}`);

    // Instagram — visual service ad
    campaign.instagram = await callClaude(
      `Write an Instagram ad caption for ${name}, garage door repair in ${market.name} FL. ` +
      `Max 100 words. Start with a hook (broken spring scenario or before/after concept). ` +
      `Include: same-day service, ${market.name} FL, phone ${phone}. ` +
      `End with 4 local hashtags: #904GarageDoors #${market.name.replace(/\s+/g, '')}FL #NassauCounty #JacksonvilleFL`
    );
    log(AGENT_ID, 'success', `Instagram ad generated for ${market.name}`);

    ads.campaigns.unshift(campaign);
    ads.campaigns = ads.campaigns.slice(0, 30);
    ads.lastUpdated = new Date().toISOString();
    fs.writeFileSync(ADS_FILE, JSON.stringify(ads, null, 2));
    log(AGENT_ID, 'success', 'Ad agent run complete.');
  } catch (err) {
    log(AGENT_ID, 'error', `Ad agent error: ${err.message}`);
  }
}

module.exports = { run, AGENT_ID };
