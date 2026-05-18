const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { log } = require('./logger');

const AGENT_ID = 'googleads';
const SCRIPT_FILE   = path.join(__dirname, '../../data/google-ads-script.js');
const HEADLINES_FILE = path.join(__dirname, '../../data/google-ads-headlines.json');

// Run interval: 48 hours (registered in agentRunner)
const INTERVAL_MS = 48 * 60 * 60 * 1000;

const AD_GROUPS = [
  { name: 'T-Shirts',   product: 'T-Shirt',   keyword: 't-shirt' },
  { name: 'Hoodies',    product: 'Hoodie',     keyword: 'hoodie' },
  { name: 'Glasses',    product: 'Glasses',    keyword: 'glasses' },
  { name: 'Mugs',       product: 'Mug',        keyword: 'mug' },
  { name: 'Caps',       product: 'Cap',        keyword: 'cap' },
  { name: 'Tote Bags',  product: 'Tote Bag',   keyword: 'tote bag' },
];

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

/**
 * Ask Claude to generate ad copy for a single product ad group.
 * Returns { headlines: string[], descriptions: string[] }
 */
async function generateAdCopy(product) {
  const raw = await callClaude(
    `You are an expert Google Ads copywriter for WEARIT, a bold streetwear custom print-on-demand brand.\n` +
    `Generate ad copy for the product: custom ${product}.\n\n` +
    `Rules:\n` +
    `- 10 headlines, each STRICTLY under 30 characters (including spaces). Count carefully.\n` +
    `- 4 descriptions, each STRICTLY under 90 characters (including spaces). Count carefully.\n` +
    `- Tone: bold, streetwear, personalization-focused. Use power words.\n` +
    `- Do NOT use punctuation that Google Ads disallows (!, ?, @ etc. in headlines — one ! per description max).\n` +
    `- No trademark names.\n\n` +
    `Output EXACTLY in this format — nothing else:\n` +
    `HEADLINES:\n` +
    `H1: [headline]\n` +
    `H2: [headline]\n` +
    `H3: [headline]\n` +
    `H4: [headline]\n` +
    `H5: [headline]\n` +
    `H6: [headline]\n` +
    `H7: [headline]\n` +
    `H8: [headline]\n` +
    `H9: [headline]\n` +
    `H10: [headline]\n` +
    `DESCRIPTIONS:\n` +
    `D1: [description]\n` +
    `D2: [description]\n` +
    `D3: [description]\n` +
    `D4: [description]`,
    800
  );

  const headlines = [];
  const descriptions = [];

  const hMatches = raw.match(/H\d+:\s*(.+)/g) || [];
  const dMatches = raw.match(/D\d+:\s*(.+)/g) || [];

  for (const m of hMatches) {
    const text = m.replace(/^H\d+:\s*/, '').trim().slice(0, 30);
    headlines.push(text);
  }
  for (const m of dMatches) {
    const text = m.replace(/^D\d+:\s*/, '').trim().slice(0, 90);
    descriptions.push(text);
  }

  // Pad if Claude returned fewer than expected
  while (headlines.length < 10) headlines.push(`Custom ${product} - WEARIT`.slice(0, 30));
  while (descriptions.length < 4)  descriptions.push(`Design your own ${product} at WEARIT. Quality print on demand.`.slice(0, 90));

  return { headlines: headlines.slice(0, 10), descriptions: descriptions.slice(0, 4) };
}

/**
 * Build the complete Google Ads Script JS string.
 * adGroups: [{ name, product, keyword, headlines, descriptions }]
 */
