const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { log } = require('./logger');
const jaxConfig = require('./jaxConfig');

const AGENT_ID    = 'seo';
const SEO_FILE    = path.join(__dirname, '../../data/generated-seo.json');
const ARTICLES_FILE = path.join(__dirname, '../../data/blog-articles.json');
const BRIEF_FILE  = path.join(__dirname, '../../data/content-brief.json');
const SITEMAP_FILE = path.join(__dirname, '../../sitemap.xml');

const SITE_URL = process.env.SITE_URL || 'https://904garagedoors.com';

// ── City pages (16 pages, no .html extension) ─────────────────────────────────
const CITY_PAGES = [
  'ponte-vedra',
  'jacksonville-beach',
  'fernandina-beach',
  'yulee',
  'nocatee',
  'mandarin',
  'orange-park',
  'fleming-island',
  'neptune-beach',
  'atlantic-beach',
  'bartram-park',
  'arlington',
  'southside',
  'st-johns',
  'middleburg',
  'ortega',
];

// ── Markets to generate keyword strategy for ──────────────────────────────────
const KEYWORD_MARKETS = ['Jacksonville', 'Ponte Vedra', 'Jacksonville Beach', 'Palm Coast'];

// ── Claude API helper ─────────────────────────────────────────────────────────
async function callClaude(prompt, maxTokens = 700) {
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

// ── File helpers ──────────────────────────────────────────────────────────────
function readArticles() {
  try { return JSON.parse(fs.readFileSync(ARTICLES_FILE, 'utf8')); }
  catch { return []; }
}

function readSeo() {
  try { return JSON.parse(fs.readFileSync(SEO_FILE, 'utf8')); }
  catch { return {}; }
}

// ── Sitemap builder ───────────────────────────────────────────────────────────
function writeSitemap(articles) {
  const now = new Date().toISOString().split('T')[0];

  const homepageUrl = `  <url><loc>${SITE_URL}/</loc><changefreq>weekly</changefreq><priority>1.0</priority><lastmod>${now}</lastmod></url>`;

  const cityUrls = CITY_PAGES.map(slug =>
    `  <url><loc>${SITE_URL}/garage-door-repair-${slug}</loc><changefreq>monthly</changefreq><priority>0.8</priority><lastmod>${now}</lastmod></url>`
  );

  const blogIndexUrl = `  <url><loc>${SITE_URL}/blog</loc><changefreq>weekly</changefreq><priority>0.7</priority><lastmod>${now}</lastmod></url>`;

  const blogArticleUrls = articles.map(article =>
    `  <url><loc>${SITE_URL}/blog/${article.slug}</loc><changefreq>monthly</changefreq><priority>0.6</priority><lastmod>${now}</lastmod></url>`
  );

  const allUrls = [homepageUrl, ...cityUrls, blogIndexUrl, ...blogArticleUrls].join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${allUrls}\n</urlset>`;
  fs.writeFileSync(SITEMAP_FILE, xml);
}

// ── SEO metadata for a single city page ──────────────────────────────────────
async function generateCityPageSeo(citySlug) {
  const cityName = citySlug
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  const marketData = jaxConfig.markets[cityName] || {};
  const marketNotes = marketData.notes || '';

  const prompt = `Write SEO metadata for a garage door repair service page targeting ${cityName}, FL.
Market context: ${marketNotes || 'Jacksonville area homeowners'}
Business: 904 Garage Doors — same-day garage door repair, spring replacement, opener installation, Jacksonville FL area.

Output exactly:
TITLE: [max 60 chars — include "${cityName}" and "garage door repair"]
DESCRIPTION: [max 155 chars — local, helpful, include city name]

No extra text.`;

  const raw = await callClaude(prompt, 250);
  const titleMatch = raw.match(/TITLE:\s*(.+)/);
  const descMatch  = raw.match(/DESCRIPTION:\s*(.+)/);
  return {
    title:       (titleMatch ? titleMatch[1].trim() : `Garage Door Repair ${cityName} FL | 904 Garage Doors`).slice(0, 60),
    description: (descMatch  ? descMatch[1].trim()  : `Same-day garage door repair in ${cityName}. Fast response, trusted local pros. Call now.`).slice(0, 155),
  };
}

// ── Keyword strategy for a market ────────────────────────────────────────────
async function generateKeywordStrategy(market, seasonalContext) {
  const marketData = jaxConfig.markets[market] || {};
  const prompt = `Generate the top 5 SEO keyword phrases to target this week for a garage door repair service in ${market}, FL.
Seasonal context: ${seasonalContext}
Market notes: ${marketData.notes || 'Jacksonville area homeowners'}
Focus on buyer intent. One keyword phrase per line. No numbering. No extra text.`;

  const raw = await callClaude(prompt, 200);
  return raw.split('\n').filter(Boolean).map(k => k.trim()).slice(0, 5);
}

// ── Content brief for next content agent run ─────────────────────────────────
async function generateContentBrief(articles, seasonalContext, keywordStrategy) {
  const recentTitles = articles.slice(0, 5).map(a => `- ${a.title}`).join('\n') || '(none yet)';
  const topKeywords = Object.values(keywordStrategy).flat().slice(0, 10).join(', ');

  const prompt = `You coordinate content for 904 Garage Doors, a Jacksonville FL garage door lead gen site.

Recent articles already published:
${recentTitles}

Top SEO keywords to target: ${topKeywords}
Seasonal context: ${seasonalContext}

Based on keyword gaps and seasonal context, recommend the single most important article topic to write next.
Output exactly:
TOPIC: [one specific article title]
REASON: [one sentence explaining why]`;

  const raw = await callClaude(prompt, 250);
  const topicMatch  = raw.match(/TOPIC:\s*(.+)/);
  const reasonMatch = raw.match(/REASON:\s*(.+)/);
  return {
    priorityTopic:  topicMatch  ? topicMatch[1].trim()  : null,
    reason:         reasonMatch ? reasonMatch[1].trim() : null,
    seasonalContext,
    generatedAt: new Date().toISOString(),
  };
}

// ── Main run ──────────────────────────────────────────────────────────────────
async function run() {
  log(AGENT_ID, 'info', 'SEO agent starting run…');

  const month = new Date().getMonth() + 1;
  const seasonalContext = jaxConfig.seasonalContext[String(month)] || '';
  const articles = readArticles();
  const seo = readSeo();

  try {
    // ── 1. Homepage SEO ───────────────────────────────────────────────────────
    log(AGENT_ID, 'info', 'Generating homepage SEO metadata…');
    const homepageMeta = await callClaude(
      `Write SEO metadata for 904 Garage Doors — a Jacksonville FL garage door repair and lead gen platform.
USP: ${jaxConfig.usp}
Services: ${jaxConfig.services.slice(0, 5).join(', ')}
Seasonal context: ${seasonalContext}

Output exactly:
TITLE: [max 60 chars]
DESCRIPTION: [max 155 chars — local, urgent, helpful]

No extra text.`,
      250
    );
    const hTitleMatch = homepageMeta.match(/TITLE:\s*(.+)/);
    const hDescMatch  = homepageMeta.match(/DESCRIPTION:\s*(.+)/);
    seo.homepage = {
      title:       (hTitleMatch ? hTitleMatch[1].trim() : '904 Garage Doors | Jacksonville FL Garage Door Repair').slice(0, 60),
      description: (hDescMatch  ? hDescMatch[1].trim()  : 'Same-day garage door repair in Jacksonville FL. Fast response, trusted local pros.').slice(0, 155),
    };
    log(AGENT_ID, 'success', `Homepage title: "${seo.homepage.title}"`);

    // ── 2. City page SEO ──────────────────────────────────────────────────────
    log(AGENT_ID, 'info', `Generating SEO for ${CITY_PAGES.length} city pages…`);
    seo.cityPages = {};
    for (const slug of CITY_PAGES) {
      seo.cityPages[slug] = await generateCityPageSeo(slug);
      log(AGENT_ID, 'info', `  City page: ${slug} — "${seo.cityPages[slug].title}"`);
    }
    log(AGENT_ID, 'success', `City page SEO complete (${CITY_PAGES.length} pages)`);

    // ── 3. Blog article SEO metadata ─────────────────────────────────────────
    seo.blogArticles = {};
    if (articles.length > 0) {
      log(AGENT_ID, 'info', `Indexing SEO for ${articles.length} blog articles…`);
      for (const article of articles) {
        seo.blogArticles[article.slug] = {
          title:       `${article.title} | 904 Garage Doors`.slice(0, 60),
          description: article.metaDescription || '',
          keywords:    article.seoKeywords || [],
          customerType: article.customerType || '',
        };
      }
      log(AGENT_ID, 'success', `Blog article SEO indexed (${articles.length} articles)`);
    } else {
      log(AGENT_ID, 'info', 'No blog articles found yet — skipping blog SEO');
    }

    // ── 4. Keyword strategy by market ────────────────────────────────────────
    log(AGENT_ID, 'info', 'Generating keyword strategy by market…');
    seo.keywordStrategy = {};
    for (const market of KEYWORD_MARKETS) {
      seo.keywordStrategy[market] = await generateKeywordStrategy(market, seasonalContext);
      log(AGENT_ID, 'info', `  ${market}: ${seo.keywordStrategy[market].join(' | ')}`);
    }
    log(AGENT_ID, 'success', 'Keyword strategy complete');

    // ── 5. Update sitemap ─────────────────────────────────────────────────────
    writeSitemap(articles);
    const totalPages = 1 + CITY_PAGES.length + 1 + articles.length; // home + cities + blog index + articles
    log(AGENT_ID, 'success', `sitemap.xml updated (${totalPages} URLs)`);

    // ── 6. Generate content brief for next content agent run ─────────────────
    log(AGENT_ID, 'info', 'Generating content brief…');
    const brief = await generateContentBrief(articles, seasonalContext, seo.keywordStrategy);
    fs.mkdirSync(path.dirname(BRIEF_FILE), { recursive: true });
    fs.writeFileSync(BRIEF_FILE, JSON.stringify(brief, null, 2));
    log(AGENT_ID, 'success', `Content brief saved. Priority topic: "${brief.priorityTopic}"`);

    // ── 7. Save all SEO data ──────────────────────────────────────────────────
    seo.lastUpdated = new Date().toISOString();
    seo.seasonalContext = seasonalContext;
    fs.mkdirSync(path.dirname(SEO_FILE), { recursive: true });
    fs.writeFileSync(SEO_FILE, JSON.stringify(seo, null, 2));

    log(AGENT_ID, 'success', 'SEO agent run complete.');
  } catch (err) {
    log(AGENT_ID, 'error', `SEO agent error: ${err.message}`);
  }
}

module.exports = { run, AGENT_ID };
