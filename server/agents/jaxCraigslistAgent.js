const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { log } = require('./logger');
const cfg = require('./jaxConfig');
const { getInstructions } = require('../services/memory');

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
  catch {
    return {
      foundLeads: [],
      ads: [],
      lastPostedAt: null,
      postingDue: false,
      lastRun: null,
    };
  }
}

// ── RSS FEED URLS ──────────────────────────────────────────────────────────────
const RSS_FEEDS = [
  { url: 'https://jacksonville.craigslist.org/search/lbg?query=garage+door&format=rss', source: 'labor/gigs' },
  { url: 'https://jacksonville.craigslist.org/search/hss?query=garage+door&format=rss', source: 'household services' },
  { url: 'https://jacksonville.craigslist.org/search/sss?query=garage+door+repair&format=rss', source: 'for sale/general' },
];

// Words that indicate someone NEEDS help
const NEED_WORDS = ['need', 'broken', 'fix', "won't open", 'stuck', 'repair', 'help', 'spring', 'cable', 'emergency', 'opener', 'not working', 'broke', 'snapped', 'jammed', 'wont open', 'looking for', 'need someone', 'anyone know', 'anyone have', 'can someone', 'recommend'];

// Words that indicate someone is OFFERING services (exclude these)
const AD_WORDS = ['we offer', 'call us', 'professional service', 'years experience', 'year experience', 'our team', 'we specialize', 'we provide', 'family owned', 'fully licensed', 'free estimates', 'serving jacksonville', 'we are', 'my company', 'our company', 'book online', 'visit our', 'website'];

function extractItems(xml) {
  const items = [];
  // Find all <item>...</item> blocks
  const itemRe = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRe.exec(xml)) !== null) {
    const block = match[1];
    const get = (tag) => {
      const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
      const m = re.exec(block);
      if (!m) return '';
      // Strip CDATA and HTML tags
      return m[1]
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
    };
    const title = get('title');
    const link  = get('link') || get('guid');
    const desc  = get('description') || get('encoded') || '';
    const pubDate = get('pubDate');
    if (title || link) {
      items.push({ title, link, description: desc, pubDate });
    }
  }
  return items;
}

function looksLikeLead(item) {
  const text = `${item.title} ${item.description}`.toLowerCase();
  const hasNeed = NEED_WORDS.some(w => text.includes(w));
  const isAd = AD_WORDS.some(w => text.includes(w));
  return hasNeed && !isAd;
}

async function fetchFeed(feedUrl) {
  try {
    const res = await fetch(feedUrl, { timeout: 12000 });
    if (!res.ok) return [];
    const xml = await res.text();
    return extractItems(xml);
  } catch (err) {
    log(AGENT_ID, 'warn', `Failed to fetch RSS feed ${feedUrl}: ${err.message}`);
    return [];
  }
}

async function generateLeadReply(item) {
  const prompt =
    `You are responding on behalf of 904 Garage Doors, a garage door service platform in Jacksonville FL.\n` +
    `Someone posted this on Craigslist:\n` +
    `Title: "${item.title}"\n` +
    `Post: "${item.description.slice(0, 300)}"\n\n` +
    `Write a short Craigslist reply. Max 60 words. Professional but approachable. ` +
    `Say we can get someone out same day or next day. Include phone number (904) 468-3428. ` +
    `No bullet points, no markdown, no fake names. ` +
    `Never promise specific pricing or outcomes. Use "we can get someone out to you" not "we fix" or "we repair". ` +
    `Sign off as 904 Garage Doors.`;
  try {
    return await callClaude(prompt);
  } catch (err) {
    log(AGENT_ID, 'warn', `Reply gen failed for lead "${item.title}": ${err.message}`);
    return `Hi, saw your post — 904 Garage Doors here. We can get someone out to you same day or tomorrow to take a look. Give us a call at (904) 468-3428 and we'll get it sorted. — 904 Garage Doors`;
  }
}

// ── AD GENERATION ─────────────────────────────────────────────────────────────
const AD_TYPES = [
  { type: 'emergency', title: 'SAME DAY Garage Door Service – Jacksonville' },
  { type: 'spring',    title: 'Broken Spring? Same-Day Response – JAX Area' },
  { type: 'opener',   title: 'Garage Door Opener Install/Replace – Jacksonville' },
  { type: 'tune',     title: 'Garage Door Tune-Up Special – All Jacksonville Areas' },
  { type: 'new',      title: 'New Garage Door Installation – Jacksonville & Surrounding' },
  { type: 'cable',    title: 'Garage Door Cable Issue? Fast Response – Jacksonville FL' },
];

