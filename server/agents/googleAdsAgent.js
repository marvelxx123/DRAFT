const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { log } = require('./logger');
const config = require('../../jaxConfig');

const AGENT_ID = 'googleads';
const SCRIPT_FILE    = path.join(__dirname, '../../data/google-ads-script.js');
const HEADLINES_FILE = path.join(__dirname, '../../data/google-ads-headlines.json');

// Ad groups by service type — each maps to a customer intent
// Emergency groups get higher bids; non-emergency are for awareness
const AD_GROUPS = [
  { name: 'Emergency - Broken Spring',  service: 'broken spring repair',     intent: 'emergency', bidMultiplier: 1.5 },
  { name: 'Emergency - Door Off Track', service: 'garage door off track',     intent: 'emergency', bidMultiplier: 1.5 },
  { name: 'Opener Repair',              service: 'garage door opener repair', intent: 'standard',  bidMultiplier: 1.0 },
  { name: 'New Door Installation',      service: 'new garage door install',   intent: 'standard',  bidMultiplier: 1.0 },
  { name: 'General Repair',             service: 'garage door repair',        intent: 'standard',  bidMultiplier: 1.0 },
];

// Location targets — each market gets its own keyword set
const LOCATION_TARGETS = [
  { city: 'Yulee',            state: 'FL', zip: '32097' },
  { city: 'Fernandina Beach', state: 'FL', zip: '32034' },
  { city: 'Jacksonville',     state: 'FL', zip: '32099' },
  { city: 'Orange Park',      state: 'FL', zip: '32073' },
];

async function callClaude(prompt, maxTokens = 900) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }] }),
  });
  if (!res.ok) throw new Error(`Claude API error: ${res.status}`);
  return (await res.json()).content[0].text.trim();
}

async function generateAdCopy(group) {
  const phone = config.business.phone;
  const isEmergency = group.intent === 'emergency';

  const raw = await callClaude(
    `You are a Google Ads expert writing copy for 904 Garage Doors, a local garage door repair company ` +
    `serving Yulee, Fernandina Beach, Jacksonville, and Orange Park FL. Phone: ${phone}.\n\n` +
    `Ad group: "${group.name}" — Service: ${group.service}.\n` +
    `Intent: ${isEmergency ? 'EMERGENCY — customer needs help NOW, car may be trapped, stress is high' : 'STANDARD — customer is looking for a reliable local company'}.\n\n` +
    `Rules:\n` +
    `- 10 headlines, each STRICTLY under 30 characters. Count every character.\n` +
    `- 4 descriptions, each STRICTLY under 90 characters.\n` +
    `- ${isEmergency ? 'Emergency tone: speed, availability, relief. Words like "Same Day", "We Answer", "Fast".' : 'Trust tone: local, licensed, free estimate, honest pricing.'}\n` +
    `- Include city names where they fit (Jacksonville, Yulee, Nassau County).\n` +
    `- At least 2 headlines must include the phone: use "(904) 468-3428" — that's 15 chars.\n` +
    `- No exclamation marks in headlines (Google policy).\n\n` +
    `Output EXACTLY:\nHEADLINES:\nH1: [text]\nH2: [text]\n...H10: [text]\nDESCRIPTIONS:\nD1: [text]\nD2: [text]\nD3: [text]\nD4: [text]`
  );

  const headlines    = (raw.match(/H\d+:\s*(.+)/g)  || []).map(m => m.replace(/^H\d+:\s*/, '').trim().slice(0, 30));
  const descriptions = (raw.match(/D\d+:\s*(.+)/g)  || []).map(m => m.replace(/^D\d+:\s*/, '').trim().slice(0, 90));

  while (headlines.length    < 10) headlines.push(`Local Garage Door Help`.slice(0, 30));
  while (descriptions.length < 4)  descriptions.push(`Same-day garage door repair in Jacksonville FL. Free estimates. Call ${phone}`.slice(0, 90));

  return { headlines: headlines.slice(0, 10), descriptions: descriptions.slice(0, 4) };
}

function buildKeywords(group, locations) {
  const base = group.service;
  const keywords = [];
  // Service-only (broad intent)
  keywords.push(`"${base}"`);
  keywords.push(`+${base.split(' ').join(' +')}`);
  // Location-specific (highest intent)
  for (const loc of locations) {
    keywords.push(`"${base} ${loc.city} FL"`);
    keywords.push(`"${base} ${loc.zip}"`);
    keywords.push(`+${base.split(' ').join(' +')} +${loc.city}`);
  }
  keywords.push('"garage door repair near me"');
  keywords.push('"emergency garage door repair"');
  return keywords;
}

