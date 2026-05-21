/**
 * Scout Agent
 *
 * This is your eyes and ears on the internet. It watches public listing sites
 * and community boards for people who need garage door help in Jacksonville.
 * Think of it as having an assistant who checks Craigslist for you every 2 hours.
 */

const fetch = require('node-fetch');

// We use a simple XML parser since we can't install new packages.
// Craigslist's RSS feed is clean and consistent, so this regex-based
// approach is reliable enough for our needs.
function parseRssItems(xmlText) {
  const items = [];
  const itemMatches = xmlText.match(/<item>([\s\S]*?)<\/item>/g) || [];

  for (const itemXml of itemMatches) {
    const get = (tag) => {
      const m = itemXml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([^<]*)<\\/${tag}>`));
      return m ? (m[1] || m[2] || '').trim() : '';
    };

    const link = get('link') || get('guid');
    if (!link) continue;

    items.push({
      id: Buffer.from(link).toString('base64').slice(0, 16),
      title: get('title'),
      description: get('description'),
      url: link,
      platform: 'craigslist',
      postedAt: get('pubDate') ? new Date(get('pubDate')).toISOString() : new Date().toISOString(),
      rawText: `${get('title')} ${get('description')}`.toLowerCase(),
    });
  }

  return items;
}

/**
 * Fetches leads from Craigslist Jacksonville RSS feeds.
 * Craigslist has free RSS feeds — no login or API key needed.
 * We search multiple queries to catch different ways people phrase their needs.
 */
async function fetchCraigslistLeads() {
  // These are the searches we run. "sss" means "for sale" but also catches services.
  // The "bbb" category is specifically "services offered" which is the best fit.
  const searches = [
    'https://jacksonville.craigslist.org/search/bbb?query=garage+door&format=rss',
    'https://jacksonville.craigslist.org/search/sss?query=garage+door+repair&format=rss',
    'https://jacksonville.craigslist.org/search/hhh?query=garage+door&format=rss', // housing — people post repair needs here
  ];

  const allLeads = [];

  for (const url of searches) {
    try {
      const response = await fetch(url, {
        timeout: 10000,
        headers: {
          // Craigslist is happy to serve RSS to any client — no tricks needed
          'User-Agent': 'Mozilla/5.0 (compatible; LeadBot/1.0)',
        },
      });

      if (!response.ok) {
        console.log(`[Scout] Craigslist returned ${response.status} for ${url} — skipping`);
        continue;
      }

      const xml = await response.text();
      const items = parseRssItems(xml);
      console.log(`[Scout] Found ${items.length} items from ${url}`);
      allLeads.push(...items);
    } catch (err) {
      // Network errors are common and expected — we just log and move on.
      // The system should never crash because one source is unavailable.
      console.log(`[Scout] Could not reach Craigslist (${err.message}) — will try again next cycle`);
    }
  }

  return allLeads;
}

/**
 * Nextdoor Lead Fetching (PLACEHOLDER — requires setup)
 *
 * TODO: To activate Nextdoor leads:
 * 1. Go to https://nextdoor.com and create a FREE "Nextdoor Business" account
 * 2. Claim your business profile (free for service providers)
 * 3. Nextdoor does not have a public API, so this requires manual monitoring OR
 *    a paid tool like Zapier to watch for mentions of "garage door" in your neighborhood
 * 4. Alternative: Join your neighborhood as a resident and search "garage door" weekly
 * 5. Best free approach: Set up Google Alerts for "garage door Jacksonville nextdoor"
 *    at https://alerts.google.com — Google sometimes indexes Nextdoor posts
 *
 * For now, this returns an empty array so the rest of the system still works.
 */
async function fetchNextdoorLeads() {
  // TODO: When you have a Nextdoor Business account, you can use their
  // unofficial RSS or a webhook from Zapier to feed leads here.
  // For now, we log a reminder so you know this is waiting to be activated.
  console.log('[Scout] Nextdoor: not yet configured (see TODO in scout.js for setup instructions)');
  return [];
}

/**
 * Facebook Group Lead Fetching (PLACEHOLDER — requires setup)
 *
 * TODO: To activate Facebook Group monitoring:
 * 1. Join these Jacksonville Facebook groups (search for them on Facebook):
 *    - "Jacksonville FL Community" (largest general group)
 *    - "Jacksonville Neighborhood Network"
 *    - "Fleming Island & Orange Park Community Board"
 *    - "Ponte Vedra Beach Locals"
 *    - "Mandarin / Southside Jacksonville Community"
 * 2. Facebook removed public RSS feeds in 2013, so there's no free API
 * 3. FREE option: Check these groups manually 2x per day and search "garage door"
 * 4. PAID option ($0 with free tier): Use Make.com (formerly Integromat) to
 *    watch a Facebook group and send an email when "garage door" is mentioned
 *    Make.com free tier: https://www.make.com/en/register
 * 5. Another free option: Use IFTTT (https://ifttt.com) to monitor
 *    Facebook Page mentions and trigger email alerts
 *
 * For now this returns mock data so you can see how the system works.
 */
async function fetchFacebookGroupLeads() {
  // TODO: Replace this with real Facebook monitoring using Make.com or IFTTT
  // The mock lead below shows you the exact format the rest of the system expects
  console.log('[Scout] Facebook: not yet configured (see TODO in scout.js for setup instructions)');

  // Returning empty array — the mock lead is in leads/data/sample_lead.json instead
  return [];
}

/**
 * Main Scout function — call this to get all current leads from all sources.
 * It automatically removes duplicates based on URL so you never see the same
 * lead twice, even if it shows up in multiple search results.
 */
async function scoutLeads() {
  console.log('[Scout] Starting lead scouting cycle...');

  // Run all sources — we don't use Promise.all() here because if one fails
  // we still want the others to complete rather than canceling everything
  const craigslist = await fetchCraigslistLeads();
  const nextdoor = await fetchNextdoorLeads();
  const facebook = await fetchFacebookGroupLeads();

  const combined = [...craigslist, ...nextdoor, ...facebook];

  // Deduplicate by URL — same listing sometimes appears in multiple searches
  const seen = new Set();
  const unique = combined.filter((lead) => {
    if (seen.has(lead.url)) return false;
    seen.add(lead.url);
    return true;
  });

  console.log(`[Scout] Found ${unique.length} unique leads (${combined.length - unique.length} duplicates removed)`);
  return unique;
}

module.exports = { scoutLeads, fetchCraigslistLeads, fetchNextdoorLeads, fetchFacebookGroupLeads };