function buildGoogleAdsScript(adGroups) {
  const groupCode = adGroups.map(group => {
    const hLines = group.headlines.map((h, i) => `    headlines[${i}] = adGroup.newAd().expandedTextAdBuilder().withHeadlinePart1("${h.replace(/"/g, '\\"')}");`).join('\n');
    const hArray = group.headlines.map(h => `"${h.replace(/"/g, '\\"')}"`).join(', ');
    const dArray = group.descriptions.map(d => `"${d.replace(/"/g, '\\"')}"`).join(', ');
    const kwBase = group.keyword;

    return `
  // ── Ad Group: ${group.name} ────────────────────────────────────
  (function() {
    var groupName = "${group.name}";
    var headlines    = [${hArray}];
    var descriptions = [${dArray}];
    var keywords = [
      "custom ${kwBase}",
      "personalized ${kwBase}",
      "print on demand ${kwBase}",
      "+custom +${kwBase}",
      "+personalized +${kwBase}",
    ];

    // Find or create ad group
    var agIterator = campaign.adGroups().withCondition('Name = "' + groupName + '"').get();
    var adGroup;
    if (agIterator.hasNext()) {
      adGroup = agIterator.next();
      Logger.log("  Found existing ad group: " + groupName);
    } else {
      adGroup = campaign.newAdGroupBuilder()
        .withName(groupName)
        .withStatus("ENABLED")
        .withCpc(1.50)
        .build()
        .getResult();
      Logger.log("  Created ad group: " + groupName);
    }

    // Add keywords (skip if already present)
    var existingKwSet = {};
    var kwIter = adGroup.keywords().get();
    while (kwIter.hasNext()) {
      var kw = kwIter.next();
      existingKwSet[kw.getText()] = true;
    }
    keywords.forEach(function(kw) {
      var isPhrase = kw.indexOf('"') !== -1;
      var isBMM    = kw.indexOf('+') !== -1;
      var cleanKw  = kw.replace(/["+]/g, '').trim();
      if (!existingKwSet[kw] && !existingKwSet['"' + cleanKw + '"']) {
        try {
          if (isBMM) {
            adGroup.newKeywordBuilder().withText(kw).withMatchType("BROAD").build();
          } else {
            adGroup.newKeywordBuilder().withText('"' + cleanKw + '"').withMatchType("PHRASE").build();
          }
          Logger.log("    Added keyword: " + kw);
        } catch(e) {
          Logger.log("    Keyword add error: " + kw + " — " + e.message);
        }
      }
    });

    // Create responsive search ad if none exists
    var adIter = adGroup.ads().withCondition("Type = RESPONSIVE_SEARCH_AD").get();
    if (!adIter.hasNext()) {
      try {
        var adBuilder = adGroup.newAd().responsiveSearchAdBuilder();
        headlines.forEach(function(h) { adBuilder.addHeadline(h); });
        descriptions.forEach(function(d) { adBuilder.addDescription(d); });
        adBuilder
          .withFinalUrl("https://wearit.com/editor.html?product=${group.keyword.replace(/ /g, '_')}")
          .withPath1("Custom")
          .withPath2("${group.product.replace(/ /g, '')}")
          .build();
        Logger.log("  Created responsive search ad for: " + groupName);
      } catch(e) {
        Logger.log("  Ad creation error for " + groupName + ": " + e.message);
      }
    } else {
      Logger.log("  Ad already exists for: " + groupName);
    }
  })();
`;
  }).join('\n');

  return `/**
 * WEARIT — Google Ads Automation Script
 * Generated: ${new Date().toISOString()}
 * Generated by: WEARIT Google Ads Agent (AI-powered)
 *
 * HOW TO USE:
 * 1. In Google Ads, go to Tools & Settings → Bulk Actions → Scripts
 * 2. Click the + button to create a new script
 * 3. Paste this entire file into the editor
 * 4. Click "Authorize" and grant access
 * 5. Click "Preview" to test without making changes
 * 6. Click "Run" when ready to apply
 *
 * This script:
 * - Creates (or finds) a Search campaign called "WEARIT — Custom Products"
 * - Creates ad groups for: ${adGroups.map(g => g.name).join(', ')}
 * - Adds responsive search ads with AI-generated copy
 * - Adds broad match modifier + phrase match keywords for each product
 * - Sets daily budget to $20 USD
 * - Uses Target CPA bidding (set to $15 — adjust to your historical CPA)
 */

function main() {
  Logger.log("=== WEARIT Google Ads Script Starting ===");
  Logger.log("Timestamp: " + new Date().toISOString());

  var CAMPAIGN_NAME = "WEARIT — Custom Products";
  var DAILY_BUDGET_USD = 20.00;
  var TARGET_CPA_USD   = 15.00;
  var FINAL_URL        = "https://wearit.com";

  // ── Find or create campaign ──────────────────────────────────────
  var campaign;
  var campaignIterator = AdsApp.campaigns()
    .withCondition('Name = "' + CAMPAIGN_NAME + '"')
    .withCondition('Status != REMOVED')
    .get();

  if (campaignIterator.hasNext()) {
    campaign = campaignIterator.next();
    Logger.log("Found existing campaign: " + CAMPAIGN_NAME);
  } else {
    Logger.log("Creating new campaign: " + CAMPAIGN_NAME);
    try {
      var campaignBuilder = AdsApp.newCampaignBuilder()
        .withName(CAMPAIGN_NAME)
        .withStatus("PAUSED")            // Start paused — review before enabling
        .withAdvertisingChannelType("SEARCH")
        .withDailyBudget(DAILY_BUDGET_USD)
        .withBiddingStrategy("TARGET_CPA")
        .withTargetCpa(TARGET_CPA_USD);

      // Network settings: search only (no display network)
      campaignBuilder
        .withSearchNetwork(true)
        .withContentNetwork(false)
        .withSearchPartners(false);

      campaign = campaignBuilder.build().getResult();
      Logger.log("Campaign created successfully (status: PAUSED — review and enable manually).");
    } catch(e) {
      Logger.log("Campaign creation error: " + e.message);
      return;
    }
  }

  Logger.log("Processing " + ${adGroups.length} + " ad groups…");

${groupCode}

  Logger.log("=== WEARIT Google Ads Script Complete ===");
  Logger.log("Summary: ${adGroups.length} ad groups processed.");
  Logger.log("Review campaign in Google Ads and set status to ENABLED when ready.");
}
`;
}

