const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { log } = require('./logger');
const config = require('../../jaxConfig');

const AGENT_ID = 'seo';
const SEO_FILE = path.join(__dirname, '../../data/generated-seo.json');
const SITEMAP_FILE = path.join(__dirname, '../../sitemap.xml');

// ---------------------------------------------------------------------------
// Competitor-informed keyword strategy (researched 2026-05)
// Sources: a1aoverheaddoors.com (county pages), garagedoorsjd.com (service list),
//          precisiondoor.net/jacksonville (franchise template)
// ---------------------------------------------------------------------------

const LOCATION_KEYWORDS = {
  yulee: {
    city: 'Yulee',
    state: 'FL',
    zip: '32097',
    county: 'Nassau',
    primary: 'garage door repair Yulee FL',
    keywords: [
      'garage door repair Yulee FL',
      'garage door repair 32097',
      'broken spring repair Yulee FL',
      'garage door spring replacement Yulee',
      'same day garage door Yulee FL',
      'garage door off track Yulee',
      'garage door opener repair Yulee FL',
      'emergency garage door Yulee FL',
      'garage door company Nassau County FL',
      'local garage door tech Yulee 32097',
    ],
    // Florida coastal angle — stolen from A1A's strongest content pattern
    localAngle: 'fast-growing Nassau County suburb with builder-grade springs from 2018-2024 now failing; coastal humidity and salt air accelerate spring corrosion',
    neighborhoodNotes: 'Wildlight, Tributary, Nassau Crossing, Chester, Lofton Creek subdivisions',
  },
  fernandina: {
    city: 'Fernandina Beach',
    state: 'FL',
    zip: '32034',
    county: 'Nassau',
    primary: 'garage door repair Fernandina Beach FL',
    keywords: [
      'garage door repair Fernandina Beach FL',
      'garage door repair Amelia Island',
      'garage door repair 32034',
      'broken spring Fernandina Beach',
      'garage door replacement Amelia Island',
      'garage door opener Fernandina Beach FL',
      'hurricane rated garage door Amelia Island',
      'garage door service Nassau County',
      'coastal garage door repair Florida',
      'new garage door installation Fernandina Beach',
    ],
    localAngle: 'direct Atlantic coast exposure means the most aggressive salt-air corrosion in the service area; hurricane/wind-rated doors are a real need; mix of historic homes and premium resort communities',
    neighborhoodNotes: 'Amelia Island Plantation, Summer Beach, Omni resort area, historic downtown district',
  },
  jacksonville: {
    city: 'Jacksonville',
    state: 'FL',
    zip: '32099',
    county: 'Duval',
    primary: 'garage door repair Jacksonville FL',
    keywords: [
      'garage door repair Jacksonville FL',
      'same day garage door repair Jacksonville',
      'broken spring repair Jacksonville FL',
      'garage door off track Jacksonville',
      'garage door company Jacksonville FL',
      'emergency garage door repair Jacksonville',
      'garage door opener repair Jacksonville FL',
      'garage door installation Jacksonville FL',
      'garage door repair near me Jacksonville',
      'affordable garage door repair Jacksonville',
    ],
    localAngle: 'largest market, high competition from franchises like Precision Door; differentiate on same-day response, no voicemail, local pricing vs franchise overhead',
    neighborhoodNotes: 'Mandarin, Southside, Northside, Arlington, Atlantic Beach, Jacksonville Beach, Neptune Beach',
  },
  orangePark: {
    city: 'Orange Park',
    state: 'FL',
    zip: '32073',
    county: 'Clay',
    primary: 'garage door repair Orange Park FL',
    keywords: [
      'garage door repair Orange Park FL',
      'garage door repair Clay County FL',
      'broken spring Orange Park FL',
      'same day garage door Orange Park',
      'garage door opener repair Orange Park',
      'garage door off track Orange Park FL',
      'garage door company Orange Park FL',
      'garage door repair Fleming Island FL',
      'emergency garage door repair Orange Park',
      'new garage door installation Orange Park FL',
    ],
    localAngle: 'established suburban market with 10-20 year old homes where springs are reaching end of rated lifespan; high-use commuter households; inland from coast but Florida humidity still a factor',
    neighborhoodNotes: 'Foxridge, Lake Asbury, Oakleaf, Fleming Island, Doctors Lake Estates, Green Cove Springs',
  },
};

// Location pages built in Step 5 — used in sitemap and locationPages output
const LOCATION_PAGES = [
  { path: '/yulee.html',            city: 'Yulee',            zip: '32097', changefreq: 'weekly', priority: '0.9' },
  { path: '/fernandina-beach.html', city: 'Fernandina Beach', zip: '32034', changefreq: 'weekly', priority: '0.9' },
  { path: '/orange-park.html',      city: 'Orange Park',      zip: '32073', changefreq: 'weekly', priority: '0.8' },
];

