const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { log } = require('./logger');

const AGENT_ID = 'seo';
const SEO_FILE = path.join(__dirname, '../../data/generated-seo.json');
const SITEMAP_FILE = path.join(__dirname, '../../sitemap.xml');

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
      max_tokens: 700,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Claude API error: ${res.status}`);
  const data = await res.json();
  return data.content[0].text.trim();
}

function writeSitemap(siteUrl) {
  const pages = ['/', '/editor.html', '/success.html'];
  const products = [
    'tshirt', 'hoodie', 'mug', 'pen', 'business_card', 'cap', 'tote',
    'phone_case', 'notebook', 'poster', 'glasses', 'glass_panel',
    'sticker', 'pillow', 'canvas_print', 'coaster', 'keychain',
    'water_bottle', 'socks', 'face_mask',
  ];
  const now = new Date().toISOString().split('T')[0];

  const urls = [
    ...pages.map(p => `  <url><loc>${siteUrl}${p}</loc><lastmod>${now}</lastmod><changefreq>weekly</changefreq><priority>0.9</priority></url>`),
    ...products.map(p => `  <url><loc>${siteUrl}/editor.html?product=${p}</loc><lastmod>${now}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>`),
  ].join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
  fs.writeFileSync(SITEMAP_FILE, xml);
}

async function run() {
  log(AGENT_ID, 'info', 'SEO agent starting run…');
  const siteUrl = process.env.SITE_URL || 'https://wearit.com';
  const seo = {};

  try {
    // 1. Meta title & description
    const meta = await callClaude(
      'Write SEO meta title (max 60 chars) and meta description (max 155 chars) for WEARIT, ' +
      'a custom print-on-demand store with AI-powered design. ' +
      'Format: TITLE\nDESCRIPTION'
    );
    const [metaTitle, ...metaDescParts] = meta.split('\n').filter(Boolean);
    seo.metaTitle = metaTitle.trim();
    seo.metaDescription = metaDescParts.join(' ').trim();
    log(AGENT_ID, 'success', `Meta title: "${seo.metaTitle}"`);

    // 2. 5 SEO keyword phrases
    const keywords = await callClaude(
      'List 5 high-value SEO keyword phrases for a custom print-on-demand apparel and accessories store. ' +
      'One per line. No numbering. Focus on buyer intent.'
    );
    seo.keywords = keywords.split('\n').filter(Boolean).map(k => k.trim());
    log(AGENT_ID, 'success', `${seo.keywords.length} SEO keywords generated`);

    // 3. FAQ snippet
    const faq = await callClaude(
      'Write 2 FAQ items for a custom print-on-demand store (schema.org FAQ format). ' +
      'Format: Q: ...\nA: ...\n\nQ: ...\nA: ...'
    );
    seo.faq = faq;
    log(AGENT_ID, 'success', 'FAQ snippet generated');

    // 4. Update sitemap
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
