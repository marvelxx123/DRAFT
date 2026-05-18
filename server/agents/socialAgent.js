const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { log } = require('./logger');

const AGENT_ID = 'social';
const SOCIAL_FILE = path.join(__dirname, '../../data/social-content.json');

const PRODUCTS = ['Custom T-Shirts', 'Custom Hoodies', 'Personalized Mugs', 'Custom Sunglasses', 'Custom Caps', 'Tote Bags', 'Custom Socks', 'Canvas Prints', 'Keychains', 'Custom Phone Cases'];
const THEMES = ['new drop', 'customer spotlight', 'behind the scenes', 'product feature', 'limited time offer', 'styling tips'];

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

async function run() {
  log(AGENT_ID, 'info', 'Social media agent starting…');
  const product = PRODUCTS[Math.floor(Math.random() * PRODUCTS.length)];
  const theme   = THEMES[Math.floor(Math.random() * THEMES.length)];
  log(AGENT_ID, 'info', `Theme: "${theme}" · Product focus: ${product}`);

  const content = readContent();
  const pack = { id: Date.now(), date: new Date().toISOString(), product, theme };

  try {
    // Instagram
    pack.instagram = await callClaude(
      `Write an Instagram post caption for WEARIT (custom print-on-demand store). Theme: "${theme}". Product: ${product}. ` +
      `Bold streetwear tone. Include a call to action (link in bio). End with 8 relevant hashtags. Max 180 words total.`
    );
    log(AGENT_ID, 'success', 'Instagram caption generated');

    // Facebook
    pack.facebook = await callClaude(
      `Write a Facebook post for WEARIT custom print-on-demand store. Theme: "${theme}". Product: ${product}. ` +
      `Conversational, community-focused tone. Include a question to drive comments. Include a CTA with URL https://wearit.com. Max 150 words.`
    );
    log(AGENT_ID, 'success', 'Facebook post generated');

    // Twitter/X thread
    pack.twitter_thread = await callClaude(
      `Write a 4-tweet Twitter/X thread for WEARIT (custom print-on-demand). Theme: "${theme}". Product: ${product}. ` +
      `Each tweet max 240 chars. Number them 1/ 2/ 3/ 4/. Last tweet has CTA. Punchy, bold tone.`
    );
    log(AGENT_ID, 'success', 'Twitter/X thread generated');

    // TikTok script
    pack.tiktok = await callClaude(
      `Write a TikTok video script for WEARIT. Theme: "${theme}". Product: ${product}. ` +
      `Format: HOOK (first 3 seconds, max 15 words), then BODY (30-second script, natural spoken language), then CTA. ` +
      `Trend-aware, energetic, Gen-Z friendly tone.`
    );
    log(AGENT_ID, 'success', 'TikTok script generated');

    // Pinterest
    pack.pinterest = {
      title: await callClaude(`Write a Pinterest pin title for a ${product} product from WEARIT. Max 80 chars. SEO-optimized. No emoji.`),
      description: await callClaude(`Write a Pinterest pin description for ${product} from WEARIT. 200-280 chars. Include keywords, benefits, and a subtle CTA. SEO-focused.`),
      board: `Custom ${product.split(' ').pop()} Ideas`,
    };
    log(AGENT_ID, 'success', 'Pinterest pin generated');

    content.packs.unshift(pack);
    content.packs = content.packs.slice(0, 30);
    content.lastUpdated = new Date().toISOString();
    fs.writeFileSync(SOCIAL_FILE, JSON.stringify(content, null, 2));
    log(AGENT_ID, 'success', 'Social content pack saved. Agent run complete.');
  } catch (err) {
    log(AGENT_ID, 'error', `Social agent error: ${err.message}`);
  }
}

module.exports = { run, AGENT_ID };
