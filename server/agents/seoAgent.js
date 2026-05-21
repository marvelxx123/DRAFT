const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { log } = require('./logger');
const config = require('../../jaxConfig');

const AGENT_ID = 'seo';
const SEO_FILE = path.join(__dirname, '../../data/generated-seo.json');
const SITEMAP_FILE = path.join(__dirname, '../../sitemap.xml');

async function callClaude(prompt) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 700,
      messages: [{ role: 'user', content: prompt }] }),
  });
  if (!res.ok) throw new Error(`Claude API error: ${res.status}`);
  return (await res.json()).content[0].text.trim();
}

function writeSitemap(siteUrl) {
  const pages = [
    { path: '/',          changefreq: 'weekly',  priority: '1.0' },
    { path: '/904.html',  changefreq: 'weekly',  priority: '1.0' },
    { path: '/daily5.html', changefreq: 'daily', priority: '0.6' },
  ];
  // One page per service area for local SEO
  const areas = config.serviceZones.filter(z => z.length > 4);
  const now = new Date().toISOString().split('T')[0];

  const pageUrls = pages.map(p =>
    `  <url><loc>${siteUrl}${p.path}</loc><lastmod>${now}</lastmod><changefreq>${p.changefreq}</changefreq><priority>${p.priority}</priority></url>`
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pageUrls.join('\n')}
</urlset>`;
  fs.writeFileSync(SITEMAP_FILE, xml);
}

async function run() {
  log(AGENT_ID, 'info', 'SEO agent starting run…');
  const siteUrl = process.env.SITE_URL || 'https://904garagedoors.com';
  const phone   = config.business.phone;
  const seo = {};

  try {
    // 1. Meta title & description for the 904 landing page
    const meta = await callClaude(
      `Write SEO meta title (max 60 chars) and meta description (max 155 chars) for ` +
      `904 Garage Doors, a garage door repair and installation company serving ` +
      `Jacksonville FL, Yulee FL, and Fernandina Beach FL. Phone: ${phone}. ` +
      `Keywords to include: garage door repair Jacksonville FL, same-day service. ` +
      `Format: TITLE\nDESCRIPTION`
    );
    const [metaTitle, ...descParts] = meta.split('\n').filter(Boolean);
    seo.metaTitle = metaTitle.replace(/^(TITLE:?\s*)/i, '').trim();
    seo.metaDescription = descParts.join(' ').replace(/^(DESCRIPTION:?\s*)/i, '').trim();
    log(AGENT_ID, 'success', `Meta title: "${seo.metaTitle}"`);

    // 2. Local SEO keywords for all three markets
    const keywords = await callClaude(
      `List 10 high-value local SEO keyword phrases for a garage door company in ` +
      `Jacksonville FL, Yulee FL, and Fernandina Beach FL. ` +
      `Mix of emergency (broken spring, off track) and standard (new door, installation). ` +
      `Include city names. One per line. No numbering. Focus on buyer intent.`
    );
    seo.keywords = keywords.split('\n').filter(Boolean).map(k => k.trim());
    log(AGENT_ID, 'success', `${seo.keywords.length} SEO keywords generated`);

    // 3. Local business schema (structured data for Google)
    seo.localBusinessSchema = {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: config.business.name,
      telephone: config.business.phoneRaw,
      areaServed: config.priorityMarkets.map(m => m.name + ', FL'),
      serviceType: config.services.map(s => s.name),
      priceRange: '$$',
      openingHours: 'Mo-Su 07:00-20:00',
      description: `Jacksonville's trusted garage door repair and installation company. Same-day emergency service in ${config.business.serviceArea}. Free estimates.`,
    };
    log(AGENT_ID, 'success', 'Local business schema generated');

    // 4. FAQ for Google rich results (rotates questions by market)
    const faq = await callClaude(
      `Write 3 FAQ items for 904 Garage Doors covering Yulee FL, Fernandina Beach FL, and Jacksonville FL. ` +
      `Questions real homeowners search on Google. Format: Q: ...\nA: ...\n\n ` +
      `Include phone ${phone} in at least one answer. Answers max 2 sentences each.`
    );
    seo.faq = faq;
    log(AGENT_ID, 'success', 'FAQ snippet generated');

    // 5. Sitemap
    writeSitemap(siteUrl);
    log(AGENT_ID, 'success', 'sitemap.xml updated');

    seo.lastUpdated = new Date().toISOString();
    fs.writeFileSync(SEO_FILE, JSON.stringify(seo, null, 2));
    log(AGENT_ID, 'success', 'SEO agent run complete.');
  } catch (err) {
    log(AGENT_ID, 'error', `SEO agent error: ${err.message}`);
  }
}

module.exports = { run, AGENT_ID };