async function callClaude(prompt) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 900,
      messages: [{ role: 'user', content: prompt }] }),
  });
  if (!res.ok) throw new Error(`Claude API error: ${res.status}`);
  return (await res.json()).content[0].text.trim();
}

/**
 * Generate location page meta tags and intro content for a given market.
 * Pattern based on competitor research:
 * - Title: "Garage Door Repair [City] FL | 904 Garage Doors — Same-Day Service"
 * - Meta: city + state, problem keywords, trust signal, phone
 * - H1: city + "garage door repair" + urgency
 */
async function generateLocationPageContent(locationKey) {
  const loc = LOCATION_KEYWORDS[locationKey];
  const phone = config.business.phone;

  const prompt =
    `You are writing SEO content for 904 Garage Doors, a solo garage door technician in ` +
    `Nassau County / Jacksonville FL. Phone: ${phone}. ` +
    `\n\nGenerate location page content for: ${loc.city}, ${loc.state} (zip ${loc.zip}, ${loc.county} County). ` +
    `\nLocal context: ${loc.localAngle}. ` +
    `\nNeighborhoods: ${loc.neighborhoodNotes}. ` +
    `\n\nWrite the following — each labeled on its own line:` +
    `\nTITLE: (max 60 chars) garage door repair ${loc.city} FL | 904 Garage Doors` +
    `\nMETA: (max 155 chars) include city, FL, zip, problem keywords, same-day, phone ${phone}` +
    `\nH1: (include "${loc.city}" and "garage door repair", add urgency)` +
    `\nINTRO: (3 sentences, feel LOCAL — mention specific neighborhoods, housing types, or coastal/humidity context, weave in primary keyword naturally)` +
    `\nFAQ_Q1: (question a ${loc.city} homeowner would actually search)` +
    `\nFAQ_A1: (2 sentences, honest, end with phone if relevant)` +
    `\nFAQ_Q2: (different angle — cost, timing, or specific problem)` +
    `\nFAQ_A2: (2 sentences, honest, end with phone if relevant)`;

  const raw = await callClaude(prompt);
  const result = {};
  const lines = raw.split('\n').filter(Boolean);
  for (const line of lines) {
    const [key, ...rest] = line.split(':');
    if (key && rest.length) result[key.trim().toLowerCase()] = rest.join(':').trim();
  }
  result.primaryKeyword = loc.primary;
  result.keywords = loc.keywords;
  result.city = loc.city;
  result.zip = loc.zip;
  result.county = loc.county;
  return result;
}

