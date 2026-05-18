const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { log } = require('./logger');

const AGENT_ID = 'ads';
const ADS_FILE = path.join(__dirname, '../../data/generated-ads.json');

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
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Claude API error: ${res.status}`);
  const data = await res.json();
  return data.content[0].text.trim();
}

function readAds() {
  try { return JSON.parse(fs.readFileSync(ADS_FILE, 'utf8')); }
  catch { return { campaigns: [] }; }
}

async function run() {
  log(AGENT_ID, 'info', 'Ad agent starting run…');
  const ads = readAds();

  try {
    // 1. Instagram ad copy
    const igCopy = await callClaude(
      'Write an Instagram ad caption for WEARIT, a custom print-on-demand store. ' +
      'Include 1 call to action, 3-5 relevant hashtags, streetwear tone. Max 60 words.'
    );

    // 2. Twitter/X ad copy
    const twitterCopy = await callClaude(
      'Write a Twitter/X ad for WEARIT custom print-on-demand. Max 240 chars. ' +
      'Bold, punchy, includes a link placeholder [LINK] and 2 hashtags.'
    );

    // 3. Discount code idea
    const discountIdea = await callClaude(
      'Suggest ONE creative discount campaign for a custom print-on-demand store. ' +
      'Give: campaign name, discount percentage (10-30%), and one-sentence description. ' +
      'Format: NAME | PERCENT% | DESCRIPTION'
    );

    const campaign = {
      id: Date.now(),
      date: new Date().toISOString(),
      instagram: igCopy,
      twitter: twitterCopy,
      discount: discountIdea,
    };

    ads.campaigns.unshift(campaign);
    ads.campaigns = ads.campaigns.slice(0, 30); // keep last 30 campaigns
    ads.lastUpdated = new Date().toISOString();
    fs.writeFileSync(ADS_FILE, JSON.stringify(ads, null, 2));

    log(AGENT_ID, 'success', 'Instagram ad copy generated');
    log(AGENT_ID, 'success', 'Twitter/X ad copy generated');
    log(AGENT_ID, 'success', `Discount campaign: ${discountIdea.split('|')[0].trim()}`);
    log(AGENT_ID, 'success', 'Ad agent run complete.');
  } catch (err) {
    log(AGENT_ID, 'error', `Ad agent error: ${err.message}`);
  }
}

module.exports = { run, AGENT_ID };
