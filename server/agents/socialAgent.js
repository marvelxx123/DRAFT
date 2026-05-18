const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { log } = require('./logger');

const AGENT_ID = 'social';
const SOCIAL_FILE = path.join(__dirname, '../../data/social-content.json');

// Run interval: 8 hours (registered in agentRunner)
const INTERVAL_MS = 8 * 60 * 60 * 1000;

const MAX_PACKS = 30;

const PRODUCTS = [
  'Custom T-Shirts', 'Printed Hoodies', 'Personalized Mugs', 'Custom Caps',
  'Printed Tote Bags', 'Custom Sunglasses', 'Personalized Socks',
  'Custom Phone Cases', 'Printed Stickers', 'Custom Canvas Prints',
];

const DEALS = [
  '20% off your first order', 'Free shipping this weekend',
  'Buy 2 get 1 free on tees', 'Flash sale — 30% off hoodies',
  '3 for the price of 2 on mugs', 'Limited drop: new product launch',
];

async function callClaude(prompt, maxTokens = 900) {
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
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Claude API error: ${res.status}`);
  const data = await res.json();
  return data.content[0].text.trim();
}

function readSocialContent() {
  try { return JSON.parse(fs.readFileSync(SOCIAL_FILE, 'utf8')); }
  catch { return []; }
}

/** Pick a random element from an array */
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function generateInstagramPost(product, deal) {
  const raw = await callClaude(
    `Write an Instagram post for WEARIT, a bold custom print-on-demand streetwear brand.\n` +
    `Featured product: ${product}\n` +
    `Deal/angle: ${deal}\n\n` +
    `Requirements:\n` +
    `- Caption: max 150 words, punchy streetwear tone, includes one CTA linking to wearit.com\n` +
    `- 10 relevant hashtags (mix of niche and broad)\n` +
    `- Image description: describe the ideal photo/graphic for this post (2–3 sentences)\n\n` +
    `Output EXACTLY:\n` +
    `CAPTION:\n[caption text]\n\n` +
    `HASHTAGS:\n[all 10 hashtags on one line]\n\n` +
    `IMAGE:\n[image description]`,
    600
  );

  const captionMatch   = raw.match(/CAPTION:\s*([\s\S]*?)(?=HASHTAGS:|$)/i);
  const hashtagsMatch  = raw.match(/HASHTAGS:\s*([\s\S]*?)(?=IMAGE:|$)/i);
  const imageMatch     = raw.match(/IMAGE:\s*([\s\S]*?)$/i);

  return {
    platform: 'instagram',
    caption:  (captionMatch?.[1] || '').trim(),
    hashtags: (hashtagsMatch?.[1] || '').trim(),
    imageDescription: (imageMatch?.[1] || '').trim(),
  };
}

async function generateFacebookPost(product, deal) {
  const raw = await callClaude(
    `Write a Facebook post for WEARIT, a custom print-on-demand streetwear brand.\n` +
    `Featured product: ${product}\n` +
    `Deal/angle: ${deal}\n\n` +
    `Requirements:\n` +
    `- Max 200 words. Conversational but energetic. Tell a mini-story or use a relatable hook.\n` +
    `- Include a clear CTA (e.g., "Shop now at wearit.com").\n` +
    `- Can use 1–2 emoji. Mention the deal.\n` +
    `- Suitable for Facebook's slightly older, community-focused audience vs Instagram.\n\n` +
    `Output just the post text — no labels, no extra formatting.`,
    500
  );
  return {
    platform: 'facebook',
    caption: raw,
  };
}

async function generateTwitterThread(product, deal) {
  const raw = await callClaude(
    `Write a Twitter/X thread for WEARIT, a custom print-on-demand streetwear brand.\n` +
    `Topic: ${product} | Deal: ${deal}\n\n` +
    `Requirements:\n` +
    `- 5 tweets forming a coherent thread\n` +
    `- Each tweet STRICTLY max 240 characters (including spaces and numbers like "1/5")\n` +
    `- Tweet 1: bold hook that stops the scroll\n` +
    `- Tweets 2–4: build the story (quality, customization, streetwear culture, FOMO)\n` +
    `- Tweet 5: CTA — link to wearit.com and the deal\n` +
    `- Add thread numbering: start each with "1/5", "2/5", etc.\n\n` +
    `Output EXACTLY:\n` +
    `TWEET1: [text]\n` +
    `TWEET2: [text]\n` +
    `TWEET3: [text]\n` +
    `TWEET4: [text]\n` +
    `TWEET5: [text]`,
    700
  );

  const tweets = [];
  const matches = raw.match(/TWEET\d:\s*(.+?)(?=TWEET\d:|$)/gs) || [];
  for (const m of matches) {
    const text = m.replace(/^TWEET\d:\s*/i, '').trim().slice(0, 240);
    tweets.push(text);
  }
  while (tweets.length < 5) tweets.push(`Design your own ${product} at wearit.com. ${deal}. #WEARIT`.slice(0, 240));

  return {
    platform: 'twitter',
    tweets: tweets.slice(0, 5),
  };
}