const context = `Business: ${cfg.businessName}. Phone: ${cfg.phone}. Areas: ${cfg.areas.join(', ')}. USP: ${cfg.usp}. Services: ${cfg.services.join(', ')}.`;

async function generateAd(adType) {
  const learned = getInstructions('craigslist');
  return await callClaude(
    `Write a Craigslist "Services" listing body for a garage door dispatch platform in Jacksonville FL. ` +
    `${context} Ad type: "${adType.type}" service. ` +
    `Format: short punchy opening line, bullet list of 5-7 key service points, ` +
    `availability (same-day, 7 days a week), service area, and call to action with phone. ` +
    `Total max 200 words. Plain text, no markdown. Sound professional and trustworthy. ` +
    `Use language like "we dispatch a pro to you" not "we fix" or "we repair". ` +
    `Never mention flat-rate pricing or guarantees. Do not claim licensed or insured.\n` +
    `PERFORMANCE INTELLIGENCE (use this to sharpen targeting): ${learned}`
  );
}

// ── POSTING REMINDER ─────────────────────────────────────────────────────────
const POSTING_THRESHOLD_HOURS = 47;

function checkPostingDue(lastPostedAt) {
  if (!lastPostedAt) return true;
  const msSince = Date.now() - new Date(lastPostedAt).getTime();
  const hoursSince = msSince / (1000 * 60 * 60);
  return hoursSince >= POSTING_THRESHOLD_HOURS;
}

// ── MAIN RUN ──────────────────────────────────────────────────────────────────
async function run() {
  log(AGENT_ID, 'info', 'Craigslist agent starting…');
  const data = readData();

  // ── A) SCAN FOR LEADS ──────────────────────────────────────────────────────
  log(AGENT_ID, 'info', 'Scanning Craigslist RSS feeds for leads…');
  const seenLinks = new Set((data.foundLeads || []).map(l => l.link));
  const newLeads = [];

  for (const feed of RSS_FEEDS) {
    const items = await fetchFeed(feed.url);
    log(AGENT_ID, 'info', `Feed "${feed.source}": ${items.length} items found`);
    for (const item of items) {
      if (!item.link || seenLinks.has(item.link)) continue;
      if (!looksLikeLead(item)) continue;
      seenLinks.add(item.link);
      const replyTemplate = await generateLeadReply(item);
      newLeads.push({
        id: Date.now() + Math.floor(Math.random() * 10000),
        title: item.title,
        link: item.link,
        description: item.description.slice(0, 200),
        pubDate: item.pubDate,
        source: feed.source,
        replyTemplate,
        foundAt: new Date().toISOString(),
      });
    }
  }

  if (newLeads.length > 0) {
    log(AGENT_ID, 'success', `Found ${newLeads.length} new Craigslist lead(s)`);
  } else {
    log(AGENT_ID, 'info', 'No new leads found this run');
  }

  data.foundLeads = [...newLeads, ...(data.foundLeads || [])].slice(0, 20);

  // ── B) GENERATE AD COPY ───────────────────────────────────────────────────
  const adType = AD_TYPES[Math.floor(Math.random() * AD_TYPES.length)];
  const adBody = await generateAd(adType);
  log(AGENT_ID, 'success', `Craigslist ad generated: "${adType.title}"`);

  const adEntry = {
    id: Date.now(),
    date: new Date().toISOString(),
    type: adType.type,
    title: adType.title,
    body: adBody,
    postingInstructions: [
      `Go to craigslist.org → Jacksonville → Services → Skilled Trades`,
      `Title: "${adType.title}"`,
      `Category: Skilled Trades`,
      `Location: Jacksonville, FL`,
      `Renew every 48 hours to stay at the top`,
      `Post from a different email each time to avoid Craigslist flagging`,
    ],
  };

  data.ads = [adEntry, ...(data.ads || [])].slice(0, 30);

  // ── C) POSTING REMINDER ───────────────────────────────────────────────────
  data.postingDue = checkPostingDue(data.lastPostedAt);
  if (data.postingDue) {
    log(AGENT_ID, 'warn', 'Craigslist posting is overdue — reminder set');
  }

  // ── SAVE ──────────────────────────────────────────────────────────────────
  data.lastRun = new Date().toISOString();
  fs.writeFileSync(OUT_FILE, JSON.stringify(data, null, 2));
  log(AGENT_ID, 'success', `Craigslist agent complete. ${newLeads.length} leads, 1 ad saved.`);
}

module.exports = { run, AGENT_ID };