function writeSitemap(siteUrl) {
  const staticPages = [
    { path: '/',          changefreq: 'weekly',  priority: '1.0' },
    { path: '/904.html',  changefreq: 'weekly',  priority: '1.0' },
    { path: '/daily5.html', changefreq: 'daily', priority: '0.6' },
  ];

  const now = new Date().toISOString().split('T')[0];

  const staticUrls = staticPages.map(p =>
    `  <url><loc>${siteUrl}${p.path}</loc><lastmod>${now}</lastmod><changefreq>${p.changefreq}</changefreq><priority>${p.priority}</priority></url>`
  );

  const locationUrls = LOCATION_PAGES.map(p =>
    `  <url><loc>${siteUrl}${p.path}</loc><lastmod>${now}</lastmod><changefreq>${p.changefreq}</changefreq><priority>${p.priority}</priority></url>`
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticUrls.join('\n')}
${locationUrls.join('\n')}
</urlset>`;
  fs.writeFileSync(SITEMAP_FILE, xml);
}

async function run() {
  log(AGENT_ID, 'info', 'SEO agent starting run…');
  const siteUrl = process.env.SITE_URL || 'https://904garagedoors.com';
  const phone   = config.business.phone;

  let seo = {};
  try {
    const existing = fs.readFileSync(SEO_FILE, 'utf8');
    seo = JSON.parse(existing);
  } catch { /* first run */ }

  try {
    // 1. Meta title & description for the main 904 landing page
    // Format stolen from Precision Door's title structure + A1A's local angle
    const meta = await callClaude(
      `Write SEO meta title (max 60 chars) and meta description (max 155 chars) for ` +
      `904 Garage Doors, a garage door repair and installation company serving ` +
      `Jacksonville FL, Yulee FL (32097), and Fernandina Beach FL (32034). Phone: ${phone}. ` +
      `Keywords: garage door repair Jacksonville FL, same-day service, broken spring, Nassau County. ` +
      `Title should include city + brand + key differentiator. ` +
      `Meta should include city, state, zip, problem, trust signal, and CTA. ` +
      `Format exactly: TITLE\nDESCRIPTION`
    );
    const [metaTitle, ...descParts] = meta.split('\n').filter(Boolean);
    seo.metaTitle       = metaTitle.replace(/^(TITLE:?\s*)/i, '').trim();
    seo.metaDescription = descParts.join(' ').replace(/^(DESCRIPTION:?\s*)/i, '').trim();
    log(AGENT_ID, 'success', `Meta title: "${seo.metaTitle}"`);

    // 2. Location-specific meta tags for each priority market
    // Competitor pattern: every location page needs unique title + meta with city + zip
    const locationMeta = {};
    for (const [key, loc] of Object.entries(LOCATION_KEYWORDS)) {
      const locMeta = await callClaude(
        `Write SEO meta title (max 60 chars) and meta description (max 155 chars) for ` +
        `904 Garage Doors serving ${loc.city}, FL (zip ${loc.zip}). Phone: ${phone}. ` +
        `Primary keyword: "${loc.primary}". Include city, state, zip, same-day, free estimate. ` +
        `Format exactly: TITLE\nDESCRIPTION`
      );
      const [locTitle, ...locDescParts] = locMeta.split('\n').filter(Boolean);
      locationMeta[key] = {
        title:       locTitle.replace(/^(TITLE:?\s*)/i, '').trim(),
        description: locDescParts.join(' ').replace(/^(DESCRIPTION:?\s*)/i, '').trim(),
        city:        loc.city,
        zip:         loc.zip,
        keywords:    loc.keywords,
      };
      log(AGENT_ID, 'success', `Location meta for ${loc.city}: "${locationMeta[key].title}"`);
    }
    seo.locationMeta = locationMeta;

    // 3. Location page content — H1, intro paragraph, FAQ (2 questions per market)
    // This is the core competitor-informed content: unique copy per market, not just city swaps
    const locationPages = {};
    for (const key of Object.keys(LOCATION_KEYWORDS)) {
      try {
        locationPages[key] = await generateLocationPageContent(key);
        log(AGENT_ID, 'success', `Location page content for ${LOCATION_KEYWORDS[key].city}`);
      } catch (err) {
        log(AGENT_ID, 'error', `Location page content error for ${key}: ${err.message}`);
      }
    }
    seo.locationPages = locationPages;

    // 4. Combined keyword list across all markets
    const allKeywords = Object.values(LOCATION_KEYWORDS).flatMap(l => l.keywords);
    // Also pull in service-specific keywords from config
    const serviceKeywords = config.services.flatMap(s => s.keywords);
    seo.keywords = [...new Set([...allKeywords, ...serviceKeywords])];
    log(AGENT_ID, 'success', `${seo.keywords.length} total SEO keywords compiled`);

    // 5. Local business schema (main page — all service areas)
    seo.localBusinessSchema = {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: config.business.name,
      telephone: config.business.phoneRaw,
      areaServed: config.priorityMarkets.map(m => ({ '@type': 'City', name: `${m.name}, FL` })),
      serviceType: config.services.map(s => s.name),
      priceRange: '$$',
      openingHours: 'Mo-Su 07:00-20:00',
      description: `Nassau County and Jacksonville's garage door repair specialist. Same-day emergency service in Yulee (32097), Fernandina Beach (32034), Orange Park, and all of ${config.business.serviceArea}. Free estimates. Licensed & insured.`,
    };
    log(AGENT_ID, 'success', 'Local business schema generated');

    // 6. FAQ schema for Google rich results (rotates by market)
    const faqMarket = config.priorityMarkets[new Date().getDay() % config.priorityMarkets.length];
    const faq = await callClaude(
      `Write 3 FAQ items for 904 Garage Doors targeting homeowners in ${faqMarket.name}, FL. ` +
      `Questions real people search on Google — broken springs, cost, timing, local licensing. ` +
      `Mention Florida's coastal climate at least once. Include phone ${phone} in at least one answer. ` +
      `Format each as: Q: ...\nA: ... (answers max 2 sentences each). Separate with blank line.`
    );
    seo.faq = faq;
    seo.faqMarket = faqMarket.name;
    log(AGENT_ID, 'success', `FAQ snippet generated for ${faqMarket.name}`);

    // 7. Sitemap — includes all static pages + all 3 location pages
    writeSitemap(siteUrl);
    log(AGENT_ID, 'success', 'sitemap.xml updated with location pages');

    seo.lastUpdated = new Date().toISOString();
    fs.writeFileSync(SEO_FILE, JSON.stringify(seo, null, 2));
    log(AGENT_ID, 'success', 'SEO agent run complete.');
  } catch (err) {
    log(AGENT_ID, 'error', `SEO agent error: ${err.message}`);
  }
}

module.exports = { run, AGENT_ID, LOCATION_KEYWORDS, LOCATION_PAGES };