async function generateTikTokScript(product) {
  const raw = await callClaude(
    `Write a TikTok video script for WEARIT, a custom print-on-demand streetwear brand.\n` +
    `Featured product: ${product}\n\n` +
    `Requirements:\n` +
    `- Hook (first 3 seconds): one ultra-punchy line or question that stops the scroll, max 15 words\n` +
    `- Full script: 30-second script (approx 75–90 words when spoken). Natural, fast-paced, Gen-Z friendly.\n` +
    `  Cover: the problem (boring clothes/gifts), the solution (WEARIT custom print), the CTA (wearit.com).\n` +
    `- Include notes on visuals or transitions in [brackets]\n\n` +
    `Output EXACTLY:\n` +
    `HOOK:\n[hook text]\n\n` +
    `SCRIPT:\n[full 30-second script]`,
    600
  );

  const hookMatch   = raw.match(/HOOK:\s*([\s\S]*?)(?=SCRIPT:|$)/i);
  const scriptMatch = raw.match(/SCRIPT:\s*([\s\S]*?)$/i);

  return {
    platform: 'tiktok',
    hook:   (hookMatch?.[1] || '').trim(),
    script: (scriptMatch?.[1] || '').trim(),
  };
}

async function generatePinterestPin(product) {
  const raw = await callClaude(
    `Write Pinterest pin content for WEARIT, a custom print-on-demand streetwear brand.\n` +
    `Featured product: ${product}\n\n` +
    `Requirements:\n` +
    `- Title: max 100 characters, keyword-rich, appealing to DIY/creative/fashion audience\n` +
    `- Description: max 500 characters, SEO-friendly, describes the product and the WEARIT experience. End with a CTA.\n` +
    `- Board suggestion: name of the Pinterest board this pin fits best\n\n` +
    `Output EXACTLY:\n` +
    `TITLE:\n[title]\n\n` +
    `DESCRIPTION:\n[description]\n\n` +
    `BOARD:\n[board name]`,
    400
  );

  const titleMatch  = raw.match(/TITLE:\s*([\s\S]*?)(?=DESCRIPTION:|$)/i);
  const descMatch   = raw.match(/DESCRIPTION:\s*([\s\S]*?)(?=BOARD:|$)/i);
  const boardMatch  = raw.match(/BOARD:\s*([\s\S]*?)$/i);

  return {
    platform:    'pinterest',
    title:       (titleMatch?.[1] || '').trim().slice(0, 100),
    description: (descMatch?.[1]  || '').trim().slice(0, 500),
    board:       (boardMatch?.[1] || '').trim(),
  };
}

async function run() {
  log(AGENT_ID, 'info', 'Social agent starting run…');

  // Ensure data directory exists
  const dataDir = path.join(__dirname, '../../data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  const product = pick(PRODUCTS);
  const deal    = pick(DEALS);
  log(AGENT_ID, 'info', `Generating content pack — Product: "${product}" | Deal: "${deal}"`);

  try {
    const [instagram, facebook, twitter, tiktok, pinterest] = await Promise.all([
      generateInstagramPost(product, deal),
      generateFacebookPost(product, deal),
      generateTwitterThread(product, deal),
      generateTikTokScript(product),
      generatePinterestPin(product),
    ]);

    const pack = {
      id: Date.now(),
      generatedAt: new Date().toISOString(),
      product,
      deal,
      content: { instagram, facebook, twitter, tiktok, pinterest },
    };

    log(AGENT_ID, 'success', 'Instagram post generated');
    log(AGENT_ID, 'success', 'Facebook post generated');
    log(AGENT_ID, 'success', `Twitter thread generated (${twitter.tweets.length} tweets)`);
    log(AGENT_ID, 'success', 'TikTok script generated');
    log(AGENT_ID, 'success', 'Pinterest pin generated');

    // Load existing packs, prepend new one, keep last MAX_PACKS
    const packs = readSocialContent();
    packs.unshift(pack);
    const trimmed = packs.slice(0, MAX_PACKS);
    fs.writeFileSync(SOCIAL_FILE, JSON.stringify(trimmed, null, 2), 'utf8');

    log(AGENT_ID, 'success', `Social content pack saved → data/social-content.json (${trimmed.length} packs total)`);
    log(AGENT_ID, 'success', 'Social agent run complete.');
  } catch (err) {
    log(AGENT_ID, 'error', `Social agent error: ${err.message}`);
  }
}

module.exports = { run, AGENT_ID, INTERVAL_MS };