function buildGoogleAdsScript(adGroups) {
  const phone    = config.business.phone;
  const phoneRaw = config.business.phoneRaw;
  const siteUrl  = process.env.SITE_URL || 'https://904garagedoors.com';

  const groupCode = adGroups.map(group => {
    const hArray = group.headlines.map(h    => `"${h.replace(/"/g, '\\"')}"`).join(', ');
    const dArray = group.descriptions.map(d => `"${d.replace(/"/g, '\\"')}"`).join(', ');
    const kwArray = group.keywords.map(k    => `"${k.replace(/"/g, '\\"')}"`).join(',\n      ');
    const finalUrl = `${siteUrl}/904.html`;

    return `
  // ── ${group.name} ─────────────────────────────────────────
  (function() {
    var groupName    = "${group.name}";
    var headlines    = [${hArray}];
    var descriptions = [${dArray}];
    var keywords     = [
      ${kwArray}
    ];
    var finalUrl = "${finalUrl}";

    var agIt = campaign.adGroups().withCondition('Name = "' + groupName + '"').get();
    var adGroup = agIt.hasNext() ? agIt.next() : campaign.newAdGroupBuilder()
      .withName(groupName).withStatus("ENABLED")
      .withCpc(${group.intent === 'emergency' ? '8.00' : '5.00'})
      .build().getResult();

    var existingKw = {};
    var kwIter = adGroup.keywords().get();
    while (kwIter.hasNext()) existingKw[kwIter.next().getText()] = true;

    keywords.forEach(function(kw) {
      var clean = kw.replace(/["+]/g, '').trim();
      if (!existingKw[kw] && !existingKw['"' + clean + '"']) {
        try { adGroup.newKeywordBuilder().withText(kw).withMatchType("PHRASE").build(); } catch(e) {}
      }
    });

    var adIter = adGroup.ads().withCondition("Type = RESPONSIVE_SEARCH_AD").get();
    if (!adIter.hasNext()) {
      try {
        var b = adGroup.newAd().responsiveSearchAdBuilder();
        headlines.forEach(function(h) { b.addHeadline(h); });
        descriptions.forEach(function(d) { b.addDescription(d); });
        b.withFinalUrl(finalUrl).withPath1("Garage").withPath2("Repair").build();
      } catch(e) { Logger.log("Ad creation error: " + e.message); }
    }
    Logger.log("  Processed: " + groupName);
  })();
`;
  }).join('\n');

  return `/**
 * 904 Garage Doors — Google Ads Automation Script
 * Generated: ${new Date().toISOString()}
 * Serving: Yulee FL, Fernandina Beach FL, Jacksonville FL, Orange Park FL
 * Phone: ${phone}
 *
 * HOW TO USE:
 * 1. Google Ads → Tools & Settings → Bulk Actions → Scripts
 * 2. Click + → paste this file → Authorize
 * 3. Click "Preview" first to check before running
 * 4. Click "Run" when ready
 *
 * Campaign targets: Nassau County + Jacksonville + Orange Park
 * Emergency groups bid higher (broken spring, off track)
 * All ads point to: ${siteUrl}/904.html
 */

function main() {
  Logger.log("=== 904 Garage Doors Google Ads Script ===");

  var CAMPAIGN_NAME    = "904 Garage Doors — Local Search";
  var DAILY_BUDGET_USD = 15.00; // Start at $15/day — adjust once you see which groups convert
  var TARGET_CPA_USD   = 25.00; // Target: $25 per lead — adjust to your actual job value

  var campaign;
  var campaignIt = AdsApp.campaigns()
    .withCondition('Name = "' + CAMPAIGN_NAME + '"')
    .withCondition('Status != REMOVED').get();

  if (campaignIt.hasNext()) {
    campaign = campaignIt.next();
    Logger.log("Using existing campaign: " + CAMPAIGN_NAME);
  } else {
    campaign = AdsApp.newCampaignBuilder()
      .withName(CAMPAIGN_NAME)
      .withStatus("PAUSED")
      .withAdvertisingChannelType("SEARCH")
      .withDailyBudget(DAILY_BUDGET_USD)
      .withSearchNetwork(true)
      .withContentNetwork(false)
      .build().getResult();
    Logger.log("Created campaign (PAUSED — enable manually after review): " + CAMPAIGN_NAME);
  }

${groupCode}

  Logger.log("=== Script complete. Review campaign and enable when ready. ===");
  Logger.log("Call tracking tip: set up a Google forwarding number for ${phone} to measure ad calls.");
}
`;
}

async function run() {
  log(AGENT_ID, 'info', 'Google Ads agent starting run…');
  const dataDir = path.join(__dirname, '../../data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  try {
    const headlinesData = {
      generatedAt: new Date().toISOString(),
      campaignName: '904 Garage Doors — Local Search',
      adGroups: [],
    };

    for (const group of AD_GROUPS) {
      log(AGENT_ID, 'info', `Generating ad copy: ${group.name}…`);
      const copy     = await generateAdCopy(group);
      const keywords = buildKeywords(group, LOCATION_TARGETS);
      headlinesData.adGroups.push({
        name: group.name, service: group.service, intent: group.intent,
        keywords, headlines: copy.headlines, descriptions: copy.descriptions,
      });
      log(AGENT_ID, 'success', `${group.name} — ${copy.headlines.length} headlines ready`);
    }

    const scriptContent = buildGoogleAdsScript(headlinesData.adGroups);
    fs.writeFileSync(SCRIPT_FILE,    scriptContent,                    'utf8');
    fs.writeFileSync(HEADLINES_FILE, JSON.stringify(headlinesData, null, 2), 'utf8');

    log(AGENT_ID, 'success', 'Google Ads script saved → data/google-ads-script.js');
    log(AGENT_ID, 'success', 'Headlines JSON → data/google-ads-headlines.json');
    log(AGENT_ID, 'info',    'To activate: paste data/google-ads-script.js into Google Ads → Tools → Scripts');
    log(AGENT_ID, 'success', 'Google Ads agent run complete.');
  } catch (err) {
    log(AGENT_ID, 'error', `Google Ads agent error: ${err.message}`);
  }
}

module.exports = { run, AGENT_ID };
