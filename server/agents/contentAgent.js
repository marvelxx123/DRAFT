const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { log } = require('./logger');
const jaxConfig = require('./jaxConfig');

const AGENT_ID = 'content';
const ARTICLES_FILE = path.join(__dirname, '../../data/blog-articles.json');
const BRIEF_FILE    = path.join(__dirname, '../../data/content-brief.json');
const MAX_ARTICLES  = 20;

// ── Topic pool ────────────────────────────────────────────────────────────────
const TOPIC_POOL = [
  {
    title: 'How to tell if your garage door spring is about to break',
    customerType: 'maintenance',
    seoKeywords: ['garage door spring warning signs', 'broken garage door spring Jacksonville', 'garage door spring life', 'spring replacement Florida', 'garage door repair Jacksonville FL'],
  },
  {
    title: 'Why Florida humidity destroys garage door hardware faster (and what to do about it)',
    customerType: 'maintenance',
    seoKeywords: ['Florida humidity garage door', 'garage door rust Florida', 'humid climate garage door care', 'Jacksonville garage door maintenance', 'garage door hardware Florida'],
  },
  {
    title: 'Hurricane season garage door prep — Jacksonville homeowner guide',
    customerType: 'maintenance',
    seoKeywords: ['hurricane rated garage door Jacksonville', 'hurricane garage door prep Florida', 'garage door hurricane season', 'wind load garage door Jacksonville', 'storm proof garage door FL'],
  },
  {
    title: 'New construction garage door issues in Nocatee and Ponte Vedra',
    customerType: 'replacement',
    seoKeywords: ['Nocatee garage door problems', 'Ponte Vedra garage door installation', 'new construction garage door issues', 'garage door installer Nocatee FL', 'HOA garage door compliance Jacksonville'],
  },
  {
    title: 'Garage door opener not working? Try these fixes before calling a tech',
    customerType: 'emergency',
    seoKeywords: ['garage door opener not working Jacksonville', 'garage door opener troubleshooting', 'garage door won\'t open Florida', 'garage door opener fix Jacksonville', 'why won\'t my garage door open'],
  },
  {
    title: 'How long do garage door springs last in Florida\'s climate?',
    customerType: 'maintenance',
    seoKeywords: ['garage door spring lifespan Florida', 'how long do garage springs last', 'garage door spring replacement Jacksonville', 'Florida garage spring wear', 'garage door spring cycle life'],
  },
  {
    title: 'Salt air and garage doors — what beach homeowners in Jax Beach and Atlantic Beach need to know',
    customerType: 'maintenance',
    seoKeywords: ['Jacksonville Beach garage door', 'Atlantic Beach garage door corrosion', 'salt air garage door damage', 'coastal garage door maintenance Florida', 'garage door rust beach Jacksonville'],
  },
  {
    title: 'DIY garage door repair — what you can safely do yourself vs. what needs a pro',
    customerType: 'maintenance',
    seoKeywords: ['DIY garage door repair Jacksonville', 'garage door repair yourself Florida', 'when to call garage door tech', 'safe garage door DIY', 'garage door maintenance yourself Jacksonville'],
  },
  {
    title: 'How to choose a garage door company in Jacksonville (without getting ripped off)',
    customerType: 'replacement',
    seoKeywords: ['best garage door company Jacksonville FL', 'how to choose garage door repair company', 'garage door company Jacksonville reviews', 'trusted garage door Jacksonville', 'garage door contractor Jacksonville FL'],
  },
  {
    title: 'Garage door maintenance checklist for Florida homeowners',
    customerType: 'maintenance',
    seoKeywords: ['garage door maintenance checklist Florida', 'garage door tune up Jacksonville', 'annual garage door inspection FL', 'garage door care checklist Jacksonville', 'Florida garage door upkeep'],
  },
  {
    title: 'Emergency garage door repair — what to do when your door won\'t open',
    customerType: 'emergency',
    seoKeywords: ['emergency garage door repair Jacksonville FL', 'garage door won\'t open emergency', 'same day garage door repair Jacksonville', '24 hour garage door repair Jacksonville', 'garage door stuck Jacksonville FL'],
  },
  {
    title: 'Best garage door styles for Jacksonville and Ponte Vedra homes',
    customerType: 'replacement',
    seoKeywords: ['garage door styles Jacksonville FL', 'best garage doors Ponte Vedra', 'garage door design Florida homes', 'new garage door Jacksonville', 'garage door replacement styles Jacksonville'],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
async function callClaude(prompt, maxTokens = 1200) {
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

function readArticles() {
  try { return JSON.parse(fs.readFileSync(ARTICLES_FILE, 'utf8')); }
  catch { return []; }
}

function saveArticles(articles) {
  fs.mkdirSync(path.dirname(ARTICLES_FILE), { recursive: true });
  fs.writeFileSync(ARTICLES_FILE, JSON.stringify(articles, null, 2));
}

function readBrief() {
  try { return JSON.parse(fs.readFileSync(BRIEF_FILE, 'utf8')); }
  catch { return null; }
}

function toSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function estimateReadTime(html) {
  const wordCount = html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(wordCount / 200)) + ' min read';
}

function pickTopic(articles, brief) {
  const recentSlugs = new Set(articles.slice(0, 6).map(a => a.slug));

  // If the SEO agent left a brief, check if it references a topic in the pool
  if (brief && brief.priorityTopic) {
    const match = TOPIC_POOL.find(t =>
      t.title.toLowerCase().includes(brief.priorityTopic.toLowerCase()) ||
      brief.priorityTopic.toLowerCase().includes(t.title.toLowerCase().slice(0, 20))
    );
    if (match && !recentSlugs.has(toSlug(match.title))) {
      log(AGENT_ID, 'info', `Using SEO brief priority topic: "${match.title}"`);
      return match;
    }
  }

  // Otherwise pick the oldest-written topic (or random if all are fresh)
  const available = TOPIC_POOL.filter(t => !recentSlugs.has(toSlug(t.title)));
  if (available.length === 0) return TOPIC_POOL[Math.floor(Math.random() * TOPIC_POOL.length)];
  return available[Math.floor(Math.random() * available.length)];
}

// ── Main run ──────────────────────────────────────────────────────────────────
async function run() {
  log(AGENT_ID, 'info', 'Content agent starting run…');

  const articles = readArticles();
  const brief    = readBrief();
  const topic    = pickTopic(articles, brief);
  const month    = new Date().getMonth() + 1;
  const seasonal = jaxConfig.seasonalContext[String(month)] || '';
  const customerTypeData = jaxConfig.customerTypes[topic.customerType] || {};

  log(AGENT_ID, 'info', `Selected topic: "${topic.title}"`);

  try {
    // ── 1. Generate article HTML ──────────────────────────────────────────────
    const articlePrompt = `You are a helpful garage door expert writing a blog article for Jacksonville, FL homeowners.

Write a friendly, informative blog article on this topic:
"${topic.title}"

Guidelines:
- Tone: helpful, conversational, friendly — NOT salesy or pushy
- Length: 600–900 words (body content only)
- Format: clean HTML using only <h2>, <p>, and <ul>/<li> tags. No <h1>, no inline styles, no wrapper divs.
- Include specific local Florida/Jacksonville references where natural: humidity, hurricane season, salt air, Nocatee, Ponte Vedra, Jacksonville Beach, Atlantic Beach, Fleming Island, etc.
- Seasonal context for this month: ${seasonal}
- Customer mindset: ${customerTypeData.message || 'homeowner seeking practical help'}
- End with a brief practical tip or takeaway paragraph — do not include a phone number or business name
- Do NOT start with the article title as an h2

Output ONLY the HTML content. No markdown, no preamble.`;

    const htmlContent = await callClaude(articlePrompt, 1400);
    log(AGENT_ID, 'success', 'Article HTML generated');

    // ── 2. Generate meta description ─────────────────────────────────────────
    const metaPrompt = `Write a compelling SEO meta description (max 155 characters) for a blog article titled:
"${topic.title}"
The site is a garage door service platform for Jacksonville, FL homeowners.
Output ONLY the meta description text. No quotes.`;

    const metaDescription = (await callClaude(metaPrompt, 200)).slice(0, 155);
    log(AGENT_ID, 'success', 'Meta description generated');

    // ── 3. Assemble article record ────────────────────────────────────────────
    const slug = toSlug(topic.title);
    const article = {
      id:               Date.now(),
      title:            topic.title,
      slug,
      metaDescription,
      customerType:     topic.customerType,
      seoKeywords:      topic.seoKeywords,
      estimatedReadTime: estimateReadTime(htmlContent),
      content:          htmlContent,
      publishedAt:      new Date().toISOString(),
    };

    articles.unshift(article);
    saveArticles(articles.slice(0, MAX_ARTICLES));

    log(AGENT_ID, 'success', `Article saved: /blog/${slug} (${article.estimatedReadTime})`);
    log(AGENT_ID, 'success', 'Content agent run complete.');
  } catch (err) {
    log(AGENT_ID, 'error', `Content agent error: ${err.message}`);
  }
}

module.exports = { run, AGENT_ID };