async function run() {
  log(AGENT_ID, 'info', 'Google Ads agent starting run…');

  // Ensure data directory exists
  const dataDir = path.join(__dirname, '../../data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  try {
    const headlinesData = {
      generatedAt: new Date().toISOString(),
      campaignName: 'WEARIT — Custom Products',
      adGroups: [],
    };

    // Generate ad copy for each ad group
    for (const group of AD_GROUPS) {
      log(AGENT_ID, 'info', `Generating ad copy for: ${group.name}…`);
      const copy = await generateAdCopy(group.product);
      headlinesData.adGroups.push({
        name: group.name,
        product: group.product,
        keyword: group.keyword,
        headlines: copy.headlines,
        descriptions: copy.descriptions,
      });
      log(AGENT_ID, 'success', `Ad copy ready: ${group.name} — ${copy.headlines.length} headlines, ${copy.descriptions.length} descriptions`);
    }

    // Build and save the full Google Ads Script
    const scriptContent = buildGoogleAdsScript(headlinesData.adGroups);
    fs.writeFileSync(SCRIPT_FILE, scriptContent, 'utf8');
    log(AGENT_ID, 'success', `Google Ads script saved → data/google-ads-script.js (${scriptContent.length} chars)`);

    // Save the headlines JSON for reference
    fs.writeFileSync(HEADLINES_FILE, JSON.stringify(headlinesData, null, 2), 'utf8');
    log(AGENT_ID, 'success', `Ad headlines saved → data/google-ads-headlines.json`);

    log(AGENT_ID, 'success', 'Google Ads agent run complete. Paste data/google-ads-script.js into Google Ads → Tools → Scripts.');
  } catch (err) {
    log(AGENT_ID, 'error', `Google Ads agent error: ${err.message}`);
  }
}

module.exports = { run, AGENT_ID, INTERVAL_MS };
